import { chromium } from "playwright";
import {
  classifyRequestFailure,
  hiddenMenuStatus,
  logicalMenuKey,
  menuDisplayTotals,
  normalizeAuditValue,
  qualityStep,
  visibleMenuRow
} from "../src/web-audit-utils.js";
import { evaluateMidasWorkflowRuns } from "../src/midas-health.js";

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
const deferredApiFailures = new Map();

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

function localDateKeyForAudit(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

function menuMomentKey(value) {
  return String(value || "Otro")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

async function fetchMidasWorkflowRuns() {
  const endpoint = "https://api.github.com/repos/mamg97/midas-paper-lab/actions/runs?per_page=100";
  const tokenHeader = process.env.GH_TOKEN ? { Authorization: "Bearer " + process.env.GH_TOKEN } : {};
  let lastError = "unknown";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    for (const authenticated of [true, false]) {
      if (!authenticated && !process.env.GH_TOKEN) continue;
      try {
        const response = await fetch(endpoint, {
          headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": "segundo-cerebro-web-audit",
            ...(authenticated ? tokenHeader : {})
          }
        });
        if (response.ok) {
          const payload = await response.json();
          return Array.isArray(payload.workflow_runs) ? payload.workflow_runs : [];
        }
        lastError = "GitHub API " + response.status;
        if (authenticated && [401,403,404].includes(response.status)) continue;
      } catch (error) {
        lastError = String(error?.message || error);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
  }
  throw new Error(lastError);
}

async function auditMidasCompetition() {
  console.log("[MIDAS] Competition Health");
  const midas = await probeApi("/api/midas", "API MIDAS", { attempts: 3, waitMs: 800 });
  assertCheck(midas.ok && midas.body?.ok === true && Array.isArray(midas.body?.dashboard?.tracks),
    "MIDAS · API y dashboard", `HTTP ${midas.status}`);
  if (!(midas.ok && midas.body?.ok === true && Array.isArray(midas.body?.dashboard?.tracks))) return;

  const tracks = midas.body.dashboard.tracks;
  const paper = tracks.filter((row) => row.group === "paper_nuevo");
  assertCheck(
    paper.length === 9 && paper.every((row) => row.status === "demo_con_diario" && row.last_session),
    "MIDAS · estrategias diarias con diario",
    `${paper.filter((row) => row.status === "demo_con_diario" && row.last_session).length}/9`
  );

  const capital = tracks.find((row) => row.id === "capital_cycle_inflection_2026");
  assertCheck(Boolean(capital?.last_session), "MIDAS · Capital Cycle tiene sesión registrada",
    capital?.last_session || "sin sesión");

  const genetic = tracks.find((row) => row.id === "genetic_sp500_forward");
  assertCheck(
    genetic?.status === "demo_con_diario" && Boolean(genetic?.last_session),
    "MIDAS · genético prospectivo enlazado",
    genetic?.last_session || genetic?.status || "ausente"
  );

  let actionsRuns = [];
  try {
    actionsRuns = await fetchMidasWorkflowRuns();
    pass("MIDAS · GitHub Actions legible", `${actionsRuns.length} runs inspeccionados`);
  } catch (error) {
    fail("MIDAS · GitHub Actions legible", String(error?.message || error));
    return;
  }

  const health = evaluateMidasWorkflowRuns(actionsRuns);
  for (const item of health.workflows) {
    const detail = item.latest
      ? `${item.state} · run #${item.latest.run_number || "?"} · ${item.latest.created_at || ""}`
      : item.state;
    assertCheck(item.ok, `MIDAS · workflow ${item.name}`, item.detail ? detail + " · " + item.detail : detail);
  }

  const successful = new Set(health.workflows.filter((item) => item.state === "success").map((item) => item.name));
  const midasButton = page.locator("#show-midas-detail").first();
  if (await midasButton.count()) {
    await midasButton.click();
    await page.waitForFunction(() => {
      const dialog = document.querySelector("#midas-dialog");
      return Boolean(dialog?.open && document.querySelector(".midas-runtime-health"));
    }, null, { timeout: 8000 }).catch(() => {});
    const runtimeText = normalizeAuditValue(await page.locator(".midas-runtime-health").textContent().catch(() => ""));
    assertCheck(Boolean(runtimeText), "MIDAS · panel visible de salud operativa");
    for (const issue of health.issues) {
      const label = issue.name
        .replace("MIDAS paper comparison", "estrategias diarias")
        .replace("MIDAS TFM shadow forecasts", "tfm diario")
        .replace("MIDAS capital cycle paper", "capital cycle")
        .replace("MIDAS Buy The Dip paper", "buy the dip")
        .replace("MIDAS weekly ML paper", "weekly ml")
        .replace("MIDAS TFG corrected paper", "tfg corregido");
      assertCheck(runtimeText.includes(normalizeAuditValue(label)), `MIDAS · UI expone incidencia ${label}`);
    }
    await page.locator("#close-midas-dialog").click().catch(() => {});
  } else {
    fail("MIDAS · acceso visible al panel", "falta #show-midas-detail");
  }

  if (successful.has("MIDAS TFM shadow forecasts")) {
    const tfm = tracks.filter((row) => row.group === "tfm_demo_adaptado");
    assertCheck(tfm.length === 4 && tfm.every((row) => row.status === "demo_con_diario" && row.last_session),
      "MIDAS · TFM materializa cuatro diarios tras run verde");
  }
  if (successful.has("MIDAS weekly ML paper")) {
    const weekly = tracks.filter((row) => row.group === "weekly_ml_demo");
    assertCheck(weekly.length === 9 && weekly.every((row) => row.status === "demo_con_diario" && row.last_session),
      "MIDAS · Weekly ML materializa nueve diarios tras run verde");
  }
  if (successful.has("MIDAS Buy The Dip paper")) {
    const buyTheDip = tracks.find((row) => row.id === "buy_the_dip_corpus_2026_v0");
    assertCheck(buyTheDip?.status === "demo_con_diario" && Boolean(buyTheDip?.last_session),
      "MIDAS · Buy The Dip materializa diario tras run verde");
  }
  if (successful.has("MIDAS TFG corrected paper")) {
    const tfg = tracks.find((row) => row.id === "tfg_corrected_2026");
    assertCheck(tfg?.status === "demo_con_diario" && Boolean(tfg?.last_session),
      "MIDAS · TFG materializa diario tras run verde");
  }
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

async function resolveDeferredApiChecks() {
  for (const [path, check] of deferredApiFailures.entries()) {
    if (recoveredSourcePaths.has(path)) {
      pass(check.name + " · recuperación confirmada", "5xx transitorio recuperado");
      continue;
    }
    fail(check.name, check.detail);
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


const VISUAL_PROFILES = [
  { name: "desktop", width: 1440, height: 1100, wardrobeColumns: 4 },
  { name: "tablet", width: 900, height: 1000, wardrobeColumns: 3 },
  { name: "mobile-wide", width: 440, height: 956, wardrobeColumns: 3 },
  { name: "mobile", width: 390, height: 844, wardrobeColumns: 2 }
];

async function auditVisualSnapshot(label) {
  const report = await page.evaluate(() => {
    const visible = (element) => {
      if (!(element instanceof Element)) return false;
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 1 && rect.height > 1;
    };

    const shortName = (element) => {
      if (element.id) return "#" + element.id;
      const classes = [...element.classList].slice(0, 2);
      return element.tagName.toLowerCase() + (classes.length ? "." + classes.join(".") : "");
    };

    const insideHorizontalScroller = (element) => {
      let current = element.parentElement;
      while (current && current !== document.body) {
        const style = getComputedStyle(current);
        if (/(auto|scroll)/.test(style.overflowX) && current.scrollWidth > current.clientWidth + 2) return true;
        current = current.parentElement;
      }
      return false;
    };

    const intersectionArea = (a, b) => {
      const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return width * height;
    };

    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const outOfBounds = [];
    const clippedText = [];
    const overlaps = [];
    const distortedImages = [];
    const brokenImages = [];
    const proportions = [];

    const rootOverflow = Math.max(
      0,
      document.documentElement.scrollWidth - viewport.width,
      document.body.scrollWidth - viewport.width
    );

    document.querySelectorAll(
      ".main-content,.topbar,.home-summary-card,#home-weekly-menu-panel,.home-weekly-menu-table-cell,.weekly-menu-day,.recipe-card,dialog[open],.detail-dialog[open]"
    ).forEach((element) => {
      if (!visible(element) || insideHorizontalScroller(element)) return;
      const rect = element.getBoundingClientRect();
      if (rect.left < -3 || rect.right > viewport.width + 3) {
        outOfBounds.push(`${shortName(element)} [${Math.round(rect.left)},${Math.round(rect.right)}]/${viewport.width}`);
      }
    });

    document.querySelectorAll(
      "h1,h2,h3,h4,.nav-link,.daily-card-heading strong,.daily-card-status,.weekly-menu-moment,.weekly-menu-meal-copy strong,.home-weekly-menu-table-cell .weekly-menu-group-item-copy strong,.recipe-ingredients li,.recipe-steps li,.context-label,.detail-dialog button,.health-tabs button,.pantry-view-nav button,.objects-tabs button,.projects-tabs button,.events-tabs button"
    ).forEach((element) => {
      if (!visible(element) || !(element.textContent || "").trim()) return;
      const style = getComputedStyle(element);
      const horizontalClip = element.scrollWidth > element.clientWidth + 3;
      const verticalClip = element.scrollHeight > element.clientHeight + 3;
      const clipsHorizontally = horizontalClip && /(hidden|clip)/.test(style.overflowX);
      const clipsVertically = verticalClip && /(hidden|clip)/.test(style.overflowY);
      const allowsScroll = /(auto|scroll)/.test(style.overflowX + " " + style.overflowY);
      const intentionalEllipsis = style.textOverflow === "ellipsis" || style.webkitLineClamp !== "none";
      if ((clipsHorizontally || clipsVertically) && !allowsScroll && !intentionalEllipsis) {
        clippedText.push(`${shortName(element)} ${element.clientWidth}x${element.clientHeight}→${element.scrollWidth}x${element.scrollHeight}`);
      }
    });

    const overlapContainers = [
      ".topbar",
      ".top-actions",
      ".daily-card-heading",
      ".weekly-menu-meal-main",
      ".weekly-menu-day > header",
      ".recipe-card-body > header",
      ".recipe-ingredients li",
      ".health-tabs",
      ".pantry-view-nav",
      ".objects-tabs",
      ".projects-tabs",
      ".events-tabs",
      ".account-transactions-tabs",
      ".area-nav",
      ".liquidity-account-legend"
    ];
    document.querySelectorAll(overlapContainers.join(",")).forEach((container) => {
      if (!visible(container)) return;
      const children = [...container.children].filter((element) => {
        if (!visible(element)) return false;
        const style = getComputedStyle(element);
        return style.position !== "absolute" && style.position !== "fixed";
      });
      for (let i = 0; i < children.length; i += 1) {
        for (let j = i + 1; j < children.length; j += 1) {
          const a = children[i].getBoundingClientRect();
          const b = children[j].getBoundingClientRect();
          if (intersectionArea(a, b) > 9) {
            overlaps.push(`${shortName(container)}: ${shortName(children[i])} ↔ ${shortName(children[j])}`);
          }
        }
      }
    });

    document.querySelectorAll(".liquidity-account-legend").forEach((legend) => {
      if (!visible(legend)) return;
      const rows = [...legend.querySelectorAll(":scope > .liquidity-legend-row")].filter(visible);
      const textRects = (row) => [...row.querySelectorAll("em, small, b")]
        .filter(visible)
        .flatMap((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return [...range.getClientRects()]
            .filter((rect) => rect.width > 0.5 && rect.height > 0.5)
            .map((rect) => ({
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom
            }));
        });

      for (let i = 0; i < rows.length - 1; i += 1) {
        const currentRects = textRects(rows[i]);
        const nextRects = textRects(rows[i + 1]);
        const collision = currentRects.some((a) =>
          nextRects.some((b) => intersectionArea(a, b) > 1)
        );
        if (collision) {
          overlaps.push(`liquidity-account-legend: texto fila ${i + 1} ↔ fila ${i + 2}`);
        }
      }
    });

    const dialog = document.querySelector(".detail-dialog[open]");
    const close = document.querySelector(".detail-dialog[open] .dialog-close");
    const title = document.querySelector(".detail-dialog[open] #dialog-title");
    if (dialog && visible(dialog)) {
      const rect = dialog.getBoundingClientRect();
      if (rect.width > viewport.width - 8 || rect.left < 0 || rect.right > viewport.width) {
        proportions.push(`dialog ${Math.round(rect.width)}px en viewport ${viewport.width}px`);
      }
      if (close && title && visible(close) && visible(title)) {
        const closeRect = close.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(title);
        const textRects = [...range.getClientRects()];
        if (textRects.some((rect) => intersectionArea(closeRect, rect) > 9)) {
          overlaps.push("dialog-close ↔ dialog-title-text");
        }
      }
    }

    document.querySelectorAll("img").forEach((image) => {
      if (!visible(image)) return;
      if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
        brokenImages.push(`${shortName(image)} src=${String(image.getAttribute("src") || "").slice(0, 140)}`);
        return;
      }
      const style = getComputedStyle(image);
      if (["cover", "contain", "scale-down"].includes(style.objectFit)) return;
      const rect = image.getBoundingClientRect();
      const rendered = rect.width / Math.max(1, rect.height);
      const natural = image.naturalWidth / image.naturalHeight;
      if (Math.abs(rendered / natural - 1) > 0.08) {
        distortedImages.push(`${shortName(image)} natural=${natural.toFixed(2)} render=${rendered.toFixed(2)}`);
      }
    });

    if (viewport.width >= 1180) {
      const cards = [...document.querySelectorAll(".home-summary-card")].filter(visible);
      if (cards.length >= 2) {
        const heights = cards.map((element) => Math.round(element.getBoundingClientRect().height));
        const spread = Math.max(...heights) - Math.min(...heights);
        if (spread > 24) proportions.push(`home-summary-card alturas ${heights.join(",")} spread=${spread}px`);
      }
    }

    return { viewport, rootOverflow, outOfBounds, clippedText, overlaps, distortedImages, brokenImages, proportions };
  });

  assertCheck(report.rootOverflow <= 3, `Visual ${label} · sin overflow global`, `overflow=${report.rootOverflow}px`);
  assertCheck(report.outOfBounds.length === 0, `Visual ${label} · contenido dentro del viewport`, report.outOfBounds.slice(0, 4).join(" | "));
  assertCheck(report.clippedText.length === 0, `Visual ${label} · texto sin clipping`, report.clippedText.slice(0, 4).join(" | "));
  assertCheck(report.overlaps.length === 0, `Visual ${label} · sin solapes`, report.overlaps.slice(0, 4).join(" | "));
  assertCheck(report.distortedImages.length === 0, `Visual ${label} · imágenes sin deformación`, report.distortedImages.slice(0, 4).join(" | "));
  assertCheck(report.brokenImages.length === 0, `Visual ${label} · imágenes cargadas`, report.brokenImages.slice(0, 4).join(" | "));
  assertCheck(report.proportions.length === 0, `Visual ${label} · proporciones coherentes`, report.proportions.slice(0, 4).join(" | "));
}

async function auditThemeContract(theme, label) {
  const previous = await page.evaluate(() => document.documentElement.dataset.theme || "");
  await page.evaluate((nextTheme) => { document.documentElement.dataset.theme = nextTheme; }, theme);
  await page.waitForTimeout(80);

  const report = await page.evaluate((currentTheme) => {
    const root = getComputedStyle(document.documentElement);
    const expected = currentTheme === "dark"
      ? {
          "--paper": "#07101d",
          "--surface": "#0b1728",
          "--surface-2": "#10213a",
          "--blue": "#5fa8ff",
          "--blue-strong": "#2f6bff",
          "--orange": "#ff7a1a",
          "--ink": "#f8fafc",
          "--ink-soft": "#a8b3c7",
          "--line": "#1e3350"
        }
      : {
          "--paper": "#f5f8fc",
          "--surface": "#ffffff",
          "--surface-2": "#eef4fb",
          "--blue": "#2f6bff",
          "--blue-strong": "#2454c9",
          "--orange": "#e96d16",
          "--ink": "#102038",
          "--ink-soft": "#66758c",
          "--line": "#d9e4f0"
        };

    const rgb = (value) => {
      const probe = document.createElement("span");
      probe.style.color = value;
      document.body.appendChild(probe);
      const computed = getComputedStyle(probe).color;
      probe.remove();
      const parts = computed.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [];
      return parts.length === 3 ? parts : null;
    };
    const luminance = (triplet) => {
      const channels = triplet.map((value) => {
        const v = value / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const contrast = (a, b) => {
      const ra = rgb(a);
      const rb = rgb(b);
      if (!ra || !rb) return 0;
      const la = luminance(ra);
      const lb = luminance(rb);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };

    const mismatches = [];
    for (const [token, value] of Object.entries(expected)) {
      const actual = root.getPropertyValue(token).trim().toLowerCase();
      if (actual !== value) mismatches.push(`${token}=${actual || "∅"} esperado=${value}`);
    }

    const ink = root.getPropertyValue("--ink").trim();
    const soft = root.getPropertyValue("--ink-soft").trim();
    const paper = root.getPropertyValue("--paper").trim();
    const surface = root.getPropertyValue("--surface").trim();
    const blue = root.getPropertyValue("--blue").trim();
    const orange = root.getPropertyValue("--orange").trim();
    const contrastIssues = [];
    if (contrast(ink, paper) < 7) contrastIssues.push(`ink/paper=${contrast(ink, paper).toFixed(2)}`);
    if (contrast(ink, surface) < 7) contrastIssues.push(`ink/surface=${contrast(ink, surface).toFixed(2)}`);
    if (contrast(soft, paper) < 3) contrastIssues.push(`muted/paper=${contrast(soft, paper).toFixed(2)}`);

    const blueRgb = rgb(blue);
    const orangeRgb = rgb(orange);
    const accentDistance = blueRgb && orangeRgb
      ? Math.sqrt(blueRgb.reduce((sum, value, index) => sum + (value - orangeRgb[index]) ** 2, 0))
      : 0;
    if (accentDistance < 80) contrastIssues.push(`azul/naranja demasiado próximos=${accentDistance.toFixed(1)}`);

    return { mismatches, contrastIssues };
  }, theme);

  assertCheck(report.mismatches.length === 0, `Visual ${label} · paleta ${theme} canónica`, report.mismatches.slice(0, 5).join(" | "));
  assertCheck(report.contrastIssues.length === 0, `Visual ${label} · contraste ${theme}`, report.contrastIssues.slice(0, 5).join(" | "));

  await page.evaluate((oldTheme) => {
    if (oldTheme) document.documentElement.dataset.theme = oldTheme;
    else delete document.documentElement.dataset.theme;
  }, previous);
  await page.waitForTimeout(50);
}

async function openAreaForVisualAudit(areaId) {
  await closeDialogIfOpen();
  const exists = await page.locator(`[data-nav-area-id="${areaId}"]`).count();
  if (!exists) return false;
  await page.evaluate((id) => document.querySelector(`[data-nav-area-id="${id}"]`)?.click(), areaId);
  await page.waitForTimeout(areaId === "area-general" ? 250 : 650);
  return true;
}

async function auditWardrobeGridColumns(label, expectedColumns) {
  let tab = page.locator('[data-objects-tab="wardrobe"]').first();
  let available = await tab
    .waitFor({ state: "visible", timeout: 8000 })
    .then(() => true)
    .catch(() => false);

  if (!available) {
    const probe = await probeApi("/api/objects", `Armario ${label}`, { attempts: 2, waitMs: 900 });
    if (probe?.ok) {
      recoveredSourcePaths.add("/api/objects");
      info(`Visual ${label} · Armario`, "fuente recuperada; reabriendo Objetos antes de declarar fallo");
      await openAreaForVisualAudit("area-objects");
      tab = page.locator('[data-objects-tab="wardrobe"]').first();
      available = await tab
        .waitFor({ state: "visible", timeout: 8000 })
        .then(() => true)
        .catch(() => false);
    }
  }

  if (!available) {
    fail(`Visual ${label} · Armario visual disponible`, "falta pestaña wardrobe tras reintento de fuente y carga dinámica");
    return;
  }

  await tab.click();
  await page.waitForTimeout(300);

  const grid = page.locator(".wardrobe-visual-grid").first();
  const visible = await grid.isVisible().catch(() => false);
  if (!visible) {
    fail(`Visual ${label} · grid Armario visible`);
    return;
  }

  const layout = await grid.evaluate((node) => {
    const style = getComputedStyle(node);
    const tracks = String(style.gridTemplateColumns || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const cards = [...node.querySelectorAll(".wardrobe-card-visual")]
      .filter((card) => getComputedStyle(card).display !== "none");
    return {
      columns: tracks.length,
      cardCount: cards.length
    };
  });

  assertCheck(
    layout.columns === expectedColumns,
    `Visual ${label} · Armario ${expectedColumns} columnas`,
    `columnas=${layout.columns} prendas=${layout.cardCount}`
  );
  await auditVisualSnapshot(`${label} · Armario visual`);
}

async function auditResponsiveVisualLayout(navIds) {
  const originalViewport = page.viewportSize() || { width: 1440, height: 1100 };

  for (const profile of VISUAL_PROFILES) {
    await page.setViewportSize({ width: profile.width, height: profile.height });
    await openAreaForVisualAudit("area-general");
    await auditVisualSnapshot(`${profile.name} · Home`);

    const areas = profile.name === "tablet"
      ? ["area-finance", "area-health", "area-objects", "area-pantry", "area-projects"]
      : profile.name === "mobile"
        ? navIds
        : profile.name === "mobile-wide"
          ? ["area-objects"]
          : ["area-objects"];

    for (const areaId of areas) {
      if (!await openAreaForVisualAudit(areaId)) continue;
      await auditVisualSnapshot(`${profile.name} · ${areaId}`);
      if (areaId === "area-objects" && profile.wardrobeColumns) {
        await auditWardrobeGridColumns(profile.name, profile.wardrobeColumns);
      }
    }

    if (profile.name === "desktop" || profile.name === "mobile") {
      await openAreaForVisualAudit("area-general");
      await auditThemeContract("light", `${profile.name} · Home`);
      await auditThemeContract("dark", `${profile.name} · Home`);
    }
  }

  await closeDialogIfOpen();
  await page.setViewportSize(originalViewport);
  await openAreaForVisualAudit("area-general");
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
    if (options.visual !== false) {
      await auditVisualSnapshot(`desktop · ${label} · ${value}`);
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

  await auditMidasCompetition();

  const pantryProbe = await probeApi("/api/pantry", "API de Despensa");
  if (pantryProbe.ok && pantryProbe.body?.ok === true) {
    pass("API de Despensa", `HTTP ${pantryProbe.status}`);
  } else {
    deferredApiFailures.set("/api/pantry", { name: "API de Despensa", detail: `HTTP ${pantryProbe.status}` });
    info("API de Despensa · pendiente de revalidación", `HTTP ${pantryProbe.status}`);
  }

  const projectsProbe = await probeApi("/api/projects", "API de Proyectos");
  if (projectsProbe.ok && projectsProbe.body?.ok === true) {
    pass("API de Proyectos", `HTTP ${projectsProbe.status}`);
  } else {
    deferredApiFailures.set("/api/projects", { name: "API de Proyectos", detail: `HTTP ${projectsProbe.status}` });
    info("API de Proyectos · pendiente de revalidación", `HTTP ${projectsProbe.status}`);
  }

  const deltaProbe = await probeApi("/api/finance/delta?limit=1", "API Delta de Finanzas");
  if (deltaProbe.ok && deltaProbe.body?.ok === true) {
    pass("API Delta de Finanzas", `HTTP ${deltaProbe.status}`);
  } else {
    deferredApiFailures.set("/api/finance/delta", { name: "API Delta de Finanzas", detail: `HTTP ${deltaProbe.status}` });
    info("API Delta de Finanzas · pendiente de revalidación", `HTTP ${deltaProbe.status}`);
  }

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
  const legacyMomentRows = visibleRows.filter((item) => /^(postre|snack|cierre)\b/.test(menuMomentKey(item?.moment || "")));
  assertCheck(
    legacyMomentRows.length === 0,
    "Menú API pliega Postre/Snack/Cierre en su toma padre",
    legacyMomentRows.length ? legacyMomentRows.map((item) => `${item.date}:${item.moment}`).join(", ") : "sin momentos legacy"
  );

  const homeDayCount = await page.locator("#home-weekly-menu-content .home-weekly-menu-table-day[data-menu-date]").count();
  assertCheck(homeDayCount === dayGroups.length, "Home representa todos los días del menú", `UI=${homeDayCount} API=${dayGroups.length}`);

  const homeMomentLabels = await page.locator("#home-weekly-menu-content .home-weekly-menu-row-label span").allTextContents();
  const legacyUiMoments = homeMomentLabels.filter((label) => /^(postre|snack|cierre)\b/.test(menuMomentKey(label)));
  assertCheck(
    legacyUiMoments.length === 0,
    "Home no crea filas independientes Postre/Snack/Cierre",
    legacyUiMoments.length ? legacyUiMoments.join(", ") : "tomas canónicas"
  );

  for (const group of dayGroups) {
    const momentGroups = new Map();
    for (const item of group.items) {
      const key = menuMomentKey(item.moment || "Otro");
      if (!momentGroups.has(key)) momentGroups.set(key, []);
      momentGroups.get(key).push(item);
    }
    for (const [momentKey, items] of momentGroups.entries()) {
      const selector = `#home-weekly-menu-content .home-weekly-menu-table-cell[data-menu-date="${group.date}"][data-menu-moment="${momentKey}"]`;
      const cell = page.locator(selector);
      assertCheck(await cell.count() === 1, `Home tabla · ${group.date} · ${momentKey} tiene celda única`);
      if (await cell.count()) {
        const text = normalizeAuditValue(await cell.textContent().catch(() => ""));
        for (const item of items) {
          const expectedName = normalizeAuditValue(item.name || "");
          assertCheck(
            Boolean(expectedName) && text.includes(expectedName),
            `Home tabla conserva comida · ${group.date} · ${momentKey}`,
            expectedName
          );
        }
      }
    }
  }

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

    await auditVisualSnapshot(`desktop · ${areaId}`);

    if (areaId === "area-finance") {
      const sheetLink = page.locator(".account-transactions-sheet-link").first();
      const sheetLinkVisible = await sheetLink.isVisible().catch(() => false);
      assertCheck(sheetLinkVisible, "Finanzas · enlace al Sheet de movimientos visible");
      if (sheetLinkVisible) {
        const href = await sheetLink.getAttribute("href");
        const target = await sheetLink.getAttribute("target");
        assertCheck(
          href === "/api/source-link?target=finance-records",
          "Finanzas · enlace al Sheet usa resolver privado",
          String(href || "")
        );
        assertCheck(target === "_blank", "Finanzas · Sheet abre en pestaña nueva", String(target || ""));
      }

      await auditTabSet(
        "Finanzas · movimientos por cuenta",
        ".account-transactions-tabs [data-account-transactions-tab]",
        "accountTransactionsTab",
        (value) => `[data-account-transactions-panel="${value}"]`,
        {
          htmlDataName: "account-transactions-tab",
          attributeName: "account-transactions-tab",
          attr: "account-transactions-tab",
          settle: 120
        }
      );
    } else if (areaId === "area-pantry") {
      if (!(pantryProbe.ok && pantryProbe.body?.ok === true)) {
        info("Despensa · pestañas omitidas", "backend no saludable; fallo ya clasificado por API");
      } else await auditTabSet(
        "Despensa",
        "[data-pantry-view]",
        "pantryView",
        (value) => `[data-pantry-panel="${value}"]`,
        { htmlDataName: "pantry-view", attributeName: "pantry-view", attr: "pantry-view", settle: 180, sourcePath: "/api/pantry", timeout: 12000 }
      );
    } else if (areaId === "area-objects") {
      await auditTabSet(
        "Objetos",
        "[data-objects-tab]",
        "objectsTab",
        null,
        { htmlDataName: "objects-tab", attributeName: "objects-tab", attr: "objects-tab", settle: 180, sourcePath: "/api/objects", timeout: 12000 }
      );
    } else if (areaId === "area-projects") {
      if (!(projectsProbe.ok && projectsProbe.body?.ok === true)) {
        info("Proyectos · pestañas omitidas", "backend no saludable; fallo ya clasificado por API");
      } else await auditTabSet(
        "Proyectos",
        "[data-project-tab]",
        "projectTab",
        null,
        { htmlDataName: "project-tab", attributeName: "project-tab", attr: "project-tab", settle: 180, sourcePath: "/api/projects", timeout: 12000 }
      );
    } else if (areaId === "area-habits") {
      await auditTabSet(
        "Hábitos",
        "[data-habit-tab]",
        "habitTab",
        (value) => `[data-habit-panel="${value}"]`,
        { htmlDataName: "habit-tab", attributeName: "habit-tab", attr: "habit-tab", settle: 180, timeout: 12000 }
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
    const uiNutritionResponsePromise = page.waitForResponse((response) => {
      try {
        const url = new URL(response.url());
        return url.origin === auditOrigin && url.pathname === "/api/nutrition" && response.status() === 200;
      } catch {
        return false;
      }
    }, { timeout: 12000 }).catch(() => null);

    await healthLink.click();
    const uiNutritionResponse = await uiNutritionResponsePromise;
    const uiNutrition = uiNutritionResponse
      ? await uiNutritionResponse.json().catch(() => null)
      : null;

    await page.waitForFunction(() => {
      const dialog = document.querySelector("#detail-dialog");
      return Boolean(
        dialog?.open &&
        document.querySelector("#dialog-title")?.textContent?.trim() === "Salud" &&
        document.querySelectorAll("[data-health-tab]").length === 7
      );
    }, null, { timeout: 12000 });
    const healthTabs = ["overview", "medical", "gym", "nutrition", "recipes", "adherence", "menu"];
    const healthNutritionSnapshot = uiNutrition?.ok === true ? uiNutrition : nutrition.body;
    const expectedRecipeCount = Array.isArray(healthNutritionSnapshot?.recipes) ? healthNutritionSnapshot.recipes.length : 0;

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
      } else if (tab === "recipes") {
        await page.waitForFunction(
          (expected) => {
            const panel = document.querySelector('[data-health-panel="recipes"]');
            const text = (panel?.textContent || "").toLowerCase();
            return document.querySelectorAll('[data-health-panel="recipes"] .recipe-card').length === expected ||
              (expected === 0 && /recetario preparado/.test(text)) ||
              /no se ha podido cargar|temporalmente no disponible|error al cargar/.test(text);
          },
          expectedRecipeCount,
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
      if (tab === "recipes") {
        const recipeCount = await panel.locator(".recipe-card").count();
        assertCheck(
          recipeCount === expectedRecipeCount,
          "Salud · Recetas representa toda la fuente",
          `UI=${recipeCount} API=${expectedRecipeCount}`
        );

        const recipesWithPhotos = (Array.isArray(healthNutritionSnapshot?.recipes) ? healthNutritionSnapshot.recipes : [])
          .filter((recipe) => recipe?.photoUrl);
        for (const recipe of recipesWithPhotos) {
          const probe = await page.evaluate(async (src) => {
            const response = await fetch(src, { cache: "no-store", credentials: "same-origin" });
            const contentType = response.headers.get("content-type") || "";
            let body = null;
            if (!response.ok && contentType.includes("application/json")) {
              try { body = await response.json(); } catch {}
            }
            return { status: response.status, ok: response.ok, contentType, body };
          }, recipe.photoUrl);
          assertCheck(
            probe.ok && /^image\//i.test(probe.contentType),
            `Salud · foto receta ${recipe.id || recipe.name || "sin-id"} responde como imagen`,
            `HTTP ${probe.status} · ${probe.contentType || "sin content-type"}${probe.body?.code ? " · " + probe.body.code : ""}`
          );
        }

        const recipeImages = panel.locator(".recipe-card img");
        const recipeImageCount = await recipeImages.count();
        for (let imageIndex = 0; imageIndex < recipeImageCount; imageIndex += 1) {
          const image = recipeImages.nth(imageIndex);
          const src = await image.getAttribute("src");
          await image.scrollIntoViewIfNeeded().catch(() => {});
          const loaded = src
            ? await page.waitForFunction(
                (expectedSrc) => {
                  const candidate = [...document.querySelectorAll('[data-health-panel="recipes"] .recipe-card img')]
                    .find((node) => node.getAttribute("src") === expectedSrc);
                  return Boolean(candidate?.complete && candidate.naturalWidth > 0 && candidate.naturalHeight > 0);
                },
                src,
                { timeout: 6000 }
              ).then(() => true).catch(() => false)
            : false;
          assertCheck(loaded, "Salud · Recetas carga foto visible", src || "sin src");
        }
      }
      await auditVisualSnapshot(`desktop · Salud · ${tab}`);
    }

    const menuPanel = page.locator('[data-health-panel="menu"]');
    const uiDays = menuPanel.locator(".weekly-menu-day");
    const uiDayCount = await uiDays.count();

    const comparisonNutrition = uiNutrition?.ok === true ? uiNutrition : nutrition.body;
    const comparisonRows = Array.isArray(comparisonNutrition?.weeklyMenu)
      ? comparisonNutrition.weeklyMenu.filter(visibleMenuRow)
      : visibleRows;
    const comparisonDayGroups = groupDayRows(comparisonRows);
    if (uiNutrition?.ok === true) {
      info("Nutrición · snapshot UI capturado", `${comparisonRows.length} filas visibles`);
    } else {
      info("Nutrición · snapshot UI no capturado", "se usa snapshot API inicial");
    }

    assertCheck(
      uiDayCount === comparisonDayGroups.length,
      "Menú detallado representa todos los días",
      `UI=${uiDayCount} API_UI=${comparisonDayGroups.length}`
    );

    const objective = comparisonNutrition?.objective || {};
    for (let index = 0; index < Math.min(uiDayCount, comparisonDayGroups.length); index += 1) {
      const group = comparisonDayGroups[index];
      const uiDay = uiDays.nth(index);
      const mealCards = await uiDay.locator(".weekly-menu-meal").count();
      assertCheck(mealCards === group.momentCount, `Agrupación de tomas día ${index + 1}`, `UI=${mealCards} esperadas=${group.momentCount}`);

      const display = menuDisplayTotals(group.items, group.date, localDateKeyForAudit(), objective);
      const incomplete = !display.useConsumed && group.items.some((item) => item.kcal == null || item.protein == null);

      for (const [metric, value, target, selector] of [
        ["kcal", display.kcal, objective.kcal, ".weekly-menu-progress.kcal .nutrition-quality-meter"],
        ["protein", display.protein, objective.protein, ".weekly-menu-progress.protein .nutrition-quality-meter"]
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

  await auditResponsiveVisualLayout(navIds);

  await reconcileTransientSourceFailures();
  await revalidateRecoveredSources();
  // Revalidation itself can observe another transient 5xx before the UI retry succeeds.
  // Reconcile once more so recovered requests do not leave a stale network failure behind.
  await reconcileTransientSourceFailures();
  await resolveDeferredApiChecks();

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
