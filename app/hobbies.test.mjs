import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {hobbiesMarkup,wineThumbnailMarkup,wineShopMarkup} from "./hobbies.js";
import {HOBBY_CATEGORIES,hrefForHobby} from "./area-routes.mjs";

test("Hobbies root has compact tabs, defaults to Películas, and has no oversized banner",()=>{
 const html=hobbiesMarkup();
 assert.match(html,/class="hby-tabs"/);
 assert.match(html,/data-hby-current="peliculas"/);
 assert.match(html,/href="#\/hobbies\/peliculas" aria-current="page"/);
 assert.match(html,/id="hby-dynamic"/);
 for(const hobby of HOBBY_CATEGORIES){
   assert.ok(html.includes('href="'+hrefForHobby(hobby.id)+'"'));
   assert.ok(html.includes(hobby.title));
 }
 assert.doesNotMatch(html,/Disfrutar también es parte del plan|hby-hero|hby-category-hero|hby-card/);
});
test("All categories share the same tabs and keep their own linked URL",()=>{
 for(const hobby of HOBBY_CATEGORIES){
  const html=hobbiesMarkup(hobby.id);
  assert.match(html,/class="hby-tabs"/);
  assert.ok(html.includes('href="'+hrefForHobby(hobby.id)+'" aria-current="page"'));
  assert.match(html,/id="hby-dynamic"|class="hby-empty"/);
  assert.doesNotMatch(html,/hby-category-hero|hby-hero/);
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
 assert.match(html,/hobbies\.css\?v=0\.1\.3/);
 assert.match(css,/\.hby-list-table/);
 assert.match(css,/\.hby-tabs/);
 assert.match(readFileSync(new URL("./hobbies.js",import.meta.url),"utf8"),/shown\.map\(recordRow\)/);
 assert.doesNotMatch(css,/overflow-y:auto|height:100vh/);
 for(const sensitive of ["Miguel","Andrea","Varsovia","Montecristo"]){
   assert.equal(routes.includes(sensitive),false);
 }
});

test("Wine media uses click-to-enlarge thumbnails and safe store links",()=>{
 const bottle={id:"vin-test-01",marca:"Viña Test",tipo:"Reserva",imagen_url:"https://images.example.org/vino-test.jpg",tienda_url:"https://www.elcorteingles.es/supermercado/abc/"};
 const thumb=wineThumbnailMarkup(bottle),shop=wineShopMarkup(bottle);
 assert.match(thumb,/data-hby-photo="vin-test-01"/);
 assert.match(thumb,/loading="lazy"/);
 assert.match(thumb,/referrerpolicy="no-referrer"/);
 assert.match(shop,/El Corte Inglés/);
 assert.match(shop,/target="_blank"/);
 assert.match(shop,/noopener noreferrer/);
 assert.doesNotMatch(shop,/amazon/);
 assert.match(wineThumbnailMarkup({...bottle,imagen_url:"javascript:alert(1)"}),/Fotografía pendiente/);
 assert.match(wineShopMarkup({...bottle,tienda_url:"https:\/\/www.example.org\/wrong"}),/Buscar en Amazon/);
 assert.doesNotMatch(wineThumbnailMarkup({...bottle,marca:'<img src=x onerror=1>'}),/<img src=x/);
});
