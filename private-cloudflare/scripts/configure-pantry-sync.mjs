import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const [, , sheetIdArg] = process.argv;

if (!sheetIdArg) {
  console.error("Uso: node scripts/configure-pantry-sync.mjs <PANTRY_SHEET_ID>");
  process.exit(1);
}

const sheetId = String(sheetIdArg).trim();
if (!/^[A-Za-z0-9_-]{20,}$/.test(sheetId)) {
  console.error("El identificador de Google Sheets no parece válido.");
  process.exit(1);
}

console.log("Configurando secreto PANTRY_SHEET_ID...");
const result = spawnSync(
  "npx",
  ["wrangler", "secret", "put", "PANTRY_SHEET_ID", "--config", "wrangler.bootstrap.jsonc"],
  {
    cwd: resolve(new URL("..", import.meta.url).pathname),
    input: sheetId + "\n",
    stdio: ["pipe", "inherit", "inherit"],
    encoding: "utf8"
  }
);

if (result.status !== 0) process.exit(result.status || 1);
console.log("Sheet privado de Despensa conectado. El identificador no se ha escrito en Git.");
