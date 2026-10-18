import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
const css=readFileSync(new URL("./styles.css",import.meta.url),"utf8");
const from=app.indexOf("function renderHomeWeeklyMenuMatrixCell(items, readOnly = false) {");
const to=app.indexOf("async function openHomeWeeklyMenuRecipe(",from);
const projectionStart=app.indexOf("function homeMenuEditPayload(");
const projectionEnd=app.indexOf("function homeMenuEditDialog()",projectionStart);
assert.ok(from>0 && to>from && projectionStart>0 && projectionEnd>projectionStart);
const sandbox={
  escapeHtml:s=>String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;"),
  formatKcal:n=>`${n} kcal`,formatMacro:n=>`${n} g`,
  weeklyMenuItemIsConsumed:r=>r.status==="consumido",
  normalizeWeeklyMenuMoment:s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase(),
  Number
};
vm.createContext(sandbox);
vm.runInContext(app.slice(from,to)+app.slice(projectionStart,projectionEnd),sandbox);
const item={sourceRow:8,date:"2026-10-15",moment:"Comida",recipeId:"rec-a",name:"Plato A",quantity:1,unit:"ración",kcal:310,protein:25,status:"planificado",updatedAt:"T1",itemRole:"receta"};

test("Home uses separate consume and replace actions, keeping recipe detail independently clickable",()=>{
  const html=sandbox.renderHomeWeeklyMenuMatrixCell([item]);
  assert.match(html,/data-home-menu-consume="8"/);
  assert.match(html,/data-home-menu-change="8"/);
  assert.match(html,/data-home-menu-recipe-open="rec-a"/);
  assert.match(html,/310 kcal/);
  assert.doesNotMatch(sandbox.renderHomeWeeklyMenuMatrixCell([{...item,status:"consumido"}]),/data-home-menu-consume=/);
  assert.match(sandbox.renderHomeWeeklyMenuMatrixCell([{...item,itemRole:"acompanante"}]),/data-home-menu-change=/);
});

test("projected replacement counts all macros and the day's remaining planned totals",()=>{
  const recipe={id:"rec-b",servings:2,kcalPerServing:450,proteinPerServing:46,carbsPerServing:30,fatPerServing:11,precision:"estimada"};
  const p=sandbox.homeMenuRecipeProjection(item,recipe,{kcal:1180,protein:110});
  assert.deepEqual(JSON.parse(JSON.stringify(p)),{kcal:450,protein:46,carbs:30,fat:11,dayKcal:1320,dayProtein:131});
  assert.equal(sandbox.homeMenuRecipeProjection({...item,unit:"plato"},recipe,{kcal:1180,protein:110}),null);
  assert.equal(sandbox.homeMenuRecipeProjection({...item,quantity:null},recipe,{kcal:1180,protein:110}),null);
  assert.equal(sandbox.homeMenuRecipeProjection({...item,quantity:""},recipe,{kcal:1180,protein:110}),null);
  assert.equal(sandbox.homeMenuRecipeProjection({...item,quantity:0},recipe,{kcal:1180,protein:110}),null);
  assert.equal(sandbox.homeMenuRecipeProjection(item,{...recipe,proteinPerServing:null},{kcal:1180,protein:110}),null);
  assert.equal(sandbox.homeMenuRecipeProjection(item,{...recipe,precision:"pendiente"},{kcal:1180,protein:110}),null);
});

test("write payload only contains stable row identity, not editable macros from browser",()=>{
 const p=sandbox.homeMenuEditPayload(item,"replace","rec-b");
 assert.deepEqual(Object.keys(p).sort(),["action","date","moment","name","newRecipeId","recipeId","sourceRow","updatedAt"].sort());
 assert.equal(p.sourceRow,8);
 assert.equal(p.updatedAt,"T1");
});

