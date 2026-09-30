import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const files = ["app.js", "pantry.js", "objects.js"];

for (const name of files) {
  test(name + " does not emit or mutate inline styles under style-src self", () => {
    const source = readFileSync(new URL("./" + name, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\bstyle\s*=\s*["']/i);
    assert.doesNotMatch(source, /\.style(?:\.|\[|\s*=)/);
  });
}
