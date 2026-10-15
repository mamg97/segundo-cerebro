import { renderProductDetail } from "./pantry.js?v=0.42.1";

const REQUEST_TIMEOUT_MS = 9000;

function normalizedName(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
}

export function resolveIngredientProduct(ingredient, products = []) {
  if (ingredient?.productId) return products.find((product) => product.id === ingredient.productId) || null;
  const name = normalizedName(ingredient?.name);
  const matches = name ? products.filter((product) => normalizedName(product.name) === name) : [];
  return matches.length === 1 ? matches[0] : null;
}

export function unresolvedIngredientProduct(ingredient) {
  // Do not invent a nutrition label or bind an unrelated packaged product.
  return { name: String(ingredient?.name || "Ingrediente"), notes: ingredient?.note || "", nutrition: {} };
}

async function readJson(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(path, { credentials: "same-origin", cache: "no-store",
      headers: { Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw new Error("PANTRY_UNAVAILABLE");
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

let pantryCache = null;
async function readProducts() {
  if (pantryCache && pantryCache.expiresAt > Date.now()) return pantryCache.value;
  const payload = await readJson("/api/pantry");
  pantryCache = { value: payload, expiresAt: Date.now() + 30_000 };
  return payload;
}

function ingredientContext(ingredient, recipe) {
  const quantity = ingredient.quantity ?? ingredient.grams;
  const unit = ingredient.quantity != null ? ingredient.unit : "g";
  return {
    name: ingredient.name, recipeName: recipe.name,
    amount: quantity == null ? "Cantidad pendiente" : `${quantity} ${unit || ""}`.trim(),
    kcal: ingredient.kcal, protein: ingredient.protein,
    source: ingredient.source, precision: ingredient.precision, note: ingredient.note
  };
}

function renderAvailableIngredient(panel, product, payload, context, onBack, pendingMessage = "") {
  renderProductDetail(product, payload, {
    container: panel, onBack, backLabel: "← Volver a la receta", ingredient: context,
    ...(pendingMessage ? { pendingMessage } : {})
  });
  panel.dataset.ingredientPantryState = pendingMessage ? "partial" : "ready";
}

function renderUnavailableIngredient(panel, ingredient, context, onBack, retry) {
  // Context remains usable even when Pantry is down; unknown per-100g values
  // stay pending, and the browser audit can distinguish this from a complete card.
  renderAvailableIngredient(panel, unresolvedIngredientProduct(ingredient),
    { summary: { currency: "EUR" } }, context, onBack,
    "Despensa no está disponible. Se muestran solo los datos confirmados de la receta; precio y macros por 100 g pendientes.");
  panel.dataset.ingredientPantryState = "fallback";
  const retryButton = document.createElement("button");
  retryButton.type = "button";
  retryButton.className = "recipe-ingredient-retry";
  retryButton.dataset.ingredientRetry = "";
  retryButton.textContent = "Reintentar Despensa";
  retryButton.addEventListener("click", retry);
  panel.querySelector(".recipe-ingredient-context")?.append(retryButton);
}

export async function openRecipeIngredient(panel, ingredient, recipe, onBack) {
  const context = ingredientContext(ingredient, recipe);
  panel.innerHTML = '<button type="button" class="recipe-back" data-ingredient-back>← Volver a la receta</button><p class="recipe-pending" role="status">Cargando ficha del alimento…</p>';
  panel.dataset.ingredientPantryState = "loading";
  panel.querySelector("[data-ingredient-back]").addEventListener("click", onBack);
  const loading = panel.querySelector('[role="status"]');
  const retry = () => openRecipeIngredient(panel, ingredient, recipe, onBack);
  try {
    const payload = await readProducts();
    const product = resolveIngredientProduct(ingredient, Array.isArray(payload.products) ? payload.products : []);
    if (product) {
      try {
        const detail = await readJson(`/api/pantry/products/${encodeURIComponent(product.id)}`);
        if (!loading.isConnected) return;
        renderAvailableIngredient(panel, detail.item || product, payload, context, onBack);
      } catch {
        if (!loading.isConnected) return;
        renderAvailableIngredient(panel, product, payload, context, onBack,
          "Ficha comercial detallada temporalmente no disponible. Información básica de Despensa.");
      }
      return;
    }
    if (!loading.isConnected) return;
    renderAvailableIngredient(panel, unresolvedIngredientProduct(ingredient), payload, context, onBack,
      ingredient.productId ? "Referencia de producto pendiente de revisar." :
        "Producto exacto pendiente de vincular. No se ha inferido ninguna referencia comercial.");
  } catch {
    if (!loading.isConnected) return;
    renderUnavailableIngredient(panel, ingredient, context, onBack, retry);
  }
}
