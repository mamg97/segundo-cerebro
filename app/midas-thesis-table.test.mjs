import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { midasCagrNumber, midasDisplayValuation, compareMidasSortValues } from "./midas-thesis-table.js";

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

test("MIDAS v1.2: shows provisional statistical valuations without overwriting V5", () => {
  const historical = { bear: "−13,66%", base: "−5,80%", bull: "+6,00%", status: "COMPLETA V5" };
  const tracking = { bearPrice5y: 347.43, basePrice5y: 537.34, bullPrice5y: 969.30, priceFor15: 267.15 };
  const stat = {
    bear: "+2,41%", base: "+11,54%", bull: "+22,69%",
    bearPrice5y: 815.89, basePrice5y: 1250.24, bullPrice5y: 2013.64,
    priceFor15: 621.59, baseMultiple: 22.56,
    status: "PROVISIONAL · MULTIPLE_REVIEW_PENDING"
  };
  const display = midasDisplayValuation({ ...historical, statistical: stat }, tracking);
  assert.equal(display.provisional, true);
  assert.equal(display.base, "+11,54%");
  assert.equal(display.basePrice5y, 1250.24);
  assert.equal(display.priceFor15, 621.59);
  assert.equal(display.multiple, 22.56);
  assert.equal(historical.base, "−5,80%");
  assert.equal(tracking.basePrice5y, 537.34);
});

test("MIDAS v1.2: missing or non-provisional statistical cases never supplant published targets", () => {
  const historical = { bear: "-20%", base: "-1,22%", bull: "+10%", status: "COMPLETA" };
  const tracking = { bearPrice5y: 200, basePrice5y: 495.06, bullPrice5y: 890, priceFor15: 246.13 };
  for (const statistical of [
    null,
    { status: "PUBLISHED", base: "+11%", basePrice5y: 1250 },
    { status: "PROVISIONAL", base: "+11%", basePrice5y: 1250 },
    { status: "PROVISIONAL", bear: "x", base: "+11%", bull: "+20%", bearPrice5y: 800, basePrice5y: 1250, bullPrice5y: 2000, priceFor15: 621 }
  ]) {
    const display = midasDisplayValuation({ ...historical, statistical }, tracking);
    assert.equal(display.provisional, false);
    assert.equal(display.base, "-1,22%");
    assert.equal(display.basePrice5y, 495.06);
  }
});

test("MIDAS v1.2: frontend sorts on displayed provisional CAGR and reads columns O:X", () => {
  const app = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
  const worker = fs.readFileSync(new URL("../private-cloudflare/src/midas.js", import.meta.url), "utf8");
  assert.match(worker, /CAGR2031!A1:X500/);
  assert.match(worker, /estado_valoracion_estadistica/);
  assert.match(app, /midasDisplayValuation\(cagr, tracking\)/);
  assert.match(app, /midasCagrNumber\(a\.display\.base\)/);
  assert.match(app, /Estadístico provisional/);
  assert.match(app, /V5: /);
});
