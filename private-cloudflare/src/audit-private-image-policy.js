// Only versioned, same-origin private object images are eligible for the
// audit runner's bounded, in-memory reuse. This is not an HTTP cache policy.
export const AUDIT_IMMUTABLE_IMAGE_HINT = "x-segundo-cerebro-audit-private-immutable";

export function eligibleAuditImageUrl(uri, origin, method = "GET") {
  if (method !== "GET") return false;
  let url;
  try { url = new URL(uri); } catch { return false; }
  if (url.origin !== origin || !/^[A-Za-z0-9-]{8,80}$/.test(url.searchParams.get("v") || "")) return false;
  if ([...url.searchParams.keys()].some((key) => key !== "v")) return false;
  return /^\/api\/objects\/look\/[^/]+\/image$/.test(url.pathname) ||
    /^\/api\/objects\/[^/]+\/image\/(processed|thumbnail)$/.test(url.pathname);
}

export function eligibleAuditImageResponse(uri, origin, method, status, headers) {
  if (!eligibleAuditImageUrl(uri, origin, method) || Number(status) !== 200) return false;
  const mime = String(headers.get("content-type") || "").toLowerCase();
  const cacheControl = String(headers.get("cache-control") || "").toLowerCase();
  return /^image\/(?:png|jpeg|webp|svg\+xml)(?:;|$)/.test(mime) &&
    /\bprivate\b/.test(cacheControl) &&
    /\bimmutable\b/.test(cacheControl) &&
    !/\bno-store\b/.test(cacheControl);
}
