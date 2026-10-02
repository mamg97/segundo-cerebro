import {
  fetchObjectsSummary,
  invalidateObjectsCache,
  resolveObjectsSpreadsheetId
} from "./objects.js";
import {
  ObjectsImageError,
  imageStorageKey,
  isObjectsImageRequestAuthenticated,
  normalizeObjectId,
  sanitizeFilename,
  sniffImageMime,
  storedKeyFromUrl
} from "./objects-images.js";
import { createObjectsD1MediaStore } from "./objects-media-d1.js";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const LOOKS_RANGE = "Looks!A1:K5000";

function parseBoolean(value) {
  const text = String(value ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "si", "sí", "on"].includes(text);
}

function normalizeLookId(value) {
  const id = normalizeObjectId(value);
  if (("lookmedia--" + id).length > 128) {
    throw new ObjectsImageError("INVALID_LOOK_ID", 400);
  }
  return id;
}

function storageObjectId(lookId) {
  return "lookmedia--" + normalizeLookId(lookId);
}

function lookReadUrl(lookId, version) {
  return "/api/objects/look/" + encodeURIComponent(normalizeLookId(lookId)) +
    "/image?v=" + encodeURIComponent(String(version));
}

function storedKeyFromLookUrl(url) {
  const raw = String(url || "").trim();
  const match = raw.match(/^\/api\/objects\/look\/([^/?#]+)\/image\?v=([A-Za-z0-9-]{8,80})$/);
  if (!match) return null;
  try {
    return imageStorageKey(storageObjectId(decodeURIComponent(match[1])), "processed", match[2]);
  } catch {
    return null;
  }
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

async function getLookRow(spreadsheetId, token, lookId, fetchImpl = fetch) {
  const endpoint =
    "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(spreadsheetId) +
    "/values/" + encodeURIComponent(LOOKS_RANGE) +
    "?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE";
  const response = await fetchImpl(endpoint, {
    headers: { Authorization: "Bearer " + token }
  });
  if (!response.ok) throw new ObjectsImageError("OBJECTS_SHEET_READ_FAILED", 502);
  const rows = (await response.json())?.values || [];
  if (!rows.length) throw new ObjectsImageError("OBJECTS_SHEET_CONTRACT_INVALID", 502);

  const headers = rows[0].map((item) => String(item ?? "").trim());
  const headerMap = new Map(headers.map((header, index) => [header, index]));
  if (!headerMap.has("look_id") || !headerMap.has("foto_url")) {
    throw new ObjectsImageError("OBJECTS_SHEET_CONTRACT_INVALID", 502);
  }

  const index = rows.slice(1).findIndex((row) =>
    String(row?.[headerMap.get("look_id")] ?? "").trim() === lookId
  );
  if (index < 0) throw new ObjectsImageError("LOOK_NOT_FOUND", 404);

  return {
    rowNumber: index + 2,
    headerMap,
    row: rows[index + 1] || []
  };
}

function currentPhotoUrl(lookRow) {
  const index = lookRow.headerMap.get("foto_url");
  return index === undefined ? "" : String(lookRow.row?.[index] ?? "").trim();
}

async function writeLookPhoto(spreadsheetId, token, lookRow, url, fetchImpl = fetch) {
  const columnIndex = lookRow.headerMap.get("foto_url");
  if (columnIndex === undefined) throw new ObjectsImageError("OBJECTS_SHEET_CONTRACT_INVALID", 502);

  const endpoint =
    "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(spreadsheetId) +
    "/values:batchUpdate";
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      valueInputOption: "RAW",
      data: [{
        range: "Looks!" + columnLetter(columnIndex) + lookRow.rowNumber,
        majorDimension: "ROWS",
        values: [[url]]
      }]
    })
  });
  if (!response.ok) throw new ObjectsImageError("OBJECTS_SHEET_UPDATE_FAILED", 502);
}

async function resolveMediaStore(env, overrides = {}) {
  if (overrides.mediaStore) return overrides.mediaStore;
  try {
    return createObjectsD1MediaStore(env);
  } catch {
    throw new ObjectsImageError("OBJECTS_MEDIA_NOT_CONFIGURED", 503);
  }
}

