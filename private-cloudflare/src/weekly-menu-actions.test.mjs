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
  assert.throws(()=>planMenuSheetEdits([header,consumed],{...payload,action:"replace",newRecipeId:"r-b"},recipes),e=>e.code==="CONSUMED_REGISTER_REQUIRED");
  const noPortion=[...original];noPortion[7]="plato";
  assert.throws(()=>planMenuSheetEdits([header,noPortion],{...payload,action:"replace",newRecipeId:"r-b"},recipes),e=>e.code==="RECIPE_MACROS_OR_PORTION_PENDING");
  const badRecipe=[{...recipes[0],id:"r-b",proteinPerServing:null}];
  assert.equal(previewMenuRecipe({unidad:"ración",cantidad:1},badRecipe[0]).supported,false);
  assert.throws(()=>planMenuSheetEdits([header,original],{...payload,action:"replace",newRecipeId:"r-b"},badRecipe),e=>e.code==="RECIPE_MACROS_OR_PORTION_PENDING");
});

test("unknown portions never become one serving or pass recipe replacement",()=>{
  assert.equal(previewMenuRecipe({unidad:"ración"},recipes[0]).supported,false);
  assert.equal(previewMenuRecipe({cantidad:"",unidad:"ración"},recipes[0]).supported,false);
  assert.equal(previewMenuRecipe({cantidad:0,unidad:"ración"},recipes[0]).supported,false);
  const missing=[...original]; missing[6]="";
  assert.throws(()=>planMenuSheetEdits([header,missing],{...payload,action:"replace",newRecipeId:"r-b"},recipes),
    e=>e.code==="RECIPE_MACROS_OR_PORTION_PENDING");
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


test("planned Pantry companions can be replaced with recipe only after explicit serving selection",()=>{
  const fruit=[...original];fruit[3]="";fruit[4]="food-b";fruit[5]="Fruit";fruit[6]=100;fruit[7]="g";fruit[16]="acompanante";
  const foodPayload={...payload,recipeId:undefined,foodId:"food-b",name:"Fruit",action:"replace",newRecipeId:"r-b",newServings:1.25};
  const plan=planMenuSheetEdits([header,fruit],foodPayload,recipes,"2026-10-15T10:00:00Z");
  assert.deepEqual(plan.updates.map(x=>[x.range,x.values[0][0]]),[
    ["MenuSemanal!D2","r-b"],["MenuSemanal!E2",""],
    ["MenuSemanal!G2",1.25],["MenuSemanal!H2","ración"],
    ["MenuSemanal!Q2","receta"],["MenuSemanal!R2",""],
    ["MenuSemanal!F2","Receta B"],
    ["MenuSemanal!J2",637.5],["MenuSemanal!K2",52.5],["MenuSemanal!L2",65],
    ["MenuSemanal!M2",15],["MenuSemanal!P2","2026-10-15T10:00:00Z"]
  ]);
  const companionStatus=[...fruit];companionStatus[8]="consumido";
  assert.throws(()=>planMenuSheetEdits([header,companionStatus],foodPayload,recipes),e=>e.code==="CONSUMED_REGISTER_REQUIRED");
  for(const val of [undefined,null,"",0,-1,21]) {
    assert.throws(()=>planMenuSheetEdits([header,fruit],{...foodPayload,newServings:val},recipes),
      e=>e.code==="RECIPE_SERVINGS_REQUIRED");
  }
  assert.throws(()=>planMenuSheetEdits([header,fruit],{...foodPayload,foodId:"food-other"},recipes),
    e=>e.code==="MENU_EDIT_CONFLICT");
});

test("confirming one planned Pantry item updates only its status, not a different food",()=>{
  const food=[...original];food[3]="";food[4]="food-x";food[5]="Food X";food[16]="acompanante";
  const action={...payload,recipeId:undefined,foodId:"food-x",name:"Food X"};
  const unchanged=[...food];unchanged[4]="food-y";unchanged[5]="Other food";
  const plan=planMenuSheetEdits([header,food,unchanged],action,[],"2026-10-15T10:00:00Z");
  assert.deepEqual(plan.updates.map(x=>[x.range,x.values[0][0]]),[
    ["MenuSemanal!I2","consumido"],["MenuSemanal!P2","2026-10-15T10:00:00Z"]
  ]);
});

test("duplicate earlier food versions are retired, and existing recipe elsewhere in meal blocks collision",()=>{
  const food=[...original];food[3]="";food[4]="food-x";food[5]="Food X";food[16]="acompanante";
  const old=[...food];old[15]="2026-10-12T08:00:00Z";
  const recent=[...food];
  const action={...payload,recipeId:undefined,foodId:"food-x",name:"Food X",
    action:"replace",newRecipeId:"r-b",newServings:1,sourceRow:3};
  const plan=planMenuSheetEdits([header,old,recent],action,recipes);
  assert.ok(plan.updates.some(x=>x.range==="MenuSemanal!I2"&&x.values[0][0]==="retirado"));
  const otherRecipe=[...original];otherRecipe[3]="r-b";otherRecipe[5]="Receta B";
  assert.throws(()=>planMenuSheetEdits([header,food,otherRecipe],
    {...action,sourceRow:2},recipes),e=>e.code==="RECIPE_ALREADY_IN_MEAL");
});

test("food replacement cannot create two distinct primary recipes in one moment",()=>{
  const food=[...original];
  food[2]="Merienda";food[3]="";food[4]="food-x";food[5]="Fruit";
  food[6]=100;food[7]="g";food[16]="acompanante";
  const main=[...original];
  main[2]="Merienda";main[3]="r-other";main[5]="Other primary";
  const action={...payload,recipeId:undefined,foodId:"food-x",name:"Fruit",moment:"Merienda",
    action:"replace",newRecipeId:"r-b",newServings:1};
  assert.throws(()=>planMenuSheetEdits([header,food,main],action,recipes),
    e=>e.code==="PRIMARY_RECIPE_ALREADY_IN_MEAL");
  const consumed=[...main]; consumed[8]="consumido";
  assert.throws(()=>planMenuSheetEdits([header,food,consumed],action,recipes),
    e=>e.code==="PRIMARY_RECIPE_ALREADY_IN_MEAL");
  const retired=[...main];retired[8]="retirado";
  assert.ok(planMenuSheetEdits([header,food,retired],action,recipes).updates.length>0);
  const shake=[...main];shake[16]="acompanante";
  assert.ok(planMenuSheetEdits([header,food,shake],action,recipes).updates.length>0);
});


test("planned yogurt can become one explicitly typed shake companion without a second main",()=>{
  const yogurt=[...original];yogurt[3]="";yogurt[4]="food-yog";yogurt[5]="Dessert yogurt";yogurt[6]=250;yogurt[7]="g";yogurt[16]="acompanante";yogurt[17]="yogur";
  const main=[...original];main[3]="r-main";main[5]="Main dish";main[16]="receta";main[17]="";
  const action={...payload,recipeId:undefined,foodId:"food-yog",name:"Dessert yogurt",
    action:"replace",newRecipeId:"r-b",newServings:1,newCompanionType:"batido"};
  const plan=planMenuSheetEdits([header,yogurt,main],action,recipes,"2026-10-15T12:00:00Z");
  const changes=Object.fromEntries(plan.updates.map(x=>[x.range,x.values[0][0]]));
  assert.equal(changes["MenuSemanal!D2"],"r-b");
  assert.equal(changes["MenuSemanal!E2"],"");
  assert.equal(changes["MenuSemanal!G2"],1);
  assert.equal(changes["MenuSemanal!H2"],"ración");
  assert.equal(changes["MenuSemanal!Q2"],"acompanante");
  assert.equal(changes["MenuSemanal!R2"],"batido");
  assert.equal(changes["MenuSemanal!J2"],510);
  assert.equal(changes["MenuSemanal!K2"],42);
  assert.equal(changes["MenuSemanal!L2"],52);
  assert.equal(changes["MenuSemanal!M2"],12);
  assert.match(changes["MenuSemanal!O2"],/Consumo no confirmado/);
  assert.equal(changes["MenuSemanal!I2"],undefined, "status remains planned");
  assert.ok(plan.updates.every(x=>!x.range.endsWith("3")), "existing main is untouched");
});

test("shake classification must be explicit and authorized only for a planned companion food",()=>{
  const yogurt=[...original];yogurt[3]="";yogurt[4]="food-yog";yogurt[5]="Dessert yogurt";yogurt[16]="acompanante";yogurt[17]="yogur";
  const base={...payload,recipeId:undefined,foodId:"food-yog",name:"Dessert yogurt",
    action:"replace",newRecipeId:"r-b",newServings:1};
  assert.throws(()=>planMenuSheetEdits([header,yogurt],{...base,newCompanionType:"fruta"},recipes),
    e=>e.code==="INVALID_COMPANION_REPLACEMENT");
  const nonCompanion=[...yogurt];nonCompanion[16]="receta";
  assert.throws(()=>planMenuSheetEdits([header,nonCompanion],{...base,newCompanionType:"batido"},recipes),
    e=>e.code==="INVALID_COMPANION_REPLACEMENT");
  assert.throws(()=>planMenuSheetEdits([header,original],{...payload,action:"replace",newRecipeId:"r-b",newCompanionType:"batido"},recipes),
    e=>e.code==="INVALID_COMPANION_REPLACEMENT");
  const consumed=[...yogurt];consumed[8]="consumido";
  assert.throws(()=>planMenuSheetEdits([header,consumed],{...base,newCompanionType:"batido"},recipes),
    e=>e.code==="CONSUMED_REGISTER_REQUIRED");
});

test("historical one-time recipe portions are never silently reused in a new plan",()=>{
  const historic={...recipes[0],precision:"histórico; porción medida en otra fecha, no usar para nuevas tomas"};
  assert.equal(previewMenuRecipe({cantidad:1,unidad:"ración"},historic).supported,false);
});
