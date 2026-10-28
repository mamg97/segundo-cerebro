// Public paper source metadata only. Reuses the private MIDAS card styles.
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export function renderMidasSourceHealth(source) {
  if (source?.status !== "available") return `<section class="midas-source-health is-attention"><strong>Fuente común OHLC · sin verificación</strong><small>La telemetría falta o no supera la validación.</small></section>`;
  const consumers = Object.values(source.consumers || {});
  const updated = consumers.reduce((sum, row) => sum + (row.updated_books || 0), 0);
  const known = consumers.every(row => Number.isInteger(row.updated_books) && Number.isInteger(row.paused_books));
  const paused = consumers.reduce((sum, row) => sum + (row.paused_books || 0), 0);
  const coverage = source.coverage;
  const status = !source.source_ok || !source.consumers_ok ? "Requiere atención" : coverage.missing ? "Cobertura parcial" : "Cobertura completa";
  return `<section class="midas-source-health ${source.overall === "attention" ? "is-attention" : "is-unknown"}">
    <div class="midas-runtime-heading"><div><span class="context-label">Fuente común OHLC</span><strong>${escape(status)}</strong></div><small>Sesión ${escape(source.expected_session)}</small></div>
    <p>${escape(coverage.observed)}/${escape(coverage.requested)} instrumentos · ${escape(coverage.frozen_constituents_observed)}/503 del universo fijo. Antigüedad de captura: ${escape(Math.floor(source.age_seconds / 3600))} h.</p>
    <p>Ausencias: ${escape(source.missing_symbols.join(", ") || "ninguna")}. Libros actualizados: ${escape(known ? updated : "desconocidos")} · en espera: ${escape(known ? paused : "desconocidos")}.</p>
    <p>OHLC diario RAW compartido; FX, históricos ajustados y fundamentales independientes. Una barra ausente pone en espera solo las carteras que la necesitan.</p>
    <small>${source.scheduled_proof ? "Última cadena programada correcta según telemetría del productor." : "Última cadena manual; ciclo programado pendiente de acreditar."} El auditor contrasta los bytes y los diarios por separado.</small>
    <details><summary>Procedencia y hash</summary><p>Captura UTC: ${escape(source.captured_at_utc)} · ejecución ${escape(source.run_id)} · revisiones ${escape(source.revision_hashes.length)}.</p><p style="overflow-wrap:anywhere">Base: ${escape(source.sha256)}<br>Efectivo: ${escape(source.effective_sha256)}</p></details>
  </section>`;
}
