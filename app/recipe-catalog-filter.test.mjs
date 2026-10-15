import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {recipeIngredientKey,recipeIngredientChoices,recipeCatalogItems} from "./recipe-catalog-filter.mjs";
const rows=[
  {id:"a",name:"Sample without photo",ingredients:[{name:"Tomate"}]},
  {id:"b",name:"Sample with photo",photoUrl:"/api/health/recipes/example/image?v=1",ingredients:[{name:"Queso"},{name:"Tomate"}]},
  {id:"c",name:"Another with photo",photoUrl:"/api/health/recipes/other/image?v=1",ingredients:[{name:"Tomate"},{name:"TOMATE"}]},
  {id:"d",name:"Second without photo",ingredients:[{name:"Queso"}]}
];
test("photographed recipes appear first, preserving source order within groups",()=>{
  assert.deepEqual(recipeCatalogItems(rows).map(x=>x.id),["b","c","a","d"]);
  assert.deepEqual(rows.map(x=>x.id),["a","b","c","d"]);
});
test("ingredient options come from recipe ingredients, not static categories",()=>{
  assert.deepEqual(recipeIngredientChoices(rows),[
    {key:"queso",label:"Queso",count:2},{key:"tomate",label:"Tomate",count:3}
  ]);
  assert.deepEqual(recipeIngredientChoices(null),[]);
  assert.equal(recipeIngredientKey("  TÓMATE   "),"tomate");
});
test("strict ingredient filtering never infers ingredients from recipe names",()=>{
  assert.deepEqual(recipeCatalogItems(rows,"tomate").map(x=>x.id),["b","c","a"]);
  assert.deepEqual(recipeCatalogItems(rows,"QUESO").map(x=>x.id),["b","d"]);
  assert.deepEqual(recipeCatalogItems(rows,"pan"),[]);
  assert.deepEqual(recipeCatalogItems(rows,"").map(x=>x.id),["b","c","a","d"]);
  assert.deepEqual(recipeCatalogItems([{name:"Tomate"}],"tomate"),[]);
});
test("UI wires stable ingredient selection and photo-first projection",()=>{
  const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
  const css=readFileSync(new URL("./styles.css",import.meta.url),"utf8");
  const html=readFileSync(new URL("./index.html",import.meta.url),"utf8");
  assert.match(app,/recipeIngredientChoices\(recipes\)/);
  assert.match(app,/recipeCatalogItems\(recipes, selectedIngredient\)/);
  assert.match(app,/data-recipe-ingredient-select/);
  assert.match(app,/panel\.dataset\.recipeIngredient =/);
  assert.match(app,/escapeHtml\(ingredient\.label\)/);
  assert.match(css,/\.recipes-filter-controls/);
  assert.match(html,/app\.js\?v=0\.44\.37/);
});
