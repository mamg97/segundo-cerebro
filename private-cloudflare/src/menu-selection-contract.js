// Schema-independent, pure selection contract. No private nutrition data.
const MAIN_MEALS = new Set(["Desayuno", "Comida", "Cena"]);
const OPTIONAL_RECIPE_MEALS = new Set(["Media mañana", "Merienda"]);
const COMPANIONS = new Set(["yogur", "fruta", "batido"]);

const text = (value) => String(value || "").trim();
const status = (value) => text(value).toLowerCase();
const role = (value) => status(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function validateMenuMealSelection(moment, components = []) {
  const issues = [];
  const supported = MAIN_MEALS.has(moment) || OPTIONAL_RECIPE_MEALS.has(moment);
  if (!supported) issues.push("unsupported-moment");
  let recipes = 0;
  let companions = 0;
  let yogurts = 0;
  for (const item of components) {
    const kind = role(item?.itemRole || item?.tipo_item);
    const companionType = role(item?.companionType || item?.tipo_acompanante);
    const recipeId = text(item?.recipeId || item?.recipe_id);
    const foodId = text(item?.foodId || item?.food_id);
    if (kind === "receta") {
      recipes += 1;
      if (!recipeId) issues.push("recipe-id-required");
      if (companionType) issues.push("recipe-cannot-have-companion-type");
    } else if (kind === "acompanante") {
      companions += 1;
      if (!COMPANIONS.has(companionType)) issues.push("invalid-companion-type");
      if (!foodId && !(companionType === "batido" && recipeId)) {
        issues.push("companion-reference-required");
      }
      if (companionType === "yogur") yogurts += 1;
    } else {
      issues.push("item-role-required");
    }
  }
  if (recipes > 1) issues.push("multiple-main-recipes");
  if (MAIN_MEALS.has(moment) && recipes === 0) issues.push("main-recipe-required");
  if ((moment === "Comida" || moment === "Cena") && yogurts > 1) {
    issues.push("multiple-yogurt-desserts");
  }
  return {
    valid: issues.length === 0,
    issues: [...new Set(issues)],
    recipeCount: recipes,
    companionCount: companions
  };
}

// Existing menu rows are read-only legacy until explicitly migrated; never
// rewrite historical intake or pretend that unlinked legacy dishes have recipes.
export function annotateWeeklyMenuStructure(rows = []) {
  const groups = new Map();
  for (const row of rows) {
    const key = [row?.date, row?.moment].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const diagnostics = new Map();
  for (const [key, items] of groups) {
    const typed = items.some((x) => text(x?.itemRole || x?.tipo_item));
    if (!typed) {
      diagnostics.set(key, { status: "legacy", issues: [], recipeCount: null, companionCount: null });
      continue;
    }
    const result = validateMenuMealSelection(items[0]?.moment, items);
    diagnostics.set(key, { status: result.valid ? "valid" : "invalid", ...result });
  }
  return rows.map((row) => {
    const group = diagnostics.get([row?.date, row?.moment].join("|"));
    return { ...row, mealStructureStatus: group?.status || "legacy", mealStructureIssues: group?.issues || [] };
  });
}
