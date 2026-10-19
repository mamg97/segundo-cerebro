// Read-only catalogue projection using canonical Health recipe ingredients.
export function recipeIngredientKey(name) {
  return String(name ?? "").trim().replace(/\s+/g, " ")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}

export function recipeIngredientChoices(recipes) {
  const choices = new Map();
  for (const recipe of Array.isArray(recipes) ? recipes : []) {
    const seen = new Set();
    for (const ingredient of Array.isArray(recipe?.ingredients) ? recipe.ingredients : []) {
      const label = String(ingredient?.name ?? "").trim().replace(/\s+/g, " ");
      const key = recipeIngredientKey(label);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const entry = choices.get(key);
      if (entry) entry.count += 1;
      else choices.set(key, {key, label, count:1});
    }
  }
  return [...choices.values()].sort((a,b) =>
    a.label.localeCompare(b.label,"es",{sensitivity:"base"}) || a.key.localeCompare(b.key));
}

export function recipeCatalogItems(recipes, selectedIngredient = "", selectedCategory = "", archiveView = false) {
  const key = recipeIngredientKey(selectedIngredient);
  return (Array.isArray(recipes) ? recipes : [])
    .filter(recipe => archiveView
      ? ["eliminada", "sustituida", "archivada"].includes(String(recipe?.status || "").toLowerCase())
      : !["eliminada", "sustituida", "archivada"].includes(String(recipe?.status || "").toLowerCase()))
    .filter(recipe => !selectedCategory || recipe?.category === selectedCategory)
    .filter(recipe => !key || (Array.isArray(recipe?.ingredients) &&
      recipe.ingredients.some(ingredient => recipeIngredientKey(ingredient?.name) === key)))
    .sort((a,b) => Number(Boolean(b?.photoUrl)) - Number(Boolean(a?.photoUrl)));
}
