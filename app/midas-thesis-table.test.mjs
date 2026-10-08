import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { midasCagrNumber, compareMidasSortValues } from "./midas-thesis-table.js";

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
