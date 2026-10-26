// Browser <img> loading can succeed without CORS even when fetch() rejects.
// Private same-origin assets retain strict HTTP 200 + MIME + decode checks.
export function isExternalAuditImageSource(src, appOrigin) {
  try {
    const base = new URL(appOrigin);
    const target = new URL(String(src || ""), base);
    return ["http:", "https:"].includes(target.protocol) && target.origin !== base.origin;
  } catch {
    return false;
  }
}

export function isVerifiedAuditVisualImage(probe, src, appOrigin) {
  if (!probe?.ok || !probe?.decoded) return false;
  if (isExternalAuditImageSource(src, appOrigin)) {
    return probe.verification === "BROWSER_IMAGE_LOAD" &&
      Number(probe.width) > 0 && Number(probe.height) > 0;
  }
  return Number(probe.status) === 200 && /^image\//i.test(String(probe.contentType || ""));
}
