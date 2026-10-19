import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const begin = source.indexOf("function renderBudgetGroup(name, items, currency) {");
const end = source.indexOf("function renderBudgetCategoryDetail(item, currency) {", begin);
assert.ok(begin > 0 && end > begin, "budget renderer exists in the live app");

const fixtures = new Function(
  "escapeHtml", "numberOrZero", "formatMoney", "renderBudgetCategoryDetail",
  source.slice(begin, end) +
  "\nreturn { renderBudgetGroup, renderBudgetCompactRow, renderBudgetCompactTable };"
)(
  (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"),
  (value) => Number(value) || 0,
  (value) => Number(value).toFixed(2) + " €",
  (item) => "<article class=\"budget-category-item\">" + item.title + "</article>"
);

const mk = (props) => ({
  id: "fixture-item",
  title: "Partida de prueba",
  budgeted: 200, spent: 120, committed: 15, remaining: 65,
  sourceStatus: "RECONCILIADO_SHEET",
  note: "Comentario de auditoría visible solo al desplegar",
  ...props
});

test("shared budget uses compact rows while personal budget retains existing cards", () => {
  const shared = fixtures.renderBudgetGroup("Común", [mk({})], "EUR");
  const personal = fixtures.renderBudgetGroup("Miguel", [mk({})], "EUR");
  assert.match(shared, /class="budget-compact-table"/);
  assert.match(shared, /budget-compact-columns/);
  assert.match(shared, /<details class="budget-compact-entry/);
  assert.doesNotMatch(shared, /class="budget-detail-list"/);
  assert.match(personal, /class="budget-detail-list"/);
  assert.doesNotMatch(personal, /class="budget-compact-table"/);
});

test("progress includes committed funds but columns keep spent distinct", () => {
  const html = fixtures.renderBudgetCompactRow(mk({}), "EUR");
  assert.match(html, /value="67.5"/);
  assert.match(html, />68%<\/span>/);
  assert.match(html, /budget-compact-planned" data-label="Prev.">200.00 €/);
  assert.match(html, /budget-compact-spent" data-label="Gast.">120.00 €/);
  assert.match(html, /Comprometido <strong>15.00 €/);
  assert.match(html, /Saldo partida <strong>65.00 €/);
  assert.match(html, /budget-compact-note/);
});

test("overspent budget uses capped red bar without losing true percentage", () => {
  const html = fixtures.renderBudgetCompactRow(mk({ budgeted: 100, spent: 140, committed: 10, remaining: -50 }), "EUR");
  assert.match(html, /budget-compact-entry is-over/);
  assert.match(html, /value="100"/);
  assert.match(html, />150%<\/span>/);
  assert.match(html, /budget-compact-remaining is-negative/);
  assert.match(html, />-50.00 €<\/span>/);
});

test("zero budget and missing notes render safely", () => {
  const html = fixtures.renderBudgetCompactRow(mk({ budgeted: 0, spent: 10, committed: 0, remaining: -10, note: "" }), "EUR");
  assert.match(html, /Sin partida/);
  assert.match(html, /budget-compact-entry is-over/);
  assert.doesNotMatch(html, /NaN|Infinity/);
  assert.doesNotMatch(html, /class="budget-compact-note"/);
});

test("audit notes escaped and electricity history remains accessible on expansion", () => {
  const html = fixtures.renderBudgetCompactRow(mk({ title: "Luz", note: "<script>alert(1)</script>" }), "EUR");
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script>/);
  assert.match(html, /data-open-electricity="true"/);
  assert.match(source, /querySelectorAll\('\[data-open-electricity="true"\]'\)/);
});

test("compact rows adapt to mobile and keep details behind native disclosure", () => {
  assert.match(styles, /\.budget-compact-columns[\s\S]*?grid-template-columns:/);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*?\.budget-compact-columns \{ display: none; \}/);
  assert.match(styles, /\.budget-compact-entry\[open\]/);
  assert.match(styles, /\.budget-compact-line:focus-visible/);
});
