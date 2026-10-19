import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {derivePendingMenuNeeds,planAutoShoppingChanges} from "./shopping-menu-needs.js";
import {planAppleActionsForRow} from "./shopping-sync.js";

const menuHead=["semana_inicio","fecha","momento","recipe_id","food_id","nombre","cantidad","unidad","estado",
  "kcal","proteinas_g","carbohidratos_g","grasas_g","sesion_gym","nota","updated_at","tipo_item","tipo_acompanante"];
const recipesHead=["recipe_id","nombre","raciones"];
const ingredientHead=["recipe_id","ingrediente","cantidad","unidad","gramos_estimados","kcal_estimadas",
  "fuente","precision","nota","updated_at","proteinas_estimadas_g","producto_id"];
const baseMenu=["2026-10-19","2026-10-20","Comida","rec-1","","Pasta",1,"ración","planificado",
  500,50,35,14,"","","2026-10-19T11:00:00Z","receta",""];
const source=(menuRows=[baseMenu])=>({
  menu:[menuHead,...menuRows],
  recipes:[recipesHead,["rec-1","Pasta",2]],
  ingredients:[ingredientHead,["rec-1","Pasta",200,"g",200,400,"test","estimada","","",16,"sku-pasta"]]
});
const pantry=(stockStatus,quantity=null,unit=null)=>({
  products:[{id:"sku-pasta",name:"Pasta",familyNames:["hélices"]}],
  items:stockStatus?[{productId:"sku-pasta",stockStatus,quantity,quantityUnit:unit}]:[]
});

test("one pending recipe requiring 100g and depleted stock becomes a shopping need",()=>{
  const derived=derivePendingMenuNeeds(source(),pantry("out"),"2026-10-19");
  assert.equal(derived.diagnostics.menuPending,1);
  assert.deepEqual(derived.needs.map(x=>[x.productId,x.classification,x.requiredGrams]),[
    ["sku-pasta","buy",100]
  ]);
  const actions=planAutoShoppingChanges(derived,[],"2026-10-19T10:00:00Z");
  assert.equal(actions.length,1);
  assert.equal(actions[0].type,"create");
});

test("consumed meal supersedes a stale planned duplicate, never demands ingredients",()=>{
  const older=[...baseMenu];older[15]="2026-10-19T09:00:00Z";
  const current=[...baseMenu];current[8]="consumido";current[15]="2026-10-19T10:00:00Z";
  const result=derivePendingMenuNeeds(source([older,current]),pantry("out"),"2026-10-19");
  assert.equal(result.diagnostics.menuPending,0);
  assert.equal(result.needs.length,0);
});

test("unknown stock never becomes zero and sufficient stock avoids buying",()=>{
  assert.equal(derivePendingMenuNeeds(source(),pantry(null),"2026-10-19").needs[0].classification,"review");
  assert.equal(derivePendingMenuNeeds(source(),pantry("unknown"),"2026-10-19").needs[0].classification,"review");
  assert.equal(derivePendingMenuNeeds(source(),pantry("sufficient"),"2026-10-19").needs[0].classification,"available");
  assert.equal(derivePendingMenuNeeds(source(),pantry("low",80,"g"),"2026-10-19").needs[0].shortfallGrams,20);
  assert.equal(derivePendingMenuNeeds(source(),pantry("medium",140,"g"),"2026-10-19").needs[0].classification,"available");
});

test("a meal without verifiable ingredient mapping is reported without invented SKU",()=>{
  const data=source();data.ingredients[1][11]="";
  data.ingredients[1][1]="Producto de nombre ambiguo";
  const result=derivePendingMenuNeeds(data,pantry("out"),"2026-10-19");
  assert.equal(result.needs.length,0);
  assert.equal(result.diagnostics.ingredientLinksMissing,1);
});

test("manual Apple or Web items survive menu changes, while menu-owned needs retire",()=>{
  const rows=[
    {rowNumber:2,record:{producto_id:"sku-pasta",estado:"COMPRAR",fuente:"web-manual"}},
    {rowNumber:3,record:{producto_id:"sku-bread",estado:"COMPRAR",fuente:"menu-pendiente-auto"}},
    {rowNumber:4,record:{producto_id:"sku-oil",estado:"COMPRAR",fuente:"apple-reminders"}}
  ];
  const result=planAutoShoppingChanges({needs:[]},rows,"T");
  assert.deepEqual(result.map(x=>x.row.rowNumber),[3]);
  assert.deepEqual(planAppleActionsForRow({state:"CANCELADO"},{apple_completed:0,apple_missing:0}),[
    {type:"setCompleted",desiredCompleted:true}
  ]);
});

test("shopping UI includes chooser and stock confirmation; private cron and menu write share service",()=>{
  const app=readFileSync(new URL("../../app/pantry.js",import.meta.url),"utf8");
  const worker=readFileSync(new URL("./index.js",import.meta.url),"utf8");
  const service=readFileSync(new URL("./pantry-shopping-actions.js",import.meta.url),"utf8");
  const config=readFileSync(new URL("../wrangler.bootstrap.jsonc",import.meta.url),"utf8");
  assert.match(app,/data-shopping-add-toggle/);
  assert.match(app,/data-shopping-add-form/);
  assert.match(app,/data-shopping-available/);
  assert.match(app,/Ya está en despensa/);
  assert.match(app,/data-shopping-product-picker|pantry-shopping-product-picker/);
  assert.match(worker,/api\/pantry\/shopping\/action/);
  assert.match(worker,/api\/pantry\/shopping\/reconcile/);
  assert.match(worker,/async scheduled\(_controller, env, ctx\)/);
  assert.match(worker,/ctx\.waitUntil\(reconcileMenuShopping/);
  assert.match(service,/estado:"CANCELADO"/);
  assert.match(service,/fuente:"web-inventory-confirmation"/);
  assert.match(service,/fuente:"menu-pendiente-auto"/);
  assert.match(config,/"triggers": \{ "crons": \["\*\/30 \* \* \* \*"\] \}/);
});


test("an existing unlinked Apple reminder under a unique family alias is not duplicated",()=>{
  const needed=derivePendingMenuNeeds(source(),pantry("out"),"2026-10-19");
  const existing=[{rowNumber:2,record:{
    producto_id:"",nombre:"HÉLICES",estado:"COMPRAR",fuente:"apple-reminders"
  }}];
  assert.equal(planAutoShoppingChanges(needed,existing,"T").length,0);
});
