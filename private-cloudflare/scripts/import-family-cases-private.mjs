#!/usr/bin/env node
/**
 * Import private Gestor Padres data into D1 from a local JSON file.
 *
 * The input file must stay outside Git (recommended: ../.private/family-cases.json).
 * This script never embeds or logs titles, summaries, references or other private values.
 *
 * Usage:
 *   npm run family:import -- ../.private/family-cases.json
 *   npm run family:import -- ../.private/family-cases.json --apply
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const workerDir = resolve(here, "..");
const repoRoot = resolve(workerDir, "..");
const privateDir = resolve(repoRoot, ".private");

const scopes = new Set(["mother", "father", "shared"]);
const domains = new Set(["health", "disability", "retirement", "property", "mortgage", "investment", "business", "tax", "admin", "legal", "other"]);
const statuses = new Set(["ACTIVE", "WAITING_EXTERNAL", "WAITING_DOCUMENT", "DECISION_OPEN", "SCHEDULED", "BLOCKED", "DONE", "ARCHIVED"]);
const priorities = new Set(["low", "medium", "high", "critical"]);
const actionTypes = new Set(["note", "update", "milestone", "communication", "document_request", "decision", "task"]);
const providers = new Set(["calendar", "finance", "litos", "email", "drive", "document", "d1", "other"]);

function fail(message) {
  console.error("ERROR:", message);
  process.exit(1);
}

function text(value, max) {
  const clean = String(value ?? "").trim();
  return max ? clean.slice(0, max) : clean;
}

function nullable(value, max) {
  const clean = text(value, max);
  return clean || null;
}

function dateOrNull(value) {
  const clean = text(value, 80);
  if (!clean) return null;
  if (!Number.isFinite(new Date(clean).getTime())) fail("Hay una fecha no válida en el JSON privado.");
  return clean;
}

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  return "'" + String(value).replaceAll("'", "''") + "'";
}

function makeId(prefix) {
  return prefix + "_" + crypto.randomUUID();
}

const args = process.argv.slice(2);
const inputArg = args.find((arg) => !arg.startsWith("--"));
const apply = args.includes("--apply");
if (!inputArg) fail("Indica la ruta al JSON privado.");

const inputPath = resolve(process.cwd(), inputArg);
let payload;
try {
  payload = JSON.parse(await readFile(inputPath, "utf8"));
} catch {
  fail("No se ha podido leer/parsear el JSON privado.");
}

const cases = Array.isArray(payload?.cases) ? payload.cases : [];
if (!cases.length) fail("El JSON no contiene cases[].");

await mkdir(privateDir, { recursive: true });
const outputPath = resolve(privateDir, "family-cases-import.sql");
const lines = [
  "-- Generated from a private local JSON. Never commit this file.",
  "CREATE TABLE IF NOT EXISTS family_cases (id TEXT PRIMARY KEY, person_scope TEXT NOT NULL, domain TEXT NOT NULL, title TEXT NOT NULL, summary TEXT, status TEXT NOT NULL DEFAULT 'ACTIVE', priority TEXT NOT NULL DEFAULT 'medium', next_action TEXT, next_action_owner TEXT, due_at TEXT, waiting_on TEXT, sensitivity TEXT NOT NULL DEFAULT 'muy_confidencial', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);",
  "CREATE TABLE IF NOT EXISTS family_case_actions (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, action_type TEXT NOT NULL DEFAULT 'note', summary TEXT NOT NULL, owner TEXT, status TEXT, happened_at TEXT NOT NULL, due_at TEXT, created_at TEXT NOT NULL, FOREIGN KEY(case_id) REFERENCES family_cases(id) ON DELETE CASCADE);",
  "CREATE TABLE IF NOT EXISTS family_case_refs (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, document_type TEXT, source_provider TEXT NOT NULL, source_ref TEXT NOT NULL, document_date TEXT, summary TEXT, review_status TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY(case_id) REFERENCES family_cases(id) ON DELETE CASCADE);",
  "CREATE INDEX IF NOT EXISTS idx_family_cases_scope_status ON family_cases(person_scope, status);",
  "CREATE INDEX IF NOT EXISTS idx_family_cases_due ON family_cases(due_at);",
  "CREATE INDEX IF NOT EXISTS idx_family_actions_case ON family_case_actions(case_id, happened_at DESC);",
  "CREATE INDEX IF NOT EXISTS idx_family_refs_case ON family_case_refs(case_id, updated_at DESC);"
];

let actionCount = 0;
let refCount = 0;
for (const raw of cases) {
  const personScope = text(raw?.personScope, 24);
  const domain = text(raw?.domain, 32);
  const title = text(raw?.title, 240);
  const status = text(raw?.status || "ACTIVE", 32).toUpperCase();
  const priority = text(raw?.priority || "medium", 16).toLowerCase();
  if (!scopes.has(personScope) || !domains.has(domain) || !statuses.has(status) || !priorities.has(priority) || !title) {
    fail("Hay un caso con scope/domain/status/priority/title no válido.");
  }

  const id = text(raw?.id, 160) || makeId("family_case");
  const now = new Date().toISOString();
  lines.push(
    "INSERT INTO family_cases (id,person_scope,domain,title,summary,status,priority,next_action,next_action_owner,due_at,waiting_on,sensitivity,created_at,updated_at) VALUES (" +
    [
      sql(id), sql(personScope), sql(domain), sql(title), sql(nullable(raw?.summary, 5000)),
      sql(status), sql(priority), sql(nullable(raw?.nextAction, 2000)), sql(nullable(raw?.nextActionOwner, 240)),
      sql(dateOrNull(raw?.dueAt)), sql(nullable(raw?.waitingOn, 1000)), sql("muy_confidencial"),
      sql(now), sql(now)
    ].join(",") +
    ") ON CONFLICT(id) DO UPDATE SET person_scope=excluded.person_scope,domain=excluded.domain,title=excluded.title,summary=excluded.summary,status=excluded.status,priority=excluded.priority,next_action=excluded.next_action,next_action_owner=excluded.next_action_owner,due_at=excluded.due_at,waiting_on=excluded.waiting_on,sensitivity='muy_confidencial',updated_at=excluded.updated_at;"
  );

  for (const action of Array.isArray(raw?.actions) ? raw.actions : []) {
    const actionType = text(action?.actionType || "note", 40);
    const summary = text(action?.summary, 4000);
    if (!actionTypes.has(actionType) || !summary) fail("Hay una acción no válida.");
    const actionId = text(action?.id, 180) || makeId("family_action");
    const happenedAt = dateOrNull(action?.happenedAt) || now;
    lines.push(
      "INSERT INTO family_case_actions (id,case_id,action_type,summary,owner,status,happened_at,due_at,created_at) VALUES (" +
      [
        sql(actionId), sql(id), sql(actionType), sql(summary), sql(nullable(action?.owner, 240)),
        sql(nullable(action?.status, 80)), sql(happenedAt), sql(dateOrNull(action?.dueAt)), sql(now)
      ].join(",") +
      ") ON CONFLICT(id) DO UPDATE SET summary=excluded.summary,owner=excluded.owner,status=excluded.status,happened_at=excluded.happened_at,due_at=excluded.due_at;"
    );
    actionCount += 1;
  }

  for (const ref of Array.isArray(raw?.references) ? raw.references : []) {
    const provider = text(ref?.sourceProvider, 40).toLowerCase();
    const sourceRef = text(ref?.sourceRef, 1200);
    if (!providers.has(provider) || !sourceRef) fail("Hay una referencia no válida.");
    const refId = text(ref?.id, 180) || makeId("family_ref");
    lines.push(
      "INSERT INTO family_case_refs (id,case_id,document_type,source_provider,source_ref,document_date,summary,review_status,created_at,updated_at) VALUES (" +
      [
        sql(refId), sql(id), sql(nullable(ref?.documentType, 120)), sql(provider), sql(sourceRef),
        sql(dateOrNull(ref?.documentDate)), sql(nullable(ref?.summary, 2000)),
        sql(nullable(ref?.reviewStatus, 120)), sql(now), sql(now)
      ].join(",") +
      ") ON CONFLICT(id) DO UPDATE SET document_type=excluded.document_type,source_provider=excluded.source_provider,source_ref=excluded.source_ref,document_date=excluded.document_date,summary=excluded.summary,review_status=excluded.review_status,updated_at=excluded.updated_at;"
    );
    refCount += 1;
  }
}

await writeFile(outputPath, lines.join("\n") + "\n", "utf8");
console.log(JSON.stringify({
  ok: true,
  cases: cases.length,
  actions: actionCount,
  references: refCount,
  sqlPath: outputPath,
  applied: apply
}, null, 2));

if (apply) {
  const result = spawnSync("npx", [
    "wrangler", "d1", "execute", "segundo-cerebro-private",
    "--remote",
    "--config", "wrangler.bootstrap.jsonc",
    "--file", outputPath
  ], {
    cwd: workerDir,
    stdio: "inherit"
  });
  if (result.status !== 0) process.exit(result.status || 1);
  console.log("OK: datos privados importados en D1.");
} else {
  console.log("Modo preparación: añade --apply para escribir en D1 remoto.");
}
