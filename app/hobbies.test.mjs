import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {hobbiesMarkup} from "./hobbies.js";
import {HOBBY_CATEGORIES,hrefForHobby} from "./area-routes.mjs";

test("Hobbies overview links to all categories without inventing records",()=>{
 const html=hobbiesMarkup();
 assert.match(html,/Explora tus aficiones/);
 for(const hobby of HOBBY_CATEGORIES){
   assert.ok(html.includes('href="'+hrefForHobby(hobby.id)+'"'));
   assert.ok(html.includes(hobby.title));
 }
 assert.match(html,/no se muestran entradas ficticias/);
});
test("Hobbies category views expose tailored metadata and a back link",()=>{
 for(const hobby of HOBBY_CATEGORIES){
   const html=hobbiesMarkup(hobby.id);
   assert.match(html,/href="#\/hobbies"/);
   assert.match(html,/class="hby-empty"/);
   assert.match(html,/Por conectar/);
   for(const field of hobby.fields)assert.ok(html.includes(field));
 }
});
test("Hobbies has the canonical area route and responsive styling, no embedded personal entries",()=>{
 const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
 const html=readFileSync(new URL("./index.html",import.meta.url),"utf8");
 const routes=readFileSync(new URL("./area-routes.mjs",import.meta.url),"utf8");
 const css=readFileSync(new URL("./hobbies.css",import.meta.url),"utf8");
 assert.match(app,/openHobbiesDetail\(routedHobbyId\)/);
 assert.match(app,/id: "area-hobbies"/);
 assert.match(app,/"area-travels", "area-hobbies"/);
 assert.match(app,/route\.areaId==="area-hobbies"/);
 assert.match(routes,/hrefForHobby/);
 assert.match(html,/hobbies\.css\?v=0\.1\.0/);
 assert.match(css,/\.hby-grid/);
 assert.doesNotMatch(css,/overflow-y:auto|height:100vh/);
 for(const sensitive of ["Miguel","Andrea","Varsovia","Montecristo"]){
   assert.equal(routes.includes(sensitive),false);
 }
});
