import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../../.github/workflows/deploy-private-cloudflare.yml", import.meta.url), "utf8");

test("production deploy only runs for the current main HEAD", () => {
  assert.match(workflow, /name: Confirm deployment run is current main/);
  assert.match(workflow, /git fetch origin main --depth=1/);
  assert.match(workflow, /if \[\[ "\$GITHUB_SHA" == "\$latest" \]\]/);
  const guardedDeploys = workflow.match(/if: steps\.cloudflare\.outputs\.configured == 'true' && steps\.head\.outputs\.current == 'true'/g) || [];
  assert.equal(guardedDeploys.length, 8);
  assert.match(workflow, /name: Require D1 migration credentials[\s\S]*steps\.head\.outputs\.current == 'true'/);
  assert.match(workflow, /name: Apply D1 migrations[\s\S]*steps\.head\.outputs\.current == 'true'/);
  assert.match(workflow, /Explain stale deployment skip/);
});
