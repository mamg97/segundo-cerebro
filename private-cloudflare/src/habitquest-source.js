// HabitQuest retains the ORIGINAL, private Google Sheet as its only source of truth.
// Resolve its identity privately without committing an ID or exposing it in responses.
const TITLE = "HabitQuest Data";
const REGISTRY_RANGE = "IntegracionesPrivadas!A1:B50";
const ID_FORMAT = /^[A-Za-z0-9_-]{20,}$/;
const TTL_MS = 10 * 60 * 1000;

let resolved = { id: null, expiresAt: 0, accountKey: null };

export function habitQuestHasGoogleAuth(env) {
  return Boolean(env?.GOOGLE_CLIENT_ID && env?.GOOGLE_CLIENT_SECRET && env?.GOOGLE_REFRESH_TOKEN);
}

function normalizeId(input) {
  const value = String(input || "").trim();
  return ID_FORMAT.test(value) ? value : null;
}

async function registeredSourceId(env, token, fetchImpl) {
  const financeId = normalizeId(env?.FINANCE_SHEET_ID);
  if (!financeId) return null;
  const url = "https://sheets.googleapis.com/v4/spreadsheets/" +
    encodeURIComponent(financeId) + "/values/" + encodeURIComponent(REGISTRY_RANGE) +
    "?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE";
  try {
    const response = await fetchImpl(url, {
      headers: { Authorization: "Bearer " + token }
    });
    if (!response.ok) return null;
    const rows = (await response.json())?.values || [];
    const matches = rows.filter((row) => String(row?.[0] || "").trim() === "HABITQUEST_SHEET_ID")
      .map((row) => normalizeId(row?.[1])).filter(Boolean);
    // Never guess when the private registry has contradictory entries.
    if (new Set(matches).size > 1) throw new Error("HABITQUEST_SOURCE_AMBIGUOUS");
    return matches[0] || null;
  } catch (error) {
    if (error?.message === "HABITQUEST_SOURCE_AMBIGUOUS") throw error;
    return null;
  }
}

export async function resolveHabitQuestSheetId(env, token, fetchImpl = fetch) {
  if (!habitQuestHasGoogleAuth(env)) throw new Error("HABITQUEST_OAUTH_NOT_CONFIGURED");
  const configuredRaw = String(env?.HABITQUEST_SHEET_ID || "").trim();
  const configured = normalizeId(configuredRaw);
  if (configuredRaw && !configured) throw new Error("HABITQUEST_INVALID_SHEET_ID");
  if (configured) return configured;

  // Isolate the cache from a changing configuration in tests or dev.
  const accountKey = [env.GOOGLE_CLIENT_ID, env.FINANCE_SHEET_ID || ""].join("|");
  if (resolved.id && resolved.expiresAt > Date.now() && resolved.accountKey === accountKey) return resolved.id;

  const fromRegistry = await registeredSourceId(env, token, fetchImpl);
  if (fromRegistry) {
    resolved = { id: fromRegistry, expiresAt: Date.now() + TTL_MS, accountKey };
    return fromRegistry;
  }

  // Exact title excludes the historical backup: a substring search is unsafe.
  const params = new URLSearchParams({
    q: "name = '" + TITLE + "' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
    fields: "nextPageToken,files(id,name,mimeType)",
    pageSize: "100"
  });
  const response = await fetchImpl("https://www.googleapis.com/drive/v3/files?" + params, {
    headers: { Authorization: "Bearer " + token }
  });
  if (!response.ok) throw new Error("HABITQUEST_DRIVE_" + response.status);
  const payload = await response.json();
  const files = (payload?.files || [])
    .filter((file) => file?.name === TITLE &&
      file?.mimeType === "application/vnd.google-apps.spreadsheet" &&
      normalizeId(file.id));
  // Pagination, duplicate names, or a missing source must not lead to mutations
  // of the wrong sheet. Fail closed, do not select the newest arbitrary match.
  if (payload?.nextPageToken || files.length > 1) throw new Error("HABITQUEST_SOURCE_AMBIGUOUS");
  if (files.length !== 1) throw new Error("HABITQUEST_SOURCE_NOT_FOUND");
  resolved = { id: files[0].id, expiresAt: Date.now() + TTL_MS, accountKey };
  return files[0].id;
}

export function resetHabitQuestSourceCacheForTests() {
  resolved = { id: null, expiresAt: 0, accountKey: null };
}
