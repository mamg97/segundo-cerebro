import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {planRecipeMutation, isRecipeArchived, RecipeEditError} from "./recipe-editor.js";

const recipeHeader=["recipe_id","nombre","raciones","kcal_total","kcal_racion","proteinas_racion_g",
 "carbohidratos_racion_g","grasas_racion_g","precision","fuente","nota","updated_at",
 "foto_drive_file_id","foto_mime_type","foto_updated_at"];
const original=["recipe-a","Receta anterior",2,600,300,20,30,10,"estimada","usuario",
 "Confirmada en comidas históricas","2026-10-14T08:00:00Z","foto-privada","image/jpeg","2026-10-14T08:00:00Z"];
const ingredientHeader=["recipe_id","ingrediente","cantidad","unidad","gramos_estimados","kcal_estimadas",
 "fuente","precision","nota","updated_at","proteinas_estimadas_g","producto_id"];
const stepHeader=["recipe_id","orden","instruccion","tiempo_min","temperatura","utensilio","fuente","precision","nota","updated_at"];
const sources={recipes:[recipeHeader,original],ingredients:[ingredientHeader,
 ["recipe-a","Lentejas",200,"g",200,250,"usuario","estimada","","2026-10-14T08:00:00Z",13,"merc-lentejas"]],
 steps:[stepHeader,["recipe-a",1,"Cocer lentejas",25,"","olla","usuario","estimada","","2026-10-14T08:00:00Z"]]};
const payload={action:"edit",recipeId:"recipe-a",updatedAt:original[11],name:"Receta revisada",
 category:"comida_cena",servings:2,kcalPerServing:350,proteinPerServing:25,
 carbsPerServing:35,fatPerServing:11,precision:"estimada",note:"Nueva preparación",
 ingredients:[{name:"Lentejas",quantity:220,unit:"g",grams:220,kcal:280,protein:15,productId:"merc-lentejas"}],
 steps:[{instruction:"Cocer 30 minutos",timeMinutes:30,utensil:"olla"}]};

test("edits create new recipe and ingredient/step IDs, without changing historical recipe contents",()=>{
 const plan=planRecipeMutation(sources,payload,{now:"2026-10-19T08:00:00Z",newId:"recipe-a-rev-new"});
 assert.equal(plan.recipeId,"recipe-a-rev-new");
 assert.deepEqual(plan.updates.map(u=>u.range),[
   "Recetas!P1:Q1","Recetas!Q2","Recetas!A3:Q3","IngredientesReceta!A3:L3","PasosReceta!A3:J3"
 ]);
 assert.equal(plan.updates[1].values[0][0],"sustituida");
 assert.deepEqual(plan.updates[2].values[0].slice(0,8),
   ["recipe-a-rev-new","Receta revisada",2,700,350,25,35,11]);
 assert.equal(plan.updates[2].values[0][12],"foto-privada");
 assert.equal(plan.updates[2].values[0][15],"comida_cena");
 assert.equal(plan.updates[2].values[0][16],"activa");
 assert.equal(plan.updates[3].values[0][0],"recipe-a-rev-new");
 assert.equal(plan.updates[4].values[0][0],"recipe-a-rev-new");
 assert.deepEqual(sources.recipes[1],original);
});

test("delete only marks the master recipe as eliminada; never deletes menu history or ingredients",()=>{
 const plan=planRecipeMutation(sources,{action:"delete",recipeId:"recipe-a",updatedAt:original[11]});
 assert.deepEqual(plan.updates.map(u=>u.range),["Recetas!P1:Q1","Recetas!Q2"]);
 assert.equal(plan.updates[1].values[0][0],"eliminada");
 assert.equal(isRecipeArchived({estado_receta:"eliminada"}),true);
 assert.equal(isRecipeArchived({estado_receta:"sustituida"}),true);
 assert.equal(isRecipeArchived({estado_receta:"activa"}),false);
});

test("stale edit, archived row and illegal category fail closed",()=>{
 assert.throws(()=>planRecipeMutation(sources,{...payload,updatedAt:"OLD"},{newId:"b"}),e=>e.code==="RECIPE_EDIT_CONFLICT");
 assert.throws(()=>planRecipeMutation(sources,{...payload,category:"merienda"},{newId:"b"}),e=>e.code==="RECIPE_INVALID_CATEGORY_OR_NAME");
 const archived={...sources,recipes:[recipeHeader.concat(["categoria_receta","estado_receta"]),original.concat(["","eliminada"])]};
 assert.throws(()=>planRecipeMutation(archived,payload,{newId:"b"}),e=>e.code==="RECIPE_ALREADY_ARCHIVED");
});

test("production route and UI do not mutate historical Registro or MenuSemanal",()=>{
 const worker=readFileSync(new URL("./index.js",import.meta.url),"utf8");
 const app=readFileSync(new URL("../../app/app.js",import.meta.url),"utf8");
 const ui=readFileSync(new URL("../../app/recipe-editor-ui.mjs",import.meta.url),"utf8");
 assert.match(worker,/api\/nutrition\/recipes\/edit/);
 assert.match(worker,/Recetas!A1:Q1000/);
 assert.match(app,/data-recipe-meal-select/);
 assert.match(app,/data-recipe-archive-toggle/);
 assert.match(app,/renderRecipeEditor\(panel, recipe/);
 assert.match(ui,/Guardar nueva versión/);
 const editor=readFileSync(new URL("./recipe-editor.js",import.meta.url),"utf8");
 assert.doesNotMatch(editor,/MenuSemanal!|Registro!/);
 assert.match(editor,/Recetas!Q/);
});
