import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const audit = readFileSync(new URL("../private-cloudflare/scripts/web-audit.mjs", import.meta.url), "utf8");
const index = readFileSync(new URL("./index.html", import.meta.url), "utf8");

assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.wardrobe-visual-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
assert.match(css, /@media \(max-width: 429px\)[\s\S]*?\.wardrobe-visual-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
assert.doesNotMatch(css, /@media \(max-width: 460px\)[\s\S]{0,500}?\.wardrobe-visual-grid\s*\{\s*grid-template-columns:\s*1fr/);
assert.match(css, /\.wardrobe-card-visual \.wardrobe-card-foot\s*\{\s*display:\s*none/);
assert.match(css, /\.wardrobe-card-visual \.wardrobe-visual\s*\{[\s\S]*?aspect-ratio:\s*1\s*\/\s*1\.08/);

assert.match(audit, /mobile-wide", width: 440, height: 956, wardrobeColumns: 3/);
assert.match(audit, /mobile", width: 390, height: 844, wardrobeColumns: 2/);
assert.match(audit, /Visual \$\{label\} · Armario \$\{expectedColumns\} columnas/);

assert.match(index, /styles\.css\?v=0\.40\.18/);

assert.match(audit, /waitFor\(\{ state: "visible", timeout: 8000 \}\)/);
assert.match(audit, /probeApi\("\/api\/objects", \`Armario \${label}\`, \{ attempts: 2, waitMs: 900 \}\)/);
assert.match(audit, /fuente recuperada; reabriendo Objetos antes de declarar fallo/);
assert.match(audit, /openAreaForVisualAudit\("area-objects"\)/);
