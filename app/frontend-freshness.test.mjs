import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  privateAppRevision, privateAppRevisionFromHtml, safeToReloadFrontend
} from "./frontend-freshness.mjs";

const VALID = "0123456789abcdef";

test("private release guard reads content-fingerprinted app entrypoint only", () => {
  assert.equal(privateAppRevision("./app.js?v=" + VALID),VALID);
  assert.equal(privateAppRevision("/app/app.js?v=" + VALID),VALID);
  assert.equal(privateAppRevision("https://example.test/app/app.js?v=" + VALID),VALID);
  for (const bad of ["",null,"./app.js?v=0.44.33","./styles.css?v=" + VALID,
    "/admin/app.js?v=" + VALID,"/app/app.js?v=xyz","/app/app.js"]){
    assert.equal(privateAppRevision(bad),null);
  }
});

test("release manifest parser accepts actual private script but ignores login pages", () => {
  const html='<html><script src="../private-config.js"></script><script type="module" src="./app.js?v=' + VALID + '"></script></html>';
  assert.equal(privateAppRevisionFromHtml(html),VALID);
  assert.equal(privateAppRevisionFromHtml("<html><form>SSO login</form></html>"),null);
  assert.equal(privateAppRevisionFromHtml("<script type='module' src='./app.js?v=0.44.33'></script>"),null);
  assert.equal(privateAppRevisionFromHtml("<script src='./app.js?v=" + VALID + "'></script>"),null);
  assert.equal(privateAppRevisionFromHtml(null),null);
});

test("unsafe editing state prevents unsolicited reload", () => {
  assert.equal(safeToReloadFrontend(),true);
  for(const state of [{dirty:true},{editing:true},{dialogOpen:true},{dirty:true,dialogOpen:true}]){
    assert.equal(safeToReloadFrontend(state),false);
  }
});

test("remote app checks revisions on visibility/focus without periodic polling", () => {
  const app = readFileSync(new URL("./app.js",import.meta.url),"utf8");
  const css = readFileSync(new URL("./styles.css",import.meta.url),"utf8");
  assert.match(app,/import \{ installPrivateAppFreshnessGuard \} from "\.\/frontend-freshness\.mjs\?v=0\.44\.34";/);
  assert.match(app,/installPrivateAppFreshnessGuard\(\);/);
  const source = readFileSync(new URL("./frontend-freshness.mjs",import.meta.url),"utf8");
  assert.match(source,/window\.addEventListener\("focus"/);
  assert.match(source,/document\.addEventListener\("visibilitychange"/);
  assert.match(source,/window\.addEventListener\("pageshow"/);
  assert.match(source,/cache: "no-store"/);
  assert.doesNotMatch(source,/setInterval\s*\(/);
  assert.match(css,/\.private-app-update-notice/);
});