async function cleanupKey(bucket, key) {
  if (!key) return;
  try { await bucket.delete(key); } catch {}
}

const LOOK_CANVAS = { width: 900, height: 1200 };
const LOOK_ROLE_SLOTS = {
  superior: { x: 225, y: 95, width: 450, height: 430, z: 1 },
  exterior: { x: 165, y: 45, width: 570, height: 535, z: 2 },
  inferior: { x: 245, y: 430, width: 410, height: 555, z: 3 },
  accesorio: { x: 350, y: 330, width: 200, height: 245, z: 4 },
  calzado: { x: 245, y: 925, width: 410, height: 220, z: 5 }
};

function bytesToBase64(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value || []);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

function imageDataUri(asset) {
  const mime = String(asset?.httpMetadata?.contentType || "").toLowerCase();
  if (!mime.startsWith("image/")) throw new ObjectsImageError("LOOK_ITEM_IMAGE_INVALID", 409);
  return "data:" + mime + ";base64," + bytesToBase64(asset.body);
}

async function readCanonicalWardrobeAsset(garment, bucket) {
  let hadCandidate = false;
  for (const url of [garment?.thumbnailUrl, garment?.processedPhotoUrl]) {
    const key = storedKeyFromUrl(url);
    if (!key) continue;
    hadCandidate = true;
    try {
      const asset = await bucket.get(key);
      if (asset && String(asset?.httpMetadata?.contentType || "").toLowerCase().startsWith("image/")) {
        return asset;
      }
    } catch {
      // A broken/missing thumbnail must not block a look when the processed
      // canonical asset for the same garment is still healthy.
    }
  }
  if (!hadCandidate) throw new ObjectsImageError("LOOK_ITEM_IMAGE_MISSING", 409);
  throw new ObjectsImageError("LOOK_ITEM_IMAGE_UNREADABLE", 409);
}

async function renderCanonicalLookSvg(look, wardrobeRows, bucket) {
  const wardrobe = new Map(
    (Array.isArray(wardrobeRows) ? wardrobeRows : [])
      .filter((item) => item?.objectId)
      .map((item) => [String(item.objectId), item])
  );
  const items = [];
  for (const item of Array.isArray(look?.items) ? look.items : []) {
    const role = String(item?.role || "").trim().toLowerCase();
    const slot = LOOK_ROLE_SLOTS[role];
    if (!slot || !item?.objectId) continue;
    const garment = wardrobe.get(String(item.objectId));
    if (!garment) throw new ObjectsImageError("LOOK_ITEM_IMAGE_MISSING", 409);
    const asset = await readCanonicalWardrobeAsset(garment, bucket);
    items.push({ role, slot, dataUri: imageDataUri(asset) });
  }

  for (const role of ["superior", "inferior", "calzado"]) {
    if (!items.some((item) => item.role === role)) {
      throw new ObjectsImageError("LOOK_REQUIRED_ROLE_MISSING", 409);
    }
  }

  items.sort((a, b) => a.slot.z - b.slot.z);
  const images = items.map(({ slot, dataUri }) =>
    '<image x="' + slot.x + '" y="' + slot.y + '" width="' + slot.width + '" height="' + slot.height +
    '" href="' + dataUri + '" preserveAspectRatio="xMidYMid meet" filter="url(#soft-shadow)"/>'
  ).join("");

  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + LOOK_CANVAS.width + '" height="' + LOOK_CANVAS.height +
    '" viewBox="0 0 ' + LOOK_CANVAS.width + ' ' + LOOK_CANVAS.height + '">' +
    '<defs><filter id="soft-shadow" x="-30%" y="-30%" width="160%" height="160%">' +
    '<feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#1f2937" flood-opacity="0.14"/>' +
    '</filter></defs>' +
    '<rect width="900" height="1200" fill="#f3f1ed"/>' +
    '<ellipse cx="450" cy="1124" rx="245" ry="34" fill="#d7d3cc" opacity="0.42"/>' +
    images +
    '</svg>';

  return {
    bytes: new TextEncoder().encode(svg),
    mime: "image/svg+xml",
    itemCount: items.length
  };
}