test("new editor is accessible on mobile without requiring hovering over cells",()=>{
 assert.match(css,/\.home-menu-edit-dialog/);
 assert.match(css,/max-height: 88dvh/);
 assert.match(css,/\.home-menu-item-actions button:focus-visible/);
 assert.match(app,/dialog\.showModal\(\)/);
 assert.match(app,/data-menu-editor-search/);
 assert.match(app,/data-menu-editor-preview/);
 assert.match(app,/submitHomeMenuEdit\(item,"replace",selectedRecipe\.id,servingsInput/);
});


test("Home shows the private photo inside the existing recipe-detail button",()=>{
  const photoUrl="/api/health/recipes/rec-a/image?v=2026-10-15T10%3A30Z";
  const html=sandbox.renderHomeWeeklyMenuMatrixCell([{...item,photoUrl}]);
  assert.match(html,/class="home-menu-recipe-thumb"/);
  assert.match(html,/src="\/api\/health\/recipes\/rec-a\/image\?v=2026-10-15T10%3A30Z"/);
  assert.match(html,/loading="lazy" decoding="async"/);
  assert.match(html,/data-home-menu-recipe-open="rec-a"/);
  assert.match(css,/\.home-weekly-menu-recipe-link\s*\{/);
  assert.match(css,/object-fit: contain/);
});

test("Home safely shows missing-photo marker without breaking recipe navigation",()=>{
  for(const photoUrl of [null,"https://drive.google.com/secret","javascript:alert(1)"]){
    const html=sandbox.renderHomeWeeklyMenuMatrixCell([{...item,photoUrl}]);
    assert.match(html,/home-menu-recipe-thumb-missing/);
    assert.doesNotMatch(html,/<img/);
    assert.match(html,/data-home-menu-recipe-open="rec-a"/);
  }
  const pantry=sandbox.renderHomeWeeklyMenuMatrixCell([{...item,recipeId:null,foodId:"food-x",photoUrl:null}]);
  assert.doesNotMatch(pantry,/home-menu-recipe-thumb/);
});


test("Home uses a vertical image-first card with a full-width recipe title and macros below",()=>{
  const result=sandbox.renderHomeWeeklyMenuMatrixCell([{...item,photoUrl:"/api/health/recipes/rec-a/image?v=v1"}]);
  const image=result.indexOf('class="home-menu-recipe-thumb"');
  const name=result.indexOf('class="home-menu-recipe-title"');
  const macros=result.indexOf('class="weekly-menu-group-item-macros"');
  const actions=result.indexOf('class="home-menu-item-actions"');
  assert.ok(image>=0 && image<name && name<macros && macros<actions);
  assert.match(result,/width="156" height="88"/);
  assert.match(css,/\.home-weekly-menu-table-cell \.home-weekly-menu-recipe-link\s*\{\s*display: flex;\s*flex-direction: column;/);
  assert.match(css,/\.home-weekly-menu-table-cell \.weekly-menu-group-item\s*\{\s*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css,/\.home-weekly-menu-table-cell \.home-menu-recipe-title strong[\s\S]*?overflow-wrap: break-word;/);
});

test("Weekly menu is the second full-width Home card below nutrition overview",()=>{
  const html=readFileSync(new URL("./index.html",import.meta.url),"utf8");
  const health=html.indexOf('id="home-health-card"');
  const menu=html.indexOf('id="home-weekly-menu-panel"');
  const pantry=html.indexOf('id="home-pantry-card"');
  const finance=html.indexOf('class="money-horizon"');
  assert.ok(health>0 && health<menu && menu<pantry && pantry<finance);
  const summaryOpen=html.indexOf('<section class="daily-overview-grid"');
  const summaryClose=html.indexOf("</section>",summaryOpen);
  assert.ok(summaryOpen<menu && menu<summaryClose,"menu is within summary grid");
  assert.match(css,/\.daily-overview-grid > #home-weekly-menu-panel\s*\{\s*grid-column: 1 \/ -1;/);
  assert.match(html,/id="home-weekly-menu-panel"[^>]*\bhidden>/);
});


test("Home allows replacement and consumption for planned Pantry food at any meal moment",()=>{
  for(const moment of ["Media mañana","Merienda","Cena"]) {
    const food={...item,moment,recipeId:null,foodId:"food-b",name:"Yogur",quantity:120,unit:"g",itemRole:"acompanante"};
    const html=sandbox.renderHomeWeeklyMenuMatrixCell([food]);
    assert.match(html,/data-home-menu-consume="8"/);
    assert.match(html,/data-home-menu-change="8"/);
    const payload=sandbox.homeMenuEditPayload(food,"replace","rec-b",1);
    assert.equal(payload.foodId,"food-b");
    assert.equal(payload.newServings,1);
    assert.equal(payload.recipeId,undefined);
    assert.equal(payload.newRecipeId,"rec-b");
    assert.equal(sandbox.homeMenuRecipeProjection(food,{id:"rec-b",servings:2,kcalPerServing:250,proteinPerServing:25,carbsPerServing:20,fatPerServing:8,precision:"estimada"},{kcal:1000,protein:100}),null);
    assert.equal(sandbox.homeMenuRecipeProjection(food,{id:"rec-b",servings:2,kcalPerServing:250,proteinPerServing:25,carbsPerServing:20,fatPerServing:8,precision:"estimada"},{kcal:1000,protein:100},1).kcal,250);
  }
});

test("consumed food/recipes remain protected from plan-only edits",()=>{
  for(const food of [null,"food-b"]) {
    const recipe={...item,recipeId:food?null:item.recipeId,foodId:food,status:"consumido",itemRole:food?"acompanante":"receta"};
    const html=sandbox.renderHomeWeeklyMenuMatrixCell([recipe]);
    assert.doesNotMatch(html,/data-home-menu-change=/);
    assert.doesNotMatch(html,/data-home-menu-consume=/);
    assert.match(html,/home-menu-consumed-label/);
  }
  assert.match(app,/data-menu-editor-servings/);
  assert.match(css,/\.home-menu-editor-food-hint/);
});
