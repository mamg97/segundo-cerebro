import test from "node:test";
import assert from "node:assert/strict";
import {
  validVisionDate,
  parseVisionSphere,
  nextVisionReplacementDate,
  validateVisionProfile
} from "./vision.js";

test("monthly replacements use calendar months and clamp short months", () => {
  assert.equal(nextVisionReplacementDate("2030-01-31"), "2030-02-28");
  assert.equal(nextVisionReplacementDate("2028-01-31"), "2028-02-29");
  assert.equal(nextVisionReplacementDate("2030-12-15"), "2031-01-15");
  assert.equal(nextVisionReplacementDate("2030-01-15", 3), "2030-04-15");
  assert.equal(nextVisionReplacementDate(null), null);
});

test("date validation rejects impossible or ambiguous dates", () => {
  assert.equal(validVisionDate("2030-02-29"), false);
  assert.equal(validVisionDate("2028-02-29"), true);
  assert.equal(validVisionDate("2030-13-01"), false);
  assert.equal(validVisionDate("31/01/2030"), false);
});

test("signed lens sphere is not inferred from an ambiguous voice transcript", () => {
  assert.equal(parseVisionSphere(""), null);
  assert.equal(parseVisionSphere("-4,75"), -4.75);
  assert.equal(parseVisionSphere("+1.50"), 1.5);
  assert.throws(() => parseVisionSphere("dioptrías"), /INVALID_VISION_SPHERE/);
  assert.throws(() => parseVisionSphere("12 de tría"), /INVALID_VISION_SPHERE/);
  assert.throws(() => parseVisionSphere("99"), /INVALID_VISION_SPHERE/);
});

test("private lens profile defaults to monthly replacement without inventing medical data", () => {
  assert.deepEqual(validateVisionProfile({}), {
    rightSphere: null,
    leftSphere: null,
    brand: null,
    model: null,
    replacementMonths: 1,
    lastReplacedOn: null
  });
  assert.throws(() => validateVisionProfile({ replacementMonths: 0 }), /INVALID_VISION_INTERVAL/);
  assert.throws(() => validateVisionProfile({ lastReplacedOn: "not-a-date" }), /INVALID_VISION_DATE/);
});
