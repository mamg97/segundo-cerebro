import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {manualCompanionOptions,planMenuFoodReplacement,planMenuFoodAddition,companionServingTitle} from "./weekly-menu-extended-actions.js";
import {editWeeklyMenu} from "./weekly-menu-actions.js";

const headers=["semana_inicio","fecha","momento","recipe_id","food_id","nombre","cantidad","unidad","estado",
  "kcal","proteinas_g","carbohidratos_g","grasas_g","sesion_gym","nota","updated_at","tipo_item","tipo_acompanante"];
const meta=["id","nombre","racion","unidad","kcal_racion","proteinas_g","carbohidratos_g","grasas_g","fuente","nota","updated_at"];
const flag="MANUAL_COMPANION_PRESET | FOOD_COMPANION_TYPE:yogur";
const foodRows=[
 ["merc-proteinas-coco","Yogur proteico de coco · 1 vasito (120 g)",1,"vasito de 120 g",73.2,9.96,6.84,0.6,"Despensa",flag,"today"],
 ["merc-proteinas-fresa","Yogur proteico de fresa · 1 vasito (120 g)",1,"vasito de 120 g",63.6,9.96,6,0.6,"Despensa",flag,"today"],
 ["merc-proteinas-natural-4x120g","Yogur proteico natural · 1 vasito (120 g)",1,"vasito de 120 g",62,12,3.7,0.48,"Despensa",flag,"today"],
 ["merc-proteinas-natural","Yogur proteico natural · 250 g (½ tarro grande)",250,"g",130,25,7.75,1.25,"Despensa",flag,"today"],
 ["merc-picos-100-integral","10 picos integrales Hacendado",10,"picos",75.8,2.8,12.18,1.28,"Despensa","MANUAL_COMPANION_PRESET","today"]
];
const foods=manualCompanionOptions([meta,...foodRows]);
const main=["2026-10-19","2026-10-19","Comida","rec-pechugas","","Pechugas rellenas",1,"ración","consumido",
  532,66,7.5,27,"","","2026-10-19T12:00:00Z","receta",""];
const old=["2026-10-19","2026-10-19","Comida","","merc-proteinas-natural",
  "Postre: Yogur proteico natural · 250 g (½ tarro)",250,"g","planificado",
  130,25,7.75,1.25,"","postre después de comer","2026-10-13T20:59:07.815Z","acompanante","yogur"];
const payload={action:"replace-food",date:"2026-10-19",moment:"Comida",sourceRow:3,
  foodId:old[4],name:old[5],updatedAt:old[15],
  newFoodId:"merc-proteinas-coco",newServings:1,newCompanionType:"yogur"};
const kv=plan=>Object.fromEntries(plan.updates.map(u=>[u.range,u.values[0][0]]));

test("four yogurt variants show as separate canonical foods; small natural never becomes big jar",()=>{
  assert.equal(foods.length,5);
  const types=foods.filter(f=>f.companionType==="yogur");
  assert.equal(types.length,4);
  assert.equal(types.find(f=>f.id==="merc-proteinas-coco").serving,1);
  assert.equal(types.find(f=>f.id==="merc-proteinas-natural").serving,250);
  assert.equal(types.find(f=>f.id==="merc-proteinas-natural-4x120g").serving,1);
  assert.equal(foods.find(f=>f.id==="merc-picos-100-integral").companionType,"guarnicion");
});

test("natural tarro 250g -> coco 120g replaces one planned companion, keeps the main and the day",()=>{
  const result=planMenuFoodReplacement([headers,main,old],payload,foods,"2026-10-19T14:00:00Z");
  const map=kv(result);
  assert.equal(result.action,"replace-food");
  assert.equal(result.sourceRow,3);
  assert.ok(result.updates.every(u=>u.range.startsWith("MenuSemanal!")&&u.range.endsWith("3")));
  assert.equal(map["MenuSemanal!E3"],"merc-proteinas-coco");
  assert.match(map["MenuSemanal!F3"],/^Postre: Yogur proteico de coco/);
  assert.equal(map["MenuSemanal!D3"],"");
  assert.equal(map["MenuSemanal!G3"],1);
  assert.equal(map["MenuSemanal!H3"],"vasito de 120 g");
  assert.equal(map["MenuSemanal!J3"],73.2);
  assert.equal(map["MenuSemanal!K3"],9.96);
  assert.equal(map["MenuSemanal!L3"],6.84);
  assert.equal(map["MenuSemanal!M3"],0.6);
  assert.equal(map["MenuSemanal!Q3"],"acompanante");
  assert.equal(map["MenuSemanal!R3"],"yogur");
  assert.ok(!("MenuSemanal!I3" in map),"original planned status is unchanged");
});

