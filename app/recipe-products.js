import { renderProductDetail } from "./pantry.js?v=0.42.1";

function normalizedName(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
}

export function resolveIngredientProduct(ingredient, products = []) {
  if (ingredient?.productId) return products.find((product) => product.id === ingredient.productId) || null;
  const name = normalizedName(ingredient?.name);
  const matches = name ? products.filter((product) => normalizedName(product.name) === name) : [];
  return matches.length === 1 ? matches[0] : null;
}

let pantryCache = null;
async function readProducts() {
  if (pantryCache && pantryCache.expiresAt > Date.now()) return pantryCache.value;
  const response = await fetch("/api/pantry", { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("No se pudo consultar Despensa");
  const payload = await response.json();
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

export async function openRecipeIngredient(panel, ingredient, recipe, onBack) {
  const context = ingredientContext(ingredient, recipe);
  panel.innerHTML = '<button type="button" class="recipe-back" data-ingredient-back>← Volver a la receta</button><p class="recipe-pending" role="status">Cargando ficha del alimento…</p>';
  panel.querySelector("[data-ingredient-back]").addEventListener("click", onBack);
  const loading = panel.querySelector('[role="status"]');
  let product = null;
  try {
    const payload = await readProducts();
    product = resolveIngredientProduct(ingredient, payload.products);
    if (product) {
      const response = await fetch(`/api/pantry/products/${encodeURIComponent(product.id)}`, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("No se pudo actualizar la ficha");
      const detail = await response.json();
      // Ignore a slow result after the user returned or switched Health tabs.
      if (!loading.isConnected) return;
      renderProductDetail(detail.item, payload, { container: panel, onBack, backLabel: "← Volver a la receta", ingredient: context });
      return;
    }
    if (!loading.isConnected) return;
    renderProductDetail({ name: ingredient.name, notes: ingredient.note }, payload, {
      container: panel, onBack, backLabel: "← Volver a la receta", ingredient: context,
      pendingMessage: ingredient.productId ? "La referencia guardada no existe en el catálogo. Pendiente de revisar." : "Producto exacto pendiente de vincular. No hay una ficha comercial confirmada para este ingrediente."
    });
  } catch {
    if (!loading.isConnected) return;
    panel.innerHTML = '<button type="button" class="recipe-back" data-ingredient-back>← Volver a la receta</button><div class="pantry-source-error"><strong>No se ha podido cargar la ficha</strong><p>Despensa no responde ahora. Los ingredientes de la receta se conservan.</p><button type="button" data-ingredient-retry>Reintentar</button></div>';
    panel.querySelector("[data-ingredient-back]").addEventListener("click", onBack);
    panel.querySelector("[data-ingredient-retry]").addEventListener("click", () => openRecipeIngredient(panel, ingredient, recipe, onBack));
  }
}
