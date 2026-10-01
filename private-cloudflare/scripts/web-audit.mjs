import { chromium } from "playwright";
import {
  classifyRequestFailure,
  hiddenMenuStatus,
  logicalMenuKey,
  normalizeAuditValue,
  qualityStep,
  visibleMenuRow
} from "../src/web-audit-utils.js";

const baseUrl = (process.env.AUDIT_BASE_URL || "https://segundo-cerebro-web-audit.mamg97.workers.dev").replace(/\/$/, "");
const token = process.env.AUDIT_TOKEN;
if (!token) {
  console.error("AUDIT_TOKEN_MISSING");
  process.exit(2);
}

const failures = [];
const checks = [];
const networkFailures = [];
const ignoredNetworkAborts = [];
const browserErrors = [];
const resourceConsoleErrors = [];
const recoveredSourcePaths = new Set();

function pass(name, detail = "") {
  checks.push({ name, ok: true, detail });
  console.log(`[PASS] ${name}${detail ? ` · ${detail}` : ""}`);
}

function fail(name, detail = "") {
  checks.push({ name, ok: false, detail });
  failures.push({ name, detail });
  console.error(`[FAIL] ${name}${detail ? ` · ${detail}` : ""}`);
}

function info(name, detail = "") {
  console.log(`[INFO] ${name}${detail ? ` · ${detail}` : ""}`);
}

