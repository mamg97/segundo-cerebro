import test from "node:test";
import assert from "node:assert/strict";
import { fingerprintStaticAsset, fingerprintFrontendAssets, stampStaticEntrypoints } from "./static-revisions.mjs";

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

test("Boda module change updates entire frontend revision even when app.js unchanged",()=>{
 const base=[
  ["app/app.js","import { wedding } from './wedding.js'"],
  ["app/wedding.js","export const wedding='old'"],
  ["app/wedding.css",".wed-floor-plan{height:400px}"],
  ["core/mock-state.js","export const test=true"]
 ];
 const changed=base.map(([path,bytes])=>[path,path==="app/wedding.js"?"export const wedding='new'":bytes]);
 assert.notEqual(fingerprintFrontendAssets(base),fingerprintFrontendAssets(changed));
 assert.equal(fingerprintFrontendAssets(base),fingerprintFrontendAssets([...base].reverse()));
 assert.throws(()=>fingerprintFrontendAssets([]),/FRONTEND_ASSETS_REQUIRED/);
});
test("all CSS entrypoint URLs are fingerprinted automatically, including Boda",()=>{
 const html='<link rel="stylesheet" href="./styles.css?v=old"><link rel="stylesheet" href="./wedding.css?v=0.2.5"><script type="module" src="./app.js?v=old"></script>';
 const revisions={"app.js":"1111111111111111","styles.css":"2222222222222222","wedding.css":"3333333333333333"};
 const out=stampStaticEntrypoints(html,revisions);
 assert.match(out,/wedding\.css\?v=3333333333333333/);
 assert.doesNotMatch(out,/wedding\.css\?v=0\.2\.5/);
 assert.throws(()=>stampStaticEntrypoints(html,{"app.js":"1111111111111111","styles.css":"2222222222222222"}),/STATIC_REVISION_MISSING/);
});
