// Chromium disables HTTP caching whenever Playwright routes requests.
// Reuse only successfully fetched immutable private images in the same audit
// process. The first request to each unique URL always reaches production.
// Entries are never written to Git, artifacts, logs or a persistent cache.
const MAX_ENTRY_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 24 * 1024 * 1024;

function headerValue(headers, key) {
  const found = Object.entries(headers || {}).find(([name]) => name.toLowerCase() === key);
  return found ? String(found[1] || "") : "";
}

export function createAuditImmutableImageCache({ maxEntryBytes = MAX_ENTRY_BYTES, maxTotalBytes = MAX_TOTAL_BYTES } = {}) {
  const entries = new Map();
  let bytes = 0;
  let hits = 0;
  let misses = 0;

  function canHandle(uri, origin, method = "GET") {
    if (method !== "GET") return false;
    let url;
    try { url = new URL(uri); } catch { return false; }
    if (url.origin !== origin || !/^[A-Za-z0-9-]{8,80}$/.test(url.searchParams.get("v") || "")) return false;
    if ([...url.searchParams.keys()].some((key) => key !== "v")) return false;
    return /^\/api\/objects\/look\/[^/]+\/image$/.test(url.pathname) ||
      /^\/api\/objects\/[^/]+\/image\/(processed|thumbnail)$/.test(url.pathname);
  }

  function get(uri) {
    const entry = entries.get(uri);
    if (!entry) { misses++; return null; }
    hits++;
    return entry;
  }

  function put(uri, status, headers, body) {
    if (entries.has(uri) || Number(status) !== 200 || !body) return false;
    const mime = headerValue(headers, "content-type").toLowerCase();
    const cacheControl = headerValue(headers, "cache-control").toLowerCase();
    if (!/^image\/(?:png|jpeg|webp|svg\+xml)(?:;|$)/.test(mime)) return false;
    if (!/\bprivate\b/.test(cacheControl) || !/\bimmutable\b/.test(cacheControl)) return false;
    const size = Number(body.byteLength ?? body.length ?? 0);
    if (!Number.isFinite(size) || size <= 0 || size > maxEntryBytes || size + bytes > maxTotalBytes) return false;
    const value = Buffer.from(body);
    entries.set(uri, {
      body: value,
      headers: {
        "content-type": mime,
        "cache-control": "private, max-age=31536000, immutable",
        "x-content-type-options": "nosniff"
      }
    });
    bytes += size;
    return true;
  }

  return {
    canHandle, get, put,
    stats() { return { hits, misses, entries: entries.size, bytes }; }
  };
}
