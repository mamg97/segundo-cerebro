// Ficha de salud visual: fuente operativa privada en D1. Nunca incluir datos reales en Git.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validVisionDate(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const date = new Date(value + "T12:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseVisionSphere(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  if (typeof value === "boolean") throw new Error("INVALID_VISION_SPHERE");
  const text = String(value).trim().replace(",", ".");
  if (!/^[+-]?\d{1,2}(?:\.\d{1,2})?$/.test(text)) throw new Error("INVALID_VISION_SPHERE");
  const number = Number(text);
  if (!Number.isFinite(number) || Math.abs(number) > 30) throw new Error("INVALID_VISION_SPHERE");
  return number;
}

export function nextVisionReplacementDate(lastReplacedOn, replacementMonths = 1) {
  if (!validVisionDate(lastReplacedOn)) return null;
  const months = Number(replacementMonths);
  if (!Number.isInteger(months) || months < 1 || months > 12) return null;
  const [year, month, day] = lastReplacedOn.split("-").map(Number);
  const targetFirst = new Date(Date.UTC(year, month - 1 + months, 1, 12));
  const nextMonthFirst = new Date(Date.UTC(targetFirst.getUTCFullYear(), targetFirst.getUTCMonth() + 1, 1, 12));
  const maxDay = Math.round((nextMonthFirst - targetFirst) / 86400000);
  return `${targetFirst.getUTCFullYear()}-${String(targetFirst.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(day, maxDay)).padStart(2, "0")}`;
}

function optionalVisionText(value, maxLength = 100) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const text = String(value).trim();
  if (text.length > maxLength || /[\x00-\x08\x0B-\x1F]/.test(text)) throw new Error("INVALID_VISION_TEXT");
  return text;
}

export function validateVisionProfile(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("INVALID_VISION_PROFILE");
  const replacementMonths = Number(payload.replacementMonths ?? 1);
  if (!Number.isInteger(replacementMonths) || replacementMonths < 1 || replacementMonths > 12) throw new Error("INVALID_VISION_INTERVAL");
  const date = payload.lastReplacedOn || null;
  if (date !== null && !validVisionDate(date)) throw new Error("INVALID_VISION_DATE");
  return {
    rightSphere: parseVisionSphere(payload.rightSphere),
    leftSphere: parseVisionSphere(payload.leftSphere),
    brand: optionalVisionText(payload.brand),
    model: optionalVisionText(payload.model),
    replacementMonths,
    lastReplacedOn: date
  };
}

async function ensureVisionTables(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS health_vision_profile (
      id TEXT PRIMARY KEY,
      right_sphere REAL,
      left_sphere REAL,
      brand TEXT,
      model TEXT,
      replacement_months INTEGER NOT NULL DEFAULT 1,
      last_replaced_on TEXT,
      updated_at TEXT NOT NULL
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS health_vision_changes (
      replaced_on TEXT PRIMARY KEY,
      recorded_at TEXT NOT NULL
    )
  `).run();
}

export async function readVision(env) {
  await ensureVisionTables(env);
  const row = await env.DB.prepare(
    "SELECT right_sphere, left_sphere, brand, model, replacement_months, last_replaced_on, updated_at FROM health_vision_profile WHERE id = 'primary'"
  ).first();
  const history = await env.DB.prepare(
    "SELECT replaced_on AS replacedOn FROM health_vision_changes ORDER BY replaced_on DESC LIMIT 24"
  ).all();
  const profile = {
    rightSphere: row?.right_sphere ?? null,
    leftSphere: row?.left_sphere ?? null,
    brand: row?.brand ?? null,
    model: row?.model ?? null,
    replacementMonths: row?.replacement_months ?? 1,
    lastReplacedOn: row?.last_replaced_on ?? null,
    updatedAt: row?.updated_at ?? null
  };
  return {
    ok: true,
    source: "private_d1",
    sensitivity: "muy_confidencial",
    profile,
    nextReplacementOn: nextVisionReplacementDate(profile.lastReplacedOn, profile.replacementMonths),
    changes: (history.results || []).map(x => x.replacedOn)
  };
}

export async function saveVision(env, payload) {
  const data = validateVisionProfile(payload);
  await ensureVisionTables(env);
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO health_vision_profile
      (id, right_sphere, left_sphere, brand, model, replacement_months, last_replaced_on, updated_at)
    VALUES ('primary', ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      right_sphere = excluded.right_sphere,
      left_sphere = excluded.left_sphere,
      brand = excluded.brand,
      model = excluded.model,
      replacement_months = excluded.replacement_months,
      last_replaced_on = excluded.last_replaced_on,
      updated_at = excluded.updated_at
  `).bind(data.rightSphere, data.leftSphere, data.brand, data.model,
          data.replacementMonths, data.lastReplacedOn, now).run();
  return readVision(env);
}

export async function recordVisionReplacement(env, replacedOn) {
  if (!validVisionDate(replacedOn)) throw new Error("INVALID_VISION_DATE");
  await ensureVisionTables(env);
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO health_vision_changes (replaced_on, recorded_at) VALUES (?, ?)")
      .bind(replacedOn, now),
    env.DB.prepare(`
      INSERT INTO health_vision_profile (id, replacement_months, last_replaced_on, updated_at)
      VALUES ('primary', 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        last_replaced_on = CASE
          WHEN health_vision_profile.last_replaced_on IS NULL OR health_vision_profile.last_replaced_on <= excluded.last_replaced_on
          THEN excluded.last_replaced_on ELSE health_vision_profile.last_replaced_on END,
        updated_at = excluded.updated_at
    `).bind(replacedOn, now)
  ]);
  return readVision(env);
}