test("correct variant of small natural is one 120g cup, not 250g",()=>{
  const map=kv(planMenuFoodReplacement([headers,main,old],
    {...payload,newFoodId:"merc-proteinas-natural-4x120g"},foods,"T"));
  assert.equal(map["MenuSemanal!E3"],"merc-proteinas-natural-4x120g");
  assert.equal(map["MenuSemanal!G3"],1);
  assert.equal(map["MenuSemanal!J3"],62);
  assert.equal(map["MenuSemanal!K3"],12);
});

test("two coconut cups are one postre item with accurate 240g, calories and protein",()=>{
  const r=planMenuFoodReplacement([headers,main,old],
    {...payload,newServings:2},foods,"T");
  const map=kv(r);
  assert.equal(map["MenuSemanal!F3"],"Postre: Yogur proteico de coco · 2 vasitos (240 g)");
  assert.equal(map["MenuSemanal!G3"],2);
  assert.equal(map["MenuSemanal!H3"],"vasito de 120 g");
  assert.equal(map["MenuSemanal!J3"],146.4);
  assert.equal(map["MenuSemanal!K3"],19.92);
  assert.equal(map["MenuSemanal!L3"],13.68);
  assert.equal(map["MenuSemanal!M3"],1.2);
  assert.equal(map["MenuSemanal!R3"],"yogur");
  assert.ok(!("MenuSemanal!I3" in map),"planned remains planned");
  assert.ok(r.updates.every(x=>x.range.endsWith("3")));
});

test("changing 1 coconut cup to 2 in the same planned menu row is allowed",()=>{
  const oldCoco=old.slice();
  oldCoco[4]="merc-proteinas-coco";
  oldCoco[5]="Postre: Yogur proteico de coco · 1 vasito (120 g)";
  oldCoco[6]=1;
  oldCoco[7]="vasito de 120 g";
  oldCoco[9]=73.2;
  oldCoco[10]=9.96;
  const replacement=planMenuFoodReplacement([headers,main,oldCoco],
    {...payload,foodId:oldCoco[4],name:oldCoco[5],newFoodId:oldCoco[4],newServings:2},foods,"T");
  const m=kv(replacement);
  assert.equal(m["MenuSemanal!F3"],"Postre: Yogur proteico de coco · 2 vasitos (240 g)");
  assert.equal(m["MenuSemanal!J3"],146.4);
  assert.equal(m["MenuSemanal!K3"],19.92);
  assert.equal(m["MenuSemanal!G3"],2);
  assert.ok(!("MenuSemanal!I3" in m));
});

test("two-cup postre addition is allowed but a second dessert entry is still blocked",()=>{
  const request={action:"add-food",date:"2026-10-19",moment:"Comida",
    newFoodId:"merc-proteinas-coco",newCompanionType:"yogur",newServings:2};
  const r=planMenuFoodAddition([headers,main],request,foods,"T");
  const m=kv(r);
  assert.equal(m["MenuSemanal!F3"],"Postre: Yogur proteico de coco · 2 vasitos (240 g)");
  assert.equal(m["MenuSemanal!G3"],2);
  assert.equal(m["MenuSemanal!J3"],146.4);
  assert.equal(m["MenuSemanal!K3"],19.92);
  assert.equal(m["MenuSemanal!I3"],"planificado");
  assert.throws(()=>planMenuFoodAddition([headers,main,old],request,foods,"T"),
    error=>error.code==="DESSERT_ALREADY_IN_MEAL");
});

