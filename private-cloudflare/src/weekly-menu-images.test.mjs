import test from "node:test";
import assert from "node:assert/strict";
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