function assertCheck(condition, name, detail = "") {
  if (condition) pass(name, detail);
  else fail(name, detail);
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
      const moments = new Set(items.map((item) => normalizeAuditValue(item.moment || "otro")));
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
  if (message.type() !== "error") return;
  const text = message.text().slice(0, 240);
  if (/^Failed to load resource:/i.test(text)) resourceConsoleErrors.push(text);
  else browserErrors.push("console:" + text);
});
page.on("requestfailed", (request) => {
  const classified = classifyRequestFailure({
    url: request.url(),
    errorText: request.failure()?.errorText || "unknown",
    auditOrigin
  });
  if (classified.track) {
    networkFailures.push(`requestfailed:${classified.path}:${classified.errorText}`);
  } else if (classified.ignored) {
    ignoredNetworkAborts.push(`${classified.path}:${classified.errorText}`);
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

async function probeApi(path, label, options = {}) {
  const attempts = Math.max(1, Number(options.attempts || 3));
  const waitMs = Math.max(0, Number(options.waitMs || 700));
  let result = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = await api(path);
    if (result.ok) {
      if (attempt > 1) info(label + " · recuperación transitoria", `éxito en intento ${attempt}/${attempts}`);
      return result;
    }
    if (result.status < 500 || attempt === attempts) return result;
    await page.waitForTimeout(waitMs * attempt);
  }
  return result;
}

async function reconcileTransientSourceFailures() {
  const retryTargets = new Map([
    ["/api/pantry", "/api/pantry"],
    ["/api/projects", "/api/projects"],
    ["/api/objects", "/api/objects"],
    ["/api/health/adherence", "/api/health/adherence"],
    ["/api/finance/delta", "/api/finance/delta?limit=1"]
  ]);
  const paths = [...new Set(
    networkFailures
      .filter((entry) => /^http5\d\d:/.test(entry))
      .map((entry) => entry.split(":")[1])
      .filter((path) => retryTargets.has(path))
  )];
  for (const path of paths) {
    const result = await probeApi(retryTargets.get(path), `Fuente ${path}`, { attempts: 2, waitMs: 900 });
    if (!result?.ok) continue;
    for (let index = networkFailures.length - 1; index >= 0; index -= 1) {
      if (networkFailures[index].startsWith("http5") && networkFailures[index].includes(`:${path}`)) {
        networkFailures.splice(index, 1);
      }
    }
    recoveredSourcePaths.add(path);
    info("5xx transitorio recuperado", path);
  }
}

async function revalidateRecoveredSources() {
  const areaChecks = new Map([
    ["/api/pantry", { areaId: "area-pantry", selector: "[data-pantry-view]" }],
    ["/api/projects", { areaId: "area-projects", selector: "[data-project-tab]" }],
    ["/api/objects", { areaId: "area-objects", selector: "[data-objects-tab]" }]
  ]);

  for (const path of recoveredSourcePaths) {
    const check = areaChecks.get(path);
    if (!check) continue;
    await closeDialogIfOpen();
    const link = page.locator(`[data-nav-area-id="${check.areaId}"]`).first();
    if (!await link.count()) {
      fail(`Recuperación ${path}`, `falta navegación ${check.areaId}`);
      continue;
    }
    await link.click();
    const visible = await page.locator(check.selector).first()
      .waitFor({ state: "visible", timeout: 7000 })
      .then(() => true)
      .catch(() => false);
    assertCheck(visible, `Recuperación UI ${path}`, visible ? "API y vista recuperadas" : "API recuperó pero la vista no");
    await closeDialogIfOpen();
  }

  if (recoveredSourcePaths.has("/api/health/adherence")) {
    await closeDialogIfOpen();
    const link = page.locator('[data-nav-area-id="area-health"]').first();
    if (await link.count()) {
      await link.click();
      const button = page.locator('[data-health-tab="adherence"]');
      const exists = await button.waitFor({ state: "visible", timeout: 7000 }).then(() => true).catch(() => false);
      if (exists) {
        await button.click();
        await page.waitForTimeout(500);
        const text = normalizeAuditValue(await page.locator('[data-health-panel="adherence"]').textContent().catch(() => ""));
        assertCheck(!/no se ha podido cargar|temporalmente no disponible|error al cargar/.test(text), "Recuperación UI /api/health/adherence");
      } else {
        fail("Recuperación UI /api/health/adherence", "pestaña no disponible");
      }
      await closeDialogIfOpen();
    }
  }
}

async function closeDialogIfOpen() {
  const dialog = page.locator("#detail-dialog");
  if (await dialog.getAttribute("open") !== null) {
    await page.locator("#close-dialog").click();
    await page.waitForTimeout(100);
  }
}

async function auditTabSet(label, buttonSelector, dataKey, panelSelector = null, options = {}) {
  const timeout = options.timeout || 6000;
  const settle = options.settle || 250;
  const first = page.locator(buttonSelector).first();
  try {
    await first.waitFor({ state: "visible", timeout });
  } catch {
    const sourcePath = String(options.sourcePath || "");
    const backendFailure = sourcePath && networkFailures.some((entry) =>
      entry.includes(`:${sourcePath}`) || entry.includes(`:${sourcePath}:`)
    );
    if (backendFailure) {
      info(label + " · pestañas no renderizadas", `backend ${sourcePath} ya clasificado como fallo de red`);
    } else {
      fail(label + " · pestañas disponibles", "no se encontraron " + buttonSelector);
    }
    return;
  }

  const values = await page.locator(buttonSelector).evaluateAll((nodes, key) =>
    [...new Set(nodes.map((node) => node.dataset[key]).filter(Boolean))], dataKey
  );
  assertCheck(values.length > 0, label + " · pestañas disponibles", values.join(", "));

  for (const value of values) {
    // Re-query by the exact data attribute after each render; several workspaces rebuild their tab DOM.
    const exact = page.locator(`${buttonSelector}[data-${options.htmlDataName}="${value}"]`).first();
    if (!await exact.count()) {
      fail(`${label} · pestaña ${value}`, "desapareció tras render");
      continue;
    }
    await exact.click();
    await page.waitForTimeout(settle);
    const active = await exact.evaluate((node) =>
      node.classList.contains("active") || node.getAttribute("aria-selected") === "true"
    ).catch(() => false);
    assertCheck(active, `${label} · pestaña ${value} activa`);

    if (panelSelector) {
      const panel = page.locator(panelSelector(value)).first();
      const panelOk = await panel.evaluate((node) =>
        !node.hidden && (node.classList.contains("active") || !node.hasAttribute("data-health-panel"))
      ).catch(() => false);
      assertCheck(panelOk, `${label} · panel ${value} visible`);
    }
  }
}

try {
  const response = await page.goto(baseUrl + "/app/", { waitUntil: "domcontentloaded", timeout: 30000 });
  assertCheck(Boolean(response?.ok()), "Producción carga", `HTTP ${response?.status() || "?"}`);

  await page.waitForFunction(
    () => {
      const footer = document.querySelector("#footer-mode")?.textContent || "";
      return /Estado privado remoto|Conexión temporalmente no disponible/i.test(
        (document.querySelector("#data-mode-badge")?.textContent || "") + " " + footer
      );
    },
    null,
    { timeout: 20000 }
  ).catch(() => {});

  const modeText = normalizeAuditValue(
    (await page.locator("#data-mode-badge").textContent().catch(() => "")) + " " +
    (await page.locator("#footer-mode").textContent().catch(() => ""))
  );
  const remoteReady = /estado personal privado|estado privado remoto|acceso autenticado/.test(modeText);
  assertCheck(remoteReady, "Estado privado remoto cargado", modeText || "sin estado");

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
      assertCheck(Number(health.body.calendarEventCount) > 0, "Calendario conserva eventos en horizonte", `n=${Number(health.body.calendarEventCount) || 0}`);
    }
  }

  const calendarStatus = normalizeAuditValue(await page.locator("#calendar-source-status").textContent().catch(() => ""));
  assertCheck(!/(error|no disponible|fall)/.test(calendarStatus), "Agenda sin error visible de fuente");

  const nutrition = await api("/api/nutrition");
  assertCheck(nutrition.ok && nutrition.body?.ok === true, "API de Nutrición", `HTTP ${nutrition.status}`);

  const pantryProbe = await probeApi("/api/pantry", "API de Despensa");
  assertCheck(pantryProbe.ok && pantryProbe.body?.ok === true, "API de Despensa", `HTTP ${pantryProbe.status}`);
  const projectsProbe = await probeApi("/api/projects", "API de Proyectos");
  assertCheck(projectsProbe.ok && projectsProbe.body?.ok === true, "API de Proyectos", `HTTP ${projectsProbe.status}`);
  const deltaProbe = await probeApi("/api/finance/delta?limit=1", "API Delta de Finanzas");
  assertCheck(deltaProbe.ok && deltaProbe.body?.ok === true, "API Delta de Finanzas", `HTTP ${deltaProbe.status}`);

  const menuRows = Array.isArray(nutrition.body?.weeklyMenu) ? nutrition.body.weeklyMenu : [];
  const visibleRows = menuRows.filter(visibleMenuRow);
  const keys = visibleRows.map(logicalMenuKey);
  assertCheck(new Set(keys).size === keys.length, "Menú sin versiones lógicas duplicadas", `${keys.length} filas visibles`);
  assertCheck(!menuRows.some((item) => hiddenMenuStatus(item?.status)), "Menú no resucita omitidos/cancelados");

  await page.waitForFunction(() => {
    const panel = document.querySelector("#home-weekly-menu-panel");
    return panel && !panel.hidden && !/Cargando/i.test(panel.textContent || "");
  }, null, { timeout: 15000 }).catch(() => {});

  const homeMenuVisible = await page.locator("#home-weekly-menu-panel").evaluate((node) => !node.hidden).catch(() => false);
  assertCheck(homeMenuVisible, "Menú semanal permanece visible en Home");
  const homeMenuText = normalizeAuditValue(await page.locator("#home-weekly-menu-panel").textContent().catch(() => ""));
  assertCheck(!/temporalmente no disponible|no se ha podido/.test(homeMenuText), "Menú Home sin fallback de error");

  const dayGroups = groupDayRows(visibleRows);
  const homeDayCount = await page.locator("#home-weekly-menu-content [data-menu-date]").count();
  assertCheck(homeDayCount === dayGroups.length, "Home representa todos los días del menú", `UI=${homeDayCount} API=${dayGroups.length}`);

  const navIds = await page.locator("[data-nav-area-id]").evaluateAll((nodes) =>
    [...new Set(nodes.map((node) => node.dataset.navAreaId).filter(Boolean))]
  );
  const expectedNavIds = [
    "area-general", "area-career", "area-finance", "area-calendar", "area-events",
    "area-partner", "area-family", "area-parents", "area-health", "area-habits",
    "area-objects", "area-pantry", "area-wealth", "area-projects"
  ];
  const missingNavIds = expectedNavIds.filter((id) => !navIds.includes(id));
  assertCheck(navIds.length >= 5, "Navegación principal disponible", `${navIds.length} áreas`);
  assertCheck(missingNavIds.length === 0, "Navegación conserva áreas canónicas", missingNavIds.length ? missingNavIds.join(", ") : "14/14");

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

    if (areaId === "area-pantry") {
      if (!(pantryProbe.ok && pantryProbe.body?.ok === true)) {
        info("Despensa · pestañas omitidas", "backend no saludable; fallo ya clasificado por API");
      } else await auditTabSet(
        "Despensa",
        "[data-pantry-view]",
        "pantryView",
        (value) => `[data-pantry-panel="${value}"]`,
        { htmlDataName: "pantry-view", attributeName: "pantry-view", attr: "pantry-view", settle: 180, sourcePath: "/api/pantry" }
      );
    } else if (areaId === "area-objects") {
      await auditTabSet(
        "Objetos",
        "[data-objects-tab]",
        "objectsTab",
        null,
        { htmlDataName: "objects-tab", attributeName: "objects-tab", attr: "objects-tab", settle: 180, sourcePath: "/api/objects" }
      );
    } else if (areaId === "area-projects") {
      if (!(projectsProbe.ok && projectsProbe.body?.ok === true)) {
        info("Proyectos · pestañas omitidas", "backend no saludable; fallo ya clasificado por API");
      } else await auditTabSet(
        "Proyectos",
        "[data-project-tab]",
        "projectTab",
        null,
        { htmlDataName: "project-tab", attributeName: "project-tab", attr: "project-tab", settle: 180, sourcePath: "/api/projects" }
      );
    } else if (areaId === "area-habits") {
      await auditTabSet(
        "Hábitos",
        "[data-habit-tab]",
        "habitTab",
        (value) => `[data-habit-panel="${value}"]`,
        { htmlDataName: "habit-tab", attributeName: "habit-tab", attr: "habit-tab", settle: 180 }
      );
    } else if (areaId === "area-parents") {
      await auditTabSet(
        "Padres",
        "[data-family-scope]",
        "familyScope",
        null,
        { htmlDataName: "family-scope", attributeName: "family-scope", attr: "family-scope", settle: 450 }
      );
    } else if (areaId === "area-events") {
      await auditTabSet(
        "Eventos",
        "[data-events-inline-tab]",
        "eventsInlineTab",
        null,
        { htmlDataName: "events-inline-tab", attributeName: "events-inline-tab", attr: "events-inline-tab", settle: 180 }
      );
    }
    await closeDialogIfOpen();
  }

  // Some domain views finish asynchronous rendering after their navigation click.
  // Close any previous dialog and let late work settle before opening Health again,
  // otherwise a stale async response can replace the Health dialog and create a false positive.
  await page.waitForTimeout(1800);
  await closeDialogIfOpen();

  const healthLink = page.locator('[data-nav-area-id="area-health"]').first();
  if (await healthLink.count()) {
    await healthLink.click();
    await page.waitForFunction(() => {
      const dialog = document.querySelector("#detail-dialog");
      return Boolean(
        dialog?.open &&
        document.querySelector("#dialog-title")?.textContent?.trim() === "Salud" &&
        document.querySelectorAll("[data-health-tab]").length === 6
      );
    }, null, { timeout: 12000 });
    const healthTabs = ["overview", "medical", "gym", "nutrition", "adherence", "menu"];

    for (const tab of healthTabs) {
      const button = page.locator(`[data-health-tab="${tab}"]`);
      if (!await button.count()) {
        fail(`Salud · pestaña ${tab}`, "no existe");
        continue;
      }
      await button.click();
      if (tab === "menu") {
        await page.waitForFunction(
          (expected) => {
            const panel = document.querySelector('[data-health-panel="menu"]');
            const text = (panel?.textContent || "").toLowerCase();
            return document.querySelectorAll('[data-health-panel="menu"] .weekly-menu-day').length === expected ||
              /no se ha podido cargar|temporalmente no disponible|error al cargar/.test(text);
          },
          dayGroups.length,
          { timeout: 9000 }
        ).catch(() => {});
      } else {
        await page.waitForTimeout(650);
      }
      const panel = page.locator(`[data-health-panel="${tab}"]`);
      const active = await panel.evaluate((node) => node.classList.contains("active")).catch(() => false);
      assertCheck(active, `Salud · pestaña ${tab} activa`);
      const text = normalizeAuditValue(await panel.textContent().catch(() => ""));
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
        const key = normalizeAuditValue(item.moment || "otro");
        if (!momentGroups.has(key)) momentGroups.set(key, []);
        momentGroups.get(key).push(item);
      }
      const cards = uiDay.locator(".weekly-menu-meal");
      let cardIndex = 0;
      for (const items of momentGroups.values()) {
        const cardText = normalizeAuditValue(await cards.nth(cardIndex).textContent().catch(() => ""));
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

  await reconcileTransientSourceFailures();
  await revalidateRecoveredSources();

  if (ignoredNetworkAborts.length) {
    info("Abortos de navegación ignorados", ignoredNetworkAborts.slice(0, 5).join(","));
  }
  if (resourceConsoleErrors.length && networkFailures.length) {
    info("Errores de recurso ya cubiertos por red", `n=${resourceConsoleErrors.length}`);
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
