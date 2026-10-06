import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [index, app, css, worker, audit] = await Promise.all([
  readFile(new URL("./index.html", import.meta.url), "utf8"),
  readFile(new URL("./app.js", import.meta.url), "utf8"),
  readFile(new URL("./styles.css", import.meta.url), "utf8"),
  readFile(new URL("../private-cloudflare/src/index.js", import.meta.url), "utf8"),
  readFile(new URL("../private-cloudflare/scripts/web-audit.mjs", import.meta.url), "utf8")
]);

test("Home exposes the data-driven gifts panel", () => {
  assert.match(index, /class="finance-right-stack"/);
  assert.match(index, /class="gifts-panel"/);
  assert.match(index, /id="gifts-year"/);
  assert.match(index, /id="gifts-summary"/);
  assert.match(index, />Bodas y Reyes</);

  assert.match(app, /function renderGiftsOverview\(\)/);
  assert.match(app, /Sobre de regalos/);
  assert.match(app, /próximas bodas/);
  assert.match(app, /pendiente de tu madre/);
  assert.match(app, /gift-monthly-table/);
  assert.match(app, /gift-paid-list/);\n  assert.match(app, /gift-envelope-head/);\n  assert.match(app, /gift-next-year/);
});

test("Finance summary reads gifts from the canonical derived Sheet", () => {
  assert.match(worker, /fetchOptionalFinanceRows\("Regalos!A1:P300"\)/);
  assert.match(worker, /const giftRecords = parseTableRows\(giftRows\)/);
  assert.match(worker, /kind === "fund_month"/);
  assert.match(worker, /kind === "wedding"/);
  assert.match(worker, /gifts: giftSummary/);\n  assert.match(worker, /nextYearWeddings: giftNextYearWeddingRows/);\n  assert.match(worker, /cashAvailable:/);\n  assert.match(worker, /pendingCash:/);
  assert.doesNotMatch(worker, /Panzuela|Mariadolores|Silvia|Pablo/);
});

test("Gifts panel is responsive and audit-covered", () => {
  assert.match(css, /v0\.42\.28 — gifts envelope reconciliation \+ 2027 wedding plan/);
  assert.match(css, /\.gifts-summary-grid\s*\{[\s\S]*?grid-template-columns:/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*?\.gifts-summary-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(css, /\.gift-monthly-table\s*\{/);
  assert.match(css, /\.gift-wedding-row\s*\{/);

  assert.match(audit, /Regalos · panel visible/);
  assert.match(audit, /Regalos · sobre actual y bodas futuras disponibles/);
  assert.match(audit, /Regalos · estructura de sobre, fondos y bodas/);\n  assert.match(audit, /Regalos · sin overflow/);
  assert.match(audit, /Patrimonio y columna Obligaciones\/Regalos alineados/);
  assert.match(audit, /Regalos ocupa el hueco bajo Obligaciones sin solape/);
});
