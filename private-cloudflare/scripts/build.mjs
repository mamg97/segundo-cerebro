import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fingerprintStaticAsset, stampStaticEntrypoints } from "./static-revisions.mjs";

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

// Revisions track actual JS/CSS contents; stale browser caches cannot reuse
// the previous release just because an editor forgot to bump ?v= in index.html.
const appRevision = fingerprintStaticAsset(await readFile(resolve(dist, "app", "app.js")));
const stylesRevision = fingerprintStaticAsset(await readFile(resolve(dist, "app", "styles.css")));
const registerSource = await readFile(resolve(dist, "app", "pwa-register.mjs"), "utf8");
const swPath = resolve(dist, "app", "pwa-sw.js");
const swSource = await readFile(swPath, "utf8");
const releaseRevision = fingerprintStaticAsset(
  [appRevision, stylesRevision, registerSource, swSource].join(":")
);
html = stampStaticEntrypoints(html, {
  "app.js": appRevision,
  "styles.css": stylesRevision
});

// Only the private authenticated deployment is installable. GitHub Pages remains a demo.
html = html.replace("</head>", `  <link rel="manifest" href="./manifest.webmanifest">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="SEGUN">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <script type="module" src="./pwa-register.mjs?v=${releaseRevision}"></script>
  </head>`);
await writeFile(swPath, swSource
  .replaceAll("__BUILD_REVISION__", releaseRevision)
  .replaceAll("__APP_REVISION__", appRevision)
  .replaceAll("__STYLE_REVISION__", stylesRevision), "utf8");
await writeFile(indexPath, html, "utf8");
await writeFile(
  resolve(dist, "private-config.js"),
  "globalThis.__SECOND_BRAIN_REMOTE__ = true;\n",
  "utf8"
);

console.log("Private bundle built in private-cloudflare/dist");
