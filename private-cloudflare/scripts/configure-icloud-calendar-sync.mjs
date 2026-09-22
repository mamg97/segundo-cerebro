
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const workerRoot = resolve(here, "..");
const config = "wrangler.bootstrap.jsonc";

function putSecretInteractive(name) {
  console.log("\nConfigurando " + name + "...");
  const result = spawnSync(
    "npx",
    ["wrangler", "secret", "put", name, "--config", config],
    { cwd: workerRoot, stdio: "inherit" }
  );
  if (result.status !== 0) process.exit(result.status || 1);
}

function putSecretValue(name, value) {
  const result = spawnSync(
    "npx",
    ["wrangler", "secret", "put", name, "--config", config],
    {
      cwd: workerRoot,
      input: value + "\n",
      stdio: ["pipe", "inherit", "inherit"],
      encoding: "utf8"
    }
  );
  if (result.status !== 0) process.exit(result.status || 1);
}

putSecretInteractive("ICLOUD_APPLE_ID");
putSecretInteractive("ICLOUD_APP_PASSWORD");

const rl = createInterface({ input, output });
console.log("\nIndica los nombres EXACTOS que ves en Calendario de macOS.");
const personal = (await rl.question("Calendario personal: ")).trim();
const work = (await rl.question("Calendario de trabajo: ")).trim();
const partner = (await rl.question("Calendario de pareja: ")).trim();
const family = (await rl.question("Calendario familiar: ")).trim();
rl.close();

const entries = [
  { name: personal, areaId: "area-general", sensitivity: "personal" },
  { name: work, areaId: "area-career", sensitivity: "confidencial" },
  { name: partner, areaId: "area-partner", sensitivity: "confidencial" },
  { name: family, areaId: "area-family", sensitivity: "confidencial" }
].filter((item) => item.name);

if (!entries.length) {
  throw new Error("No se ha indicado ningún calendario.");
}

putSecretValue("ICLOUD_CALENDAR_CONFIG", JSON.stringify(entries));

console.log("\niCloud Calendar configurado como fuente privada de solo lectura.");
console.log("No se han escrito credenciales ni nombres de calendarios en Git.");
