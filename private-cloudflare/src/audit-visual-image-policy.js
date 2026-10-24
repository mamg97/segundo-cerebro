// Browser <img> loading is not subject to the same CORS restrictions as fetch.
// Keep authenticated same-origin media under strict HTTP 200 + MIME + decode
// verification; external product thumbnails require an actual browser image
// load with positive natural dimensions. No URL is emitted to public logs.
export function isExternalAuditImageSource(src, appOrigin) {
  try {
    const base = new URL(appOrigin);
    const target = new URL(String(src || ""), base);
    return (target.protocol === "https:" || target.protocol === "http:") &&
      target.origin !== base.origin;
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
  return Number(probe.status) === 200 &&
    /^image\//i.test(String(probe.contentType || ""));
}
