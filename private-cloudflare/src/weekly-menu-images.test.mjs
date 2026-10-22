import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import { menuRecipePhotoUrls } from "./weekly-menu-images.js";

test("thumbnail reference is versioned, same-origin and never leaks Drive IDs", () => {
  const map = menuRecipePhotoUrls([
    {recipe_id:"rec-1",foto_drive_file_id:"PRIVATE_DO_NOT_RETURN",foto_updated_at:"2026-10-15T10:00:00Z"},
    {recipe_id:"rec-2",foto_drive_file_id:""}
  ]);
  assert.equal(map.get("rec-1"),"/api/health/recipes/rec-1/image?v=2026-10-15T10%3A00%3A00Z");
  assert.equal(map.has("rec-2"),false);
  assert.ok(!JSON.stringify([...map]).includes("PRIVATE_DO_NOT_RETURN"));
});

test("replacement and removal update only one canonical photo reference", () => {
  const map = menuRecipePhotoUrls([
    {recipe_id:"a",foto_drive_file_id:"old",foto_updated_at:"v1"},
    {recipe_id:"a",foto_drive_file_id:"new",foto_updated_at:"v2"},
    {recipe_id:"b",foto_drive_file_id:"old",foto_updated_at:"v1"},
    {recipe_id:"b",foto_drive_file_id:"",foto_updated_at:"v3"}
  ]);
  assert.equal(map.get("a"),"/api/health/recipes/a/image?v=v2");
  assert.equal(map.has("b"),false);
});

test("IDs and version params are encoded, malformed rows are ignored", () => {
  const map=menuRecipePhotoUrls([{recipe_id:"rec/one",foto_drive_file_id:"private",foto_updated_at:"a&b"}]);
  assert.equal(map.get("rec/one"),"/api/health/recipes/rec%2Fone/image?v=a%26b");
  assert.equal(menuRecipePhotoUrls(null).size,0);
  assert.equal(menuRecipePhotoUrls([{recipe_id:"",foto_drive_file_id:"private"}]).size,0);
});

test("an existing menu recipe without photo uses its newest active version as thumbnail only", () => {
 const map = menuRecipePhotoUrls([
  {recipe_id:"rec-cafe-v1",nombre:"Café solo doble",estado_receta:"sustituida",foto_drive_file_id:""},
  {recipe_id:"rec-cafe-v1-rev-53809d18-2a7",nombre:"Café solo doble",estado_receta:"activa",
   updated_at:"2026-10-22T16:26:15.301Z",foto_drive_file_id:"private_version",foto_updated_at:"2026-10-22T16:26:15.301Z"}
 ]);
 assert.equal(map.get("rec-cafe-v1"),map.get("rec-cafe-v1-rev-53809d18-2a7"));
 assert.match(map.get("rec-cafe-v1"),/rec-cafe-v1-rev-53809d18-2a7\/image\?v=/);
 assert.ok(!JSON.stringify([...map]).includes("private_version"));
});
test("historical photo is preferred; unrelated recipes never gain another dish's picture",()=>{
 const rows=[
  {recipe_id:"dish",nombre:"Dish",foto_drive_file_id:"historical",foto_updated_at:"old"},
  {recipe_id:"dish-rev-aabbccdd-111",nombre:"Dish",estado_receta:"activa",foto_drive_file_id:"new",foto_updated_at:"new"},
  {recipe_id:"other",nombre:"Another recipe",foto_drive_file_id:""},
  {recipe_id:"other-rev-aabbccdd-111",nombre:"Different",estado_receta:"activa",foto_drive_file_id:"new",foto_updated_at:"new"},
  {recipe_id:"unrelated",nombre:"Dish",foto_drive_file_id:""},
  {recipe_id:"recipe-v1",nombre:"Recipe",foto_drive_file_id:""},
  {recipe_id:"recipe-v10-rev-aabbccdd-111",nombre:"Recipe",estado_receta:"activa",foto_drive_file_id:"wrong"}
 ];
 const map=menuRecipePhotoUrls(rows);
 assert.match(map.get("dish"),/\/dish\/image\?v=old$/);
 assert.equal(map.has("other"),false);
 assert.equal(map.has("unrelated"),false);
 assert.equal(map.has("recipe-v1"),false);
});
test("latest active revision supplies photo; archived versions are not inherited",()=>{
 const rows=[
  {recipe_id:"a",nombre:"A",foto_drive_file_id:""},
  {recipe_id:"a-rev-11111111-aaa",nombre:"A",estado_receta:"sustituida",foto_drive_file_id:"old"},
  {recipe_id:"a-rev-11111111-aaa-rev-22222222-bbb",nombre:"A",estado_receta:"activa",foto_drive_file_id:"new",foto_updated_at:"2026-10-22"},
  {recipe_id:"b",nombre:"B",foto_drive_file_id:""},
  {recipe_id:"b-rev-11111111-aaa",nombre:"B",estado_receta:"archivada",foto_drive_file_id:"old"}
 ];
 const map=menuRecipePhotoUrls(rows);
 assert.match(map.get("a"),/a-rev-11111111-aaa-rev-22222222-bbb/);
 assert.match(map.get("a-rev-11111111-aaa"),/a-rev-11111111-aaa\/image\?v=/); // archived version keeps its own image
 assert.equal(map.has("b"),false);
});
test("menu UI uses canonical photoUrl and does not mutate historical nutrition",()=>{
 const appSource=readFileSync(new URL("../../app/app.js",import.meta.url),"utf8");
 const serverSource=readFileSync(new URL("./index.js",import.meta.url),"utf8");
 assert.match(serverSource,/photoUrl: item.recipeId \? photoUrls.get\(String\(item.recipeId\).trim\(\)\) \|\| null : null/);
 assert.match(appSource,/const photoUrl = String\(item.photoUrl \|\| ""\)/);
 assert.doesNotMatch(readFileSync(new URL("./weekly-menu-images.js",import.meta.url),"utf8"),/MenuSemanal!|Registro!|UPDATE |INSERT /);
});
