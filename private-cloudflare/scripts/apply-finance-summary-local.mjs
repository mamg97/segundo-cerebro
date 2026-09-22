import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const workerRoot = resolve(here, "..");
const repoRoot = resolve(workerRoot, "..");
const privateDir = resolve(repoRoot, ".private");
const statePath = resolve(privateDir, "state.js");
const financePath = resolve(privateDir, "finance-summary.json");
const backupsDir = resolve(privateDir, "backups");

const financeSummary = JSON.parse(await readFile(financePath, "utf8"));
if (!financeSummary || typeof financeSummary !== "object") {
  throw new Error("finance-summary.json no contiene un objeto válido");
}

const moduleUrl = new URL(pathToFileURL(statePath));
moduleUrl.searchParams.set("t", String(Date.now()));
const module = await import(moduleUrl.href);
const current = module.privateState;

if (!current || current.meta?.mode !== "private-local") {
  throw new Error("No se ha encontrado un privateState local válido");
}

await mkdir(backupsDir, { recursive: true });
const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const backupPath = resolve(backupsDir, `state-${stamp}.js`);
await copyFile(statePath, backupPath);

const updated = {
  ...current,
  meta: {
    ...current.meta,
    updatedAt: new Date().toISOString()
  },
  financeSummary
};

await writeFile(
  statePath,
  `export const privateState = Object.freeze(${JSON.stringify(updated, null, 2)});\n`,
  { encoding: "utf8", mode: 0o600 }
);

console.log(`Local private state updated: ${statePath}`);
console.log(`Backup created: ${backupPath}`);
console.log("No real finance data was written to Git.");
