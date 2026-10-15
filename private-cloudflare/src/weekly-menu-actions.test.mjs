import test from "node:test";
import assert from "node:assert/strict";
import { planMenuSheetEdits, recipeAlternatives, previewMenuRecipe, editWeeklyMenu, MenuEditError } from "./weekly-menu-actions.js";

const header = ["semana_inicio","fecha","momento","recipe_id","food_id","nombre","cantidad","unidad","estado","kcal","proteinas_g","carbohidratos_g","grasas_g","sesion_gym","nota","updated_at","tipo_item","tipo_acompanante"];
const original = ["2026-10-12","2026-10-15","Comida","r-a","","Receta A",1,"ración","planificado",430,38,31,17,"","","2026-10-14T08:00:00Z","receta",""];
const payload={action:"consume",sourceRow:2,date:"2026-10-15",moment:"Comida",recipeId:"r-a",name:"Receta A",updatedAt:"2026-10-14T08:00:00Z"};
const recipes=recipeAlternatives([{data:{recipe_id:"r-b",nombre:"Receta B",raciones:2,kcal_racion:510,proteinas_racion_g:42,carbohidratos_racion_g:52,grasas_racion_g:12,precision:"estimada"}}]);

test("consume updates exactly status and timestamp of canonical row, without append or macros mutation",()=>{
  const plan=planMenuSheetEdits([header,original],payload,[], "2026-10-15T08:00:00Z");
  assert.deepEqual(plan.updates.map(x=>[x.range,x.values[0][0]]),[
    ["MenuSemanal!I2","consumido"],["MenuSemanal!P2","2026-10-15T08:00:00Z"]]);
});

test("replace previews all four macros for the same existing ración and updates only canonical fields",()=>{
  const macros=previewMenuRecipe({cantidad:1,unidad:"ración"},recipes[0]);
  assert.deepEqual(macros,{supported:true,kcal:510,protein:42,carbs:52,fat:12});
  const plan=planMenuSheetEdits([header,original],{...payload,action:"replace",newRecipeId:"r-b"},recipes,"2026-10-15T08:00:00Z");
  assert.deepEqual(plan.updates.map(x=>[x.range,x.values[0][0]]),[
    ["MenuSemanal!D2","r-b"],["MenuSemanal!F2","Receta B"],
    ["MenuSemanal!J2",510],["MenuSemanal!K2",42],["MenuSemanal!L2",52],
    ["MenuSemanal!M2",12],["MenuSemanal!P2","2026-10-15T08:00:00Z"]]);
});

test("superseded copies of previous recipe are retired, without disturbing other companions",()=>{
  const older=[...original];older[15]="2026-10-13T08:00:00Z";
  const latest=[...original];latest[15]="2026-10-14T08:00:00Z";
  const companion=[...original];companion[3]="";companion[4]="food1";companion[5]="Yogur";companion[16]="acompanante";
  const plan=planMenuSheetEdits([header,older,latest,companion],{...payload,sourceRow:3,action:"replace",newRecipeId:"r-b"},recipes);
  assert.ok(plan.updates.some(x=>x.range==="MenuSemanal!I2" && x.values[0][0]==="retirado"));
  assert.ok(plan.updates.some(x=>x.range==="MenuSemanal!D3" && x.values[0][0]==="r-b"));
  assert.ok(!plan.updates.some(x=>/4$/.test(x.range)));
});

test("stale identity, stale timestamp, consumed rows and unsupported portions reject safely",()=>{
  assert.throws(()=>planMenuSheetEdits([header,original],{...payload,updatedAt:"stale"},[]),e=>e.code==="MENU_EDIT_CONFLICT");
  assert.throws(()=>planMenuSheetEdits([header,original],{...payload,sourceRow:23},[]),e=>e.code==="MENU_EDIT_CONFLICT");
  const consumed=[...original];consumed[8]="consumido";
  assert.throws(()=>planMenuSheetEdits([header,consumed],payload,[]),e=>e.code==="MENU_EDIT_NOT_PLANNED");
  const noPortion=[...original];noPortion[7]="plato";
  assert.throws(()=>planMenuSheetEdits([header,noPortion],{...payload,action:"replace",newRecipeId:"r-b"},recipes),e=>e.code==="RECIPE_MACROS_OR_PORTION_PENDING");
  const badRecipe=[{...recipes[0],id:"r-b",proteinPerServing:null}];
  assert.equal(previewMenuRecipe({unidad:"ración",cantidad:1},badRecipe[0]).supported,false);
  assert.throws(()=>planMenuSheetEdits([header,original],{...payload,action:"replace",newRecipeId:"r-b"},badRecipe),e=>e.code==="RECIPE_MACROS_OR_PORTION_PENDING");
});

test("mutation performs one authenticated, read-checked Sheets batchUpdate (no record duplication)",async()=>{
  const requests=[];
  const fetcher=async(url,opts={})=>{
    requests.push({url:String(url),method:opts.method||"GET",headers:opts.headers,body:opts.body?JSON.parse(opts.body):null});
    if(url.includes("values:batchGet"))return {ok:true,json:async()=>({valueRanges:[{values:[header,original]}]})};
    if(url.includes("values:batchUpdate"))return {ok:true,json:async()=>({})};
    throw new Error("UNEXPECTED_REQUEST");
  };
  const result=await editWeeklyMenu({json:async()=>payload},{HEALTH_SHEET_ID:"TEST_PRIVATE_ONLY"},async()=> "SYNTHETIC_TOKEN",fetcher);
  assert.deepEqual(result,{ok:true,action:"consume"});
  assert.equal(requests.length,2);
  assert.equal(requests[1].method,"POST");
  assert.equal(requests[1].body.data.length,2);
  assert.equal(requests[0].headers.Authorization,"Bearer SYNTHETIC_TOKEN");
  assert.ok(!requests.some(x=>x.url.includes("Registro")));
});
