import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");

test("MIDAS company tracking table exposes the requested decision columns", () => {
  for (const label of [
    "Ticker",
    "Nombre empresa",
    "Mercado",
    "Precio actual",
    "Bull 5a",
    "Bear 5a",
    "Central 5a",
    "Precio 15%",
    "Objetivo 5a",
    "Próx. resultados",
    "Tesis"
  ]) assert.match(source, new RegExp(label));
  assert.match(source, /Abrir tesis/);
  assert.match(source, /safeMidasThesisUrl/);
  assert.match(source, /priceFor15/);
  assert.match(source, /basePrice5y/);
});


test("MIDAS workspace separates competition, research and catalog into top tabs", () => {
  assert.match(source, /data-midas-tab="competition"/);
  assert.match(source, /Competición de algoritmos/);
  assert.match(source, /data-midas-tab="research"/);
  assert.match(source, /Seguimiento de tesis/);
  assert.match(source, /data-midas-tab="catalog"/);
  assert.match(source, /Catálogo \/ histórico/);
  assert.match(source, /function bindMidasWorkspace/);
  assert.match(source, /renderMidasAlgorithmDetail/);
});
