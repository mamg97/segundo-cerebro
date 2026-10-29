import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const sw = readFileSync(new URL("./pwa-sw.js", import.meta.url), "utf8");
const register = readFileSync(new URL("./pwa-register.mjs", import.meta.url), "utf8");
const boot = readFileSync(new URL("./startup-watchdog.js", import.meta.url), "utf8");
const build = readFileSync(new URL("../private-cloudflare/scripts/build.mjs", import.meta.url), "utf8");

test("private build starts independent watchdog before the module graph", () => {
  assert.match(build, /<script src="\.\/startup-watchdog\.js"><\/script>/);
  assert.match(boot, /TIMEOUT_MS = 20_000/);
  assert.match(boot, /segun:boot-failed/);
  assert.match(boot, /navigator\.serviceWorker\.getRegistrations/);
  assert.match(boot, /segun-public-static-/);
  assert.match(boot, /location\.replace\(next\.href\)/);
  assert.doesNotMatch(readFileSync(new URL("./index.html", import.meta.url), "utf8"), /startup-watchdog\.js/);
});

test("failed /api/state cannot silently declare the private page ready", () => {
  assert.match(app, /dataset\.segunBoot = "loading"/);
  assert.match(app, /const ready = globalThis\.__SECOND_BRAIN_REMOTE__ !== true \|\| privateModeKind === "remote"/);
  assert.match(app, /segun:boot-failed/);
  assert.match(app, /init\(\)\.catch\(/);
});

test("Safari never prefers old JS cache and SW does not prewarm large scripts", () => {
  assert.match(sw, /const networkFirst = /);
  assert.match(sw, /networkFirst && cached/);
  assert.doesNotMatch(sw, /networkFirst = .*searchParams\.has/);
  assert.match(sw, /startup-watchdog\.js/);
  assert.doesNotMatch(sw, /PREWARM/);
  assert.doesNotMatch(sw, /Promise\.allSettled/);
  assert.doesNotMatch(register, /registration\.update\(/);
  assert.match(sw, /request\.mode === "navigate"/);
  assert.match(sw, /url\.pathname\.startsWith\("\/app\/"\)/);
});
