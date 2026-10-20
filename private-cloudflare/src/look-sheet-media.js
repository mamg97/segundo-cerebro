import { googleReadFetch } from "./google-read.js";
import { hasObjectsGoogleConfig, resolveObjectsSpreadsheetId } from "./objects.js";

// Same private Sheet preview pattern as RecipeMedia, with the identity scoped
// to a look_id instead of a recipe_id. D1 remains the route for old look URLs.
let cache = { rows: null, expiresAt: 0, inFlight: null };

export function decodeLookSheetPreview(row) {
  const mime = String(row?.mime_type || "").trim().toLowerCase();
  if (!["image/webp", "image/png", "image/jpeg"].includes(mime)) {
    throw new Error("INVALID_LOOK_MEDIA_MIME");
  }
  const encoded = String(row?.base64_preview || "").trim();
  if (!encoded || encoded.length > 49_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new Error("INVALID_LOOK_MEDIA_PREVIEW");
  }
  let binary;
  try { binary = atob(encoded); }
  catch { throw new Error("INVALID_LOOK_MEDIA_BASE64"); }
  if (!binary.length || binary.length > 100_000) {
    throw new Error("INVALID_LOOK_MEDIA_SIZE");
  }
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  // Guard MIME as well as content length: a preview must truly be an image.
  const png = mime === "image/png" && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const jpeg = mime === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216;
  const webp = mime === "image/webp" && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!(png || jpeg || webp)) throw new Error("INVALID_LOOK_MEDIA_SIGNATURE");
  return { bytes, mime };
}

async function readLookMediaRows(env, getGoogleAccessToken) {
  if (!hasObjectsGoogleConfig(env)) return [];
  if (cache.rows && cache.expiresAt > Date.now()) return cache.rows;
  if (!cache.inFlight) {
    cache.inFlight = (async () => {
      const token = await getGoogleAccessToken(env);
      const id = await resolveObjectsSpreadsheetId(env, token);
      if (!id) return [];
      const endpoint = "https://sheets.googleapis.com/v4/spreadsheets/"
        + encodeURIComponent(id) + "/values/" + encodeURIComponent("LookMedia!A1:H150")
        + "?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE";
      const response = await googleReadFetch(endpoint, {
        headers: { Authorization: "Bearer " + token }
      }, { attempts: 3, baseDelayMs: 180 });
      if (response.status === 400 || response.status === 404) return [];
      if (!response.ok) throw new Error("OBJECTS_LOOK_MEDIA_READ_" + response.status);
      const values = (await response.json())?.values || [];
      const header = (values[0] || []).map((v) => String(v || "").trim());
      return values.slice(1).filter((r) => r[0]).map((r) =>
        Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""]))
      );
    })().then((rows) => {
      cache.rows = rows;
      cache.expiresAt = Date.now() + 30_000;
      return rows;
    }).finally(() => { cache.inFlight = null; });
  }
  return cache.inFlight;
}

export async function serveObjectsLookSheetPreview(env, getGoogleAccessToken, lookId, version) {
  const id = String(lookId || "").trim();
  const requested = String(version || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(id)
      || !/^sheet-[a-f0-9]{12,64}$/.test(requested)) {
    return null;
  }
  const rows = await readLookMediaRows(env, getGoogleAccessToken);
  const row = rows.find((r) => r.look_id === id);
  if (!row) return null;
  const sha = String(row.sha256 || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(sha) || !sha.startsWith(requested.slice(6))) return null;
  const { bytes, mime } = decodeLookSheetPreview(row);
  // The private preview uses the same integrity field as RecipeMedia.
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const actual = [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, "0")).join("");
  if (actual !== sha) throw new Error("LOOK_MEDIA_SHA256_MISMATCH");
  return new Response(bytes, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": "inline",
      "X-Look-Image-Source": "sheet-preview"
    }
  });
}
