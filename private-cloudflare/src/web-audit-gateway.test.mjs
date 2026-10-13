import assert from "node:assert/strict";
import test from "node:test";
import { cloneProxyHeaders, createAuditJwksKeyResolver, proxyAuditUpstream, validateAuditClaims, verifyAuditOidc } from "./web-audit-gateway.js";

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

test("gateway passes upstream success and real upstream HTTP failures unchanged", async () => {
  const origin = "https://audit-private.example";
  const requestUrl = origin + "/api/objects/look/synthetic-look/image?v=12345678";
  for (const status of [200, 404, 502]) {
    const env = { SEGUNDO_CEREBRO: { fetch: async () => new Response("synthetic", { status }) } };
    const result = await proxyAuditUpstream(env, new Request("https://segundo-cerebro.internal/"), origin, requestUrl);
    assert.equal(result.status, status);
    assert.equal(await result.text(), "synthetic");
    assert.equal(result.headers.get("cache-control"), "no-store");
  }
});

test("gateway distinguishes Service Binding throw without logging exception or URL", async () => {
  const env = { SEGUNDO_CEREBRO: { fetch: async () => { throw new Error("private user id / token / path"); } } };
  const result = await proxyAuditUpstream(env, new Request("https://segundo-cerebro.internal/"), "https://audit-private.example", "https://audit-private.example/api/objects/look/synthetic-look/image?v=12345678");
  assert.equal(result.status, 502);
  assert.deepEqual(await result.json(), {
    ok: false, code: "AUDIT_GATEWAY_UPSTREAM_FAILED", diagnostic: "AUDIT_GATEWAY_BINDING_FETCH_FAILED"
  });
  assert.equal(result.headers.get("cache-control"), "no-store");
});

test("gateway distinguishes proxy response construction throw without exposing error", async () => {
  const env = { SEGUNDO_CEREBRO: { fetch: async () => ({
    get headers() { throw new Error("sensitive value or private URL"); }
  }) } };
  const result = await proxyAuditUpstream(env, new Request("https://segundo-cerebro.internal/"), "https://audit-private.example", "https://audit-private.example/api/objects/look/synthetic-look/image?v=12345678");
  assert.equal(result.status, 502);
  assert.deepEqual(await result.json(), {
    ok: false, code: "AUDIT_GATEWAY_UPSTREAM_FAILED", diagnostic: "AUDIT_GATEWAY_RESPONSE_FAILED"
  });
});

async function syntheticAuditJwt(kid, claims, signingKey) {
  const enc = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = enc({ alg: "RS256", kid }) + "." + enc(claims);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", signingKey, new TextEncoder().encode(unsigned));
  return unsigned + "." + Buffer.from(signature).toString("base64url");
}

async function syntheticJwksKey(kid) {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true, ["sign", "verify"]
  );
  return { privateKey: pair.privateKey, publicJwk: { ...(await crypto.subtle.exportKey("jwk", pair.publicKey)), kid, use: "sig" } };
}

test("OIDC verifies each signed request but fetches public JWKS only once for repeated tokens", async () => {
  const key = await syntheticJwksKey("synthetic-key-1");
  const jwt = await syntheticAuditJwt("synthetic-key-1", valid, key.privateKey);
  let fetched = 0;
  const fetcher = async () => {
    fetched++;
    return Response.json({ keys: [key.publicJwk] });
  };
  assert.ok(await verifyAuditOidc(jwt, fetcher, now));
  assert.ok(await verifyAuditOidc(jwt, fetcher, now));
  assert.equal(fetched, 1, "same public key must be reused across independently verified requests");

  const tamperedClaims = { ...valid, repository: "unauthorized/other" };
  assert.equal(await verifyAuditOidc(await syntheticAuditJwt("synthetic-key-1", tamperedClaims, key.privateKey), fetcher, now), null);
  assert.equal(fetched, 1, "invalid claims must be rejected before JWKS access");

  const parts = jwt.split(".");
  const forgedJwt = parts[0] + "." + parts[1] + "." + Buffer.from(new Uint8Array(256).fill(1)).toString("base64url");
  assert.equal(await verifyAuditOidc(forgedJwt, fetcher, now), null);
  assert.equal(fetched, 1, "failed signature is never accepted or re-fetched to turn green");
});

test("simultaneous first-time JWKS key resolutions share one remote fetch", async () => {
  const key = await syntheticJwksKey("synthetic-key-2");
  let requested = 0;
  const resolver = createAuditJwksKeyResolver(async () => {
    requested++;
    await Promise.resolve();
    return Response.json({ keys: [key.publicJwk] });
  });
  const results = await Promise.all(Array.from({ length: 24 }, () => resolver("synthetic-key-2", now)));
  assert.equal(requested, 1);
  assert.ok(results.every(Boolean));
});

test("public JWKS cache expires and supports key rotation without caching tokens", async () => {
  const oldKey = await syntheticJwksKey("synthetic-key-old");
  const newKey = await syntheticJwksKey("synthetic-key-new");
  let requested = 0;
  let version = 0;
  const resolver = createAuditJwksKeyResolver(async () => {
    requested++;
    return Response.json({ keys: [version === 0 ? oldKey.publicJwk : newKey.publicJwk] });
  });
  assert.ok(await resolver("synthetic-key-old", now));
  version = 1;
  assert.ok(await resolver("synthetic-key-new", now + 6000), "a new kid triggers a bounded refresh");
  assert.equal(await resolver("synthetic-key-old", now + 6001), null, "replaced keys must not remain authorized");
  assert.equal(requested, 2, "unknown kid misses should be bounded");

  assert.ok(await resolver("synthetic-key-new", now + 307000));
  assert.equal(requested, 3, "refresh after the five-minute public-key TTL");
});

test("JWKS lookup fails closed for untrusted responses and throttles missing keys", async () => {
  let requested = 0;
  const resolver = createAuditJwksKeyResolver(async () => {
    requested++;
    return Response.json({ keys: [{ kid: "synthetic-invalid", kty: "oct", use: "sig" }] });
  });
  assert.equal(await resolver("synthetic-invalid", now), null);
  assert.equal(await resolver("synthetic-invalid", now + 1000), null);
  assert.equal(requested, 1, "network failures/invalid JWKS do not cause one lookup per asset");
  assert.equal(await resolver("synthetic-invalid", now + 6000), null);
  assert.equal(requested, 2, "recovery can retry without accepting invalid keys");
});
