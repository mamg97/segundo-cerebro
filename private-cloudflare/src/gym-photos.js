// Private body-progress photo timeline. Original files may remain in private Drive;
// browser images are served exclusively through same-origin, authenticated Health APIs.
// The hidden Health Sheet owns metadata + deliberately bounded photo renditions.
// Never put an image, Drive file ID, or user metadata into repository fixtures/logs.
import { googleReadFetch } from "./google-read.js";

const TAB = "GymFotos";
export const PHOTO_VIEWS = Object.freeze(["frente", "diagonal", "perfil"]);
const PHOTO_CHUNKS = 20;
const CHUNK_CHARS = 30000;
const MAX_PREVIEW_BYTES = 450000;
const MIME = new Set(["image/jpeg", "image/webp", "image/png"]);
const INDEX_RANGE = TAB + "!A1:G500";
const HEADER = ["fecha", "vista", "drive_file_id", "original_mime", "preview_mime", "created_at", "updated_at",
  ...Array.from({length: PHOTO_CHUNKS}, (_, i) => "chunk_" + String(i + 1).padStart(2, "0"))];

export class GymPhotoError extends Error {
  constructor(code, status = 400) {
    super(code); this.code = code; this.status = status;
  }
}

export function validGymPhotoDate(date) {
  const s = String(date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const dateObj = new Date(s + "T12:00:00Z");
  return !Number.isNaN(dateObj.getTime()) && dateObj.toISOString().slice(0, 10) === s && s >= "2000-01-01";
}

export function normalizeGymPhotoView(view) {
  if (!PHOTO_VIEWS.includes(String(view || ""))) throw new GymPhotoError("INVALID_GYM_PHOTO_VIEW");
  return String(view);
}

export function validatePrivatePhotoBytes(bytes, mimeType) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (!b.length || b.length > MAX_PREVIEW_BYTES) throw new GymPhotoError("GYM_PHOTO_TOO_LARGE", 413);
  if (mimeType !== "image/webp") throw new GymPhotoError("GYM_PHOTO_WEBP_REQUIRED", 415);
  if (!(b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP")) throw new GymPhotoError("GYM_PHOTO_INVALID_IMAGE", 415);
  // Reject ancillary chunks carrying camera/device/location metadata. Browser canvas
  // exports a clean WEBP; files bypassing that flow cannot smuggle GPS/EXIF/XMP.
  let offset = 12, hasImageChunk = false;
  while (offset + 8 <= b.length) {
    const type = String.fromCharCode(...b.slice(offset, offset + 4));
    const len = (b[offset + 4] | (b[offset + 5] << 8) | (b[offset + 6] << 16) | (b[offset + 7] << 24)) >>> 0;
    if (type === "EXIF" || type === "XMP " || type === "ICCP") throw new GymPhotoError("GYM_PHOTO_METADATA_NOT_ALLOWED", 415);
    if (type === "VP8 " || type === "VP8L" || type === "VP8X") hasImageChunk = true;
    offset += 8 + len + (len % 2);
    if (offset > b.length) throw new GymPhotoError("GYM_PHOTO_INVALID_IMAGE", 415);
  }
  if (!hasImageChunk || offset !== b.length) throw new GymPhotoError("GYM_PHOTO_INVALID_IMAGE", 415);
  return b;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

function base64ToBytes(encoded) {
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length > PHOTO_CHUNKS * CHUNK_CHARS) {
    throw new GymPhotoError("GYM_PHOTO_CORRUPT", 502);
  }
  try {
    const binary = atob(encoded);
    if (!binary.length || binary.length > MAX_PREVIEW_BYTES) throw new Error("SIZE");
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch { throw new GymPhotoError("GYM_PHOTO_CORRUPT", 502); }
}

export function splitGymPhotoBase64(encoded) {
  if (!encoded || encoded.length > PHOTO_CHUNKS * CHUNK_CHARS) throw new GymPhotoError("GYM_PHOTO_TOO_LARGE", 413);
  const chunks = Array.from({length: PHOTO_CHUNKS}, (_, i) => encoded.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS));
  return chunks;
}

function endpoint(env, range) {
  const id = String(env?.HEALTH_SHEET_ID || "");
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) throw new GymPhotoError("GYM_PHOTO_NOT_CONFIGURED", 503);
  return "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(id) + "/values/" + encodeURIComponent(range);
}

async function readValues(env, getToken, range) {
  const response = await googleReadFetch(endpoint(env, range) + "?valueRenderOption=UNFORMATTED_VALUE", {
    headers: { Authorization: "Bearer " + await getToken(env) }
  }, { attempts: 2, baseDelayMs: 120 });
  if (!response.ok) throw new GymPhotoError("GYM_PHOTO_SHEET_READ_FAILED", 502);
  return (await response.json())?.values || [];
}

async function indexRows(env, getToken) {
  const rows = await readValues(env, getToken, INDEX_RANGE);
  if (!rows.length || HEADER.slice(0, 7).some((name, i) => rows[0]?.[i] !== name)) {
    throw new GymPhotoError("GYM_PHOTO_SHEET_NOT_READY", 503);
  }
  return rows.slice(1).map((r, index) => ({
    date: String(r?.[0] || ""), view: String(r?.[1] || ""), driveFileId: String(r?.[2] || ""),
    originalMime: String(r?.[3] || ""), previewMime: String(r?.[4] || ""),
    createdAt: String(r?.[5] || ""), updatedAt: String(r?.[6] || ""), row: index + 2
  })).filter(r => validGymPhotoDate(r.date) && PHOTO_VIEWS.includes(r.view));
}

function uniqueSeries(rows) {
  const byDate = new Map();
  for (const row of rows) {
    if (!byDate.has(row.date)) byDate.set(row.date, { date: row.date, views: {}, updatedAt: "" });
    const series = byDate.get(row.date);
    if (series.views[row.view]) throw new GymPhotoError("GYM_PHOTO_DUPLICATE_ROWS", 502);
    series.views[row.view] = { url: "/api/gym/photos/" + row.date + "/" + row.view +
      "/image?v=" + encodeURIComponent(row.updatedAt), archived: Boolean(row.driveFileId) };
    if (row.updatedAt > series.updatedAt) series.updatedAt = row.updatedAt;
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export async function listGymPhotos(env, getToken) {
  return { ok: true, source: "private_health_sheet", sensitivity: "muy_confidencial",
    series: uniqueSeries(await indexRows(env, getToken)) };
}

export async function readGymPhoto(env, getToken, date, view) {
  if (!validGymPhotoDate(date)) throw new GymPhotoError("INVALID_GYM_PHOTO_DATE");
  normalizeGymPhotoView(view);
  const matches = (await indexRows(env, getToken)).filter(r => r.date === date && r.view === view);
  if (!matches.length) throw new GymPhotoError("GYM_PHOTO_NOT_FOUND", 404);
  if (matches.length !== 1) throw new GymPhotoError("GYM_PHOTO_DUPLICATE_ROWS", 502);
  const row = matches[0];
  const values = await readValues(env, getToken, TAB + "!A" + row.row + ":AA" + row.row);
  if (String(values[0]?.[0] || "") !== date || String(values[0]?.[1] || "") !== view) {
    throw new GymPhotoError("GYM_PHOTO_CONCURRENT_EDIT", 409);
  }
  const encoded = (values[0] || []).slice(7, 7 + PHOTO_CHUNKS).map(v => String(v || "")).join("");
  const bytes = base64ToBytes(encoded);
  const mime = row.previewMime;
  if (!MIME.has(mime)) throw new GymPhotoError("GYM_PHOTO_CORRUPT", 502);
  return { bytes, mime };
}

export async function saveGymPhotoSeries(request, env, getToken) {
  const body = await request.formData().catch(() => { throw new GymPhotoError("GYM_PHOTO_FORM_REQUIRED"); });
  const date = String(body.get("date") || "");
  if (!validGymPhotoDate(date) || date > new Date().toISOString().slice(0, 10)) {
    throw new GymPhotoError("INVALID_GYM_PHOTO_DATE");
  }
  const existing = await indexRows(env, getToken);
  if (existing.some(r => r.date === date)) throw new GymPhotoError("GYM_PHOTO_DATE_EXISTS", 409);
  const timestamp = new Date().toISOString();
  const rows = [];
  for (const view of PHOTO_VIEWS) {
    const file = body.get(view);
    if (!file || typeof file.arrayBuffer !== "function") throw new GymPhotoError("GYM_PHOTO_THREE_VIEWS_REQUIRED");
    const bytes = validatePrivatePhotoBytes(new Uint8Array(await file.arrayBuffer()), String(file.type || ""));
    const encoded = bytesToBase64(bytes);
    rows.push([date, view, "", "image/webp", "image/webp", timestamp, timestamp, ...splitGymPhotoBase64(encoded)]);
  }
  const url = endpoint(env, TAB + "!A1:AA500") + ":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS";
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + await getToken(env), "Content-Type": "application/json" },
    body: JSON.stringify({ majorDimension: "ROWS", values: rows })
  });
  if (!response.ok) throw new GymPhotoError("GYM_PHOTO_WRITE_FAILED", 502);
  return { ok: true, date, savedViews: PHOTO_VIEWS };
}

export async function deleteGymPhotoSeries(env, getToken, date) {
  if (!validGymPhotoDate(date)) throw new GymPhotoError("INVALID_GYM_PHOTO_DATE");
  const rows = (await indexRows(env, getToken)).filter(r => r.date === date);
  if (!rows.length) throw new GymPhotoError("GYM_PHOTO_NOT_FOUND", 404);
  const base = endpoint(env, "") .replace(/\/values\/$/, "");
  const response = await fetch(base + "/values:batchClear", {
    method: "POST", headers: { Authorization: "Bearer " + await getToken(env), "Content-Type": "application/json" },
    body: JSON.stringify({ ranges: rows.map(row => TAB + "!A" + row.row + ":AA" + row.row) })
  });
  if (!response.ok) throw new GymPhotoError("GYM_PHOTO_DELETE_FAILED", 502);
  return { ok: true, date, deletedViews: rows.map(row => row.view) };
}

export const GYM_PHOTO_SHEET_HEADER = HEADER;
