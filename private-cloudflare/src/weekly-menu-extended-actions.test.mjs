import test from "node:test";
import assert from "node:assert/strict";
import {planMenuAddition,planConsumedRegisterCorrection,MenuSlotError} from "./weekly-menu-extended-actions.js";
import {planMenuSheetEdits,recipeAlternatives,editWeeklyMenu} from "./weekly-menu-actions.js";
import {readFileSync} from "node:fs";

const menuHeader=["semana_inicio","fecha","momento","recipe_id","food_id","nombre","cantidad","unidad","estado",
  "kcal","proteinas_g","carbohidratos_g","grasas_g","sesion_gym","nota","updated_at","tipo_item","tipo_acompanante"];
const registroHeader=["fecha","momento","item_id","item_nombre","cantidad","unidad","kcal","proteinas_g",
  "carbohidratos_g","grasas_g","estado","fuente","nota","updated_at"];
const old=["2026-10-12","2026-10-16","Comida","r-a","","Anterior",1,"ración","consumido",
  340,24,35,10,"","Ya consumido","2026-10-16T20:00:00Z","receta",""];
const registro=["2026-10-16","Comida","r-a","Anterior",1,"ración",
  340,24,35,10,"consumido","receta","Nota antigua","2026-10-16T20:00:00Z"];
const recipes=recipeAlternatives([{data:{
  recipe_id:"r-b",nombre:"Nueva receta",raciones:2,
  kcal_racion:450,proteinas_racion_g:45,carbohidratos_racion_g:50,grasas_racion_g:12
}}]);
const replace={action:"replace",sourceRow:2,date:"2026-10-16",moment:"Comida",
  recipeId:"r-a",name:"Anterior",updatedAt:"2026-10-16T20:00:00Z",
  newRecipeId:"r-b",newServings:1.5};
const add={action:"add",date:"2026-10-17",moment:"Cena",newRecipeId:"r-b",newServings:1};

test("confirmed consumption correction updates one old recipe and a matching Registro, keeping status",()=>{
  const plan=planMenuSheetEdits([menuHeader,old],replace,recipes,"2026-10-19T11:00:00Z",[registroHeader,registro]);
  const updates=Object.fromEntries(plan.updates.map(x=>[x.range,x.values[0][0]]));
  assert.equal(updates["MenuSemanal!D2"],"r-b");
  assert.equal(updates["MenuSemanal!G2"],1.5);
  assert.equal(updates["MenuSemanal!J2"],675);
  assert.equal(updates["MenuSemanal!K2"],67.5);
  assert.equal(updates["MenuSemanal!L2"],75);
  assert.equal(updates["MenuSemanal!M2"],18);
  assert.equal(updates["MenuSemanal!I2"],undefined,"confirmed status remains consumed");
  assert.equal(updates["Registro!C2"],"r-b");
  assert.equal(updates["Registro!G2"],675);
  assert.equal(updates["Registro!H2"],67.5);
  assert.match(updates["Registro!M2"],/Nota anterior/);
  assert.ok(!plan.updates.some(x=>/Registro!K2/.test(x.range)),"Registro consumption state remains consumed");
  assert.deepEqual(old[3],"r-a","no sheet is mutated until Sheets accepts the batch");
});

test("consumed MenuSemanal fallback has no Registro double write when old identity absent",()=>{
  const plan=planMenuSheetEdits([menuHeader,old],replace,recipes,"2026-10-19T11:00:00Z",[registroHeader]);
  assert.ok(plan.updates.some(x=>x.range==="MenuSemanal!D2"));
  assert.ok(!plan.updates.some(x=>x.range.startsWith("Registro!")));
});

test("consumption correction rejects ambiguous or conflicting Registro matches",()=>{
  const duplicate=[...registro];duplicate[13]="2026-10-16T21:00:00Z";
  assert.throws(()=>planMenuSheetEdits([menuHeader,old],replace,recipes,"T",[registroHeader,registro,duplicate]),e=>e.code==="AMBIGUOUS_CONSUMED_REGISTRO");
  const other=[...registro];other[2]="r-b";other[3]="Nueva receta";
  assert.throws(()=>planMenuSheetEdits([menuHeader,old],replace,recipes,"T",[registroHeader,registro,other]),e=>e.code==="CONSUMED_RECIPE_ALREADY_IN_REGISTRO");
  assert.throws(()=>planMenuSheetEdits([menuHeader,old],replace,recipes),e=>e.code==="CONSUMED_REGISTER_REQUIRED");
});

