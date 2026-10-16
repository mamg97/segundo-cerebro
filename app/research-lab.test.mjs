import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const js = readFileSync(new URL("./research-lab.js", import.meta.url), "utf8");
const html = readFileSync(new URL("./research-lab.html", import.meta.url), "utf8");
const css = readFileSync(new URL("./research-lab.css", import.meta.url), "utf8");
const worker = readFileSync(new URL("../private-cloudflare/src/index.js", import.meta.url), "utf8");

test("dashboard respects restrictive style CSP", () => {
  assert.match(worker, /style-src 'self'/);
  assert.doesNotMatch(js, /style\s*=/i);
  assert.doesNotMatch(html, /style\s*=/i);
  assert.match(js, /<progress class="track-bar"/);
  assert.match(css, /progress\.track-bar::-webkit-progress-value/);
});
test("scores stay data-driven with empty states", () => {
  assert.match(js, /\/api\/research-lab/);
  assert.match(js, /Sin datos/);
  assert.match(js, /Sin medición/);
  assert.match(js, /data-track/);
  assert.match(html, /noindex,nofollow,noarchive/);
});
