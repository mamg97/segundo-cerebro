import { PhotonImage, SamplingFilter, resize } from "@cf-wasm/photon";
import {
  fetchObjectsSummary,
  inferWardrobeLayer,
  invalidateObjectsCache,
  resolveObjectsSpreadsheetId
} from "./objects.js";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const IMAGE_TYPES = new Set(["original", "processed", "thumbnail"]);
const PROCESS_STATES = new Set(["procesada", "revisar"]);
const LAYERS = new Set(["superior", "exterior", "inferior", "calzado", "accesorio"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const THUMBNAIL_LONG_SIDE = 512;
const ARMARIO_RANGE = "Armario!A1:V5000";
const MEDIA_FOLDER_NAME = "SEGUNDO CEREBRO - OBJETOS MEDIA";
const MEDIA_FOLDER_CACHE_MS = 10 * 60_000;

let mediaFolderCache = {
  id: null,
  expiresAt: 0
};

const VISUAL_COLUMNS = {
  foto_original_url: "foto_original_url",
  foto_procesada_url: "foto_procesada_url",
  miniatura_url: "miniatura_url",
  estado_procesado: "estado_procesado",
  vista_prenda: "vista_prenda",
  color_principal: "color_principal",
  patron: "patron",
  categoria_visual: "categoria_visual",
  capa: "capa",
  ultima_actualizacion_visual: "ultima_actualizacion_visual"
};

export class ObjectsImageError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.name = "ObjectsImageError";
    this.code = code;
    this.status = status;
  }
}

function log(stage, objetoId, imageType, extra = {}) {
  console.info("[objects:image]", { stage, objetoId, imageType, ...extra });
}

function warn(stage, objetoId, imageType, extra = {}) {
  console.warn("[objects:image]", { stage, objetoId, imageType, ...extra });
}

export function isObjectsImageRequestAuthenticated(request) {
  return Boolean(
    request?.headers?.get("cf-access-jwt-assertion") ||
    request?.headers?.get("cf-access-authenticated-user-email")
  );
}

export function normalizeObjectId(value) {
  const id = String(value || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(id)) {
    throw new ObjectsImageError("INVALID_OBJECT_ID", 400);
  }
  return id;
}

export function normalizeImageType(value) {
  const type = String(value || "").trim().toLowerCase();
  if (!IMAGE_TYPES.has(type)) throw new ObjectsImageError("INVALID_IMAGE_TYPE", 400);
  return type;
}

function parseBoolean(value) {
  const text = String(value ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "si", "sí", "on"].includes(text);
}

export function sanitizeFilename(value) {
  const raw = String(value || "image").replace(/\\/g, "/").split("/").pop() || "image";
  const clean = raw
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^A-Za-z0-9._ -]+/g, "_")
    .replace(/\.{2,}/g, ".")
    .trim()
    .slice(0, 120);
  return clean || "image";
}

export function sniffImageMime(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return "image/webp";
  return null;
}

export function imageStorageKey(objetoId, imageType, version) {
  return "objects/" + normalizeObjectId(objetoId) + "/" + normalizeImageType(imageType) + "/" + String(version);
}

export function imageReadUrl(objetoId, imageType, version) {
  return "/api/objects/" + encodeURIComponent(normalizeObjectId(objetoId)) +
    "/image/" + encodeURIComponent(normalizeImageType(imageType)) +
    "?v=" + encodeURIComponent(String(version));
}