test("other yogurt presentations scale without falsely retaining 1 vasito on 2 units",()=>{
  assert.equal(companionServingTitle(foods.find(x=>x.id==="merc-proteinas-fresa"),2,true),
    "Postre: Yogur proteico de fresa · 2 vasitos (240 g)");
  assert.equal(companionServingTitle(foods.find(x=>x.id==="merc-proteinas-natural-4x120g"),2,false),
    "Yogur proteico natural · 2 vasitos (240 g)");
  assert.equal(companionServingTitle(foods.find(x=>x.id==="merc-proteinas-natural"),2,true),
    "Postre: Yogur proteico natural · 500 g (1 tarro grande)");
});

test("food replacement refuses consumed, stale, fake, cross-type, or duplicate dessert rows",()=>{
  const take=(q,rows=[headers,main,old])=>planMenuFoodReplacement(rows,q,foods,"T");
  assert.throws(()=>take({...payload,updatedAt:"STALE"}),e=>e.code==="MENU_EDIT_CONFLICT");
  assert.throws(()=>take({...payload,newFoodId:"not-listed"}),e=>e.code==="FOOD_NOT_FOUND");
  assert.throws(()=>take({...payload,newFoodId:"merc-picos-100-integral"}),e=>e.code==="FOOD_COMPANION_TYPE_MISMATCH");
  const consumed=old.slice();consumed[8]="consumido";
  assert.throws(()=>take(payload,[headers,main,consumed]),e=>e.code==="MENU_EDIT_NOT_PLANNED");
  const other=old.slice();other[4]="merc-proteinas-fresa";other[5]="Postre: Yogur fresa";other[15]="new";
  assert.throws(()=>take(payload,[headers,main,old,other]),e=>e.code==="DESSERT_ALREADY_IN_MEAL");
});

test("can add coconut to a snack but never duplicate dessert at lunch",()=>{
  const addition={action:"add-food",date:"2026-10-19",moment:"Merienda",newFoodId:"merc-proteinas-coco",
    newCompanionType:"yogur",newServings:1};
  const map=kv(planMenuFoodAddition([headers,main],addition,foods,"T"));
  assert.equal(map["MenuSemanal!E3"],"merc-proteinas-coco");
  assert.equal(map["MenuSemanal!I3"],"planificado");
  assert.equal(map["MenuSemanal!R3"],"yogur");
  assert.ok(!String(map["MenuSemanal!F3"]).startsWith("Postre"));
  assert.throws(()=>planMenuFoodAddition([headers,main,old],
    {...addition,moment:"Comida"},foods,"T"),e=>e.code==="DESSERT_ALREADY_IN_MEAL");
});

test("authenticated replace-food reads Comidas and writes only MenuSemanal (no Registro, no consumption)",async()=>{
  const calls=[];
  const fetchImpl=async(url,opts={})=>{
    calls.push({url:String(url),payload:opts.body?JSON.parse(opts.body):null});
    if(String(url).includes("values:batchGet"))
      return{ok:true,json:async()=>({valueRanges:[{values:[headers,main,old]},{values:[meta,...foodRows]}]})};
    if(String(url).includes("values:batchUpdate"))
      return{ok:true,json:async()=>({})};
    throw Error("unexpected network");
  };
  const r=await editWeeklyMenu({json:async()=>payload},{HEALTH_SHEET_ID:"SHEET"},async()=>"SECRET",fetchImpl);
  assert.deepEqual(r,{ok:true,action:"replace-food"});
  assert.match(calls[0].url,/Comidas%21A1%3AK2000/);
  assert.doesNotMatch(calls[0].url,/Registro/);
  assert.ok(calls[1].payload.data.every(x=>x.range.startsWith("MenuSemanal!")));
});

test("UI offers typed yogurt swaps and shows a useful yogurt portion label",()=>{
  const app=readFileSync(new URL("../../app/app.js",import.meta.url),"utf8");
  assert.match(app,/selectedRecipe\.kind === "food"/);
  assert.match(app,/foodCompanion && !isCorrection/);
  assert.match(app,/Number of cups|Número de vasitos/);
  assert.match(app,/replace-food/);
  assert.match(app,/foodNoChange/);
  assert.match(app,/homeMenuFoodPortionName\(selectedRecipe,requestedServings\)/);
  assert.doesNotMatch(app,/isOnlyOneDessert && Number\(requestedServings\)!==1/);
});