export async function renderObjectsLookImage(request, env, getGoogleAccessToken, lookId, overrides = {}) {
  const id = normalizeLookId(lookId);
  if (!(overrides.authenticated === true || isObjectsImageRequestAuthenticated(request))) {
    throw new ObjectsImageError("AUTH_REQUIRED", 401);
  }

  let payload = {};
  try {
    const text = await request.text();
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new ObjectsImageError("INVALID_JSON", 400);
  }
  const formId = String(payload?.look_id || "").trim();
  if (formId && formId !== id) throw new ObjectsImageError("LOOK_ID_MISMATCH", 400);
  const overwrite = parseBoolean(payload?.overwrite);

  const fetchSummary = overrides.fetchObjectsSummary || fetchObjectsSummary;
  const resolveSheet = overrides.resolveObjectsSpreadsheetId || resolveObjectsSpreadsheetId;
  const invalidateCache = overrides.invalidateObjectsCache || invalidateObjectsCache;
  const fetchImpl = overrides.fetch || fetch;
  const readRow = overrides.getLookRow || getLookRow;
  const writePhoto = overrides.writeLookPhoto || writeLookPhoto;
  const bucket = await resolveMediaStore(env, overrides);

  const source = await fetchSummary(env, getGoogleAccessToken);
  const looks = Array.isArray(source?.value?.looks) ? source.value.looks : [];
  const wardrobe = Array.isArray(source?.value?.wardrobe) ? source.value.wardrobe : [];
  const look = looks.find((item) => String(item?.id) === id);
  if (!look) throw new ObjectsImageError("LOOK_NOT_FOUND", 404);

  const token = await getGoogleAccessToken(env);
  const spreadsheetId = await resolveSheet(env, token);
  if (!spreadsheetId) throw new ObjectsImageError("OBJECTS_SOURCE_PENDING", 503);

  const row = await readRow(spreadsheetId, token, id, fetchImpl);
  const previousUrl = currentPhotoUrl(row);
  if (previousUrl && !overwrite) throw new ObjectsImageError("IMAGE_ALREADY_EXISTS", 409);

  const rendered = await renderCanonicalLookSvg(look, wardrobe, bucket);
  const version = crypto.randomUUID();
  const updatedAt = new Date().toISOString();
  const key = imageStorageKey(storageObjectId(id), "processed", version);
  const url = lookReadUrl(id, version);

  try {
    await bucket.put(key, rendered.bytes, {
      httpMetadata: { contentType: rendered.mime },
      customMetadata: {
        lookId: id,
        entityType: "look",
        renderSource: "canonical-wardrobe",
        uploadedAt: updatedAt
      }
    });
  } catch {
    throw new ObjectsImageError("OBJECTS_MEDIA_UPLOAD_FAILED", 502);
  }

  try {
    await writePhoto(spreadsheetId, token, row, url, fetchImpl);
    invalidateCache();
  } catch (error) {
    await cleanupKey(bucket, key);
    if (error instanceof ObjectsImageError) throw error;
    throw new ObjectsImageError("OBJECTS_SHEET_UPDATE_FAILED", 502);
  }

  if (overwrite) {
    const oldKey = storedKeyFromLookUrl(previousUrl);
    if (oldKey && oldKey !== key) await cleanupKey(bucket, oldKey);
  }

  return {
    ok: true,
    look_id: id,
    url,
    version,
    render_source: "canonical-wardrobe",
    item_count: rendered.itemCount,
    updated_at: updatedAt
  };
}

