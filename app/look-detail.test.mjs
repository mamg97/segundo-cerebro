import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [objects, css, app, index, audit] = await Promise.all([
  readFile(new URL("./objects.js", import.meta.url), "utf8"),
  readFile(new URL("./styles.css", import.meta.url), "utf8"),
  readFile(new URL("./app.js", import.meta.url), "utf8"),
  readFile(new URL("./index.html", import.meta.url), "utf8"),
  readFile(new URL("../private-cloudflare/scripts/web-audit.mjs", import.meta.url), "utf8")
]);

test("look cards open a canonical detail view", () => {
  assert.match(objects, /data-look-open=/);
  assert.match(objects, /function detailLook\(look,payload\)/);
  assert.match(objects, /look-detail-layout/);
  assert.match(objects, /look-detail-main/);
  assert.match(objects, /look-detail-items/);
  assert.match(objects, /data-object-open/);
  assert.match(objects, /event\.key==="Enter"\|\|event\.key===" "/);
});

test("look detail enlarges the look and shows component garments responsively", () => {
  assert.match(css, /\.look-detail-layout\s*\{[\s\S]*?grid-template-columns:\s*minmax\(320px, 1\.35fr\) minmax\(300px, \.85fr\)/);
  assert.match(css, /\.look-detail-main\s*\{[\s\S]*?min-height:\s*560px/);
  assert.match(css, /\.look-detail-main > img,[\s\S]*?object-fit:\s*contain/);
  assert.match(css, /\.look-detail-item-image img\s*\{[\s\S]*?object-fit:\s*contain/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.look-detail-layout\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.look-detail-items,[\s\S]*?grid-template-columns:\s*1fr/);
});

test("look detail cache bust and production audit are wired", () => {
  assert.match(app, /objects\.js\?v=0\.41\.3/);
  assert.match(index, /styles\.css\?v=0\.42\.10/);
  assert.match(index, /app\.js\?v=0\.42\.5/);
  assert.match(audit, /auditLookDetail/);
  assert.match(audit, /Look ampliado/);
  assert.match(audit, /Prendas del look/);
});
