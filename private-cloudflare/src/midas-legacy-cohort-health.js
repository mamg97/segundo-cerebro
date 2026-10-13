// Contract published by midas-paper-lab/strategy_comparison/report.py.
// All nine original 8-stock strategies, including the SPY benchmark, are
// archived and excluded from the 503-symbol S&P 500 forward comparison.
export function validLegacyMidasCohort(rows) {
  if (!Array.isArray(rows) || rows.length !== 9) return false;
  return rows.filter(row => row?.id === "benchmark_spy").length === 1 &&
    rows.every(row =>
      row?.status === "demo_con_diario" && Boolean(row.last_session) &&
      row.comparison_eligible === false &&
      row.comparison_universe_symbols == null);
}
