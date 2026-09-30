import { chromium } from "playwright";

const baseUrl = (process.env.AUDIT_BASE_URL || "https://segundo-cerebro-web-audit.mamg97.workers.dev").replace(/\/$/, "");
const token = process.env.AUDIT_TOKEN;
if (!token) {
  console.error("AUDIT_TOKEN_MISSING");
  process.exit(2);
}

const failures = [];
const checks = [];
const networkFailures = [];
const browserErrors = [];

function pass(name, detail = "") {
  checks.push({ name, ok: true, detail });
  console.log(`[PASS] ${name}${detail ? ` · ${detail}` : ""}`);
}

function fail(name, detail = "") {
  checks.push({ name, ok: false, detail });
  failures.push({ name, detail });
  console.error(`[FAIL] ${name}${detail ? ` · ${detail}` : ""}`);
}

function assertCheck(condition, name, detail = "") {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

const normalize = (value) => String(value || "")
  .trim()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .toLowerCase();

const hiddenStatus = (status) => /^(omitid[oa]|retirad[oa]|cancelad[oa]|cancelled|skipped)$/.test(normalize(status));

function logicalMenuKey(item) {
  const identity = item?.recipeId
    ? "recipe:" + normalize(item.recipeId)
    : item?.foodId
      ? "food:" + normalize(item.foodId)
      : "name:" + normalize(item?.name);
  return [normalize(item?.date), normalize(item?.moment || "otro"), identity].join("|");
}

function visibleMenuRow(item) {
  if (!item || hiddenStatus(item.status)) return false;
  const hasKcal = item.kcal !== null && item.kcal !== undefined && item.kcal !== "";
  const hasProtein = item.protein !== null && item.protein !== undefined && item.protein !== "";
  return !(hasKcal && hasProtein && Number(item.kcal) === 0 && Number(item.protein) === 0);
}

function qualityStep(metric, value, target) {
  const numericValue = Number(value);
  const numericTarget = Number(target);
  if (!Number.isFinite(numericValue) || !Number.isFinite(numericTarget) || numericTarget <= 0) return null;
  const ratio = Math.max(0, numericValue / numericTarget);
  let quality;
  if (metric === "kcal") {
    quality = ratio <= 1
      ? (ratio - 0.70) / 0.30
      : 1 - ((ratio - 1) / 0.10);
  } else {
    quality = ratio >= 1 ? 1 : (ratio - 0.70) / 0.30;
  }
  quality = Math.max(0, Math.min(1, quality));
  return {
    width: Math.max(0, Math.min(100, Math.round(ratio * 100))),
    step: Math.max(0, Math.min(10, Math.round(quality * 10)))
  };
}

function groupDayRows(rows) {
  const byDate = new Map();
  for (const row of rows.filter(visibleMenuRow)) {
    if (!byDate.has(row.date)) byDate.set(row.date, []);
    byDate.get(row.date).push(row);
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, items]) => {
      const moments = new Set(items.map((item) => normalize(item.moment || "otro")));
      return { date, items, momentCount: moments.size };
    });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: "es-ES",
  viewport: { width: 1440, height: 1100 }
});
const page = await context.newPage();
const auditOrigin = new URL(baseUrl).origin;

await page.route(`${auditOrigin}/**`, async (route) => {
  const headers = { ...route.request().headers(), authorization: `Bearer ${token}` };
  await route.continue({ headers });
});

page.on("pageerror", (error) => browserErrors.push("pageerror:" + String(error?.message || error)));
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push("console:" + message.text().slice(0, 240));
});
page.on("requestfailed", (request) => {
  if (request.url().startsWith(auditOrigin)) {
    networkFailures.push(`requestfailed:${new URL(request.url()).pathname}:${request.failure()?.errorText || "unknown"}`);
  }
});
page.on("response", (response) => {
  if (response.url().startsWith(auditOrigin) && response.status() >= 500) {
    networkFailures.push(`http${response.status()}:${new URL(response.url()).pathname}`);
  }
});

async function api(path) {
  return page.evaluate(async (target) => {
    const response = await fetch(target, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin"
    });
    let body = null;
    try { body = await response.json(); } catch {}
    return { status: response.status, ok: response.ok, body };
  }, path);
}

async function closeDialogIfOpen() {
  const dialog = page.locator("#detail-dialog");
  if (await dialog.getAttribute("open") !== null) {
    await page.locator("#close-dialog").click();
    await page.waitForTimeout(100);
  }
}

