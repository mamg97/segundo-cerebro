import assert from "node:assert/strict";
import test from "node:test";
import { cloneProxyHeaders, validateAuditClaims } from "./web-audit-gateway.js";

const now = Date.parse("2026-09-30T21:00:00Z");
const epoch = Math.floor(now / 1000);
const valid = {
  iss: "https://token.actions.githubusercontent.com",
  aud: "segundo-cerebro-web-audit",
  repository: "mamg97/segundo-cerebro",
  ref: "refs/heads/main",
  workflow_ref: "mamg97/segundo-cerebro/.github/workflows/web-audit.yml@refs/heads/main",
  event_name: "schedule",
  iat: epoch - 10,
  exp: epoch + 300,
  run_id: "123456789"
};

test("accepts the exact scheduled audit workflow", () => {
  assert.equal(validateAuditClaims(valid, now), true);
});

test("accepts post-deploy workflow runs", () => {
  assert.equal(validateAuditClaims({ ...valid, event_name: "workflow_run" }, now), true);
});

test("accepts manual dispatch of the same workflow", () => {
  assert.equal(validateAuditClaims({ ...valid, event_name: "workflow_dispatch" }, now), true);
});

for (const [name, mutation] of [
  ["wrong repository", { repository: "mamg97/other" }],
  ["wrong ref", { ref: "refs/heads/feature" }],
  ["wrong workflow", { workflow_ref: "mamg97/segundo-cerebro/.github/workflows/other.yml@refs/heads/main" }],
  ["push event", { event_name: "push" }],
  ["wrong audience", { aud: "something-else" }],
  ["expired token", { exp: epoch - 1 }]
]) {
  test("rejects " + name, () => {
    assert.equal(validateAuditClaims({ ...valid, ...mutation }, now), false);
  });
}


test("proxy strips caller credentials and injects only synthetic read identity", () => {
  const headers = cloneProxyHeaders(new Headers({
    authorization: "Bearer should-not-forward",
    cookie: "private-cookie=1",
    "cf-access-authenticated-user-email": "spoofed@example.com"
  }));
  assert.equal(headers.has("authorization"), false);
  assert.equal(headers.has("cookie"), false);
  assert.equal(headers.get("cf-access-authenticated-user-email"), "audit@github-actions.invalid");
  assert.equal(headers.get("X-Segundo-Cerebro-Audit"), "github-actions");
});

test("audit proxy hints only successful canonical private immutable images and stays no-store", async () => {
  const { secureProxyResponse } = await import("./web-audit-gateway.js");
  const { AUDIT_IMMUTABLE_IMAGE_HINT: hint } = await import("./audit-private-image-policy.js");
  const origin = "https://audit-private.example";
  const path = origin + "/api/objects/look/synthetic-look/image?v=12345678";
  const privateImage = () => new Response(new Uint8Array([1, 2]), {
    status: 200, headers: {
      "content-type": "image/webp",
      "cache-control": "private, max-age=31536000, immutable"
    }
  });
  const accepted = secureProxyResponse(privateImage(), origin, path);
  assert.equal(accepted.headers.get("cache-control"), "no-store");
  assert.equal(accepted.headers.get(hint), "1");
  for (const [name, response, uri, method] of [
    ["non-image", new Response("{}", { headers: { "content-type": "application/json", "cache-control": "private, immutable", [hint]: "1" } }), path, "GET"],
    ["unversioned", privateImage(), origin + "/api/objects/look/synthetic-look/image", "GET"],
    ["noncanonical", privateImage(), origin + "/api/state?v=12345678", "GET"],
    ["foreign", privateImage(), "https://foreign.example/api/objects/look/synthetic-look/image?v=12345678", "GET"],
    ["head", privateImage(), path, "HEAD"],
    ["502", new Response("{}", { status: 502, headers: { "content-type": "image/webp", "cache-control": "private, immutable", [hint]: "1" } }), path, "GET"],
    ["source-no-store", new Response(new Uint8Array([1]), { headers: { "content-type": "image/webp", "cache-control": "no-store", [hint]: "1" } }), path, "GET"]
  ]) {
    const result = secureProxyResponse(response, origin, uri, method);
    assert.equal(result.headers.get("cache-control"), "no-store", name);
    assert.equal(result.headers.has(hint), false, name);
  }
});
