// Reference-only join of canonical recipe photos and immutable recipe revisions.
// MenuSemanal keeps its historical recipe_id/macros; when that version has no
// image, we may show a photo from its active, same-named successor.
// Private bytes and Drive identifiers are never returned to the browser.
const trim = value => String(value ?? "").trim();
const comparableName = value => trim(value).normalize("NFC").toLocaleLowerCase("es");
const ownUrl = row => {
  const id = trim(row?.recipe_id);
  const fileId = trim(row?.foto_drive_file_id);
  if (!id || id.length > 160 || !fileId) return null;
  const version = trim(row?.foto_updated_at || row?.updated_at);
  return "/api/health/recipes/" + encodeURIComponent(id) +
    "/image?v=" + encodeURIComponent(version);
};
export function menuRecipePhotoUrls(recipeRows) {
  const rows = Array.isArray(recipeRows) ? recipeRows : [];
  const byId = new Map(), urls = new Map();
  for (const row of rows) {
    const id = trim(row?.recipe_id);
    if (!id || id.length > 160) continue;
    byId.set(id, row);
    const url = ownUrl(row);
    // Same-ID replacement with no photo must not revive an old file.
    if (url) urls.set(id, url); else urls.delete(id);
  }
  // Resolve only explicit '-rev-' ID ancestry created by recipe-editor.js.
  // Do not match by free-text item names; unrelated dishes must not inherit photos.
  const successors = [...byId.values()].filter(row =>
    comparableName(row?.estado_receta) === "activa" && ownUrl(row));
  successors.sort((a, b) =>
    trim(b?.updated_at).localeCompare(trim(a?.updated_at)));
  const resolvedAncestors = new Set();
  for (const successor of successors) {
    const id = trim(successor.recipe_id), photo = ownUrl(successor);
    const name = comparableName(successor.nombre);
    if (!name || !photo) continue;
    let current = id;
    // Each immutable version ID is '<prior recipe ID>-rev-<12-char random>'.
    while (current.includes("-rev-")) {
      const idx = current.lastIndexOf("-rev-");
      const suffix = current.slice(idx + 5);
      if (!/^[0-9a-f]{8}-[0-9a-f]{3}$/i.test(suffix)) break;
      current = current.slice(0, idx);
      const ancestor = byId.get(current);
      if (!ancestor || comparableName(ancestor.nombre) !== name) break;
      // Menu entries retain their historical IDs/macros, but their thumbnail
      // follows the newest ACTIVE revision, even when that ancestor has a photo.
      // Never let an older active fork overwrite a newer successor.
      if (!resolvedAncestors.has(current)) {
        urls.set(current, photo);
        resolvedAncestors.add(current);
      }
    }
  }
  return urls;
}
