import { fetchIcloudCalendarSummary, hasIcloudCalendarConfig } from "./icloud-calendar.js";
import { fetchGoogleCalendarSummary, hasGoogleCalendarConfig, safeGoogleCalendarErrorCode } from "./google-calendar.js";
import { mergeCalendarSources } from "./calendar-federation.js";
import { fetchPantrySummary, hasPantryGoogleConfig, resolvePantrySpreadsheetId } from "./pantry.js";
import { fetchMercadonaReference } from "./mercadona.js";
import { fetchObjectsSummary, hasObjectsGoogleConfig, createObjectsLook } from "./objects.js";
import { ObjectsImageError, readObjectsImage, uploadObjectsImage } from "./objects-images.js";
import { readObjectsLookImage, renderObjectsLookImage, uploadObjectsLookImage } from "./look-images.js";
import { isObjectsBridgeAuthenticated } from "./objects-bridge-auth.js";
import { canonicalWeeklyMenuMoment, prepareWeeklyMenuRows } from "./weekly-menu.js";
import { fetchProjectsSummary, hasProjectsGoogleConfig } from "./projects.js";
import { fetchCareerSummary, hasCareerGoogleConfig } from "./career.js";
import { fetchHealthAdherence } from "./adherence.js";
import { readVision, saveVision, recordVisionReplacement } from "./vision.js";
import { fetchMidasDashboard, addPrivateGeneticDiary, fetchMidasResearch, fetchMidasWeeklyBootstrap, fetchMidasWorkflowHealth } from "./midas.js";
import { syncImportantEventRecords, fetchEventRecords, fetchEventHomeSummary, fetchEventDetail, fetchEventLedgerSnapshot, createEventRecord, updateEventRecord, appendEventFact, appendEventReference } from "./events.js";
import { hasEventsGoogleConfig, fetchEventsSheetSource, fetchEventSheetRecords, fetchEventSheetHomeSummary, fetchEventSheetDetail, syncCalendarEventsToEventsSheet, migrateLegacyEventLedgerToSheet, createEventSheetRecord, updateEventSheetRecord, appendEventSheetFact, appendEventSheetReference } from "./events-sheet.js";
import { handleShoppingSyncRequest } from "./shopping-sync.js";
import { fetchDeltaHistory, paginateDeltaOperations } from "./delta.js";
import { googleReadFetch } from "./google-read.js";
import { healthCoverageQuality, isHealthEnergyComparable, selectHealthEnergyRow } from "./health-energy-quality.js";
import {
  searchGymExerciseLibrary,
  getGymExerciseLibraryMeta,
  getGymLibraryExercise,
  getGymExerciseLinks,
  linkGymExercise,
  proxyGymExerciseMedia
} from "./gym-library.js";

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Content-Security-Policy": "default-src 'self'; connect-src 'self'; img-src 'self' data: https:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};

let googleTokenCache = { token: null, expiresAt: 0 };
let financeCache = { value: null, expiresAt: 0 };
let habitsCache = { value: null, expiresAt: 0 };
let healthCache = { value: null, expiresAt: 0, date: null };
let recipePhotoCache = { value: new Map(), expiresAt: 0 };
let recipePreviewCache = { value: new Map(), expiresAt: 0 };
let healthRecoveryImportStateReady = false;
let stateEventMaintenanceNextAt = 0;
let stateLegacyEventMigrationDone = false;
const STATE_EVENT_MAINTENANCE_MS = 5 * 60_000;

function withSecurityHeaders(response, extra = {}) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders)) headers.set(key, value);
  for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function json(payload, status = 200) {
  return withSecurityHeaders(
    new Response(JSON.stringify(payload), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    })
  );
}

function googleSpreadsheetUrl(spreadsheetId) {
  const id = String(spreadsheetId || "").trim();
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) throw new Error("INVALID_SHEET_ID");
  return "https://docs.google.com/spreadsheets/d/" + encodeURIComponent(id) + "/edit";
}

function googleSheetTabUrl(spreadsheetId, gid) {
  return googleSpreadsheetUrl(spreadsheetId) + "#gid=" + encodeURIComponent(String(gid));
}

async function resolvePrivateSourceLink(env, target) {
  if (target === "pantry-products") {
    const spreadsheetId = await resolvePantrySpreadsheetId(env, getGoogleAccessToken);
    return googleSheetTabUrl(spreadsheetId, 1001);
  }
  if (target === "health-foods") {
    if (!hasHealthGoogleConfig(env)) throw new Error("HEALTH_NOT_CONFIGURED");
    return googleSheetTabUrl(env.HEALTH_SHEET_ID, 1824624272);
  }
  if (target === "health-recipes") {
    if (!hasHealthGoogleConfig(env)) throw new Error("HEALTH_NOT_CONFIGURED");
    return googleSheetTabUrl(env.HEALTH_SHEET_ID, 1893702374);
  }
  if (target === "finance-records") {
    if (!hasFinanceGoogleConfig(env)) throw new Error("FINANCE_NOT_CONFIGURED");
    return googleSpreadsheetUrl(env.FINANCE_SHEET_ID);
  }
  throw new Error("INVALID_SOURCE_LINK_TARGET");
}

function normalizeCalendarMatchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isMedicalCalendarEvent(event) {
  const text = normalizeCalendarMatchText([event?.title, event?.locationRef, event?.location].filter(Boolean).join(" "));
  return /\bmedico\b|\bmedica\b|cita medica|doctor|doctora|hospital|clinica|cardiolog|urolog|alergolog|dentista|dental|dermatolog|traumatolog|fisioterap|oftalmolog|revision medica|analitica|consulta|psicolog|psiquiatr|otorrin|medicina/.test(text);
}

function safeIcloudErrorCode(error) {
  const message = String(error?.message || "");
  return /^ICLOUD_[A-Z0-9_]+$/.test(message) ? message : "ICLOUD_UNKNOWN";
}

async function withStateTimeout(promise, timeoutMs, label) {
  let timeoutId = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(label + "_TIMEOUT")), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
}

async function loadStateSource(enabled, label, loader, timeoutMs = 4500) {
  if (!enabled) return { status: "not-configured", value: null };
  try {
    const result = await withStateTimeout(Promise.resolve().then(loader), timeoutMs, label);
    return result || { status: "ok", value: null };
  } catch (error) {
    const message = String(error?.message || error);
    const timedOut = message.endsWith("_TIMEOUT");
    console.warn(label + " sync failed", message);
    return { status: timedOut ? "timeout" : "error", value: null };
  }
}

function scheduleStateEventMaintenance(ctx, env, currentState) {
  if (!ctx || typeof ctx.waitUntil !== "function" || !hasEventsGoogleConfig(env)) return;
  const now = Date.now();
  if (stateEventMaintenanceNextAt > now) return;
  stateEventMaintenanceNextAt = now + STATE_EVENT_MAINTENANCE_MS;

  const events = Array.isArray(currentState?.events) ? currentState.events : [];
  const rules = Array.isArray(currentState?.importantEventRules) ? currentState.importantEventRules : [];
  const finance = currentState?.financeSummary || {};

  ctx.waitUntil((async () => {
    if (!stateLegacyEventMigrationDone) {
      try {
        const legacy = await withStateTimeout(fetchEventLedgerSnapshot(env), 1500, "EventsLegacyRead");
        await withStateTimeout(
          migrateLegacyEventLedgerToSheet(env, getGoogleAccessToken, legacy),
          2500,
          "EventsLegacyMigration"
        );
        stateLegacyEventMigrationDone = true;
      } catch (error) {
        console.warn("Events legacy migration deferred", String(error?.message || error));
      }
    }

    try {
      await withStateTimeout(
        syncCalendarEventsToEventsSheet(env, getGoogleAccessToken, events, rules, finance),
        3000,
        "EventsSheetPersist"
      );
    } catch (error) {
      console.warn("Events Sheet persistence deferred", String(error?.message || error));
    }

    try {
      await withStateTimeout(
        syncImportantEventRecords(env, events, rules, finance),
        1200,
        "EventsD1Mirror"
      );
    } catch (error) {
      console.warn("Events D1 mirror deferred", String(error?.message || error));
    }
  })());
}

function hasGoogleOauthConfig(env) {
  return Boolean(
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_SECRET &&
    env.GOOGLE_REFRESH_TOKEN
  );
}

function hasFinanceGoogleConfig(env) {
  return Boolean(hasGoogleOauthConfig(env) && env.FINANCE_SHEET_ID);
}

function hasHabitQuestGoogleConfig(env) {
  return Boolean(hasGoogleOauthConfig(env) && env.HABITQUEST_SHEET_ID);
}

function hasHealthGoogleConfig(env) {
  return Boolean(hasGoogleOauthConfig(env) && env.HEALTH_SHEET_ID);
}

async function getGoogleAccessToken(env) {
  if (googleTokenCache.token && googleTokenCache.expiresAt > Date.now() + 60_000) {
    return googleTokenCache.token;
  }

  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: env.GOOGLE_REFRESH_TOKEN,
    grant_type: "refresh_token"
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error(`GOOGLE_TOKEN_${response.status}`);
  }

  const payload = await response.json();
  if (!payload.access_token) throw new Error("GOOGLE_TOKEN_MISSING");

  googleTokenCache = {
    token: payload.access_token,
    expiresAt: Date.now() + Math.max(60, Number(payload.expires_in || 3600) - 120) * 1000
  };
  return googleTokenCache.token;
}

async function fetchHealthRecipePhotoMeta(env, recipeId) {
  if (!hasHealthGoogleConfig(env)) return null;
  const cleanRecipeId = String(recipeId || "").trim();
  if (!cleanRecipeId || cleanRecipeId.length > 160) return null;

  if (recipePhotoCache.expiresAt <= Date.now()) {
    const token = await getGoogleAccessToken(env);
    const range = encodeURIComponent("Recetas!A1:O1000");
    const endpoint =
      "https://sheets.googleapis.com/v4/spreadsheets/" +
      encodeURIComponent(env.HEALTH_SHEET_ID) +
      "/values/" + range +
      "?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE";
    const response = await fetch(endpoint, { headers: { Authorization: "Bearer " + token } });
    if (!response.ok) throw new Error("HEALTH_RECIPE_PHOTOS_" + response.status);
    const rows = parseTableRows((await response.json())?.values || []);
    recipePhotoCache = {
      value: new Map(rows
        .map((row) => ({
          recipeId: String(row.recipe_id || "").trim(),
          fileId: String(row.foto_drive_file_id || "").trim(),
          mimeType: String(row.foto_mime_type || "").trim(),
          updatedAt: String(row.foto_updated_at || row.updated_at || "").trim()
        }))
        .filter((item) => item.recipeId && item.fileId)
        .map((item) => [item.recipeId, item])),
      expiresAt: Date.now() + 60_000
    };
  }

  return recipePhotoCache.value.get(cleanRecipeId) || null;
}

async function fetchHealthRecipePreview(env, recipeId) {
  if (!hasHealthGoogleConfig(env)) return null;
  const cleanRecipeId = String(recipeId || "").trim();
  if (!cleanRecipeId || cleanRecipeId.length > 160) return null;

  if (recipePreviewCache.expiresAt <= Date.now()) {
    const token = await getGoogleAccessToken(env);
    const range = encodeURIComponent("RecipeMedia!A1:H500");
    const endpoint =
      "https://sheets.googleapis.com/v4/spreadsheets/" +
      encodeURIComponent(env.HEALTH_SHEET_ID) +
      "/values/" + range +
      "?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE";
    const response = await googleReadFetch(
      endpoint,
      { headers: { Authorization: "Bearer " + token } },
      { attempts: 3, baseDelayMs: 180 }
    );
    if (!response.ok) {
      if (response.status === 400 || response.status === 404) return null;
      throw new Error("HEALTH_RECIPE_MEDIA_" + response.status);
    }
    const rows = parseTableRows((await response.json())?.values || []);
    recipePreviewCache = {
      value: new Map(rows
        .map((row) => ({
          recipeId: String(row.recipe_id || "").trim(),
          mimeType: String(row.mime_type || "").trim().toLowerCase(),
          base64: String(row.base64_preview || "").trim(),
          width: toNumber(row.width),
          height: toNumber(row.height),
          sha256: String(row.sha256 || "").trim(),
          updatedAt: String(row.updated_at || "").trim()
        }))
        .filter((item) => item.recipeId && item.base64)
        .map((item) => [item.recipeId, item])),
      expiresAt: Date.now() + 60_000
    };
  }

  return recipePreviewCache.value.get(cleanRecipeId) || null;
}

function decodeRecipePreview(preview) {
  const mimeType = String(preview?.mimeType || "").trim().toLowerCase();
  if (!/^image\/(jpeg|png|webp)$/.test(mimeType)) {
    throw new Error("INVALID_RECIPE_PREVIEW_TYPE");
  }
  const encoded = String(preview?.base64 || "").trim();
  if (!encoded || encoded.length > 1_500_000) {
    throw new Error("INVALID_RECIPE_PREVIEW_SIZE");
  }
  let binary;
  try {
    binary = atob(encoded);
  } catch {
    throw new Error("INVALID_RECIPE_PREVIEW_BASE64");
  }
  if (!binary.length || binary.length > 1_000_000) {
    throw new Error("INVALID_RECIPE_PREVIEW_BYTES");
  }
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return { bytes, mimeType };
}

async function serveHealthRecipePhoto(env, recipeId) {
  const preview = await fetchHealthRecipePreview(env, recipeId);
  if (preview) {
    try {
      const decoded = decodeRecipePreview(preview);
      return withSecurityHeaders(new Response(decoded.bytes, {
        status: 200,
        headers: {
          "Content-Type": decoded.mimeType,
          "Cache-Control": "private, max-age=300",
          "Content-Disposition": "inline",
          "X-Recipe-Image-Source": "sheet-preview"
        }
      }));
    } catch (error) {
      console.warn("Recipe preview decode failed", recipeId, String(error?.message || error));
    }
  }

  const meta = await fetchHealthRecipePhotoMeta(env, recipeId);
  if (!meta) return json({ ok: false, code: "RECIPE_PHOTO_NOT_FOUND" }, 404);
  if (!/^[A-Za-z0-9_-]{10,}$/.test(meta.fileId)) {
    return json({ ok: false, code: "INVALID_RECIPE_PHOTO_REF" }, 500);
  }

  const token = await getGoogleAccessToken(env);
  const response = await googleReadFetch(
    "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(meta.fileId) + "?alt=media&supportsAllDrives=true",
    { headers: { Authorization: "Bearer " + token } },
    { attempts: 3, baseDelayMs: 220 }
  );
  if (!response.ok) {
    if (response.status === 401) {
      return json({ ok: false, code: "RECIPE_PHOTO_DRIVE_AUTH_REQUIRED" }, 502);
    }
    if (response.status === 403) {
      return json({ ok: false, code: "RECIPE_PHOTO_DRIVE_FORBIDDEN" }, 502);
    }
    if (response.status === 404) {
      return json({ ok: false, code: "RECIPE_PHOTO_DRIVE_INACCESSIBLE" }, 404);
    }
    return json({ ok: false, code: "RECIPE_PHOTO_DRIVE_" + response.status }, 502);
  }

  const upstreamType = String(response.headers.get("Content-Type") || "").trim().toLowerCase();
  const declaredType = String(meta.mimeType || "").trim().toLowerCase();
  const contentType = upstreamType.startsWith("image/")
    ? upstreamType
    : declaredType.startsWith("image/")
      ? declaredType
      : null;
  if (!contentType) return json({ ok: false, code: "INVALID_RECIPE_PHOTO_TYPE" }, 415);

  return withSecurityHeaders(new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": "inline"
    }
  }));
}

function parseKeyValueRows(values = []) {
  const out = {};
  for (const row of values.slice(1)) {
    const key = String(row?.[0] ?? "").trim();
    if (!key) continue;
    out[key] = row?.[1] ?? null;
  }
  return out;
}

function parseTableRows(values = []) {
  if (!values.length) return [];
  const headers = values[0].map((value) => String(value ?? "").trim());
  return values.slice(1)
    .filter((row) => row.some((value) => value !== "" && value !== null && value !== undefined))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row?.[index] ?? null])));
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function moneyOrNull(value) {
  return toNumber(value);
}

function firstSheetValue(row, keys = []) {
  for (const key of keys) {
    if (row && row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return null;
}

function sheetDateOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const epoch = Date.UTC(1899, 11, 30);
    const date = new Date(epoch + value * 86400000);
    return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const es = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (es) return `${es[3]}-${String(es[2]).padStart(2, "0")}-${String(es[1]).padStart(2, "0")}`;
  const parsed = new Date(raw);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
}

function percentChange(current, previous) {
  const a = toNumber(current);
  const b = toNumber(previous);
  if (a === null || b === null || b === 0) return null;
  return ((a - b) / Math.abs(b)) * 100;
}

function buildElectricityHistory(rows = [], categories = [], currency = "EUR") {
  const parsed = parseTableRows(rows)
    .map((item, index) => {
      const periodStart = sheetDateOrNull(firstSheetValue(item, ["period_start", "periodo_inicio", "fecha_inicio", "desde"]));
      const periodEnd = sheetDateOrNull(firstSheetValue(item, ["period_end", "periodo_fin", "fecha_fin", "hasta"]));
      const invoiceDate = sheetDateOrNull(firstSheetValue(item, ["invoice_date", "fecha_factura", "fecha_emision"]));
      const chargeDate = sheetDateOrNull(firstSheetValue(item, ["charge_date", "fecha_cobro", "fecha_prevista_cobro", "cobro_previsto"]));
      const amount = moneyOrNull(firstSheetValue(item, ["amount_eur", "importe_eur", "importe", "total_eur", "total"]));
      const consumptionKwh = toNumber(firstSheetValue(item, ["consumption_kwh", "consumo_kwh", "kwh", "consumo"]));
      let days = toNumber(firstSheetValue(item, ["days", "dias", "dias_facturados"]));
      if (days === null && periodStart && periodEnd) {
        const start = new Date(periodStart + "T12:00:00Z");
        const end = new Date(periodEnd + "T12:00:00Z");
        if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())) {
          days = Math.max(1, Math.round((end - start) / 86400000) + 1);
        }
      }
      const eurPerDayRaw = toNumber(firstSheetValue(item, ["eur_per_day", "eur_day", "eur_dia", "euros_dia", "importe_dia"]));
      const kwhPerDayRaw = toNumber(firstSheetValue(item, ["kwh_per_day", "kwh_day", "kwh_dia", "consumo_dia"]));
      const pricePerKwh = toNumber(firstSheetValue(item, ["price_eur_kwh", "eur_kwh", "precio_kwh", "precio_energia_kwh"]));
      const tariff = firstSheetValue(item, ["tariff", "tarifa", "plan", "producto"]) == null
        ? null
        : String(firstSheetValue(item, ["tariff", "tarifa", "plan", "producto"])).trim();
      const sourceStatus = firstSheetValue(item, ["source_status", "estado_fuente", "status"]) == null
        ? null
        : String(firstSheetValue(item, ["source_status", "estado_fuente", "status"])).trim();
      const updatedAt = firstSheetValue(item, ["updated_at", "actualizado_en", "imported_at"]) == null
        ? null
        : String(firstSheetValue(item, ["updated_at", "actualizado_en", "imported_at"])).trim();
      const note = firstSheetValue(item, ["note", "nota", "observaciones"]) == null
        ? null
        : String(firstSheetValue(item, ["note", "nota", "observaciones"])).trim();
      const explicitAlert = firstSheetValue(item, ["alert", "alerta", "warning"]) == null
        ? null
        : String(firstSheetValue(item, ["alert", "alerta", "warning"])).trim();
      const sortDate = periodEnd || invoiceDate || chargeDate || periodStart || "";
      return {
        id: String(firstSheetValue(item, ["id", "invoice_id", "factura_id"]) || `electricity_${sortDate || index + 1}`),
        periodStart,
        periodEnd,
        invoiceDate,
        chargeDate,
        amount,
        consumptionKwh,
        days,
        eurPerDay: eurPerDayRaw ?? (amount !== null && days ? amount / days : null),
        kwhPerDay: kwhPerDayRaw ?? (consumptionKwh !== null && days ? consumptionKwh / days : null),
        pricePerKwh: pricePerKwh ?? (amount !== null && consumptionKwh ? amount / consumptionKwh : null),
        tariff,
        sourceStatus,
        updatedAt,
        note,
        explicitAlert,
        sortDate
      };
    })
    .filter((item) => item.amount !== null || item.consumptionKwh !== null)
    .sort((a, b) => String(a.sortDate).localeCompare(String(b.sortDate)));

  const byMonth = new Map();
  for (const item of parsed) {
    const key = String(item.periodEnd || item.invoiceDate || item.periodStart || "").slice(0, 7);
    if (key) byMonth.set(key, item);
  }

  for (const item of parsed) {
    const month = String(item.periodEnd || item.invoiceDate || item.periodStart || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      item.yearOverYear = { amountPct: null, consumptionPct: null };
      continue;
    }
    const year = Number(month.slice(0, 4));
    const previousKey = `${year - 1}-${month.slice(5, 7)}`;
    const previous = byMonth.get(previousKey) || null;
    item.yearOverYear = {
      amountPct: previous ? percentChange(item.amount, previous.amount) : null,
      consumptionPct: previous ? percentChange(item.consumptionKwh, previous.consumptionKwh) : null
    };
  }

  const alerts = [];
  parsed.forEach((item, index) => {
    if (item.explicitAlert) alerts.push({ type: "source", date: item.sortDate || null, message: item.explicitAlert });
    if (index === 0) return;
    const previous = parsed[index - 1];
    if (item.tariff && previous.tariff && item.tariff !== previous.tariff) {
      alerts.push({ type: "tariff", date: item.sortDate || null, message: "Cambio de tarifa detectado en la fuente derivada." });
    }
    const previousWindow = parsed.slice(Math.max(0, index - 6), index);
    const avgConsumption = previousWindow
      .map((row) => row.consumptionKwh)
      .filter((value) => value !== null)
      .reduce((acc, value, _, arr) => acc + value / arr.length, 0);
    if (item.consumptionKwh !== null && previousWindow.length >= 3 && avgConsumption > 0 && item.consumptionKwh > avgConsumption * 1.25) {
      alerts.push({ type: "consumption", date: item.sortDate || null, message: "Pico de consumo frente a los meses recientes." });
    }
    const avgPrice = previousWindow
      .map((row) => row.pricePerKwh)
      .filter((value) => value !== null)
      .reduce((acc, value, _, arr) => acc + value / arr.length, 0);
    if (item.pricePerKwh !== null && previousWindow.length >= 3 && avgPrice > 0 && item.pricePerKwh > avgPrice * 1.15) {
      alerts.push({ type: "price", date: item.sortDate || null, message: "Subida relevante del precio efectivo por kWh." });
    }
  });

  const latest = parsed.length ? parsed[parsed.length - 1] : null;
  const last12 = parsed.slice(-12);
  const amounts12 = last12.map((item) => item.amount).filter((value) => value !== null);
  const lightCategory = categories.find((item) => {
    const id = String(item.id || "").trim().toLocaleLowerCase("es");
    const title = String(item.title || "").trim().toLocaleLowerCase("es");
    return id === "luz" || title === "luz" || title.includes("electricidad") || id.includes("electric");
  }) || null;

  const budgeted = lightCategory?.budgeted ?? null;
  const spent = lightCategory?.spent ?? null;
  const committed = lightCategory?.committed ?? null;
  const remaining = lightCategory?.remaining ?? (
    budgeted !== null
      ? Number(budgeted || 0) - Number(spent || 0) - Number(committed || 0)
      : null
  );

  return {
    currency,
    history: parsed,
    latest,
    budget: lightCategory ? {
      categoryId: lightCategory.id || null,
      categoryTitle: lightCategory.title || "Luz",
      budgeted,
      spent,
      committed,
      remaining,
      sourceStatus: lightCategory.sourceStatus || null,
      updatedAt: lightCategory.updatedAt || null
    } : null,
    summary: {
      average12Amount: amounts12.length ? amounts12.reduce((sum, value) => sum + value, 0) / amounts12.length : null,
      maxHistoricalAmount: parsed.reduce((max, item) => item.amount !== null && (max === null || item.amount > max) ? item.amount : max, null),
      latestAmount: latest?.amount ?? null,
      latestConsumptionKwh: latest?.consumptionKwh ?? null,
      latestYearOverYearAmountPct: latest?.yearOverYear?.amountPct ?? null,
      latestYearOverYearConsumptionPct: latest?.yearOverYear?.consumptionPct ?? null
    },
    alerts: alerts.slice(-8).reverse(),
    source: {
      kind: "private-derived",
      name: "LuzHistorico",
      sourceOfTruth: "ASUNTOS v3.xlsx"
    }
  };
}

function formatPeriodLabel(start, end) {
  if (!start || !end) return null;
  const formatter = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });
  const a = new Date(`${start}T12:00:00Z`);
  const b = new Date(`${end}T12:00:00Z`);
  return `${formatter.format(a)} – ${formatter.format(b)}`.replaceAll(".", "");
}

