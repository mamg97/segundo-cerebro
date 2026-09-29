import {
  appendPantryShoppingRow,
  ensurePantryShoppingSchema,
  fetchPantrySummary,
  readPantryShoppingSheet,
  updatePantryShoppingRow
} from "./pantry.js";

const MAX_EVENTS = 2000;
const ACTIVE_STATES = new Set(["COMPRAR"]);
const VALID_STATES = new Set(["REVISAR", "COMPRAR", "COMPRADO", "CANCELADO"]);

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function safeEqual(left, right) {
  if (!left || !right) return false;
  const [a, b] = await Promise.all([sha256(left), sha256(right)]);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

async function authorized(request, env) {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return Boolean(env.SHOPPING_SYNC_TOKEN) && safeEqual(token, env.SHOPPING_SYNC_TOKEN);
}

export function normalizeShoppingName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^\p{L}\p{N}'%+]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isoOrNull(value) {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function booleanValue(value) {
  return value === true || value === 1 || String(value || "").trim().toLowerCase() === "true";
}

function cleanState(value) {
  const state = String(value || "REVISAR").trim().toUpperCase();
  return VALID_STATES.has(state) ? state : "REVISAR";
}

function cleanEvent(raw) {
  const reminderId = String(raw?.reminderId || raw?.appleReminderId || "").trim();
  const title = String(raw?.title || "").trim().slice(0, 500);
  const modifiedAt = isoOrNull(raw?.modifiedAt);
  if (!reminderId || !title || !modifiedAt) return null;
  return {
    eventId: String(raw?.eventId || `${reminderId}:${modifiedAt}:${booleanValue(raw?.completed) ? 1 : 0}`).slice(0, 700),
    reminderId,
    externalIdentifier: String(raw?.externalIdentifier || "").trim().slice(0, 700) || null,
    title,
    normalizedName: normalizeShoppingName(title),
    completed: booleanValue(raw?.completed),
    modifiedAt,
    createdAt: isoOrNull(raw?.createdAt),
    deleted: booleanValue(raw?.deleted)
  };
}

function recordFromRow(row) {
  const record = { ...(row?.record || {}) };
  return {
    rowNumber: row?.rowNumber || null,
    record,
    externalId: String(record.external_id || "").trim() || null,
    appleReminderId: String(record.apple_reminder_id || "").trim() || null,
    productId: String(record.producto_id || "").trim() || null,
    name: String(record.nombre || "").trim(),
    normalizedName: String(record.normalized_name || "").trim() || normalizeShoppingName(record.nombre),
    state: cleanState(record.estado),
    appleCompleted: booleanValue(record.apple_completed),
    appleModifiedAt: isoOrNull(record.apple_modified_at),
    secondBrainModifiedAt: isoOrNull(record.segundo_cerebro_modified_at || record.updated_at),
    lastSyncedAt: isoOrNull(record.last_synced_at)
  };
}

function uniqueExactMatches(items, normalizedName, selector) {
  if (!normalizedName) return [];
  return items.filter((item) => normalizeShoppingName(selector(item)) === normalizedName);
}

