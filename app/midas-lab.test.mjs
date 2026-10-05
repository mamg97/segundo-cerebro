import assert from "node:assert/strict";
import test from "node:test";
import { renderMidasVisualLab } from "./midas-lab.js";

test("renders bootstrap cards when weekly forward has not started", () => {
  const dashboard = { tracks: [
    { id: "benchmark_spy", label: "SPY daily", group: "paper_nuevo", status: "demo_con_diario",
      return_pct: 0, last_session: "2026-09-28", equity_history: [{ date: "2026-09-28", nav: 100000 }] }
  ] };
  const lab = { weeklyBootstrap: { status: "bootstrap_only", signal_asof: "2026-09-25", mark_date: "2026-09-28", strategies: {
    ensemble_consensus: { mark_to_market_nav: 98657.04, mark_to_market_return_pct: -1.343, positions: [{ ticker: "SMCI" }] }
  } } };
  const html = renderMidasVisualLab(dashboard, lab);
  assert.match(html, /LABORATORIO VIVO/);
  assert.match(html, /Ensemble/);
  assert.match(html, /SMCI/);
  assert.match(html, /Prueba retrospectiva de arranque/);
});

test("forward weekly rows replace bootstrap duplicates", () => {
  const dashboard = { tracks: [
    { id: "weekly_ml_ensemble_2026", label: "ML semanal · ensemble", group: "weekly_ml_demo", status: "demo_con_diario",
      return_pct: 1.2, last_session: "2026-10-09", equity_history: [
        { date: "2026-10-02", nav: 100000 }, { date: "2026-10-09", nav: 101200 }
      ] }
  ] };
  const lab = { weeklyBootstrap: { status: "bootstrap_only", signal_asof: "2026-09-25", mark_date: "2026-09-28", strategies: {
    ensemble_consensus: { mark_to_market_nav: 98657.04, mark_to_market_return_pct: -1.343, positions: [{ ticker: "SMCI" }] }
  } } };
  const html = renderMidasVisualLab(dashboard, lab);
  assert.match(html, /ML semanal · ensemble/);
  assert.doesNotMatch(html, /Prueba retrospectiva de arranque/);
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
  assert.match(html, /Actividad actual/);
  assert.match(html, /10 compras para próxima apertura/);
  assert.match(html, /AMD/);
  assert.match(html, /INTC/);
  assert.match(html, /Rentabilidad acumulada/);
  assert.match(html, /0,00 %/);
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
