import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {hobbiesMarkup,wineThumbnailMarkup,wineShopMarkup,externalCatalogLink,sortHobbyRecords,hobbyEditorOptions,hobbySelectField} from "./hobbies.js";
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
 assert.match(html,/hobbies\.css\?v=0\.1\.6/);
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

test("FilmAffinity per movie and series is an escaped title search, never a guessed film page",()=>{
 const title='La casa <roja> & amigos (2002)';
 for(const category of ["peliculas","series"]){
  const html=externalCatalogLink({titulo:title},category);
  assert.match(html,/class="hby-list-external"/);
  assert.match(html,/https:\/\/www.filmaffinity.com\/es\/search.php\?stype=title&amp;stext=/);
  assert.match(html,/La%20casa%20%3Croja%3E%20%26%20amigos/);
  assert.doesNotMatch(html,/%282002%29/);
  assert.match(html,/FilmAffinity ↗/);
  assert.match(html,/rel="noopener noreferrer nofollow"/);
  assert.match(html,/resultados, no ficha verificada/);
  assert.doesNotMatch(html,/<roja>/);
 }
});
test("Book outbound links search Amazon book category without guessing an ISBN or ASIN",()=>{
 const html=externalCatalogLink({titulo:'Historia & ciencia'},'libros');
 assert.match(html,/https:\/\/www.amazon.es\/s\?k=Historia%20%26%20ciencia&amp;i=stripbooks/);
 assert.match(html,/Amazon ↗/);
 assert.equal(externalCatalogLink({titulo:"Cualquiera"},'vinos'),"");
 assert.match(externalCatalogLink({titulo:""},'series'),/data-label="Buscar en">—/);
});
test("Hobbies compact CSS includes dedicated media link and mobile-safe layout",()=>{
 const css=readFileSync(new URL("./hobbies.css",import.meta.url),"utf8");
 const src=readFileSync(new URL("./hobbies.js",import.meta.url),"utf8");
 assert.match(src,/hby-list-table--media/);
 assert.match(src,/strong title=/);
 assert.match(src,/externalCatalogLink\(item,store.category\)/);
 assert.match(css,/hby-list-table--media \.hby-list-external/);
 assert.match(css,/hby-list-table--media td\{padding:5px 10px;height:32px/);
 assert.doesNotMatch(css,/overflow-y:auto|height:100vh/);
});

test("Column sorting uses Spanish natural text, both directions and leaves canonical order untouched",()=>{
 const rows=[
  {id:"z",titulo:"Zorro 12",subtipo:"Drama",puntuacion:10},
  {id:"a",titulo:"Álbum 2",subtipo:"Aventura",puntuacion:2},
  {id:"b",titulo:"album 10",subtipo:"Drama",puntuacion:""},
  {id:"c",titulo:"Cielo",subtipo:"Aventura",puntuacion:9},
  {id:"d",titulo:"Cielo",subtipo:"Aventura",puntuacion:9}
 ];
 const ids=x=>x.map(row=>row.id);
 assert.deepEqual(ids(sortHobbyRecords(rows,"peliculas","titulo")) ,["a","b","c","d","z"]);
 assert.deepEqual(ids(sortHobbyRecords(rows,"peliculas","titulo","desc")),["z","c","d","b","a"]);
 assert.deepEqual(ids(sortHobbyRecords(rows,"peliculas","nota")),["a","c","d","z","b"]);
 assert.deepEqual(ids(sortHobbyRecords(rows,"peliculas","nota","desc")),["z","c","d","a","b"]);
 assert.deepEqual(ids(sortHobbyRecords(rows,"peliculas","genero")),["a","c","d","z","b"]);
 assert.deepEqual(ids(rows),["z","a","b","c","d"]);
 assert.deepEqual(sortHobbyRecords(rows,"peliculas","not-a-column"),rows);
});
test("Numeric ratings including 0 are correctly sorted and missing scores stay last in both directions",()=>{
 const rows=[{puntuacion:""},{puntuacion:0},{puntuacion:10},{puntuacion:"7,5"},{puntuacion:null},{puntuacion:"bad"}];
 const values=x=>x.map(v=>v.puntuacion);
 assert.deepEqual(values(sortHobbyRecords(rows,"series","nota")), [0,"7,5",10,"",null,"bad"]);
 assert.deepEqual(values(sortHobbyRecords(rows,"series","nota","desc")), [10,"7,5",0,"",null,"bad"]);
});
test("Wine sort headers use displayed column semantics: photo, denomination, price and merchant",()=>{
 const rows=[
  {id:"b",marca:"B",tipo:"Tinto",denominacion:"Rioja",precio:18,tienda:"El Corte Inglés",imagen_url:""},
  {id:"a",marca:"A",tipo:"Blanco",denominacion:"Rueda",precio:7,tienda:"",imagen_url:"https://img.example.org/w.jpg"},
  {id:"c",marca:"C",tipo:"Rosado",denominacion:"",precio:"",tienda:"Amazon",imagen_url:""}
 ];
 const ids=x=>x.map(v=>v.id);
 assert.deepEqual(ids(sortHobbyRecords(rows,"vinos","foto")),["a","b","c"]);
 assert.deepEqual(ids(sortHobbyRecords(rows,"vinos","genero")),["b","c","a"]); // Denominación visually falls back to tipo
 assert.deepEqual(ids(sortHobbyRecords(rows,"vinos","estado")),["a","c","b"]);
 assert.deepEqual(ids(sortHobbyRecords(rows,"vinos","nota","desc")),["b","a","c"]);
 assert.deepEqual(ids(sortHobbyRecords(rows,"vinos","enlace")),["c","a","b"]);
});
test("Sorting 722 rows happens across the complete collection, not only first page",()=>{
 const data=Array.from({length:722},(_,i)=>({id:i+1,titulo:"Ejemplo "+(i+1)}));
 const descending=sortHobbyRecords(data,"peliculas","titulo","desc");
 assert.deepEqual(descending.slice(0,3).map(x=>x.id),[722,721,720]);
 assert.equal(descending.slice(0,48).length,48);
 assert.equal(descending[48].id,674);
 assert.equal(data[0].id,1);
});
test("Sortable headers expose aria-sort, accessible click toggles and mobile controls",()=>{
 const js=readFileSync(new URL("./hobbies.js",import.meta.url),"utf8");
 const css=readFileSync(new URL("./hobbies.css",import.meta.url),"utf8");
 assert.match(js,/data-hby-sort/);
 assert.match(js,/aria-sort/);
 assert.match(js,/ascending.*descending/);
 assert.match(js,/sortHobbyRecords\(filtered,store.category,store.sortKey,store.sortDir\)/);
 assert.match(js,/sortKey:""/);
 assert.match(js,/store.page=1;show\(\)/);
 assert.match(js,/hby-mobile-sort/);
 assert.match(js,/hby-mobile-direction/);
 assert.match(css,/\.hby-sort-button:focus-visible/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.doesNotMatch(css,/overflow-y:auto|height:100vh/);
});

test("Editor dropdown options derive from existing canonical fields, without overwriting records",()=>{
 const items=[
  {subtipo:"Drama",subtipo_2:"Fantasía",estado:"Pendiente"},
  {subtipo:"Aventuras",subtipo_2:"Cazatesoros",estado:"En curso"},
  {subtipo:"drama",subtipo_2:"Cazatesoros",estado:"Vista"},
  {subtipo:"Áventura 2",subtipo_2:"",estado:""},
  {subtipo:"",subtipo_2:"",estado:"Vista"}
 ];
 const original=JSON.stringify(items);
 assert.deepEqual(hobbyEditorOptions(items,"subtipo"),["Áventura 2","Aventuras","Drama"]);
 assert.deepEqual(hobbyEditorOptions(items,"subtipo_2","Inédito"),["Cazatesoros","Fantasía","Inédito"]);
 assert.deepEqual(hobbyEditorOptions(items,"estado"),["En curso","Pendiente","Vista"]);
 assert.equal(JSON.stringify(items),original);
});
test("Numeric scores show ordered 0-10 half-point steps and preserve imported decimals",()=>{
 const list=hobbyEditorOptions([{puntuacion:9.3},{puntuacion:"6,7"},{puntuacion:""},{puntuacion:"bad"}],"puntuacion",6.7,true);
 assert.equal(list[0],"0");assert.equal(list[list.length-1],"10");
 assert.ok(list.includes("9.3"));assert.ok(list.includes("6.7"));assert.ok(list.includes("6.5"));
 assert.equal(new Set(list).size,list.length);
 assert.ok(list.every(x=>Number.isFinite(Number(x))&&Number(x)>=0&&Number(x)<=10));
});
test("Editor selects preserve exact existing value, allow blank or Otro, and escape sheet strings",()=>{
 const html=hobbySelectField("subtipo","Género / subtipo","Aventuras",["Drama","Aventuras","<script>"]);
 assert.match(html,/<select name="subtipo" data-hby-choice="subtipo">/);
 assert.match(html,/<option value="Aventuras" selected>Aventuras<\/option>/);
 assert.match(html,/<option value="">Sin especificar<\/option>/);
 assert.match(html,/Otro… \(escribir\)/);
 assert.match(html,/name="subtipo__other"/);
 assert.match(html,/hidden disabled/);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
});
test("Editor uses selectors for classification and scores, calendar picker for dates and free text for notes",()=>{
 const src=readFileSync(new URL("./hobbies.js",import.meta.url),"utf8");
 assert.match(src,/editorChoice\("subtipo","Género \/ subtipo"/);
 assert.match(src,/editorChoice\("subtipo_2","Subtipo adicional"/);
 assert.match(src,/editorChoice\("estado","Estado"/);
 assert.match(src,/editorChoice\("puntuacion","Puntuación \(0–10\)"/);
 assert.match(src,/editorChoice\("tipo","Tipo \/ vino"/);
 assert.match(src,/editorChoice\("denominacion","Denominación"/);
 assert.match(src,/editorChoice\("nota","Puntuación \(0–10\)"/);
 assert.match(src,/inputField\("fecha_inicio","Fecha inicio",item\?\.fecha_inicio,"date"\)/);
 assert.match(src,/inputField\("fecha_fin","Fecha fin",item\?\.fecha_fin,"date"\)/);
 assert.match(src,/inputField\("comentarios","Notas y comentarios"/);
 assert.match(src,/value===OTHER_OPTION/);
 assert.match(src,/input\.required=custom/);
 assert.match(src,/hby-form/);
});
