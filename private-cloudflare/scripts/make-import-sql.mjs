import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const workerRoot = resolve(here, "..");
const repoRoot = resolve(workerRoot, "..");
const statePath = resolve(repoRoot, ".private", "state.js");
const outputDir = resolve(repoRoot, ".private", "cloudflare");
const outputPath = resolve(outputDir, "import-current.sql");

const module = await import(pathToFileURL(statePath).href);
const state = module.privateState;

if (!state || state.meta?.mode !== "private-local") {
  throw new Error("No se ha encontrado un privateState local válido en .private/state.js");
}

const json = JSON.stringify(state);
const sha256 = createHash("sha256").update(json).digest("hex");
const schemaVersion = String(state.meta?.schemaVersion || "0.2");
const escapeSql = (value) => String(value).replaceAll("'", "''");

const sql = `UPDATE state_snapshots
SET is_current = 0
WHERE is_current = 1;

INSERT INTO state_snapshots (
  schema_version,
  source_label,
  content_sha256,
  content_json,
  is_current
) VALUES (
  '${escapeSql(schemaVersion)}',
  'private-local-import',
  '${sha256}',
  '${escapeSql(json)}',
  1
);

INSERT INTO audit_events (event_type, detail)
VALUES ('state_import', 'sha256:${sha256}');
`;

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, sql, { encoding: "utf8", mode: 0o600 });

console.log(`Import SQL generated at ${outputPath}`);
console.log(`State SHA-256: ${sha256}`);
console.log("The generated file stays under .private/ and must never be committed.");
