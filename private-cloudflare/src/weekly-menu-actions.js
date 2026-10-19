// Authenticated private menu mutations: MenuSemanal and Recetas remain the
// only authorities. No D1 copy, cache of personal rows or blind append.
import { canonicalWeeklyMenuMoment, weeklyMenuIdentity } from "./weekly-menu.js";
import { planMenuAddition, planConsumedRegisterCorrection, MenuSlotError } from "./weekly-menu-extended-actions.js";

const MENU_RANGE = "MenuSemanal!A1:R2000";
const RECIPES_RANGE = "Recetas!A1:Q1000";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/;
const FIELDS = ["fecha", "momento", "recipe_id", "nombre", "estado", "updated_at"];
const NUTRI_FIELDS = ["kcal", "proteinas_g", "carbohidratos_g", "grasas_g"];

export class MenuEditError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
function numberOrNull(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function normalize(s) { return String(s || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function table(values) {
  const header = (values?.[0] || []).map(x => String(x || "").trim());
  return (values || []).slice(1).map((cells, i) => ({
    sourceRow: i + 2, cells,
    data: Object.fromEntries(header.map((k, j) => [k, cells[j] ?? ""]))
  })).filter(row => row.cells.some(x => x !== "" && x != null));
}
export function recipeAlternatives(rows) {
  return rows.filter(row => SAFE_ID_RE.test(String(row.data.recipe_id || "")) &&
    String(row.data.nombre || "").trim() &&
    !["eliminada", "sustituida", "archivada"].includes(normalize(row.data.estado_receta))).map(({ data }) => ({
      id: String(data.recipe_id).trim(),
      name: String(data.nombre).trim(),
      servings: numberOrNull(data.raciones),
      kcalPerServing: numberOrNull(data.kcal_racion),
      proteinPerServing: numberOrNull(data.proteinas_racion_g),
      carbsPerServing: numberOrNull(data.carbohidratos_racion_g),
      fatPerServing: numberOrNull(data.grasas_racion_g),
      precision: String(data.precision || "").trim()
    })).sort((a,b) => a.name.localeCompare(b.name,"es"));
}
export function previewMenuRecipe(item, recipe) {
  // Missing portion is unknown, not one serving. Never fabricate macros.
  const qty = numberOrNull(item.cantidad);
  const unit = normalize(item.unidad);
  const multiplier = /raci[oó]n/i.test(unit)
    ? qty : /compartid[oa]/i.test(unit) && recipe.servings > 0
      ? recipe.servings * qty : null;
  const complete = multiplier !== null && multiplier > 0 &&
    !/(?:pendiente|pending|sin confirmar|por confirmar|no usar para nuevas|solo histor|exclusiv.{0,16}histor)/i.test(recipe.precision || "") &&
    [recipe.kcalPerServing,recipe.proteinPerServing,recipe.carbsPerServing,recipe.fatPerServing]
      .every(value => value !== null && Number.isFinite(value));
  return {
    supported: Boolean(complete),
    kcal: complete ? recipe.kcalPerServing * multiplier : null,
    protein: complete ? recipe.proteinPerServing * multiplier : null,
    carbs: complete ? recipe.carbsPerServing * multiplier : null,
    fat: complete ? recipe.fatPerServing * multiplier : null
  };
}
function asIdentity(data) {
  return weeklyMenuIdentity({
    date: String(data.fecha || "").trim(),
    moment: canonicalWeeklyMenuMoment({ moment: data.momento, name: data.nombre }),
    recipeId: data.recipe_id,
    foodId: data.food_id,
    name: data.nombre
  });
}
function lastRow(rows) {
  return [...rows].sort((a,b) =>
    (Date.parse(a.data.updated_at || "") || 0) - (Date.parse(b.data.updated_at || "") || 0) ||
    a.sourceRow - b.sourceRow).at(-1);
}
export function planMenuSheetEdits(values, payload, recipes, now = new Date().toISOString(), registroValues = null) {
  if (payload?.action === "add") return planMenuAddition(values, payload, recipes, now);
  const headers = (values?.[0] || []).map(x => String(x || "").trim());
  const required = payload.action === "replace" ? [...FIELDS, ...NUTRI_FIELDS, "cantidad", "unidad"] : FIELDS;
  if (!required.every(k => headers.includes(k))) throw new MenuEditError("MENU_SCHEMA_UNSUPPORTED", 409);
  const byRecipe = Boolean(payload.recipeId) && SAFE_ID_RE.test(payload.recipeId);
  const byFood = Boolean(payload.foodId) && SAFE_ID_RE.test(payload.foodId);
  if (!DATE_RE.test(payload.date || "") || byRecipe === byFood ||
      !Number.isSafeInteger(payload.sourceRow) || payload.sourceRow < 2 ||
      payload.sourceRow > 2000 || !["consume", "replace"].includes(payload.action))
    throw new MenuEditError("INVALID_MENU_EDIT");
  const all = table(values);
  const original = all.find(row => row.sourceRow === payload.sourceRow);
  if (!original || String(original.data.fecha || "").trim() !== payload.date ||
      String(original.data.recipe_id || "").trim() !== String(payload.recipeId || "") ||
      String(original.data.food_id || "").trim() !== String(payload.foodId || "") ||
      String(original.data.updated_at || "") !== String(payload.updatedAt || "") ||
      String(original.data.nombre || "").trim() !== String(payload.name || "").trim() ||
      normalize(canonicalWeeklyMenuMoment({moment:original.data.momento,name:original.data.nombre,note:original.data.nota})) !==
        normalize(canonicalWeeklyMenuMoment({moment:payload.moment,name:payload.name})))
    throw new MenuEditError("MENU_EDIT_CONFLICT", 409);
  const oldIdentity = asIdentity(original.data);
  const duplicates = all.filter(row => asIdentity(row.data) === oldIdentity);
  if (lastRow(duplicates)?.sourceRow !== original.sourceRow) throw new MenuEditError("MENU_EDIT_CONFLICT",409);
  const currentStatus = normalize(original.data.estado);
  const correctingConsumption = currentStatus === "consumido" && payload.action === "replace";
  if (!["planificado","pendiente"].includes(currentStatus) && !correctingConsumption)
    throw new MenuEditError("MENU_EDIT_NOT_PLANNED", 409);
  if (correctingConsumption && !registroValues)
    throw new MenuEditError("CONSUMED_REGISTER_REQUIRED", 409);
  // A planned food or companion is a canonical menu row too. Do not confuse
  // quantities in grams with the number of servings in the new recipe.
  const originalIsFood = Boolean(original.data.food_id) && !original.data.recipe_id;
  const originalIsRecipe = Boolean(original.data.recipe_id) && !original.data.food_id;
  if (!originalIsFood && !originalIsRecipe ||
      (original.data.tipo_item && !["receta","acompanante"].includes(normalize(original.data.tipo_item))))
    throw new MenuEditError("MENU_EDIT_NOT_SUPPORTED_ITEM",409);
  const updates = [];
  function put(row, column, value) {
    const idx = headers.indexOf(column);
    if (idx < 0) throw new MenuEditError("MENU_SCHEMA_UNSUPPORTED",409);
    let x = idx + 1, letters = "";
    while (x) { x--; letters = String.fromCharCode(65 + x % 26) + letters; x = Math.floor(x / 26); }
    updates.push({range:`MenuSemanal!${letters}${row.sourceRow}`,majorDimension:"ROWS",values:[[value]]});
  }
  if (payload.action === "consume") {
    put(original,"estado","consumido");
    put(original,"updated_at",now);
  } else {
    const changePortion = payload.newServings !== undefined && payload.newServings !== null;
    const requestedPortion = changePortion ? numberOrNull(payload.newServings) : null;
    if (changePortion && (requestedPortion === null || requestedPortion <= 0 || requestedPortion > 20))
      throw new MenuEditError("RECIPE_SERVINGS_REQUIRED",409);
    if (!SAFE_ID_RE.test(payload.newRecipeId || "") ||
        (originalIsRecipe && payload.newRecipeId === payload.recipeId && !changePortion))
      throw new MenuEditError("INVALID_RECIPE_SELECTION");
    const candidate = recipes.find(x => x.id === payload.newRecipeId);
    if (!candidate) throw new MenuEditError("RECIPE_NOT_FOUND",404);
    // A recipe-based shake may replace a planned Pantry companion without
    // creating a second main. This is an explicit *classification* from the
    // editor, not a guess from the recipe name or the previous food type.
    const newCompanionType = normalize(payload.newCompanionType);
    const recipeAsCompanion = originalIsFood &&
      normalize(original.data.tipo_item) === "acompanante" &&
      newCompanionType === "batido";
    if (newCompanionType && !recipeAsCompanion) {
      throw new MenuEditError("INVALID_COMPANION_REPLACEMENT", 409);
    }
    // Food quantities are not servings: require an explicit new serving count.
    const newServings = originalIsFood ? requestedPortion : changePortion ? requestedPortion : null;
    if (originalIsFood && (newServings === null || newServings <= 0 || newServings > 20))
      throw new MenuEditError("RECIPE_SERVINGS_REQUIRED",409);
    const macros = previewMenuRecipe(
      newServings !== null ? {cantidad:newServings,unidad:"ración"} : original.data, candidate);
    if (!macros.supported) throw new MenuEditError("RECIPE_MACROS_OR_PORTION_PENDING",409);
    const conflict = all.find(row => row.sourceRow !== original.sourceRow &&
      String(row.data.fecha) === payload.date &&
      normalize(canonicalWeeklyMenuMoment({moment:row.data.momento,name:row.data.nombre})) ===
        normalize(canonicalWeeklyMenuMoment({moment:original.data.momento,name:original.data.nombre})) &&
      String(row.data.recipe_id || "") === payload.newRecipeId &&
      !/^(retirad[oa]|omitid[oa]|cancelad[oa])$/.test(normalize(row.data.estado)));
    if (conflict) throw new MenuEditError("RECIPE_ALREADY_IN_MEAL",409);
    // A food-to-recipe conversion creates a primary recipe. The canonical
    // meal contract allows at most one primary recipe per date + moment,
    // even when a pre-existing primary has a *different* recipe_id.
    // Recipe-based companions (e.g. prepared shakes) are not primaries.
    if (originalIsFood && !recipeAsCompanion) {
      const sameMeal = all.filter(row => row.sourceRow !== original.sourceRow &&
        String(row.data.fecha) === payload.date &&
        normalize(canonicalWeeklyMenuMoment({moment:row.data.momento,name:row.data.nombre})) ===
          normalize(canonicalWeeklyMenuMoment({moment:original.data.momento,name:original.data.nombre})) &&
        !/^(retirad[oa]|omitid[oa]|cancelad[oa])$/.test(normalize(row.data.estado)));
      if (sameMeal.some(row => Boolean(row.data.recipe_id) &&
          (!row.data.tipo_item || normalize(row.data.tipo_item) === "receta"))) {
        throw new MenuEditError("PRIMARY_RECIPE_ALREADY_IN_MEAL",409);
      }
    }
    // Retire older versions of the former recipe to prevent a ghost entry
    // from reappearing once its latest row changes identity.
    for (const row of duplicates) {
      if (row.sourceRow === original.sourceRow) continue;
      put(row,"estado","retirado"); put(row,"updated_at",now);
    }
    // A confirmed meal remains confirmed after a correction. Apply the
    // replacement to the canonical MenuSemanal row and, when present, the
    // exact matching Registro entry in the same Sheets batch.
    if (correctingConsumption) {
      const quantity = newServings !== null ? newServings :
        /raci[oó]n/i.test(String(original.data.unidad)) ? numberOrNull(original.data.cantidad) :
        /compartid[oa]/i.test(String(original.data.unidad)) &&
          candidate.servings > 0 ? candidate.servings * numberOrNull(original.data.cantidad) : null;
      if (quantity === null || quantity <= 0)
        throw new MenuEditError("RECIPE_SERVINGS_REQUIRED",409);
      const registerUpdates = planConsumedRegisterCorrection(
        registroValues,payload,original.data,candidate,macros,quantity,now);
      updates.push(...registerUpdates);
      put(original,"nota","Consumo corregido el "+now+". Receta anterior: "+String(original.data.nombre||"").slice(0,180)+
        ". Revisión explícita de la ingesta; cantidades y macros actualizadas.");
    }
    put(original,"recipe_id", candidate.id);
    if (!originalIsFood && newServings !== null) {
      put(original,"cantidad",newServings);
      put(original,"unidad","ración");
    }
    if (originalIsFood) {
      // Convert one source row to one recipe, keeping date/moment and row
      // identity, with no duplicate plan and no accidental pantry reference.
      if (!["food_id","cantidad","unidad","tipo_item"].every(k => headers.includes(k)))
        throw new MenuEditError("MENU_SCHEMA_UNSUPPORTED",409);
      put(original,"food_id","");
      put(original,"cantidad",newServings);
      put(original,"unidad","ración");
      put(original,"tipo_item", recipeAsCompanion ? "acompanante" : "receta");
      if (headers.includes("tipo_acompanante")) {
        put(original,"tipo_acompanante",recipeAsCompanion ? "batido" : "");
      }
      if (recipeAsCompanion && !correctingConsumption && headers.includes("nota")) {
        // Previous Pantry product notes (e.g., about yogurt) must not be
        // carried forward as if they described the replacement drink.
        put(original,"nota","Batido como acompañante planificado; ración y macros de la receta seleccionada. Consumo no confirmado.");
      }
    }
    put(original,"nombre", candidate.name);
    put(original,"kcal",macros.kcal);
    put(original,"proteinas_g",macros.protein);
    put(original,"carbohidratos_g",macros.carbs);
    put(original,"grasas_g",macros.fat);
    put(original,"updated_at",now);
  }
  return { updates, action:payload.action };
}
export async function editWeeklyMenu(request, env, accessToken, fetchImpl = fetch) {
  if (!env.HEALTH_SHEET_ID) throw new MenuEditError("HEALTH_NOT_CONFIGURED",503);
  let payload;
  try { payload = await request.json(); } catch { throw new MenuEditError("INVALID_JSON"); }
  if (!payload || typeof payload !== "object") throw new MenuEditError("INVALID_MENU_EDIT");
  const token = await accessToken(env);
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HEALTH_SHEET_ID)}`;
  const query = new URLSearchParams({ranges:MENU_RANGE,majorDimension:"ROWS",valueRenderOption:"UNFORMATTED_VALUE"});
  if (["replace","add"].includes(payload.action)) query.append("ranges",RECIPES_RANGE);
  if (payload.action === "replace") query.append("ranges","Registro!A1:N6000");
  const read = await fetchImpl(`${base}/values:batchGet?${query}`,{headers:{Authorization:`Bearer ${token}`}});
  if (!read.ok) throw new MenuEditError("MENU_READ_FAILED",502);
  const ranges = (await read.json()).valueRanges || [];
  const recipeList = ["replace","add"].includes(payload.action)
    ? recipeAlternatives(table(ranges[1]?.values || [])) : [];
  let plan;
  try {
    plan = planMenuSheetEdits(ranges[0]?.values || [],payload,recipeList,new Date().toISOString(),
      payload.action === "replace" ? (ranges[2]?.values || []) : null);
  } catch (error) {
    if (error instanceof MenuSlotError)
      throw new MenuEditError(error.code,error.status);
    throw error;
  }
  const written = await fetchImpl(`${base}/values:batchUpdate`,{
    method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
    body:JSON.stringify({valueInputOption:"RAW",data:plan.updates})
  });
  if (!written.ok) throw new MenuEditError("MENU_WRITE_FAILED",502);
  return {ok:true,action:plan.action};
}
export async function listWeeklyMenuRecipes(env, accessToken, fetchImpl = fetch) {
  if (!env.HEALTH_SHEET_ID) throw new MenuEditError("HEALTH_NOT_CONFIGURED",503);
  const token = await accessToken(env);
  const endpoint=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HEALTH_SHEET_ID)}/values/${encodeURIComponent(RECIPES_RANGE)}?valueRenderOption=UNFORMATTED_VALUE`;
  const response=await fetchImpl(endpoint,{headers:{Authorization:`Bearer ${token}`}});
  if(!response.ok) throw new MenuEditError("RECIPES_READ_FAILED",502);
  return {ok:true,recipes:recipeAlternatives(table((await response.json()).values||[]))};
}