export function storedKeyFromUrl(url) {
  const raw = String(url || "").trim();
  const match = raw.match(/^\/api\/objects\/([^/?#]+)\/image\/(original|processed|thumbnail)\?v=([A-Za-z0-9-]{8,80})$/);
  if (!match) return null;
  try {
    return imageStorageKey(decodeURIComponent(match[1]), match[2], match[3]);
  } catch {
    return null;
  }
}

export function driveFilenameFromKey(key) {
  const match = String(key || "").match(/^objects\/([A-Za-z0-9][A-Za-z0-9._-]{0,127})\/(original|processed|thumbnail)\/([A-Za-z0-9-]{8,80})$/);
  if (!match) throw new ObjectsImageError("INVALID_MEDIA_KEY", 400);
  return "sc-objects--" + match[1] + "--" + match[2] + "--" + match[3];
}

function escapeDriveQueryLiteral(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function resolveMediaFolderId(token, fetchImpl = fetch) {
  if (mediaFolderCache.id && mediaFolderCache.expiresAt > Date.now()) return mediaFolderCache.id;
  const params = new URLSearchParams({
    q: "name = '" + escapeDriveQueryLiteral(MEDIA_FOLDER_NAME) + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields: "files(id,name,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: "10"
  });
  const response = await fetchImpl("https://www.googleapis.com/drive/v3/files?" + params.toString(), {
    headers: { Authorization: "Bearer " + token }
  });
  if (!response.ok) throw new ObjectsImageError("OBJECTS_MEDIA_FOLDER_READ_FAILED", 502);
  const files = (await response.json())?.files || [];
  const folder = files.find((item) => item?.name === MEDIA_FOLDER_NAME);
  if (!folder?.id) throw new ObjectsImageError("OBJECTS_MEDIA_FOLDER_NOT_FOUND", 503);
  mediaFolderCache = { id: folder.id, expiresAt: Date.now() + MEDIA_FOLDER_CACHE_MS };
  return folder.id;
}

async function findMediaFiles(token, folderId, key, fetchImpl = fetch) {
  const name = driveFilenameFromKey(key);
  const params = new URLSearchParams({
    q: "name = '" + escapeDriveQueryLiteral(name) + "' and '" + escapeDriveQueryLiteral(folderId) + "' in parents and trashed = false",
    fields: "files(id,name,mimeType,size,md5Checksum,modifiedTime)",
    pageSize: "10"
  });
  const response = await fetchImpl("https://www.googleapis.com/drive/v3/files?" + params.toString(), {
    headers: { Authorization: "Bearer " + token }
  });
  if (!response.ok) throw new ObjectsImageError("OBJECTS_MEDIA_LOOKUP_FAILED", 502);
  return (await response.json())?.files || [];
}

export function createGoogleDriveMediaStore(token, fetchImpl = fetch) {
  return {
    async put(key, bytes, options = {}) {
      const folderId = await resolveMediaFolderId(token, fetchImpl);
      const existing = await findMediaFiles(token, folderId, key, fetchImpl);
      if (existing.length) throw new ObjectsImageError("OBJECTS_MEDIA_COLLISION", 409);

      const name = driveFilenameFromKey(key);
      const contentType = options?.httpMetadata?.contentType || "application/octet-stream";
      const boundary = "sc_objects_" + crypto.randomUUID().replaceAll("-", "");
      const metadata = {
        name,
        parents: [folderId],
        appProperties: {
          storage_key: key,
          objeto_id: String(options?.customMetadata?.objetoId || ""),
          image_type: String(options?.customMetadata?.imageType || ""),
          uploaded_at: String(options?.customMetadata?.uploadedAt || "")
        }
      };
      const body = new Blob([
        "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n",
        JSON.stringify(metadata),
        "\r\n--" + boundary + "\r\nContent-Type: " + contentType + "\r\n\r\n",
        bytes,
        "\r\n--" + boundary + "--"
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
      if (!response.ok) throw new ObjectsImageError("OBJECTS_MEDIA_UPLOAD_FAILED", 502);
      return response.json();
    },

    async get(key) {
      const folderId = await resolveMediaFolderId(token, fetchImpl);
      const files = await findMediaFiles(token, folderId, key, fetchImpl);
      const file = files[0];
      if (!file?.id) return null;
      const response = await fetchImpl(
        "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(file.id) + "?alt=media",
        { headers: { Authorization: "Bearer " + token } }
      );
      if (response.status === 404) return null;
      if (!response.ok) throw new ObjectsImageError("OBJECTS_MEDIA_READ_FAILED", 502);
      return {
        body: response.body,
        httpMetadata: { contentType: file.mimeType || response.headers.get("content-type") || "application/octet-stream" },
        httpEtag: response.headers.get("etag") || file.md5Checksum || null
      };
    },

    async delete(key) {
      const folderId = await resolveMediaFolderId(token, fetchImpl);
      const files = await findMediaFiles(token, folderId, key, fetchImpl);
      for (const file of files) {
        const response = await fetchImpl(
          "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(file.id),
          {
            method: "DELETE",
            headers: { Authorization: "Bearer " + token }
          }
        );
        if (!response.ok && response.status !== 404) {
          throw new ObjectsImageError("OBJECTS_MEDIA_DELETE_FAILED", 502);
        }
      }
    }
  };
}

function columnLetter(index) {
  let n = Number(index) + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function boundedMetadata(value, max = 120) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (text.length > max) throw new ObjectsImageError("VISUAL_METADATA_TOO_LONG", 400);
  return text;
}

function normalizeLayer(value) {
  const text = boundedMetadata(value, 32);
  if (!text) return null;
  const normalized = inferWardrobeLayer(text) || text.toLowerCase();
  if (!LAYERS.has(normalized)) throw new ObjectsImageError("INVALID_VISUAL_LAYER", 400);
  return normalized;
}

function normalizeProcessState(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "procesada";
  if (!PROCESS_STATES.has(raw)) throw new ObjectsImageError("INVALID_PROCESS_STATE", 400);
  return raw;
}

export async function generateThumbnailWebp(inputBytes, longSide = THUMBNAIL_LONG_SIDE) {
  const bytes = inputBytes instanceof Uint8Array ? inputBytes : new Uint8Array(inputBytes);
  let input = null;
  let output = null;
  try {
    input = PhotonImage.new_from_byteslice(bytes);
    const width = Number(input.get_width());
    const height = Number(input.get_height());
    if (!width || !height) throw new Error("INVALID_IMAGE_DIMENSIONS");

    const scale = Math.min(1, Number(longSide) / Math.max(width, height));
    const nextWidth = Math.max(1, Math.round(width * scale));
    const nextHeight = Math.max(1, Math.round(height * scale));

    if (nextWidth !== width || nextHeight !== height) {
      const filter = SamplingFilter.Lanczos3 ?? SamplingFilter.CatmullRom ?? SamplingFilter.Nearest;
      output = resize(input, nextWidth, nextHeight, filter);
    }
    const source = output || input;
    return {
      bytes: source.get_bytes_webp(),
      width: nextWidth,
      height: nextHeight,
      mime: "image/webp"
    };
  } finally {
    if (output) output.free();
    if (input) input.free();
  }
}

async function getArmarioRow(spreadsheetId, token, objetoId, fetchImpl = fetch) {
  const range = encodeURIComponent(ARMARIO_RANGE);
  const endpoint =
    "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(spreadsheetId) +
    "/values/" + range + "?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE";
  const response = await fetchImpl(endpoint, {
    headers: { Authorization: "Bearer " + token }
  });
  if (!response.ok) throw new ObjectsImageError("OBJECTS_SHEET_READ_FAILED", 502);
  const rows = (await response.json())?.values || [];
  if (!rows.length) throw new ObjectsImageError("OBJECTS_SHEET_CONTRACT_INVALID", 502);
  const headers = rows[0].map((item) => String(item ?? "").trim());
  const headerMap = new Map(headers.map((header, index) => [header, index]));
  for (const header of ["objeto_id", ...Object.values(VISUAL_COLUMNS)]) {
    if (!headerMap.has(header)) throw new ObjectsImageError("OBJECTS_SHEET_CONTRACT_INVALID", 502);
  }
  const index = rows.slice(1).findIndex((row) => String(row?.[headerMap.get("objeto_id")] ?? "").trim() === objetoId);
  if (index < 0) throw new ObjectsImageError("OBJECT_NOT_IN_WARDROBE", 404);
  return {
    rowNumber: index + 2,
    headers,
    headerMap,
    row: rows[index + 1] || []
  };
}

async function writeArmarioFields(spreadsheetId, token, armario, fields, fetchImpl = fetch) {
  const data = [];
  for (const [header, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const columnIndex = armario.headerMap.get(header);
    if (columnIndex === undefined) throw new ObjectsImageError("OBJECTS_SHEET_CONTRACT_INVALID", 502);
    data.push({
      range: "Armario!" + columnLetter(columnIndex) + armario.rowNumber,
      majorDimension: "ROWS",
      values: [[value]]
    });
  }
  if (!data.length) return;
  const endpoint =
    "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(spreadsheetId) +
    "/values:batchUpdate";
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ valueInputOption: "RAW", data })
  });
  if (!response.ok) throw new ObjectsImageError("OBJECTS_SHEET_UPDATE_FAILED", 502);
}

async function cleanupKeys(bucket, keys, objetoId, imageType, reason) {
  for (const key of [...new Set(keys.filter(Boolean))]) {
    try {
      await bucket.delete(key);
      log("cleanup", objetoId, imageType, { reason });
    } catch (error) {
      warn("cleanup_failed", objetoId, imageType, {
        reason,
        error: String(error?.message || "DELETE_FAILED")
      });
    }
  }
}

function currentCell(armario, header) {
  const index = armario.headerMap.get(header);
  return index === undefined ? "" : String(armario.row?.[index] ?? "").trim();
}

function validateOverwrite(armario, imageType, overwrite) {
  if (overwrite) return;
  const fields = imageType === "processed"
    ? ["foto_procesada_url", "miniatura_url"]
    : imageType === "original"
      ? ["foto_original_url"]
      : ["miniatura_url"];
  if (fields.some((header) => currentCell(armario, header))) {
    throw new ObjectsImageError("IMAGE_ALREADY_EXISTS", 409);
  }
}

function parseVisualMetadata(form, wardrobe) {
  const layerInput = form.get("capa");
  const inferredLayer = wardrobe?.layer || inferWardrobeLayer([wardrobe?.subcategory, wardrobe?.name].filter(Boolean).join(" "));
  return {
    vista_prenda: boundedMetadata(form.get("vista_prenda"), 64),
    color_principal: boundedMetadata(form.get("color_principal"), 80),
    patron: boundedMetadata(form.get("patron"), 80),
    categoria_visual: boundedMetadata(form.get("categoria_visual"), 80),
    capa: layerInput ? normalizeLayer(layerInput) : (inferredLayer || null)
  };
}

export async function uploadObjectsImage(request, env, getGoogleAccessToken, objetoId, overrides = {}) {
  const id = normalizeObjectId(objetoId);
  if (!isObjectsImageRequestAuthenticated(request)) {
    throw new ObjectsImageError("AUTH_REQUIRED", 401);
  }
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("multipart/form-data")) {
    throw new ObjectsImageError("MULTIPART_REQUIRED", 415);
  }

  const form = await request.formData();
  const formId = String(form.get("objeto_id") || "").trim();
  if (formId && formId !== id) throw new ObjectsImageError("OBJECT_ID_MISMATCH", 400);

  const imageType = normalizeImageType(form.get("image_type"));
  const overwrite = parseBoolean(form.get("overwrite"));
  const file = form.get("image");
  if (!file || typeof file.arrayBuffer !== "function") throw new ObjectsImageError("IMAGE_FILE_REQUIRED", 400);
  if (!ALLOWED_MIME.has(String(file.type || "").toLowerCase())) {
    throw new ObjectsImageError("INVALID_IMAGE_MIME", 415);
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new ObjectsImageError("IMAGE_SIZE_INVALID", 413);
  }

  const fetchSummary = overrides.fetchObjectsSummary || fetchObjectsSummary;
  const resolveSheet = overrides.resolveObjectsSpreadsheetId || resolveObjectsSpreadsheetId;
  const invalidateCache = overrides.invalidateObjectsCache || invalidateObjectsCache;
  const readRow = overrides.getArmarioRow || getArmarioRow;
  const writeFields = overrides.writeArmarioFields || writeArmarioFields;
  const makeThumbnail = overrides.generateThumbnailWebp || generateThumbnailWebp;
  const fetchImpl = overrides.fetch || fetch;

  const source = await fetchSummary(env, getGoogleAccessToken);
  const objects = Array.isArray(source?.value?.objects) ? source.value.objects : [];
  const wardrobeRows = Array.isArray(source?.value?.wardrobe) ? source.value.wardrobe : [];
  const object = objects.find((item) => String(item?.id) === id);
  const wardrobe = wardrobeRows.find((item) => String(item?.objectId) === id);
  if (!object) throw new ObjectsImageError("OBJECT_NOT_FOUND", 404);
  if (!wardrobe) throw new ObjectsImageError("OBJECT_NOT_IN_WARDROBE", 404);
  if (["VENDIDO", "DONADO", "DESCARTADO", "PERDIDO"].includes(String(object.status || wardrobe.status || ""))) {
    throw new ObjectsImageError("OBJECT_RETIRED", 409);
  }

  const token = await getGoogleAccessToken(env);
  const bucket = overrides.bucket || createGoogleDriveMediaStore(token, fetchImpl);
  const spreadsheetId = await resolveSheet(env, token);
  if (!spreadsheetId) throw new ObjectsImageError("OBJECTS_SOURCE_PENDING", 503);
  const armario = await readRow(spreadsheetId, token, id, fetchImpl);
  validateOverwrite(armario, imageType, overwrite);

  const rawBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(rawBuffer);
  const actualMime = sniffImageMime(bytes);
  const declaredMime = String(file.type || "").toLowerCase();
  if (!actualMime || actualMime !== declaredMime) {
    throw new ObjectsImageError("IMAGE_MIME_MISMATCH", 415);
  }

  const version = crypto.randomUUID();
  const updatedAt = new Date().toISOString();
  const safeName = sanitizeFilename(file.name);
  const uploadedKeys = [];
  let thumbnail = null;
  const mainKey = imageStorageKey(id, imageType, version);
  const mainUrl = imageReadUrl(id, imageType, version);

  log("upload_start", id, imageType, { bytes: bytes.byteLength, overwrite });
  try {
    await bucket.put(mainKey, bytes, {
      httpMetadata: { contentType: actualMime },
      customMetadata: {
        objetoId: id,
        imageType,
        uploadedAt: updatedAt,
        originalFilename: safeName
      }
    });
    uploadedKeys.push(mainKey);
    log("upload_ok", id, imageType, { bytes: bytes.byteLength });

    if (imageType === "processed") {
      thumbnail = await makeThumbnail(bytes, THUMBNAIL_LONG_SIDE);
      const thumbKey = imageStorageKey(id, "thumbnail", version);
      await bucket.put(thumbKey, thumbnail.bytes, {
        httpMetadata: { contentType: "image/webp" },
        customMetadata: {
          objetoId: id,
          imageType: "thumbnail",
          uploadedAt: updatedAt,
          sourceVersion: version
        }
      });
      uploadedKeys.push(thumbKey);
      log("thumbnail_ok", id, imageType, {
        bytes: thumbnail.bytes.byteLength,
        width: thumbnail.width,
        height: thumbnail.height
      });
    }
  } catch (error) {
    await cleanupKeys(bucket, uploadedKeys, id, imageType, "storage_failure");
    if (error instanceof ObjectsImageError) throw error;
    warn("upload_failed", id, imageType, { error: String(error?.message || "STORAGE_ERROR") });
    throw new ObjectsImageError("OBJECTS_MEDIA_UPLOAD_FAILED", 502);
  }

  const visual = parseVisualMetadata(form, wardrobe);
  const fields = {
    ultima_actualizacion_visual: updatedAt
  };
  if (imageType === "original") {
    fields.foto_original_url = mainUrl;
    if (!currentCell(armario, "estado_procesado")) fields.estado_procesado = "pendiente";
  } else if (imageType === "thumbnail") {
    fields.miniatura_url = mainUrl;
  } else {
    fields.foto_procesada_url = mainUrl;
    fields.miniatura_url = imageReadUrl(id, "thumbnail", version);
    fields.estado_procesado = normalizeProcessState(form.get("estado_procesado"));
  }
  for (const [key, value] of Object.entries(visual)) {
    if (value) fields[key] = value;
  }
  if (!fields.color_principal && !currentCell(armario, "color_principal") && wardrobe.primaryColor) {
    fields.color_principal = String(wardrobe.primaryColor);
  }

  try {
    await writeFields(spreadsheetId, token, armario, fields, fetchImpl);
    invalidateCache();
    log("sheet_update_ok", id, imageType, { fields: Object.keys(fields).length });
  } catch (error) {
    warn("sheet_update_failed", id, imageType, { error: String(error?.message || "SHEET_ERROR") });
    await cleanupKeys(bucket, uploadedKeys, id, imageType, "sheet_rollback");
    if (error instanceof ObjectsImageError) throw error;
    throw new ObjectsImageError("OBJECTS_SHEET_UPDATE_FAILED", 502);
  }

  if (overwrite) {
    const oldUrls = imageType === "processed"
      ? [currentCell(armario, "foto_procesada_url"), currentCell(armario, "miniatura_url")]
      : imageType === "original"
        ? [currentCell(armario, "foto_original_url")]
        : [currentCell(armario, "miniatura_url")];
    const oldKeys = oldUrls.map(storedKeyFromUrl).filter((key) => key && !uploadedKeys.includes(key));
    await cleanupKeys(bucket, oldKeys, id, imageType, "superseded");
  }

  return {
    ok: true,
    objeto_id: id,
    image_type: imageType,
    url: mainUrl,
    thumbnail_url: imageType === "processed" ? imageReadUrl(id, "thumbnail", version) : null,
    estado_procesado: imageType === "processed"
      ? fields.estado_procesado
      : (currentCell(armario, "estado_procesado") || (imageType === "original" ? "pendiente" : null)),
    updated_at: updatedAt
  };
}

export async function readObjectsImage(request, env, getGoogleAccessToken, objetoId, imageType, overrides = {}) {
  if (!isObjectsImageRequestAuthenticated(request)) {
    throw new ObjectsImageError("AUTH_REQUIRED", 401);
  }
  const id = normalizeObjectId(objetoId);
  const type = normalizeImageType(imageType);
  const url = new URL(request.url);
  const version = String(url.searchParams.get("v") || "").trim();
  if (!/^[A-Za-z0-9-]{8,80}$/.test(version)) {
    throw new ObjectsImageError("INVALID_IMAGE_VERSION", 400);
  }
  const fetchImpl = overrides.fetch || fetch;
  const token = await getGoogleAccessToken(env);
  const bucket = overrides.bucket || createGoogleDriveMediaStore(token, fetchImpl);
  const key = imageStorageKey(id, type, version);
  const object = await bucket.get(key);
  if (!object) throw new ObjectsImageError("IMAGE_NOT_FOUND", 404);

  const headers = new Headers({
    "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff"
  });
  if (object.httpEtag) headers.set("ETag", object.httpEtag);
  return new Response(object.body, { status: 200, headers });
}

export const OBJECTS_IMAGE_LIMITS = {
  maxBytes: MAX_IMAGE_BYTES,
  thumbnailLongSide: THUMBNAIL_LONG_SIDE,
  allowedMime: [...ALLOWED_MIME]
};
