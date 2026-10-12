import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { deploymentErrorClass, shouldRetryDeploy } from "./deploy-wrangler-retry.mjs";

test("retries Cloudflare's known transient 5xx and malformed 200 once", () => {
  for (const status of ["502", "503", "504", "520", "522", "524"]) {
    const code = deploymentErrorClass(1, "POST /accounts/private/scripts/a -> " + status + " Gateway Timeout");
    assert.equal(code, "CF_HTTP_" + status);
    assert.equal(shouldRetryDeploy(code, 1), true);
    assert.equal(shouldRetryDeploy(code, 2), false);
  }
  assert.equal(
    deploymentErrorClass(1, "Received a malformed response from the API\nGET /accounts/x/deployments -> 200 OK"),
    "CF_MALFORMED_200"
  );
  assert.equal(shouldRetryDeploy("CF_MALFORMED_200", 1), true);
});

test("credential, configuration and unknown failures remain terminal", () => {
  assert.equal(deploymentErrorClass(0, ""), "OK");
  for (const content of [
    "POST /accounts/x/workers/scripts/a/versions -> 403 Forbidden",
    "POST /accounts/x/workers/scripts/a/versions -> 401 Unauthorized",
    "ERROR: Invalid wrangler configuration"
  ]) {
    const code = deploymentErrorClass(1, content);
    assert.equal(shouldRetryDeploy(code, 1), false);
  }
  assert.equal(shouldRetryDeploy("CF_NETWORK_TRANSIENT", 1), true);
  assert.equal(shouldRetryDeploy("CF_NETWORK_TRANSIENT", 2), false);
});

test("invalid config fails before spawning network requests", () => {
  const child = spawnSync(process.execPath,
    [new URL("./deploy-wrangler-retry.mjs", import.meta.url).pathname, "../secrets.txt"],
    { encoding: "utf8", timeout: 5000 }
  );
  assert.equal(child.status, 2);
  assert.match(child.stderr, /DEPLOY_INVALID_CONFIG/);
  assert.doesNotMatch(child.stderr, /secrets\.txt/);
});

test("deployment retry script emits only fixed classification, no raw response", () => {
  const code = readFileSync(new URL("./deploy-wrangler-retry.mjs", import.meta.url), "utf8");
  assert.match(code, /attempt <= 2/);
  assert.match(code, /DEPLOY_FAILED/);
  assert.match(code, /DEPLOY_RETRY/);
  assert.doesNotMatch(code, /process\.(?:stdout|stderr)\.write\([^\n]*execution\.(?:stdout|stderr)/);
});