export function planShoppingDryRun(events, shoppingRows, products = []) {
  const cleanEvents = events.map(cleanEvent).filter(Boolean);
  const rows = shoppingRows.map((row) => row.record ? recordFromRow(row) : row);
  const remainingRows = new Set(rows.map((row, index) => row.rowNumber || `index:${index}`));
  const details = [];
  let matched = 0;
  let appleOnly = 0;
  let potentialConflicts = 0;

  for (const event of cleanEvents) {
    const byId = rows.filter((row) => row.appleReminderId === event.reminderId);
    const byName = byId.length ? [] : rows.filter((row) => !row.appleReminderId && row.normalizedName === event.normalizedName);
    const candidates = byId.length ? byId : byName;
    if (candidates.length === 1) {
      matched += 1;
      remainingRows.delete(candidates[0].rowNumber || `index:${rows.indexOf(candidates[0])}`);
      details.push({ kind: "matched", appleReminderId: event.reminderId, name: event.title, rowNumber: candidates[0].rowNumber });
    } else if (candidates.length > 1) {
      potentialConflicts += 1;
      details.push({ kind: "conflict", appleReminderId: event.reminderId, name: event.title, candidates: candidates.length });
    } else {
      appleOnly += 1;
      const productMatches = uniqueExactMatches(products, event.normalizedName, (product) => product.name || product.nombre || "");
      details.push({
        kind: "apple-only",
        appleReminderId: event.reminderId,
        name: event.title,
        knownProductId: productMatches.length === 1 ? (productMatches[0].id || productMatches[0].productId || null) : null
      });
    }
  }

  const secondBrainOnlyRows = rows.filter((row, index) => {
    const key = row.rowNumber || `index:${index}`;
    return remainingRows.has(key) && ACTIVE_STATES.has(row.state);
  });
  return {
    appleOnly,
    segundoCerebroOnly: secondBrainOnlyRows.length,
    matched,
    potentialConflicts,
    appleCount: cleanEvents.length,
    segundoCerebroCount: rows.length,
    details
  };
}

async function ensureSyncSchema(env) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS shopping_sync_links (
      external_id TEXT PRIMARY KEY,
      apple_reminder_id TEXT UNIQUE,
      apple_external_identifier TEXT,
      normalized_name TEXT NOT NULL,
      apple_title TEXT,
      product_id TEXT,
      apple_completed INTEGER NOT NULL DEFAULT 0,
      apple_missing INTEGER NOT NULL DEFAULT 0,
      apple_modified_at TEXT,
      segundo_cerebro_modified_at TEXT,
      last_synced_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_error TEXT,
      last_seen_run_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    "CREATE INDEX IF NOT EXISTS idx_shopping_links_normalized ON shopping_sync_links(normalized_name)",
    "CREATE INDEX IF NOT EXISTS idx_shopping_links_external_identifier ON shopping_sync_links(apple_external_identifier)",
    `CREATE TABLE IF NOT EXISTS shopping_apple_actions (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL UNIQUE,
      action_type TEXT NOT NULL,
      external_id TEXT NOT NULL,
      apple_reminder_id TEXT,
      title TEXT,
      desired_completed INTEGER,
      expected_apple_modified_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      acknowledged_at TEXT
    )`,
    "CREATE INDEX IF NOT EXISTS idx_shopping_actions_status ON shopping_apple_actions(status, created_at)",
    `CREATE TABLE IF NOT EXISTS shopping_sync_events (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL UNIQUE,
      event_type TEXT NOT NULL,
      external_id TEXT,
      apple_reminder_id TEXT,
      status TEXT NOT NULL,
      conflict_reason TEXT,
      received_at TEXT NOT NULL,
      processed_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS shopping_sync_runs (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      apple_count INTEGER NOT NULL DEFAULT 0,
      matched_count INTEGER NOT NULL DEFAULT 0,
      apple_only_count INTEGER NOT NULL DEFAULT 0,
      segundo_cerebro_only_count INTEGER NOT NULL DEFAULT 0,
      conflict_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      error TEXT
    )`
  ];
  for (const statement of statements) await env.DB.prepare(statement).run();
}

async function allLinks(env) {
  const result = await env.DB.prepare("SELECT * FROM shopping_sync_links").all();
  return result.results || [];
}