function resolveCycleChargeDate(chargeDate, chargeDay, periodStart, periodEnd) {
  if (chargeDate) {
    const raw = String(chargeDate).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  }

  const day = Number(chargeDay);
  if (!Number.isFinite(day) || day < 1 || day > 31 || !periodStart || !periodEnd) return chargeDate || null;

  const parse = (value) => {
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
  };
  const start = parse(periodStart);
  const end = parse(periodEnd);
  if (!start || !end) return chargeDate || null;

  const makeDateKey = (year, month, requestedDay) => {
    const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const safeDay = Math.min(requestedDay, maxDay);
    return `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
  };

  const candidates = [];
  candidates.push(makeDateKey(start.year, start.month, day));
  if (start.year !== end.year || start.month !== end.month) {
    candidates.push(makeDateKey(end.year, end.month, day));
  }

  return candidates.find((candidate) => candidate >= periodStart && candidate <= periodEnd) || chargeDate || null;
}

function allocationPriorityRank(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "high") return 0;
  if (normalized === "normal" || normalized === "medium") return 1;
  if (normalized === "low") return 2;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 9;
}

async function fetchFinanceSummary(env) {
  if (!hasFinanceGoogleConfig(env)) {
    return { status: "not-configured", value: null };
  }

  if (financeCache.value && financeCache.expiresAt > Date.now()) {
    return { status: "ok-cache", value: financeCache.value };
  }

  const token = await getGoogleAccessToken(env);
  const ranges = ["Resumen!A1:B100", "Categorias!A1:K500", "Compromisos!A1:I500", "Deudas!A1:K500", "Patrimonio!A1:H500", "EventosImportantes!A1:G200", "GimnasioPlan!A1:N500", "Nutricion!A1:G500"];
  const params = new URLSearchParams();
  for (const range of ranges) params.append("ranges", range);
  params.set("majorDimension", "ROWS");
  params.set("valueRenderOption", "UNFORMATTED_VALUE");

  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.FINANCE_SHEET_ID)}/values:batchGet?${params.toString()}`;
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`GOOGLE_SHEETS_${response.status}`);
  }

  const payload = await response.json();
  const valueRanges = payload.valueRanges || [];
  const summaryRows = valueRanges[0]?.values || [];
  const categoryRows = valueRanges[1]?.values || [];
  const commitmentRows = valueRanges[2]?.values || [];
  const debtRows = valueRanges[3]?.values || [];
  const wealthRows = valueRanges[4]?.values || [];
  const importantEventRows = valueRanges[5]?.values || [];
  const gymPlanRows = valueRanges[6]?.values || [];
  const nutritionRows = valueRanges[7]?.values || [];

  async function fetchOptionalFinanceRows(range) {
    try {
      const optionalParams = new URLSearchParams({
        majorDimension: "ROWS",
        valueRenderOption: "UNFORMATTED_VALUE"
      });
      const encodedRange = encodeURIComponent(range);
      const optionalEndpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.FINANCE_SHEET_ID)}/values/${encodedRange}?${optionalParams.toString()}`;
      const optionalResponse = await fetch(optionalEndpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!optionalResponse.ok) {
        if (optionalResponse.status !== 400 && optionalResponse.status !== 404) {
          console.warn("Optional finance range read failed", range, "GOOGLE_SHEETS_" + optionalResponse.status);
        }
        return [];
      }
      return (await optionalResponse.json())?.values || [];
    } catch (error) {
      console.warn("Optional finance range read failed", range, String(error?.message || error));
      return [];
    }
  }

  const [
    accountRows,
    accountAllocationRows,
    wealthAllocationRows,
    wealthDailyRows,
    creditAccountRows,
    creditProductRows,
    creditHistoryRows,
    creditMovementRows,
    creditFutureRows,
    etoroAllocationRows,
    loanInvestmentBenchmarkRows,
    movementRows,
    giftRows
  ] = await Promise.all([
    fetchOptionalFinanceRows("Cuentas!A1:J200"),
    fetchOptionalFinanceRows("ReservasCuenta!A1:J500"),
    fetchOptionalFinanceRows("PatrimonioDetalle!A1:J500"),
    fetchOptionalFinanceRows("PatrimonioDiario!A1:M1000"),
    fetchOptionalFinanceRows("CuentasCredito!A1:R200"),
    fetchOptionalFinanceRows("ECIProductos!A1:R200"),
    fetchOptionalFinanceRows("ECIHistorico!A1:N300"),
    fetchOptionalFinanceRows("ECIMovimientos!A1:N300"),
    fetchOptionalFinanceRows("ECIFuturo!A1:O300"),
    fetchOptionalFinanceRows("EtoroAsignaciones!A1:M200"),
    fetchOptionalFinanceRows("PrestamoVsInversion!A1:X200"),
    fetchOptionalFinanceRows("MovimientosCuenta!A1:M5000"),
    fetchOptionalFinanceRows("Regalos!A1:P300")
  ]);

  let electricityRows = [];
  try {
    const electricityParams = new URLSearchParams({
      majorDimension: "ROWS",
      valueRenderOption: "UNFORMATTED_VALUE"
    });
    const electricityRange = encodeURIComponent("LuzHistorico!A1:Z1000");
    const electricityEndpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.FINANCE_SHEET_ID)}/values/${electricityRange}?${electricityParams.toString()}`;
    const electricityResponse = await fetch(electricityEndpoint, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (electricityResponse.ok) {
      electricityRows = (await electricityResponse.json())?.values || [];
    } else {
      console.warn("LuzHistorico read failed", "GOOGLE_SHEETS_" + electricityResponse.status);
    }
  } catch (error) {
    console.warn("LuzHistorico read failed", String(error?.message || error));
  }

  const summary = parseKeyValueRows(summaryRows);
  const categories = parseTableRows(categoryRows).map((item) => ({
    id: item.id || null,
    group: item.group || item.owner || "Común",
    owner: item.owner || item.group || "Común",
    title: item.title || item.id || "Partida",
    budgeted: moneyOrNull(item.budgeted),
    spent: moneyOrNull(item.spent),
    committed: moneyOrNull(item.committed),
    remaining: moneyOrNull(item.remaining),
    trackingMode: item.tracking_mode || "variable",
    sourceStatus: item.source_status || null,
    updatedAt: item.updated_at || null,
    note: item.note || null
  }));

  const electricity = buildElectricityHistory(electricityRows, categories, summary.currency || "EUR");

  const commitments = parseTableRows(commitmentRows).map((item) => ({
    id: item.id || null,
    title: item.title || item.id || "Compromiso",
    date: item.date || null,
    totalBudget: moneyOrNull(item.total_budget),
    reserved: moneyOrNull(item.reserved),
    needed: moneyOrNull(item.needed),
    currency: item.currency || summary.currency || "EUR",
    sourceStatus: item.source_status || null,
    note: item.note || null
  }));

  const debts = parseTableRows(debtRows).map((item) => ({
    id: item.id || null,
    title: item.title || item.id || "Deuda",
    balance: moneyOrNull(item.balance),
    monthlyPayment: moneyOrNull(item.monthly_payment),
    paymentDay: item.payment_day === "" || item.payment_day == null ? null : Number(item.payment_day),
    interestRate: item.interest_rate === "" || item.interest_rate == null ? null : Number(item.interest_rate),
    status: item.status || "active",
    owner: item.owner || null,
    sourceStatus: item.source_status || null,
    updatedAt: item.updated_at || null,
    note: item.note || null
  }));

  const debtSummaryRow = debts.find((item) =>
    item.id === "__summary__" || String(item.status || "").toLowerCase() === "summary"
  ) || null;
  const activeDebts = debts.filter((item) => {
    const status = String(item.status || "").toLowerCase();
    return status !== "closed" && status !== "summary" && item.id !== "__summary__";
  });
  const knownBalanceValues = activeDebts.map((item) => item.balance).filter((value) => value !== null);
  const knownPaymentValues = activeDebts.map((item) => item.monthlyPayment).filter((value) => value !== null);
  const debtSummary = {
    currency: summary.currency || "EUR",
    count: moneyOrNull(summary.debt_count) ?? activeDebts.length,
    totalBalance: moneyOrNull(summary.debt_total_balance) ?? debtSummaryRow?.balance ?? (
      knownBalanceValues.length === activeDebts.length && activeDebts.length
        ? knownBalanceValues.reduce((sum, value) => sum + value, 0)
        : null
    ),
    monthlyPayment: moneyOrNull(summary.debt_monthly_payment) ?? debtSummaryRow?.monthlyPayment ?? (
      knownPaymentValues.length
        ? knownPaymentValues.reduce((sum, value) => sum + value, 0)
        : null
    ),
    debts: activeDebts,
    sourceUpdatedAt: summary.debt_source_updated_at || null,
    sourceSummaryNote: debtSummaryRow?.note || null
  };

  const wealthHistory = parseTableRows(wealthRows)
    .map((item) => ({
      date: item.snapshot_date || null,
      period: item.period || null,
      salaryMiguel: moneyOrNull(item.salary_miguel),
      salaryAndrea: moneyOrNull(item.salary_andrea),
      salaryTotal: moneyOrNull(item.salary_total),
      patrimony: moneyOrNull(item.patrimony),
      sourceStatus: item.source_status || null,
      note: item.note || null
    }))
    .filter((item) => item.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const todayKey = new Date().toISOString().slice(0, 10);
  const currentWealth = [...wealthHistory]
    .reverse()
    .find((item) => item.date <= todayKey && item.patrimony !== null) || null;

  const accountAllocations = parseTableRows(accountAllocationRows)
    .map((item) => {
      const rawChargeDate = item.charge_date || item.due_date || item.billing_date || null;
      const rawChargeDay = item.charge_day || item.billing_day || null;
      return {
        accountId: item.account_id || item.account || null,
        label: item.label || item.title || item.reservation || "Reserva",
        amount: moneyOrNull(item.amount),
        status: item.status || "active",
        kind: item.kind || "reserved",
        priority: item.priority === "" || item.priority == null ? null : item.priority,
        note: item.note || null,
        chargeDate: resolveCycleChargeDate(rawChargeDate, rawChargeDay, summary.period_start, summary.period_end),
        chargeDay: rawChargeDay,
        cycleNote: item.cycle_note || null
      };
    })
    .filter((item) => {
      const status = String(item.status || "active").trim().toLowerCase();
      const terminal = new Set(["cancelled", "canceled", "released", "executed", "paid", "closed", "completed"]);
      return item.accountId && item.amount !== null && !terminal.has(status);
    });

  const liquidityAccounts = parseTableRows(accountRows)
    .map((item) => {
      const id = item.account_id || item.id || null;
      const balance = moneyOrNull(item.balance);
      const explicitFree = moneyOrNull(item.free_amount);
      const allocations = accountAllocations
        .filter((allocation) => allocation.accountId === id)
        .sort((a, b) => {
          const holdA = String(a.kind || "").toLowerCase() === "card_hold" ? 0 : 1;
          const holdB = String(b.kind || "").toLowerCase() === "card_hold" ? 0 : 1;
          if (holdA !== holdB) return holdA - holdB;
          const dateA = a.chargeDate || "9999-12-31";
          const dateB = b.chargeDate || "9999-12-31";
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          const priorityDiff = allocationPriorityRank(a.priority) - allocationPriorityRank(b.priority);
          if (priorityDiff !== 0) return priorityDiff;
          return String(a.label || "").localeCompare(String(b.label || ""), "es");
        });
      const reserved = allocations.reduce((sum, allocation) => sum + Math.max(0, allocation.amount || 0), 0);
      const free = explicitFree !== null
        ? explicitFree
        : balance !== null
          ? Math.max(0, balance - reserved)
          : null;
      return {
        id,
        name: item.name || item.account_name || id || "Cuenta",
        bank: item.bank || null,
        owner: item.owner || null,
        balance,
        free,
        reserved,
        currency: item.currency || summary.currency || "EUR",
        updatedAt: item.updated_at || null,
        note: item.note || null,
        allocations
      };
    })
    .filter((item) => item.id && item.balance !== null);

  const creditProducts = parseTableRows(creditProductRows)
    .map((item) => ({
      id: item.product_id || item.id || null,
      accountId: item.account_id || null,
      type: item.product_type || null,
      label: item.label || item.product_id || "Producto de crédito",
      department: item.department || null,
      economicOwner: item.economic_owner || null,
      status: item.status || "active",
      startDate: sheetDateOrNull(item.start_date),
      installmentCurrent: toNumber(item.installment_current),
      installmentTotal: toNumber(item.installment_total),
      monthlyPayment: moneyOrNull(item.monthly_payment),
      interestRate: toNumber(item.interest_rate),
      originalAmount: moneyOrNull(item.original_amount),
      remaining: moneyOrNull(item.remaining_after_sep_payment),
      lastDue: sheetDateOrNull(item.last_due),
      reimbursementMonthly: moneyOrNull(item.reimbursement_monthly),
      reimbursementRemaining: moneyOrNull(item.reimbursement_remaining),
      note: item.note || null
    }))
    .filter((item) => item.id && item.accountId);

  const creditHistory = parseTableRows(creditHistoryRows)
    .map((item) => ({
      dueDate: sheetDateOrNull(item.due_date),
      purchasePeriod: item.purchase_period || null,
      openingRevolving: moneyOrNull(item.opening_revolving),
      purchases: moneyOrNull(item.purchases),
      interest: moneyOrNull(item.interest),
      statementRevolving: moneyOrNull(item.statement_revolving),
      paymentRevolving: moneyOrNull(item.payment_revolving),
      closingRevolving: moneyOrNull(item.closing_revolving),
      purchaseDetail: item.purchase_detail || null,
      installmentReceipt: moneyOrNull(item.installment_receipt),
      installmentDetail: item.installment_detail || null,
      totalReceipt: moneyOrNull(item.total_receipt),
      sourceStatus: item.source_status || null,
      note: item.note || null
    }))
    .filter((item) => item.dueDate)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));

  const creditMovements = parseTableRows(creditMovementRows)
    .map((item) => ({
      id: item.movement_id || null,
      operationDate: sheetDateOrNull(item.operation_date),
      statementDue: sheetDateOrNull(item.statement_due),
      merchant: item.merchant || null,
      department: item.department || null,
      amount: moneyOrNull(item.amount),
      movementType: item.movement_type || null,
      financingBucket: item.financing_bucket || null,
      economicOwner: item.economic_owner || null,
      category: item.category || null,
      classificationStatus: item.classification_status || null,
      sourceFile: item.source_file || null,
      note: item.note || null,
      sourceStatus: item.source_status || null
    }))
    .filter((item) => item.id && item.operationDate)
    .sort((a, b) => String(a.operationDate).localeCompare(String(b.operationDate)));

  const creditFuture = parseTableRows(creditFutureRows)
    .map((item) => ({
      dueDate: sheetDateOrNull(item.due_date),
      componentId: item.component_id || null,
      label: item.label || item.component_id || "Componente",
      componentType: item.component_type || null,
      grossAmount: moneyOrNull(item.gross_amount),
      expectedReimbursement: moneyOrNull(item.expected_reimbursement),
      netHouseholdAmount: moneyOrNull(item.net_household_amount),
      installmentNo: toNumber(item.installment_no),
      installmentTotal: toNumber(item.installment_total),
      openingBalance: moneyOrNull(item.opening_balance),
      estimatedInterest: moneyOrNull(item.estimated_interest),
      closingBalance: moneyOrNull(item.closing_balance),
      status: item.status || null,
      assumption: item.assumption || null,
      note: item.note || null
    }))
    .filter((item) => item.dueDate && item.componentId)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));

  const creditAccounts = parseTableRows(creditAccountRows)
    .map((item) => {
      const id = item.account_id || item.id || null;
      return {
        id,
        name: item.name || id || "Cuenta de crédito",
        provider: item.provider || null,
        holder: item.holder || null,
        type: item.type || "credit",
        linkedPaymentAccount: item.linked_payment_account || null,
        status: item.status || "active",
        statementDay: toNumber(item.statement_day),
        grossPending: moneyOrNull(item.gross_pending_after_last_payment),
        revolvingBalance: moneyOrNull(item.revolving_balance),
        installmentBalance: moneyOrNull(item.installment_balance),
        expectedThirdPartyReimbursement: moneyOrNull(item.expected_third_party_reimbursement_remaining),
        netHouseholdExposure: moneyOrNull(item.net_household_exposure),
        estimatedNextReceipt: moneyOrNull(item.estimated_next_receipt),
        monthlyThirdPartyReimbursement: moneyOrNull(item.monthly_third_party_reimbursement),
        creditLimitEci: moneyOrNull(item.credit_limit_eci),
        creditLimitOther: moneyOrNull(item.credit_limit_other),
        updatedAt: item.updated_at || null,
        products: creditProducts.filter((product) => product.accountId === id)
      };
    })
    .filter((item) => item.id && String(item.status).toLowerCase() !== "closed");

  const accountTransactions = parseTableRows(movementRows)
    .map((item) => ({
      id: item.movement_id || null,
      accountId: item.account_id || null,
      operationDate: sheetDateOrNull(item.operation_date),
      valueDate: sheetDateOrNull(item.value_date),
      description: item.description_raw || item.description || null,
      amount: moneyOrNull(item.amount),
      balanceAfter: moneyOrNull(item.balance_after),
      currency: item.currency || summary.currency || "EUR",
      sourceSystem: item.source_system || null,
      sourceRow: toNumber(item.source_row),
      classification: item.classification || null,
      note: item.note || null
    }))
    .filter((item) => item.id && item.accountId && item.operationDate)
    .sort((a, b) => {
      const byDate = String(b.operationDate).localeCompare(String(a.operationDate));
      if (byDate !== 0) return byDate;
      return (a.sourceRow ?? 999999) - (b.sourceRow ?? 999999);
    })
    .slice(0, 320);

  const wealthAllocation = parseTableRows(wealthAllocationRows)
    .map((item) => ({
      id: item.id || item.platform || item.custodian || null,
      platform: item.platform || item.custodian || item.title || item.id || "Posición",
      amount: moneyOrNull(item.amount),
      assetClass: item.asset_class || item.type || null,
      currency: item.currency || summary.currency || "EUR",
      updatedAt: item.updated_at || null,
      note: item.note || null,
      status: item.status || "active"
    }))
    .filter((item) => item.id && item.amount !== null && String(item.status).toLowerCase() !== "closed");

  const wealthDailyDiary = parseTableRows(wealthDailyRows)
    .map((item) => ({
      date: item.date || null,
      patrimony: moneyOrNull(item.patrimony),
      currency: item.currency || null,
      changePct: item.change_pct === "" || item.change_pct == null ? null : Number(item.change_pct),
      pnlDay: moneyOrNull(item.pnl_day),
      movement: item.movement || null,
      action: item.action || null,
      comment: item.comment || null,
      events: item.events || null,
      source: item.source || null,
      sourceRow: item.source_row === "" || item.source_row == null ? null : Number(item.source_row),
      sourceStatus: item.source_status || null,
      capturedAt: item.captured_at || null
    }))
    .filter((item) => item.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const etoroAllocations = parseTableRows(etoroAllocationRows)
    .map((item) => ({
      id: item.allocation_id || null,
      label: item.label || item.allocation_id || "Bloque eToro",
      reservedAmount: moneyOrNull(item.reserved_amount),
      monthlyOut: moneyOrNull(item.monthly_out),
      nextWithdrawal: sheetDateOrNull(item.next_withdrawal),
      lastWithdrawal: sheetDateOrNull(item.last_withdrawal),
      status: item.status || "active",
      sourceBasis: item.source_basis || null,
      note: item.note || null,
      sortOrder: toNumber(item.sort_order),
      kind: item.kind || "earmarked",
      owner: item.owner || null,
      updatedAt: item.updated_at || null
    }))
    .filter((item) => item.id && item.reservedAmount !== null && String(item.status).toLowerCase() !== "closed")
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

  const loanInvestmentBenchmarks = parseTableRows(loanInvestmentBenchmarkRows)
    .map((item) => ({
      id: item.benchmark_id || null,
      label: item.label || item.benchmark_id || "Préstamo vs inversión",
      loanLabel: item.loan_label || null,
      investmentLabel: item.investment_label || null,
      startDate: sheetDateOrNull(item.start_date),
      throughDate: sheetDateOrNull(item.through_date),
      currency: item.currency || summary.currency || "EUR",
      tracedCapital: moneyOrNull(item.traced_capital),
      initialCosts: moneyOrNull(item.initial_costs),
      portfolioReturnPct: toNumber(item.portfolio_return_pct),
      portfolioAnnualizedPct: toNumber(item.portfolio_annualized_pct),
      loanTae: toNumber(item.loan_tae),
      loanEquivalentReturnPct: toNumber(item.loan_equiv_return_pct),
      grossSpreadPct: toNumber(item.gross_spread_pct),
      grossInvestmentGain: moneyOrNull(item.gross_investment_gain),
      netInvestmentGain: moneyOrNull(item.net_investment_gain),
      loanCostEquivalent: moneyOrNull(item.loan_cost_equivalent),
      netAdvantage: moneyOrNull(item.net_advantage),
      winner: item.winner || null,
      dataStatus: item.data_status || null,
      methodology: item.methodology || null,
      sourceBasis: item.source_basis || null,
      updatedAt: item.updated_at || null,
      note: item.note || null
    }))
    .filter((item) => item.id);

  const wealthSummary = {
    currency: summary.currency || "EUR",
    currentPatrimony: currentWealth?.patrimony ?? null,
    currentDate: currentWealth?.date ?? null,
    currentSalaryMiguel: currentWealth?.salaryMiguel ?? null,
    currentSalaryAndrea: currentWealth?.salaryAndrea ?? null,
    history: wealthHistory,
    allocation: wealthAllocation,
    dailyDiary: wealthDailyDiary,
    etoroAllocations,
    loanInvestmentBenchmarks
  };

  const giftRecords = parseTableRows(giftRows)
    .map((item) => ({
      id: item.record_id || item.id || null,
      year: toNumber(item.year),
      kind: item.kind || null,
      category: String(item.category || "").trim().toLowerCase() || null,
      period: item.period || null,
      eventDate: sheetDateOrNull(item.event_date),
      label: item.label || null,
      monthlySaved: moneyOrNull(item.monthly_saved),
      storedCumulative: moneyOrNull(item.stored_cumulative),
      annualTarget: moneyOrNull(item.annual_target),
      plannedAmount: moneyOrNull(item.planned_amount),
      paidAmount: moneyOrNull(item.paid_amount),
      status: item.status || null,
      sourceStatus: item.source_status || null,
      sourceRef: item.source_ref || null,
      note: item.note || null
    }))
    .filter((item) => item.id && item.kind);

  const giftYears = giftRecords
    .map((item) => Number(item.year))
    .filter((year) => Number.isFinite(year));
  const currentGiftYear = new Date().getUTCFullYear();
  const giftYear = giftYears.includes(currentGiftYear)
    ? currentGiftYear
    : giftYears.length
      ? Math.max(...giftYears)
      : currentGiftYear;
  const giftYearRows = giftRecords.filter((item) => Number(item.year) === giftYear);
  const giftNextYear = giftYear + 1;
  const giftNextYearRows = giftRecords.filter((item) => Number(item.year) === giftNextYear);
  const giftFundRows = giftYearRows
    .filter((item) => item.kind === "fund_month" && item.category)
    .sort((a, b) => String(a.period || "").localeCompare(String(b.period || "")));
  const giftWeddingRows = giftYearRows
    .filter((item) => item.kind === "wedding")
    .sort((a, b) => String(a.eventDate || "9999-12-31").localeCompare(String(b.eventDate || "9999-12-31")));
  const giftNextYearWeddingRows = giftNextYearRows
    .filter((item) => item.kind === "wedding")
    .sort((a, b) => String(a.eventDate || "9999-12-31").localeCompare(String(b.eventDate || "9999-12-31")));
  const monthKey = new Date().toISOString().slice(0, 7);
  const giftCategories = [...new Set(giftFundRows.map((item) => item.category).filter(Boolean))];
  const giftFunds = giftCategories.map((category) => {
    const rows = giftFundRows.filter((item) => item.category === category);
    const eligible = rows.filter((item) => !item.period || item.period <= monthKey);
    const latest = eligible.at(-1) || rows.at(-1) || null;
    const targetValues = rows.map((item) => item.annualTarget).filter((value) => value !== null);
    const target = targetValues.length ? Math.max(...targetValues) : null;
    const paid = category === "bodas"
      ? giftWeddingRows.reduce((sum, item) => sum + Math.max(0, item.paidAmount || 0), 0)
      : 0;
    const stored = latest?.storedCumulative ?? null;
    const available = stored === null ? null : Math.max(0, stored - paid);
    const pendingCash = String(latest?.status || "").toLowerCase() === "awaiting_cash"
      ? Math.max(0, latest?.plannedAmount || 0)
      : 0;
    return {
      category,
      stored,
      target,
      paid,
      available,
      pendingCash,
      projectedAvailable: available === null ? null : available + pendingCash,
      latestPeriod: latest?.period || null,
      latestStatus: latest?.status || null,
      latestPlannedAmount: latest?.plannedAmount ?? null,
      rows
    };
  });
  const giftPaidWeddings = giftWeddingRows.filter((item) =>
    String(item.status || "").toLowerCase() === "paid" || (item.paidAmount !== null && item.paidAmount > 0)
  );
  const giftUnreconciledWeddings = giftWeddingRows.filter((item) => !giftPaidWeddings.includes(item));
  const giftTargets = giftFunds
    .map((item) => item.target)
    .filter((value) => value !== null);
  const giftStored = giftFunds
    .map((item) => item.stored)
    .filter((value) => value !== null);
  const giftAvailable = giftFunds
    .map((item) => item.available)
    .filter((value) => value !== null);
  const giftPendingCash = giftFunds.reduce((sum, item) => sum + Math.max(0, item.pendingCash || 0), 0);
  const giftTotalPaid = giftPaidWeddings.reduce((sum, item) => sum + Math.max(0, item.paidAmount || 0), 0);
  const giftNextYearWeddingTarget = giftNextYearWeddingRows.reduce(
    (sum, item) => sum + Math.max(0, item.plannedAmount || 0),
    0
  );
  const giftSummary = {
    year: giftYear,
    currency: summary.currency || "EUR",
    funds: giftFunds,
    fundRows: giftFundRows,
    weddings: giftWeddingRows,
    paidWeddings: giftPaidWeddings,
    unreconciledWeddings: giftUnreconciledWeddings,
    nextYear: giftNextYear,
    nextYearWeddings: giftNextYearWeddingRows,
    nextYearWeddingTarget: giftNextYearWeddingTarget,
    totalTarget: giftFunds.length && giftTargets.length === giftFunds.length
      ? giftTargets.reduce((sum, value) => sum + value, 0)
      : null,
    totalStored: giftFunds.length && giftStored.length === giftFunds.length
      ? giftStored.reduce((sum, value) => sum + value, 0)
      : null,
    cashAvailable: giftFunds.length && giftAvailable.length === giftFunds.length
      ? giftAvailable.reduce((sum, value) => sum + value, 0)
      : null,
    pendingCash: giftPendingCash,
    projectedCash: giftFunds.length && giftAvailable.length === giftFunds.length
      ? giftAvailable.reduce((sum, value) => sum + value, 0) + giftPendingCash
      : null,
    totalPaidWeddings: giftTotalPaid,
    paidWeddingCount: giftPaidWeddings.length,
    weddingCount: giftWeddingRows.length,
    contributedTotal: giftFunds.length && giftStored.length === giftFunds.length
      ? giftStored.reduce((sum, value) => sum + value, 0)
      : null,
    sourceUpdatedAt: summary.updated_at || null
  };

  const importantEventRules = parseTableRows(importantEventRows)
    .map((item) => ({
      id: item.id || null,
      matchTerms: String(item.match_terms || "")
        .split("|")
        .map((term) => term.trim().toLocaleLowerCase("es"))
        .filter(Boolean),
      displayTitle: item.display_title || null,
      kind: item.kind || "important",
      enabled: String(item.enabled ?? "TRUE").toUpperCase() !== "FALSE",
      note: item.note || null,
      excludeTerms: String(item.exclude_terms || "")
        .split("|")
        .map((term) => term.trim().toLocaleLowerCase("es"))
        .filter(Boolean)
    }))
    .filter((item) => item.enabled && item.matchTerms.length);

  const gymRows = parseTableRows(gymPlanRows)
    .map((item) => ({
      dayId: item.day_id || null,
      dayOrder: toNumber(item.day_order),
      dayTitle: item.day_title || null,
      focus: item.focus || null,
      restSeconds: toNumber(item.rest_seconds),
      exerciseOrder: toNumber(item.exercise_order),
      exerciseId: item.exercise_id || null,
      exerciseName: item.exercise_name || null,
      setsTarget: toNumber(item.sets_target),
      repsTarget: item.reps_target == null ? null : String(item.reps_target),
      loadValue: toNumber(item.load_value),
      loadUnit: item.load_unit || null,
      loadNote: item.load_note || null,
      coachingNote: item.coaching_note || null
    }))
    .filter((item) => item.dayId && item.exerciseId && item.exerciseName);

  const gymDayMap = new Map();
  for (const row of gymRows) {
    if (!gymDayMap.has(row.dayId)) {
      gymDayMap.set(row.dayId, {
        id: row.dayId,
        order: row.dayOrder,
        title: row.dayTitle || row.dayId,
        focus: row.focus,
        restSeconds: row.restSeconds,
        exercises: []
      });
    }
    gymDayMap.get(row.dayId).exercises.push({
      id: row.exerciseId,
      order: row.exerciseOrder,
      name: row.exerciseName,
      setsTarget: row.setsTarget,
      repsTarget: row.repsTarget,
      loadValue: row.loadValue,
      loadUnit: row.loadUnit,
      loadNote: row.loadNote,
      coachingNote: row.coachingNote
    });
  }
  const gymPlan = [...gymDayMap.values()]
    .map((day) => ({
      ...day,
      exercises: day.exercises.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    }))
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  const nutritionPlan = parseTableRows(nutritionRows)
    .map((item) => ({
      section: item.section || null,
      order: toNumber(item.item_order),
      title: item.title || null,
      target: item.target || null,
      unit: item.unit || null,
      note: item.note || null,
      enabled: String(item.enabled ?? "TRUE").toUpperCase() !== "FALSE"
    }))
    .filter((item) => item.enabled && item.title);

  const miguelIncome = moneyOrNull(summary.miguel_income);
  const andreaIncome = moneyOrNull(summary.andrea_income);
  const commonBudget = moneyOrNull(summary.common_budget);
  const withSavings = moneyOrNull(summary.common_budget_with_savings);

  const value = {
    monthlyBudget: {
      period: summary.period_start && summary.period_end
        ? `${summary.period_start}/${summary.period_end}`
        : null,
      periodStart: summary.period_start || null,
      periodEnd: summary.period_end || null,
      periodLabel: formatPeriodLabel(summary.period_start, summary.period_end),
      currency: summary.currency || "EUR",
      income: miguelIncome !== null && andreaIncome !== null ? miguelIncome + andreaIncome : null,
      plannedOutflows: withSavings,
      commonBudget,
      personalNet: moneyOrNull(summary.miguel_net_free),
      miguelNet: moneyOrNull(summary.miguel_net_free),
      andreaNet: moneyOrNull(summary.andrea_net_free),
      jointNet: moneyOrNull(summary.joint_net_free),
      savingsTarget: commonBudget !== null && withSavings !== null ? withSavings - commonBudget : null,
      categories,
      liquidityAccounts
    },
    upcomingCommitments: commitments,
    electricity,
    debts: debtSummary,
    creditAccounts,
    creditHistory,
    creditMovements,
    creditFuture,
    accountTransactions,
    wealth: wealthSummary,
    gifts: giftSummary,
    importantEventRules,
    health: { gymPlan, nutritionPlan },
    source: {
      kind: "google-sheet-derived",
      status: summary.status || "DERIVADO",
      sourceOfTruth: summary.source_of_truth || "ASUNTOS v3.xlsx",
      intermediary: summary.intermediary || "GESTOR FINANZAS PERSONALES",
      updatedAt: summary.updated_at || null
    }
  };

  financeCache = {
    value,
    expiresAt: Date.now() + 30_000
  };
  return { status: "ok", value };
}


function habitDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function addHabitDays(dateKey, amount) {
  const date = new Date(`${dateKey}T12:00:00+02:00`);
  date.setDate(date.getDate() + amount);
  return habitDateKey(date);
}

function habitWeekday(dateKey) {
  return new Date(`${dateKey}T12:00:00+02:00`).getDay();
}

function habitIsScheduled(habit, dateKey) {
  if (!habit.active) return false;
  const weekday = habitWeekday(dateKey);
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "weekdays") return weekday >= 1 && weekday <= 5;
  return habit.days.includes(weekday);
}

function buildHabitStateMap(history, syncStates) {
  const stateMap = new Map();

  for (const completion of history) {
    const key = `${completion.habitId}|${completion.date}`;
    const existing = stateMap.get(key) || {
      habitId: completion.habitId,
      date: completion.date,
      count: 0,
      updatedAt: completion.at || `${completion.date}T12:00:00.000Z`
    };
    existing.count += 1;
    const timestamp = completion.at || `${completion.date}T12:00:00.000Z`;
    if (timestamp > existing.updatedAt) existing.updatedAt = timestamp;
    stateMap.set(key, existing);
  }

  for (const state of syncStates) {
    const key = `${state.habitId}|${state.date}`;
    const previous = stateMap.get(key);
    if (!previous || state.updatedAt >= previous.updatedAt) {
      stateMap.set(key, state);
    }
  }

  return stateMap;
}

