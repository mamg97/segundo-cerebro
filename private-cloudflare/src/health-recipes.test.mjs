import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./index.js", import.meta.url), "utf8");

test("Health recipe schema reads private photo metadata without exposing Drive ids", () => {
  assert.match(source, /Recetas!A1:O1000/);
  assert.match(source, /foto_drive_file_id/);
  assert.match(source, /foto_mime_type/);
  assert.match(source, /foto_updated_at/);
  assert.match(source, /const \{ photoFileId, photoMimeType, photoUpdatedAt, \.\.\.publicRecipe \} = recipe/);
  assert.match(source, /photoUrl:\s*photoFileId/);
});

test("recipe photos are proxied from private Drive through same-origin Health endpoint", () => {
  assert.match(source, /recipeImageMatch = url\.pathname\.match/);
  assert.ok(source.includes("/api/health/recipes/"));
  assert.match(source, /www\.googleapis\.com\/drive\/v3\/files\//);
  assert.match(source, /\?alt=media/);
  assert.match(source, /Cache-Control": "private, max-age=300"/);
  assert.match(source, /INVALID_RECIPE_PHOTO_TYPE/);
});


test("recipe photo bridge returns actionable Drive failure codes", () => {
  assert.match(source, /RECIPE_PHOTO_DRIVE_AUTH_REQUIRED/);
  assert.match(source, /RECIPE_PHOTO_DRIVE_FORBIDDEN/);
  assert.match(source, /RECIPE_PHOTO_DRIVE_INACCESSIBLE/);
  assert.match(source, /supportsAllDrives=true/);
  assert.match(source, /googleReadFetch/);
});
