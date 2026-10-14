import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");

test("MIDAS navigation scrolls with dialog instead of floating over table rows", () => {
  const match = css.match(/\.midas-workspace-tabs\s*\{([^}]*)\}/);
  assert.ok(match, "tabs have a dedicated CSS rule");
  assert.match(match[1], /position:\s*static\s*;/);
  assert.doesNotMatch(match[1], /position:\s*(?:sticky|fixed|absolute)/);
  assert.doesNotMatch(match[1], /\btop:\s*0/);
  assert.doesNotMatch(match[1], /z-index:/);
  const nav = app.indexOf('class="midas-workspace-tabs"');
  const table = app.indexOf('data-midas-panel="competition"', nav);
  assert.ok(nav >= 0 && table > nav, "tabs remain above the table in normal DOM flow");
});

test("tabs remain usable on narrow screens and cache-busted bundles stay aligned", () => {
  assert.match(css, /\.midas-workspace-tabs\s*\{\s*overflow-x:\s*auto;/);
  assert.match(app, /\[data-midas-tab\]/);
  assert.match(html, /\.\/styles\.css\?v=0\.44\.31/);
  assert.match(html, /\.\/app\.js\?v=0\.44\.31/);
});

test("production Chromium verifies MIDAS scroll on desktop and mobile without suppressing transport errors", () => {
  const audit = readFileSync(new URL("../private-cloudflare/scripts/web-audit.mjs", import.meta.url), "utf8");
  assert.match(audit, /pestañas abandonan el área visible al hacer scroll/);
  assert.match(audit, /width: 390, height: 844/);
  assert.match(audit, /layout.position === "static"/);
  assert.match(audit, /layout.moved >= 40/);
  assert.match(audit, /AUDIT_IMAGE_ROUTE_DIAG/);
  assert.match(audit, /imageRouteFailures\.set/);
  assert.match(audit, /await route\.abort\("failed"\)/);
});
