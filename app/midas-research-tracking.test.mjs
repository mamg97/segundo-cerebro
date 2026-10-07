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
    "Bull case a 5 años",
    "Bear case a 5 años",
    "Caso central a 5 años",
    "Precio para generar 15% anual",
    "Precio objetivo a 5 años",
    "Fecha próximos resultados",
    "Tesis"
  ]) assert.match(source, new RegExp(label));
  assert.match(source, /Abrir tesis/);
  assert.match(source, /safeMidasThesisUrl/);
  assert.match(source, /priceFor15/);
  assert.match(source, /basePrice5y/);
});
