import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { midasCagrNumber, midasDisplayValuation, midasThesisMethodLabel, compareMidasSortValues } from "./midas-thesis-table.js";

test("MIDAS CAGR parser accepts minus signs from Google Sheets", () => {
  assert.equal(midasCagrNumber("−1,22%"), -1.22);
  assert.equal(midasCagrNumber("-1,25%"), -1.25);
  assert.equal(midasCagrNumber("−16,48%"), -16.48);
  assert.equal(midasCagrNumber("+15,48%"), 15.48);
  assert.equal(midasCagrNumber(" - 13,3 % "), -13.3);
  assert.equal(midasCagrNumber("POR ANUNCIAR"), null);
  assert.equal(midasCagrNumber(""), null);
});

test("CAGR Base defaults to descending, including negative values", () => {
  const samples = [
    {ticker:"NET",value:"-13,3%"}, {ticker:"PLTR",value:"-1,25%"},
    {ticker:"MSFT",value:"−1,22%"}, {ticker:"ADBE",value:"+15,48%"},
    {ticker:"NONE",value:""}
  ];
  samples.sort((a,b) => compareMidasSortValues(
    midasCagrNumber(a.value), midasCagrNumber(b.value),
    {numeric:true,direction:"desc"}
  ));
  assert.deepEqual(samples.map(x=>x.ticker), ["ADBE","MSFT","PLTR","NET","NONE"]);
});

test("clicking a sortable column may reverse direction; missing values stay last", () => {
  const vals = ["5", "", "18", "12"];
  assert.deepEqual([...vals].sort((a,b)=>compareMidasSortValues(a,b,{numeric:true,direction:"desc"})),["18","12","5",""]);
  assert.deepEqual([...vals].sort((a,b)=>compareMidasSortValues(a,b,{numeric:true,direction:"asc"})),["5","12","18",""]);
  assert.ok(compareMidasSortValues("Adobe","Microsoft") < 0);
});

test("tracking table exposes accessible sort buttons for every column and a ticker search", () => {
  const src = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
  for (const key of ["ticker","company","market","current","bull","bear","central","entry","target","earnings","thesis"]) {
    assert.match(src, new RegExp('data-midas-sort-key="' + key + '"'));
  }
  assert.match(src, /bindMidasResearchSorting\(root\)/);
  assert.match(src, /data-midas-thesis-search/);
  assert.match(src, /data-midas-search/);
  assert.match(src, /aria-sort="descending"/);
});


test("MIDAS v1.2: active V6 shows 11.54% reference and archived V5 in parallel", () => {
  const cagr = {
    bear: "+2,41%", base: "+11,54%", bull: "+22,69%",
    status: "V6 REFERENCIA ESTADÍSTICA ACTIVA · REVISIÓN ECONÓMICA ABIERTA",
    historical: {
      bear: "−13,66%", base: "−5,80%", bull: "+6,00%",
      basePrice5y: 537.34, status: "V5 PUBLICADA HISTÓRICA"
    },
    statistical: { baseMultiple: 22.56, base: "+11,54%", status: "V6 ACTIVA COMO REFERENCIA" }
  };
  const tracking = { bearPrice5y: 815.89, basePrice5y: 1250.24, bullPrice5y: 2013.64, priceFor15: 621.59 };
  const result = midasDisplayValuation(cagr, tracking);
  assert.equal(result.v6Reference, true);
  assert.equal(result.base, "+11,54%");
  assert.equal(result.basePrice5y, 1250.24);
  assert.equal(result.priceFor15, 621.59);
  assert.equal(result.multiple, 22.56);
  assert.equal(result.historical.base, "−5,80%");
  assert.equal(result.historical.basePrice5y, 537.34);
});

test("MIDAS v1.2: other tickers and older data continue using their original values", () => {
  const cagr = { bear: "-20%", base: "-1,22%", bull: "+10%", status: "COMPLETA" };
  const tracking = { bearPrice5y: 200, basePrice5y: 495.06, bullPrice5y: 890, priceFor15: 246.13 };
  const result = midasDisplayValuation(cagr, tracking);
  assert.equal(result.v6Reference, false);
  assert.equal(result.base, "-1,22%");
  assert.equal(result.basePrice5y, 495.06);
  assert.equal(result.historical, null);
});

test("MIDAS v1.2: partial statistical states cannot override existing reference", () => {
  const main = {bear:"-20%", base:"-1,22%", bull:"+10%", status:"COMPLETA"};
  const tracking = {basePrice5y:495.06, priceFor15:246.13};
  for (const statistical of [
    null,
    { status: "PROVISIONAL", base: "+11%", basePrice5y: 1250 },
    { status: "V6 ACTIVA", bear:"oops", base:"+11%", bull:"+20%", bearPrice5y:800, basePrice5y:1250, bullPrice5y:2000, priceFor15:621 }
  ]) {
    const out = midasDisplayValuation({...main,statistical},tracking);
    assert.equal(out.v6Reference,false);
    assert.equal(out.base, "-1,22%");
    assert.equal(out.basePrice5y,495.06);
  }
});

test("MIDAS v1.2: frontend gets historical V5 columns Y:AG and sorts on active V6", () => {
  const app = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
  const worker = fs.readFileSync(new URL("../private-cloudflare/src/midas.js", import.meta.url), "utf8");
  assert.match(worker, /CAGR2031!A1:AG500/);
  assert.match(worker, /v5_cagr_base_historico/);
  assert.match(app, /midasDisplayValuation\(cagr, tracking\)/);
  assert.match(app, /midasCagrNumber\(a\.display\.base\)/);
  assert.match(app, /V6 · media histórica/);
  assert.match(app, /display\.historical\?\.base/);
});

test("MIDAS: each canonical method keeps its own visible qualification", () => {
  const items = [
    [{ status: "V6 REFERENCIA ESTADÍSTICA ACTIVA · REVISIÓN ECONÓMICA ABIERTA" }, "V6 · media histórica · economía pendiente"],
    [{ status: "VALORADA · EV/FCF IDC μ±σ v1.2 · QA PENDIENTE" }, "v1.2 · media histórica · validación pendiente"],
    [{ status: "VALORADA · IA_REGIME_REFERENCIA_ANALÍTICA · BUY_REVIEW_PENDING" }, "v1.2 · régimen IA · compra en revisión"],
    [{ status: "VALORADA v1.2 · OPERATIVE_BASE_ACTIVE · MULTIPLE/PEER_REVIEW_PENDING" }, "v1.2 · FCF operativo · múltiplo en revisión"],
    [{ status: "COMPLETA" }, ""]
  ];
  for (const [cagr, expected] of items) {
    assert.equal(midasThesisMethodLabel(cagr, {}, midasDisplayValuation(cagr, {})), expected);
  }
});

test("MIDAS: public UI clarifies that valuations have distinct methodologies", () => {
  const app = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
  assert.match(app, /midasThesisMethodLabel\(cagr, thesis, display\)/);
  assert.match(app, /escapeHtml\(methodology\)/);
  assert.match(app, /Las referencias pueden utilizar media histórica, régimen económico o múltiplo operativo/);
  assert.doesNotMatch(app, /La referencia V6 utiliza por defecto la media histórica homogénea EV\/FCF IDC/);
});
