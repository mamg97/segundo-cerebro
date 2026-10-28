import test from "node:test";
import assert from "node:assert/strict";
import { renderMidasSourceHealth } from "./midas-source-health.mjs";
test("source card exposes gaps, waiting books and manual proof without claiming scheduled success", () => {
  const source = { status: "available", overall: "partial", source_ok: true, consumers_ok: true,
    expected_session: "2026-10-27", coverage: { observed: 491, requested: 504, frozen_constituents_observed: 490, missing: 13 },
    consumers: { example: { updated_books: 24, paused_books: 0 } }, missing_symbols: ["AAA", "<script>"],
    age_seconds: 18000, run_id: "123", revision_hashes: [], sha256: "a".repeat(64), effective_sha256: "b".repeat(64) };
  const html = renderMidasSourceHealth(source);
  for (const value of ["491/504", "490/503", "2026-10-27", "Libros actualizados: 24", "en espera: 0", "ciclo programado pendiente", "b".repeat(64)]) assert.ok(html.includes(value));
  assert.ok(!html.includes("<script>")); assert.match(html, /&lt;script&gt;/);
  assert.match(renderMidasSourceHealth(null), /sin verificación/);
});
