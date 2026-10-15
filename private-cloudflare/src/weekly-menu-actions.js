// Authenticated private menu mutations: MenuSemanal and Recetas remain the
// only authorities. No D1 copy, cache of personal rows or blind append.
import { canonicalWeeklyMenuMoment, weeklyMenuIdentity } from "./weekly-menu.js";

const MENU_RANGE = "MenuSemanal!A1:R2000";
const RECIPES_RANGE = "Recetas!A1:O1000";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/;
const FIELDS = ["fecha", "momento", "recipe_id", "nombre", "estado", "updated_at", "tipo_item"];
const NUTRI_FIELDS = ["kcal", "proteinas_g", "carbohidratos_g", "grasas_g"];
const RECIPE_FIELDS = ["kcal_racion", "proteinas_racion_g", "carbohidratos_racion_g", "grasas_racion_g"];

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
    String(row.data.nombre || "").trim()).map(({ data }) => ({
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
  const qty = numberOrNull(item.cantidad) ?? 1;
  const unit = normalize(item.unidad);
  const multiplier = /raci[oó]n/i.test(unit)
    ? qty : /compartid[oa]/i.test(unit) && recipe.servings > 0
      ? recipe.servings * qty : null;
  const complete = multiplier !== null && multiplier > 0 &&
    !/(?:pendiente|pending|sin confirmar|por confirmar)/i.test(recipe.precision || "") &&
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
export function planMenuSheetEdits(values, payload, recipes, now = new Date().toISOString()) {
  const headers = (values?.[0] || []).map(x => String(x || "").trim());
  const required = payload.action === "replace" ? [...FIELDS, ...NUTRI_FIELDS, "cantidad", "unidad"] : FIELDS;
  if (!required.every(k => headers.includes(k))) throw new MenuEditError("MENU_SCHEMA_UNSUPPORTED", 409);
  if (!DATE_RE.test(payload.date || "") || !SAFE_ID_RE.test(payload.recipeId || "") ||
      !Number.isSafeInteger(payload.sourceRow) || payload.sourceRow < 2 ||
      payload.sourceRow > 2000 || !["consume", "replace"].includes(payload.action))
    throw new MenuEditError("INVALID_MENU_EDIT");
  const all = table(values);
  const original = all.find(row => row.sourceRow === payload.sourceRow);
  if (!original || String(original.data.fecha || "").trim() !== payload.date ||
      String(original.data.recipe_id || "").trim() !== payload.recipeId ||
      String(original.data.updated_at || "") !== String(payload.updatedAt || "") ||
      String(original.data.nombre || "").trim() !== String(payload.name || "").trim() ||
      String(original.data.momento || "").trim() !== String(payload.moment || "").trim())
    throw new MenuEditError("MENU_EDIT_CONFLICT", 409);
  const oldIdentity = asIdentity(original.data);
  const duplicates = all.filter(row => asIdentity(row.data) === oldIdentity);
  if (lastRow(duplicates)?.sourceRow !== original.sourceRow) throw new MenuEditError("MENU_EDIT_CONFLICT",409);
  const currentStatus = normalize(original.data.estado);
  if (currentStatus !== "planificado" && currentStatus !== "pendiente")
    throw new MenuEditError("MENU_EDIT_NOT_PLANNED", 409);
  if (original.data.food_id || !original.data.recipe_id ||
    (original.data.tipo_item && normalize(original.data.tipo_item) !== "receta"))
    throw new MenuEditError("MENU_EDIT_NOT_RECIPE",409);
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
    if (!SAFE_ID_RE.test(payload.newRecipeId || "") || payload.newRecipeId === payload.recipeId)
      throw new MenuEditError("INVALID_RECIPE_SELECTION");
    const candidate = recipes.find(x => x.id === payload.newRecipeId);
    if (!candidate) throw new MenuEditError("RECIPE_NOT_FOUND",404);
    const macros = previewMenuRecipe(original.data,candidate);
    if (!macros.supported) throw new MenuEditError("RECIPE_MACROS_OR_PORTION_PENDING",409);
    const conflict = all.find(row => row.sourceRow !== original.sourceRow &&
      String(row.data.fecha) === payload.date &&
      normalize(canonicalWeeklyMenuMoment({moment:row.data.momento,name:row.data.nombre})) ===
        normalize(canonicalWeeklyMenuMoment({moment:original.data.momento,name:original.data.nombre})) &&
      String(row.data.recipe_id || "") === payload.newRecipeId &&
      !/^(retirad[oa]|omitid[oa]|cancelad[oa])$/.test(normalize(row.data.estado)));
    if (conflict) throw new MenuEditError("RECIPE_ALREADY_IN_MEAL",409);
    // Retire older versions of the former recipe to prevent a ghost entry
    // from reappearing once its latest row changes identity.
    for (const row of duplicates) {
      if (row.sourceRow === original.sourceRow) continue;
      put(row,"estado","retirado"); put(row,"updated_at",now);
    }
    put(original,"recipe_id", candidate.id);
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
  if (payload.action === "replace") query.append("ranges",RECIPES_RANGE);
  const read = await fetchImpl(`${base}/values:batchGet?${query}`,{headers:{Authorization:`Bearer ${token}`}});
  if (!read.ok) throw new MenuEditError("MENU_READ_FAILED",502);
  const ranges = (await read.json()).valueRanges || [];
  const recipeList = payload.action === "replace" ? recipeAlternatives(table(ranges[1]?.values || [])) : [];
  const plan = planMenuSheetEdits(ranges[0]?.values || [],payload,recipeList);
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
