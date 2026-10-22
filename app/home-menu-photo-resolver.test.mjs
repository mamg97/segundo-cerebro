import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {reconcileHomeMenuPhotos} from "./home-menu-photo-resolver.mjs";
const previous={id:"rec-cafe-solo-doble-v1",name:"Café solo doble",status:"sustituida",photoUrl:null};
const latest={id:"rec-cafe-solo-doble-v1-rev-53809d18-2a7",name:"Café solo doble",status:"activa",updatedAt:"2026-10-22T16:26:15.301Z",photoUrl:"/api/health/recipes/rec-cafe-solo-doble-v1-rev-53809d18-2a7/image?v=2026-10-22T16%3A26%3A15.301Z"};
test("real Oct 22 café photo survives immutable recipe edit while meal macros stay unchanged",()=>{
 const old={recipeId:previous.id,name:previous.name,date:"2026-10-22",kcal:4,protein:0.4,status:"consumido",photoUrl:null};
 const [actual]=reconcileHomeMenuPhotos([old],[previous,latest]);
 assert.equal(actual.photoUrl,latest.photoUrl);
 assert.equal(actual.recipeId,old.recipeId);
 assert.equal(actual.kcal,4);
 assert.equal(actual.protein,0.4);
 assert.equal(actual.status,"consumido");
 assert.equal(old.photoUrl,null);
});
test("no title-only matching or historical photo overwrite",()=>{
 const menu=[{recipeId:"unrelated-cafe",name:"Café solo doble"}, {recipeId:previous.id,photoUrl:"/api/health/recipes/rec-cafe-solo-doble-v1/image?v=original"}];
 const rows=reconcileHomeMenuPhotos(menu,[previous,latest]);
 assert.equal(rows[0].photoUrl,undefined);
 assert.equal(rows[1].photoUrl,menu[1].photoUrl);
});
test("only active explicit descendants with valid private URLs may supply missing photos",()=>{
 const menu=[{recipeId:previous.id,kcal:4}];
 const out=reconcileHomeMenuPhotos(menu,[previous,{...latest,status:"archivada"}]);
 assert.equal(out[0].photoUrl,undefined);
 const external=reconcileHomeMenuPhotos(menu,[previous,{...latest,photoUrl:"https://other.example/image.png"}]);
 assert.equal(external[0].photoUrl,undefined);
 const unrelated=reconcileHomeMenuPhotos(menu,[previous,{...latest,name:"Other coffee"}]);
 assert.equal(unrelated[0].photoUrl,undefined);
 const mismatch=reconcileHomeMenuPhotos(menu,[previous,{...latest,id:"rec-cafe-solo-doble-v10-rev-53809d18-2a7"}]);
 assert.equal(mismatch[0].photoUrl,undefined);
});
test("photo editing passes refreshed recipe catalogue into forced Home reload",()=>{
 const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
 assert.match(app,/import \{ reconcileHomeMenuPhotos \} from "\.\/home-menu-photo-resolver\.mjs\?v=0\.1\.0"/);
 assert.match(app,/data\.weeklyMenu=reconcileHomeMenuPhotos\(data\.weeklyMenu,primaryData\.recipes\)/);
 assert.match(app,/await loadHomeWeeklyMenu\(updated, \{ navigation: true, force: true \}\)/);
});
