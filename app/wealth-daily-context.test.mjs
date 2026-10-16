import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const source = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const start = source.indexOf("function renderWealthDailyRows(");
const end = source.indexOf("\nfunction renderWealthDailyDiary(", start);
assert.ok(start >= 0 && end > start, "El diario debe conservar su renderizador");

const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const render = runInNewContext(
  source.slice(start, end) + "\nrenderWealthDailyRows;",
  {
    escapeHtml,
    formatFinanceDate: (value) => String(value),
    formatMoney: (value) => String(value),
    firstFinite: (value) => value === null || value === undefined || value === "" ? null : Number(value),
    wealthDailyTone: (value) => Number(value) < 0 ? "negative" : "positive",
    formatWealthDailyPercent: (value) => String(value)
  }
);

test("el diario presenta un comentario desplegable sin ejecutar HTML inyectado", () => {
  const html = render([{
    date: "2026-10-16",
    patrimony: null,
    currency: "EUR",
    changePct: -0.01,
    pnlDay: -100,
    movement: "CAÍDA",
    comment: "Ventas tecnológicas <script>alert(1)</script>",
    events: "Contexto contrastado"
  }], "EUR");
  assert.match(html, /<th>Comentario<\/th>/);
  assert.match(html, /wealth-daily-comment/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /Contexto contrastado/);
  assert.match(html, /<td>—<\/td>/);
});

test("el diario sin anotación representa vacío sin fabricar un relato", () => {
  const html = render([{ date: "2026-10-15", comment: "", events: "", movement: "PENDIENTE" }], "EUR");
  assert.doesNotMatch(html, /class="wealth-daily-comment"/);
  assert.match(html, /PENDIENTE/);
});
