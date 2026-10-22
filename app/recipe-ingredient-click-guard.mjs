// Keep the ingredient drill-down scoped to real links inside the visible
// recipe detail. The recipes panel itself also has data-recipe-ingredient
// (catalogue filter), so matching that attribute alone catches every click,
// including iOS "Use Photo" after returning from the native camera.
export function resolveRecipeIngredientButton(target, panel) {
  const button = target?.closest?.("button.recipe-ingredient-link[data-recipe-ingredient]");
  const detail = panel?.querySelector?.(".recipe-detail-card");
  return button && detail?.contains?.(button) ? button : null;
}