function computeHabitStreak(stateMap, todayKey) {
  const completedDates = new Set(
    [...stateMap.values()]
      .filter((item) => Number(item.count) > 0)
      .map((item) => item.date)
  );

  let current = 0;
  for (let offset = 0; offset < 400; offset += 1) {
    const key = addHabitDays(todayKey, -offset);
    if (completedDates.has(key)) current += 1;
    else if (offset === 0) continue;
    else break;
  }

  let longest = 0;
  let run = 0;
  for (let offset = 400; offset >= 0; offset -= 1) {
    const key = addHabitDays(todayKey, -offset);
    if (completedDates.has(key)) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  return { current, longest: Math.max(current, longest) };
}

function habitLevelFromXp(xp) {
  const xpForLevel = (level) => {
    if (level <= 1) return 0;
    let total = 0;
    let step = 100;
    for (let current = 2; current <= level; current += 1) {
      total += step;
      step += 50;
    }
    return total;
  };

  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    currentLevelXp: xp - current,
    levelSpan: next - current,
    progress: next > current ? Math.min(1, Math.max(0, (xp - current) / (next - current))) : 0
  };
}

async function fetchHabitQuestSummary(env, options = {}) {
  if (!hasHabitQuestGoogleConfig(env)) {
    return { status: "not-configured", value: null };
  }

  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(String(options.date || ""))
    ? String(options.date)
    : habitDateKey();

  if (!options.force && habitsCache.value && habitsCache.expiresAt > Date.now() && habitsCache.value.date === dateKey) {
    return { status: "ok-cache", value: habitsCache.value };
  }

  const token = await getGoogleAccessToken(env);
  const ranges = ["Habits!A1:M1200", "History!A1:F6000", "Meta!A1:B100", "SyncState!A1:D6000"];
  const params = new URLSearchParams();
  for (const range of ranges) params.append("ranges", range);
  params.set("majorDimension", "ROWS");
  params.set("valueRenderOption", "UNFORMATTED_VALUE");

  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HABITQUEST_SHEET_ID)}/values:batchGet?${params.toString()}`;
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`HABITQUEST_SHEETS_${response.status}`);

  const payload = await response.json();
  const valueRanges = payload.valueRanges || [];
  const habitRows = parseTableRows(valueRanges[0]?.values || []);
  const historyRows = parseTableRows(valueRanges[1]?.values || []);
  const metaRows = valueRanges[2]?.values || [];
  const syncRows = parseTableRows(valueRanges[3]?.values || []);

  const habits = habitRows.map((item) => ({
    id: String(item.id || "").trim(),
    name: String(item.name || "").trim(),
    icon: String(item.icon || "✓"),
    category: String(item.category || "personal"),
    frequency: String(item.frequency || "daily"),
    days: String(item.days || "")
      .split(/[,;\s]+/)
      .map(Number)
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
    reminder: String(item.reminder || ""),
    difficulty: String(item.difficulty || "easy"),
    xpReward: Math.max(0, Number(item.xpReward) || 0),
    timesPerDay: Math.max(1, Number(item.timesPerDay) || 1),
    active: String(item.active || "yes").toLowerCase() !== "no",
    archivedAt: item.archivedAt || null,
    createdAt: item.createdAt || null
  })).filter((habit) => habit.id && habit.name);

  const history = historyRows
    .map((item) => ({
      id: String(item.id || "").trim(),
      habitId: String(item.habitId || "").trim(),
      habitName: String(item.habitName || "").trim(),
      date: String(item.date || "").trim(),
      at: String(item.at || "").trim() || null,
      xpEarned: Math.max(0, Number(item.xpEarned) || 0)
    }))
    .filter((item) => item.habitId && /^\d{4}-\d{2}-\d{2}$/.test(item.date));

  const syncStates = syncRows
    .map((item) => ({
      habitId: String(item.habitId || "").trim(),
      date: String(item.date || "").trim(),
      count: Math.max(0, Math.floor(Number(item.count) || 0)),
      updatedAt: String(item.updatedAt || "").trim()
    }))
    .filter((item) => item.habitId && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.updatedAt);

  const stateMap = buildHabitStateMap(history, syncStates);
  const habitById = new Map(habits.map((habit) => [habit.id, habit]));
  const scheduled = habits.filter((habit) => habitIsScheduled(habit, dateKey));
  const todayHabits = scheduled.map((habit) => {
    const state = stateMap.get(`${habit.id}|${dateKey}`);
    const count = Math.max(0, Number(state?.count) || 0);
    return {
      ...habit,
      count,
      target: habit.timesPerDay,
      done: count >= habit.timesPerDay,
      updatedAt: state?.updatedAt || null
    };
  });

  let xp = 0;
  for (const item of stateMap.values()) {
    const habit = habitById.get(item.habitId);
    if (!habit || item.count <= 0) continue;
    xp += item.count * habit.xpReward;
  }

  const streak = computeHabitStreak(stateMap, dateKey);
  const meta = parseKeyValueRows(metaRows);
  let user = {};
  try {
    const parsed = JSON.parse(String(meta.user || "{}"));
    user = {
      name: parsed.name || "Miguel",
      avatar: parsed.avatar || "✓",
      streakFreezes: Number(parsed.streakFreezes) || 0,
      habitView: parsed.habitView || "compact",
      habitSort: parsed.habitSort || "manual"
    };
  } catch {}

  const activeHabits = habits.filter((habit) => habit.active);
  const progress = activeHabits.map((habit) => {
    let scheduledDays = 0;
    let completedDays = 0;
    const points = [];
    for (let offset = 59; offset >= 0; offset -= 1) {
      const key = addHabitDays(dateKey, -offset);
      if (!habitIsScheduled(habit, key)) continue;
      scheduledDays += 1;
      const count = Math.max(0, Number(stateMap.get(`${habit.id}|${key}`)?.count) || 0);
      const done = count >= habit.timesPerDay;
      if (done) completedDays += 1;
      points.push({ date: key, count, target: habit.timesPerDay, done });
    }

    let totalCompletions = 0;
    for (const item of stateMap.values()) {
      if (item.habitId === habit.id) totalCompletions += Math.max(0, Number(item.count) || 0);
    }

    let currentStreak = 0;
    for (let offset = 0; offset < 400; offset += 1) {
      const key = addHabitDays(dateKey, -offset);
      const count = Math.max(0, Number(stateMap.get(`${habit.id}|${key}`)?.count) || 0);
      if (count > 0) currentStreak += 1;
      else if (offset === 0) continue;
      else break;
    }

    return {
      id: habit.id,
      name: habit.name,
      icon: habit.icon,
      category: habit.category,
      scheduledDays,
      completedDays,
      rate: scheduledDays ? completedDays / scheduledDays : 0,
      totalCompletions,
      currentStreak,
      points
    };
  });

  const doneByDate = new Map();
  for (const item of stateMap.values()) {
    const habit = habitById.get(item.habitId);
    if (!habit || !habit.active || Number(item.count) < Math.max(1, Number(habit.timesPerDay) || 1)) continue;
    if (!doneByDate.has(item.date)) doneByDate.set(item.date, new Set());
    doneByDate.get(item.date).add(item.habitId);
  }

  const mondayOffset = (habitWeekday(dateKey) + 6) % 7;
  const weekLabels = ["L", "M", "X", "J", "V", "S", "D"];
  const weekly = weekLabels.map((label, index) => {
    const key = addHabitDays(dateKey, index - mondayOffset);
    const scheduledForDay = activeHabits.filter((habit) => habitIsScheduled(habit, key));
    const doneSet = doneByDate.get(key) || new Set();
    const done = scheduledForDay.filter((habit) => doneSet.has(habit.id)).length;
    return {
      label,
      date: key,
      scheduled: scheduledForDay.length,
      done,
      rate: scheduledForDay.length ? Math.min(1, done / scheduledForDay.length) : 0,
      future: key > dateKey
    };
  });

  let scheduled90 = 0;
  let done90 = 0;
  for (let offset = 0; offset < 90; offset += 1) {
    const key = addHabitDays(dateKey, -offset);
    const scheduledForDay = activeHabits.filter((habit) => habitIsScheduled(habit, key));
    scheduled90 += scheduledForDay.length;
    const doneSet = doneByDate.get(key) || new Set();
    done90 += scheduledForDay.filter((habit) => doneSet.has(habit.id)).length;
  }
  const completionRate = scheduled90 ? done90 / scheduled90 : 0;

  const toSunday = 6 - mondayOffset;
  const heatMonths = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const heat = Array.from({ length: 35 }, (_, index) => {
    const key = addHabitDays(dateKey, toSunday - (34 - index));
    const scheduledForDay = activeHabits.filter((habit) => habitIsScheduled(habit, key));
    const doneSet = doneByDate.get(key) || new Set();
    const done = scheduledForDay.filter((habit) => doneSet.has(habit.id)).length;
    const date = new Date(`${key}T12:00:00+02:00`);
    return {
      date: key,
      day: date.getDate(),
      month: heatMonths[date.getMonth()] || "",
      label: key,
      firstOfMonth: date.getDate() === 1,
      future: key > dateKey,
      level: scheduledForDay.length ? Math.min(1, done / scheduledForDay.length) : 0,
      done
    };
  });

  let totalCompletions = 0;
  for (const item of stateMap.values()) totalCompletions += Math.max(0, Number(item.count) || 0);

  let morning = 0;
  let night = 0;
  for (const item of history) {
    const finalState = stateMap.get(`${item.habitId}|${item.date}`);
    if (!finalState || Number(finalState.count) <= 0) continue;
    const habit = habitById.get(item.habitId);
    const fallbackHour = Number(String(habit?.reminder || "12:00").split(":")[0] || 12);
    const parsedHour = item.at
      ? Number(new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Madrid",
          hour: "2-digit",
          hour12: false,
          hourCycle: "h23"
        }).format(new Date(item.at)))
      : fallbackHour;
    if (parsedHour < 10) morning += 1;
    if (parsedHour >= 20) night += 1;
  }

  let perfectRun = 0;
  for (let offset = 1; offset <= 60; offset += 1) {
    const key = addHabitDays(dateKey, -offset);
    const scheduledForDay = activeHabits.filter((habit) => habitIsScheduled(habit, key));
    const doneSet = doneByDate.get(key) || new Set();
    if (scheduledForDay.length > 0 && scheduledForDay.every((habit) => doneSet.has(habit.id))) perfectRun += 1;
    else break;
  }

  const achievementDefs = [
    ["first-step", 1, totalCompletions],
    ["on-fire", 7, Math.max(streak.current, streak.longest)],
    ["unstoppable", 30, Math.max(streak.current, streak.longest)],
    ["century", 100, totalCompletions],
    ["early-bird", 7, morning],
    ["night-owl", 7, night],
    ["perfect-week", 7, perfectRun],
    ["half-k", 500, totalCompletions]
  ];
  const achievements = achievementDefs.map(([id, target, rawValue]) => ({
    id,
    target,
    value: Math.min(Number(rawValue) || 0, Number(target) || 0),
    unlocked: Number(rawValue) >= Number(target)
  }));
  const achievementsUnlocked = achievements.filter((item) => item.unlocked).length;
  const bestHabit = [...progress].sort((a, b) => b.rate - a.rate || b.totalCompletions - a.totalCompletions)[0] || null;
  const value = {
    date: dateKey,
    user,
    habits,
    todayHabits,
    summary: {
      total: todayHabits.length,
      done: todayHabits.filter((habit) => habit.done).length,
      xp,
      level: habitLevelFromXp(xp),
      streak: streak.current,
      longestStreak: streak.longest,
      completionRate,
      totalCompletions
    },
    progress,
    insights: {
      weekly,
      heat,
      completionRate,
      totalCompletions,
      bestHabit,
      achievements,
      achievementsUnlocked
    },
    source: {
      kind: "google-sheet",
      title: "HabitQuest Data",
      updatedAt: [meta.updatedAt, ...todayHabits.map((item) => item.updatedAt).filter(Boolean)]
        .filter(Boolean)
        .sort()
        .at(-1) || null
    }
  };

  habitsCache = { value, expiresAt: Date.now() + 15_000 };
  return { status: "ok", value };
}

async function toggleHabitQuest(request, env) {
  if (!hasHabitQuestGoogleConfig(env)) {
    return json({ ok: false, code: "HABITQUEST_NOT_CONFIGURED" }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, code: "INVALID_JSON" }, 400);
  }

  const habitId = String(payload?.habitId || "").trim();
  const date = String(payload?.date || "").trim();
  if (!habitId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ ok: false, code: "INVALID_HABIT_ACTION" }, 400);
  }

  const current = await fetchHabitQuestSummary(env, { date, force: true });
  const habit = current.value?.habits?.find((item) => item.id === habitId);
  const todayHabit = current.value?.todayHabits?.find((item) => item.id === habitId);
  if (!habit) return json({ ok: false, code: "HABIT_NOT_FOUND" }, 404);
  if (!todayHabit) return json({ ok: false, code: "HABIT_NOT_SCHEDULED" }, 409);

  const currentCount = Math.max(0, Number(todayHabit.count) || 0);
  const target = Math.max(1, Number(habit.timesPerDay) || 1);
  const nextCount = currentCount >= target ? 0 : currentCount + 1;
  const updatedAt = new Date().toISOString();

  const token = await getGoogleAccessToken(env);
  const range = encodeURIComponent("SyncState!A:D");
  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HABITQUEST_SHEET_ID)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values: [[habitId, date, nextCount, updatedAt]] })
  });

  if (!response.ok) throw new Error(`HABITQUEST_WRITE_${response.status}`);

  habitsCache = { value: null, expiresAt: 0 };
  const refreshed = await fetchHabitQuestSummary(env, { date, force: true });
  return json({
    ok: true,
    habitId,
    date,
    previousCount: currentCount,
    count: nextCount,
    summary: refreshed.value
  });
}


const HABITQUEST_HABIT_HEADER = [
  "id", "name", "icon", "category", "frequency", "days", "reminder",
  "difficulty", "xpReward", "timesPerDay", "active", "archivedAt", "createdAt"
];
const HABITQUEST_HISTORY_HEADER = ["id", "habitId", "habitName", "date", "at", "xpEarned"];
const HABITQUEST_SYNC_HEADER = ["habitId", "date", "count", "updatedAt"];
const HABITQUEST_CATEGORIES = new Set([
  "fitness", "learning", "mind", "work", "finance", "health", "sleep", "creativity", "social", "personal"
]);
const HABITQUEST_DIFFICULTY_XP = { easy: 10, medium: 20, hard: 30 };

async function fetchHabitQuestTables(env) {
  const token = await getGoogleAccessToken(env);
  const ranges = ["Habits!A1:M1200", "History!A1:F6000", "Meta!A1:B100", "SyncState!A1:D6000"];
  const params = new URLSearchParams();
  for (const range of ranges) params.append("ranges", range);
  params.set("majorDimension", "ROWS");
  params.set("valueRenderOption", "UNFORMATTED_VALUE");

  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HABITQUEST_SHEET_ID)}/values:batchGet?${params.toString()}`;
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`HABITQUEST_SHEETS_${response.status}`);

  const payload = await response.json();
  const valueRanges = payload.valueRanges || [];
  return {
    token,
    habits: parseTableRows(valueRanges[0]?.values || []),
    history: parseTableRows(valueRanges[1]?.values || []),
    metaRows: valueRanges[2]?.values || [],
    syncStates: parseTableRows(valueRanges[3]?.values || [])
  };
}

function normalizeHabitQuestDays(value) {
  const raw = Array.isArray(value) ? value : String(value || "").split(/[,;\s]+/);
  return [...new Set(raw.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    .sort((a, b) => a - b);
}

function normalizeHabitQuestInput(input = {}, existing = null) {
  const name = String(input.name ?? existing?.name ?? "").trim().slice(0, 120);
  if (!name) throw new Error("HABIT_NAME_REQUIRED");

  const frequencyRaw = String(input.frequency ?? existing?.frequency ?? "daily");
  const frequency = ["daily", "weekdays", "custom"].includes(frequencyRaw) ? frequencyRaw : "daily";
  const difficultyRaw = String(input.difficulty ?? existing?.difficulty ?? "medium");
  const difficulty = ["easy", "medium", "hard"].includes(difficultyRaw) ? difficultyRaw : "medium";
  const categoryRaw = String(input.category ?? existing?.category ?? "personal");
  const category = HABITQUEST_CATEGORIES.has(categoryRaw) ? categoryRaw : "personal";
  const reminderRaw = String(input.reminder ?? existing?.reminder ?? "").trim();
  const reminder = /^\d{2}:\d{2}$/.test(reminderRaw) ? reminderRaw : "";
  const timesPerDay = Math.min(12, Math.max(1, Math.floor(Number(input.timesPerDay ?? existing?.timesPerDay ?? 1) || 1)));
  const icon = String(input.icon ?? existing?.icon ?? "✓").trim().slice(0, 8) || "✓";
  const days = normalizeHabitQuestDays(input.days ?? existing?.days ?? []);

  return {
    id: String(existing?.id || input.id || `sc-${crypto.randomUUID().slice(0, 8)}`),
    name,
    icon,
    category,
    frequency,
    days,
    reminder,
    difficulty,
    xpReward: HABITQUEST_DIFFICULTY_XP[difficulty],
    timesPerDay,
    active: input.active === undefined ? (existing?.active !== false) : Boolean(input.active),
    archivedAt: input.archivedAt === undefined ? (existing?.archivedAt || null) : (input.archivedAt || null),
    createdAt: String(existing?.createdAt || input.createdAt || habitDateKey())
  };
}

function habitQuestRowToHabit(item) {
  return {
    id: String(item.id || "").trim(),
    name: String(item.name || "").trim(),
    icon: String(item.icon || "✓"),
    category: String(item.category || "personal"),
    frequency: String(item.frequency || "daily"),
    days: normalizeHabitQuestDays(item.days),
    reminder: String(item.reminder || ""),
    difficulty: String(item.difficulty || "medium"),
    xpReward: Math.max(0, Number(item.xpReward) || 0),
    timesPerDay: Math.max(1, Number(item.timesPerDay) || 1),
    active: String(item.active || "yes").toLowerCase() !== "no",
    archivedAt: item.archivedAt || null,
    createdAt: item.createdAt || habitDateKey()
  };
}

function habitQuestHabitRow(habit) {
  return [
    habit.id,
    habit.name,
    habit.icon,
    habit.category,
    habit.frequency,
    (habit.days || []).join(","),
    habit.reminder || "",
    habit.difficulty,
    String(habit.xpReward),
    String(habit.timesPerDay),
    habit.active ? "yes" : "no",
    habit.archivedAt || "",
    habit.createdAt
  ];
}

function habitQuestHistoryRow(item) {
  return [
    item.id || "",
    item.habitId || "",
    item.habitName || "",
    item.date || "",
    item.at || "",
    String(item.xpEarned ?? "")
  ];
}

function habitQuestSyncRow(item) {
  return [
    item.habitId || "",
    item.date || "",
    String(item.count ?? 0),
    item.updatedAt || ""
  ];
}

async function rewriteHabitQuestRanges(env, token, { habits, history = null, syncStates = null, updatedAt }) {
  const clearRanges = ["Habits!A2:M1200"];
  const data = [{
    range: "Habits!A1",
    majorDimension: "ROWS",
    values: [HABITQUEST_HABIT_HEADER, ...habits.map(habitQuestHabitRow)]
  }];

  if (history) {
    clearRanges.push("History!A2:F6000");
    data.push({
      range: "History!A1",
      majorDimension: "ROWS",
      values: [HABITQUEST_HISTORY_HEADER, ...history.map(habitQuestHistoryRow)]
    });
  }

  if (syncStates) {
    clearRanges.push("SyncState!A2:D6000");
    data.push({
      range: "SyncState!A1",
      majorDimension: "ROWS",
      values: [HABITQUEST_SYNC_HEADER, ...syncStates.map(habitQuestSyncRow)]
    });
  }

  const clearResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HABITQUEST_SHEET_ID)}/values:batchClear`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ranges: clearRanges })
    }
  );
  if (!clearResponse.ok) throw new Error(`HABITQUEST_CLEAR_${clearResponse.status}`);

  data.push({
    range: "Meta!B3",
    majorDimension: "ROWS",
    values: [[updatedAt]]
  });

  const writeResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HABITQUEST_SHEET_ID)}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        valueInputOption: "RAW",
        data
      })
    }
  );
  if (!writeResponse.ok) throw new Error(`HABITQUEST_MANAGE_WRITE_${writeResponse.status}`);
}

async function manageHabitQuest(request, env) {
  if (!hasHabitQuestGoogleConfig(env)) {
    return json({ ok: false, code: "HABITQUEST_NOT_CONFIGURED" }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, code: "INVALID_JSON" }, 400);
  }

  const action = String(payload?.action || "").trim();
  const tables = await fetchHabitQuestTables(env);
  let habits = tables.habits.map(habitQuestRowToHabit).filter((habit) => habit.id && habit.name);
  let history = tables.history;
  let syncStates = tables.syncStates;
  const updatedAt = new Date().toISOString();

  if (action === "create") {
    const habit = normalizeHabitQuestInput(payload.habit || {});
    habits.push(habit);
  } else if (action === "update") {
    const habitId = String(payload?.habitId || "").trim();
    const index = habits.findIndex((habit) => habit.id === habitId);
    if (index < 0) return json({ ok: false, code: "HABIT_NOT_FOUND" }, 404);
    habits[index] = normalizeHabitQuestInput(payload.habit || {}, habits[index]);
  } else if (action === "archive" || action === "restore") {
    const habitId = String(payload?.habitId || "").trim();
    const index = habits.findIndex((habit) => habit.id === habitId);
    if (index < 0) return json({ ok: false, code: "HABIT_NOT_FOUND" }, 404);
    const archived = action === "archive";
    habits[index] = {
      ...habits[index],
      active: !archived,
      archivedAt: archived ? habitDateKey() : null
    };
  } else if (action === "delete") {
    const habitId = String(payload?.habitId || "").trim();
    if (!habits.some((habit) => habit.id === habitId)) {
      return json({ ok: false, code: "HABIT_NOT_FOUND" }, 404);
    }
    habits = habits.filter((habit) => habit.id !== habitId);
    history = history.filter((item) => String(item.habitId || "").trim() !== habitId);
    syncStates = syncStates.filter((item) => String(item.habitId || "").trim() !== habitId);
  } else if (action === "reorder") {
    const order = Array.isArray(payload?.order) ? payload.order.map(String) : [];
    const byId = new Map(habits.map((habit) => [habit.id, habit]));
    const ordered = order.map((id) => byId.get(id)).filter(Boolean);
    const seen = new Set(ordered.map((habit) => habit.id));
    habits = [...ordered, ...habits.filter((habit) => !seen.has(habit.id))];
  } else {
    return json({ ok: false, code: "INVALID_HABIT_MANAGEMENT_ACTION" }, 400);
  }

  const deleting = action === "delete";
  await rewriteHabitQuestRanges(env, tables.token, {
    habits,
    history: deleting ? history : null,
    syncStates: deleting ? syncStates : null,
    updatedAt
  });

  habitsCache = { value: null, expiresAt: 0 };
  const refreshed = await fetchHabitQuestSummary(env, { force: true });
  return json({ ok: true, action, summary: refreshed.value });
}



function localHealthDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function healthAddDays(dateKey, amount) {
  const date = new Date(`${dateKey}T12:00:00+02:00`);
  date.setDate(date.getDate() + amount);
  return localHealthDateKey(date);
}

function sumNutrition(entries, status) {
  const selected = entries.filter((entry) => !status || entry.status === status);
  return selected.reduce((acc, entry) => {
    acc.kcal += Number(entry.kcal || 0);
    acc.protein += Number(entry.protein || 0);
    acc.carbs += Number(entry.carbs || 0);
    acc.fat += Number(entry.fat || 0);
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

async function ensureD1Column(env, table, column, definition) {
  const info = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  const exists = (info.results || []).some((item) => item.name === column);
  if (!exists) await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
}

async function ensureHealthBodyTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS health_body_samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_type TEXT NOT NULL,
      metric_value REAL NOT NULL,
      unit TEXT NOT NULL,
      sample_date TEXT NOT NULL,
      measured_at TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'apple_health',
      imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(metric_type, measured_at, source)
    )
  `).run();
  await env.DB.prepare(
    "CREATE INDEX IF NOT EXISTS idx_health_body_date_type ON health_body_samples(sample_date, metric_type)"
  ).run();
}

