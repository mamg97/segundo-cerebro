import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const workerRoot = resolve(here, "..");
const repoRoot = resolve(workerRoot, "..");
const dist = resolve(workerRoot, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, "app"), { recursive: true });
await mkdir(resolve(dist, "core"), { recursive: true });

await cp(resolve(repoRoot, "app"), resolve(dist, "app"), { recursive: true });
await cp(resolve(repoRoot, "core"), resolve(dist, "core"), { recursive: true });

const indexPath = resolve(dist, "app", "index.html");
let html = await readFile(indexPath, "utf8");

html = html
  .replace("<title>Segundo Cerebro — v0.1.1</title>", "<title>Segundo Cerebro — privado</title>")
  .replace(
    '<meta name="description" content="Prototipo privado y local del dashboard Segundo Cerebro.">',
    '<meta name="description" content="Segundo Cerebro privado."><meta name="robots" content="noindex,nofollow,noarchive">'
  )
  .replace(
    /<script type="module" src="\.\/app\.js(?:\?v=[^"]+)?"><\/script>/,
    (scriptTag) => `<script src="../private-config.js"></script>\n    ${scriptTag}`
  );

await writeFile(indexPath, html, "utf8");
await writeFile(
  resolve(dist, "private-config.js"),
  "globalThis.__SECOND_BRAIN_REMOTE__ = true;\n",
  "utf8"
);

console.log("Private bundle built in private-cloudflare/dist");
