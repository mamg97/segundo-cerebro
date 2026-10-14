// Read-only, bounded recipe resolution from the canonical private Health Sheet.
// Never serialize Drive file identifiers, access tokens or sheet raw rows to the client.
export const NUTRITION_RECIPE_RANGES = Object.freeze([
  "Recetas!A1:O1000",
  "IngredientesReceta!A1:L5000",
  "PasosReceta!A1:J2000"
]);

export function validNutritionRecipeId(raw) {
  return typeof raw === "string" &&
    raw.length > 0 && raw.length <= 160 &&
    raw === raw.trim() && !/[\x00-\x1f\x7f]/.test(raw);
}

function tableRows(values = []) {
  if (!Array.isArray(values) || !Array.isArray(values[0])) return [];
  const headers = values[0].map((value) => String(value ?? "").trim());
  return values.slice(1)
    .filter((row) => Array.isArray(row) && row.some((value) => value !== "" && value !== null && value !== undefined))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])));
}

function numeric(value) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveNutritionRecipeFromRanges(recipeId, valueRanges = []) {
  if (!validNutritionRecipeId(recipeId)) return null;
  const record = tableRows(valueRanges[0]?.values || [])
    .find((row) => String(row.recipe_id || "").trim() === recipeId);
  if (!record) return null;

  const allIngredients = tableRows(valueRanges[1]?.values || []);
  const allSteps = tableRows(valueRanges[2]?.values || []);
  const version = String(record.foto_updated_at || record.updated_at || "").trim();
  const hasPhoto = Boolean(String(record.foto_drive_file_id || "").trim());

  return {
    id: recipeId,
    name: String(record.nombre || "").trim(),
    servings: numeric(record.raciones),
    kcalTotal: numeric(record.kcal_total),
    kcalPerServing: numeric(record.kcal_racion),
    proteinPerServing: numeric(record.proteinas_racion_g),
    carbsPerServing: numeric(record.carbohidratos_racion_g),
    fatPerServing: numeric(record.grasas_racion_g),
    precision: record.precision || null,
    source: record.fuente || null,
    note: record.nota || null,
    updatedAt: record.updated_at || null,
    photoUrl: hasPhoto
      ? `/api/health/recipes/${encodeURIComponent(recipeId)}/image?v=${encodeURIComponent(version)}`
      : null,
    ingredients: allIngredients
      .filter((row) => String(row.recipe_id || "").trim() === recipeId && String(row.ingrediente || "").trim())
      .map((row) => ({
        recipeId,
        productId: String(row.producto_id || "").trim() || null,
        name: String(row.ingrediente || "").trim(),
        quantity: numeric(row.cantidad),
        unit: row.unidad || null,
        grams: numeric(row.gramos_estimados),
        kcal: numeric(row.kcal_estimadas),
        protein: numeric(row.proteinas_estimadas_g),
        source: row.fuente || null,
        precision: row.precision || null,
        note: row.nota || null,
        updatedAt: row.updated_at || null
      })),
    steps: allSteps
      .filter((row) => String(row.recipe_id || "").trim() === recipeId && String(row.instruccion || "").trim())
      .map((row) => ({
        recipeId,
        order: numeric(row.orden),
        instruction: String(row.instruccion || "").trim(),
        timeMinutes: numeric(row.tiempo_min),
        temperature: row.temperatura || null,
        utensil: row.utensilio || null,
        source: row.fuente || null,
        precision: row.precision || null,
        note: row.nota || null,
        updatedAt: row.updated_at || null
      }))
      .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999))
  };
}
