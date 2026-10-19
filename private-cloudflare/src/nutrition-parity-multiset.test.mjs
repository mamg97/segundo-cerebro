import test from "node:test";
import assert from "node:assert/strict";
import { compareSignatureMultisets } from "../scripts/nutrition-parity-multiset.mjs";

const signature = (row) => row.key;

test("equal multisets remain equal", () => {
  assert.deepEqual(compareSignatureMultisets([{ key: "a" }, { key: "a" }, { key: "b" }],
    [{ key: "b" }, { key: "a" }, { key: "a" }], signature), { lightOnly: 0, fullOnly: 0 });
});

test("duplicate count mismatches are detected even with equal unique signatures", () => {
  assert.deepEqual(compareSignatureMultisets([{ key: "a" }, { key: "a" }, { key: "b" }],
    [{ key: "a" }, { key: "b" }, { key: "b" }], signature), { lightOnly: 1, fullOnly: 1 });
});

test("missing rows are counted by multiplicity", () => {
  assert.deepEqual(compareSignatureMultisets([{ key: "a" }, { key: "a" }],
    [], signature), { lightOnly: 2, fullOnly: 0 });
});