try {
  const response = await page.goto(baseUrl + "/app/", { waitUntil: "domcontentloaded", timeout: 30000 });
  assertCheck(Boolean(response?.ok()), "Producción carga", `HTTP ${response?.status() || "?"}`);

  await page.waitForFunction(
    () => document.querySelectorAll("[data-nav-area-id]").length >= 5 &&
      !document.querySelector("#footer-mode")?.textContent?.includes("Cargando"),
    null,
    { timeout: 20000 }
  );

  const health = await api("/api/health");
  assertCheck(health.ok && health.body?.ok === true, "Healthcheck funcional de fuentes", `HTTP ${health.status}`);

  if (health.body?.ok) {
    const syncFields = [
      "financeSync",
      "habitSync",
      "nutritionSync",
      "pantrySync",
      "objectsSync",
      "projectsSync",
      "calendarSync"
    ];
    for (const field of syncFields) {
      const value = String(health.body[field] || "");
      assertCheck(value !== "error" && value !== "not-configured" && value !== "", `Fuente ${field}`, value || "sin estado");
    }
    if (health.body.calendarSync !== "error" && health.body.calendarSync !== "not-configured") {
      assertCheck(Number(health.body.calendarSelectedCount) > 0, "Calendario conserva calendarios seleccionados", `n=${Number(health.body.calendarSelectedCount) || 0}`);
      assertCheck(Number(health.body.calendarMatchedCount) > 0, "Calendario conserva calendarios enlazados", `n=${Number(health.body.calendarMatchedCount) || 0}`);
    }
  }

  const calendarStatus = normalize(await page.locator("#calendar-source-status").textContent().catch(() => ""));
  assertCheck(!/(error|no disponible|fall)/.test(calendarStatus), "Agenda sin error visible de fuente");

  const nutrition = await api("/api/nutrition");
  assertCheck(nutrition.ok && nutrition.body?.ok === true, "API de Nutrición", `HTTP ${nutrition.status}`);

  const menuRows = Array.isArray(nutrition.body?.weeklyMenu) ? nutrition.body.weeklyMenu : [];
  const visibleRows = menuRows.filter(visibleMenuRow);
  const keys = visibleRows.map(logicalMenuKey);
  assertCheck(new Set(keys).size === keys.length, "Menú sin versiones lógicas duplicadas", `${keys.length} filas visibles`);
  assertCheck(!menuRows.some((item) => hiddenStatus(item?.status)), "Menú no resucita omitidos/cancelados");

  await page.waitForFunction(() => {
    const panel = document.querySelector("#home-weekly-menu-panel");
    return panel && !panel.hidden && !/Cargando/i.test(panel.textContent || "");
  }, null, { timeout: 15000 }).catch(() => {});

  const homeMenuVisible = await page.locator("#home-weekly-menu-panel").evaluate((node) => !node.hidden).catch(() => false);
  assertCheck(homeMenuVisible, "Menú semanal permanece visible en Home");
  const homeMenuText = normalize(await page.locator("#home-weekly-menu-panel").textContent().catch(() => ""));
  assertCheck(!/temporalmente no disponible|no se ha podido/.test(homeMenuText), "Menú Home sin fallback de error");

  const dayGroups = groupDayRows(visibleRows);
  const homeDayCount = await page.locator("#home-weekly-menu-content [data-menu-date]").count();
  assertCheck(homeDayCount === dayGroups.length, "Home representa todos los días del menú", `UI=${homeDayCount} API=${dayGroups.length}`);

  const navIds = await page.locator("[data-nav-area-id]").evaluateAll((nodes) =>
    [...new Set(nodes.map((node) => node.dataset.navAreaId).filter(Boolean))]
  );
  assertCheck(navIds.length >= 5, "Navegación principal disponible", `${navIds.length} áreas`);

  for (const areaId of navIds) {
    const link = page.locator(`[data-nav-area-id="${areaId}"]`).first();
    await link.click();
    await page.waitForTimeout(350);
    const active = await link.evaluate((node) => node.classList.contains("active"));
    assertCheck(active, `Navegación ${areaId}`);

    if (areaId !== "area-general" && areaId !== "area-calendar" && areaId !== "area-events") {
      const dialog = page.locator("#detail-dialog");
      const open = await dialog.getAttribute("open") !== null;
      assertCheck(open, `Vista ${areaId} abre su detalle`);
      if (open) {
        const title = (await page.locator("#dialog-title").textContent().catch(() => "") || "").trim();
        assertCheck(Boolean(title), `Vista ${areaId} tiene título`);
      }
    }
    await closeDialogIfOpen();
  }

  const healthLink = page.locator('[data-nav-area-id="area-health"]').first();
  if (await healthLink.count()) {
    await healthLink.click();
    await page.locator("#detail-dialog[open]").waitFor({ timeout: 10000 });
    const healthTabs = ["overview", "medical", "gym", "nutrition", "adherence", "menu"];

    for (const tab of healthTabs) {
      const button = page.locator(`[data-health-tab="${tab}"]`);
      if (!await button.count()) {
        fail(`Salud · pestaña ${tab}`, "no existe");
        continue;
      }
      await button.click();
      await page.waitForTimeout(tab === "menu" ? 1200 : 650);
      const panel = page.locator(`[data-health-panel="${tab}"]`);
      const active = await panel.evaluate((node) => node.classList.contains("active")).catch(() => false);
      assertCheck(active, `Salud · pestaña ${tab} activa`);
      const text = normalize(await panel.textContent().catch(() => ""));
      assertCheck(!/no se ha podido cargar|temporalmente no disponible|error al cargar/.test(text), `Salud · pestaña ${tab} sin error visible`);
    }

    const menuPanel = page.locator('[data-health-panel="menu"]');
    const uiDays = menuPanel.locator(".weekly-menu-day");
    const uiDayCount = await uiDays.count();
    assertCheck(uiDayCount === dayGroups.length, "Menú detallado representa todos los días", `UI=${uiDayCount} API=${dayGroups.length}`);

    const objective = nutrition.body?.objective || {};
    for (let index = 0; index < Math.min(uiDayCount, dayGroups.length); index += 1) {
      const group = dayGroups[index];
      const uiDay = uiDays.nth(index);
      const mealCards = await uiDay.locator(".weekly-menu-meal").count();
      assertCheck(mealCards === group.momentCount, `Agrupación de tomas día ${index + 1}`, `UI=${mealCards} esperadas=${group.momentCount}`);

      const incomplete = group.items.some((item) => item.kcal == null || item.protein == null);
      const kcal = group.items.reduce((sum, item) => sum + (Number.isFinite(Number(item.kcal)) ? Number(item.kcal) : 0), 0);
      const protein = group.items.reduce((sum, item) => sum + (Number.isFinite(Number(item.protein)) ? Number(item.protein) : 0), 0);

      for (const [metric, value, target, selector] of [
        ["kcal", kcal, objective.kcal, ".weekly-menu-progress.kcal .nutrition-quality-meter"],
        ["protein", protein, objective.protein, ".weekly-menu-progress.protein .nutrition-quality-meter"]
      ]) {
        const expected = qualityStep(metric, value, target);
        const meter = uiDay.locator(selector);
        if (!expected) {
          assertCheck(await meter.count() === 0, `Barra ${metric} día ${index + 1} respeta objetivo ausente`);
          continue;
        }
        assertCheck(await meter.count() === 1, `Barra ${metric} día ${index + 1} existe`);
        if (await meter.count()) {
          const aria = Number(await meter.getAttribute("aria-valuenow"));
          assertCheck(aria === expected.width, `Barra ${metric} día ${index + 1} tiene ancho correcto`, `${aria}%`);
          const fill = meter.locator(".nutrition-quality-meter-fill");
          const className = await fill.getAttribute("class") || "";
          const expectedClass = incomplete ? "is-neutral" : `q-${expected.step}`;
          assertCheck(className.split(/\s+/).includes(expectedClass), `Barra ${metric} día ${index + 1} tiene color lógico`, expectedClass);
        }
      }

      const momentGroups = new Map();
      for (const item of group.items) {
        const key = normalize(item.moment || "otro");
        if (!momentGroups.has(key)) momentGroups.set(key, []);
        momentGroups.get(key).push(item);
      }
      const cards = uiDay.locator(".weekly-menu-meal");
      let cardIndex = 0;
      for (const items of momentGroups.values()) {
        const cardText = normalize(await cards.nth(cardIndex).textContent().catch(() => ""));
        const missingAny = items.some((item) => item.kcal == null || item.protein == null);
        if (missingAny && items.length === 1) {
          assertCheck(cardText.includes("— kcal") || cardText.includes("p —"), `Dato ausente no se convierte en cero día ${index + 1}`);
        } else if (missingAny && items.length > 1) {
          assertCheck(cardText.includes("subtotal"), `Grupo incompleto se etiqueta como subtotal día ${index + 1}`);
        }
        cardIndex += 1;
      }
    }

    await closeDialogIfOpen();
  } else {
    fail("Salud accesible desde navegación", "falta area-health");
  }

  const homeKcalTarget = (await page.locator("#home-kcal-target").textContent().catch(() => "") || "").trim();
  const homeKcalRing = page.locator("#home-kcal-ring");
  if (objectiveHasValue(nutrition.body?.objective?.kcal) && homeKcalTarget !== "Pendiente") {
    const ariaNow = await homeKcalRing.getAttribute("aria-valuenow");
    assertCheck(ariaNow !== null && Number.isFinite(Number(ariaNow)), "Indicador kcal Home tiene valor válido");
  }

  assertCheck(networkFailures.length === 0, "Sin respuestas 5xx ni fallos de red", networkFailures.length ? networkFailures.join(",") : "");
  assertCheck(browserErrors.length === 0, "Sin errores JavaScript/console", browserErrors.length ? browserErrors.slice(0, 3).join(" | ") : "");
} catch (error) {
  fail("Auditoría ejecutable", String(error?.message || error).slice(0, 300));
} finally {
  await browser.close();
}

function objectiveHasValue(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) && Number(value) > 0;
}

console.log(`[SUMMARY] checks=${checks.length} failures=${failures.length}`);
if (failures.length) {
  console.error("[AUDIT_FAILED] " + failures.map((item) => item.name).join(" | "));
  process.exit(1);
}
console.log("[AUDIT_OK] Segundo Cerebro production UI passed the hourly audit.");
