import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const cwd = resolve(new URL("..", import.meta.url).pathname);
const config = "wrangler.health-ingest.jsonc";
const workerBaseUrl = "https://segundo-cerebro-health-ingest.mamg97.workers.dev";
const healthUrl = `${workerBaseUrl}/health`;
const energyUrl = `${workerBaseUrl}/v1/energy`;

function run(args, options = {}) {
  const result = spawnSync("npx", ["wrangler", ...args, "--config", config], {
    cwd,
    stdio: options.input ? ["pipe", "inherit", "inherit"] : "inherit",
    input: options.input || undefined,
    encoding: "utf8"
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

async function verifyHealthEndpoint() {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const response = await fetch(healthUrl, {
        headers: { Accept: "application/json" }
      });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.ok === true && payload?.service === "segundo-cerebro-health-ingest") {
        console.log("Worker de ingesta accesible.");
        return;
      }
    } catch {
      // El despliegue puede tardar unos segundos en propagarse.
    }
    if (attempt < 8) await sleep(1500);
  }

  console.error(`No se pudo validar ${healthUrl}. No se generará ningún token todavía.`);
  process.exit(1);
}

async function verifyTokenGuard() {
  try {
    const response = await fetch(energyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({})
    });

    if (response.status === 401) {
      console.log("Protección Bearer validada.");
      return;
    }
  } catch {
    // Se trata como fallo de validación abajo.
  }

  console.error("No se pudo validar la protección Bearer. Vuelve a ejecutar el setup antes de configurar el iPhone.");
  process.exit(1);
}

console.log("Desplegando puente privado de Apple Health...");
run(["deploy"]);

console.log("Validando endpoint público mínimo...");
await verifyHealthEndpoint();

const token = randomBytes(32).toString("hex");
console.log("Configurando secreto HEALTH_INGEST_TOKEN...");
run(["secret", "put", "HEALTH_INGEST_TOKEN"], { input: `${token}\n` });

console.log("Comprobando que /v1/energy rechaza peticiones sin token...");
await verifyTokenGuard();

console.log("");
console.log("=== GUARDA ESTOS DOS DATOS EN TU ATAJO DEL IPHONE ===");
console.log(`URL: ${energyUrl}`);
console.log(`TOKEN: ${token}`);
console.log("");
console.log("El token se muestra una sola vez. No se ha escrito en Git.");
console.log("Siguiente paso: docs/APPLE_HEALTH_SHORTCUT.md");
