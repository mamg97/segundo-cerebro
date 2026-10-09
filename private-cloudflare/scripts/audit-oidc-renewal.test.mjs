import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { createAuditOidcTokenProvider, tokenExpiryMs } from "./audit-oidc-renewal.mjs";

const now = 1_800_000_000_000;
const jwt = (expiresAt) => [
  Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ exp: Math.floor(expiresAt / 1000) })).toString("base64url"),
  "signature"
].join(".");

test("long-running audit refreshes before expiry and does not repeat unnecessary fetches", async () => {
  const old = jwt(now + 30_000);
  const fresh = jwt(now + 300_000);
  let requests = 0;
  const get = createAuditOidcTokenProvider({
    initialToken: old, requestUrl: "https://example.invalid/oidc", requestToken: "secret",
    now: () => now,
    fetcher: async (url, opts) => {
      requests++;
      assert.equal(new URL(url).searchParams.get("audience"), "segundo-cerebro-web-audit");
      assert.equal(opts.headers.Authorization, "bearer secret");
      return { ok: true, json: async () => ({ value: fresh }) };
    }
  });
  assert.deepEqual(await Promise.all([get(), get(), get()]), [fresh, fresh, fresh]);
  assert.equal(await get(), fresh);
  assert.equal(requests, 1);
  assert.equal(tokenExpiryMs(fresh), now + 300_000);
});

test("existing unexpired token does not contact GitHub", async () => {
  const valid = jwt(now + 200_000);
  const get = createAuditOidcTokenProvider({
    initialToken: valid, requestUrl: "", requestToken: "", now: () => now,
    fetcher: async () => { throw new Error("should not fetch"); }
  });
  assert.equal(await get(), valid);
});

test("failed refresh is fail-closed and never leaks bearer token, URL or response", async () => {
  const get = createAuditOidcTokenProvider({
    initialToken: jwt(now - 10_000), requestUrl: "https://example.invalid/private",
    requestToken: "very-private-oidc-token", now: () => now,
    fetcher: async () => { throw new Error("token-bearing upstream diagnostics"); }
  });
  await assert.rejects(get(), (error) => {
    assert.equal(error.message, "AUDIT_OIDC_REFRESH_FAILED");
    assert.equal(error.message.includes("private"), false);
    return true;
  });
});

test("production browser routes every request through token refresh provider", () => {
  const source = fs.readFileSync(new URL("./web-audit.mjs", import.meta.url), "utf8");
  assert.match(source, /const freshToken = await getAuditToken\(\)/);
  assert.match(source, /authorization: `Bearer \$\{freshToken\}`/);
  assert.doesNotMatch(source, /authorization: `Bearer \$\{token\}`/);
});
