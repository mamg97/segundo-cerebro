// Contract published by midas-paper-lab/strategy_comparison/report.py.
// Eight historical 8-stock strategies remain non-comparable. The original
// SPY row is an intentional, shared forward reference for the S&P 500 cohort.
export function validLegacyMidasCohort(rows) {
  if (!Array.isArray(rows) || rows.length !== 9) return false;
  const references = rows.filter(row => row?.id === "benchmark_spy");
  const archived = rows.filter(row => row?.id !== "benchmark_spy");
  return references.length === 1 && archived.length === 8 &&
    archived.every(row =>
      row?.status === "demo_con_diario" && Boolean(row.last_session) &&
      row.comparison_eligible === false) &&
    references[0].status === "demo_con_diario" &&
    Boolean(references[0].last_session) &&
    references[0].comparison_eligible === true &&
    references[0].comparison_universe_symbols === 503;
}
