import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const src=readFileSync(new URL("./app.js",import.meta.url),"utf8");
const css=readFileSync(new URL("./menu-icon-actions.css",import.meta.url),"utf8");
const index=readFileSync(new URL("./index.html",import.meta.url),"utf8");
const start=src.indexOf('function renderHomeWeeklyMenuMatrixCell(items, readOnly = false, date = "", moment = "") {');
const end=src.indexOf("async function openHomeWeeklyMenuRecipe(",start);
assert.ok(start>=0 && end>start);
const sandbox={escapeHtml:t=>String(t).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;"),
 formatKcal:n=>n+" kcal",formatMacro:n=>n+" g",weeklyMenuItemIsConsumed:item=>item.status==="consumido",
 normalizeWeeklyMenuMoment:t=>String(t||"").toLowerCase(),Number};
vm.createContext(sandbox);
vm.runInContext(src.slice(start,end),sandbox);
const item={sourceRow:28,recipeId:"rec-a",itemRole:"receta",status:"planificado",name:"Comida de prueba",kcal:310,protein:25};
test("planned meal has green check, unchanged Cambiar and red X with accessible labels",()=>{
 const rendered=sandbox.renderHomeWeeklyMenuMatrixCell([item]);
 assert.match(rendered,/class="home-menu-consume-action" data-home-menu-consume="28"/);
 assert.match(rendered,/aria-label="Marcar Comida de prueba como consumida"/);
 assert.match(rendered,/title="Marcar como consumida"><span aria-hidden="true">✓<\/span>/);
 assert.match(rendered,/class="home-menu-change-action" data-home-menu-change="28"/);
 assert.match(rendered,/class="home-menu-remove-action" data-home-menu-remove="28"/);
 assert.match(rendered,/aria-label="Eliminar Comida de prueba del menú"/);
 assert.match(rendered,/title="Eliminar del menú"><span aria-hidden="true">×<\/span>/);
 assert.doesNotMatch(rendered,/>✓ Consumida<|>Eliminar<\/button>/);
});
test("consumed meal shows one noninteractive green check; edit and removal still work",()=>{
 const rendered=sandbox.renderHomeWeeklyMenuMatrixCell([{...item,status:"consumido"}]);
 assert.match(rendered,/class="home-menu-consumed-label" role="img" aria-label="Consumida"/);
 assert.doesNotMatch(rendered,/data-home-menu-consume=/);
 assert.match(rendered,/data-home-menu-change="28"/);
 assert.match(rendered,/data-home-menu-remove="28"/);
});
test("actions preserve backend writes and removal confirmation",()=>{
 assert.match(src,/submitHomeMenuEdit\(\{\.\.\.item,status:originalStatus\},"consume"\)/);
 assert.match(src,/submitHomeMenuEdit\(item,"remove"\)/);
 assert.match(src,/window.confirm\("¿Eliminar «"/);
 assert.match(src,/button\.textContent="×";button\.removeAttribute\("aria-busy"\)/);
});
test("mobile menu fits three actions in a single row and uses last-loaded stylesheet",()=>{
 assert.match(css,/grid-template-columns:29px minmax\(0,1fr\) 29px/);
 assert.match(css,/button\.home-menu-consume-action/);
 assert.match(css,/button\.home-menu-remove-action/);
 assert.match(css,/button\.home-menu-change-action/);
 assert.match(index,/menu-icon-actions\.css\?v=0\.1\.0/);
 assert.ok(index.indexOf("family-dashboard.css")<index.indexOf("menu-icon-actions.css"));
});
