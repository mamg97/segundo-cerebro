import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// A narrow retry is justified only for transient errors from Cloudflare's
// deployment control plane. The final exit code stays nonzero on failures.
const CONFIGS = new Set([
  "wrangler.bootstrap.jsonc",
  "wrangler.health-ingest.jsonc",
  "wrangler.objects-ingest.jsonc",
  "wrangler.midas-ingest.jsonc",
  "wrangler.shopping-reminders.jsonc",
  "wrangler.web-audit.jsonc"
]);

export function deploymentErrorClass(status, output = "") {
  if (status === 0) return "OK";
  const raw = String(output || "");
  const gateway = raw.match(/\s->\s(502|503|504|520|522|524)\b/);
  if (gateway) return "CF_HTTP_" + gateway[1];
  if (/Received a malformed response from the API/.test(raw) && /\s->\s200 OK/.test(raw)) {
    return "CF_MALFORMED_200";
  }
  if (/\b(?:ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN)\b/.test(raw)) return "CF_NETWORK_TRANSIENT";
  const http = raw.match(/\s->\s([45]\d\d)\b/);
  return http ? "CF_HTTP_" + http[1] : "DEPLOY_COMMAND_FAILED";
}

export function shouldRetryDeploy(errorClass, attempt) {
  return attempt === 1 && (
    ["CF_HTTP_502", "CF_HTTP_503", "CF_HTTP_504", "CF_HTTP_520", "CF_HTTP_522",
      "CF_HTTP_524", "CF_MALFORMED_200", "CF_NETWORK_TRANSIENT"].includes(errorClass)
  );
}

async function main() {
  const config = process.argv[2];
  if (!CONFIGS.has(config) || process.argv.length !== 3) {
    process.stderr.write("DEPLOY_INVALID_CONFIG\n");
    process.exitCode = 2;
    return;
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    const execution = spawnSync("npx", ["--no-install", "wrangler", "deploy", "--config", config], {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      env: process.env,
      encoding: "utf8",
      maxBuffer: 3 * 1024 * 1024,
      timeout: 150000
    });
    const output = String(execution.stdout || "") + "\n" +
      String(execution.stderr || "") + "\n" + String(execution.error?.code || "");
    const errorClass = deploymentErrorClass(execution.status, output);
    if (execution.status === 0 && !execution.error) {
      process.stdout.write("DEPLOY_OK config=" + config + " attempt=" + attempt + "\n");
      return;
    }
    const retry = shouldRetryDeploy(errorClass, attempt);
    process.stderr.write((retry ? "DEPLOY_RETRY" : "DEPLOY_FAILED") +
      " config=" + config + " attempt=" + attempt + " reason=" + errorClass + "\n");
    // No raw provider response: it can include account identifiers, URLs or
    // credentials. Only fixed error codes enter this public Actions log.
    if (!retry) {
      process.exitCode = 1;
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(() => {
    process.stderr.write("DEPLOY_WRAPPER_FAILED\n");
    process.exitCode = 1;
  });
}
