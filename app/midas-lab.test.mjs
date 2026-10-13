import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import { renderMidasAlgorithmDetail, renderMidasVisualLab, compareMidasLabRows } from "./midas-lab.js";

test("renders bootstrap rows when weekly forward has not started", () => {
  const dashboard = { tracks: [
    { id: "benchmark_spy", label: "SPY daily", group: "paper_nuevo", status: "demo_con_diario",
      return_pct: 0, last_session: "2026-09-28", equity_history: [{ date: "2026-09-28", nav: 100000 }] }
  ] };
  const lab = { weeklyBootstrap: { status: "bootstrap_only", signal_asof: "2026-09-25", mark_date: "2026-09-28", strategies: {
    ensemble_consensus: { mark_to_market_nav: 98657.04, mark_to_market_return_pct: -1.343, positions: [{ ticker: "SMCI" }] }
  } } };
  const html = renderMidasVisualLab(dashboard, lab);
  assert.match(html, /COMPETICIÓN/);
  assert.match(html, /Ensemble/);
  assert.match(html, /SMCI/);
  assert.match(html, /Prueba retrospectiva · no cuenta en forward/);
});

test("forward weekly rows replace bootstrap duplicates", () => {
  const dashboard = { tracks: [
    { id: "weekly_ml_ensemble_2026", label: "ML semanal · ensemble", group: "weekly_ml_demo", status: "demo_con_diario", daily_mode: true,
      return_pct: 1.2, last_session: "2026-10-09", equity_history: [
        { date: "2026-10-02", nav: 100000 }, { date: "2026-10-09", nav: 101200 }
      ] }
  ] };
  const lab = { weeklyBootstrap: { status: "bootstrap_only", signal_asof: "2026-09-25", mark_date: "2026-09-28", strategies: {
    ensemble_consensus: { mark_to_market_nav: 98657.04, mark_to_market_return_pct: -1.343, positions: [{ ticker: "SMCI" }] }
  } } };
  const html = renderMidasVisualLab(dashboard, lab);
  assert.match(html, /ML semanal · ensemble/);
  assert.doesNotMatch(html, /Prueba retrospectiva · no cuenta en forward/);
  assert.match(html, /\+1,20 %/);
});


test("renders current activity separately from cumulative return", () => {
  const dashboard = { tracks: [
    { id: "weekly_ml_ensemble_2026", label: "ML semanal · ensemble", group: "weekly_ml_demo",
      status: "demo_con_diario", return_pct: 0, last_session: "2026-10-02",
      activity_label: "10 compras para próxima apertura",
      activity_tickers: ["AMD", "INTC", "UAL"],
      equity_history: [{ date: "2026-10-02", nav: 100000 }] }
  ] };
  const html = renderMidasVisualLab(dashboard, null);
  assert.match(html, /<table class="midas-lab-table">/);
  assert.match(html, /data-midas-lab-sort-key="algorithm"/);
  assert.match(html, /data-midas-lab-sort-key="activity"/);
  assert.match(html, /data-midas-lab-sort-key="return"/);
  assert.match(html, /3 señales congeladas · liquidación semanal pendiente/);
  assert.match(html, /Señales congeladas el viernes/);
  assert.match(html, /Señal sin liquidar/);
  assert.doesNotMatch(html, /10 compras para próxima apertura/);
  assert.match(html, /AMD/);
  assert.match(html, /INTC/);
  assert.match(html, /Rent\. acum\./);
  assert.match(html, /data-midas-lab-sort-return=""/);
  assert.match(html, /<strong class="midas-lab-return">—<\/strong>/);
  const detail = renderMidasAlgorithmDetail(dashboard, null, "weekly_ml_ensemble_2026");
  assert.match(detail, /Liquidación semanal diferida/);
  assert.match(detail, /Señal sin liquidar/);
});

