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

export function canonicalWeeklyMenuMoment(item) {
  const raw = String(item?.moment || "Otro").trim() || "Otro";
  const moment = normalize(raw);
  const context = normalize([raw, item?.name, item?.note].filter(Boolean).join(" "));

  if (/^postre\b/.test(moment)) {
    if (/\b(comida|almuerzo|mediodia)\b/.test(context)) return "Comida";
    if (/\b(cena|cierre|noche)\b/.test(context)) return "Cena";
    return "Cena";
  }

  if (/^snack\b/.test(moment)) {
    if (/\b(media manana|manana)\b/.test(context) && !/\b(despues oficina|tarde|merienda)\b/.test(context)) {
      return "Media mañana";
    }
    return "Merienda";
  }

  if (/^(cena\s*·?\s*complemento|complemento\s+cena)$/.test(moment)) return "Cena";
  if (/^cierre\b/.test(moment)) return "Cena";

  return raw;
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
    normalize(canonicalWeeklyMenuMoment(item)),
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
  const pantryProductById = options.pantryProductById instanceof Map
    ? options.pantryProductById
    : null;

  return dedupeWeeklyMenuRows(rows).map((item) => {
    const recipeId = item?.recipeId ? String(item.recipeId) : "";
    const foodId = item?.foodId ? String(item.foodId) : "";
    const recipe = recipeId ? recipeById.get(recipeId) || null : null;
    const pendingRecipe = recipePending(recipe);
    const rawMenuQuantity = finite(item?.quantity);
    const menuQuantity = rawMenuQuantity ?? 1;
    const pantryProduct = foodId && pantryProductById
      ? pantryProductById.get(foodId) || null
      : null;
    const recipeServings = finite(recipe?.servings);
    const hasRecipeServings = recipeServings !== null && recipeServings > 0;
    const unit = String(item?.unit || "");
    const isServingUnit = /raci[oó]n/i.test(unit);
    const isSharedFractionUnit = /compartid[oa]/i.test(unit);
    const nutritionFactor = isServingUnit
      ? menuQuantity
      : isSharedFractionUnit && hasRecipeServings
        ? recipeServings * menuQuantity
        : null;
    const canResolveFromRecipe = Boolean(recipe && nutritionFactor !== null && !pendingRecipe);

    const fields = [
      ["kcal", "kcalPerServing"],
      ["protein", "proteinPerServing"],
      ["carbs", "carbsPerServing"],
      ["fat", "fatPerServing"]
    ];
    const hydrated = {
      ...item,
      moment: canonicalWeeklyMenuMoment(item),
      pantryProductId: pantryProduct?.id || null,
      pantrySyncStatus: !foodId
        ? "not-applicable"
        : !pantryProductById
          ? "unavailable"
          : pantryProduct
            ? "linked"
            : "missing",
      product: pantryProduct
    };
    const derivedFields = [];
    const pantryDerivedFields = [];

    for (const [menuField, recipeField] of fields) {
      if (finite(hydrated[menuField]) !== null) continue;
      const perServing = finite(recipe?.[recipeField]);
      if (!canResolveFromRecipe || perServing === null) continue;
      hydrated[menuField] = perServing * nutritionFactor;
      derivedFields.push(menuField);
    }

    const pantryNutrition = pantryProduct?.nutrition || null;
    const normalizedUnit = normalize(item?.unit);
    const pantryFactor = pantryProduct && rawMenuQuantity !== null && /^(g|gramo|gramos)$/.test(normalizedUnit)
      ? rawMenuQuantity / 100
      : null;
    const pantryFields = [
      ["kcal", "kcal100g"],
      ["protein", "protein100g"],
      ["carbs", "carbs100g"],
      ["fat", "fat100g"]
    ];
    for (const [menuField, pantryField] of pantryFields) {
      if (finite(hydrated[menuField]) !== null) continue;
      const per100g = finite(pantryNutrition?.[pantryField]);
      if (pantryFactor === null || per100g === null) continue;
      hydrated[menuField] = per100g * pantryFactor;
      pantryDerivedFields.push(menuField);
    }

    const ingredientFactor = recipe && isServingUnit && hasRecipeServings
      ? menuQuantity / recipeServings
      : recipe && isSharedFractionUnit
        ? menuQuantity
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
        : pantryDerivedFields.length
          ? "resolved-from-pantry"
          : "explicit";
    hydrated.nutritionPendingReason = pendingNutrition && missingNutrition
      ? String(item?.note || recipe?.note || "").trim() || null
      : null;
    hydrated.nutritionDerivedFields = [...derivedFields, ...pantryDerivedFields];

    return hydrated;
  });
}
