import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { progressRingMarkup } from "./progress-ring.js";

function getArc(markup, className) {
  const escaped = className.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
  const match = markup.match(new RegExp('<path class="' + escaped + '[^"]*"[^>]*data-progress="([^"]+)"[^>]*d="([^"]+)"'));
  return match ? { progress: Number(match[1]), d: match[2] } : null;
}

function getFullCircle(markup, className) {
  const escaped = className.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
  return new RegExp('<circle class="' + escaped + '[^"]*progress-ring-full"').test(markup);
}

for (const pct of [16, 26, 37, 60]) {
  const markup = progressRingMarkup(pct, { tone: "mint", label: "test" });
  const arc = getArc(markup, "progress-ring-stroke progress-ring-main");
  assert.ok(arc, pct + "% must render as a partial SVG path, not a full circle");
  assert.equal(arc.progress, pct);
  assert.match(markup, new RegExp('aria-valuenow="' + pct + '"'));
  assert.match(markup, new RegExp('>' + pct + '%<'));
  assert.equal(getFullCircle(markup, "progress-ring-stroke progress-ring-main"), false);
}

const p0 = progressRingMarkup(0, { tone: "violet", label: "hoy" });
assert.equal(getArc(p0, "progress-ring-stroke progress-ring-main"), null);
assert.equal(getFullCircle(p0, "progress-ring-stroke progress-ring-main"), false);

const p100 = progressRingMarkup(100, { tone: "mint" });
assert.equal(getFullCircle(p100, "progress-ring-stroke progress-ring-main"), true);

const p132 = progressRingMarkup(132, { tone: "blue", label: "ref" });
assert.equal(getFullCircle(p132, "progress-ring-stroke progress-ring-main"), true);
const lap132 = getArc(p132, "progress-ring-stroke progress-ring-lap progress-ring-lap-2");
assert.ok(lap132);
assert.equal(lap132.progress, 32);

const p178 = progressRingMarkup(178, { tone: "coral", label: "máx" });
assert.equal(getFullCircle(p178, "progress-ring-stroke progress-ring-main"), true);
const lap178 = getArc(p178, "progress-ring-stroke progress-ring-lap progress-ring-lap-2");
assert.ok(lap178);
assert.equal(lap178.progress, 78);

const p220 = progressRingMarkup(220, { tone: "coral", label: "ref" });
assert.equal(getFullCircle(p220, "progress-ring-stroke progress-ring-main"), true);
assert.equal(getFullCircle(p220, "progress-ring-stroke progress-ring-lap progress-ring-lap-2"), true);
const lap220 = getArc(p220, "progress-ring-stroke progress-ring-lap progress-ring-lap-3");
assert.ok(lap220);
assert.equal(lap220.progress, 20);

// Exact geometric spot checks: these endpoints correspond to the requested angle.
assert.match(progressRingMarkup(26, {}), /d="M 50 14 A 36 36 0 0 1 85\.929 52\.26"/);
assert.match(progressRingMarkup(60, {}), /d="M 50 14 A 36 36 0 1 1 28\.84 79\.125"/);

// Global audit: all percentage rings use the same component/version.
const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const adherence = readFileSync(new URL("./adherence.js", import.meta.url), "utf8");
const index = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const pantry = readFileSync(new URL("./pantry.js", import.meta.url), "utf8");
const objects = readFileSync(new URL("./objects.js", import.meta.url), "utf8");
const ringSource = readFileSync(new URL("./progress-ring.js", import.meta.url), "utf8");

