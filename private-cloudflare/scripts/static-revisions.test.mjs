import test from "node:test";
import assert from "node:assert/strict";
import { fingerprintStaticAsset, stampStaticEntrypoints } from "./static-revisions.mjs";

test("asset changes always produce a distinct URL without a manual version bump", () => {
  const html = '<link rel="stylesheet" href="./styles.css?v=0.44.32"><script type="module" src="./app.js?v=0.44.32"></script>';
  const a = fingerprintStaticAsset('function oldApp() {}');
  const b = fingerprintStaticAsset('function newApp() {}');
  assert.notEqual(a, b);
  const before = stampStaticEntrypoints(html, { "app.js": a, "styles.css": fingerprintStaticAsset("old CSS") });
  const after = stampStaticEntrypoints(html, { "app.js": b, "styles.css": fingerprintStaticAsset("new CSS") });
  assert.match(after, new RegExp("app\\.js\\?v=" + b));
  assert.match(after, /styles\.css\?v=[0-9a-f]{16}/);
  assert.notEqual(after, before);
  assert.doesNotMatch(after, /v=0\.44\.32/);
});

test("revisioning never touches unrelated URLs, private config or markup", () => {
  const html = '<link href="./styles.css"><script src="../private-config.js"></script><script type="module" src="./app.js"></script><img src="./brain-logo.png?v=1">';
  const out = stampStaticEntrypoints(html, { "app.js": "abcdef0123456789", "styles.css": "1234567890abcdef" });
  assert.match(out, /app\.js\?v=abcdef0123456789/);
  assert.match(out, /styles\.css\?v=1234567890abcdef/);
  assert.match(out, /src="\.\.\/private-config\.js"/);
  assert.match(out, /brain-logo\.png\?v=1/);
  assert.throws(() => stampStaticEntrypoints(html, { "app.js": "abc" }), /STATIC_REVISION_MISSING/);
  assert.throws(() => stampStaticEntrypoints("<html></html>", { "app.js": "abcdef0123456789", "styles.css": "1234567890abcdef" }), /STATIC_ENTRYPOINT_NOT_FOUND/);
});
