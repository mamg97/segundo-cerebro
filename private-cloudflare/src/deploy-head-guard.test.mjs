import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../../.github/workflows/deploy-private-cloudflare.yml", import.meta.url), "utf8");

test("production deploy validates current main or equivalent deployment inputs", () => {
  assert.match(workflow, /name: Confirm deployment run is current main/);
  assert.match(workflow, /git fetch origin main --depth=1/);
  assert.match(workflow, /if \[\[ "\$GITHUB_SHA" == "\$latest" \]\]/);
  const guardedDeploys = workflow.match(/if: steps\.cloudflare\.outputs\.configured == 'true' && steps\.head\.outputs\.current == 'true'/g) || [];
  assert.equal(guardedDeploys.length, 8);
  assert.match(workflow, /name: Require D1 migration credentials[\s\S]*steps\.head\.outputs\.current == 'true'/);
  assert.match(workflow, /name: Apply D1 migrations[\s\S]*steps\.head\.outputs\.current == 'true'/);
  assert.match(workflow, /git diff --quiet "\$GITHUB_SHA" "\$latest" -- "\$\{relevant\[@\]\}"/);
  assert.match(workflow, /Newer main has no deployment-relevant changes/);
  assert.match(workflow, /relevant=\([\s\S]*app\/ core\/ private-cloudflare\/ objects-chatgpt-bridge\//);
  assert.match(workflow, /name: Fail if deployment credentials are absent[\s\S]*exit 1/);
  assert.match(workflow, /name: Fail on stale deployment source[\s\S]*exit 1/);
  assert.doesNotMatch(workflow, /name: Explain stale deployment skip/);
});
