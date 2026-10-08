import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { midasCagrNumber, compareMidasSortValues } from "./midas-thesis-table.js";

const appSource = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");

test("MIDAS: parse Unicode minus and European CAGR without losing MSFT", () => {
  assert.equal(midasCagrNumber("−1,22%"), -1.22);
  assert.equal(midasCagrNumber("-1,25%"), -1.25);
  assert.equal(midasCagrNumber("+15,48%"), 15.48);
  assert.equal(midasCagrNumber("0,00 %"), 0);
  assert.equal(midasCagrNumber("POR ANUNCIAR"), null);
  assert.equal(midasCagrNumber(null), null);
});

test("MIDAS: descending CAGR puts MSFT above PLTR and missing values last", () => {
  const rows = [
    { ticker: "PLTR", cagr: "-1,25%" },
    { ticker: "MSFT", cagr: "−1,22%" },
    { ticker: "ADBE", cagr: "+15,48%" },
    { ticker: "UNKNOWN", cagr: null }
  ];
  rows.sort((a,b) => compareMidasSortValues(midasCagrNumber(a.cagr), midasCagrNumber(b.cagr), {numeric: true, direction: "desc"}));
  assert.deepEqual(rows.map(row => row.ticker), ["ADBE","MSFT","PLTR","UNKNOWN"]);
});

test("MIDAS: asc/desc numeric and text comparators are deterministic", () => {
  assert.ok(compareMidasSortValues(100, 20, {numeric:true, direction:"desc"}) < 0);
  assert.ok(compareMidasSortValues(100, 20, {numeric:true, direction:"asc"}) > 0);
  assert.ok(compareMidasSortValues("Microsoft", "Palantir") < 0);
  assert.ok(compareMidasSortValues("", "-1.22", {numeric:true, direction:"desc"}) > 0);
});

test("MIDAS: render hooks expose accessible interactive sort controls", () => {
  assert.match(appSource, /bindMidasResearchSorting\(root\)/);
  assert.match(appSource, /data-midas-sort-key="central"/);
  assert.match(appSource, /aria-sort="descending"/);
  assert.match(appSource, /data-midas-sort-\$\{key\}/);
  assert.match(appSource, /data-midas-thesis-search/);
  assert.match(appSource, /sortAttrs/);
});
