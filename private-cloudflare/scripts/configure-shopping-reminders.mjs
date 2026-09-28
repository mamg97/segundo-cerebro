import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const [, , backendArg, listArg = "Lista De La Compra"] = process.argv;
if (!backendArg) {
  console.error("Uso: node scripts/configure-shopping-reminders.mjs https://URL-PRIVADA [NOMBRE_LISTA]");
  process.exit(2);
}

let backendURL;
try { backendURL = new URL(backendArg); }
catch { console.error("La URL privada no es válida."); process.exit(2); }
if (backendURL.protocol !== "https:") {
  console.error("La URL privada debe usar HTTPS.");
  process.exit(2);
}

const scriptPath = fileURLToPath(import.meta.url);
const workerRoot = resolve(dirname(scriptPath), "..");
const executable = join(
  homedir(),
  "Library/Application Support/SegundoCerebroReminders/SegundoCerebroReminders.app/Contents/MacOS/SegundoCerebroReminders"
);
if (!existsSync(executable)) {
  console.error("El agente no está instalado. Ejecuta primero npm run reminders:install.");
  process.exit(2);
}

const token = randomBytes(48).toString("base64url");
console.log("Configurando SHOPPING_SYNC_TOKEN en ambos Workers…");
for (const config of ["wrangler.bootstrap.jsonc", "wrangler.shopping-reminders.jsonc"]) {
  const secret = spawnSync(
    "npx",
    ["wrangler", "secret", "put", "SHOPPING_SYNC_TOKEN", "--config", config],
    { cwd: workerRoot, input: token + "\n", stdio: ["pipe", "inherit", "inherit"], encoding: "utf8" }
  );
  if (secret.status !== 0) process.exit(secret.status || 1);
}

console.log("Guardando configuración local y token en Keychain…");
const configure = spawnSync(
  executable,
  ["configure", "--backend", backendURL.origin, "--list", listArg, "--interval", "90", "--token-stdin"],
  { input: token + "\n", stdio: ["pipe", "inherit", "inherit"], encoding: "utf8" }
);
if (configure.status !== 0) process.exit(configure.status || 1);
console.log("Sincronización configurada sin mostrar ni guardar el token en archivos.");
