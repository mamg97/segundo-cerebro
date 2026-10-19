import test from "node:test";
import assert from "node:assert/strict";
import { manualCompanionOptions, planMenuFoodAddition } from "./weekly-menu-extended-actions.js";
import { editWeeklyMenu } from "./weekly-menu-actions.js";
import { readFileSync } from "node:fs";

const head=["semana_inicio","fecha","momento","recipe_id","food_id","nombre","cantidad","unidad","estado",
  "kcal","proteinas_g","carbohidratos_g","grasas_g","sesion_gym","nota","updated_at","tipo_item","tipo_acompanante"];
const main=["2026-10-19","2026-10-21","Comida","rec-main","","Lomo con boniato",1,"ración","planificado",
  560,40,36,24,"","","2026-10-19T10:00:00Z","receta",""];
const foodHead=["id","nombre","racion","unidad","kcal_racion","proteinas_g","carbohidratos_g",
  "grasas_g","fuente","nota","updated_at"];
const picos=["merc-picos-100-integral","10 picos integrales Hacendado",10,"picos",
  75.8,2.8,12.18,1.28,"Hacendado","MANUAL_COMPANION_PRESET | 2 g/pico estimado","2026-10-19"];
const historical=["picos-hacendado-8480000862150","Picos por 100g",100,"g",
  379,14,60.9,6.4,"Hacendado","Histórico","2026-09-23"];
const foods=manualCompanionOptions([foodHead,historical,picos]);
const payload={action:"add-food",date:"2026-10-21",moment:"Comida",
  newFoodId:"merc-picos-100-integral",newServings:1,newCompanionType:"guarnicion"};
const values=plan=>Object.fromEntries(plan.updates.map(x=>[x.range,x.values[0][0]]));

test("only explicitly enabled food companions are available; historic per-100g food excluded",()=>{
  assert.equal(foods.length,1);
  assert.equal(foods[0].id,"merc-picos-100-integral");
  assert.equal(foods[0].serving,10);
  assert.equal(foods[0].kcalPerServing,75.8);
});

test("adding 10 picos keeps primary, catalog link, and no automatic consumption",()=>{
  const plan=planMenuFoodAddition([head,main],payload,foods,"2026-10-19T15:00:00Z");
  const map=values(plan);
  assert.equal(plan.sourceRow,3);
  assert.equal(map["MenuSemanal!D3"],"");
  assert.equal(map["MenuSemanal!E3"],"merc-picos-100-integral");
  assert.equal(map["MenuSemanal!G3"],10);
  assert.equal(map["MenuSemanal!H3"],"picos");
  assert.equal(map["MenuSemanal!I3"],"planificado");
  assert.equal(map["MenuSemanal!J3"],75.8);
  assert.equal(map["MenuSemanal!K3"],2.8);
  assert.equal(map["MenuSemanal!L3"],12.18);
  assert.equal(map["MenuSemanal!M3"],1.28);
  assert.equal(map["MenuSemanal!Q3"],"acompanante");
  assert.equal(map["MenuSemanal!R3"],"guarnicion");
  assert.match(map["MenuSemanal!O3"],/Consumo no confirmado/);
  assert.ok(plan.updates.every(x=>x.range.endsWith("3")),"original lunch remains untouched");
});

test("two explicit servings are 20 picos, not 2 grams or 20 portions",()=>{
  const map=values(planMenuFoodAddition([head,main],{...payload,newServings:2},foods,"T"));
  assert.equal(map["MenuSemanal!G3"],20);
  assert.equal(map["MenuSemanal!J3"],151.6);
  assert.equal(map["MenuSemanal!K3"],5.6);
});

test("food insertion rejects duplicate, fake product, automatic consumption, bad date and malformed portions",()=>{
  const first=values(planMenuFoodAddition([head,main],payload,foods,"T"));
  const secondRow=head.map((key,i)=>first["MenuSemanal!"+String.fromCharCode(65+i)+"3"]??"");
  assert.throws(()=>planMenuFoodAddition([head,main,secondRow],payload,foods,"T"), e=>e.code==="FOOD_ALREADY_IN_MEAL");
  assert.throws(()=>planMenuFoodAddition([head,main],{...payload,newFoodId:"unknown"},foods,"T"), e=>e.code==="FOOD_NOT_FOUND");
  assert.throws(()=>planMenuFoodAddition([head,main],{...payload,newCompanionType:""},foods,"T"), e=>e.code==="INVALID_COMPANION_TYPE");
  assert.throws(()=>planMenuFoodAddition([head,main],{...payload,confirmConsumed:true},foods,"T"), e=>e.code==="CONFIRM_CONSUMPTION_SEPARATELY");
  assert.throws(()=>planMenuFoodAddition([head,main],{...payload,newServings:1.5},foods,"T"), e=>e.code==="INVALID_FOOD_MULTIPLIER");
  assert.throws(()=>planMenuFoodAddition([head,main],{...payload,date:"2026-02-30"},foods,"T"), e=>e.code==="INVALID_MENU_DATE");
});

test("authenticated menu add-food reads Comidas and edits only MenuSemanal in checked write",async()=>{
  const requests=[];
  const fetchImpl=async(url,opts={})=>{
    requests.push({url:String(url),body:opts.body?JSON.parse(opts.body):null});
    if(String(url).includes("values:batchGet"))return {ok:true,json:async()=>({valueRanges:[
      {values:[head,main]},{values:[foodHead,historical,picos]}
    ]})};
    if(String(url).includes("values:batchUpdate"))return {ok:true,json:async()=>({})};
    throw Error("unexpected request");
  };
  const r=await editWeeklyMenu({json:async()=>payload},
    {HEALTH_SHEET_ID:"SYNTHETIC"},async()=>"FAKE",fetchImpl);
  assert.deepEqual(r,{ok:true,action:"add-food"});
  assert.equal(requests.length,2);
  assert.match(requests[0].url,/Comidas%21A1%3AK2000/);
  assert.ok(requests[1].body.data.every(d=>d.range.startsWith("MenuSemanal!")));
});

test("manual menu selector binds typed food ID, not fake recipe ID",()=>{
  const app=readFileSync(new URL("../../app/app.js",import.meta.url),"utf8");
  assert.match(app,/\/api\/nutrition\/menu\/foods/);
  assert.match(app,/selectedRecipe\.kind==="food" \? "add-food"/);
  assert.match(app,/selectedRecipe\.kind==="food" \? "guarnicion"/);
  assert.match(app,/CONFIRM_CONSUMPTION_SEPARATELY|consumedCheckbox\.disabled = true/);
});
