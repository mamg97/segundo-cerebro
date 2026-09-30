const HIDDEN_STATUSES = /^(omitid[oa]|retirad[oa]|cancelad[oa]|cancelled|skipped)$/;

function normalize(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function timestamp(value) {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function recipePending(recipe) {
  const precision = normalize(recipe?.precision);
  return /(^|\b)(pendiente|pending|por confirmar|sin confirmar)(\b|$)/.test(precision);
}

export function weeklyMenuItemIsVisibleServer(item) {
  return !HIDDEN_STATUSES.test(normalize(item?.status));
}

export function weeklyMenuIdentity(item) {
  const identity = item?.recipeId
    ? "recipe:" + normalize(item.recipeId)
    : item?.foodId
      ? "food:" + normalize(item.foodId)
      : "name:" + normalize(item?.name);
  return [
    normalize(item?.date),
    normalize(item?.moment || "otro"),
    identity
  ].join("|");
}

export function dedupeWeeklyMenuRows(rows) {
  const selected = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row, index) => {
    if (!row) return;
    const key = weeklyMenuIdentity(row);
    const current = selected.get(key);
    if (!current) {
      selected.set(key, { row, firstIndex: index, selectedIndex: index });
      return;
    }
    const currentTs = timestamp(current.row?.updatedAt);
    const candidateTs = timestamp(row?.updatedAt);
    if (candidateTs > currentTs || (candidateTs === currentTs && index > current.selectedIndex)) {
      selected.set(key, {
        row,
        firstIndex: current.firstIndex,
        selectedIndex: index
      });
    }
  });
  return [...selected.values()]
    .sort((a, b) => a.firstIndex - b.firstIndex)
    .map((entry) => entry.row)
    .filter(weeklyMenuItemIsVisibleServer);
}

export function prepareWeeklyMenuRows(rows, options = {}) {
  const recipeById = options.recipeById instanceof Map ? options.recipeById : new Map();
  const ingredientsByRecipeId = options.ingredientsByRecipeId instanceof Map
    ? options.ingredientsByRecipeId
    : new Map();

  return dedupeWeeklyMenuRows(rows).map((item) => {
    const recipeId = item?.recipeId ? String(item.recipeId) : "";
    const recipe = recipeId ? recipeById.get(recipeId) || null : null;
    const pendingRecipe = recipePending(recipe);
    const menuQuantity = finite(item?.quantity) ?? 1;
    const isServingUnit = /raci[oó]n/i.test(String(item?.unit || ""));
    const canResolveFromRecipe = Boolean(recipe && isServingUnit && !pendingRecipe);

    const fields = [
      ["kcal", "kcalPerServing"],
      ["protein", "proteinPerServing"],
      ["carbs", "carbsPerServing"],
      ["fat", "fatPerServing"]
    ];
    const hydrated = { ...item };
    const derivedFields = [];

    for (const [menuField, recipeField] of fields) {
      if (finite(hydrated[menuField]) !== null) continue;
      const perServing = finite(recipe?.[recipeField]);
      if (!canResolveFromRecipe || perServing === null) continue;
      hydrated[menuField] = perServing * menuQuantity;
      derivedFields.push(menuField);
    }

    const recipeServings = finite(recipe?.servings);
    const ingredientFactor = recipe && isServingUnit && recipeServings !== null && recipeServings > 0
      ? menuQuantity / recipeServings
      : 1;
    const baseIngredients = recipe && !pendingRecipe
      ? ingredientsByRecipeId.get(recipeId) || []
      : [];

    hydrated.recipe = recipe;
    hydrated.ingredients = baseIngredients.map((ingredient) => ({
      ...ingredient,
      quantityForMeal: finite(ingredient?.quantity) === null ? null : Number(ingredient.quantity) * ingredientFactor,
      gramsForMeal: finite(ingredient?.grams) === null ? null : Number(ingredient.grams) * ingredientFactor,
      kcalForMeal: finite(ingredient?.kcal) === null ? null : Number(ingredient.kcal) * ingredientFactor,
      proteinForMeal: finite(ingredient?.protein) === null ? null : Number(ingredient.protein) * ingredientFactor
    }));

    const missingNutrition = finite(hydrated.kcal) === null || finite(hydrated.protein) === null;
    const noteSignalsPending = missingNutrition && /(pendient|confirmar|sin confirmar|hasta conocer|queda abierto)/.test(normalize(item?.note));
    const pendingNutrition = pendingRecipe || noteSignalsPending;
    hydrated.nutritionStatus = missingNutrition
      ? pendingNutrition
        ? "pending-confirmation"
        : "incomplete"
      : derivedFields.length
        ? "resolved-from-recipe"
        : "explicit";
    hydrated.nutritionPendingReason = pendingNutrition && missingNutrition
      ? String(item?.note || recipe?.note || "").trim() || null
      : null;
    hydrated.nutritionDerivedFields = derivedFields;

    return hydrated;
  });
}
