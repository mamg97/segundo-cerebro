import { createHash } from "node:crypto";

// A content fingerprint, not a hand-maintained release number. The input is
// built public frontend code, never private Sheets, secrets or runtime state.
export function fingerprintStaticAsset(bytes) {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 16);
}

// Fingerprint the entire shipped frontend dependency set, rather than app.js
// alone. This makes a Boda/other module-only update detectable in open tabs.
export function fingerprintFrontendAssets(entries) {
  if (!Array.isArray(entries) || !entries.length) throw new Error("FRONTEND_ASSETS_REQUIRED");
  const digest = entries.map(([path, content]) => [path, fingerprintStaticAsset(content)])
    .sort((a, b) => a[0].localeCompare(b[0], "en"))
    .map(([path, hash]) => path + ":" + hash).join("\\n");
  return fingerprintStaticAsset(digest);
}

export function stampStaticEntrypoints(html, revisions) {
  const observed = new Set();
  const rewritten = String(html).replace(
    /\b(href|src)="\.\/(app\.js|[a-z0-9._-]+\.css)(?:\?v=[^"]*)?"/gi,
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


// Re-stamp every local JS module edge for a coherent release. Otherwise a
// fingerprinted app.js may still import stale Safari/PWA-cached child modules.
export function stampModuleImportRevisions(source, revision) {
  if (!/^[a-f0-9]{16}$/.test(revision)) throw new Error("MODULE_REVISION_MISSING");
  return String(source).replace(
    /(\b(?:from\s*|import\s*(?:\(\s*)?)["'])(\.{1,2}\/[^"'?#\s]+\.m?js)(?:\?v=[^"'#\s]*)?(["'])/g,
    (_, prefix, asset, quote) => prefix + asset + "?v=" + revision + quote
  );
}
