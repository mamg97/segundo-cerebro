import assert from "node:assert/strict";
import { test } from "node:test";
import { nutritionMacroProvenance, nutritionMacroVisibleNote } from "./nutrition-macro-provenance.mjs";

test("photograph of meal is an estimate, not nutrition label", () => {
  const value = nutritionMacroProvenance({kcal:670,protein:42,note:"MACROS_FUENTE=FOTO_PLATO. Estimación VISUAL\nConsumo confirmado"});
  assert.deepEqual(value,{label:"Foto del plato · estimado",kind:"photo"});
});
test("photograph of nutrition label has separate source", () => {
  const value = nutritionMacroProvenance({kcal:499.5,protein:6.45,note:"MACROS_FUENTE=ETIQUETA_FOTOGRAFIADA. Media bolsa\nConsumo confirmado"});
  assert.deepEqual(value,{label:"Etiqueta fotografiada",kind:"label"});
});
test("product fiche, estimated recipe and pending are not mislabelled", () => {
  assert.equal(nutritionMacroProvenance({kcal:158.4,protein:23.1,note:"MACROS_FUENTE=FICHA_PRODUCTO. Comercial\n"}).kind,"product");
  assert.equal(nutritionMacroProvenance({kcal:740,protein:42,note:"MACROS_FUENTE=CALCULO_ESTIMADO. Cantidades estimadas\n"}).kind,"estimate");
  assert.equal(nutritionMacroProvenance({kcal:null,protein:null,note:"MACROS_FUENTE=PENDIENTE. Sopas sin concretar\n"}).kind,"pending");
});
test("unmarked values never imply a real photographed label", () => {
  assert.equal(nutritionMacroProvenance({kcal:100,protein:8,note:"Hacendado"}).kind,"unknown");
  assert.equal(nutritionMacroProvenance({kcal:null,protein:null,note:""}).kind,"pending");
});
test("source metadata hidden from visible description without erasing context", () => {
  assert.equal(nutritionMacroVisibleNote("MACROS_FUENTE=FOTO_PLATO. Foto\nTexto original"),"Texto original");
  assert.equal(nutritionMacroVisibleNote("Texto original"),"Texto original");
});
