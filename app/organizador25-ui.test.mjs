import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(name)=>readFileSync(new URL(name,import.meta.url),"utf8");

test("Dinero de este mes: presupuesto y movimientos tienen el mismo selector, conservando el enlace",()=>{
 const index=read("./index.html"),css=read("./organizador25-ui.css");
 assert.match(index,/id="show-budget-detail" class="text-action"/);
 assert.match(index,/id="show-account-movements" class="text-action" href="#\/finanzas\/movimientos"/);
 assert.match(css,/:is\(#show-budget-detail,#show-account-movements\)/);
 assert.match(index,/organizador25-ui\.css\?v=0\.1\.1/);
});

test("Viajes: tarjetas 1:1, título y fecha sobre foto sin badges ni estados",()=>{
 const travels=read("./travels.js"),css=read("./organizador25-ui.css");
 const card=travels.slice(travels.indexOf("function card(event)"),travels.indexOf("function renderList()"));
 assert.match(card,/trv-city-tile/);
 assert.match(card,/trv-card-photo/);
 assert.match(card,/trv-card-details/);
 assert.doesNotMatch(card,/trv-status|trv-card-top|CONFIRMADO/);
 assert.match(css,/aspect-ratio:1 \/ 1/);
 assert.match(travels,/referrerpolicy="no-referrer"/);
 assert.match(travels,/travelPhotoCredits\(ordered\)/);
 assert.match(travels,/CC BY 4\.0/);
 const gallery=travels.slice(travels.indexOf("function renderList()"),travels.indexOf("function section("));
 assert.match(gallery,/trv-horizontal-gallery/);
 assert.doesNotMatch(gallery,/<h3 class="trv-label">/);
 assert.match(gallery,/sortTripsNewestFirst\(state\.trips\)/);
 assert.match(css,/\.trv-grid\.trv-horizontal-gallery \{[\s\S]*?display:flex;/);
 assert.match(css,/flex-flow:row nowrap/);
 assert.match(css,/overflow-x:auto/);
 assert.match(travels,/Kapitel/);
 assert.match(travels,/CC BY-SA 4\.0/);
});

test("Boda sustituye visualmente Pareja en ambos menús sin migrar ni borrar los datos",()=>{
 const app=read("./app.js"),nav=read("./mobile-navigation.mjs");
 assert.match(app,/area\.id === "area-partner" \? hrefForWedding\(\) : hrefForArea\(area\.id\)/);
 assert.match(app,/areaId==="area-partner"\?hrefForWedding\(\):hrefForArea\(areaId\)/);
 assert.match(app,/if \(areaId === "area-partner"\) \{\s*openWeddingDetail/);
 assert.match(nav,/\["area-partner","Boda","ring"\]/);
 assert.doesNotMatch(nav,/\["area-partner","Pareja"/);
 assert.match(nav,/"area-partner":\[\{label:"Boda",href:hrefForWedding\(\)\}\]/);
});
