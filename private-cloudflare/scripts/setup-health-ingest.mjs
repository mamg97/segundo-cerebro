import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const cwd = resolve(new URL("..", import.meta.url).pathname);
const config = "wrangler.health-ingest.jsonc";

function run(args, options = {}) {
  const result = spawnSync("npx", ["wrangler", ...args, "--config", config], {
    cwd,
    stdio: options.input ? ["pipe", "inherit", "inherit"] : "inherit",
    input: options.input || undefined,
    encoding: "utf8"
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log("Desplegando puente privado de Apple Health...");
run(["deploy"]);

const token = randomBytes(32).toString("hex");
console.log("Configurando secreto HEALTH_INGEST_TOKEN...");
run(["secret", "put", "HEALTH_INGEST_TOKEN"], { input: `${token}\n` });

console.log("");
console.log("=== GUARDA ESTOS DOS DATOS EN TU ATAJO DEL IPHONE ===");
console.log("URL: https://segundo-cerebro-health-ingest.mamg97.workers.dev/v1/energy");
console.log(`TOKEN: ${token}`);
console.log("");
console.log("El token se muestra una sola vez. No se ha escrito en Git.");
