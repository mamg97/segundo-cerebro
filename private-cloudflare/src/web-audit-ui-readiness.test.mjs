import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../scripts/web-audit.mjs", import.meta.url), "utf8");

test("visual wardrobe audit waits for actual asynchronous grid and still fails if absent", () => {
  assert.match(source, /grid\.waitFor\(\{ state: "visible", timeout: 10000 \}\)/);
  assert.match(source, /grid\.waitFor\(\{ state: "visible", timeout: 8000 \}\)/);
  assert.match(source, /fail\(`Visual \$\{label\} · grid Armario visible`/);
  assert.match(source, /layout\.columns === expectedColumns/);
});

test("visual Looks audit permits one recovery but requires real visible tab", () => {
  assert.match(source, /probeApi\("\/api\/objects", `Looks \$\{label\}`, \{ attempts: 1 \}\)/);
  assert.match(source, /fail\(`Visual \$\{label\} · Looks disponible`/);
  assert.match(source, /tab\.waitFor\(\{ state: "visible", timeout: 8000 \}\)/);
});
