import test from "node:test";
import assert from "node:assert/strict";
import { validateMenuMealSelection, annotateWeeklyMenuStructure } from "./menu-selection-contract.js";

const recipe = (id = "recipe-example") => ({itemRole:"receta",recipeId:id, status:"planificado"});
const companion = (type, id = "product-example") =>
  ({itemRole:"acompañante",companionType:type,foodId:id, status:"planificado"});

test("breakfast lunch and dinner require exactly one canonical recipe", () => {
  for (const moment of ["Desayuno","Comida","Cena"]) {
    assert.equal(validateMenuMealSelection(moment,[recipe(),companion("fruta")]).valid,true);
    assert.deepEqual(validateMenuMealSelection(moment,[companion("yogur")]).issues,["main-recipe-required"]);
    assert.ok(validateMenuMealSelection(moment,[recipe("one"),recipe("two")]).issues.includes("multiple-main-recipes"));
  }
});

test("midmorning and afternoon snack may contain only companions with no recipe", () => {
  for (const moment of ["Media mañana","Merienda"]) {
    const v=validateMenuMealSelection(moment,[companion("yogur"),companion("fruta"),companion("batido")]);
    assert.equal(v.valid,true);
    assert.equal(v.recipeCount,0);
    assert.equal(v.companionCount,3);
    assert.equal(validateMenuMealSelection(moment,[recipe(),companion("fruta")]).valid,true);
    assert.ok(validateMenuMealSelection(moment,[recipe("one"),recipe("two")]).issues.includes("multiple-main-recipes"));
  }
});

test("homemade shake can reference a recipe without becoming the main recipe", () => {
  const v=validateMenuMealSelection("Merienda",[{itemRole:"acompanante",companionType:"batido",recipeId:"shake-recipe"}]);
  assert.equal(v.valid,true);
  assert.equal(v.recipeCount,0);
});

test("no arbitrary packaged item or unlinked menu label passes as a recipe", () => {
  assert.ok(validateMenuMealSelection("Cena",[{itemRole:"receta",name:"Imaginary dish"}]).issues.includes("recipe-id-required"));
  assert.ok(validateMenuMealSelection("Merienda",[companion("snack")]).issues.includes("invalid-companion-type"));
  assert.ok(validateMenuMealSelection("Media mañana",[{itemRole:"acompanante",companionType:"fruta"}]).issues.includes("companion-reference-required"));
});

test("one yogurt dessert per lunch or dinner, with normal named yogurt at snack", () => {
  assert.ok(validateMenuMealSelection("Comida",[recipe(),companion("yogur","one"),companion("yogur","two")]).issues.includes("multiple-yogurt-desserts"));
  assert.equal(validateMenuMealSelection("Merienda",[companion("yogur","one"),companion("yogur","two")]).valid,true);
});

test("existing untyped historical records remain intact and never gain invented recipes", () => {
  const input=[{date:"2026-01-05",moment:"Cena",name:"Historical dish",kcal:375,protein:17,status:"consumido"}];
  const [out]=annotateWeeklyMenuStructure(input);
  assert.equal(out.mealStructureStatus,"legacy");
  assert.equal(out.kcal,375);
  assert.equal(out.protein,17);
  assert.equal(out.status,"consumido");
  assert.equal(out.recipeId,undefined);
  assert.deepEqual(input,[{date:"2026-01-05",moment:"Cena",name:"Historical dish",kcal:375,protein:17,status:"consumido"}]);
});

test("future typed meals surface missing recipe, even with known calories", () => {
  const [out]=annotateWeeklyMenuStructure([{date:"2026-02-03",moment:"Comida",itemRole:"acompanante",companionType:"fruta",foodId:"fruit",kcal:105}]);
  assert.equal(out.mealStructureStatus,"invalid");
  assert.ok(out.mealStructureIssues.includes("main-recipe-required"));
  assert.equal(out.kcal,105);
});

test("missing type in a partially typed group is rejected instead of silently ignored", () => {
  const a=annotateWeeklyMenuStructure([
    {date:"2026-03-04",moment:"Desayuno",itemRole:"receta",recipeId:"rec-one"},
    {date:"2026-03-04",moment:"Desayuno",name:"Unknown legacy addition"}
  ]);
  assert.ok(a.every(x=>x.mealStructureIssues.includes("item-role-required")));
});