async function ensureHealthRecoveryTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS health_recovery_daily (
      recovery_date TEXT PRIMARY KEY,
      resting_hr_bpm REAL,
      walking_hr_bpm REAL,
      hrv_sdnn_ms REAL,
      respiratory_rate REAL,
      oxygen_saturation_pct REAL,
      vo2_max REAL,
      wrist_temperature_c REAL,
      sleep_asleep_minutes REAL,
      sleep_in_bed_minutes REAL,
      sleep_awake_minutes REAL,
      sleep_core_minutes REAL,
      sleep_deep_minutes REAL,
      sleep_rem_minutes REAL,
      source TEXT NOT NULL DEFAULT 'apple_health',
      sampled_at TEXT,
      source_details TEXT,
      recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

async function fetchHealthRecoveryRows(env, startDate, endDate) {
  await ensureHealthRecoveryTable(env);
  const result = await env.DB.prepare(`
    SELECT recovery_date, resting_hr_bpm, walking_hr_bpm, hrv_sdnn_ms,
           respiratory_rate, oxygen_saturation_pct, vo2_max, wrist_temperature_c,
           sleep_asleep_minutes, sleep_in_bed_minutes, sleep_awake_minutes,
           sleep_core_minutes, sleep_deep_minutes, sleep_rem_minutes,
           source, sampled_at, source_details, recorded_at
    FROM health_recovery_daily
    WHERE recovery_date BETWEEN ? AND ?
    ORDER BY recovery_date ASC
  `).bind(startDate, endDate).all();

  return (result.results || []).map((row) => ({
    date: row.recovery_date,
    restingHeartRate: toNumber(row.resting_hr_bpm),
    walkingHeartRateAverage: toNumber(row.walking_hr_bpm),
    hrvSdnnMs: toNumber(row.hrv_sdnn_ms),
    respiratoryRate: toNumber(row.respiratory_rate),
    oxygenSaturationPct: toNumber(row.oxygen_saturation_pct),
    vo2Max: toNumber(row.vo2_max),
    wristTemperatureC: toNumber(row.wrist_temperature_c),
    sleepAsleepMinutes: toNumber(row.sleep_asleep_minutes),
    sleepInBedMinutes: toNumber(row.sleep_in_bed_minutes),
    sleepAwakeMinutes: toNumber(row.sleep_awake_minutes),
    sleepCoreMinutes: toNumber(row.sleep_core_minutes),
    sleepDeepMinutes: toNumber(row.sleep_deep_minutes),
    sleepRemMinutes: toNumber(row.sleep_rem_minutes),
    source: row.source || "apple_health",
    sampledAt: row.sampled_at || null,
    sourceDetails: row.source_details ? (() => { try { return JSON.parse(row.source_details); } catch { return []; } })() : [],
    importedAt: row.recorded_at || null
  }));
}

async function fetchHealthBodySamples(env, startDate, endDate) {
  await ensureHealthBodyTable(env);
  const result = await env.DB.prepare(`
    SELECT metric_type, metric_value, unit, sample_date, measured_at, source, imported_at
    FROM health_body_samples
    WHERE sample_date BETWEEN ? AND ?
    ORDER BY measured_at ASC
  `).bind(startDate, endDate).all();

  return (result.results || []).map((row) => ({
    type: row.metric_type,
    value: toNumber(row.metric_value),
    unit: row.unit || null,
    date: row.sample_date,
    measuredAt: row.measured_at,
    source: row.source || "apple_health",
    importedAt: row.imported_at || null
  }));
}

async function ensureHealthEnergyTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS health_energy_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      energy_date TEXT NOT NULL,
      active_kcal REAL,
      resting_kcal REAL,
      total_kcal REAL,
      source TEXT NOT NULL DEFAULT 'manual',
      note TEXT,
      recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      steps INTEGER,
      exercise_minutes REAL,
      workout_count INTEGER,
      sampled_at TEXT,
      source_details TEXT,
      workouts_json TEXT
    )
  `).run();
  await ensureD1Column(env, "health_energy_daily", "steps", "INTEGER");
  await ensureD1Column(env, "health_energy_daily", "exercise_minutes", "REAL");
  await ensureD1Column(env, "health_energy_daily", "workout_count", "INTEGER");
  await ensureD1Column(env, "health_energy_daily", "sampled_at", "TEXT");
  await ensureD1Column(env, "health_energy_daily", "source_details", "TEXT");
  await ensureD1Column(env, "health_energy_daily", "workouts_json", "TEXT");
  // Deduplicate historical rows before enforcing one energy snapshot per day.
  await env.DB.prepare(`
    DELETE FROM health_energy_daily
    WHERE EXISTS (
      SELECT 1
      FROM health_energy_daily AS newer
      WHERE newer.energy_date = health_energy_daily.energy_date
        AND (
          newer.recorded_at > health_energy_daily.recorded_at
          OR (
            newer.recorded_at = health_energy_daily.recorded_at
            AND newer.id > health_energy_daily.id
          )
        )
    )
  `).run();
  await env.DB.prepare(
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_health_energy_date ON health_energy_daily(energy_date)"
  ).run();
}

async function fetchHealthEnergyRows(env, startDate, endDate) {
  await ensureHealthEnergyTable(env);
  const result = await env.DB.prepare(`
    SELECT energy_date, active_kcal, resting_kcal, total_kcal, source, note, recorded_at,
           steps, exercise_minutes, workout_count, sampled_at, source_details, workouts_json
    FROM health_energy_daily
    WHERE energy_date BETWEEN ? AND ?
    ORDER BY energy_date ASC
  `).bind(startDate, endDate).all();

  return new Map((result.results || []).map((row) => [row.energy_date, {
    date: row.energy_date,
    activeKcal: toNumber(row.active_kcal),
    restingKcal: toNumber(row.resting_kcal),
    totalKcal: toNumber(row.total_kcal),
    source: row.source || "manual",
    note: row.note || null,
    importedAt: row.recorded_at || null,
    steps: row.steps === null || row.steps === undefined ? null : Number(row.steps),
    exerciseMinutes: toNumber(row.exercise_minutes),
    workoutCount: row.workout_count === null || row.workout_count === undefined ? null : Number(row.workout_count),
    sampledAt: row.sampled_at || null,
    sourceDetails: row.source_details ? (() => { try { return JSON.parse(row.source_details); } catch { return []; } })() : [],
    workouts: row.workouts_json ? (() => { try { return JSON.parse(row.workouts_json); } catch { return []; } })() : []
  }]));
}

async function ensureHealthRecoveryImportStateTable(env) {
  if (healthRecoveryImportStateReady) return;
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS health_import_state (
      import_key TEXT PRIMARY KEY,
      signature TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  healthRecoveryImportStateReady = true;
}

function healthRecoveryImportSignature(energyRows = [], bodyRows = [], recoveryRows = []) {
  const recoveredEnergy = energyRows.filter((row) =>
    row?.date && String(row?.source || "") === "apple_health_export_recovery"
  );
  const recoveredBody = bodyRows.filter((row) =>
    /^\d{4}-\d{2}-\d{2}$/.test(String(row?.date || "")) &&
    String(row?.note || "").includes("Recuperado del ZIP de Apple Salud") &&
    row?.measuredAt
  );
  const recoveredRecovery = recoveryRows.filter((row) =>
    /^\d{4}-\d{2}-\d{2}$/.test(String(row?.date || "")) &&
    String(row?.source || "") === "apple_health_export_recovery"
  );
  const latest = (rows, field) => rows.reduce((max, row) => {
    const value = String(row?.[field] || "");
    return value > max ? value : max;
  }, "");
  return JSON.stringify({
    energyCount: recoveredEnergy.length,
    energyImportedAt: latest(recoveredEnergy, "importedAt"),
    energyDate: latest(recoveredEnergy, "date"),
    bodyCount: recoveredBody.length,
    bodyImportedAt: latest(recoveredBody, "importedAt") || latest(recoveredBody, "updatedAt"),
    bodyMeasuredAt: latest(recoveredBody, "measuredAt"),
    recoveryCount: recoveredRecovery.length,
    recoveryImportedAt: latest(recoveredRecovery, "importedAt"),
    recoveryDate: latest(recoveredRecovery, "date")
  });
}

async function reconcileHealthRecoveryRows(env, energyRows = [], bodyRows = [], recoveryRows = []) {
  const signature = healthRecoveryImportSignature(energyRows, bodyRows, recoveryRows);
  await ensureHealthRecoveryImportStateTable(env);
  const importState = await env.DB.prepare(
    "SELECT signature FROM health_import_state WHERE import_key = ? LIMIT 1"
  ).bind("apple_health_export_recovery").first();
  if (String(importState?.signature || "") === signature) {
    return { energy: 0, bodyRows: 0, recoveryRows: 0, skipped: true };
  }

  const recoveredEnergy = energyRows.filter((row) =>
    row?.date &&
    String(row?.source || "") === "apple_health_export_recovery"
  );
  const recoveredBody = bodyRows.filter((row) =>
    /^\d{4}-\d{2}-\d{2}$/.test(String(row?.date || "")) &&
    String(row?.note || "").includes("Recuperado del ZIP de Apple Salud") &&
    row?.measuredAt
  );
  const recoveredRecovery = recoveryRows.filter((row) =>
    /^\d{4}-\d{2}-\d{2}$/.test(String(row?.date || "")) &&
    String(row?.source || "") === "apple_health_export_recovery"
  );

  if (!recoveredEnergy.length && !recoveredBody.length && !recoveredRecovery.length) {
    return { energy: 0, bodyRows: 0, recoveryRows: 0, skipped: true };
  }

  await Promise.all([
    recoveredEnergy.length ? ensureHealthEnergyTable(env) : Promise.resolve(),
    recoveredBody.length ? ensureHealthBodyTable(env) : Promise.resolve(),
    recoveredRecovery.length ? ensureHealthRecoveryTable(env) : Promise.resolve()
  ]);

  const statements = [];

  for (const row of recoveredEnergy) {
    statements.push(env.DB.prepare(`
      INSERT INTO health_energy_daily (
        energy_date, active_kcal, resting_kcal, total_kcal, source, note, recorded_at,
        steps, exercise_minutes, workout_count, sampled_at, source_details, workouts_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      -- A historical import may fill a missing day but MUST NOT replace a
      -- newer HealthKit bridge snapshot (or any existing canonical observation).
      -- Conflict resolution is performed separately after coverage/source QA.
      ON CONFLICT(energy_date) DO NOTHING
    `).bind(
      row.date,
      row.activeKcal,
      row.restingKcal,
      row.totalKcal,
      "apple_health_export_recovery",
      row.note || "Apple Health export recovery",
      row.importedAt || new Date().toISOString(),
      row.steps === null || row.steps === undefined ? null : Math.round(Number(row.steps)),
      row.exerciseMinutes,
      row.workoutCount === null || row.workoutCount === undefined ? null : Math.round(Number(row.workoutCount)),
      row.sampledAt || `${row.date}T23:59:59+02:00`,
      JSON.stringify(Array.isArray(row.sourceDetails) ? row.sourceDetails : []),
      JSON.stringify(Array.isArray(row.workouts) ? row.workouts : [])
    ));
  }

  for (const row of recoveredBody) {
    const samples = [
      ["bodyMass", row.weightKg, "kg"],
      ["bodyFatPercentage", row.bodyFatPct, "%"],
      ["bodyMassIndex", row.bodyMassIndex, "count"],
      ["leanBodyMass", row.leanBodyMassKg, "kg"]
    ];
    for (const [type, value, unit] of samples) {
      if (!Number.isFinite(Number(value))) continue;
      statements.push(env.DB.prepare(`
        INSERT INTO health_body_samples (
          metric_type, metric_value, unit, sample_date, measured_at, source, imported_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(metric_type, measured_at, source) DO UPDATE SET
          metric_value = excluded.metric_value,
          unit = excluded.unit,
          sample_date = excluded.sample_date,
          imported_at = excluded.imported_at
      `).bind(
        type,
        Number(value),
        unit,
        row.date,
        row.measuredAt,
        String(row.source || "Zepp Life"),
        row.importedAt || row.updatedAt || new Date().toISOString()
      ));
    }
  }

  for (const row of recoveredRecovery) {
    statements.push(env.DB.prepare(`
      INSERT INTO health_recovery_daily (
        recovery_date, resting_hr_bpm, walking_hr_bpm, hrv_sdnn_ms,
        respiratory_rate, oxygen_saturation_pct, vo2_max, wrist_temperature_c,
        sleep_asleep_minutes, sleep_in_bed_minutes, sleep_awake_minutes,
        sleep_core_minutes, sleep_deep_minutes, sleep_rem_minutes,
        source, sampled_at, source_details, recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(recovery_date) DO UPDATE SET
        resting_hr_bpm = excluded.resting_hr_bpm,
        walking_hr_bpm = excluded.walking_hr_bpm,
        hrv_sdnn_ms = excluded.hrv_sdnn_ms,
        respiratory_rate = excluded.respiratory_rate,
        oxygen_saturation_pct = excluded.oxygen_saturation_pct,
        vo2_max = excluded.vo2_max,
        wrist_temperature_c = excluded.wrist_temperature_c,
        sleep_asleep_minutes = excluded.sleep_asleep_minutes,
        sleep_in_bed_minutes = excluded.sleep_in_bed_minutes,
        sleep_awake_minutes = excluded.sleep_awake_minutes,
        sleep_core_minutes = excluded.sleep_core_minutes,
        sleep_deep_minutes = excluded.sleep_deep_minutes,
        sleep_rem_minutes = excluded.sleep_rem_minutes,
        source = excluded.source,
        sampled_at = excluded.sampled_at,
        source_details = excluded.source_details,
        recorded_at = excluded.recorded_at
    `).bind(
      row.date,
      row.restingHeartRate,
      row.walkingHeartRateAverage,
      row.hrvSdnnMs,
      row.respiratoryRate,
      row.oxygenSaturationPct,
      row.vo2Max,
      row.wristTemperatureC,
      row.sleepAsleepMinutes,
      row.sleepInBedMinutes,
      row.sleepAwakeMinutes,
      row.sleepCoreMinutes,
      row.sleepDeepMinutes,
      row.sleepRemMinutes,
      "apple_health_export_recovery",
      row.sampledAt || `${row.date}T23:59:59+02:00`,
      JSON.stringify(Array.isArray(row.sourceDetails) ? row.sourceDetails : []),
      row.importedAt || new Date().toISOString()
    ));
  }

  statements.push(env.DB.prepare(`
    INSERT INTO health_import_state (import_key, signature, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(import_key) DO UPDATE SET
      signature = excluded.signature,
      updated_at = excluded.updated_at
  `).bind("apple_health_export_recovery", signature, new Date().toISOString()));

  await env.DB.batch(statements);
  return {
    energy: recoveredEnergy.length,
    bodyRows: recoveredBody.length,
    recoveryRows: recoveredRecovery.length,
    skipped: false
  };
}

async function fetchHealthHistory(env, { endDate, range = "365" } = {}) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(endDate || ""))
    ? String(endDate)
    : localHealthDateKey();
  const daysByRange = { "30": 30, "90": 90, "180": 180, "365": 365 };
  const days = daysByRange[String(range)] || null;
  const startDate = String(range) === "all"
    ? "2000-01-01"
    : healthAddDays(date, -(days || 365) + 1);

  let waistHistory = [];
  if (hasHealthGoogleConfig(env)) {
    try {
      const health = await fetchHealthNutritionSummary(env, { date });
      waistHistory = health.value?.body?.waistHistory || [];
    } catch (error) {
      console.warn("Health history recovery/waist read failed", String(error?.message || error));
    }
  }

  const [energyMap, bodySamples, recovery] = await Promise.all([
    fetchHealthEnergyRows(env, startDate, date),
    fetchHealthBodySamples(env, startDate, date),
    fetchHealthRecoveryRows(env, startDate, date)
  ]);

  const activity = [...energyMap.values()].map((row) => ({
    ...row,
    coverageQuality: healthCoverageQuality(row)
  }));
  const comparable = activity.filter((row) => ["full", "live"].includes(row.coverageQuality));
  const mean = (values) => {
    const clean = values.filter((value) => Number.isFinite(Number(value))).map(Number);
    return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : null;
  };

  return {
    startDate,
    endDate: date,
    range: String(range),
    activity,
    bodySamples,
    recovery,
    waistHistory,
    quality: {
      full: activity.filter((row) => row.coverageQuality === "full").length,
      live: activity.filter((row) => row.coverageQuality === "live").length,
      partial: activity.filter((row) => row.coverageQuality === "partial").length,
      low: activity.filter((row) => row.coverageQuality === "low").length,
      noWatch: activity.filter((row) => row.coverageQuality === "no_watch").length,
      phoneOnly: activity.filter((row) => row.coverageQuality === "phone_only").length,
      unknown: activity.filter((row) => row.coverageQuality === "unknown").length
    },
    comparableAverages: {
      totalKcal: mean(comparable.map((row) => row.totalKcal)),
      activeKcal: mean(comparable.map((row) => row.activeKcal)),
      steps: mean(comparable.map((row) => row.steps)),
      exerciseMinutes: mean(comparable.map((row) => row.exerciseMinutes))
    }
  };
}


async function updateHealthSheetRange(env, range, values) {
  if (!hasHealthGoogleConfig(env)) return;
  const token = await getGoogleAccessToken(env);
  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HEALTH_SHEET_ID)}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ range, majorDimension: "ROWS", values })
  });
  if (!response.ok) throw new Error(`HEALTH_SUMMARY_WRITE_${response.status}`);
}

async function clearHealthSheetRange(env, range) {
  if (!hasHealthGoogleConfig(env)) return;
  const token = await getGoogleAccessToken(env);
  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HEALTH_SHEET_ID)}/values/${encodeURIComponent(range)}:clear`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: "{}"
  });
  if (!response.ok) throw new Error(`HEALTH_DETAIL_CLEAR_${response.status}`);
}

async function persistHealthActivityDetail(env, history) {
  if (!hasHealthGoogleConfig(env) || !history) return;
  const generatedAt = new Date().toISOString();
  const activity = Array.isArray(history.activity) ? history.activity : [];
  const rows = activity.slice(-1999).map((row) => [
    row.date || "",
    row.activeKcal ?? "",
    row.restingKcal ?? "",
    row.totalKcal ?? "",
    row.steps ?? "",
    row.exerciseMinutes ?? "",
    row.workoutCount ?? "",
    row.coverageQuality || healthCoverageQuality(row),
    row.source || "",
    row.sampledAt || "",
    row.importedAt || "",
    JSON.stringify(Array.isArray(row.sourceDetails) ? row.sourceDetails : []),
    JSON.stringify(Array.isArray(row.workouts) ? row.workouts : []),
    generatedAt
  ]);

  await clearHealthSheetRange(env, "ActividadDiaria!A2:N2000");
  if (rows.length) {
    await updateHealthSheetRange(
      env,
      `ActividadDiaria!A2:N${rows.length + 1}`,
      rows
    );
  }
}

async function persistHealthBodyDetail(env, history) {
  if (!hasHealthGoogleConfig(env) || !history) return;
  const generatedAt = new Date().toISOString();
  const bodySamples = Array.isArray(history.bodySamples) ? history.bodySamples : [];
  const rows = bodySamples.slice(-4999).map((sample) => [
    sample.measuredAt || "",
    sample.date || "",
    sample.type || "",
    sample.value ?? "",
    sample.unit || "",
    sample.source || "",
    sample.importedAt || "",
    generatedAt
  ]);

  await clearHealthSheetRange(env, "MedicionesCorporalesApple!A2:H5000");
  if (rows.length) {
    await updateHealthSheetRange(
      env,
      `MedicionesCorporalesApple!A2:H${rows.length + 1}`,
      rows
    );
  }
}

async function persistHealthRecoveryDetail(env, history) {
  if (!hasHealthGoogleConfig(env) || !history) return;
  const generatedAt = new Date().toISOString();
  const recovery = Array.isArray(history.recovery) ? history.recovery : [];
  const rows = recovery.slice(-1999).map((row) => [
    row.date || "",
    row.restingHeartRate ?? "",
    row.walkingHeartRateAverage ?? "",
    row.hrvSdnnMs ?? "",
    row.respiratoryRate ?? "",
    row.oxygenSaturationPct ?? "",
    row.vo2Max ?? "",
    row.wristTemperatureC ?? "",
    row.sleepAsleepMinutes ?? "",
    row.sleepInBedMinutes ?? "",
    row.sleepAwakeMinutes ?? "",
    row.sleepCoreMinutes ?? "",
    row.sleepDeepMinutes ?? "",
    row.sleepRemMinutes ?? "",
    row.source || "",
    row.sampledAt || "",
    row.importedAt || "",
    JSON.stringify(Array.isArray(row.sourceDetails) ? row.sourceDetails : []),
    generatedAt
  ]);

  await clearHealthSheetRange(env, "RecuperacionDiariaApple!A2:S2000");
  if (rows.length) {
    await updateHealthSheetRange(
      env,
      `RecuperacionDiariaApple!A2:S${rows.length + 1}`,
      rows
    );
  }
}

function healthHistoryWeightStats(bodySamples = [], endDate) {
  const weightSamples = bodySamples.filter((sample) =>
    sample?.type === "bodyMass" &&
    /^\d{4}-\d{2}-\d{2}$/.test(String(sample?.date || "")) &&
    Number.isFinite(Number(sample?.value))
  );
  const dailyWeight = new Map();
  for (const sample of weightSamples) {
    if (!dailyWeight.has(sample.date)) dailyWeight.set(sample.date, []);
    dailyWeight.get(sample.date).push(Number(sample.value));
  }
  const dailyMean = (date) => {
    const values = dailyWeight.get(date) || [];
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  };
  const meanForOffsets = (startOffset, endOffset) => {
    const values = [];
    for (let offset = startOffset; offset <= endOffset; offset += 1) {
      const value = dailyMean(healthAddDays(endDate, -offset));
      if (value !== null) values.push(value);
    }
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  };
  const current = meanForOffsets(0, 6);
  const previous = meanForOffsets(7, 13);
  return {
    latest: weightSamples.length ? Number(weightSamples[weightSamples.length - 1].value) : null,
    current7d: current,
    previous7d: previous,
    weeklyChange: current !== null && previous !== null ? current - previous : null
  };
}

async function persistHealthHistorySummary(env, history) {
  if (!hasHealthGoogleConfig(env) || !history) return;
  const rowByRange = { "30": 2, "90": 3, "180": 4, "365": 5, "all": 6 };
  const targetRow = rowByRange[String(history.range || "")];
  if (!targetRow) return;

  const bodySamples = Array.isArray(history.bodySamples) ? history.bodySamples : [];
  const latestMetricValue = (type) => {
    const matches = bodySamples
      .filter((sample) => sample?.type === type && Number.isFinite(Number(sample?.value)))
      .sort((a, b) => String(a.measuredAt || a.date || "").localeCompare(String(b.measuredAt || b.date || "")));
    return matches.length ? Number(matches[matches.length - 1].value) : null;
  };
  const weights = healthHistoryWeightStats(bodySamples, history.endDate);
  const waist = Array.isArray(history.waistHistory) && history.waistHistory.length
    ? Number(history.waistHistory[history.waistHistory.length - 1]?.value)
    : null;
  const quality = history.quality || {};
  const averages = history.comparableAverages || {};
  const comparableDays = Number(quality.full || 0) + Number(quality.live || 0);

  const row = [
    String(history.range || ""),
    new Date().toISOString(),
    history.startDate || "",
    history.endDate || "",
    Array.isArray(history.activity) ? history.activity.length : 0,
    comparableDays,
    Number(quality.full || 0),
    Number(quality.live || 0),
    Number(quality.partial || 0),
    Number(quality.low || 0),
    Number(quality.noWatch || 0),
    Number(quality.phoneOnly || 0),
    Number(quality.unknown || 0),
    averages.totalKcal ?? "",
    averages.activeKcal ?? "",
    averages.steps ?? "",
    averages.exerciseMinutes ?? "",
    bodySamples.length,
    weights.latest ?? "",
    weights.current7d ?? "",
    weights.previous7d ?? "",
    weights.weeklyChange ?? "",
    latestMetricValue("bodyFatPercentage") ?? "",
    latestMetricValue("bodyMassIndex") ?? "",
    latestMetricValue("leanBodyMass") ?? "",
    Number.isFinite(waist) ? waist : "",
    "private-d1-derived"
  ];

  await updateHealthSheetRange(
    env,
    `HistoricoResumen!A${targetRow}:AA${targetRow}`,
    [row]
  );
}

async function fetchWeeklyMenuLight(env, options = {}) {
  if (!hasHealthGoogleConfig(env)) {
    return { status: "not-configured", value: null };
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(options.date || ""))
    ? String(options.date)
    : localHealthDateKey();

  const token = await getGoogleAccessToken(env);
  const ranges = ["MenuSemanal!A1:P2000", "Objetivos!A1:H500"];
  const params = new URLSearchParams();
  for (const range of ranges) params.append("ranges", range);
  params.set("majorDimension", "ROWS");
  params.set("valueRenderOption", "UNFORMATTED_VALUE");

  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HEALTH_SHEET_ID)}/values:batchGet?${params.toString()}`;
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`HEALTH_MENU_SHEETS_${response.status}`);

  const payload = await response.json();
  const valueRanges = payload.valueRanges || [];

  const weeklyMenuRows = parseTableRows(valueRanges[0]?.values || []).map((item) => ({
    weekStart: String(item.semana_inicio || "").trim() || null,
    date: String(item.fecha || "").trim(),
    moment: String(item.momento || "Otro").trim(),
    recipeId: item.recipe_id || null,
    foodId: item.food_id || null,
    name: String(item.nombre || "").trim(),
    quantity: toNumber(item.cantidad),
    unit: item.unidad || null,
    status: String(item.estado || "planificado").trim().toLowerCase(),
    kcal: toNumber(item.kcal),
    protein: toNumber(item.proteinas_g),
    carbs: toNumber(item.carbohidratos_g),
    fat: toNumber(item.grasas_g),
    gymSession: item.sesion_gym || null,
    note: item.nota || null,
    updatedAt: item.updated_at || null
  })).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.name);

  const objectives = parseTableRows(valueRanges[1]?.values || []).map((item) => ({
    effectiveDate: String(item.effective_date || "").trim(),
    kcal: toNumber(item.target_kcal),
    protein: toNumber(item.target_protein_g),
    carbs: toNumber(item.target_carbs_g),
    fat: toNumber(item.target_fat_g),
    note: item.nota || null,
    active: String(item.active ?? "TRUE").toUpperCase() !== "FALSE",
    updatedAt: item.updated_at || null
  })).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.effectiveDate) && item.active)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

  const selectedDate = new Date(`${date}T12:00:00+02:00`);
  const mondayOffset = (selectedDate.getDay() + 6) % 7;
  const weekStart = healthAddDays(date, -mondayOffset);
  const weekEnd = healthAddDays(weekStart, 6);
  const weeklyMenu = prepareWeeklyMenuRows(weeklyMenuRows.filter((item) => item.date >= weekStart && item.date <= weekEnd));
  const objective = objectives.find((item) => item.effectiveDate <= date) || null;

  return {
    status: "ok",
    value: {
      date,
      weekStart,
      weekEnd,
      objective,
      weeklyMenu,
      source: { kind: "google-sheet", title: "SEGUNDO CEREBRO - SALUD", sheet: "MenuSemanal" }
    }
  };
}

async function fetchHealthNutritionSummary(env, options = {}) {
  if (!hasHealthGoogleConfig(env)) {
    return { status: "not-configured", value: null };
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(options.date || ""))
    ? String(options.date)
    : localHealthDateKey();

  if (!options.force && healthCache.value && healthCache.expiresAt > Date.now() && healthCache.date === date) {
    return { status: "ok-cache", value: healthCache.value };
  }

  const token = await getGoogleAccessToken(env);
  const pantryPromise = hasPantryGoogleConfig(env)
    ? fetchPantrySummary(env, getGoogleAccessToken).catch((error) => {
        console.warn("Nutrition Pantry sync failed", String(error?.message || error));
        return null;
      })
    : Promise.resolve(null);
  const ranges = ["Comidas!A1:K2000", "Registro!A1:N6000", "Objetivos!A1:H500", "EnergiaDiaria!A1:M2000", "ObjetivosActividad!A1:R500", "MedicionesCorporales!A1:N2000", "ObjetivosProgreso!A1:P1000", "MenuSemanal!A1:P2000", "Recetas!A1:O1000", "IngredientesReceta!A1:L5000", "PasosReceta!A1:J2000", "RecuperacionDiariaApple!A1:S2000"];
  const params = new URLSearchParams();
  for (const range of ranges) params.append("ranges", range);
  params.set("majorDimension", "ROWS");
  params.set("valueRenderOption", "UNFORMATTED_VALUE");

  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HEALTH_SHEET_ID)}/values:batchGet?${params.toString()}`;
  const response = await googleReadFetch(
    endpoint,
    { headers: { Authorization: `Bearer ${token}` } },
    { attempts: 3, baseDelayMs: 220 }
  );
  if (!response.ok) throw new Error(`HEALTH_SHEETS_${response.status}`);

  const payload = await response.json();
  const valueRanges = payload.valueRanges || [];
  const pantryResult = await pantryPromise;
  const pantryProducts = Array.isArray(pantryResult?.value?.products) ? pantryResult.value.products : [];
  const pantryProductById = pantryResult?.value
    ? new Map(pantryProducts.map((product) => [String(product.id || "").trim(), product]).filter(([id]) => id))
    : null;

  const foods = parseTableRows(valueRanges[0]?.values || []).map((item) => ({
    id: String(item.id || "").trim(),
    name: String(item.nombre || "").trim(),
    serving: toNumber(item.racion),
    unit: item.unidad || null,
    kcal: toNumber(item.kcal_racion),
    protein: toNumber(item.proteinas_g),
    carbs: toNumber(item.carbohidratos_g),
    fat: toNumber(item.grasas_g),
    source: item.fuente || null,
    note: item.nota || null,
    updatedAt: item.updated_at || null,
    pantryProductId: pantryProductById?.has(String(item.id || "").trim())
      ? String(item.id || "").trim()
      : null
  })).filter((item) => item.id && item.name);

  const foodById = new Map(foods.map((food) => [food.id, food]));
  const entries = parseTableRows(valueRanges[1]?.values || []).map((item, index) => {
    const itemId = item.item_id || null;
    const linkedFood = itemId ? foodById.get(String(itemId)) : null;
    const linkedProduct = itemId && pantryProductById ? pantryProductById.get(String(itemId)) || null : null;
    const quantity = toNumber(item.cantidad);
    const serving = linkedFood?.serving;
    const factor = linkedFood && quantity !== null && serving !== null && serving > 0
      ? quantity / serving
      : linkedFood ? 1 : null;
    const derived = (field) => linkedFood && factor !== null && linkedFood[field] !== null
      ? Number(linkedFood[field]) * factor
      : null;
    return {
      id: `row-${index + 2}`,
      date: String(item.fecha || "").trim(),
      moment: String(item.momento || "Otro").trim(),
      itemId,
      productId: linkedProduct?.id || null,
      itemName: String(item.item_nombre || linkedFood?.name || linkedProduct?.name || "").trim(),
      quantity,
      unit: item.unidad || linkedFood?.unit || null,
      kcal: toNumber(item.kcal) ?? derived("kcal") ?? 0,
      protein: toNumber(item.proteinas_g) ?? derived("protein") ?? 0,
      carbs: toNumber(item.carbohidratos_g) ?? derived("carbs") ?? 0,
      fat: toNumber(item.grasas_g) ?? derived("fat") ?? 0,
      status: String(item.estado || "consumido").toLowerCase() === "planificado" ? "planificado" : "consumido",
      source: item.fuente || (linkedFood ? "base_comidas" : null),
      note: item.nota || null,
      updatedAt: item.updated_at || null
    };
  }).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.itemName);

  const objectives = parseTableRows(valueRanges[2]?.values || []).map((item) => ({
    effectiveDate: String(item.effective_date || "").trim(),
    kcal: toNumber(item.target_kcal),
    protein: toNumber(item.target_protein_g),
    carbs: toNumber(item.target_carbs_g),
    fat: toNumber(item.target_fat_g),
    note: item.nota || null,
    active: String(item.active ?? "TRUE").toUpperCase() !== "FALSE",
    updatedAt: item.updated_at || null
  })).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.effectiveDate) && item.active)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

  const energyRows = parseTableRows(valueRanges[3]?.values || []).map((item) => ({
    date: String(item.fecha || "").trim(),
    activeKcal: toNumber(item.active_kcal),
    restingKcal: toNumber(item.resting_kcal),
    totalKcal: toNumber(item.total_kcal),
    source: item.fuente || null,
    note: item.nota || null,
    importedAt: item.imported_at || null,
    steps: toNumber(item.steps),
    exerciseMinutes: toNumber(item.exercise_minutes),
    workoutCount: toNumber(item.workout_count),
    sampledAt: item.sampled_at || null,
    sourceDetails: item.source_details ? String(item.source_details).split(",").map((value) => value.trim()).filter(Boolean) : [],
    workouts: item.workouts_json ? (() => { try { return JSON.parse(item.workouts_json); } catch { return []; } })() : []
  })).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date));

  const activityObjectives = parseTableRows(valueRanges[4]?.values || []).map((item) => ({
    effectiveDate: String(item.effective_date || "").trim(),
    stepsFloor: toNumber(item.steps_floor),
    stepsTarget: toNumber(item.steps_target),
    strengthSessionsWeek: toNumber(item.strength_sessions_week),
    moderateActivityMinWeek: toNumber(item.moderate_activity_min_week),
    vigorousActivityMinWeek: toNumber(item.vigorous_activity_min_week),
    waterMinL: toNumber(item.water_min_l),
    waterTargetL: toNumber(item.water_target_l),
    sleepMinH: toNumber(item.sleep_min_h),
    sleepTargetH: toNumber(item.sleep_target_h),
    appleWatchEnergyRule: item.apple_watch_energy_rule || null,
    reviewAfterDays: toNumber(item.review_after_days),
    note: item.note || null,
    active: String(item.active ?? "TRUE").toUpperCase() !== "FALSE",
    updatedAt: item.updated_at || null
  })).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.effectiveDate) && item.active)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

  const bodySheetRows = parseTableRows(valueRanges[5]?.values || []).map((item) => ({
    date: String(item.date || "").trim(),
    weightKg: toNumber(item.weight_kg),
    bodyFatPct: toNumber(item.body_fat_pct),
    muscleMassKg: toNumber(item.muscle_mass_kg),
    waistCm: toNumber(item.waist_cm),
    waterPct: toNumber(item.water_pct),
    source: item.source || null,
    conditions: item.conditions || null,
    note: item.note || null,
    updatedAt: item.updated_at || null,
    bodyMassIndex: toNumber(item.body_mass_index),
    leanBodyMassKg: toNumber(item.lean_body_mass_kg),
    measuredAt: item.measured_at || null,
    importedAt: item.imported_at || null
  })).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date));

  const progressObjectives = parseTableRows(valueRanges[6]?.values || []).map((item) => ({
    category: String(item.category || "").trim(),
    metric: String(item.metric || "").trim(),
    baseline: item.baseline == null ? null : String(item.baseline).trim(),
    target: item.target == null ? null : String(item.target).trim(),
    timeframe: item.timeframe == null ? null : String(item.timeframe).trim(),
    frequency: item.frequency == null ? null : String(item.frequency).trim(),
    measurement: item.measurement == null ? null : String(item.measurement).trim(),
    decisionRule: item.decision_rule == null ? null : String(item.decision_rule).trim(),
    priority: String(item.priority || "media").trim().toLowerCase(),
    status: String(item.status || "activo").trim().toLowerCase(),
    updatedAt: item.updated_at || null
  })).filter((item) => item.metric && item.status !== "inactivo");

  const weeklyMenuRows = parseTableRows(valueRanges[7]?.values || []).map((item) => ({
    weekStart: String(item.semana_inicio || "").trim() || null,
    date: String(item.fecha || "").trim(),
    moment: String(item.momento || "Otro").trim(),
    recipeId: item.recipe_id || null,
    foodId: item.food_id || null,
    name: String(item.nombre || "").trim(),
    quantity: toNumber(item.cantidad),
    unit: item.unidad || null,
    status: String(item.estado || "planificado").trim().toLowerCase(),
    kcal: toNumber(item.kcal),
    protein: toNumber(item.proteinas_g),
    carbs: toNumber(item.carbohidratos_g),
    fat: toNumber(item.grasas_g),
    gymSession: item.sesion_gym || null,
    note: item.nota || null,
    updatedAt: item.updated_at || null
  })).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.name);

  const recipeRows = parseTableRows(valueRanges[8]?.values || []).map((item) => ({
    id: String(item.recipe_id || "").trim(),
    name: String(item.nombre || "").trim(),
    servings: toNumber(item.raciones),
    kcalTotal: toNumber(item.kcal_total),
    kcalPerServing: toNumber(item.kcal_racion),
    proteinPerServing: toNumber(item.proteinas_racion_g),
    carbsPerServing: toNumber(item.carbohidratos_racion_g),
    fatPerServing: toNumber(item.grasas_racion_g),
    precision: item.precision || null,
    source: item.fuente || null,
    note: item.nota || null,
    updatedAt: item.updated_at || null,
    photoFileId: String(item.foto_drive_file_id || "").trim() || null,
    photoMimeType: String(item.foto_mime_type || "").trim() || null,
    photoUpdatedAt: String(item.foto_updated_at || "").trim() || null
  })).filter((item) => item.id);

  recipePhotoCache = {
    value: new Map(recipeRows
      .filter((recipe) => recipe.photoFileId)
      .map((recipe) => [recipe.id, {
        recipeId: recipe.id,
        fileId: recipe.photoFileId,
        mimeType: recipe.photoMimeType,
        updatedAt: recipe.photoUpdatedAt || recipe.updatedAt || null
      }])),
    expiresAt: Date.now() + 60_000
  };

  const recipeIngredientRows = parseTableRows(valueRanges[9]?.values || []).map((item) => ({
    recipeId: String(item.recipe_id || "").trim(),
    productId: String(item.producto_id || "").trim() || null,
    name: String(item.ingrediente || "").trim(),
    quantity: toNumber(item.cantidad),
    unit: item.unidad || null,
    grams: toNumber(item.gramos_estimados),
    kcal: toNumber(item.kcal_estimadas),
    protein: toNumber(item.proteinas_estimadas_g),
    source: item.fuente || null,
    precision: item.precision || null,
    note: item.nota || null,
    updatedAt: item.updated_at || null
  })).filter((item) => item.recipeId && item.name);

  const recipeStepRows = parseTableRows(valueRanges[10]?.values || []).map((item) => ({
    recipeId: String(item.recipe_id || "").trim(),
    order: toNumber(item.orden),
    instruction: String(item.instruccion || "").trim(),
    timeMinutes: toNumber(item.tiempo_min),
    temperature: item.temperatura || null,
    utensil: item.utensilio || null,
    source: item.fuente || null,
    precision: item.precision || null,
    note: item.nota || null,
    updatedAt: item.updated_at || null
  })).filter((item) => item.recipeId && item.instruction)
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

  const recoverySheetRows = parseTableRows(valueRanges[11]?.values || []).map((item) => ({
    date: String(item.fecha || "").trim(),
    restingHeartRate: toNumber(item.resting_hr_bpm),
    walkingHeartRateAverage: toNumber(item.walking_hr_bpm),
    hrvSdnnMs: toNumber(item.hrv_sdnn_ms),
    respiratoryRate: toNumber(item.respiratory_rate),
    oxygenSaturationPct: toNumber(item.oxygen_saturation_pct),
    vo2Max: toNumber(item.vo2_max),
    wristTemperatureC: toNumber(item.wrist_temperature_c),
    sleepAsleepMinutes: toNumber(item.sleep_asleep_minutes),
    sleepInBedMinutes: toNumber(item.sleep_in_bed_minutes),
    sleepAwakeMinutes: toNumber(item.sleep_awake_minutes),
    sleepCoreMinutes: toNumber(item.sleep_core_minutes),
    sleepDeepMinutes: toNumber(item.sleep_deep_minutes),
    sleepRemMinutes: toNumber(item.sleep_rem_minutes),
    source: String(item.source || "").trim(),
    sampledAt: item.sampled_at || null,
    importedAt: item.imported_at || null,
    sourceDetails: item.source_details_json ? (() => {
      try { return JSON.parse(item.source_details_json); } catch { return []; }
    })() : []
  })).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date));

  const ingredientsByRecipeId = new Map();
  for (const ingredient of recipeIngredientRows) {
    if (!ingredientsByRecipeId.has(ingredient.recipeId)) ingredientsByRecipeId.set(ingredient.recipeId, []);
    ingredientsByRecipeId.get(ingredient.recipeId).push(ingredient);
  }
  const stepsByRecipeId = new Map();
  for (const step of recipeStepRows) {
    if (!stepsByRecipeId.has(step.recipeId)) stepsByRecipeId.set(step.recipeId, []);
    stepsByRecipeId.get(step.recipeId).push(step);
  }
  const recipeById = new Map(recipeRows.map((recipe) => [recipe.id, {
    ...recipe,
    steps: stepsByRecipeId.get(recipe.id) || []
  }]));

  const historyStart = healthAddDays(date, -29);
  const bodyHistoryStart = healthAddDays(date, -27);
  try {
    await reconcileHealthRecoveryRows(env, energyRows, bodySheetRows, recoverySheetRows);
  } catch (error) {
    console.warn("Apple Health recovery reconcile failed", String(error?.message || error));
  }
  const [d1EnergyByDate, d1BodySamples] = await Promise.all([
    fetchHealthEnergyRows(env, historyStart, date),
    fetchHealthBodySamples(env, bodyHistoryStart, date)
  ]);
  const sheetEnergyByDate = new Map();
  for (const row of [...energyRows].sort((a, b) => String(b.importedAt || "").localeCompare(String(a.importedAt || "")))) {
    if (!sheetEnergyByDate.has(row.date)) sheetEnergyByDate.set(row.date, row);
  }
  const energyForDate = (dateKey) => selectHealthEnergyRow(
    d1EnergyByDate.get(dateKey) || null,
    sheetEnergyByDate.get(dateKey) || null
  );

  const registeredDayEntries = entries.filter((item) => item.date === date);
  const registeredDayIds = new Set(
    registeredDayEntries
      .map((item) => String(item.itemId || "").trim())
      .filter(Boolean)
  );
  const consumedMenuFallback = prepareWeeklyMenuRows(
    weeklyMenuRows.filter((item) => item.date === date),
    {
      recipeById,
      ingredientsByRecipeId,
      ...(pantryProductById ? { pantryProductById } : {})
    }
  )
    .filter((item) => item.status === "consumido")
    .filter((item) => {
      const identities = [item.recipeId, item.foodId]
        .map((value) => String(value || "").trim())
        .filter(Boolean);
      return identities.length && !identities.some((identity) => registeredDayIds.has(identity));
    })
    .map((item, index) => ({
      id: `menu-fallback-${index + 1}`,
      date: item.date,
      moment: item.moment,
      itemId: item.recipeId || item.foodId || null,
      productId: item.foodId || null,
      itemName: item.name,
      quantity: item.quantity,
      unit: item.unit,
      kcal: Number(item.kcal || 0),
      protein: Number(item.protein || 0),
      carbs: Number(item.carbs || 0),
      fat: Number(item.fat || 0),
      status: "consumido",
      source: "menu_consumed_fallback",
      note: item.note || "Consumido en MenuSemanal; pendiente de reconciliar con Registro.",
      updatedAt: item.updatedAt || null
    }));
  const dayEntries = [...registeredDayEntries, ...consumedMenuFallback];
  const consumed = sumNutrition(dayEntries, "consumido");
  const planned = sumNutrition(dayEntries, "planificado");
  const objective = objectives.find((item) => item.effectiveDate <= date) || null;
  const activityObjective = activityObjectives.find((item) => item.effectiveDate <= date) || null;

  const mergedBodySamples = [...d1BodySamples];
  for (const row of bodySheetRows) {
    const measuredAt = row.measuredAt || `${row.date}T12:00:00+02:00`;
    const source = row.source || "health_sheet";
    if (row.weightKg !== null) mergedBodySamples.push({ type: "bodyMass", value: row.weightKg, unit: "kg", date: row.date, measuredAt, source, importedAt: row.importedAt || row.updatedAt || null });
    if (row.bodyFatPct !== null) mergedBodySamples.push({ type: "bodyFatPercentage", value: row.bodyFatPct, unit: "%", date: row.date, measuredAt, source, importedAt: row.importedAt || row.updatedAt || null });
    if (row.bodyMassIndex !== null) mergedBodySamples.push({ type: "bodyMassIndex", value: row.bodyMassIndex, unit: "count", date: row.date, measuredAt, source, importedAt: row.importedAt || row.updatedAt || null });
    if (row.leanBodyMassKg !== null) mergedBodySamples.push({ type: "leanBodyMass", value: row.leanBodyMassKg, unit: "kg", date: row.date, measuredAt, source, importedAt: row.importedAt || row.updatedAt || null });
  }
  const bodySampleMap = new Map();
  for (const sample of mergedBodySamples) {
    const key = [sample.type, sample.measuredAt, sample.source].join("|");
    bodySampleMap.set(key, sample);
  }
  const bodySamples = [...bodySampleMap.values()]
    .sort((a, b) => String(a.measuredAt).localeCompare(String(b.measuredAt)));

  const latestMetric = (type, onlyDate = null) => {
    const matches = bodySamples.filter((sample) => sample.type === type && (!onlyDate || sample.date === onlyDate));
    return matches.length ? matches[matches.length - 1] : null;
  };

  const dailyWeight = new Map();
  for (const sample of bodySamples.filter((item) => item.type === "bodyMass")) {
    if (!dailyWeight.has(sample.date)) dailyWeight.set(sample.date, []);
    dailyWeight.get(sample.date).push(Number(sample.value));
  }
  const meanForDates = (startOffset, endOffset) => {
    const means = [];
    for (let offset = startOffset; offset <= endOffset; offset += 1) {
      const key = healthAddDays(date, -offset);
      const values = dailyWeight.get(key) || [];
      if (values.length) means.push(values.reduce((sum, value) => sum + value, 0) / values.length);
    }
    return means.length ? means.reduce((sum, value) => sum + value, 0) / means.length : null;
  };
  const weight7dAverage = meanForDates(0, 6);
  const previous7dAverage = meanForDates(7, 13);
  const weightWeeklyChange = weight7dAverage !== null && previous7dAverage !== null
    ? weight7dAverage - previous7dAverage
    : null;

  const selectedDate = new Date(`${date}T12:00:00+02:00`);
  const mondayOffset = (selectedDate.getDay() + 6) % 7;
  const weekStart = healthAddDays(date, -mondayOffset);
  const weekEnd = healthAddDays(weekStart, 6);
  const weeklyMenu = prepareWeeklyMenuRows(
    weeklyMenuRows.filter((item) => item.date >= weekStart && item.date <= weekEnd),
    {
      recipeById,
      ingredientsByRecipeId,
      ...(pantryProductById ? { pantryProductById } : {})
    }
  );
  const waistHistory = bodySheetRows
    .filter((item) => item.waistCm !== null && item.date <= date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const waistLatest = waistHistory.length ? waistHistory[waistHistory.length - 1] : null;
  let exerciseMinutesWeek = 0;
  let workoutCountWeek = 0;
  for (let cursor = weekStart; cursor <= date; cursor = healthAddDays(cursor, 1)) {
    const row = energyForDate(cursor);
    exerciseMinutesWeek += Number(row?.exerciseMinutes || 0);
    workoutCountWeek += Number(row?.workoutCount || 0);
  }

  const energyForDay = energyForDate(date);
  const totalBurn = energyForDay && isHealthEnergyComparable(energyForDay)
    ? (energyForDay.totalKcal ?? (
      energyForDay.activeKcal !== null && energyForDay.restingKcal !== null
        ? energyForDay.activeKcal + energyForDay.restingKcal
        : null
    ))
    : null;

  const history = [];
  for (let offset = 29; offset >= 0; offset -= 1) {
    const historyDate = healthAddDays(date, -offset);
    const dayRows = entries.filter((item) => item.date === historyDate);
    const dayConsumed = sumNutrition(dayRows, "consumido");
    const dayEnergy = energyForDate(historyDate);
    const burn = dayEnergy
      ? (dayEnergy.totalKcal ?? (
        dayEnergy.activeKcal !== null && dayEnergy.restingKcal !== null
          ? dayEnergy.activeKcal + dayEnergy.restingKcal
          : null
      ))
      : null;
    const consumedEntryCount = dayRows.filter((item) => item.status === "consumido").length;
    const coverageQuality = dayEnergy ? healthCoverageQuality(dayEnergy) : "missing";
    history.push({
      date: historyDate,
      consumedKcal: dayConsumed.kcal,
      consumedEntryCount,
      burnedKcal: burn,
      balanceKcal: burn === null || !isHealthEnergyComparable(dayEnergy) ? null : dayConsumed.kcal - burn,
      coverageQuality,
      steps: dayEnergy?.steps ?? null,
      exerciseMinutes: dayEnergy?.exerciseMinutes ?? null,
      workoutCount: dayEnergy?.workoutCount ?? null
    });
  }

  const value = {
    date,
    foods,
    recipes: [...recipeById.values()].map((recipe) => {
      const { photoFileId, photoMimeType, photoUpdatedAt, ...publicRecipe } = recipe;
      const version = photoUpdatedAt || recipe.updatedAt || "";
      return {
        ...publicRecipe,
        photoUrl: photoFileId
          ? `/api/health/recipes/${encodeURIComponent(recipe.id)}/image?v=${encodeURIComponent(version)}`
          : null,
        ingredients: ingredientsByRecipeId.get(recipe.id) || []
      };
    }),
    entries: dayEntries,
    objective,
    activityObjective,
    energy: energyForDay ? { ...energyForDay, coverageQuality: healthCoverageQuality(energyForDay) } : null,
    body: {
      weightToday: latestMetric("bodyMass", date),
      weight7dAverage,
      previous7dAverage,
      weightWeeklyChange,
      bodyFat: latestMetric("bodyFatPercentage"),
      bodyMassIndex: latestMetric("bodyMassIndex"),
      leanBodyMass: latestMetric("leanBodyMass"),
      waist: waistLatest ? {
        value: waistLatest.waistCm,
        unit: "cm",
        date: waistLatest.date,
        source: waistLatest.source || "health_sheet",
        updatedAt: waistLatest.updatedAt || null
      } : null,
      waistHistory: waistHistory.slice(-16).map((item) => ({
        date: item.date,
        value: item.waistCm,
        unit: "cm",
        source: item.source || "health_sheet"
      })),
      samples: bodySamples.filter((item) => item.date >= bodyHistoryStart),
      interpretation: "trend"
    },
    activity: {
      date,
      activeKcal: energyForDay?.activeKcal ?? null,
      restingKcal: energyForDay?.restingKcal ?? null,
      totalKcal: energyForDay?.totalKcal ?? null,
      steps: energyForDay?.steps ?? null,
      exerciseMinutes: energyForDay?.exerciseMinutes ?? null,
      workoutCount: energyForDay?.workoutCount ?? null,
      workouts: energyForDay?.workouts ?? [],
      exerciseMinutesWeek,
      workoutCountWeek
    },
    summary: {
      consumed,
      planned,
      totalBurn,
      balanceKcal: totalBurn === null ? null : consumed.kcal - totalBurn,
      remainingToTargetKcal: objective?.kcal === null || objective?.kcal === undefined
        ? null
        : objective.kcal - consumed.kcal,
      updatedAt: dayEntries.map((item) => item.updatedAt).filter(Boolean).sort().at(-1)
        || objective?.updatedAt
        || null,
      updateKind: dayEntries.some((item) => item.updatedAt) ? "consumption" : objective?.updatedAt ? "objective" : null
    },
    history,
    progressObjectives,
    weeklyMenu,
    source: {
      kind: "google-sheet",
      title: "SEGUNDO CEREBRO - SALUD"
    }
  };

  healthCache = { value, expiresAt: Date.now() + 60_000, date };
  return { status: "ok", value };
}

