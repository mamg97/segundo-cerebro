import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dueForVisibleRefresh } from "./pwa-register.mjs";

const sw = readFileSync(new URL("./pwa-sw.js", import.meta.url), "utf8");
const build = readFileSync(new URL("../private-cloudflare/scripts/build.mjs", import.meta.url), "utf8");
const worker = readFileSync(new URL("../private-cloudflare/src/index.js", import.meta.url), "utf8");

test("PWA is injected into authenticated private build, not public index", () => {
  const publicHtml = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  assert.doesNotMatch(publicHtml, /rel="manifest"|pwa-register\.mjs/);
  assert.match(build, /pwa-register\.mjs/);
  assert.match(build, /manifest\.webmanifest/);
  assert.match(build, /pwa-sw\.js/);
  assert.match(build, /__BUILD_REVISION__/);
});

test("static-only service worker excludes private API, HTML, Access and credential config", () => {
  assert.match(sw, /url\.pathname\.startsWith\("\/app\/"\)/);
  assert.match(sw, /request\.mode === "navigate"/);
  assert.match(sw, /STATIC_FILE\.test/);
  assert.match(sw, /no-store\|no-cache/);
  assert.match(sw, /response\.redirected/);
  assert.match(sw, /Set-Cookie/);
  assert.doesNotMatch(sw, /caches\.match\(.*\/api\//);
  assert.match(worker, /isHtml \? "no-store"/);
});

test("auto-refresh is 5-minute, visible, online, and edit-safe", () => {
  const base = { now: 300_000, lastRefreshAt: 0, visible: true, online: true, editing: false, dialogOpen: false, quietUntil: 0, busy: false };
  assert.equal(dueForVisibleRefresh(base), true);
  for (const patch of [{now:299_999}, {visible:false}, {online:false},
    {editing:true}, {dialogOpen:true}, {quietUntil:300_001}, {busy:true}]) {
    assert.equal(dueForVisibleRefresh({ ...base, ...patch }), false);
  }
  assert.match(readFileSync(new URL("./pwa-register.mjs", import.meta.url), "utf8"), /button\.click\(\)/);
});
