import assert from "node:assert/strict";
import { progressRingMarkup } from "./progress-ring.js";

const quarter = progressRingMarkup(26, { displayPercent: 26, tone: "mint", label: "máx" });
assert.match(quarter, /stroke-dasharray:226\.195/);
assert.match(quarter, /stroke-dashoffset:167\.384/);
assert.doesNotMatch(quarter, /stroke-dashoffset:0(?:\.0+)?(?:;|")/);

const full = progressRingMarkup(100, { displayPercent: 100, tone: "mint" });
assert.match(full, /stroke-dashoffset:0\.000/);

const overflow = progressRingMarkup(100, { displayPercent: 178, tone: "coral" });
assert.match(overflow, /r="44"[^>]*stroke-dashoffset:60\.821/);

console.log("progress-ring geometry OK");