export async function uploadObjectsLookImage(request, env, getGoogleAccessToken, lookId, overrides = {}) {
  const id = normalizeLookId(lookId);
  if (!(overrides.authenticated === true || isObjectsImageRequestAuthenticated(request))) {
    throw new ObjectsImageError("AUTH_REQUIRED", 401);
  }

  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("multipart/form-data")) {
    throw new ObjectsImageError("MULTIPART_REQUIRED", 415);
  }

  const form = await request.formData();
  const formId = String(form.get("look_id") || "").trim();
  if (formId && formId !== id) throw new ObjectsImageError("LOOK_ID_MISMATCH", 400);

  const overwrite = parseBoolean(form.get("overwrite"));
  const file = form.get("image");
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new ObjectsImageError("IMAGE_FILE_REQUIRED", 400);
  }

  const declaredMime = String(file.type || "").toLowerCase();
  if (!ALLOWED_MIME.has(declaredMime)) {
    throw new ObjectsImageError("INVALID_IMAGE_MIME", 415);
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new ObjectsImageError("IMAGE_SIZE_INVALID", 413);
  }

  const fetchSummary = overrides.fetchObjectsSummary || fetchObjectsSummary;
  const resolveSheet = overrides.resolveObjectsSpreadsheetId || resolveObjectsSpreadsheetId;
  const invalidateCache = overrides.invalidateObjectsCache || invalidateObjectsCache;
  const fetchImpl = overrides.fetch || fetch;
  const bucket = await resolveMediaStore(env, overrides);

  const source = await fetchSummary(env, getGoogleAccessToken);
  const look = (Array.isArray(source?.value?.looks) ? source.value.looks : [])
    .find((item) => String(item?.id) === id);
  if (!look) throw new ObjectsImageError("LOOK_NOT_FOUND", 404);

  const token = await getGoogleAccessToken(env);
  const spreadsheetId = await resolveSheet(env, token);
  if (!spreadsheetId) throw new ObjectsImageError("OBJECTS_SOURCE_PENDING", 503);

  const row = await getLookRow(spreadsheetId, token, id, fetchImpl);
  const previousUrl = currentPhotoUrl(row);
  if (previousUrl && !overwrite) throw new ObjectsImageError("IMAGE_ALREADY_EXISTS", 409);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const actualMime = sniffImageMime(bytes);
  if (!actualMime || actualMime !== declaredMime) {
    throw new ObjectsImageError("IMAGE_MIME_MISMATCH", 415);
  }

  const version = crypto.randomUUID();
  const updatedAt = new Date().toISOString();
  const key = imageStorageKey(storageObjectId(id), "processed", version);
  const url = lookReadUrl(id, version);

  try {
    await bucket.put(key, bytes, {
      httpMetadata: { contentType: actualMime },
      customMetadata: {
        lookId: id,
        entityType: "look",
        uploadedAt: updatedAt,
        originalFilename: sanitizeFilename(file.name)
      }
    });
  } catch {
    throw new ObjectsImageError("OBJECTS_MEDIA_UPLOAD_FAILED", 502);
  }

  try {
    await writeLookPhoto(spreadsheetId, token, row, url, fetchImpl);
    invalidateCache();
  } catch (error) {
    await cleanupKey(bucket, key);
    if (error instanceof ObjectsImageError) throw error;
    throw new ObjectsImageError("OBJECTS_SHEET_UPDATE_FAILED", 502);
  }

  if (overwrite) {
    const oldKey = storedKeyFromLookUrl(previousUrl);
    if (oldKey && oldKey !== key) await cleanupKey(bucket, oldKey);
  }

  return {
    ok: true,
    look_id: id,
    url,
    version,
    updated_at: updatedAt
  };
}

export async function readObjectsLookImage(request, env, lookId, overrides = {}) {
  if (!isObjectsImageRequestAuthenticated(request)) {
    throw new ObjectsImageError("AUTH_REQUIRED", 401);
  }

  const id = normalizeLookId(lookId);
  const version = String(new URL(request.url).searchParams.get("v") || "").trim();
  if (!/^[A-Za-z0-9-]{8,80}$/.test(version)) {
    throw new ObjectsImageError("INVALID_IMAGE_VERSION", 400);
  }

  const bucket = await resolveMediaStore(env, overrides);
  const key = imageStorageKey(storageObjectId(id), "processed", version);
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