function staleHealthSnapshot(date) {
  const key = /^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))
    ? String(date)
    : localHealthDateKey();
  if (!healthCache.value || healthCache.date !== key) return null;
  const staleUntil = Number(healthCache.expiresAt || 0) + 5 * 60_000;
  return Date.now() <= staleUntil ? healthCache.value : null;
}

function healthOverviewPayload(value, status, gym = { sessionsThisWeek: 0, sessions: [], progress: {} }) {
  return {
    ok: true,
    status,
    date: value.date,
    body: value.body || null,
    activity: value.activity || null,
    activityObjective: value.activityObjective || null,
    nutritionObjective: value.objective || null,
    nutritionSummary: value.summary || null,
    nutritionHistory: value.history || [],
    progressObjectives: value.progressObjectives || [],
    weeklyMenu: value.weeklyMenu || [],
    gym,
    energy: value.energy || null
  };
}

async function appendHealthSheetRow(env, range, values) {
  const token = await getGoogleAccessToken(env);
  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.HEALTH_SHEET_ID)}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values: [values] })
  });
  if (!response.ok) throw new Error(`HEALTH_WRITE_${response.status}`);
  healthCache = { value: null, expiresAt: 0, date: null };
  recipePhotoCache = { value: new Map(), expiresAt: 0 };
  recipePreviewCache = { value: new Map(), expiresAt: 0 };
}

async function saveNutritionEntry(request, env) {
  if (!hasHealthGoogleConfig(env)) return json({ ok: false, code: "HEALTH_NOT_CONFIGURED" }, 503);
  let payload;
  try { payload = await request.json(); } catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }

  const date = String(payload?.date || "").trim();
  const itemName = String(payload?.itemName || "").trim().slice(0, 160);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !itemName) {
    return json({ ok: false, code: "INVALID_NUTRITION_ENTRY" }, 400);
  }
  const status = String(payload?.status || "consumido").toLowerCase() === "planificado" ? "planificado" : "consumido";
  const now = new Date().toISOString();
  await appendHealthSheetRow(env, "Registro!A:N", [
    date,
    canonicalWeeklyMenuMoment({
      moment: String(payload?.moment || "Otro").slice(0, 40),
      name: itemName,
      note: String(payload?.note || "")
    }),
    String(payload?.itemId || "").slice(0, 80),
    itemName,
    toNumber(payload?.quantity),
    String(payload?.unit || "").slice(0, 30),
    toNumber(payload?.kcal) ?? 0,
    toNumber(payload?.protein) ?? 0,
    toNumber(payload?.carbs) ?? 0,
    toNumber(payload?.fat) ?? 0,
    status,
    String(payload?.source || "web").slice(0, 40),
    String(payload?.note || "").slice(0, 500),
    now
  ]);
  return json({ ok: true }, 201);
}

async function saveNutritionFood(request, env) {
  if (!hasHealthGoogleConfig(env)) return json({ ok: false, code: "HEALTH_NOT_CONFIGURED" }, 503);
  let payload;
  try { payload = await request.json(); } catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }
  const name = String(payload?.name || "").trim().slice(0, 160);
  if (!name) return json({ ok: false, code: "INVALID_FOOD" }, 400);
  const id = String(payload?.id || `food-${crypto.randomUUID().slice(0, 8)}`);
  await appendHealthSheetRow(env, "Comidas!A:K", [
    id,
    name,
    toNumber(payload?.serving),
    String(payload?.unit || "ración").slice(0, 30),
    toNumber(payload?.kcal) ?? 0,
    toNumber(payload?.protein) ?? 0,
    toNumber(payload?.carbs) ?? 0,
    toNumber(payload?.fat) ?? 0,
    String(payload?.source || "web").slice(0, 40),
    String(payload?.note || "").slice(0, 500),
    new Date().toISOString()
  ]);
  return json({ ok: true, id }, 201);
}

async function saveNutritionEnergy(request, env) {
  let payload;
  try { payload = await request.json(); } catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }

  const date = String(payload?.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ ok: false, code: "INVALID_ENERGY_DATE" }, 400);

  const active = toNumber(payload?.activeKcal);
  const resting = toNumber(payload?.restingKcal);
  const suppliedTotal = toNumber(payload?.totalKcal);
  const total = suppliedTotal ?? (active !== null && resting !== null ? active + resting : null);

  if (active === null && resting === null && total === null) {
    return json({ ok: false, code: "EMPTY_ENERGY_SAMPLE" }, 400);
  }

  const values = [active, resting, total].filter((value) => value !== null);
  if (values.some((value) => value < 0 || value > 20000)) {
    return json({ ok: false, code: "INVALID_ENERGY_VALUE" }, 400);
  }

  await ensureHealthEnergyTable(env);
  await env.DB.prepare(`
    INSERT INTO health_energy_daily (
      energy_date, active_kcal, resting_kcal, total_kcal, source, note, recorded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(energy_date) DO UPDATE SET
      active_kcal = excluded.active_kcal,
      resting_kcal = excluded.resting_kcal,
      total_kcal = excluded.total_kcal,
      source = excluded.source,
      note = excluded.note,
      recorded_at = excluded.recorded_at
  `).bind(
    date,
    active,
    resting,
    total,
    String(payload?.source || "manual").trim().slice(0, 40) || "manual",
    String(payload?.note || "").trim().slice(0, 500) || null,
    new Date().toISOString()
  ).run();

  healthCache = { value: null, expiresAt: 0, date: null };
  return json({ ok: true, date, activeKcal: active, restingKcal: resting, totalKcal: total }, 201);
}


async function saveHealthSync(request, env) {
  let payload;
  try { payload = await request.json(); } catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }

  const activity = payload?.activity && typeof payload.activity === "object" ? payload.activity : null;
  const bodySamples = Array.isArray(payload?.bodySamples) ? payload.bodySamples.slice(0, 100) : [];
  const recovery = payload?.recovery && typeof payload.recovery === "object" && !Array.isArray(payload.recovery)
    ? payload.recovery
    : null;
  let activitySaved = false;

  if (activity) {
    const date = String(activity.date || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ ok: false, code: "INVALID_HEALTH_DATE" }, 400);

    const active = toNumber(activity.activeKcal);
    const resting = toNumber(activity.restingKcal);
    const suppliedTotal = toNumber(activity.totalKcal);
    const total = suppliedTotal ?? (active !== null && resting !== null ? active + resting : null);
    const stepsRaw = toNumber(activity.steps);
    const steps = stepsRaw === null ? null : Math.round(stepsRaw);
    const exerciseMinutes = toNumber(activity.exerciseMinutes);
    const workouts = Array.isArray(activity.workouts) ? activity.workouts.slice(0, 50) : [];
    const sourceDetails = Array.isArray(activity.sourceDetails) ? activity.sourceDetails.slice(0, 20) : [];
    const values = [active, resting, total].filter((value) => value !== null);

    if (values.some((value) => value < 0 || value > 20000)) {
      return json({ ok: false, code: "INVALID_ENERGY_VALUE" }, 400);
    }
    if (steps !== null && (steps < 0 || steps > 200000)) {
      return json({ ok: false, code: "INVALID_STEPS_VALUE" }, 400);
    }
    if (exerciseMinutes !== null && (exerciseMinutes < 0 || exerciseMinutes > 1440)) {
      return json({ ok: false, code: "INVALID_EXERCISE_MINUTES" }, 400);
    }

    await ensureHealthEnergyTable(env);
    await env.DB.prepare(`
      INSERT INTO health_energy_daily (
        energy_date, active_kcal, resting_kcal, total_kcal, source, note, recorded_at,
        steps, exercise_minutes, workout_count, sampled_at, source_details, workouts_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(energy_date) DO UPDATE SET
        active_kcal = excluded.active_kcal,
        resting_kcal = excluded.resting_kcal,
        total_kcal = excluded.total_kcal,
        source = excluded.source,
        note = excluded.note,
        recorded_at = excluded.recorded_at,
        steps = excluded.steps,
        exercise_minutes = excluded.exercise_minutes,
        workout_count = excluded.workout_count,
        sampled_at = excluded.sampled_at,
        source_details = excluded.source_details,
        workouts_json = excluded.workouts_json
    `).bind(
      date,
      active,
      resting,
      total,
      String(activity.source || "apple_health").trim().slice(0, 40) || "apple_health",
      String(activity.note || "").trim().slice(0, 500) || null,
      new Date().toISOString(),
      steps,
      exerciseMinutes,
      workouts.length,
      String(activity.sampledAt || "").trim().slice(0, 50) || null,
      JSON.stringify(sourceDetails),
      JSON.stringify(workouts)
    ).run();
    activitySaved = true;
  }

  let bodyImported = 0;
  if (bodySamples.length) {
    await ensureHealthBodyTable(env);
    const allowed = new Set(["bodyMass", "bodyFatPercentage", "bodyMassIndex", "leanBodyMass"]);
    const ranges = {
      bodyMass: [20, 400],
      bodyFatPercentage: [0, 100],
      bodyMassIndex: [5, 100],
      leanBodyMass: [5, 300]
    };

    for (const raw of bodySamples) {
      const type = String(raw?.type || "").trim();
      if (!allowed.has(type)) continue;
      const value = toNumber(raw?.value);
      const measured = new Date(String(raw?.measuredAt || ""));
      const source = String(raw?.source || "apple_health").trim().slice(0, 120) || "apple_health";
      if (value === null || !Number.isFinite(measured.getTime())) continue;
      const [min, max] = ranges[type];
      if (value < min || value > max) continue;
      const measuredAt = measured.toISOString();
      const sampleDate = localHealthDateKey(measured);
      const unit = String(raw?.unit || (type === "bodyFatPercentage" ? "%" : type === "bodyMassIndex" ? "count" : "kg")).slice(0, 24);

      await env.DB.prepare(`
        INSERT INTO health_body_samples (
          metric_type, metric_value, unit, sample_date, measured_at, source, imported_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(metric_type, measured_at, source) DO UPDATE SET
          metric_value = excluded.metric_value,
          unit = excluded.unit,
          sample_date = excluded.sample_date,
          imported_at = excluded.imported_at
      `).bind(
        type,
        value,
        unit,
        sampleDate,
        measuredAt,
        source,
        new Date().toISOString()
      ).run();
      bodyImported += 1;
    }
  }

  let recoverySaved = false;
  if (recovery) {
    const date = String(recovery.date || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ ok: false, code: "INVALID_RECOVERY_DATE" }, 400);

    const bounds = {
      restingHeartRate: [20, 250],
      walkingHeartRateAverage: [20, 250],
      hrvSdnnMs: [0, 1000],
      respiratoryRate: [2, 80],
      oxygenSaturationPct: [0, 100],
      vo2Max: [1, 100],
      wristTemperatureC: [15, 50],
      sleepAsleepMinutes: [0, 1440],
      sleepInBedMinutes: [0, 1440],
      sleepAwakeMinutes: [0, 1440],
      sleepCoreMinutes: [0, 1440],
      sleepDeepMinutes: [0, 1440],
      sleepRemMinutes: [0, 1440]
    };
    const clean = {};
    let hasValue = false;
    for (const [field, [min, max]] of Object.entries(bounds)) {
      const value = toNumber(recovery[field]);
      clean[field] = value;
      if (value !== null) {
        if (value < min || value > max) return json({ ok: false, code: "INVALID_RECOVERY_VALUE" }, 400);
        hasValue = true;
      }
    }

    if (hasValue) {
      const sourceDetails = Array.isArray(recovery.sourceDetails) ? recovery.sourceDetails.slice(0, 20) : [];
      await ensureHealthRecoveryTable(env);
      await env.DB.prepare(`
        INSERT INTO health_recovery_daily (
          recovery_date, resting_hr_bpm, walking_hr_bpm, hrv_sdnn_ms,
          respiratory_rate, oxygen_saturation_pct, vo2_max, wrist_temperature_c,
          sleep_asleep_minutes, sleep_in_bed_minutes, sleep_awake_minutes,
          sleep_core_minutes, sleep_deep_minutes, sleep_rem_minutes,
          source, sampled_at, source_details, recorded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(recovery_date) DO UPDATE SET
          resting_hr_bpm = excluded.resting_hr_bpm,
          walking_hr_bpm = excluded.walking_hr_bpm,
          hrv_sdnn_ms = excluded.hrv_sdnn_ms,
          respiratory_rate = excluded.respiratory_rate,
          oxygen_saturation_pct = excluded.oxygen_saturation_pct,
          vo2_max = excluded.vo2_max,
          wrist_temperature_c = excluded.wrist_temperature_c,
          sleep_asleep_minutes = excluded.sleep_asleep_minutes,
          sleep_in_bed_minutes = excluded.sleep_in_bed_minutes,
          sleep_awake_minutes = excluded.sleep_awake_minutes,
          sleep_core_minutes = excluded.sleep_core_minutes,
          sleep_deep_minutes = excluded.sleep_deep_minutes,
          sleep_rem_minutes = excluded.sleep_rem_minutes,
          source = excluded.source,
          sampled_at = excluded.sampled_at,
          source_details = excluded.source_details,
          recorded_at = excluded.recorded_at
      `).bind(
        date,
        clean.restingHeartRate,
        clean.walkingHeartRateAverage,
        clean.hrvSdnnMs,
        clean.respiratoryRate,
        clean.oxygenSaturationPct,
        clean.vo2Max,
        clean.wristTemperatureC,
        clean.sleepAsleepMinutes,
        clean.sleepInBedMinutes,
        clean.sleepAwakeMinutes,
        clean.sleepCoreMinutes,
        clean.sleepDeepMinutes,
        clean.sleepRemMinutes,
        String(recovery.source || "apple_health").trim().slice(0, 40) || "apple_health",
        String(recovery.sampledAt || "").trim().slice(0, 50) || null,
        JSON.stringify(sourceDetails),
        new Date().toISOString()
      ).run();
      recoverySaved = true;
    }
  }

  if (!activitySaved && bodyImported === 0 && !recoverySaved) {
    return json({ ok: false, code: "EMPTY_HEALTH_SYNC" }, 400);
  }

  healthCache = { value: null, expiresAt: 0, date: null };
  return json({ ok: true, activitySaved, bodySamplesImported: bodyImported, recoverySaved }, 201);
}


