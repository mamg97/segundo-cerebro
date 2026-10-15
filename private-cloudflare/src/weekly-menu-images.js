// Reference-only join of the canonical Recetas photo field for Home.
// Private bytes and Drive identifiers are never returned to the browser.
export function menuRecipePhotoUrls(recipeRows) {
  const urls = new Map();
  for (const row of Array.isArray(recipeRows) ? recipeRows : []) {
    const id = String(row?.recipe_id || "").trim();
    if (!id || id.length > 160) continue;
    const fileId = String(row?.foto_drive_file_id || "").trim();
    // A later row with no image must not revive a superseded photo.
    if (!fileId) { urls.delete(id); continue; }
    const version = String(row?.foto_updated_at || row?.updated_at || "").trim();
    urls.set(id, "/api/health/recipes/" + encodeURIComponent(id) +
      "/image?v=" + encodeURIComponent(version));
  }
  return urls;
}
