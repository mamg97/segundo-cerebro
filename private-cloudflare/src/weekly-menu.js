import { annotateWeeklyMenuStructure } from "./menu-selection-contract.js";
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

// A matching consumption in Registro must be the same recipe/product at the
// same eating occasion, not merely somewhere on the same date. Different meals
// can legitimately consume the same recipe. Do not match on mutable display name.
export function weeklyMenuConsumptionMatchKey(item) {
  const id = normalize(item?.recipeId || item?.foodId || item?.itemId || item?.productId);
  if (!id) return null;
  const moment = canonicalWeeklyMenuMoment({
    moment: item?.moment,
    name: item?.name || item?.itemName,
    note: item?.note
  });
  return [normalize(item?.date), normalize(moment), id].join("|");
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


/**
 * Presentation-only label for a pantry-backed yogurt. Product identity and short
 * name live in the private Pantry catalogue, while portion quantity and meal
 * position remain authoritative in MenuSemanal. Never modify nutrition or status.
 */
export function companionMenuDisplayName(item, product) {
  const canonical = String(product?.menuDisplayName || "").trim();
  if (!canonical || normalize(item?.companionType) !== "yogur") {
    return String(item?.name || "");
  }
  const quantity = finite(item?.quantity);
  const unit = normalize(item?.unit);
  const format = normalize(product?.format);
  const portion = format.match(/[×x]\s*(\d+(?:[.,]\d+)?)\s*g/);
  const portionGrams = portion ? Number(portion[1].replace(",", ".")) : null;
  const isVasito = /vasit/.test(format) || /(?:pack|paquete)\s*\d+\s*[×x]\s*\d+\s*g/.test(format);
  const hasUnits = /vasit|^ud(?:\b|\s|$)|^unidad|^envase/.test(unit);
  const grams = /^(g|gr|gramos?)(?:\b|\s|$)/.test(unit);
  let serving = "";
  let count = null;
  if (isVasito && portionGrams > 0 && quantity !== null && quantity > 0) {
    count = hasUnits ? quantity : grams && quantity % portionGrams === 0 ? quantity / portionGrams : null;
  }
  if (Number.isSafeInteger(count) && count > 0) {
    serving = count + " " + (count === 1 ? "vasito" : "vasitos") + " (" + (count * portionGrams) + " g)";
  } else if (grams && quantity > 0) {
    const jar = format.match(/(?:bote|tarro)\s*(?:de\s*)?(\d+)\s*g/);
    const half = jar && Number(jar[1]) === quantity * 2;
    serving = quantity + " g" + (jar ? (half ? " (½ tarro)" : " (tarro grande)") : "");
  } else if (quantity > 0) {
    serving = quantity + (unit ? " " + String(item.unit).trim() : "");
  }
  const dessert = /^postre\s*:/i.test(String(item?.name || "").trim());
  return (dessert ? "Postre: " : "") + canonical + (serving ? " · " + serving : "");
}

export function prepareWeeklyMenuRows(rows, options = {}) {
  const recipeById = options.recipeById instanceof Map ? options.recipeById : new Map();
  const ingredientsByRecipeId = options.ingredientsByRecipeId instanceof Map
    ? options.ingredientsByRecipeId
    : new Map();
  const pantryProductById = options.pantryProductById instanceof Map
    ? options.pantryProductById
    : null;

  return annotateWeeklyMenuStructure(dedupeWeeklyMenuRows(rows).map((item) => {
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
      name: companionMenuDisplayName(item, pantryProduct),
      pantryProductId: pantryProduct?.id || null,
      // Product photos are sourced from the private Pantry catalog, never guessed from menu names.
      productImageUrl: typeof pantryProduct?.imageUrl === "string" && /^https:\/\//i.test(pantryProduct.imageUrl)
        ? pantryProduct.imageUrl
        : null,
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
  }));
}
