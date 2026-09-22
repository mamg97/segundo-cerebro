import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const [, , tokenPathArg, sheetIdArg] = process.argv;

if (!tokenPathArg || !sheetIdArg) {
  console.error("Uso: node scripts/configure-google-finance-sync.mjs /ruta/authorized_user.json <FINANCE_SHEET_ID>");
  process.exit(1);
}

const tokenPath = resolve(tokenPathArg);
const payload = JSON.parse(await readFile(tokenPath, "utf8"));

const required = ["client_id", "client_secret", "refresh_token"];
for (const key of required) {
  if (!payload[key]) {
    throw new Error(`Falta ${key} en el JSON OAuth`);
  }
}

const secrets = {
  GOOGLE_CLIENT_ID: payload.client_id,
  GOOGLE_CLIENT_SECRET: payload.client_secret,
  GOOGLE_REFRESH_TOKEN: payload.refresh_token,
  FINANCE_SHEET_ID: sheetIdArg
};

for (const [name, value] of Object.entries(secrets)) {
  console.log(`Configurando secreto ${name}...`);
  const result = spawnSync(
    "npx",
    ["wrangler", "secret", "put", name, "--config", "wrangler.bootstrap.jsonc"],
    {
      cwd: resolve(new URL("..", import.meta.url).pathname),
      input: `${value}\n`,
      stdio: ["pipe", "inherit", "inherit"],
      encoding: "utf8"
    }
  );
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log("Google Finance Sync configurado. Los valores sensibles no se han escrito en Git.");
