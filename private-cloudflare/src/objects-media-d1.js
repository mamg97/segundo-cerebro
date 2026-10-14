// Tables and indexes are provisioned by versioned D1 migration 0008, never at request time.
const CHUNK_BYTES = 1024 * 1024;
const MAX_MEDIA_BYTES = 200 * 1024 * 1024;
const KEY_RE = /^objects\/([A-Za-z0-9][A-Za-z0-9._-]{0,127})\/(original|processed|thumbnail)\/([A-Za-z0-9-]{8,80})$/;

function storageParts(key) {
  const match = String(key || "").match(KEY_RE);
  if (!match) throw new Error("INVALID_OBJECTS_MEDIA_KEY");
  return { objetoId: match[1], imageType: match[2], version: match[3] };
}

function bytesOf(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (Array.isArray(value)) return Uint8Array.from(value);
  throw new Error("INVALID_OBJECTS_MEDIA_BYTES");
}

function exactArrayBuffer(bytes) {
  const value = bytesOf(bytes);
  return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
}

function concatChunks(chunks, expectedSize) {
  const out = new Uint8Array(expectedSize);
  let offset = 0;
  for (const chunk of chunks) {
    const bytes = bytesOf(chunk);
    if (offset + bytes.byteLength > out.byteLength) throw new Error("OBJECTS_MEDIA_CORRUPT");
    out.set(bytes, offset);
    offset += bytes.byteLength;
  }
  if (offset !== expectedSize) throw new Error("OBJECTS_MEDIA_CORRUPT");
  return out;
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", exactArrayBuffer(bytes));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function requireDb(env) {
  if (!env?.DB || typeof env.DB.prepare !== "function") throw new Error("OBJECTS_MEDIA_DB_NOT_CONFIGURED");
  return env.DB;
}

async function currentUsageBytes(db) {
  const row = await db.prepare(
    "SELECT COALESCE(SUM(size_bytes), 0) AS total_bytes FROM objects_media_assets"
  ).first();
  const total = Number(row?.total_bytes || 0);
  return Number.isFinite(total) && total >= 0 ? total : 0;
}