async function appendFinanceSheetRow(env, range, values) {
  if (!hasFinanceGoogleConfig(env)) throw new Error("FINANCE_NOT_CONFIGURED");
  const token = await getGoogleAccessToken(env);
  const endpoint =
    "https://sheets.googleapis.com/v4/spreadsheets/" +
    encodeURIComponent(env.FINANCE_SHEET_ID) +
    "/values/" + encodeURIComponent(range) +
    ":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values: [values] })
  });
  if (!response.ok) throw new Error("FINANCE_WRITE_" + response.status);
  financeCache = { value: null, expiresAt: 0 };
}

function gymPlanExercises(plan = []) {
  return (Array.isArray(plan) ? plan : []).flatMap((day) =>
    (Array.isArray(day?.exercises) ? day.exercises : []).map((exercise) => ({
      ...exercise,
      dayId: day.id,
      dayTitle: day.title,
      dayOrder: day.order,
      focus: day.focus,
      restSeconds: day.restSeconds
    }))
  );
}

async function saveGymExerciseLink(request, env) {
  let payload;
  try { payload = await request.json(); }
  catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }

  const planExerciseId = String(payload?.planExerciseId || "").trim();
  const providerExerciseId = String(payload?.providerExerciseId || "").trim();
  if (!planExerciseId || !/^\d+$/.test(providerExerciseId)) {
    return json({ ok: false, code: "INVALID_GYM_EXERCISE_LINK" }, 400);
  }

  let plan = [];
  if (hasFinanceGoogleConfig(env)) {
    const finance = await fetchFinanceSummary(env);
    plan = finance.value?.health?.gymPlan || [];
  }
  if (!gymPlanExercises(plan).some((exercise) => exercise.id === planExerciseId)) {
    return json({ ok: false, code: "GYM_PLAN_EXERCISE_NOT_FOUND" }, 404);
  }

  try {
    const link = await linkGymExercise(env, { planExerciseId, providerExerciseId });
    return json({ ok: true, link }, 201);
  } catch (error) {
    const code = String(error?.message || "GYM_EXERCISE_LINK_FAILED");
    if (code === "INVALID_WGER_EXERCISE_ID" || code === "GYM_PLAN_EXERCISE_ID_REQUIRED") {
      return json({ ok: false, code }, 400);
    }
    if (/^WGER_\d+$/.test(code)) return json({ ok: false, code: "GYM_LIBRARY_UPSTREAM_FAILED" }, 502);
    throw error;
  }
}

async function saveGymPlanExercise(request, env) {
  if (!hasFinanceGoogleConfig(env)) return json({ ok: false, code: "FINANCE_NOT_CONFIGURED" }, 503);

  let payload;
  try { payload = await request.json(); }
  catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }

  const dayId = String(payload?.dayId || "").trim();
  const providerExerciseId = String(payload?.providerExerciseId || "").trim();
  const setsTarget = Math.max(1, Math.min(12, Math.floor(Number(payload?.setsTarget || 3) || 3)));
  const repsTarget = String(payload?.repsTarget || "8-12").trim().slice(0, 30) || "8-12";
  if (!dayId || !/^\d+$/.test(providerExerciseId)) {
    return json({ ok: false, code: "INVALID_GYM_PLAN_EXERCISE" }, 400);
  }

  const finance = await fetchFinanceSummary(env);
  const plan = finance.value?.health?.gymPlan || [];
  const day = plan.find((item) => String(item?.id) === dayId);
  if (!day) return json({ ok: false, code: "GYM_DAY_NOT_FOUND" }, 404);

  const exerciseId = "wger-" + providerExerciseId;
  if (gymPlanExercises(plan).some((exercise) => exercise.id === exerciseId)) {
    return json({ ok: false, code: "GYM_EXERCISE_ALREADY_IN_PLAN" }, 409);
  }

  let exercise;
  try {
    exercise = await getGymLibraryExercise(providerExerciseId);
  } catch (error) {
    const code = String(error?.message || "GYM_LIBRARY_UPSTREAM_FAILED");
    if (code === "INVALID_WGER_EXERCISE_ID") return json({ ok: false, code }, 400);
    return json({ ok: false, code: "GYM_LIBRARY_UPSTREAM_FAILED" }, 502);
  }

  const nextOrder = Math.max(
    0,
    ...(Array.isArray(day.exercises) ? day.exercises : []).map((item) => Number(item?.order) || 0)
  ) + 1;

  await appendFinanceSheetRow(env, "GimnasioPlan!A:N", [
    day.id,
    day.order ?? "",
    day.title || day.id,
    day.focus || "",
    day.restSeconds ?? "",
    nextOrder,
    exerciseId,
    exercise.name,
    setsTarget,
    repsTarget,
    "",
    "",
    "",
    ""
  ]);

  const link = await linkGymExercise(env, {
    planExerciseId: exerciseId,
    providerExerciseId
  });

  return json({
    ok: true,
    added: {
      dayId: day.id,
      exerciseId,
      exerciseName: exercise.name,
      setsTarget,
      repsTarget,
      provider: "wger",
      providerExerciseId
    },
    link
  }, 201);
}


async function ensureGymTables(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS gym_sessions (
      id TEXT PRIMARY KEY,
      session_date TEXT NOT NULL,
      day_id TEXT NOT NULL,
      day_title TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS gym_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      sets_done INTEGER,
      reps_done TEXT,
      load_value REAL,
      load_unit TEXT,
      notes TEXT,
      FOREIGN KEY(session_id) REFERENCES gym_sessions(id) ON DELETE CASCADE
    )
  `).run();

  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_gym_entries_exercise ON gym_entries(exercise_id)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_gym_sessions_date ON gym_sessions(session_date DESC)").run();
}

async function fetchGymHistory(env) {
  await ensureGymTables(env);
  const sessionsResult = await env.DB.prepare(`
    SELECT id, session_date, day_id, day_title, notes, created_at
    FROM gym_sessions
    ORDER BY session_date DESC, created_at DESC
    LIMIT 40
  `).all();

  const entriesResult = await env.DB.prepare(`
    SELECT id, session_id, exercise_id, exercise_name, sets_done, reps_done, load_value, load_unit, notes
    FROM gym_entries
    ORDER BY id ASC
  `).all();

  const entriesBySession = new Map();
  for (const entry of entriesResult.results || []) {
    if (!entriesBySession.has(entry.session_id)) entriesBySession.set(entry.session_id, []);
    entriesBySession.get(entry.session_id).push({
      id: entry.id,
      exerciseId: entry.exercise_id,
      exerciseName: entry.exercise_name,
      setsDone: entry.sets_done,
      repsDone: entry.reps_done,
      loadValue: entry.load_value,
      loadUnit: entry.load_unit,
      notes: entry.notes
    });
  }

  const sessions = (sessionsResult.results || []).map((session) => ({
    id: session.id,
    sessionDate: session.session_date,
    dayId: session.day_id,
    dayTitle: session.day_title,
    notes: session.notes,
    createdAt: session.created_at,
    entries: entriesBySession.get(session.id) || []
  }));

  const progressMap = new Map();
  for (const session of [...sessions].reverse()) {
    for (const entry of session.entries) {
      if (entry.loadValue == null || !Number.isFinite(Number(entry.loadValue))) continue;
      if (!progressMap.has(entry.exerciseId)) progressMap.set(entry.exerciseId, []);
      progressMap.get(entry.exerciseId).push({
        date: session.sessionDate,
        value: Number(entry.loadValue),
        unit: entry.loadUnit || null
      });
    }
  }

  return {
    sessions,
    progress: Object.fromEntries(progressMap)
  };
}

async function saveGymSession(request, env) {
  await ensureGymTables(env);
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, code: "INVALID_JSON" }, 400);
  }

  const sessionDate = String(payload?.sessionDate || "").trim();
  const dayId = String(payload?.dayId || "").trim();
  const dayTitle = String(payload?.dayTitle || "").trim();
  const notes = String(payload?.notes || "").trim().slice(0, 1000);
  const entries = Array.isArray(payload?.entries) ? payload.entries : [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate) || !dayId || !entries.length) {
    return json({ ok: false, code: "INVALID_GYM_SESSION" }, 400);
  }

  if (hasHealthGoogleConfig(env)) {
    try {
      const health = await fetchHealthNutritionSummary(env, { date: sessionDate });
      if (toNumber(health.value?.activityObjective?.strengthSessionsWeek) === 0) {
        return json({
          ok: false,
          code: "GYM_TEMPORARILY_PAUSED",
          reason: health.value?.activityObjective?.note || null
        }, 409);
      }
    } catch (error) {
      console.warn("Gym pause validation unavailable", String(error?.message || error));
    }
  }

  const cleanEntries = entries
    .map((entry) => ({
      exerciseId: String(entry?.exerciseId || "").trim(),
      exerciseName: String(entry?.exerciseName || "").trim().slice(0, 160),
      setsDone: toNumber(entry?.setsDone),
      repsDone: String(entry?.repsDone ?? "").trim().slice(0, 80),
      loadValue: toNumber(entry?.loadValue),
      loadUnit: String(entry?.loadUnit || "").trim().slice(0, 40),
      notes: String(entry?.notes || "").trim().slice(0, 500)
    }))
    .filter((entry) => entry.exerciseId && entry.exerciseName);

  if (!cleanEntries.length) return json({ ok: false, code: "EMPTY_GYM_SESSION" }, 400);

  const sessionId = crypto.randomUUID();
  const statements = [
    env.DB.prepare(`
      INSERT INTO gym_sessions (id, session_date, day_id, day_title, notes)
      VALUES (?, ?, ?, ?, ?)
    `).bind(sessionId, sessionDate, dayId, dayTitle || dayId, notes || null)
  ];

  for (const entry of cleanEntries) {
    statements.push(
      env.DB.prepare(`
        INSERT INTO gym_entries (
          session_id, exercise_id, exercise_name, sets_done, reps_done, load_value, load_unit, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        sessionId,
        entry.exerciseId,
        entry.exerciseName,
        entry.setsDone,
        entry.repsDone || null,
        entry.loadValue,
        entry.loadUnit || null,
        entry.notes || null
      )
    );
  }

  await env.DB.batch(statements);
  return json({ ok: true, sessionId }, 201);
}


async function deleteGymSession(sessionId, env) {
  await ensureGymTables(env);
  const id = String(sessionId || "").trim();
  if (!id) return json({ ok: false, code: "INVALID_SESSION_ID" }, 400);

  const existing = await env.DB.prepare(
    "SELECT id FROM gym_sessions WHERE id = ? LIMIT 1"
  ).bind(id).first();

  if (!existing) return json({ ok: false, code: "GYM_SESSION_NOT_FOUND" }, 404);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM gym_entries WHERE session_id = ?").bind(id),
    env.DB.prepare("DELETE FROM gym_sessions WHERE id = ?").bind(id)
  ]);

  return json({ ok: true, deletedSessionId: id });
}