test("labels live Weekly ML as daily paper rather than delayed settlement", () => {
  const dashboard = { tracks: [
    { id: "weekly_ml_ensemble_2026", label: "ML semanal · ensemble",
      group: "weekly_ml_demo", status: "demo_con_diario", daily_mode: true,
      return_pct: 0.25, last_session: "2026-10-12", activity_state: "active",
      activity_label: "2 posiciones abiertas", activity_tickers: ["AAA", "BBB"],
      equity_history: [{date: "2026-10-09", nav: 100000},
                       {date: "2026-10-12", nav: 100250}]}
  ] };
  const html = renderMidasVisualLab(dashboard, null);
  assert.match(html, /valoración diaria al cierre/);
  assert.doesNotMatch(html, /Esta variante no registra compras ni rentabilidad diaria/);
  assert.match(html, /2 posiciones abiertas/);
  assert.match(html, /\+0,25 %/);
  const detail = renderMidasAlgorithmDetail(dashboard, null, "weekly_ml_ensemble_2026");
  assert.match(detail, /Modo paper diario prospectivo/);
  assert.doesNotMatch(detail, /esta versión no registra entradas efectivas/);
});

test("renders one compact clickable row per algorithm without chart column", () => {
  const dashboard = { tracks: [
    { id: "a", label: "Algoritmo A", group: "paper_nuevo", status: "demo_con_diario",
      return_pct: 1.25, last_session: "2026-10-05", max_drawdown_pct: -0.4,
      activity_label: "2 posiciones abiertas", activity_tickers: ["AAA", "BBB"],
      equity_history: [{ date: "2026-10-02", nav: 100000 }, { date: "2026-10-05", nav: 101250 }] },
    { id: "b", label: "Algoritmo B", group: "paper_nuevo", status: "demo_con_diario",
      return_pct: 0, last_session: "2026-10-05", activity_label: "Sin compras · en efectivo",
      activity_tickers: [], equity_history: [{ date: "2026-10-05", nav: 100000 }] }
  ] };
  const html = renderMidasVisualLab(dashboard, null);
  assert.equal((html.match(/class="midas-lab-row/g) || []).length, 2);
  assert.match(html, /2 posiciones abiertas/);
  assert.match(html, /AAA/);
  assert.match(html, /BBB/);
  assert.match(html, /data-midas-algorithm-id="a"/);
  assert.match(html, /role="button"/);
  assert.doesNotMatch(html, /<th>Evolución<\/th>/);
  assert.doesNotMatch(html, /midas-lab-col-chart/);
  assert.doesNotMatch(html, /midas-lab-mini-chart/);
});

test("renders corrected TFG as its own live algorithm group", () => {
  const dashboard = { tracks: [
    { id: "tfg_corrected_2026", label: "TFG corregido 2026 · técnico + AHP + MAD",
      group: "tfg_demo_adaptado", status: "demo_con_diario",
      return_pct: 0.75, last_session: "2026-10-09", equity_history: [
        { date: "2026-10-02", nav: 100000 }, { date: "2026-10-09", nav: 100750 }
      ] }
  ] };
  const html = renderMidasVisualLab(dashboard, null);
  assert.match(html, />TFG</);
  assert.match(html, /TFG corregido 2026/);
  assert.match(html, /\+0,75 %/);
});


test("renders Buy The Dip corpus as its own live algorithm group", () => {
  const dashboard = { tracks: [
    { id: "buy_the_dip_corpus_2026_v0", label: "Buy The Dip corpus v0 · deep value + special situations",
      group: "buy_the_dip_demo", status: "demo_con_diario",
      return_pct: 1.25, last_session: "2026-10-05", equity_history: [
        { date: "2026-10-01", nav: 100000 }, { date: "2026-10-05", nav: 101250 }
      ] }
  ] };
  const html = renderMidasVisualLab(dashboard, null);
  assert.match(html, />Buy The Dip</);
  assert.match(html, /deep value/);
  assert.match(html, /\+1,25 %/);
});



test("archived weekly settlement never replaces prospective daily competition", () => {
  const forwardId = "weekly_ml_ensemble_2026";
  const archiveId = "weekly_legacy_weekly_ml_ensemble_2026";
  const dashboard = { tracks: [
    { id: forwardId, label: "ML ensemble prospectivo", group: "weekly_ml_demo",
      daily_mode: true, status: "programada_sin_diario", return_pct: null,
      last_session: null, equity_history: [], activity_label: "Esperando primera sesión" },
    { id: archiveId, label: "ML ensemble liquidación semanal", group: "weekly_ml_legacy",
      status: "weekly_settled_demo", return_pct: 5, last_session: "2026-10-09",
      equity_history: [{ date: "2026-10-02", nav: 100000 }, { date: "2026-10-09", nav: 105000 }] }
  ] };
  const lab = { weeklyBootstrap: { status: "bootstrap_only", signal_asof: "2026-09-25",
    mark_date: "2026-09-28", strategies: {
      ensemble_consensus: { mark_to_market_nav: 98700, positions: [{ ticker: "SMCI" }] }
    } } };
  const html = renderMidasVisualLab(dashboard, lab);
  assert.match(html, /data-midas-algorithm-id="weekly_ml_ensemble_2026"/);
  assert.doesNotMatch(html, /data-midas-algorithm-id="weekly_legacy_weekly_ml_ensemble_2026"/);
  assert.doesNotMatch(html, /Bootstrap técnico/);
  assert.doesNotMatch(html, /\+5,00 %/);
  assert.match(html, /Esperando primera sesión/);
  assert.match(html, /data-midas-lab-sort-return=""/);
});

test("weekly archival table and daily ranks have distinct frontend sections", () => {
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  assert.match(app, /function renderMidasWeeklyArchive\(rows\)/);
  assert.match(app, /data-midas-weekly-archive-id=/);
  assert.match(app, /weekly_ml_legacy/);
  assert.match(app, /Solo se publica rentabilidad tras la primera liquidación registrada/);
});

test("legacy genetic is catalog-only, private forward never masquerades as cash", () => {
  const dashboard = { tracks: [
    { id: "genetic_sp500_legacy", group: "diario_heredado", label: "Genético histórico",
      status: "diario_heredado_observado", return_pct: 4.38, last_session: "2026-09-25",
      equity_history: [{ date: "2026-09-25", nav: 104380 }] },
    { id: "genetic_sp500_forward", group: "diario_heredado", label: "Genético corregido",
      status: "demo_con_diario", return_pct: 1.01, last_session: "2026-10-07",
      activity_tickers: [], equity_history: [{ date: "2026-10-07", nav: 101010 }] }
  ] };
  const html = renderMidasVisualLab(dashboard);
  assert.doesNotMatch(html, /Genético histórico/);
  assert.match(html, /Genético corregido/);
  assert.match(html, /Actividad privada · detalle no disponible/);
  assert.doesNotMatch(html, /Sin compras · en efectivo/);
  const detail = renderMidasAlgorithmDetail(dashboard, null, "genetic_sp500_forward");
  assert.match(detail, /actividad no enlazada/);
  assert.match(detail, /Actividad privada/);
});

test("interrupted private genetic campaign is archived, not double-ranked", () => {
  const dashboard = { tracks: [
    { id: "genetic_sp500_forward_archive", group: "diario_heredado",
      label: "Genético campaña interrumpida", status: "diario_heredado_observado",
      return_pct: 1.008028, last_session: "2026-10-07",
      equity_history: [{ date: "2026-10-07", nav: 101008.028 }] },
    { id: "genetic_sp500_forward", group: "diario_heredado",
      label: "Genético prospectivo 12 octubre", status: "programada_sin_diario",
      return_pct: null, last_session: null, equity_history: [] }
  ] };
  const html = renderMidasVisualLab(dashboard);
  assert.doesNotMatch(html, /Genético campaña interrumpida/);
  assert.match(html, /Genético prospectivo 12 octubre/);
  assert.doesNotMatch(html, /1,01 %/);
});

test("old weekly signals never display unverified return as realized P&L", () => {
  const dashboard = { tracks: [{
    id: "weekly_old", group: "weekly_ml_demo", label: "ML semanal legacy",
    status: "demo_con_diario", return_pct: 0, last_session: "2026-10-02",
    activity_tickers: [], equity_history: [{ date: "2026-10-02", nav: 100000 }]
  }] };
  const html = renderMidasVisualLab(dashboard);
  assert.match(html, /Pendiente de primera liquidación/);
  assert.match(html, /data-midas-lab-sort-return=""/);
  assert.match(html, /clasificación acumulada provisional/);
});

test("settled old weekly NAV appears only after two genuine weekly marks", () => {
  const dashboard = { tracks: [{
    id: "weekly_settled", group: "weekly_ml_demo", label: "ML semanal liquidado",
    status: "demo_con_diario", return_pct: 1.25, last_session: "2026-10-16",
    activity_tickers: ["AAA"], activity_label: "1 señal congelada · liquidación semanal pendiente",
    equity_history: [{ date: "2026-10-09", nav: 100000 }, { date: "2026-10-16", nav: 101250 }]
  }] };
  const html = renderMidasVisualLab(dashboard);
  assert.match(html, /Resultado de liquidación semanal/);
  assert.match(html, /\+1,25 %/);
  assert.match(html, /data-midas-lab-sort-return="1.25"/);
  assert.doesNotMatch(html, /Pendiente de primera liquidación/);
});

test("competition uses ONE table, with block as an eighth sortable column", () => {
  const dashboard = { tracks: [
    { id: "one", label: "Estrategia A", group: "weekly_ml_demo", status: "programada_sin_diario",
      return_pct: null, activity_label: "Señal sin liquidar", last_session: "2026-10-02" },
    { id: "two", label: "Estrategia B", group: "capital_cycle_demo", status: "demo_con_diario",
      return_pct: 1.5, last_session: "2026-10-09", max_drawdown_pct: -0.2,
      equity_history: [{ date: "2026-10-09", nav: 101500 }] },
    { id: "three", label: "Estrategia C", group: "buy_the_dip_demo", status: "demo_con_diario",
      return_pct: -0.5, last_session: "2026-10-08",
      equity_history: [{ date: "2026-10-08", nav: 99500 }] }
  ] };
  const html = renderMidasVisualLab(dashboard, null);
  assert.equal((html.match(/<table class="midas-lab-table"/g) || []).length, 1);
  assert.equal((html.match(/<thead>/g) || []).length, 1);
  assert.equal((html.match(/class="midas-lab-row/g) || []).length, 3);
  assert.equal((html.match(/data-midas-lab-sort-key="/g) || []).length, 8);
  assert.equal((html.match(/data-midas-lab-sort-group="/g) || []).length, 3);
  assert.match(html, />Bloque\s*<span data-midas-lab-sort-indicator/);
  assert.match(html, /Capital Cycle/);
  assert.match(html, /Weekly ML/);
  assert.match(html, /Buy The Dip/);
  assert.match(html, /data-midas-lab-mobile-sort/);
  assert.match(html, /data-midas-algorithm-id="two"/);
  assert.doesNotMatch(html, /midas-lab-group-title/);
  assert.doesNotMatch(html, /<th>Evolución<\/th>/);
});

test("competition sorting matches thesis behavior: numbers, dates, missing last, ties and text", () => {
  const rows = [
    { algorithm: "B", group: "Weekly ML", return: "", sessions: "1", date: "2026-10-02", dd: "" },
    { algorithm: "C", group: "Buy The Dip", return: "-0.5", sessions: "7", date: "2026-10-08", dd: "-1.99" },
    { algorithm: "A", group: "Capital Cycle", return: "1.32", sessions: "7", date: "2026-10-08", dd: "-1.33" },
    { algorithm: "D", group: "Capital Cycle", return: "1.32", sessions: "0", date: "", dd: "0" }
  ];
  assert.deepEqual([...rows].sort((a,b) => compareMidasLabRows(a,b,"return","desc")).map(x=>x.algorithm),["A","D","C","B"]);
  assert.deepEqual([...rows].sort((a,b) => compareMidasLabRows(a,b,"return","asc")).map(x=>x.algorithm),["C","A","D","B"]);
  assert.deepEqual([...rows].sort((a,b) => compareMidasLabRows(a,b,"date","desc")).map(x=>x.algorithm),["A","C","B","D"]);
  assert.deepEqual([...rows].sort((a,b) => compareMidasLabRows(a,b,"sessions","desc")).map(x=>x.algorithm),["A","C","B","D"]);
  assert.deepEqual([...rows].sort((a,b) => compareMidasLabRows(a,b,"group","asc")).map(x=>x.algorithm),["C","A","D","B"]);
});

test("algorithm detail restores the full metrics and equity evolution", () => {
  const dashboard = { tracks: [
    { id: "algo-detail", label: "Algoritmo detalle", group: "paper_nuevo", status: "demo_con_diario",
      currency: "USD", last_equity: 101250, return_pct: 1.25, day_return_pct: 0.4,
      annualized_volatility_pct: 8.2, max_drawdown_pct: -0.7, sharpe_0rf: 1.1,
      last_session: "2026-10-06", activity_label: "2 posiciones abiertas",
      activity_tickers: ["AAA", "BBB"], positions: [{ ticker: "AAA", weight: 0.55 }, { ticker: "BBB", weight: 0.45 }],
      equity_history: [{ date: "2026-10-01", nav: 100000 }, { date: "2026-10-06", nav: 101250 }] }
  ] };
  const html = renderMidasAlgorithmDetail(dashboard, null, "algo-detail");
  for (const label of ["Rentabilidad acumulada", "Rentabilidad día", "Volatilidad anual.", "Máx. drawdown", "Sharpe 0rf", "Capital demo", "Evolución"]) {
    assert.match(html, new RegExp(label));
  }
  assert.match(html, /midas-algorithm-chart/);
  assert.match(html, /AAA/);
  assert.match(html, /BBB/);
  assert.match(html, /data-midas-algorithm-back/);
});


test("the health card never equates a private genetic snapshot with a passed workflow", () => {
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  const fn = app.split("function renderMidasExecutionHealth(health, dashboard) {")[1]?.split("function renderMidasCatalog(")[0];
  assert.ok(fn);
  assert.match(fn, /genetic\?\.last_session \? "unverified" : "missing_due_run"/);
  assert.match(fn, /la última ejecución GitHub no se valida aquí/);
  assert.match(fn, /Cobertura de auditoría parcial/);
  assert.match(fn, /Weekly ML diario/);
  assert.doesNotMatch(fn, /state: genetic\?\.status === "demo_con_diario"/);
});

test("production MIDAS audit guards historical ranking and NAV-only genetic activity", () => {
  const audit = readFileSync(new URL("../private-cloudflare/scripts/web-audit.mjs", import.meta.url), "utf8");
  assert.match(audit, /MIDAS · genético histórico no compite en el ranking prospectivo/);
  assert.match(audit, /MIDAS · snapshot genético privado no se interpreta como efectivo ni filtra tickers/);
  assert.match(audit, /MIDAS · histórico semanal separado del ranking diario/);
  assert.match(audit, /MIDAS · sin NAV diario heredado ni rentabilidad semanal antes de liquidar/);
});

test("competition sorting initializes once per MIDAS render and mobile is responsive", () => {
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
  const workspace = app.split("function bindMidasWorkspace(dashboard, lab) {")[1]?.split("async function openMidasDialog()")[0];
  assert.ok(workspace, "MIDAS workspace binder missing");
  assert.equal((workspace.match(/bindMidasLabSorting\(root\);/g) || []).length, 1);
  assert.match(css, /\.midas-lab-table\s*\{[\s\S]*?min-width:\s*0;/);
  assert.match(css, /\.midas-lab-mobile-sort\s*\{[\s\S]*?display:\s*flex;/);
  assert.match(css, /\.midas-lab-table tbody tr\.midas-lab-row\s*\{[\s\S]*?grid-template-columns/);
  assert.match(css, /\.midas-lab-table thead\s*\{[\s\S]*?clip-path:\s*inset\(50%\)/);
});


test("TimesFM EUR appears in competition without invented return and shows comparable windows", () => {
  const dashboard = { tracks: [
    { id: "timesfm_2p5_eur_paper", label: "TimesFM 2.5", group: "timesfm_demo",
      currency: "EUR", status: "programada_sin_diario",
      return_pct: null, period_returns_pct: { "5_sessions": null, "21_sessions": null, "63_sessions": null },
      equity_history: [] },
    { id: "timesfm_spy_eur", label: "SPY EUR", group: "timesfm_demo",
      currency: "EUR", status: "demo_con_diario", return_pct: 0.4,
      period_returns_pct: { "5_sessions": 0.4, "21_sessions": null, "63_sessions": null },
      equity_history: [{ date: "2026-10-16", nav: 100000 }, { date: "2026-10-23", nav: 100400 }] }
  ] };
  const html = renderMidasVisualLab(dashboard);
  assert.match(html, /TimesFM semanal · EUR/);
  assert.match(html, /data-midas-algorithm-id="timesfm_2p5_eur_paper"/);
  assert.match(html, /data-midas-lab-sort-return=""/);
  const details = renderMidasAlgorithmDetail(dashboard, null, "timesfm_spy_eur");
  assert.match(details, /5 sesiones · mismo período/);
  assert.match(details, /21 sesiones · mismo período/);
  assert.match(details, /63 sesiones · mismo período/);
  assert.match(details, /0,40 %/);
  const pending = renderMidasAlgorithmDetail(dashboard, null, "timesfm_2p5_eur_paper");
  assert.match(pending, /Esperando primera sesión/);
  assert.match(pending, /5 sesiones · mismo período/);
});


test("single S&P500 cohort excludes restricted legacy models and includes both TimesFM horizons", () => {
  const dashboard = { tracks: [
    { id: "legacy_eight", label: "Old EMA", group: "paper_nuevo",
      comparison_eligible: false, comparison_exclusion_reason: "8 stocks",
      status: "demo_con_diario", return_pct: 50 },
    { id: "legacy_ibex", label: "Old IBEX", group: "tfm_demo_adaptado",
      comparison_eligible: false, status: "demo_con_diario", return_pct: 8 },
    { id: "timesfm_2p5_eur_paper", label: "TimesFM semanal",
      group: "timesfm_demo", comparison_eligible: true,
      comparison_universe_id: "SP500_2026-09-29_503",
      period_returns_pct: { "5_sessions": null },
      status: "programada_sin_diario", return_pct: null },
    { id: "timesfm_2p5_daily_eur_paper", label: "TimesFM diario",
      group: "timesfm_daily_demo", comparison_eligible: true,
      comparison_universe_id: "SP500_2026-09-29_503",
      period_returns_pct: { "5_sessions": null },
      status: "programada_sin_diario", return_pct: null }
  ] };
  const html = renderMidasVisualLab(dashboard);
  assert.doesNotMatch(html, /Old EMA/);
  assert.doesNotMatch(html, /Old IBEX/);
  assert.match(html, /TimesFM semanal/);
  assert.match(html, /TimesFM diario/);
  assert.equal((html.match(/class="midas-lab-row/g) || []).length, 2);
  assert.match(html, /data-midas-lab-sort-return=""/);
  const daily = renderMidasAlgorithmDetail(dashboard, null, "timesfm_2p5_daily_eur_paper");
  assert.match(daily, /5 sesiones · mismo período/);
  assert.match(daily, /Universo canónico: SP500_2026-09-29_503/);
  assert.doesNotMatch(renderMidasAlgorithmDetail(dashboard, null, "legacy_eight"), /50,00 %/);
});
