import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {planRecipeMutation} from "../private-cloudflare/src/recipe-editor.js";
import {validateRecipePhotoBytes,MAX_RECIPE_PHOTO} from "../private-cloudflare/src/recipe-photo-store.js";
test("recipe editor has separate gallery and camera inputs with preview and reversible selection",()=>{
 const ui=readFileSync(new URL("./recipe-editor-ui.mjs",import.meta.url),"utf8");
 const index=readFileSync(new URL("./index.html",import.meta.url),"utf8");
 const css=readFileSync(new URL("./recipe-photo-editor.css",import.meta.url),"utf8");
 assert.match(ui,/data-editor-photo-gallery type="file" accept="image\/\*,\.heic,\.heif"/);
 assert.match(ui,/data-editor-photo-camera type="file" accept="image\/\*" capture="environment"/);
 assert.match(ui,/data-editor-photo-preview/);
 assert.match(ui,/URL\.revokeObjectURL\(previewUrl\)/);
 assert.match(ui,/chosenPhoto\?await prepareRecipePhoto\(chosenPhoto\)/);
 assert.match(ui,/data\.set\("photo",photo,"receta\.jpg"\)/);
 assert.match(ui,/toBlob\(resolve,"image\/jpeg"/);
 assert.match(css,/object-fit:contain/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(index,/recipe-photo-editor\.css\?v=0\.1\.1/);
});
test("image payload requires JPEG/PNG/WebP signature and limited length",()=>{
 assert.equal(MAX_RECIPE_PHOTO,900000);
 const jpg=new Uint8Array(20);jpg.set([255,216,255],0);
 assert.equal(validateRecipePhotoBytes(jpg,"image/jpeg"),jpg);
 assert.throws(()=>validateRecipePhotoBytes(jpg,"image/png"),/RECIPE_PHOTO_SIGNATURE/);
 assert.throws(()=>validateRecipePhotoBytes(jpg,"image/heic"),/RECIPE_PHOTO_TYPE/);
 assert.throws(()=>validateRecipePhotoBytes(new Uint8Array(900001),"image/jpeg"),/RECIPE_PHOTO_SIZE/);
});
test("versioned photo metadata never changes original recipe metadata",()=>{
 const recipes=[["recipe_id","nombre","raciones","kcal_total","kcal_racion","proteinas_racion_g","carbohidratos_racion_g","grasas_racion_g","precision","fuente","nota","updated_at","foto_drive_file_id","foto_mime_type","foto_updated_at"],["r-old","Old recipe",2,500,250,20,30,10,"estimated","me","","2026-10-20","drive-old","image/png","2026-10-20"]];
 const payload={action:"edit",recipeId:"r-old",updatedAt:"2026-10-20",name:"New",category:"comida_cena",servings:2,kcalPerServing:250,proteinPerServing:20,carbsPerServing:30,fatPerServing:10,_privatePhoto:true};
 const p=planRecipeMutation({recipes,ingredients:[],steps:[]},payload,{now:"2026-10-22",newId:"r-new"});
 const row=p.updates.find(x=>x.range==="Recetas!A3:Q3")?.values[0];
 assert.ok(row);
 assert.equal(row[12],"private_r-new");
 assert.equal(row[13],"image/jpeg");
 assert.equal(row[14],"2026-10-22");
 assert.equal(recipes[1][12],"drive-old");
 assert.equal(recipes[1][13],"image/png");
});
test("private recipe images are read before inherited Google Drive photos",()=>{
 const worker=readFileSync(new URL("../private-cloudflare/src/index.js",import.meta.url),"utf8");
 const recipe=readFileSync(new URL("../private-cloudflare/src/recipe-editor.js",import.meta.url),"utf8");
 const store=readFileSync(new URL("../private-cloudflare/src/recipe-photo-store.js",import.meta.url),"utf8");
 const migration=readFileSync(new URL("../private-cloudflare/migrations/0012_recipe_photo_versions.sql",import.meta.url),"utf8");
 const start=worker.indexOf("async function serveHealthRecipePhoto");
 assert.ok(worker.indexOf("serveRecipeVersionPhoto(env,recipeId)",start)<worker.indexOf("fetchHealthRecipePreview(env, recipeId)",start));
 assert.match(recipe,/await saveRecipeVersionPhoto\(env,\{fromId:sourceId,toId:newId,photo,now\}\)/);
 assert.match(recipe,/if\(staged\)try\{await deleteRecipeVersionPhoto/);
 assert.match(store,/SELECT HEX\(SUBSTR\(image_data,\?,\?\)\)/);
 assert.match(migration,/recipe_photo_versions/);
 assert.doesNotMatch(recipe,/MenuSemanal!|Registro!/);
});

test("after recipe photo edit the home menu invalidates cached photo references and reloads",()=>{
 const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
 const first=app.indexOf("async function refreshRecipeCatalog(expected=null)");
 const second=app.indexOf("function renderRecipeDetail(",first);
 assert.ok(first>=0 && second>first);
 const code=app.slice(first,second);
 assert.match(code,/homeWeeklyMenuWeekCache\.clear\(\)/);
 assert.match(code,/await loadHomeWeeklyMenu\(updated, \{ navigation: true, force: true \}\)/);
 assert.match(code,/renderRecipesPanel\(updated\)/);
});

test("new recipe photos are read back before the edit form reports completion",()=>{
 const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
 const ui=readFileSync(new URL("./recipe-editor-ui.mjs",import.meta.url),"utf8");
 assert.match(app,/if\(expected\.photoUpdated\)/);
 assert.match(app,/throw new Error\("RECIPE_PHOTO_NOT_READABLE"\)/);
 assert.match(ui,/const saved=await writeRecipeAction\(payload,photo\)/);
 assert.match(ui,/await onSaved\(saved\)/);
 assert.match(ui,/No vuelvas a guardar: recarga el catálogo/);
});

test("photo save verifies exact JPEG bytes and shows the active new version",()=>{
 const ui=readFileSync(new URL("./recipe-editor-ui.mjs",import.meta.url),"utf8");
 const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
 assert.match(ui,/const photoSha256=photo\?await recipePhotoSha256\(photo\):null/);
 assert.match(ui,/return \{\.\.\.j,photoVerificationRequired:Boolean\(photo\),photoSha256\}/);
 assert.match(app,/expected\.photoVerificationRequired && \(!expected\.photoUpdated \|\| !expected\.photoSha256\)/);
 assert.match(app,/crypto\.subtle\.digest\("SHA-256",await check\.arrayBuffer\(\)\)/);
 assert.match(app,/actual!==expected\.photoSha256/);
 assert.match(app,/renderRecipeDetail\(panel,updated,verified\)/);
 assert.match(readFileSync(new URL("./index.html",import.meta.url),"utf8"),/app\.js\?v=0\.44\.94/);
});

test("recipe photo can be rotated before saving, including an existing private image",async()=>{
 const {rotationFrameDimensions}=await import("./recipe-editor-ui.mjs");
 assert.deepEqual(rotationFrameDimensions(1000,600,0),{turn:0,width:1000,height:600});
 assert.deepEqual(rotationFrameDimensions(1000,600,90),{turn:90,width:600,height:1000});
 assert.deepEqual(rotationFrameDimensions(1000,600,-90),{turn:270,width:600,height:1000});
 assert.deepEqual(rotationFrameDimensions(1000,600,180),{turn:180,width:1000,height:600});
 assert.throws(()=>rotationFrameDimensions(1000,600,45),/ROTACION_NO_ADMITIDA/);
 const code=readFileSync(new URL("./recipe-editor-ui.mjs",import.meta.url),"utf8");
 assert.match(code,/data-editor-photo-rotate="-90"/);
 assert.match(code,/data-editor-photo-rotate="90"/);
 assert.match(code,/context\.rotate\(frame\.turn\*Math\.PI\/180\)/);
 assert.match(code,/await prepareRecipePhoto\(chosenPhoto\|\|originalForRotation,rotation\)/);
 assert.match(code,/url\.origin!==location\.origin/);
 assert.match(code,/fetch\(url\.href,\{credentials:"same-origin",cache:"no-store"\}\)/);
});
