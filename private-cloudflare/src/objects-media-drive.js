const MEDIA_FOLDER_NAME = "SEGUNDO CEREBRO - OBJETOS MEDIA";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const FOLDER_CACHE_MS = 10 * 60_000;
const DRIVE_ID_RE = /^[A-Za-z0-9_-]{10,200}$/;

let folderCache = { id: null, expiresAt: 0 };

function qLiteral(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function storageParts(key) {
  const match = String(key || "").match(
    /^objects\/([A-Za-z0-9][A-Za-z0-9._-]{0,127})\/(original|processed|thumbnail)\/([A-Za-z0-9-]{8,80})$/
  );
  if (!match) throw new Error("INVALID_OBJECTS_MEDIA_KEY");
  return { objetoId: match[1], imageType: match[2], version: match[3] };
}

function driveFilename(key) {
  const { objetoId, imageType, version } = storageParts(key);
  return `objects-media__${objetoId}__${imageType}__${version}`;
}

function bytesOf(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new Error("INVALID_OBJECTS_MEDIA_BYTES");
}

function concatBytes(parts) {
  const arrays = parts.map((part) =>
    typeof part === "string" ? new TextEncoder().encode(part) : bytesOf(part)
  );
  const length = arrays.reduce((sum, item) => sum + item.byteLength, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const item of arrays) {
    out.set(item, offset);
    offset += item.byteLength;
  }
  return out;
}

async function requireToken(getGoogleAccessToken, env) {
  if (typeof getGoogleAccessToken !== "function") throw new Error("OBJECTS_MEDIA_GOOGLE_AUTH_MISSING");
  const token = await getGoogleAccessToken(env);
  if (!token) throw new Error("OBJECTS_MEDIA_GOOGLE_AUTH_MISSING");
  return token;
}

async function listFiles(token, params, fetchImpl) {
  const endpoint = "https://www.googleapis.com/drive/v3/files?" + new URLSearchParams({
    spaces: "drive",
    pageSize: "100",
    ...params
  }).toString();
  const response = await fetchImpl(endpoint, {
    headers: { Authorization: "Bearer " + token }
  });
  if (!response.ok) throw new Error("OBJECTS_MEDIA_DRIVE_LIST_" + response.status);
  return (await response.json())?.files || [];
}

async function resolveFolderId(env, token, fetchImpl) {
  const configured = String(env?.OBJECTS_MEDIA_DRIVE_FOLDER_ID || "").trim();
  if (configured) {
    if (!DRIVE_ID_RE.test(configured)) throw new Error("INVALID_OBJECTS_MEDIA_DRIVE_FOLDER_ID");
    return configured;
  }

  if (folderCache.id && folderCache.expiresAt > Date.now()) return folderCache.id;

  const files = await listFiles(token, {
    q:
      "name = '" + qLiteral(MEDIA_FOLDER_NAME) + "' and mimeType = '" +
      FOLDER_MIME + "' and trashed = false",
    fields: "files(id,name,mimeType,trashed)",
    orderBy: "modifiedTime desc"
  }, fetchImpl);

  let folderId = String(files[0]?.id || "").trim();
  if (!folderId) {
    const response = await fetchImpl(
      "https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: MEDIA_FOLDER_NAME,
          mimeType: FOLDER_MIME,
          appProperties: { segundoCerebroRole: "objects-media" }
        })
      }
    );
    if (!response.ok) throw new Error("OBJECTS_MEDIA_DRIVE_FOLDER_CREATE_" + response.status);
    folderId = String((await response.json())?.id || "").trim();
  }

  if (!DRIVE_ID_RE.test(folderId)) throw new Error("OBJECTS_MEDIA_DRIVE_FOLDER_MISSING");
  folderCache = { id: folderId, expiresAt: Date.now() + FOLDER_CACHE_MS };
  return folderId;
}

async function findMediaFiles(token, folderId, key, fetchImpl) {
  const name = driveFilename(key);
  return listFiles(token, {
    q:
      "'" + qLiteral(folderId) + "' in parents and name = '" +
      qLiteral(name) + "' and trashed = false",
    fields: "files(id,name,mimeType,size,md5Checksum,trashed)",
    orderBy: "modifiedTime desc"
  }, fetchImpl);
}

async function uploadMediaFile(token, folderId, key, bytes, options, fetchImpl) {
  const actualBytes = bytesOf(bytes);
  const contentType = String(options?.httpMetadata?.contentType || "application/octet-stream");
  const custom = options?.customMetadata || {};
  const name = driveFilename(key);
  const boundary = "segundo-cerebro-" + crypto.randomUUID();

  const metadata = {
    name,
    parents: [folderId],
    mimeType: contentType,
    appProperties: {
      segundoCerebroRole: "objects-media",
      objectsMediaKey: String(key),
      objetoId: String(custom.objetoId || ""),
      imageType: String(custom.imageType || "")
    }
  };

  const body = concatBytes([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(metadata),
    `\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`,
    actualBytes,
    `\r\n--${boundary}--\r\n`
  ]);

  const response = await fetchImpl(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,md5Checksum",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "multipart/related; boundary=" + boundary
      },
      body
    }
  );
  if (!response.ok) throw new Error("OBJECTS_MEDIA_DRIVE_UPLOAD_" + response.status);
  const file = await response.json();
  if (!DRIVE_ID_RE.test(String(file?.id || ""))) throw new Error("OBJECTS_MEDIA_DRIVE_UPLOAD_INVALID");
  return file;
}

async function permanentlyDeleteFile(token, fileId, fetchImpl) {
  if (!DRIVE_ID_RE.test(String(fileId || ""))) return;
  const response = await fetchImpl(
    "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(fileId),
    {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token }
    }
  );
  if (!response.ok && response.status !== 404) {
    throw new Error("OBJECTS_MEDIA_DRIVE_DELETE_" + response.status);
  }
}

export function createObjectsDriveMediaStore(env, getGoogleAccessToken, overrides = {}) {
  const fetchImpl = overrides.fetch || fetch;

  return {
    async put(key, bytes, options = {}) {
      storageParts(key);
      const token = await requireToken(getGoogleAccessToken, env);
      const folderId = await resolveFolderId(env, token, fetchImpl);
      await uploadMediaFile(token, folderId, key, bytes, options, fetchImpl);
    },

    async get(key) {
      storageParts(key);
      const token = await requireToken(getGoogleAccessToken, env);
      const folderId = await resolveFolderId(env, token, fetchImpl);
      const files = await findMediaFiles(token, folderId, key, fetchImpl);
      const file = files[0];
      if (!file?.id) return null;

      const response = await fetchImpl(
        "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(file.id) + "?alt=media",
        { headers: { Authorization: "Bearer " + token } }
      );
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("OBJECTS_MEDIA_DRIVE_DOWNLOAD_" + response.status);

      return {
        body: response.body,
        httpMetadata: {
          contentType: String(file.mimeType || response.headers.get("content-type") || "application/octet-stream")
        },
        httpEtag: response.headers.get("etag") || (file.md5Checksum ? '"' + file.md5Checksum + '"' : null)
      };
    },

    async delete(key) {
      storageParts(key);
      const token = await requireToken(getGoogleAccessToken, env);
      const folderId = await resolveFolderId(env, token, fetchImpl);
      const files = await findMediaFiles(token, folderId, key, fetchImpl);
      for (const file of files) {
        await permanentlyDeleteFile(token, file.id, fetchImpl);
      }
    }
  };
}

export const OBJECTS_DRIVE_MEDIA = {
  folderName: MEDIA_FOLDER_NAME
};
