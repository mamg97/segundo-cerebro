import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pantry = await readFile(new URL("./pantry.js", import.meta.url), "utf8");
const audit = await readFile(new URL("../private-cloudflare/scripts/web-audit.mjs", import.meta.url), "utf8");

test("Pantry UI retries transient server failures before showing an error", () => {
  assert.match(pantry, /fetchPantryPayload\(\{ attempts = 3, waitMs = 450 \} = \{\}\)/);
  assert.match(pantry, /response\.status < 500 \|\| attempt === attempts/);
  assert.match(pantry, /renderWorkspace\(await fetchPantryPayload\(\), initialView\)/);
});

test("web audit reconciles transient failures again after UI revalidation", () => {
  const block = audit.match(/await reconcileTransientSourceFailures\(\);[\s\S]{0,600}await resolveDeferredApiChecks\(\);/);
  assert.ok(block, "expected final transient-recovery block");
  const occurrences = (block[0].match(/reconcileTransientSourceFailures/g) || []).length;
  assert.equal(occurrences, 2);
  assert.match(block[0], /await revalidateRecoveredSources\(\);/);
});

test("Pantry backend retries transient Google Sheets reads", async () => {
  const backend = await readFile(new URL("../private-cloudflare/src/pantry.js", import.meta.url), "utf8");
  assert.match(backend, /for \(let attempt = 1; attempt <= 3; attempt \+= 1\)/);
  assert.match(backend, /response\.status !== 429 && response\.status < 500/);
  assert.match(backend, /setTimeout\(resolve, 250 \* attempt\)/);
});
