// Read-only, authenticated production diagnostic. No names, macro values,
// product identifiers, credentials or personal data are logged.
const origin = process.env.AUDIT_BASE_URL;
const token = process.env.AUDIT_TOKEN;
if (!origin || !token) throw new Error("Missing authorized production audit context");
const date = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit"
}).format(new Date());
const start = new Date(date + "T12:00:00Z");
const dow = (start.getUTCDay() + 6) % 7;
start.setUTCDate(start.getUTCDate() - dow);
const days = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(start);
  d.setUTCDate(start.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
});
function normalize(v) {
  return String(v ?? "").trim().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function signature(row) {
  const who = row.recipeId ? "recipe:" + normalize(row.recipeId) :
    row.foodId ? "food:" + normalize(row.foodId) :
    "label:" + normalize(row.name);
  // Compare the four macros, state and typed recipe/companion roles.
  // The signature stays in memory; never print per-row private values.
  const macro = (value) => value == null || value === ""
    ? "null"
    : Number.isFinite(Number(value)) ? Number(value).toFixed(3) : "invalid";
  return [
    row.date, normalize(row.moment), who,
    normalize(row.status), normalize(row.itemRole), normalize(row.companionType),
    macro(row.kcal), macro(row.protein), macro(row.carbs), macro(row.fat)
  ].join("|");
}
async function fetchApi(route) {
  const url = new URL(route, origin);
  const response = await fetch(url, {
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error("Protected production read returned HTTP " + response.status);
  const data = await response.json();
  if (!data?.ok || !Array.isArray(data.weeklyMenu)) throw new Error("Invalid weekly menu response");
  return data;
}
function report(label, data) {
  const rowCounts = days.map((day) => data.weeklyMenu.filter((row) => row.date === day).length);
  const planCounts = days.map((day) => data.weeklyMenu.filter((row) => row.date === day && row.status === "planificado").length);
  console.log("[NUTRITION_PARITY] " + label + " week=" + days[0] + " total=" + data.weeklyMenu.length +
    " rowsPerDay=" + rowCounts.join(",") + " plannedPerDay=" + planCounts.join(","));
}
const light = await fetchApi("/api/nutrition/menu?date=" + date);
report("LIGHT", light);
try {
  const full = await fetchApi("/api/nutrition?date=" + date + "&refresh=1");
  report("FULL", full);
  const ls = new Map(light.weeklyMenu.map((row) => [signature(row), (true)]));
  const fs = new Map(full.weeklyMenu.map((row) => [signature(row), (true)]));
  const lightOnly = [...ls.keys()].filter((key) => !fs.has(key)).length;
  const fullOnly = [...fs.keys()].filter((key) => !ls.has(key)).length;
  console.log("[NUTRITION_PARITY] compare lightOnly=" + lightOnly + " fullOnly=" + fullOnly);
  if (lightOnly || fullOnly) process.exitCode = 2;
} catch (error) {
  console.log("[NUTRITION_PARITY] FULL_READ_UNAVAILABLE " + String(error?.message || error).slice(0, 90));
  // The lightweight menu is the production home-card source; a failing
  // 12-range secondary health read must not mask its successful inspection.
}
