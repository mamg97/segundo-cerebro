import { createHash } from "node:crypto";

// A content fingerprint, not a hand-maintained release number. The input is
// built public frontend code, never private Sheets, secrets or runtime state.
export function fingerprintStaticAsset(bytes) {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 16);
}

export function stampStaticEntrypoints(html, revisions) {
  const observed = new Set();
  const rewritten = String(html).replace(
    /\b(href|src)="\.\/(app\.js|styles\.css)(?:\?v=[^"]*)?"/g,
    (_, attribute, asset) => {
      const revision = String(revisions?.[asset] || "");
      if (!/^[a-f0-9]{16}$/.test(revision)) throw new Error("STATIC_REVISION_MISSING");
      observed.add(asset);
      return `${attribute}="./${asset}?v=${revision}"`;
    }
  );
  if (!observed.has("app.js") || !observed.has("styles.css")) {
    throw new Error("STATIC_ENTRYPOINT_NOT_FOUND");
  }
  return rewritten;
}