async function upsertLink(env, value) {
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO shopping_sync_links (
      external_id, apple_reminder_id, apple_external_identifier, normalized_name, apple_title,
      product_id, apple_completed, apple_missing, apple_modified_at,
      segundo_cerebro_modified_at, last_synced_at, sync_status, sync_error,
      last_seen_run_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(external_id) DO UPDATE SET
      apple_reminder_id = excluded.apple_reminder_id,
      apple_external_identifier = COALESCE(excluded.apple_external_identifier, shopping_sync_links.apple_external_identifier),
      normalized_name = excluded.normalized_name,
      apple_title = excluded.apple_title,
      product_id = COALESCE(excluded.product_id, shopping_sync_links.product_id),
      apple_completed = excluded.apple_completed,
      apple_missing = excluded.apple_missing,
      apple_modified_at = excluded.apple_modified_at,
      segundo_cerebro_modified_at = excluded.segundo_cerebro_modified_at,
      last_synced_at = excluded.last_synced_at,
      sync_status = excluded.sync_status,
      sync_error = excluded.sync_error,
      last_seen_run_id = excluded.last_seen_run_id,
      updated_at = excluded.updated_at
  `).bind(
    value.externalId,
    value.appleReminderId || null,
    value.appleExternalIdentifier || null,
    value.normalizedName,
    value.appleTitle || null,
    value.productId || null,
    value.appleCompleted ? 1 : 0,
    value.appleMissing ? 1 : 0,
    value.appleModifiedAt || null,
    value.secondBrainModifiedAt || null,
    value.lastSyncedAt || null,
    value.syncStatus || "synced",
    value.syncError || null,
    value.lastSeenRunId || null,
    value.createdAt || now,
    now
  ).run();
}

function laterThan(value, baseline) {
  const left = value ? new Date(value).getTime() : NaN;
  const right = baseline ? new Date(baseline).getTime() : NaN;
  return Number.isFinite(left) && (!Number.isFinite(right) || left > right);
}

function rowConflict(row, event) {
  if (!row.lastSyncedAt) return null;
  const appleChanged = laterThan(event.modifiedAt, row.lastSyncedAt);
  const secondChanged = laterThan(row.secondBrainModifiedAt, row.lastSyncedAt);
  if (!appleChanged || !secondChanged) return null;
  const desiredState = event.completed ? "COMPRADO" : "COMPRAR";
  if (desiredState !== row.state || event.normalizedName !== row.normalizedName) {
    return "BOTH_SIDES_CHANGED";
  }
  return null;
}

function findProduct(products, normalizedName) {
  const matches = uniqueExactMatches(products, normalizedName, (product) => product.name || "");
  return matches.length === 1 ? matches[0] : null;
}

export function planAppleActionsForRow(row, link) {
  if (row.state === "REVISAR") return [];
  if (row.state === "COMPRAR") {
    if (!link || Boolean(link.apple_missing)) {
      return [{ type: "create", desiredCompleted: false }];
    }
    if (Boolean(link.apple_completed)) {
      return [{ type: "setCompleted", desiredCompleted: false }];
    }
    if (
      normalizeShoppingName(link.apple_title) !== row.normalizedName &&
      laterThan(row.secondBrainModifiedAt, link.last_synced_at)
    ) {
      return [{ type: "updateTitle", desiredCompleted: null }];
    }
    return [];
  }
  if (["COMPRADO", "CANCELADO"].includes(row.state) && link && !Boolean(link.apple_completed) && !Boolean(link.apple_missing)) {
    return [{ type: "setCompleted", desiredCompleted: true }];
  }
  return [];
}

export function planAppleActionsForMissingSecondBrainRow(link) {
  if (
    !link?.apple_reminder_id ||
    Boolean(link.apple_completed) ||
    Boolean(link.apple_missing)
  ) {
    return [];
  }
  return [{ type: "setCompleted", desiredCompleted: true }];
}

async function processAppleEvents(request, env, getGoogleAccessToken) {
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }

  const rawEvents = Array.isArray(body?.events) ? body.events.slice(0, MAX_EVENTS) : [];
  const events = rawEvents.map(cleanEvent).filter(Boolean);
  if (events.length !== rawEvents.length) return json({ ok: false, code: "INVALID_APPLE_EVENT" }, 400);
  const dryRun = body?.dryRun === true;
  const fullSnapshot = body?.fullSnapshot !== false;
  const sheet = dryRun
    ? await readPantryShoppingSheet(env, getGoogleAccessToken)
    : await ensurePantryShoppingSchema(env, getGoogleAccessToken);
  const pantry = await fetchPantrySummary(env, getGoogleAccessToken);
  const products = pantry.value?.products || pantry.value?.items || [];
  const report = planShoppingDryRun(events, sheet.rows, products);
  if (dryRun) return json({ ok: true, dryRun: true, report });

  await ensureSyncSchema(env);
  const runId = "shopping_run_" + crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO shopping_sync_runs (
      id, mode, started_at, apple_count, matched_count, apple_only_count,
      segundo_cerebro_only_count, conflict_count, status
    ) VALUES (?, 'real', ?, ?, ?, ?, ?, ?, 'running')
  `).bind(
    runId, now, report.appleCount, report.matched, report.appleOnly,
    report.segundoCerebroOnly, report.potentialConflicts
  ).run();

  let links = await allLinks(env);
  const rows = sheet.rows.map(recordFromRow);
  const result = { created: 0, updated: 0, linked: 0, conflicts: 0, ignored: 0 };

  for (const event of events) {
    const idempotencyKey = await sha256(event.eventId);
    const eventRecordId = "shopping_event_" + crypto.randomUUID();
    const inserted = await env.DB.prepare(`
      INSERT OR IGNORE INTO shopping_sync_events (
        id, idempotency_key, event_type, apple_reminder_id, status, received_at
      ) VALUES (?, ?, ?, ?, 'received', ?)
    `).bind(eventRecordId, idempotencyKey, event.deleted ? "deleted" : "snapshot", event.reminderId, now).run();
    if (!inserted.meta?.changes) {
      await env.DB.prepare(`
        UPDATE shopping_sync_links
        SET last_seen_run_id = ?, apple_missing = 0, updated_at = ?
        WHERE apple_reminder_id = ? OR (? IS NOT NULL AND apple_external_identifier = ?)
      `).bind(runId, now, event.reminderId, event.externalIdentifier, event.externalIdentifier).run();
      result.ignored += 1;
      continue;
    }

    const linked = links.find((item) =>
      item.apple_reminder_id === event.reminderId ||
      (event.externalIdentifier && item.apple_external_identifier === event.externalIdentifier)
    );
    let candidates = linked ? rows.filter((row) => row.externalId === linked.external_id) : [];
    if (!candidates.length) candidates = rows.filter((row) => row.appleReminderId === event.reminderId);
    if (!candidates.length) candidates = rows.filter((row) => !row.appleReminderId && row.normalizedName === event.normalizedName);

    if (linked && !candidates.length) {
      await queueCompletionForMissingSecondBrainRow(env, linked, event);
      await upsertLink(env, {
        externalId: linked.external_id,
        appleReminderId: event.reminderId,
        appleExternalIdentifier: event.externalIdentifier || linked.apple_external_identifier,
        normalizedName: event.normalizedName,
        appleTitle: event.title,
        productId: linked.product_id,
        appleCompleted: event.completed,
        appleMissing: event.deleted,
        appleModifiedAt: event.modifiedAt,
        secondBrainModifiedAt: linked.segundo_cerebro_modified_at,
        lastSyncedAt: linked.last_synced_at,
        syncStatus: event.completed || event.deleted ? "synced" : "pending_apple_completion",
        syncError: event.completed || event.deleted ? null : "SECOND_BRAIN_ROW_REMOVED",
        lastSeenRunId: runId,
        createdAt: linked.created_at
      });
      await env.DB.prepare(`
        UPDATE shopping_sync_events SET external_id = ?, status = 'applied', processed_at = ? WHERE id = ?
      `).bind(linked.external_id, now, eventRecordId).run();
      result.ignored += 1;
      links = await allLinks(env);
      continue;
    }

    if (candidates.length > 1) {
      result.conflicts += 1;
      await env.DB.prepare(`
        UPDATE shopping_sync_events
        SET status = 'conflict', conflict_reason = 'AMBIGUOUS_NORMALIZED_NAME', processed_at = ?
        WHERE id = ?
      `).bind(now, eventRecordId).run();
      continue;
    }

    let row = candidates[0] || null;
    const conflict = row ? rowConflict(row, event) : null;
    if (conflict) {
      result.conflicts += 1;
      row.record.sync_status = "conflict";
      row.record.sync_error = conflict;
      await updatePantryShoppingRow(sheet, row.rowNumber, row.record);
      await env.DB.prepare(`
        UPDATE shopping_sync_events SET status = 'conflict', conflict_reason = ?, processed_at = ? WHERE id = ?
      `).bind(conflict, now, eventRecordId).run();
      continue;
    }

    const externalId = row?.externalId || linked?.external_id || "shopping_item_" + crypto.randomUUID();
    const product = row?.productId ? null : findProduct(products, event.normalizedName);
    const nextRecord = {
      ...(row?.record || {}),
      external_id: externalId,
      apple_reminder_id: event.reminderId,
      normalized_name: event.normalizedName,
      nombre: event.title,
      producto_id: row?.productId || product?.id || product?.productId || "",
      estado: event.deleted ? "CANCELADO" : event.completed ? "COMPRADO" : "COMPRAR",
      fuente: row?.record?.fuente || "apple_reminders",
      updated_at: now,
      apple_completed: event.completed,
      apple_modified_at: event.modifiedAt,
      segundo_cerebro_modified_at: row?.record?.segundo_cerebro_modified_at || row?.record?.updated_at || "",
      last_synced_at: now,
      sync_status: "synced",
      sync_error: ""
    };

    if (row) {
      await updatePantryShoppingRow(sheet, row.rowNumber, nextRecord);
      row.record = nextRecord;
      row.externalId = externalId;
      row.appleReminderId = event.reminderId;
      row.normalizedName = event.normalizedName;
      row.state = cleanState(nextRecord.estado);
      row.lastSyncedAt = now;
      result.updated += 1;
      if (!candidates[0]?.appleReminderId) result.linked += 1;
    } else {
      await appendPantryShoppingRow(sheet, nextRecord);
      rows.push(recordFromRow({ rowNumber: null, record: nextRecord }));
      result.created += 1;
    }

    await upsertLink(env, {
      externalId,
      appleReminderId: event.reminderId,
      appleExternalIdentifier: event.externalIdentifier,
      normalizedName: event.normalizedName,
      appleTitle: event.title,
      productId: nextRecord.producto_id || null,
      appleCompleted: event.completed,
      appleMissing: event.deleted,
      appleModifiedAt: event.modifiedAt,
      secondBrainModifiedAt: isoOrNull(nextRecord.segundo_cerebro_modified_at),
      lastSyncedAt: now,
      syncStatus: "synced",
      lastSeenRunId: runId
    });
    await env.DB.prepare(`
      UPDATE shopping_sync_events SET external_id = ?, status = 'applied', processed_at = ? WHERE id = ?
    `).bind(externalId, now, eventRecordId).run();
    links = await allLinks(env);
  }

  if (fullSnapshot) {
    const missingActive = await env.DB.prepare(`
      SELECT external_id FROM shopping_sync_links
      WHERE apple_completed = 0 AND COALESCE(last_seen_run_id, '') <> ?
    `).bind(runId).all();
    for (const missing of missingActive.results || []) {
      const sourceRow = sheet.rows.find((item) => String(item.record?.external_id || "") === missing.external_id);
      if (!sourceRow) continue;
      sourceRow.record.estado = "CANCELADO";
      sourceRow.record.apple_completed = false;
      sourceRow.record.last_synced_at = now;
      sourceRow.record.sync_status = "synced";
      sourceRow.record.sync_error = "APPLE_REMINDER_REMOVED";
      sourceRow.record.updated_at = now;
      await updatePantryShoppingRow(sheet, sourceRow.rowNumber, sourceRow.record);
    }
    await env.DB.prepare(`
      UPDATE shopping_sync_links
      SET apple_missing = 1, sync_status = 'apple_missing', updated_at = ?
      WHERE apple_completed = 0 AND COALESCE(last_seen_run_id, '') <> ?
    `).bind(now, runId).run();
  }

  await env.DB.prepare(`
    UPDATE shopping_sync_runs SET completed_at = ?, conflict_count = ?, status = 'completed' WHERE id = ?
  `).bind(new Date().toISOString(), result.conflicts, runId).run();
  return json({ ok: true, dryRun: false, runId, report, result });
}

