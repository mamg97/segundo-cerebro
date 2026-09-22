import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const workerRoot = resolve(here, "..");
const repoRoot = resolve(workerRoot, "..");
const inputPath = resolve(repoRoot, ".private", "finance-summary.json");
const outputDir = resolve(repoRoot, ".private", "cloudflare");
const outputPath = resolve(outputDir, "finance-patch.sql");

const raw = await readFile(inputPath, "utf8");
const financeSummary = JSON.parse(raw);

if (!financeSummary || typeof financeSummary !== "object") {
  throw new Error("finance-summary.json no contiene un objeto válido");
}

const json = JSON.stringify(financeSummary);
const sha256 = createHash("sha256").update(json).digest("hex");
const escapeSql = (value) => String(value).replaceAll("'", "''");

const sql = `UPDATE state_snapshots
SET content_json = json_set(
  content_json,
  '$.financeSummary',
  json('${escapeSql(json)}')
)
WHERE is_current = 1;

INSERT INTO audit_events (event_type, detail)
VALUES ('finance_summary_patch', 'sha256:${sha256}');
`;

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, sql, { encoding: "utf8", mode: 0o600 });

console.log(`Finance patch generated at ${outputPath}`);
console.log(`Finance SHA-256: ${sha256}`);
console.log("The source and generated patch remain under .private/ and must never be committed.");