export function createObjectsD1MediaStore(env) {
  const db = requireDb(env);

  return {
    async put(key, value, options = {}) {
      const { objetoId, imageType, version } = storageParts(key);
      const bytes = bytesOf(value);
      if (!bytes.byteLength) throw new Error("OBJECTS_MEDIA_EMPTY");


      const existing = await db.prepare(
        "SELECT size_bytes FROM objects_media_assets WHERE storage_key = ? LIMIT 1"
      ).bind(key).first();
      if (existing) throw new Error("OBJECTS_MEDIA_KEY_EXISTS");

      const currentBytes = await currentUsageBytes(db);
      if (currentBytes + bytes.byteLength > MAX_MEDIA_BYTES) {
        throw new Error("OBJECTS_MEDIA_CAP_EXCEEDED");
      }

      const mimeType = String(options?.httpMetadata?.contentType || "application/octet-stream");
      const etag = await sha256Hex(bytes);
      const createdAt = new Date().toISOString();
      const chunks = [];
      for (let offset = 0; offset < bytes.byteLength; offset += CHUNK_BYTES) {
        chunks.push(bytes.slice(offset, Math.min(offset + CHUNK_BYTES, bytes.byteLength)));
      }

      const assetStatement = db.prepare(`
        INSERT INTO objects_media_assets (
          storage_key, objeto_id, image_type, version, mime_type,
          size_bytes, chunk_count, etag, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        key, objetoId, imageType, version, mimeType,
        bytes.byteLength, chunks.length, etag, createdAt
      );

      // D1 applies request-size limits to the whole batch payload. Sending every
      // binary chunk in one batch makes an otherwise valid multi-megabyte image
      // fail once the aggregate request crosses that limit. Persist metadata and
      // chunks in bounded requests instead; uploadObjectsImage compensates with
      // delete() if a later write fails.
      try {
        await db.batch([assetStatement]);
        for (let index = 0; index < chunks.length; index += 1) {
          await db.batch([
            db.prepare(
              "INSERT INTO objects_media_chunks (storage_key, chunk_index, data) VALUES (?, ?, ?)"
            ).bind(key, index, exactArrayBuffer(chunks[index]))
          ]);
        }
      } catch (error) {
        try {
          await db.batch([
            db.prepare("DELETE FROM objects_media_chunks WHERE storage_key = ?").bind(key),
            db.prepare("DELETE FROM objects_media_assets WHERE storage_key = ?").bind(key)
          ]);
        } catch {}
        throw error;
      }
    },

    async get(key, options = {}) {
      storageParts(key);

      const asset = await db.prepare(`
        SELECT mime_type, size_bytes, chunk_count, etag
        FROM objects_media_assets
        WHERE storage_key = ?
        LIMIT 1
      `).bind(key).first();
      if (!asset) return null;

      const expectedCount = Number(asset.chunk_count || 0);
      const sizeBytes = Number(asset.size_bytes || 0);
      if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_MEDIA_BYTES ||
          !Number.isSafeInteger(expectedCount) || expectedCount !== Math.ceil(sizeBytes / CHUNK_BYTES)) {
        throw new Error("OBJECTS_MEDIA_CORRUPT");
      }

      // Only small BLOB metadata is fetched eagerly for streamed image GETs.
      // This preserves the strict corrupt-chunk check before responding while
      // bounding live image bytes to one D1 chunk rather than the whole asset.
      const readChunk = async (index) => {
        const row = await db.prepare(`
          SELECT chunk_index, data
          FROM objects_media_chunks
          WHERE storage_key = ? AND chunk_index = ?
          LIMIT 1
        `).bind(key, index).first();
        if (!row || Number(row.chunk_index) !== index) throw new Error("OBJECTS_MEDIA_CORRUPT");
        const chunk = bytesOf(row.data);
        const expectedLength = Math.min(CHUNK_BYTES, sizeBytes - index * CHUNK_BYTES);
        if (chunk.byteLength !== expectedLength) throw new Error("OBJECTS_MEDIA_CORRUPT");
        return chunk;
      };

      let body;
      if (options.stream === true && expectedCount > 1) {
        // Check every stored length/index via a small indexed metadata query:
        // a corrupt asset must fail closed before any image bytes are sent.
        // Never fetch all BLOB payloads merely to construct a ReadableStream.
        const metadata = await db.prepare(`
          SELECT chunk_index, LENGTH(data) AS chunk_bytes
          FROM objects_media_chunks
          WHERE storage_key = ?
          ORDER BY chunk_index ASC
        `).bind(key).all();
        const chunks = metadata?.results || [];
        if (chunks.length !== expectedCount || chunks.some((row, index) =>
          Number(row.chunk_index) !== index ||
          Number(row.chunk_bytes) !== Math.min(CHUNK_BYTES, sizeBytes - index * CHUNK_BYTES)
        )) throw new Error("OBJECTS_MEDIA_CORRUPT");

        let nextIndex = 0;
        body = new ReadableStream({
          async pull(controller) {
            if (nextIndex >= expectedCount) return controller.close();
            try {
              const chunk = await readChunk(nextIndex);
              nextIndex += 1;
              controller.enqueue(chunk);
              if (nextIndex === expectedCount) controller.close();
            } catch (error) {
              controller.error(error); // Never serve a truncated asset as valid.
            }
          },
          cancel() { nextIndex = expectedCount; }
        }, { highWaterMark: 0 });
      } else {
        // Non-streaming consumers (e.g. look processing) retain the exact
        // existing byte-array contract and full corruption checks.
        const parts = [];
        for (let index = 0; index < expectedCount; index += 1) {
          parts.push(await readChunk(index));
        }
        body = expectedCount === 1 ? parts[0] : concatChunks(parts, sizeBytes);
      }

      return {
        body,
        httpMetadata: { contentType: String(asset.mime_type || "application/octet-stream") },
        httpEtag: asset.etag ? '"' + String(asset.etag) + '"' : null
      };
    },

    async delete(key) {
      storageParts(key);

      await db.batch([
        db.prepare("DELETE FROM objects_media_chunks WHERE storage_key = ?").bind(key),
        db.prepare("DELETE FROM objects_media_assets WHERE storage_key = ?").bind(key)
      ]);
    }
  };
}

export const OBJECTS_D1_MEDIA_LIMITS = {
  chunkBytes: CHUNK_BYTES,
  maxMediaBytes: MAX_MEDIA_BYTES
};