assert.match(app, /progress-ring\.js\?v=0\.33\.8/);
assert.match(app, /adherence\.js\?v=0\.33\.8/);
assert.match(adherence, /progress-ring\.js\?v=0\.33\.8/);
assert.match(index, /app\.js\?v=0\.40\.7/);
assert.match(index, /styles\.css\?v=0\.40\.4/);
const ringCssStart = css.indexOf("/* v0.31.0 — shared compact progress rings */");
const ringCssEnd = css.indexOf("/* Home: same cards", ringCssStart);
const ringCss = css.slice(ringCssStart, ringCssEnd);
assert.doesNotMatch(ringCss, /stroke-dasharray|stroke-dashoffset/);
assert.doesNotMatch(ringSource, /stroke-dasharray|stroke-dashoffset|pathLength/);
assert.doesNotMatch(css, /\.habit-progress-ring\s*\{/);
assert.doesNotMatch(app, /habit-progress-ring/);
assert.doesNotMatch(index, /habit-progress-ring/);

// Dynamic update path is mandatory: live cards call updateProgressRing and it replaces SVG geometry.
assert.match(ringSource, /function updateRingSvg\([^)]*\)[\s\S]*outerHTML = markup/);
assert.match(app, /updateProgressRing\(ring, percentage/);
assert.match(app, /updateProgressRing\(ring, fillPct/);

for (const marker of [
  "#home-habits-ring",
  "#home-kcal-ring",
  "Progreso de nutrición",
  "Progreso de actividad",
  "Progreso semanal de fuerza",
  "de hábitos completados",
  "nutrition-target-ring-card"
]) {
  assert.ok(app.includes(marker), "Missing audited app ring surface: " + marker);
}
assert.ok(adherence.includes("Adherencia mensual"), "Missing audited adherence ring surface");

assert.match(app, /buildLiquidityLeaderLayout/);
assert.match(app, /liquidity-leader-layer/);
assert.match(app, /function liquidityChargeLabel/);
assert.match(app, /Cobro: día/);
assert.match(app, /Cobro: aprox\. día/);
assert.match(css, /liquidity-charge-date/);
assert.match(css, /liquidity-leader-line/);
assert.match(app, /function renderHomeLiquidityOverview/);
assert.match(app, /Disponible bancario y distribución/);
assert.match(app, /formatMoney\(model\.availableAfterHolds, model\.currency\)/);
assert.match(app, /Saldo total <b>/);
assert.match(app, /Libre interno <b>/);
assert.match(app, /explicitInternalFree/);
assert.match(app, /personalAdjustment/);
assert.match(app, /Ajuste personal <b>/);
assert.match(app, /formatMoney\(model\.internalFree, model\.currency\)/);
assert.doesNotMatch(app, /<span>Saldo actual y distribución<\/span>/);
assert.match(app, /function renderHomeWealthAllocation/);
assert.match(app, /function renderWealthDailyDiary/);
assert.match(app, /wealth\.dailyDiary/);
assert.match(css, /v0\.39\.0 — diario de patrimonio/);
assert.match(css, /wealth-daily-section/);
assert.match(app, /function renderMidasResearch/);
assert.match(app, /Tesis y CAGR 2031/);
assert.match(css, /v0\.39\.1 — MIDAS thesis watchlist/);
assert.match(app, /renderHomeLiquidityOverview\(monthly\.liquidityAccounts/);
assert.match(app, /renderHomeWealthAllocation\(allocation/);
assert.match(css, /home-liquidity-grid/);
assert.match(css, /home-liquidity-bar/);
assert.match(css, /v0\.38\.2 — compact mobile liquidity cards/);
assert.match(css, /v0\.38\.3 — two-column mobile liquidity grid/);
assert.match(css, /v0\.38\.4 — readability typography pass/);
assert.match(app, /pantry\.js\?v=0\.38\.7/);
assert.match(app, /objects\.js\?v=0\.40\.0/);
assert.match(objects, /Armario visual/);
assert.match(objects, /Combinador/);
assert.match(objects, /wardrobe-brand/);
assert.match(objects, /wardrobe-color/);
assert.match(objects, /wardrobe-formality/);
assert.match(objects, /wardrobe-frequency/);
assert.match(objects, /data-look-role/);
assert.match(objects, /\/api\/objects\/look/);
assert.match(objects, /processedPhotoUrl/);
assert.match(objects, /originalPhotoUrl/);
assert.match(css, /v0\.40\.0 — visual wardrobe and look builder/);
assert.match(css, /wardrobe-visual-grid/);
assert.match(css, /look-builder-preview/);

assert.match(index, /id="home-shopping-list"/);
assert.match(index, /🛒 Lista de la compra/);
assert.match(pantry, /data-pantry-view="shopping"/);
assert.match(pantry, /openPantryDetail\(initialView = "inventory"\)/);
assert.match(pantry, /Fuente actual: ListaCompra de Segundo Cerebro/);
assert.doesNotMatch(index + app + pantry, /Sincronizado con Apple Reminders|Apple Reminders/i);
assert.match(css, /v0\.38\.5 — direct ListaCompra access/);
assert.match(css, /\.text-action\s*\{\s*font-size: 12px/);
assert.match(css, /\.home-finance-mini-heading strong\s*\{\s*font-size: 11px/);
assert.match(css, /\.home-liquidity-account-meta span\s*\{\s*font-size: 8\.4px/);
assert.match(css, /\.weekly-menu-day-rich > header > div strong\s*\{\s*font-size: 13px/);
assert.match(css, /\.home-weekly-menu-day > header strong\s*\{\s*font-size: 10px/);
assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(css, /grid-template-columns: 31px minmax\(0, 1fr\)/);
assert.match(css, /@media \(max-width: 340px\)[\s\S]*grid-template-columns: 1fr/);
assert.match(css, /grid-template-columns: minmax\(86px, \.9fr\) 40px minmax\(118px, 1\.2fr\)/);
assert.match(css, /\.home-liquidity-account-body\s*\{\s*display: contents;/);
assert.match(css, /height: 92px/);
assert.match(css, /home-wealth-stack/);
assert.match(css, /home-wealth-legend/);
assert.match(app, /function weeklyMenuModel/);
assert.match(app, /function weeklyMenuItemIsConsumed/);
assert.match(app, /weekly-menu-ingredients-fallback/);
assert.match(app, /consumed \? "is-consumed"/);
assert.match(css, /weekly-menu-meal\.is-consumed/);
assert.match(css, /\.home-weekly-menu-panel\s*\{[\s\S]*?margin-top:\s*24px/);
assert.match(css, /v0\.39\.9 — compact Home daily overview cards/);
assert.match(css, /v0\.39\.10 — denser Home summary cards/);
assert.match(css, /v0\.39\.12 — desktop 2x2 horizontal summary layout/);
assert.match(css, /v0\.39\.13 — unified symmetric Home summary cards/);
assert.match(index, /id="home-habits-done"/);
assert.match(index, /id="home-habits-pending"/);
assert.match(index, /id="home-habits-percent"/);
assert.match(index, /id="home-habits-streak"/);
assert.match(index, /id="home-kcal-percent"/);
assert.match(css, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
assert.match(css, /#home-pantry-status,[\s\S]*#home-shopping-preview,[\s\S]*#home-objects-status[\s\S]*display:\s*none/);
assert.match(app, /const pending = Math\.max\(0, total - done\)/);
assert.match(app, /percentNode\.textContent = rawPct \+ "%"/);

assert.match(css, /#home-habits-card\s*\{[\s\S]*?grid-template-columns:/);
assert.match(css, /#home-nutrition-card\s*\{[\s\S]*?grid-template-columns:/);
assert.match(css, /\.pantry-home-primary\s*\{[\s\S]*?grid-template-columns:/);
assert.match(css, /#home-objects-card\s*\{[\s\S]*?grid-template-areas:/);

assert.match(css, /\.daily-overview-grid\s*\{[\s\S]*?gap:\s*10px/);
assert.match(css, /\.pantry-home-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3/);

assert.match(css, /\.daily-overview-grid\s*\{[\s\S]*?align-items:\s*start/);
assert.match(css, /\.daily-overview-card\s*\{[\s\S]*?align-content:\s*start/);



assert.match(app, /function renderHomeWeeklyMenu/);
assert.match(app, /event\.locationRef/);
assert.match(app, /if \(tab === "medical"\) void loadMedicalAppointments\(\)/);
assert.match(app, /selectedCalendarCount/);
assert.match(app, /missingCalendars/);
assert.match(app, /calendar-source-status/);
assert.match(app, /sincronización parcial/);
assert.match(app, /renderHomeWeeklyMenu\(data\)/);
assert.match(app, /weekly-menu-meal-macros/);
assert.match(app, /Proteína/);
assert.match(index, /id="home-weekly-menu-panel"/);
assert.match(index, /id="show-home-weekly-menu"/);
assert.match(css, /weekly-menu-grid-rich/);
assert.match(css, /home-weekly-menu-grid/);
assert.match(app, /\/api\/nutrition\/menu\?date=/);
assert.match(app, /function loadHomeWeeklyMenu/);
assert.match(app, /function renderHomeWeeklyMenuUnavailable/);
assert.match(app, /function loadMedicalAppointments/);
assert.match(app, /puy du fou/);
assert.match(app, /concierto\|teatro\|festival\|espectaculo\|parque tematico/);
assert.match(app, /function inferImportantKind/);
assert.match(app, /function mergeMedicalAppointments/);
assert.match(app, /const local = collectHealthEvents\(\)\.filter/);
assert.match(app, /const events = mergeMedicalAppointments\(live, local\)/);
assert.match(app, /refrescando iCloud/);
assert.match(app, /sin perder las citas ya cargadas en Agenda/);
assert.match(app, /\/api\/health\/appointments/);
assert.match(app, /Cargando citas médicas desde iCloud/);
assert.match(app, /function hideHomeWeeklyMenu/);
assert.doesNotMatch(app, /function renderHomeWeeklyMenu\(data\)[\s\S]{0,500}panel\.hidden = true/);
assert.match(css, /v0\.38\.7 — Home weekly-menu resilience/);
assert.match(css, /weekly-menu-progress/);
assert.match(css, /v0\.37\.7 — Home finance hierarchy/);
assert.match(css, /\.money-horizon > \.budget-panel\s*\{[\s\S]*grid-column: 1 \/ -1/);
assert.match(css, /\.money-horizon > \.budget-panel \.budget-summary[\s\S]*grid-template-columns:/);
for (let i = 1; i <= 12; i += 1) {
  assert.match(css, new RegExp('\\.allocation-' + i + '\\s*\\{'));
}
assert.match(css, /allocation-hold/);
assert.match(css, /allocation-free/);

console.log("geometric progress rings: static geometry, overflow, dynamic update and all live surfaces OK");

assert.doesNotMatch(app, /is-warning">Falta/);
