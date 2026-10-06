import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [objects, css, app, index, audit] = await Promise.all([
  readFile(new URL("./objects.js", import.meta.url), "utf8"),
  readFile(new URL("./styles.css", import.meta.url), "utf8"),
  readFile(new URL("./app.js", import.meta.url), "utf8"),
  readFile(new URL("./index.html", import.meta.url), "utf8"),
  readFile(new URL("../private-cloudflare/scripts/web-audit.mjs", import.meta.url), "utf8")
]);

test("look cards open a canonical detail view", () => {
  assert.match(objects, /data-look-open=/);
  assert.match(objects, /function detailLook\(look,payload\)/);
  assert.match(objects, /look-detail-layout/);
  assert.match(objects, /look-detail-main/);
  assert.match(objects, /look-detail-items/);
  assert.match(objects, /data-object-open/);
  assert.match(objects, /event\.key==="Enter"\|\|event\.key===" "/);
});

test("look usage history is exposed from canonical usage fields", () => {
  assert.match(objects, /data-look-history/);
  assert.match(objects, /function lookUsageEntries\(payload\)/);
  assert.match(objects, /usageHistory/);
  assert.match(objects, /lastUsed/);
  assert.match(objects, /function lookUsageHistoryView\(payload,mode="looks",sort="recent"\)/);
  assert.match(objects, /Historial de uso/);
  assert.match(objects, /data-look-history-open/);
  assert.match(objects, /data-garment-history-open/);
  assert.match(objects, /data-look-history-mode="looks"/);
  assert.match(objects, /data-look-history-mode="garments"/);
  assert.match(objects, /data-look-history-sort/);
  assert.match(objects, /Usos totales/);
  assert.match(objects, /Últimos 30 días/);
  assert.match(objects, /Fechas registradas/);
  assert.match(objects, /function usageHistoryRows\(payload,mode="looks"\)/);
  assert.match(css, /\.look-history-table\s*\{/);
  assert.match(objects, /function usageHistoryThumbnail\(row,payload\)/);
  assert.match(objects, /look-history-thumb-cell/);
  assert.match(css, /\.look-history-thumb\s*\{/);
  assert.match(css, /width:\s*52px/);
  assert.match(css, /height:\s*60px/);
  assert.match(objects, /function usageDateKey\(value\)/);
  assert.match(objects, /function compareUsageDate\(a,b,direction="desc"\)/);
  assert.match(objects, /if \(!aDate\) return 1/);
  assert.match(objects, /if \(!bDate\) return -1/);
  assert.match(css, /v0\.42\.18 — native mobile cards for usage history \(Safari-safe\)/);
  assert.match(objects, /look-history-mobile-list/);
  assert.match(objects, /look-history-mobile-card/);
  assert.match(objects, /look-history-mobile-main/);
  assert.match(css, /\.look-history-table-wrap\s*\{[\s\S]*?display:\s*none !important/);
  assert.match(css, /\.look-history-mobile-list\s*\{[\s\S]*?display:\s*grid/);
  assert.match(css, /\.look-history-mobile-metrics\s*\{/);
});

test("look detail enlarges the look and shows component garments responsively", () => {
  assert.match(css, /\.look-detail-layout\s*\{[\s\S]*?grid-template-columns:\s*minmax\(320px, 1\.35fr\) minmax\(300px, \.85fr\)/);
  assert.match(css, /\.look-detail-main\s*\{[\s\S]*?min-height:\s*560px/);
  assert.match(css, /\.look-detail-main > img,[\s\S]*?object-fit:\s*contain/);
  assert.match(css, /\.look-detail-item-image img\s*\{[\s\S]*?object-fit:\s*contain/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.look-detail-layout\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.look-detail-items,[\s\S]*?grid-template-columns:\s*1fr/);
});

test("look detail cache bust and production audit are wired", () => {
  assert.match(app, /objects\.js\?v=0\.41\.8/);
  assert.match(index, /styles\.css\?v=0\.43\.0/);
  assert.match(index, /app\.js\?v=0\.43\.0/);
  assert.match(audit, /auditLookDetail/);
  assert.match(audit, /Look ampliado/);
  assert.match(audit, /Prendas del look/);
  assert.match(audit, /Historial de looks disponible/);
  assert.match(audit, /Historial de looks abre/);
  assert.match(audit, /Historial ordenable/);
  assert.match(audit, /Vista Prendas disponible/);
  assert.match(audit, /Vista Prendas activa/);
  assert.match(audit, /Miniaturas de Looks/);
  assert.match(audit, /Miniaturas de Prendas/);
  assert.match(objects, /data-history-has-date/);
  assert.match(audit, /Historial orden por defecto reciente/);
  assert.match(audit, /Looks sin fecha al final por defecto/);
  assert.match(audit, /Historial móvil compacto/);
  assert.match(audit, /Historial en tarjetas móviles/);
  assert.match(audit, /Tabla desktop oculta en móvil/);
});
