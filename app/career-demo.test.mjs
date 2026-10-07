import test from "node:test";
import assert from "node:assert/strict";
import { CAREER_DEMO, renderCareer } from "./career.js";

test("Career demo never exposes plausible salary figures", () => {
  assert.equal(CAREER_DEMO.summary.fixedSalary, null);
  for (const item of CAREER_DEMO.compensation) {
    assert.equal(item.min, null);
    assert.equal(item.mid, null);
    assert.equal(item.max, null);
  }
  for (const item of CAREER_DEMO.opportunities) {
    assert.equal(item.compensation.min, null);
    assert.equal(item.compensation.mid, null);
    assert.equal(item.compensation.max, null);
  }

  const html = renderCareer(CAREER_DEMO);
  assert.match(html, /Fijo actual/);
  assert.match(html, /Dato oculto/);
  assert.match(html, /Rango oculto/);
  assert.doesNotMatch(html, /42\.000|48\.000|50\.000|52\.000/);
});

test("Career private rendering still shows a confirmed real fixed salary", () => {
  const data = structuredClone(CAREER_DEMO);
  data.source = { kind: "private-sheet", name: "Private" };
  data.summary.fixedSalary = 38600;
  data.compensation = [{
    id: "current",
    label: "Situación actual",
    min: 38600,
    mid: 38600,
    max: 38600,
    status: "confirmed",
    interpretation: "Fijo confirmado"
  }];
  const html = renderCareer(data);
  assert.match(html, /38\.600/);
  assert.match(html, /Confirmado/);
});
