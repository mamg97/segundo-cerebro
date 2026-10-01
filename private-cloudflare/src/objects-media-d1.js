const CHUNK_BYTES = 1024 * 1024;
const MAX_MEDIA_BYTES = 200 * 1024 * 1024;
const KEY_RE = /^objects\/([A-Za-z0-9][A-Za-z0-9._-]{0,127})\/(original|processed|thumbnail)\/([A-Za-z0-9-]{8,80})$/;

let schemaReady = null;

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

async function ensureSchema(db) {
  if (!schemaReady) {
    schemaReady = Promise.resolve(db.batch([
      db.prepare(`
        CREATE TABLE IF NOT EXISTS objects_media_assets (
          storage_key TEXT PRIMARY KEY,
          objeto_id TEXT NOT NULL,
          image_type TEXT NOT NULL,
          version TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          chunk_count INTEGER NOT NULL,
          etag TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS objects_media_chunks (
          storage_key TEXT NOT NULL,
          chunk_index INTEGER NOT NULL,
          data BLOB NOT NULL,
          PRIMARY KEY (storage_key, chunk_index)
        )
      `),
      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_objects_media_chunks_storage_key
        ON objects_media_chunks(storage_key, chunk_index)
      `)
    ])).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
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
      await ensureSchema(db);

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

    async get(key) {
      storageParts(key);
      await ensureSchema(db);
      const asset = await db.prepare(`
        SELECT mime_type, size_bytes, chunk_count, etag
        FROM objects_media_assets
        WHERE storage_key = ?
        LIMIT 1
      `).bind(key).first();
      if (!asset) return null;

      const rows = await db.prepare(`
        SELECT chunk_index, data
        FROM objects_media_chunks
        WHERE storage_key = ?
        ORDER BY chunk_index ASC
      `).bind(key).all();
      const chunks = Array.isArray(rows?.results) ? rows.results : [];
      const expectedCount = Number(asset.chunk_count || 0);
      if (expectedCount <= 0 || chunks.length !== expectedCount) throw new Error("OBJECTS_MEDIA_CORRUPT");

      for (let index = 0; index < chunks.length; index += 1) {
        if (Number(chunks[index]?.chunk_index) !== index) throw new Error("OBJECTS_MEDIA_CORRUPT");
      }
      const body = concatChunks(chunks.map((row) => row.data), Number(asset.size_bytes || 0));

      return {
        body,
        httpMetadata: { contentType: String(asset.mime_type || "application/octet-stream") },
        httpEtag: asset.etag ? '"' + String(asset.etag) + '"' : null
      };
    },

    async delete(key) {
      storageParts(key);
      await ensureSchema(db);
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