async function ensureFamilyTables(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS family_cases (
      id TEXT PRIMARY KEY,
      person_scope TEXT NOT NULL,
      domain TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      priority TEXT NOT NULL DEFAULT 'medium',
      next_action TEXT,
      next_action_owner TEXT,
      due_at TEXT,
      waiting_on TEXT,
      sensitivity TEXT NOT NULL DEFAULT 'muy_confidencial',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS family_case_actions (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      action_type TEXT NOT NULL DEFAULT 'note',
      summary TEXT NOT NULL,
      owner TEXT,
      status TEXT,
      happened_at TEXT NOT NULL,
      due_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(case_id) REFERENCES family_cases(id) ON DELETE CASCADE
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS family_case_refs (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      document_type TEXT,
      source_provider TEXT NOT NULL,
      source_ref TEXT NOT NULL,
      document_date TEXT,
      summary TEXT,
      review_status TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(case_id) REFERENCES family_cases(id) ON DELETE CASCADE
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS family_wealth_items (
      id TEXT PRIMARY KEY,
      owner_scope TEXT NOT NULL,
      category TEXT NOT NULL,
      label TEXT NOT NULL,
      amount_eur REAL,
      valuation_status TEXT NOT NULL DEFAULT 'pending',
      as_of_date TEXT,
      source_provider TEXT NOT NULL DEFAULT 'd1',
      source_ref TEXT,
      note TEXT,
      sensitivity TEXT NOT NULL DEFAULT 'muy_confidencial',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();

  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_family_cases_scope_status ON family_cases(person_scope, status)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_family_cases_due ON family_cases(due_at)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_family_actions_case ON family_case_actions(case_id, happened_at DESC)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_family_refs_case ON family_case_refs(case_id, updated_at DESC)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_family_wealth_owner_category ON family_wealth_items(owner_scope, category)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_family_wealth_status ON family_wealth_items(valuation_status, updated_at DESC)").run();
}

const FAMILY_SCOPES = new Set(["mother", "father", "shared"]);
const FAMILY_DOMAINS = new Set(["health", "disability", "retirement", "property", "mortgage", "investment", "business", "tax", "admin", "legal", "other"]);
const FAMILY_STATUSES = new Set(["ACTIVE", "WAITING_EXTERNAL", "WAITING_DOCUMENT", "DECISION_OPEN", "SCHEDULED", "BLOCKED", "DONE", "ARCHIVED"]);
const FAMILY_PRIORITIES = new Set(["low", "medium", "high", "critical"]);
const FAMILY_ACTION_TYPES = new Set(["note", "update", "milestone", "communication", "document_request", "decision", "task"]);
const FAMILY_REF_PROVIDERS = new Set(["calendar", "finance", "litos", "email", "drive", "document", "d1", "other"]);
const FAMILY_WEALTH_CATEGORIES = new Set(["investment", "property", "business", "cash", "debt", "other"]);
const FAMILY_WEALTH_STATUSES = new Set(["confirmed", "estimated", "pending"]);

function familyTrim(value, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function familyNullable(value, max = 2000) {
  const clean = familyTrim(value, max);
  return clean || null;
}

function familyCaseFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    personScope: row.person_scope,
    domain: row.domain,
    title: row.title,
    summary: row.summary || null,
    status: row.status,
    priority: row.priority,
    nextAction: row.next_action || null,
    nextActionOwner: row.next_action_owner || null,
    dueAt: row.due_at || null,
    waitingOn: row.waiting_on || null,
    sensitivity: row.sensitivity || "muy_confidencial",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function familyActionFromRow(row) {
  return {
    id: row.id,
    caseId: row.case_id,
    actionType: row.action_type,
    summary: row.summary,
    owner: row.owner || null,
    status: row.status || null,
    happenedAt: row.happened_at,
    dueAt: row.due_at || null,
    createdAt: row.created_at
  };
}

function familyRefFromRow(row) {
  return {
    id: row.id,
    caseId: row.case_id,
    documentType: row.document_type || null,
    sourceProvider: row.source_provider,
    sourceRef: row.source_ref,
    documentDate: row.document_date || null,
    summary: row.summary || null,
    reviewStatus: row.review_status || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function familyDateOrNull(value) {
  const clean = familyTrim(value, 80);
  if (!clean) return null;
  const parsed = new Date(clean);
  return Number.isFinite(parsed.getTime()) ? clean : null;
}

async function fetchFamilyCases(env, { scope = null, status = null } = {}) {
  await ensureFamilyTables(env);
  const clauses = [];
  const binds = [];

  if (scope) {
    if (!FAMILY_SCOPES.has(scope)) throw new Error("INVALID_FAMILY_SCOPE");
    clauses.push("person_scope = ?");
    binds.push(scope);
  }

  if (status) {
    if (!FAMILY_STATUSES.has(status)) throw new Error("INVALID_FAMILY_STATUS");
    clauses.push("status = ?");
    binds.push(status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const statement = env.DB.prepare(`
    SELECT id, person_scope, domain, title, summary, status, priority,
           next_action, next_action_owner, due_at, waiting_on, sensitivity,
           created_at, updated_at
    FROM family_cases
    ${where}
    ORDER BY
      CASE priority WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC,
      CASE WHEN due_at IS NULL OR due_at = '' THEN 1 ELSE 0 END,
      due_at ASC,
      updated_at DESC
  `);
  const result = binds.length ? await statement.bind(...binds).all() : await statement.all();

  return (result.results || []).map(familyCaseFromRow);
}

async function fetchFamilyCaseDetail(env, caseId) {
  await ensureFamilyTables(env);
  const id = familyTrim(caseId, 160);
  if (!id) return null;

  const caseRow = await env.DB.prepare(`
    SELECT id, person_scope, domain, title, summary, status, priority,
           next_action, next_action_owner, due_at, waiting_on, sensitivity,
           created_at, updated_at
    FROM family_cases
    WHERE id = ?
    LIMIT 1
  `).bind(id).first();

  if (!caseRow) return null;

  const [actionsResult, refsResult] = await Promise.all([
    env.DB.prepare(`
      SELECT id, case_id, action_type, summary, owner, status, happened_at, due_at, created_at
      FROM family_case_actions
      WHERE case_id = ?
      ORDER BY happened_at DESC, created_at DESC
      LIMIT 100
    `).bind(id).all(),
    env.DB.prepare(`
      SELECT id, case_id, document_type, source_provider, source_ref, document_date,
             summary, review_status, created_at, updated_at
      FROM family_case_refs
      WHERE case_id = ?
      ORDER BY COALESCE(document_date, updated_at) DESC
      LIMIT 100
    `).bind(id).all()
  ]);

  return {
    case: familyCaseFromRow(caseRow),
    actions: (actionsResult.results || []).map(familyActionFromRow),
    references: (refsResult.results || []).map(familyRefFromRow)
  };
}

async function fetchFamilyHomeSummary(env) {
  const cases = await fetchFamilyCases(env);
  const open = cases.filter((item) => !["DONE", "ARCHIVED"].includes(item.status));
  const now = Date.now();
  const attentionLimit = now + 21 * 24 * 60 * 60 * 1000;
  const needsAttention = open.filter((item) => {
    const due = item.dueAt ? new Date(item.dueAt).getTime() : NaN;
    return ["high", "critical"].includes(item.priority)
      || ["BLOCKED", "DECISION_OPEN", "WAITING_DOCUMENT"].includes(item.status)
      || (Number.isFinite(due) && due <= attentionLimit);
  });
  const dueDates = open
    .map((item) => item.dueAt)
    .filter(Boolean)
    .map((value) => ({ value, time: new Date(value).getTime() }))
    .filter((item) => Number.isFinite(item.time) && item.time >= now)
    .sort((a, b) => a.time - b.time);

  return {
    openCount: open.length,
    attentionCount: needsAttention.length,
    waitingCount: open.filter((item) => item.status.startsWith("WAITING_")).length,
    decisionOpenCount: open.filter((item) => item.status === "DECISION_OPEN").length,
    nextDueAt: dueDates[0]?.value || null,
    updatedAt: cases.reduce((latest, item) => !latest || item.updatedAt > latest ? item.updatedAt : latest, null)
  };
}

function familyWealthFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerScope: row.owner_scope,
    category: row.category,
    label: row.label,
    amountEur: row.amount_eur === null || row.amount_eur === undefined ? null : Number(row.amount_eur),
    valuationStatus: row.valuation_status,
    asOfDate: row.as_of_date || null,
    sourceProvider: row.source_provider || "d1",
    sourceRef: row.source_ref || null,
    note: row.note || null,
    sensitivity: row.sensitivity || "muy_confidencial",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function familyWealthAmount(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("INVALID_FAMILY_WEALTH_AMOUNT");
  return Math.round(parsed * 100) / 100;
}

async function fetchFamilyWealthFromFinanceSheet(env) {
  if (!hasFinanceGoogleConfig(env)) return [];

  try {
    const token = await getGoogleAccessToken(env);
    const params = new URLSearchParams({
      majorDimension: "ROWS",
      valueRenderOption: "UNFORMATTED_VALUE"
    });
    const range = encodeURIComponent("PatrimonioPadres!A1:J200");
    const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.FINANCE_SHEET_ID)}/values/${range}?${params.toString()}`;
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status !== 400 && response.status !== 404) {
        console.warn("PatrimonioPadres read failed", "GOOGLE_SHEETS_" + response.status);
      }
      return [];
    }

    const rows = (await response.json())?.values || [];
    if (rows.length < 2) return [];
    const headers = rows[0].map((value) => String(value ?? "").trim());
    const index = Object.fromEntries(headers.map((header, i) => [header, i]));
    const required = ["id", "owner_scope", "category", "label", "valuation_status"];
    if (required.some((header) => index[header] === undefined)) {
      console.warn("PatrimonioPadres invalid headers");
      return [];
    }

    const now = new Date().toISOString();
    return rows.slice(1).map((row) => {
      const amountRaw = row[index.amount_eur];
      const amount = amountRaw === "" || amountRaw === null || amountRaw === undefined ? null : Number(amountRaw);
      const ownerScope = familyTrim(row[index.owner_scope], 24);
      const category = familyTrim(row[index.category], 32);
      const valuationStatus = familyTrim(row[index.valuation_status], 24).toLowerCase();
      const sourceProvider = familyTrim(row[index.source_provider] || "finance", 32);
      const item = {
        id: familyTrim(row[index.id], 160),
        ownerScope,
        category,
        label: familyTrim(row[index.label], 240),
        amountEur: Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null,
        valuationStatus,
        asOfDate: familyNullable(row[index.as_of_date], 80),
        sourceProvider: FAMILY_REF_PROVIDERS.has(sourceProvider) ? sourceProvider : "finance",
        sourceRef: familyNullable(row[index.source_ref], 1000),
        note: familyNullable(row[index.note], 2000),
        sensitivity: "muy_confidencial",
        createdAt: null,
        updatedAt: now,
        managedBy: "finance-sheet"
      };
      if (!item.id || !item.label || !FAMILY_SCOPES.has(ownerScope) || !FAMILY_WEALTH_CATEGORIES.has(category) || !FAMILY_WEALTH_STATUSES.has(valuationStatus)) {
        return null;
      }
      if (valuationStatus !== "pending" && item.amountEur === null) return null;
      return item;
    }).filter(Boolean);
  } catch (error) {
    console.warn("PatrimonioPadres read failed", String(error?.message || error));
    return [];
  }
}

async function fetchFamilyWealth(env) {
  await ensureFamilyTables(env);
  const [result, sheetItems] = await Promise.all([
    env.DB.prepare(`
      SELECT id, owner_scope, category, label, amount_eur, valuation_status,
             as_of_date, source_provider, source_ref, note, sensitivity,
             created_at, updated_at
      FROM family_wealth_items
      ORDER BY
        CASE category
          WHEN 'investment' THEN 1
          WHEN 'property' THEN 2
          WHEN 'business' THEN 3
          WHEN 'cash' THEN 4
          WHEN 'other' THEN 5
          WHEN 'debt' THEN 6
          ELSE 7
        END,
        label COLLATE NOCASE
    `).all(),
    fetchFamilyWealthFromFinanceSheet(env)
  ]);

  const d1Items = (result.results || []).map((row) => ({ ...familyWealthFromRow(row), managedBy: "d1" }));
  const merged = new Map(d1Items.map((item) => [item.id, item]));
  for (const item of sheetItems) merged.set(item.id, item);
  const categoryOrder = { investment: 1, property: 2, business: 3, cash: 4, other: 5, debt: 6 };
  const items = [...merged.values()].sort((a, b) =>
    (categoryOrder[a.category] || 9) - (categoryOrder[b.category] || 9)
    || String(a.label || "").localeCompare(String(b.label || ""), "es")
  );

  const known = items.filter((item) => item.amountEur !== null && item.valuationStatus !== "pending");
  const assets = known.filter((item) => item.category !== "debt");
  const liabilities = known.filter((item) => item.category === "debt");
  const sum = (rows) => Math.round(rows.reduce((total, item) => total + Number(item.amountEur || 0), 0) * 100) / 100;
  const grossAssets = sum(assets);
  const liabilitiesTotal = sum(liabilities);

  return {
    items,
    summary: {
      grossAssets,
      liabilities: liabilitiesTotal,
      netKnown: Math.round((grossAssets - liabilitiesTotal) * 100) / 100,
      investments: sum(assets.filter((item) => item.category === "investment")),
      pendingValuations: items.filter((item) => item.valuationStatus === "pending" || item.amountEur === null).length,
      itemCount: items.length,
      updatedAt: items.reduce((latest, item) => !latest || (item.updatedAt && item.updatedAt > latest) ? item.updatedAt : latest, null),
      incomplete: items.some((item) => item.valuationStatus === "pending" || item.amountEur === null)
    }
  };
}

async function createFamilyWealthItem(request, env) {
  await ensureFamilyTables(env);
  let payload;
  try { payload = await request.json(); }
  catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }

  const ownerScope = familyTrim(payload?.ownerScope || "shared", 24);
  const category = familyTrim(payload?.category, 32);
  const label = familyTrim(payload?.label, 240);
  const valuationStatus = familyTrim(payload?.valuationStatus || "pending", 24).toLowerCase();
  const sourceProvider = familyTrim(payload?.sourceProvider || "d1", 32);
  let amountEur;
  try { amountEur = familyWealthAmount(payload?.amountEur); }
  catch (error) { return json({ ok: false, code: String(error?.message || "INVALID_FAMILY_WEALTH_AMOUNT") }, 400); }

  if (!FAMILY_SCOPES.has(ownerScope) || !FAMILY_WEALTH_CATEGORIES.has(category) || !label || !FAMILY_WEALTH_STATUSES.has(valuationStatus) || !FAMILY_REF_PROVIDERS.has(sourceProvider)) {
    return json({ ok: false, code: "INVALID_FAMILY_WEALTH_ITEM" }, 400);
  }
  if (valuationStatus !== "pending" && amountEur === null) {
    return json({ ok: false, code: "FAMILY_WEALTH_AMOUNT_REQUIRED" }, 400);
  }

  const now = new Date().toISOString();
  const asOfRaw = familyTrim(payload?.asOfDate, 80);
  const asOfDate = familyDateOrNull(asOfRaw);
  if (asOfRaw && !asOfDate) return json({ ok: false, code: "INVALID_FAMILY_WEALTH_AS_OF_DATE" }, 400);

  const id = `family_wealth_${crypto.randomUUID()}`;
  await env.DB.prepare(`
    INSERT INTO family_wealth_items (
      id, owner_scope, category, label, amount_eur, valuation_status,
      as_of_date, source_provider, source_ref, note, sensitivity,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'muy_confidencial', ?, ?)
  `).bind(
    id,
    ownerScope,
    category,
    label,
    amountEur,
    valuationStatus,
    asOfDate,
    sourceProvider,
    familyNullable(payload?.sourceRef, 1000),
    familyNullable(payload?.note, 2000),
    now,
    now
  ).run();

  const wealth = await fetchFamilyWealth(env);
  return json({ ok: true, id, item: wealth.items.find((item) => item.id === id) || null, summary: wealth.summary }, 201);
}

async function updateFamilyWealthItem(request, env, itemId) {
  await ensureFamilyTables(env);
  const id = familyTrim(itemId, 160);
  const existing = await env.DB.prepare("SELECT id FROM family_wealth_items WHERE id = ? LIMIT 1").bind(id).first();
  if (!existing) return json({ ok: false, code: "FAMILY_WEALTH_ITEM_NOT_FOUND" }, 404);

  let payload;
  try { payload = await request.json(); }
  catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }

  const fields = [];
  const values = [];
  const push = (column, value) => { fields.push(`${column} = ?`); values.push(value); };

  if (Object.hasOwn(payload, "ownerScope")) {
    const value = familyTrim(payload.ownerScope, 24);
    if (!FAMILY_SCOPES.has(value)) return json({ ok: false, code: "INVALID_FAMILY_WEALTH_OWNER" }, 400);
    push("owner_scope", value);
  }
  if (Object.hasOwn(payload, "category")) {
    const value = familyTrim(payload.category, 32);
    if (!FAMILY_WEALTH_CATEGORIES.has(value)) return json({ ok: false, code: "INVALID_FAMILY_WEALTH_CATEGORY" }, 400);
    push("category", value);
  }
  if (Object.hasOwn(payload, "label")) {
    const value = familyTrim(payload.label, 240);
    if (!value) return json({ ok: false, code: "INVALID_FAMILY_WEALTH_LABEL" }, 400);
    push("label", value);
  }
  if (Object.hasOwn(payload, "amountEur")) {
    let value;
    try { value = familyWealthAmount(payload.amountEur); }
    catch (error) { return json({ ok: false, code: String(error?.message || "INVALID_FAMILY_WEALTH_AMOUNT") }, 400); }
    push("amount_eur", value);
  }
  if (Object.hasOwn(payload, "valuationStatus")) {
    const value = familyTrim(payload.valuationStatus, 24).toLowerCase();
    if (!FAMILY_WEALTH_STATUSES.has(value)) return json({ ok: false, code: "INVALID_FAMILY_WEALTH_STATUS" }, 400);
    push("valuation_status", value);
  }
  if (Object.hasOwn(payload, "asOfDate")) {
    const raw = familyTrim(payload.asOfDate, 80);
    const value = familyDateOrNull(raw);
    if (raw && !value) return json({ ok: false, code: "INVALID_FAMILY_WEALTH_AS_OF_DATE" }, 400);
    push("as_of_date", value);
  }
  if (Object.hasOwn(payload, "sourceProvider")) {
    const value = familyTrim(payload.sourceProvider, 32);
    if (!FAMILY_REF_PROVIDERS.has(value)) return json({ ok: false, code: "INVALID_FAMILY_WEALTH_SOURCE" }, 400);
    push("source_provider", value);
  }
  if (Object.hasOwn(payload, "sourceRef")) push("source_ref", familyNullable(payload.sourceRef, 1000));
  if (Object.hasOwn(payload, "note")) push("note", familyNullable(payload.note, 2000));

  if (!fields.length) return json({ ok: false, code: "EMPTY_FAMILY_WEALTH_UPDATE" }, 400);
  const updatedAt = new Date().toISOString();
  fields.push("updated_at = ?");
  values.push(updatedAt, id);
  await env.DB.prepare(`UPDATE family_wealth_items SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();

  const wealth = await fetchFamilyWealth(env);
  return json({ ok: true, item: wealth.items.find((item) => item.id === id) || null, summary: wealth.summary });
}

async function deleteFamilyWealthItem(env, itemId) {
  await ensureFamilyTables(env);
  const id = familyTrim(itemId, 160);
  const existing = await env.DB.prepare("SELECT id FROM family_wealth_items WHERE id = ? LIMIT 1").bind(id).first();
  if (!existing) return json({ ok: false, code: "FAMILY_WEALTH_ITEM_NOT_FOUND" }, 404);
  await env.DB.prepare("DELETE FROM family_wealth_items WHERE id = ?").bind(id).run();
  return json({ ok: true, deletedItemId: id, summary: (await fetchFamilyWealth(env)).summary });
}

async function createFamilyCase(request, env) {
  await ensureFamilyTables(env);
  let payload;
  try { payload = await request.json(); }
  catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }

  const personScope = familyTrim(payload?.personScope, 24);
  const domain = familyTrim(payload?.domain, 32);
  const title = familyTrim(payload?.title, 240);
  const status = familyTrim(payload?.status || "ACTIVE", 32).toUpperCase();
  const priority = familyTrim(payload?.priority || "medium", 16).toLowerCase();

  if (!FAMILY_SCOPES.has(personScope) || !FAMILY_DOMAINS.has(domain) || !title || !FAMILY_STATUSES.has(status) || !FAMILY_PRIORITIES.has(priority)) {
    return json({ ok: false, code: "INVALID_FAMILY_CASE" }, 400);
  }

  const now = new Date().toISOString();
  const id = `family_case_${crypto.randomUUID()}`;
  await env.DB.prepare(`
    INSERT INTO family_cases (
      id, person_scope, domain, title, summary, status, priority,
      next_action, next_action_owner, due_at, waiting_on, sensitivity,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'muy_confidencial', ?, ?)
  `).bind(
    id,
    personScope,
    domain,
    title,
    familyNullable(payload?.summary, 5000),
    status,
    priority,
    familyNullable(payload?.nextAction, 2000),
    familyNullable(payload?.nextActionOwner, 240),
    familyDateOrNull(payload?.dueAt),
    familyNullable(payload?.waitingOn, 1000),
    now,
    now
  ).run();

  return json({ ok: true, id, case: (await fetchFamilyCaseDetail(env, id)).case }, 201);
}

async function updateFamilyCase(request, env, caseId) {
  await ensureFamilyTables(env);
  const existing = await fetchFamilyCaseDetail(env, caseId);
  if (!existing) return json({ ok: false, code: "FAMILY_CASE_NOT_FOUND" }, 404);

  let payload;
  try { payload = await request.json(); }
  catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }

  const fields = [];
  const values = [];
  const push = (column, value) => { fields.push(`${column} = ?`); values.push(value); };

  if (Object.hasOwn(payload, "personScope")) {
    const value = familyTrim(payload.personScope, 24);
    if (!FAMILY_SCOPES.has(value)) return json({ ok: false, code: "INVALID_FAMILY_SCOPE" }, 400);
    push("person_scope", value);
  }
  if (Object.hasOwn(payload, "domain")) {
    const value = familyTrim(payload.domain, 32);
    if (!FAMILY_DOMAINS.has(value)) return json({ ok: false, code: "INVALID_FAMILY_DOMAIN" }, 400);
    push("domain", value);
  }
  if (Object.hasOwn(payload, "title")) {
    const value = familyTrim(payload.title, 240);
    if (!value) return json({ ok: false, code: "INVALID_FAMILY_TITLE" }, 400);
    push("title", value);
  }
  if (Object.hasOwn(payload, "summary")) push("summary", familyNullable(payload.summary, 5000));
  if (Object.hasOwn(payload, "status")) {
    const value = familyTrim(payload.status, 32).toUpperCase();
    if (!FAMILY_STATUSES.has(value)) return json({ ok: false, code: "INVALID_FAMILY_STATUS" }, 400);
    push("status", value);
  }
  if (Object.hasOwn(payload, "priority")) {
    const value = familyTrim(payload.priority, 16).toLowerCase();
    if (!FAMILY_PRIORITIES.has(value)) return json({ ok: false, code: "INVALID_FAMILY_PRIORITY" }, 400);
    push("priority", value);
  }
  if (Object.hasOwn(payload, "nextAction")) push("next_action", familyNullable(payload.nextAction, 2000));
  if (Object.hasOwn(payload, "nextActionOwner")) push("next_action_owner", familyNullable(payload.nextActionOwner, 240));
  if (Object.hasOwn(payload, "dueAt")) {
    const raw = familyTrim(payload.dueAt, 80);
    const value = familyDateOrNull(raw);
    if (raw && !value) return json({ ok: false, code: "INVALID_FAMILY_DUE_AT" }, 400);
    push("due_at", value);
  }
  if (Object.hasOwn(payload, "waitingOn")) push("waiting_on", familyNullable(payload.waitingOn, 1000));

  if (!fields.length) return json({ ok: false, code: "EMPTY_FAMILY_UPDATE" }, 400);
  const updatedAt = new Date().toISOString();
  fields.push("updated_at = ?");
  values.push(updatedAt, existing.case.id);

  await env.DB.prepare(`UPDATE family_cases SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
  return json({ ok: true, ...(await fetchFamilyCaseDetail(env, existing.case.id)) });
}

async function appendFamilyAction(request, env, caseId) {
  await ensureFamilyTables(env);
  const existing = await fetchFamilyCaseDetail(env, caseId);
  if (!existing) return json({ ok: false, code: "FAMILY_CASE_NOT_FOUND" }, 404);

  let payload;
  try { payload = await request.json(); }
  catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }

  const actionType = familyTrim(payload?.actionType || "note", 40);
  const summary = familyTrim(payload?.summary, 4000);
  if (!FAMILY_ACTION_TYPES.has(actionType) || !summary) {
    return json({ ok: false, code: "INVALID_FAMILY_ACTION" }, 400);
  }

  const now = new Date().toISOString();
  const happenedAt = familyDateOrNull(payload?.happenedAt) || now;
  const dueAtRaw = familyTrim(payload?.dueAt, 80);
  const dueAt = familyDateOrNull(dueAtRaw);
  if (dueAtRaw && !dueAt) return json({ ok: false, code: "INVALID_FAMILY_ACTION_DUE_AT" }, 400);

  const id = `family_action_${crypto.randomUUID()}`;
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO family_case_actions (
        id, case_id, action_type, summary, owner, status, happened_at, due_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      existing.case.id,
      actionType,
      summary,
      familyNullable(payload?.owner, 240),
      familyNullable(payload?.status, 80),
      happenedAt,
      dueAt,
      now
    ),
    env.DB.prepare("UPDATE family_cases SET updated_at = ? WHERE id = ?").bind(now, existing.case.id)
  ]);

  return json({ ok: true, id, ...(await fetchFamilyCaseDetail(env, existing.case.id)) }, 201);
}

async function appendFamilyReference(request, env, caseId) {
  await ensureFamilyTables(env);
  const existing = await fetchFamilyCaseDetail(env, caseId);
  if (!existing) return json({ ok: false, code: "FAMILY_CASE_NOT_FOUND" }, 404);

  let payload;
  try { payload = await request.json(); }
  catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }

  const sourceProvider = familyTrim(payload?.sourceProvider, 40).toLowerCase();
  const sourceRef = familyTrim(payload?.sourceRef, 1200);
  if (!FAMILY_REF_PROVIDERS.has(sourceProvider) || !sourceRef) {
    return json({ ok: false, code: "INVALID_FAMILY_REFERENCE" }, 400);
  }

  const documentDateRaw = familyTrim(payload?.documentDate, 80);
  const documentDate = familyDateOrNull(documentDateRaw);
  if (documentDateRaw && !documentDate) return json({ ok: false, code: "INVALID_FAMILY_DOCUMENT_DATE" }, 400);

  const now = new Date().toISOString();
  const id = `family_ref_${crypto.randomUUID()}`;
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO family_case_refs (
        id, case_id, document_type, source_provider, source_ref, document_date,
        summary, review_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      existing.case.id,
      familyNullable(payload?.documentType, 120),
      sourceProvider,
      sourceRef,
      documentDate,
      familyNullable(payload?.summary, 2000),
      familyNullable(payload?.reviewStatus, 120),
      now,
      now
    ),
    env.DB.prepare("UPDATE family_cases SET updated_at = ? WHERE id = ?").bind(now, existing.case.id)
  ]);

  return json({ ok: true, id, ...(await fetchFamilyCaseDetail(env, existing.case.id)) }, 201);
}


export default {
  async fetch(request, env, ctx) {
    if (env.PRIVATE_APP_ENABLED !== "true") {
      return json({
        ok: false,
        code: "PRIVATE_APP_DISABLED",
        message: "La aplicación privada todavía no está habilitada."
      }, 503);
    }

    const url = new URL(request.url);

    if (url.pathname.startsWith("/v1/shopping-list/")) {
      return withSecurityHeaders(await handleShoppingSyncRequest(request, env, getGoogleAccessToken));
    }

    if (url.pathname === "/") {
      return withSecurityHeaders(Response.redirect(new URL("/app/", request.url), 302));
    }

    if (url.pathname === "/api/health") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      const row = await env.DB.prepare(
        "SELECT id, schema_version, created_at FROM state_snapshots WHERE is_current = 1 ORDER BY id DESC LIMIT 1"
      ).first();

      let financeSync = hasFinanceGoogleConfig(env) ? "configured" : "not-configured";
      if (hasFinanceGoogleConfig(env)) {
        try {
          const finance = await fetchFinanceSummary(env);
          financeSync = finance.status;
        } catch {
          financeSync = "error";
        }
      }

      let habitSync = hasHabitQuestGoogleConfig(env) ? "configured" : "not-configured";
      let habitCount = null;
      let habitTodayCount = null;
      if (hasHabitQuestGoogleConfig(env)) {
        try {
          const habits = await fetchHabitQuestSummary(env);
          habitSync = habits.status;
          habitCount = Array.isArray(habits.value?.habits) ? habits.value.habits.length : null;
          habitTodayCount = Array.isArray(habits.value?.todayHabits) ? habits.value.todayHabits.length : null;
        } catch {
          habitSync = "error";
        }
      }

      let nutritionSync = hasHealthGoogleConfig(env) ? "configured" : "not-configured";
      let nutritionFoodCount = null;
      if (hasHealthGoogleConfig(env)) {
        try {
          const nutrition = await fetchHealthNutritionSummary(env);
          nutritionSync = nutrition.status;
          nutritionFoodCount = Array.isArray(nutrition.value?.foods) ? nutrition.value.foods.length : null;
        } catch {
          nutritionSync = "error";
        }
      }

      let pantrySync = hasPantryGoogleConfig(env) ? "configured" : "not-configured";
      let pantryAvailableCount = null;
      let pantryLowStockCount = null;
      if (hasPantryGoogleConfig(env)) {
        try {
          const pantry = await fetchPantrySummary(env, getGoogleAccessToken);
          pantrySync = pantry.status;
          pantryAvailableCount = pantry.value?.summary?.availableProductCount ?? null;
          pantryLowStockCount = pantry.value?.summary?.lowStockCount ?? null;
        } catch {
          pantrySync = "error";
        }
      }

      let objectsSync = hasObjectsGoogleConfig(env) ? "configured" : "not-configured";
      let objectsTotalCount = null;
      let objectsActiveListCount = null;
      if (hasObjectsGoogleConfig(env)) {
        try {
          const objects = await fetchObjectsSummary(env, getGoogleAccessToken);
          objectsSync = objects.status;
          objectsTotalCount = objects.value?.summary?.totalObjects ?? null;
          objectsActiveListCount = objects.value?.summary?.activeListCount ?? null;
        } catch {
          objectsSync = "error";
        }
      }

      let projectsSync = hasProjectsGoogleConfig(env) ? "configured" : "not-configured";
      let projectsCount = null;
      let projectsActiveCount = null;
      if (hasProjectsGoogleConfig(env)) {
        try {
          const projects = await fetchProjectsSummary(env, getGoogleAccessToken);
          projectsSync = projects.status;
          projectsCount = projects.value?.summary?.total ?? null;
          projectsActiveCount = projects.value?.summary?.active ?? null;
        } catch {
          projectsSync = "error";
        }
      }

      let icloudCalendar = { status: "not-configured", value: null };
      let googleCalendar = { status: "not-configured", value: null };
      let icloudCalendarError = null;
      let googleCalendarError = null;

      if (hasIcloudCalendarConfig(env)) {
        try {
          icloudCalendar = await fetchIcloudCalendarSummary(env);
        } catch (error) {
          icloudCalendar = { status: "error", value: null };
          icloudCalendarError = safeIcloudErrorCode(error);
        }
      }

      if (hasGoogleCalendarConfig(env)) {
        try {
          googleCalendar = await fetchGoogleCalendarSummary(env, getGoogleAccessToken);
        } catch (error) {
          googleCalendar = { status: "error", value: null };
          googleCalendarError = safeGoogleCalendarErrorCode(error);
        }
      }

      const federatedCalendar = mergeCalendarSources(icloudCalendar, googleCalendar);
      const calendarSync = federatedCalendar?.source?.freshness || "not-configured";
      const calendarError = [icloudCalendarError, googleCalendarError].filter(Boolean).join("|") || null;
      const calendarMatchedCount = federatedCalendar?.source?.matchedCalendarCount ?? null;
      const calendarSelectedCount = federatedCalendar?.source?.selectedCalendarCount ?? null;
      const calendarEventCount = Array.isArray(federatedCalendar?.events) ? federatedCalendar.events.length : null;
      const googleCalendarSync = googleCalendar.status;
      const googleCalendarSelectedCount = googleCalendar.value?.source?.selectedCalendarCount ?? null;
      const googleCalendarMatchedCount = googleCalendar.value?.source?.matchedCalendarCount ?? null;
      const googleCalendarEventCount = Array.isArray(googleCalendar.value?.events) ? googleCalendar.value.events.length : null;
      const icloudCalendarSync = icloudCalendar.status;

      return json({
        ok: true,
        mode: "private-remote",
        snapshotAvailable: Boolean(row),
        schemaVersion: row?.schema_version ?? null,
        snapshotCreatedAt: row?.created_at ?? null,
        financeSync,
        habitSync,
        habitCount,
        habitTodayCount,
        nutritionSync,
        nutritionFoodCount,
        pantrySync,
        pantryAvailableCount,
        pantryLowStockCount,
        objectsSync,
        objectsTotalCount,
        objectsActiveListCount,
        projectsSync,
        projectsCount,
        projectsActiveCount,
        calendarSync,
        calendarError,
        calendarMatchedCount,
        calendarSelectedCount,
        calendarEventCount,
        icloudCalendarSync,
        icloudCalendarError,
        googleCalendarSync,
        googleCalendarError,
        googleCalendarSelectedCount,
        googleCalendarMatchedCount,
        googleCalendarEventCount
      });
    }

    if (url.pathname === "/api/habits") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      const date = url.searchParams.get("date") || undefined;
      try {
        const habits = await fetchHabitQuestSummary(env, { date });
        if (!habits.value) return json({ ok: false, code: "HABITQUEST_NOT_CONFIGURED" }, 503);
        return json({ ok: true, status: habits.status, ...habits.value });
      } catch (error) {
        console.warn("HabitQuest read failed", String(error?.message || error));
        return json({ ok: false, code: "HABITQUEST_READ_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/habits/toggle") {
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        return await toggleHabitQuest(request, env);
      } catch (error) {
        const rawCode = String(error?.message || "");
        console.warn("HabitQuest toggle failed", rawCode || error);
        const code = /^HABITQUEST_WRITE_(401|403|404|409|429|5\d\d)$/.test(rawCode)
          ? rawCode
          : "HABITQUEST_WRITE_FAILED";
        return json({ ok: false, code }, 502);
      }
    }

    if (url.pathname === "/api/habits/manage") {
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        return await manageHabitQuest(request, env);
      } catch (error) {
        const code = String(error?.message || "");
        console.warn("HabitQuest manage failed", code || error);
        if (code === "HABIT_NAME_REQUIRED") {
          return json({ ok: false, code }, 400);
        }
        return json({ ok: false, code: "HABITQUEST_MANAGE_FAILED" }, 502);
      }
    }

    // Contact lenses: private D1 source, behind the existing Cloudflare Access gateway.
    if (url.pathname === "/api/health/vision" || url.pathname === "/api/health/vision/replace") {
      const isReplace = url.pathname.endsWith("/replace");
      if (!isReplace && request.method === "GET") {
        try { return json(await readVision(env)); }
        catch { return json({ ok: false, code: "VISION_READ_FAILED" }, 502); }
      }
      if ((isReplace && request.method !== "POST") || (!isReplace && request.method !== "PUT")) {
        return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      }
      const origin = request.headers.get("Origin");
      if (origin && origin !== url.origin) return json({ ok: false, code: "INVALID_ORIGIN" }, 403);
      if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
        return json({ ok: false, code: "CONTENT_TYPE_REQUIRED" }, 415);
      }
      let body;
      try { body = await request.json(); }
      catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }
      try {
        return json(isReplace
          ? await recordVisionReplacement(env, body?.replacedOn)
          : await saveVision(env, body));
      } catch (error) {
        const code = String(error?.message || "");
        return /^INVALID_VISION_[A-Z_]+$/.test(code)
          ? json({ ok: false, code }, 400)
          : json({ ok: false, code: "VISION_WRITE_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/health/overview") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      const date = url.searchParams.get("date") || undefined;
      try {
        const health = await fetchHealthNutritionSummary(env, { date });
        if (!health.value) return json({ ok: false, code: "HEALTH_NOT_CONFIGURED" }, 503);
        let gym = { sessionsThisWeek: 0, sessions: [], progress: {} };
        try {
          const gymHistory = await fetchGymHistory(env);
          const selectedDate = health.value.date;
          const selected = new Date(`${selectedDate}T12:00:00+02:00`);
          const mondayOffset = (selected.getDay() + 6) % 7;
          const weekStart = healthAddDays(selectedDate, -mondayOffset);
          const weekSessions = (gymHistory.sessions || []).filter((session) =>
            session.sessionDate >= weekStart && session.sessionDate <= selectedDate
          );
          gym = {
            sessionsThisWeek: weekSessions.length,
            sessions: (gymHistory.sessions || []).slice(0, 16),
            progress: gymHistory.progress || {}
          };
        } catch (gymError) {
          console.warn("Health overview gym read failed", String(gymError?.message || gymError));
        }
        return json(healthOverviewPayload(health.value, health.status, gym));
      } catch (error) {
        const fallback = staleHealthSnapshot(date);
        if (fallback) {
          console.warn("Health overview live read failed; serving recent snapshot", String(error?.message || error));
          return json(healthOverviewPayload(fallback, "ok-stale"));
        }
        console.warn("Health overview read failed", String(error?.message || error));
        return json({ ok: false, code: "HEALTH_OVERVIEW_READ_FAILED" }, 502);
      }
    }

    const recipeImageMatch = url.pathname.match(/^\/api\/health\/recipes\/([^/]+)\/image$/);
    if (recipeImageMatch) {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        return await serveHealthRecipePhoto(env, decodeURIComponent(recipeImageMatch[1]));
      } catch (error) {
        console.warn("Recipe photo read failed", String(error?.message || error));
        return json({ ok: false, code: "RECIPE_PHOTO_READ_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/nutrition/menu") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      const date = url.searchParams.get("date") || undefined;
      try {
        const menu = await fetchWeeklyMenuLight(env, { date });
        if (!menu.value) return json({ ok: false, code: "HEALTH_NOT_CONFIGURED" }, 503);
        return json({ ok: true, status: menu.status, ...menu.value });
      } catch (error) {
        console.warn("Weekly menu light read failed", String(error?.message || error));
        return json({ ok: false, code: "WEEKLY_MENU_READ_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/nutrition") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      const date = url.searchParams.get("date") || undefined;
      try {
        const nutrition = await fetchHealthNutritionSummary(env, { date });
        if (!nutrition.value) return json({ ok: false, code: "HEALTH_NOT_CONFIGURED" }, 503);
        return json({ ok: true, status: nutrition.status, ...nutrition.value });
      } catch (error) {
        const fallback = staleHealthSnapshot(date);
        if (fallback) {
          console.warn("Nutrition live read failed; serving recent snapshot", String(error?.message || error));
          return json({ ok: true, status: "ok-stale", ...fallback });
        }
        console.warn("Nutrition read failed", String(error?.message || error));
        return json({ ok: false, code: "NUTRITION_READ_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/nutrition/entry") {
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try { return await saveNutritionEntry(request, env); }
      catch (error) {
        console.warn("Nutrition entry write failed", String(error?.message || error));
        return json({ ok: false, code: "NUTRITION_WRITE_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/nutrition/food") {
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try { return await saveNutritionFood(request, env); }
      catch (error) {
        console.warn("Nutrition food write failed", String(error?.message || error));
        return json({ ok: false, code: "NUTRITION_WRITE_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/nutrition/energy") {
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try { return await saveNutritionEnergy(request, env); }
      catch (error) {
        console.warn("Nutrition energy write failed", String(error?.message || error));
        return json({ ok: false, code: "NUTRITION_ENERGY_WRITE_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/health/adherence") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        const month = url.searchParams.get("month") || undefined;
        if (month && !/^\d{4}-\d{2}$/.test(month)) {
          return json({ ok: false, code: "INVALID_ADHERENCE_MONTH" }, 400);
        }
        const adherence = await fetchHealthAdherence(env, getGoogleAccessToken, { month });
        if (!adherence.value) return json({ ok: false, code: "HEALTH_NOT_CONFIGURED" }, 503);
        return json({ ok: true, status: adherence.status, ...adherence.value });
      } catch (error) {
        console.warn("Health adherence read failed", String(error?.message || error));
        return json({ ok: false, code: "HEALTH_ADHERENCE_READ_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/health/history") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        const endDate = url.searchParams.get("date") || undefined;
        const range = url.searchParams.get("range") || "365";
        if (!["30", "90", "180", "365", "all"].includes(range)) {
          return json({ ok: false, code: "INVALID_HEALTH_HISTORY_RANGE" }, 400);
        }
        const history = await fetchHealthHistory(env, { endDate, range });
        const sheetHistory = range === "all"
          ? history
          : await fetchHealthHistory(env, { endDate, range: "all" });
        try {
          const syncJobs = [
            persistHealthHistorySummary(env, history),
            persistHealthActivityDetail(env, sheetHistory),
            persistHealthBodyDetail(env, sheetHistory),
            persistHealthRecoveryDetail(env, sheetHistory)
          ];
          if (range !== "all") syncJobs.push(persistHealthHistorySummary(env, sheetHistory));
          await Promise.all(syncJobs);
        } catch (summaryError) {
          console.warn("Health history derived-sheet sync failed", String(summaryError?.message || summaryError));
        }
        return json({ ok: true, ...history });
      } catch (error) {
        console.warn("Health history read failed", String(error?.message || error));
        return json({ ok: false, code: "HEALTH_HISTORY_READ_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/health/sync") {
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try { return await saveHealthSync(request, env); }
      catch (error) {
        console.warn("Health sync write failed", String(error?.message || error));
        return json({ ok: false, code: "HEALTH_SYNC_WRITE_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/gym/exercises/meta") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        return json({ ok: true, ...(await getGymExerciseLibraryMeta()) });
      } catch (error) {
        console.warn("Gym exercise library meta failed", String(error?.message || error));
        return json({ ok: false, code: "GYM_LIBRARY_UPSTREAM_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/gym/exercises") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        const [library, links, finance] = await Promise.all([
          searchGymExerciseLibrary({
            q: url.searchParams.get("q") || "",
            muscle: url.searchParams.get("muscle") || "",
            equipment: url.searchParams.get("equipment") || "",
            category: url.searchParams.get("category") || "",
            featured: url.searchParams.get("featured") || "",
            limit: url.searchParams.get("limit") || 24,
            offset: url.searchParams.get("offset") || 0
          }),
          getGymExerciseLinks(env),
          hasFinanceGoogleConfig(env) ? fetchFinanceSummary(env).catch(() => null) : Promise.resolve(null)
        ]);
        const plan = finance?.value?.health?.gymPlan || [];
        const linkedIds = new Set(links.map((item) => String(item.providerExerciseId)));
        const directIds = new Set(
          gymPlanExercises(plan)
            .map((item) => /^wger-(\d+)$/.exec(String(item.id || ""))?.[1] || null)
            .filter(Boolean)
        );
        return json({
          ok: true,
          ...library,
          exercises: library.exercises.map((item) => ({
            ...item,
            inPlan: linkedIds.has(String(item.id)) || directIds.has(String(item.id))
          })),
          links
        });
      } catch (error) {
        console.warn("Gym exercise library search failed", String(error?.message || error));
        return json({ ok: false, code: "GYM_LIBRARY_UPSTREAM_FAILED" }, 502);
      }
    }

    const gymExerciseMediaMatch = url.pathname.match(/^\/api\/gym\/exercises\/(\d+)\/media\/(video|image)\/(\d+)$/);
    if (gymExerciseMediaMatch) {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        const mediaResponse = await proxyGymExerciseMedia(
          request,
          gymExerciseMediaMatch[1],
          gymExerciseMediaMatch[2],
          gymExerciseMediaMatch[3]
        );
        return withSecurityHeaders(mediaResponse);
      } catch (error) {
        console.warn("Gym exercise media proxy failed", String(error?.message || error));
        return json({ ok: false, code: "GYM_LIBRARY_MEDIA_FAILED" }, 502);
      }
    }

    const gymExerciseDetailMatch = url.pathname.match(/^\/api\/gym\/exercises\/(\d+)$/);
    if (gymExerciseDetailMatch) {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        const exercise = await getGymLibraryExercise(gymExerciseDetailMatch[1]);
        const links = await getGymExerciseLinks(env);
        const inPlan = links.some((item) => String(item.providerExerciseId) === String(exercise.id));
        return json({ ok: true, exercise: { ...exercise, inPlan } });
      } catch (error) {
        const code = String(error?.message || "GYM_LIBRARY_UPSTREAM_FAILED");
        if (code === "INVALID_WGER_EXERCISE_ID") return json({ ok: false, code }, 400);
        return json({ ok: false, code: "GYM_LIBRARY_UPSTREAM_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/gym/exercise-link") {
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try { return await saveGymExerciseLink(request, env); }
      catch (error) {
        console.warn("Gym exercise link failed", String(error?.message || error));
        return json({ ok: false, code: "GYM_EXERCISE_LINK_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/gym/plan/exercise") {
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try { return await saveGymPlanExercise(request, env); }
      catch (error) {
        console.warn("Gym plan exercise write failed", String(error?.message || error));
        return json({ ok: false, code: "GYM_PLAN_WRITE_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/gym") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      let gymPlan = [];
      if (hasFinanceGoogleConfig(env)) {
        try {
          const finance = await fetchFinanceSummary(env);
          gymPlan = finance.value?.health?.gymPlan || [];
        } catch {}
      }

      let trainingStatus = { paused: false, reason: null, effectiveDate: null };
      if (hasHealthGoogleConfig(env)) {
        try {
          const health = await fetchHealthNutritionSummary(env, { date: localHealthDateKey() });
          const activityGoal = health.value?.activityObjective || null;
          trainingStatus = {
            paused: toNumber(activityGoal?.strengthSessionsWeek) === 0,
            reason: activityGoal?.note || null,
            effectiveDate: activityGoal?.effectiveDate || null,
            updatedAt: activityGoal?.updatedAt || activityGoal?.effectiveDate || null
          };
        } catch {}
      }

      const [history, exerciseLinks] = await Promise.all([
        fetchGymHistory(env),
        getGymExerciseLinks(env).catch(() => [])
      ]);
      return json({ ok: true, plan: gymPlan, trainingStatus, exerciseLinks, ...history });
    }

    if (url.pathname === "/api/gym/session") {
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      return saveGymSession(request, env);
    }

    if (url.pathname.startsWith("/api/gym/session/")) {
      if (request.method !== "DELETE") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      const sessionId = decodeURIComponent(url.pathname.slice("/api/gym/session/".length));
      return deleteGymSession(sessionId, env);
    }

    if (url.pathname === "/api/source-link") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      const target = String(url.searchParams.get("target") || "").trim();
      try {
        const destination = await resolvePrivateSourceLink(env, target);
        return withSecurityHeaders(Response.redirect(destination, 302), { "Cache-Control": "no-store" });
      } catch (error) {
        const code = String(error?.message || "SOURCE_LINK_ERROR");
        if (code === "INVALID_SOURCE_LINK_TARGET") return json({ ok: false, code }, 400);
        if (code === "PANTRY_NOT_CONFIGURED" || code === "HEALTH_NOT_CONFIGURED" || code === "FINANCE_NOT_CONFIGURED") {
          return json({ ok: false, code }, 503);
        }
        console.warn("Source link resolve failed", code);
        return json({ ok: false, code: "SOURCE_LINK_FAILED" }, 502);
      }
    }

    const pantryProductMatch = url.pathname.match(/^\/api\/pantry\/products\/([^/]+)$/);
    if (pantryProductMatch) {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        const id = decodeURIComponent(pantryProductMatch[1]);
        const pantry = await fetchPantrySummary(env, getGoogleAccessToken);
        if (!pantry.value) return json({ ok: false, code: "PANTRY_NOT_CONFIGURED" }, 503);
        const product = pantry.value.products.find((item) => item.id === id);
        if (!product) return json({ ok: false, code: "PRODUCT_NOT_FOUND" }, 404);
        const stock = pantry.value.items.filter((item) => item.productId === id)
          .sort((a, b) => String(b.lastReviewedAt || "").localeCompare(String(a.lastReviewedAt || "")))[0];
        const reference = await fetchMercadonaReference(product);
        return json({ ok: true, item: {
          ...stock, ...product, productId: product.id,
          imageUrl: product.imageUrl || reference?.imageUrl || null,
          cataloguePrice: reference?.cataloguePrice || null
        } });
      } catch (error) {
        console.warn("Pantry product read failed", String(error?.message || "PANTRY_READ_ERROR"));
        return json({ ok: false, code: "PANTRY_READ_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/pantry") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        const pantry = await fetchPantrySummary(env, getGoogleAccessToken);
        if (!pantry.value) return json({ ok: false, code: "PANTRY_NOT_CONFIGURED" }, 503);
        return json({ ok: true, status: pantry.status, ...pantry.value });
      } catch (error) {
        console.warn("Pantry read failed", String(error?.message || "PANTRY_READ_ERROR"));
        return json({ ok: false, code: "PANTRY_READ_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/objects") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        const objects = await fetchObjectsSummary(env, getGoogleAccessToken);
        return json({ ok: true, status: objects.status, ...objects.value });
      } catch (error) {
        console.warn("Objects read failed", String(error?.message || "OBJECTS_READ_ERROR"));
        return json({ ok: false, code: "OBJECTS_READ_FAILED" }, 502);
      }
    }

    const internalLookRenderMatch = url.pathname.match(/^\/api\/internal\/objects\/look\/([^/]+)\/render$/);
    if (internalLookRenderMatch) {
      const lookId = decodeURIComponent(internalLookRenderMatch[1]);
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        if (!(await isObjectsBridgeAuthenticated(request, env))) {
          console.warn("Objects look render bridge request rejected", { lookId, code: "BRIDGE_AUTH_REQUIRED" });
          return json({ ok: false, code: "BRIDGE_AUTH_REQUIRED" }, 401);
        }
        const result = await renderObjectsLookImage(request, env, getGoogleAccessToken, lookId, {
          authenticated: true
        });
        console.info("Objects look canonical render completed", {
          lookId,
          ok: result?.ok === true,
          itemCount: result?.item_count || null
        });
        return json(result, 201);
      } catch (error) {
        if (error instanceof ObjectsImageError) {
          console.warn("Objects look canonical render failed", { lookId, code: error.code });
          return json({ ok: false, code: error.code }, error.status);
        }
        console.warn("Objects look canonical render failed", {
          lookId,
          code: String(error?.message || "OBJECTS_LOOK_RENDER_FAILED")
        });
        return json({ ok: false, code: "OBJECTS_LOOK_RENDER_FAILED" }, 502);
      }
    }

    const internalLookImageMatch = url.pathname.match(/^\/api\/internal\/objects\/look\/([^/]+)\/image$/);
    if (internalLookImageMatch) {
      const lookId = decodeURIComponent(internalLookImageMatch[1]);
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        if (!(await isObjectsBridgeAuthenticated(request, env))) {
          console.warn("Objects look bridge request rejected", { lookId, code: "BRIDGE_AUTH_REQUIRED" });
          return json({ ok: false, code: "BRIDGE_AUTH_REQUIRED" }, 401);
        }
        const result = await uploadObjectsLookImage(request, env, getGoogleAccessToken, lookId, {
          authenticated: true
        });
        console.info("Objects look bridge ingest completed", { lookId, ok: result?.ok === true });
        return json(result, 201);
      } catch (error) {
        if (error instanceof ObjectsImageError) {
          console.warn("Objects look bridge ingest failed", { lookId, code: error.code });
          return json({ ok: false, code: error.code }, error.status);
        }
        console.warn("Objects look bridge ingest failed", {
          lookId,
          code: String(error?.message || "OBJECTS_LOOK_BRIDGE_INGEST_FAILED")
        });
        return json({ ok: false, code: "OBJECTS_LOOK_BRIDGE_INGEST_FAILED" }, 502);
      }
    }

    const internalObjectImageMatch = url.pathname.match(/^\/api\/internal\/objects\/([^/]+)\/image$/);
    if (internalObjectImageMatch) {
      const objetoId = decodeURIComponent(internalObjectImageMatch[1]);
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        if (!(await isObjectsBridgeAuthenticated(request, env))) {
          console.warn("Objects bridge request rejected", { objetoId, code: "BRIDGE_AUTH_REQUIRED" });
          return json({ ok: false, code: "BRIDGE_AUTH_REQUIRED" }, 401);
        }
        const result = await uploadObjectsImage(request, env, getGoogleAccessToken, objetoId, {
          authenticated: true
        });
        console.info("Objects bridge ingest completed", {
          objetoId,
          imageType: result?.image_type || null,
          ok: result?.ok === true
        });
        return json(result, 201);
      } catch (error) {
        if (error instanceof ObjectsImageError) {
          console.warn("Objects bridge ingest failed", { objetoId, code: error.code });
          return json({ ok: false, code: error.code }, error.status);
        }
        console.warn("Objects bridge ingest failed", {
          objetoId,
          code: String(error?.message || "OBJECTS_BRIDGE_INGEST_FAILED")
        });
        return json({ ok: false, code: "OBJECTS_BRIDGE_INGEST_FAILED" }, 502);
      }
    }

    const lookImageMatch = url.pathname.match(/^\/api\/objects\/look\/([^/]+)\/image$/);
    if (lookImageMatch) {
      const lookId = decodeURIComponent(lookImageMatch[1]);
      try {
        if (request.method === "GET") {
          const response = await readObjectsLookImage(request, env, lookId);
          return withSecurityHeaders(response);
        }
        if (request.method === "POST") {
          const result = await uploadObjectsLookImage(request, env, getGoogleAccessToken, lookId);
          return json(result, 201);
        }
        return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      } catch (error) {
        if (error instanceof ObjectsImageError) {
          console.warn("Objects look image request failed", { lookId, code: error.code });
          return json({ ok: false, code: error.code }, error.status);
        }
        console.warn("Objects look image request failed", {
          lookId,
          code: String(error?.message || "OBJECTS_LOOK_IMAGE_ERROR")
        });
        return json({ ok: false, code: "OBJECTS_LOOK_IMAGE_FAILED" }, 502);
      }
    }

    const objectImageMatch = url.pathname.match(/^\/api\/objects\/([^/]+)\/image(?:\/(original|processed|thumbnail))?$/);
    if (objectImageMatch) {
      const objetoId = decodeURIComponent(objectImageMatch[1]);
      const imageType = objectImageMatch[2] || null;
      try {
        if (imageType) {
          if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
          const response = await readObjectsImage(request, env, getGoogleAccessToken, objetoId, imageType);
          return withSecurityHeaders(response);
        }
        if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
        const result = await uploadObjectsImage(request, env, getGoogleAccessToken, objetoId);
        return json(result, 201);
      } catch (error) {
        if (error instanceof ObjectsImageError) {
          console.warn("Objects image request failed", {
            objetoId,
            imageType: imageType || "upload",
            code: error.code
          });
          return json({ ok: false, code: error.code }, error.status);
        }
        console.warn("Objects image request failed", {
          objetoId,
          imageType: imageType || "upload",
          code: String(error?.message || "OBJECTS_IMAGE_ERROR")
        });
        return json({ ok: false, code: "OBJECTS_IMAGE_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/objects/look") {
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        let payload;
        try { payload = await request.json(); }
        catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }
        const look = await createObjectsLook(env, getGoogleAccessToken, payload);
        return json({ ok: true, look }, 201);
      } catch (error) {
        const code = String(error?.message || "OBJECTS_LOOK_ERROR");
        if (code.startsWith("INVALID_OBJECTS_LOOK_")) return json({ ok: false, code }, 400);
        if (code === "OBJECTS_NOT_CONFIGURED" || code === "OBJECTS_SOURCE_PENDING") return json({ ok: false, code }, 503);
        console.warn("Objects look write failed", code);
        return json({ ok: false, code: "OBJECTS_LOOK_WRITE_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/projects") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        const projects = await fetchProjectsSummary(env, getGoogleAccessToken);
        return json({ ok: true, status: projects.status, ...projects.value });
      } catch (error) {
        console.warn("Projects read failed", String(error?.message || "PROJECTS_READ_ERROR"));
        return json({ ok: false, code: "PROJECTS_READ_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/finance/electricity") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        const finance = await fetchFinanceSummary(env);
        return json({
          ok: true,
          status: finance.status,
          electricity: finance.value?.electricity || null
        });
      } catch (error) {
        console.warn("Electricity history read failed", String(error?.message || "ELECTRICITY_HISTORY_ERROR"));
        return json({ ok: false, code: "ELECTRICITY_HISTORY_READ_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/midas") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      try {
        const result = await fetchMidasDashboard();
        let research = { status: "not-configured", theses: [], cagr2031: [], counts: { theses: 0, cagr2031: 0, cagrComplete: 0 } };
        if (hasGoogleOauthConfig(env)) {
          try {
            research = await fetchMidasResearch(env, getGoogleAccessToken);
          } catch (researchError) {
            console.warn("MIDAS research read failed", String(researchError?.message || "MIDAS_RESEARCH_ERROR"));
            research = { status: "error", theses: [], cagr2031: [], counts: { theses: 0, cagr2031: 0, cagrComplete: 0 } };
          }
        }
        const dashboard = await addPrivateGeneticDiary(env.DB, result.dashboard);
        const [weeklyBootstrap, competitionHealth] = await Promise.all([
          fetchMidasWeeklyBootstrap(),
          fetchMidasWorkflowHealth()
        ]);
        return json({ ok: true, ...result,
          dashboard,
          research,
          lab: {
            weeklyBootstrap,
            competitionHealth
          } });
      } catch (error) {
        console.warn("MIDAS dashboard read failed", String(error?.message || "MIDAS_READ_ERROR"));
        return json({ ok: false, code: "MIDAS_READ_FAILED" }, 502);
      }
    }


    if (url.pathname === "/api/events") {
      try {
        if (request.method === "GET") {
          const scope = url.searchParams.get("scope") || "all";
          if (!["all", "active", "history"].includes(scope)) {
            return json({ ok: false, code: "INVALID_EVENT_SCOPE" }, 400);
          }
          const year = url.searchParams.get("year") || null;
          const kind = url.searchParams.get("kind") || null;
          if (hasEventsGoogleConfig(env)) {
            return json({
              ok: true,
              source: "sheet",
              events: await fetchEventSheetRecords(env, getGoogleAccessToken, { scope, year, kind }),
              summary: await fetchEventSheetHomeSummary(env, getGoogleAccessToken)
            });
          }
          return json({
            ok: true,
            source: "d1-fallback",
            events: await fetchEventRecords(env, { scope, year, kind }),
            summary: await fetchEventHomeSummary(env)
          });
        }
        if (request.method === "POST") {
          let payload;
          try { payload = await request.json(); }
          catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }
          if (hasEventsGoogleConfig(env)) {
            return json({ ok: true, ...(await createEventSheetRecord(env, getGoogleAccessToken, payload)) }, 201);
          }
          return json({ ok: true, ...(await createEventRecord(env, payload)) }, 201);
        }
        return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      } catch (error) {
        const code = String(error?.message || "EVENTS_ERROR");
        if (code.startsWith("INVALID_EVENT")) return json({ ok: false, code }, 400);
        console.warn("Events request failed", code);
        return json({ ok: false, code: "EVENTS_REQUEST_FAILED" }, 502);
      }
    }

    if (url.pathname.startsWith("/api/events/")) {
      const rest = url.pathname.slice("/api/events/".length);
      const parts = rest.split("/").filter(Boolean);
      const eventId = parts[0] ? decodeURIComponent(parts[0]) : "";
      try {
        if (parts.length === 1) {
          if (request.method === "GET") {
            const detail = hasEventsGoogleConfig(env)
              ? await fetchEventSheetDetail(env, getGoogleAccessToken, eventId)
              : await fetchEventDetail(env, eventId);
            return detail ? json({ ok: true, ...detail }) : json({ ok: false, code: "EVENT_NOT_FOUND" }, 404);
          }
          if (request.method === "PATCH") {
            let payload;
            try { payload = await request.json(); }
            catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }
            const updated = hasEventsGoogleConfig(env)
              ? await updateEventSheetRecord(env, getGoogleAccessToken, eventId, payload)
              : await updateEventRecord(env, eventId, payload);
            return json({ ok: true, ...updated });
          }
          return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
        }

        if (parts.length === 2 && parts[1] === "facts") {
          if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
          let payload;
          try { payload = await request.json(); }
          catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }
          const created = hasEventsGoogleConfig(env)
            ? await appendEventSheetFact(env, getGoogleAccessToken, eventId, payload)
            : await appendEventFact(env, eventId, payload);
          return json({ ok: true, ...created }, 201);
        }

        if (parts.length === 2 && parts[1] === "references") {
          if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
          let payload;
          try { payload = await request.json(); }
          catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }
          const created = hasEventsGoogleConfig(env)
            ? await appendEventSheetReference(env, getGoogleAccessToken, eventId, payload)
            : await appendEventReference(env, eventId, payload);
          return json({ ok: true, ...created }, 201);
        }

        return json({ ok: false, code: "NOT_FOUND" }, 404);
      } catch (error) {
        const code = String(error?.message || "EVENT_ERROR");
        if (code === "EVENT_NOT_FOUND") return json({ ok: false, code }, 404);
        if (code.startsWith("INVALID_EVENT")) return json({ ok: false, code }, 400);
        console.warn("Event detail request failed", code);
        return json({ ok: false, code: "EVENT_REQUEST_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/family/wealth") {
      try {
        if (request.method === "GET") return json({ ok: true, ...(await fetchFamilyWealth(env)) });
        if (request.method === "POST") return await createFamilyWealthItem(request, env);
        return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      } catch (error) {
        const code = String(error?.message || "");
        if (code.startsWith("INVALID_FAMILY_WEALTH_")) return json({ ok: false, code }, 400);
        console.warn("Family wealth request failed", code || "FAMILY_WEALTH_ERROR");
        return json({ ok: false, code: "FAMILY_WEALTH_FAILED" }, 502);
      }
    }

    if (url.pathname.startsWith("/api/family/wealth/")) {
      const itemId = decodeURIComponent(url.pathname.slice("/api/family/wealth/".length));
      try {
        if (request.method === "PATCH") return await updateFamilyWealthItem(request, env, itemId);
        if (request.method === "DELETE") return await deleteFamilyWealthItem(env, itemId);
        return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      } catch (error) {
        console.warn("Family wealth item request failed", String(error?.message || "FAMILY_WEALTH_ITEM_ERROR"));
        return json({ ok: false, code: "FAMILY_WEALTH_ITEM_REQUEST_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/family/cases") {
      try {
        if (request.method === "GET") {
          const scope = url.searchParams.get("scope") || null;
          const status = url.searchParams.get("status") || null;
          return json({
            ok: true,
            cases: await fetchFamilyCases(env, { scope, status }),
            summary: await fetchFamilyHomeSummary(env)
          });
        }
        if (request.method === "POST") return await createFamilyCase(request, env);
        return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      } catch (error) {
        const code = String(error?.message || "");
        if (code.startsWith("INVALID_FAMILY_")) return json({ ok: false, code }, 400);
        console.warn("Family cases request failed", code || "FAMILY_CASES_ERROR");
        return json({ ok: false, code: "FAMILY_CASES_FAILED" }, 502);
      }
    }

    if (url.pathname.startsWith("/api/family/cases/")) {
      const rest = url.pathname.slice("/api/family/cases/".length);
      const parts = rest.split("/").filter(Boolean);
      const caseId = parts[0] ? decodeURIComponent(parts[0]) : "";

      try {
        if (parts.length === 1) {
          if (request.method === "GET") {
            const detail = await fetchFamilyCaseDetail(env, caseId);
            return detail ? json({ ok: true, ...detail }) : json({ ok: false, code: "FAMILY_CASE_NOT_FOUND" }, 404);
          }
          if (request.method === "PATCH") return await updateFamilyCase(request, env, caseId);
          return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
        }

        if (parts.length === 2 && parts[1] === "actions") {
          if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
          return await appendFamilyAction(request, env, caseId);
        }

        if (parts.length === 2 && parts[1] === "references") {
          if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
          return await appendFamilyReference(request, env, caseId);
        }

        return json({ ok: false, code: "NOT_FOUND" }, 404);
      } catch (error) {
        console.warn("Family case request failed", String(error?.message || "FAMILY_CASE_ERROR"));
        return json({ ok: false, code: "FAMILY_CASE_REQUEST_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/health/appointments") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      if (!hasIcloudCalendarConfig(env)) {
        return json({ ok: false, code: "ICLOUD_NOT_CONFIGURED" }, 503);
      }

      try {
        const calendar = await fetchIcloudCalendarSummary(env);
        const now = Date.now() - 24 * 60 * 60 * 1000;
        const events = (Array.isArray(calendar.value?.events) ? calendar.value.events : [])
          .filter((event) => isMedicalCalendarEvent(event))
          .filter((event) => {
            const end = new Date(event.endsAt || event.startsAt || "").getTime();
            return Number.isFinite(end) && end >= now;
          })
          .sort((a, b) => new Date(a.startsAt || 0) - new Date(b.startsAt || 0));

        return json({
          ok: true,
          status: calendar.status,
          events,
          source: calendar.value?.source || null
        });
      } catch (error) {
        const code = safeIcloudErrorCode(error);
        console.warn("Medical appointments iCloud read failed", code);
        return json({ ok: false, code }, 502);
      }
    }

    if (url.pathname === "/api/career") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      if (!hasCareerGoogleConfig(env)) return json({ ok: false, code: "CAREER_NOT_CONFIGURED" }, 503);
      try {
        const career = await fetchCareerSummary(env, getGoogleAccessToken);
        if (!career.value) return json({ ok: false, code: "CAREER_SOURCE_EMPTY" }, 503);
        return json({ ...career.value, syncStatus: career.status || "ok" });
      } catch (error) {
        console.warn("Career read failed", String(error?.message || error));
        return json({ ok: false, code: "CAREER_READ_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/finance/delta") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      if (!hasFinanceGoogleConfig(env)) return json({ ok: false, code: "FINANCE_NOT_CONFIGURED" }, 503);
      try {
        const history = await fetchDeltaHistory(env, getGoogleAccessToken);
        const page = paginateDeltaOperations(history, {
          kind: url.searchParams.get("kind") || "trade",
          offset: url.searchParams.get("offset") || 0,
          limit: url.searchParams.get("limit") || 50
        });
        return json({
          ok: true,
          source: {
            kind: "delta-export-private",
            spreadsheetId: history.spreadsheetId,
            generatedAt: history.generatedAt
          },
          counts: history.counts,
          summary: history.summary,
          page
        });
      } catch (error) {
        console.warn("Delta operations read failed", String(error?.message || error));
        return json({ ok: false, code: "DELTA_HISTORY_FAILED" }, 502);
      }
    }

    if (url.pathname === "/api/state") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);

      const stateScope = String(url.searchParams.get("scope") || "").trim().toLowerCase();
      if (stateScope) {
        if (stateScope === "finance") {
          const finance = await loadStateSource(hasFinanceGoogleConfig(env), "Finance", () => fetchFinanceSummary(env), 8000);
          return json({
            ok: true,
            scope: stateScope,
            financeSync: finance.status || "error",
            financeSummary: finance.value || null,
            importantEventRules: finance.value?.importantEventRules || [],
            healthSummary: finance.value?.health || null
          });
        }

        if (stateScope === "habits") {
          const habits = await loadStateSource(hasHabitQuestGoogleConfig(env), "HabitQuest", () => fetchHabitQuestSummary(env), 7000);
          return json({
            ok: true,
            scope: stateScope,
            habitSync: habits.status || "error",
            habitsSummary: habits.value || null
          });
        }

        if (stateScope === "pantry") {
          const pantry = await loadStateSource(hasPantryGoogleConfig(env), "Pantry", () => fetchPantrySummary(env, getGoogleAccessToken), 7000);
          return json({
            ok: true,
            scope: stateScope,
            pantrySync: pantry.status || "error",
            pantrySummary: pantry.value?.summary || null
          });
        }

        if (stateScope === "objects") {
          const objects = await loadStateSource(hasObjectsGoogleConfig(env), "Objects", () => fetchObjectsSummary(env, getGoogleAccessToken), 7000);
          return json({
            ok: true,
            scope: stateScope,
            objectsSync: objects.status || "error",
            objectsSummary: objects.value?.summary || null
          });
        }

        if (stateScope === "calendar") {
          const [eventsStore, calendar, googleCalendar] = await Promise.all([
            loadStateSource(hasEventsGoogleConfig(env), "EventsSheet", () => fetchEventsSheetSource(env, getGoogleAccessToken), 7000),
            loadStateSource(hasIcloudCalendarConfig(env), "iCloud", () => fetchIcloudCalendarSummary(env), 7000),
            loadStateSource(hasGoogleCalendarConfig(env), "GoogleCalendar", () => fetchGoogleCalendarSummary(env, getGoogleAccessToken), 7000)
          ]);
          const federatedCalendar = mergeCalendarSources(calendar, googleCalendar, eventsStore.value?.calendarVisibility || []);
          return json({
            ok: true,
            scope: stateScope,
            eventsSheetSync: eventsStore.status || "error",
            calendarSync: calendar.status || "error",
            googleCalendarSync: googleCalendar.status || "error",
            importantEventRules: eventsStore.value?.rules || [],
            eventsSummary: eventsStore.value?.summary || null,
            calendarSummary: federatedCalendar || null,
            events: Array.isArray(federatedCalendar?.events) ? federatedCalendar.events : []
          });
        }

        return json({ ok: false, code: "INVALID_STATE_SCOPE" }, 400);
      }

      const row = await env.DB.prepare(
        "SELECT id, schema_version, created_at, content_json FROM state_snapshots WHERE is_current = 1 ORDER BY id DESC LIMIT 1"
      ).first();

      if (!row) {
        return json({
          ok: false,
          code: "STATE_NOT_INITIALIZED",
          message: "Todavía no existe una instantánea privada remota."
        }, 503);
      }

      let state;
      try {
        state = JSON.parse(row.content_json);
      } catch {
        return json({ ok: false, code: "INVALID_STATE_JSON" }, 500);
      }

      const [finance, habits, nutrition, pantry, objects, projects, career, eventsStore, calendar, googleCalendar, family] = await Promise.all([
        loadStateSource(hasFinanceGoogleConfig(env), "Finance", () => fetchFinanceSummary(env)),
        loadStateSource(hasHabitQuestGoogleConfig(env), "HabitQuest", () => fetchHabitQuestSummary(env)),
        loadStateSource(hasHealthGoogleConfig(env), "Nutrition", () => fetchHealthNutritionSummary(env)),
        loadStateSource(hasPantryGoogleConfig(env), "Pantry", () => fetchPantrySummary(env, getGoogleAccessToken)),
        loadStateSource(hasObjectsGoogleConfig(env), "Objects", () => fetchObjectsSummary(env, getGoogleAccessToken)),
        loadStateSource(hasProjectsGoogleConfig(env), "Projects", () => fetchProjectsSummary(env, getGoogleAccessToken)),
        loadStateSource(hasCareerGoogleConfig(env), "Career", () => fetchCareerSummary(env, getGoogleAccessToken)),
        loadStateSource(hasEventsGoogleConfig(env), "EventsSheet", () => fetchEventsSheetSource(env, getGoogleAccessToken)),
        loadStateSource(
          hasIcloudCalendarConfig(env),
          "iCloud",
          () => fetchIcloudCalendarSummary(env, { seedEvents: Array.isArray(state.events) ? state.events : [] }),
          7000
        ),
        loadStateSource(
          hasGoogleCalendarConfig(env),
          "GoogleCalendar",
          () => fetchGoogleCalendarSummary(env, getGoogleAccessToken),
          7000
        ),
        loadStateSource(true, "Family", async () => ({
          status: "ok",
          value: await fetchFamilyHomeSummary(env)
        }), 2500)
      ]);

      const financeSync = finance.status || "error";
      if (finance.value) {
        state.financeSummary = finance.value;
        state.importantEventRules = finance.value.importantEventRules || [];
        state.healthSummary = finance.value.health || { gymPlan: [], nutritionPlan: [] };
      }

      const habitSync = habits.status || "error";
      if (habits.value) state.habitsSummary = habits.value;

      const nutritionSync = nutrition.status || "error";
      if (nutrition.value) state.nutritionSummary = nutrition.value;

      const pantrySync = pantry.status || "error";
      if (pantry.value) state.pantrySummary = pantry.value.summary || null;

      const objectsSync = objects.status || "error";
      if (objects.value) state.objectsSummary = objects.value.summary || null;

      const projectsSync = projects.status || "error";
      if (projects.value) state.projectsSummary = projects.value.summary || null;

      const careerSync = career.status || "error";
      if (career.value) {
        state.careerSummary = career.value.summary || null;
        state.areas = (Array.isArray(state.areas) ? state.areas : []).map((area) => {
          if (area.id !== "area-career") return area;
          const summary = career.value.summary || {};
          const opportunityCount = Number(summary.activeOpportunityCount || 0);
          const blockedCount = Number(summary.blockedAssetCount || 0);
          return {
            ...area,
            summary: opportunityCount
              ? opportunityCount + " ruta" + (opportunityCount === 1 ? "" : "s") + " profesional" + (opportunityCount === 1 ? "" : "es") + " abierta" + (opportunityCount === 1 ? "" : "s") + "."
              : "Sin rutas profesionales abiertas.",
            status: blockedCount > 0 ? "attention" : "steady"
          };
        });
      }

      const eventsSheetSync = eventsStore.status || "error";
      if (eventsStore.value?.rules?.length) {
        state.importantEventRules = eventsStore.value.rules;
      }
      if (eventsStore.value?.summary) {
        state.eventsSummary = eventsStore.value.summary;
      }

      const calendarSync = calendar.status || "error";
      const googleCalendarSync = googleCalendar.status || "error";
      const federatedCalendar = mergeCalendarSources(calendar, googleCalendar, eventsStore.value?.calendarVisibility || []);
      if (federatedCalendar) {
        state.calendarSummary = federatedCalendar;
        state.events = federatedCalendar.events;
      }

      state.familySummary = family.value || {
        openCount: 0,
        attentionCount: 0,
        waitingCount: 0,
        decisionOpenCount: 0,
        nextDueAt: null,
        updatedAt: null
      };

      // La lectura de estado no debe esperar migraciones ni persistencias derivadas.
      // Se mantienen en background y como máximo una vez cada 5 minutos por isolate.
      scheduleStateEventMaintenance(ctx, env, state);

      state.meta = {
        ...(state.meta || {}),
        mode: "private-remote",
        remoteSnapshotId: row.id,
        schemaVersion: row.schema_version,
        remoteSnapshotCreatedAt: row.created_at,
        financeSync,
        habitSync,
        nutritionSync,
        pantrySync,
        objectsSync,
        projectsSync,
        careerSync,
        eventsSheetSync,
        calendarSync,
        googleCalendarSync
      };

      return json(state);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ ok: false, code: "NOT_FOUND" }, 404);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    return withSecurityHeaders(assetResponse, {
      "Cache-Control": "private, max-age=0, must-revalidate"
    });
  }
};