async function queueAction(env, action) {
  const now = new Date().toISOString();
  const idempotencyKey = await sha256([
    action.type,
    action.externalId,
    action.appleReminderId || "",
    action.title || "",
    action.desiredCompleted === null ? "" : String(action.desiredCompleted),
    action.version || ""
  ].join("|"));
  await env.DB.prepare(`
    INSERT OR IGNORE INTO shopping_apple_actions (
      id, idempotency_key, action_type, external_id, apple_reminder_id, title,
      desired_completed, expected_apple_modified_at, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).bind(
    "shopping_action_" + crypto.randomUUID(), idempotencyKey, action.type,
    action.externalId, action.appleReminderId || null, action.title || null,
    action.desiredCompleted === null || action.desiredCompleted === undefined ? null : action.desiredCompleted ? 1 : 0,
    action.expectedAppleModifiedAt || null, now, now
  ).run();
}

async function queueCompletionForMissingSecondBrainRow(env, link, event = null) {
  for (const action of planAppleActionsForMissingSecondBrainRow({
    ...link,
    apple_reminder_id: event?.reminderId || link?.apple_reminder_id,
    apple_completed: event ? event.completed : link?.apple_completed,
    apple_missing: event ? event.deleted : link?.apple_missing
  })) {
    await queueAction(env, {
      type: action.type,
      externalId: link.external_id,
      appleReminderId: event?.reminderId || link.apple_reminder_id,
      title: event?.title || link.apple_title,
      desiredCompleted: action.desiredCompleted,
      expectedAppleModifiedAt: event?.modifiedAt || link.apple_modified_at || null,
      version: `second-brain-removed:${link.last_synced_at || link.created_at || link.external_id}`
    });
  }
}

async function reconcilePendingActions(env, getGoogleAccessToken) {
  await ensureSyncSchema(env);
  const sheet = await ensurePantryShoppingSchema(env, getGoogleAccessToken);
  const links = await allLinks(env);
  const pantry = await fetchPantrySummary(env, getGoogleAccessToken);
  const products = pantry.value?.products || [];
  const now = new Date().toISOString();

  for (const sourceRow of sheet.rows) {
    const row = recordFromRow(sourceRow);
    if (!row.productId) {
      const product = findProduct(products, row.normalizedName);
      if (product?.id || product?.productId) {
        row.productId = product.id || product.productId;
        sourceRow.record.producto_id = row.productId;
        await updatePantryShoppingRow(sheet, sourceRow.rowNumber, sourceRow.record);
      }
    }
    if (row.state === "REVISAR") continue;
    let externalId = row.externalId;
    if (!externalId) {
      externalId = "shopping_item_" + crypto.randomUUID();
      sourceRow.record.external_id = externalId;
      sourceRow.record.normalized_name = row.normalizedName;
      sourceRow.record.segundo_cerebro_modified_at = row.secondBrainModifiedAt || now;
      sourceRow.record.sync_status = "pending_apple";
      sourceRow.record.sync_error = "";
      await updatePantryShoppingRow(sheet, sourceRow.rowNumber, sourceRow.record);
    }

    const link = links.find((item) => item.external_id === externalId) ||
      links.find((item) => row.appleReminderId && item.apple_reminder_id === row.appleReminderId);
    const version = row.secondBrainModifiedAt || sourceRow.record.updated_at || `${row.state}:${row.name}`;

    for (const action of planAppleActionsForRow(row, link)) {
      await queueAction(env, {
        type: action.type,
        externalId,
        appleReminderId: action.type === "create" ? null : link?.apple_reminder_id || null,
        title: row.name,
        desiredCompleted: action.desiredCompleted,
        expectedAppleModifiedAt: action.type === "create" ? null : link?.apple_modified_at || null,
        version
      });
    }
  }

  const presentExternalIds = new Set(
    sheet.rows
      .map((sourceRow) => String(sourceRow.record?.external_id || "").trim())
      .filter(Boolean)
  );
  for (const link of links) {
    if (presentExternalIds.has(link.external_id)) continue;
    await queueCompletionForMissingSecondBrainRow(env, link);
  }
}

async function pendingActions(env, getGoogleAccessToken) {
  await reconcilePendingActions(env, getGoogleAccessToken);
  const result = await env.DB.prepare(`
    SELECT id, action_type, external_id, apple_reminder_id, title, desired_completed,
           expected_apple_modified_at, attempts, created_at
    FROM shopping_apple_actions
    WHERE status = 'pending' AND attempts < 5
    ORDER BY created_at ASC
    LIMIT 200
  `).all();
  const actions = (result.results || []).map((item) => ({
    id: item.id,
    type: item.action_type,
    externalId: item.external_id,
    appleReminderId: item.apple_reminder_id,
    title: item.title,
    desiredCompleted: item.desired_completed === null ? null : Boolean(item.desired_completed),
    expectedAppleModifiedAt: item.expected_apple_modified_at,
    attempts: Number(item.attempts || 0),
    createdAt: item.created_at
  }));
  return json({ ok: true, actions });
}

async function acknowledgeAction(request, env, getGoogleAccessToken, actionId) {
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }
  const action = await env.DB.prepare("SELECT * FROM shopping_apple_actions WHERE id = ?").bind(actionId).first();
  if (!action) return json({ ok: false, code: "ACTION_NOT_FOUND" }, 404);
  if (action.status === "applied") return json({ ok: true, idempotent: true });
  const now = new Date().toISOString();

  if (body?.success !== true) {
    const error = String(body?.error || "APPLE_ACTION_FAILED").slice(0, 500);
    const superseded = /conflict|ya no existe|not found/i.test(error);
    await env.DB.prepare(`
      UPDATE shopping_apple_actions
      SET attempts = attempts + 1, last_error = ?, status = CASE
        WHEN ? = 1 THEN 'superseded'
        WHEN attempts + 1 >= 5 THEN 'failed'
        ELSE 'pending'
      END, updated_at = ?
      WHERE id = ?
    `).bind(error, superseded ? 1 : 0, now, actionId).run();
    return json({ ok: true, retryScheduled: !superseded && Number(action.attempts || 0) + 1 < 5 });
  }

  const reminderId = String(body?.appleReminderId || action.apple_reminder_id || "").trim();
  if (!reminderId) return json({ ok: false, code: "APPLE_REMINDER_ID_REQUIRED" }, 400);
  const modifiedAt = isoOrNull(body?.appleModifiedAt) || now;
  const externalIdentifier = String(body?.appleExternalIdentifier || "").trim() || null;
  const completed = body?.appleCompleted === undefined
    ? Boolean(action.desired_completed)
    : booleanValue(body.appleCompleted);

  await env.DB.prepare(`
    UPDATE shopping_apple_actions
    SET status = 'applied', attempts = attempts + 1, last_error = NULL,
        acknowledged_at = ?, updated_at = ?
    WHERE id = ?
  `).bind(now, now, actionId).run();

  const existing = await env.DB.prepare("SELECT * FROM shopping_sync_links WHERE external_id = ?").bind(action.external_id).first();
  await upsertLink(env, {
    externalId: action.external_id,
    appleReminderId: reminderId,
    appleExternalIdentifier: externalIdentifier || existing?.apple_external_identifier,
    normalizedName: normalizeShoppingName(action.title || existing?.apple_title || "producto"),
    appleTitle: action.title || existing?.apple_title,
    productId: existing?.product_id,
    appleCompleted: completed,
    appleMissing: false,
    appleModifiedAt: modifiedAt,
    secondBrainModifiedAt: existing?.segundo_cerebro_modified_at,
    lastSyncedAt: now,
    syncStatus: "synced",
    lastSeenRunId: existing?.last_seen_run_id
  });

  const sheet = await ensurePantryShoppingSchema(env, getGoogleAccessToken);
  const sourceRow = sheet.rows.find((row) => String(row.record?.external_id || "") === action.external_id);
  if (sourceRow) {
    sourceRow.record.apple_reminder_id = reminderId;
    sourceRow.record.normalized_name = normalizeShoppingName(sourceRow.record.nombre || action.title);
    sourceRow.record.apple_completed = completed;
    sourceRow.record.apple_modified_at = modifiedAt;
    sourceRow.record.last_synced_at = now;
    sourceRow.record.sync_status = "synced";
    sourceRow.record.sync_error = "";
    await updatePantryShoppingRow(sheet, sourceRow.rowNumber, sourceRow.record);
  }
  return json({ ok: true });
}

async function syncStatus(env, getGoogleAccessToken) {
  await ensureSyncSchema(env);
  const [pending, failed, lastRun, links, sheet] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM shopping_apple_actions WHERE status = 'pending'").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM shopping_apple_actions WHERE status = 'failed'").first(),
    env.DB.prepare("SELECT * FROM shopping_sync_runs ORDER BY started_at DESC LIMIT 1").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM shopping_sync_links").first(),
    readPantryShoppingSheet(env, getGoogleAccessToken)
  ]);
  return json({
    ok: true,
    service: "shopping-list-sync",
    sheetLocated: true,
    schemaReady: sheet.headers.every((header) => header) && sheet.headers.includes("estado"),
    linkedItems: Number(links?.count || 0),
    pendingActions: Number(pending?.count || 0),
    failedActions: Number(failed?.count || 0),
    lastSync: lastRun ? {
      id: lastRun.id,
      status: lastRun.status,
      startedAt: lastRun.started_at,
      completedAt: lastRun.completed_at,
      conflicts: Number(lastRun.conflict_count || 0),
      error: lastRun.error || null
    } : null
  });
}

export async function handleShoppingSyncRequest(request, env, getGoogleAccessToken) {
  if (!(await authorized(request, env))) return json({ ok: false, code: "UNAUTHORIZED" }, 401);
  if (!env.DB) return json({ ok: false, code: "D1_NOT_CONFIGURED" }, 503);
  const url = new URL(request.url);
  try {
    if (url.pathname === "/v1/shopping-list/sync") {
      if (request.method === "POST") return await processAppleEvents(request, env, getGoogleAccessToken);
      if (request.method === "GET") return await syncStatus(env, getGoogleAccessToken);
      return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
    }
    if (url.pathname === "/v1/shopping-list/apple-events") {
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      return await processAppleEvents(request, env, getGoogleAccessToken);
    }
    if (url.pathname === "/v1/shopping-list/pending-apple-actions") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      return await pendingActions(env, getGoogleAccessToken);
    }
    if (url.pathname.startsWith("/v1/shopping-list/apple-actions/") && url.pathname.endsWith("/ack")) {
      if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      const actionId = decodeURIComponent(url.pathname.slice("/v1/shopping-list/apple-actions/".length, -"/ack".length));
      return await acknowledgeAction(request, env, getGoogleAccessToken, actionId);
    }
    if (url.pathname === "/v1/shopping-list/status") {
      if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
      return await syncStatus(env, getGoogleAccessToken);
    }
    return json({ ok: false, code: "NOT_FOUND" }, 404);
  } catch (error) {
    const code = /^([A-Z0-9_]+)$/.test(String(error?.message || "")) ? String(error.message) : "SHOPPING_SYNC_FAILED";
    console.warn("Shopping list sync failed", code);
    return json({ ok: false, code }, 502);
  }
}