test("blank day append uses explicit quantity, macros and planned status, never invents a consumption",()=>{
  const plan=planMenuAddition([menuHeader,old],add,recipes,"2026-10-19T11:00:00Z");
  assert.equal(plan.action,"add");
  assert.equal(plan.sourceRow,3);
  const updates=Object.fromEntries(plan.updates.map(x=>[x.range,x.values[0][0]]));
  assert.deepEqual([updates["MenuSemanal!A3"],updates["MenuSemanal!B3"],updates["MenuSemanal!C3"]],
    ["2026-10-12","2026-10-17","Cena"]);
  assert.equal(updates["MenuSemanal!D3"],"r-b");
  assert.equal(updates["MenuSemanal!I3"],"planificado");
  assert.equal(updates["MenuSemanal!J3"],450);
  assert.equal(updates["MenuSemanal!K3"],45);
  assert.equal(updates["MenuSemanal!Q3"],"receta");
  const consumed=planMenuAddition([menuHeader],{...add,confirmConsumed:true},recipes,"T");
  assert.equal(Object.fromEntries(consumed.updates.map(x=>[x.range,x.values[0][0]]))["MenuSemanal!I2"],"consumido");
});

test("unassigned textual placeholder is replaced without adding a duplicate row",()=>{
  const placeholder=[...old];placeholder[1]="2026-10-17";placeholder[2]="Cena";placeholder[3]="";placeholder[5]="Cena por decidir";placeholder[8]="planificado";
  const plan=planMenuAddition([menuHeader,old,placeholder],add,recipes,"T");
  assert.equal(plan.sourceRow,3);
  assert.ok(plan.updates.every(x=>x.range.endsWith("3")||x.range.includes("!")));
  assert.equal(plan.updates.filter(x=>x.range==="MenuSemanal!D3").length,1);
});

test("add rejects duplicate primary, missing nutrition, bad dates and ambiguous placeholders",()=>{
  const competing=[...old];competing[1]="2026-10-17";competing[2]="Cena";
  assert.throws(()=>planMenuAddition([menuHeader,competing],add,recipes,"T"),e=>e.code==="PRIMARY_RECIPE_ALREADY_IN_MEAL");
  assert.throws(()=>planMenuAddition([menuHeader],{...add,date:"2026-02-29"},recipes,"T"),e=>e.code==="INVALID_MENU_DATE");
  assert.throws(()=>planMenuAddition([menuHeader],{...add,newServings:null},recipes,"T"),e=>e.code==="RECIPE_SERVINGS_REQUIRED");
  assert.throws(()=>planMenuAddition([menuHeader],{...add,newRecipeId:"unknown"},recipes,"T"),e=>e.code==="RECIPE_NOT_FOUND");
  const incomplete=[{...recipes[0],proteinPerServing:null}];
  assert.throws(()=>planMenuAddition([menuHeader],add,incomplete,"T"),e=>e.code==="RECIPE_MACROS_OR_PORTION_PENDING");
});

test("authenticated append sends one checked batchUpdate and no changes to Registro",async()=>{
  const requests=[];
  const fetcher=async(url,opts={})=>{
    requests.push({url:String(url),body:opts.body?JSON.parse(opts.body):null});
    if(String(url).includes("values:batchGet"))return {ok:true,json:async()=>({valueRanges:[
      {values:[menuHeader,old]},{values:[["recipe_id","nombre","raciones","kcal_racion","proteinas_racion_g","carbohidratos_racion_g","grasas_racion_g"],["r-b","Nueva receta",2,450,45,50,12]]}
    ]})};
    if(String(url).includes("values:batchUpdate"))return {ok:true,json:async()=>({})};
    throw Error("UNEXPECTED_REQUEST");
  };
  const result=await editWeeklyMenu({json:async()=>add},{HEALTH_SHEET_ID:"SANDBOX_ONLY"},async()=>"TOKEN",fetcher);
  assert.deepEqual(result,{ok:true,action:"add"});
  assert.equal(requests.length,2);
  assert.match(requests[0].url,/Recetas%21A1%3AQ1000/);
  assert.doesNotMatch(requests[1].url,/Registro/);
  assert.ok(requests[1].body.data.length>=15);
  assert.ok(requests[1].body.data.every(x=>x.range.startsWith("MenuSemanal!")));
});

test("the browser wires the weekly matrix, canonical Add and consumed corrections",()=>{
  const app=readFileSync(new URL("../../app/app.js",import.meta.url),"utf8");
  const worker=readFileSync(new URL("./weekly-menu-actions.js",import.meta.url),"utf8");
  assert.match(app,/data-home-menu-add-date/);
  assert.match(app,/data-home-menu-change/);
  assert.match(app,/isCorrection = !isAdd && weeklyMenuItemIsConsumed/);
  assert.match(app,/confirmConsumed/);
  assert.match(worker,/Registro!A1:N6000/);
  assert.match(worker,/planConsumedRegisterCorrection/);
  assert.match(worker,/planMenuAddition/);
});
