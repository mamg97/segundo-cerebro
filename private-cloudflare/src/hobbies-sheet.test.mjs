import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {HOBBY_TYPES,HobbiesError,decodeHobbiesRows,handleHobbiesRequest} from "./hobbies-sheet.js";
test("Hobbies schema stays in Google Sheets with revision and lineage columns",()=>{
 assert.deepEqual(HOBBY_TYPES,["peliculas","series","libros","vinos"]);
 const headers=["id","titulo","subtipo","subtipo_2","estado","puntuacion","fecha_inicio","fecha_fin","comentarios","tipo_origen","estado_origen","fila_origen","revision","incidencia_migracion","actualizado_en","actualizado_por","archivado"];
 const rows=[headers,["pel-0005","Prueba","","","Vista",10,"","","","Película","Vista",5,1,"","","",""],["pel-other","Archivada","","","Vista",8,"","","","Película","Vista",42,2,"","","","si"]];
 const result=decodeHobbiesRows("peliculas",rows);
 assert.equal(result.length,1);assert.equal(result[0].sourceRow,5);
 assert.equal(result[0].revision,1);assert.equal(result[0].puntuacion,10);
 assert.throws(()=>decodeHobbiesRows("peliculas",[["bad","wrong"]]),HobbiesError);
});
test("Anonymous callers cannot access the canonical Hobbies endpoints",async()=>{
 const req=new Request("https://private.example/api/hobbies/peliculas");
 const res=await handleHobbiesRequest(req,{GOOGLE_CLIENT_ID:"irrelevant"},async()=>{throw Error("TOKEN_SHOULD_NOT_BE_CALLED")});
 assert.equal(res.status,403);
 assert.equal((await res.json()).code,"ACCESS_REQUIRED");
});
test("Hobbies mutations reject cross-origin requests before Google Sheets",async()=>{
 const req=new Request("https://private.example/api/hobbies/peliculas",{method:"POST",headers:{"Origin":"https://another.example","Content-Type":"application/json","Cf-Access-Authenticated-User-Email":"allowed@example.org","Cf-Access-Jwt-Assertion":"a.b.c"},body:"{}"});
 const res=await handleHobbiesRequest(req,{GOOGLE_CLIENT_ID:"yes"},async()=>{throw Error("TOKEN_SHOULD_NOT_BE_CALLED")});
 assert.equal(res.status,403);assert.equal((await res.json()).code,"INVALID_ORIGIN");
});
test("Public repository does not contain private catalogue row data or sheet IDs",()=>{
 const code=readFileSync(new URL("./hobbies-sheet.js",import.meta.url),"utf8");
 const frontend=readFileSync(new URL("../../app/hobbies.js",import.meta.url),"utf8");
 assert.match(code,/valueInputOption=RAW/);
 assert.match(code,/revision\+1/);
 assert.match(code,/MIGRATION_NOT_ACTIVE/);
 assert.match(frontend,/api\/hobbies\//);
 assert.doesNotMatch(code,/1TLJSUN65|18UvzJo|1C0x3tSUY/);
});
