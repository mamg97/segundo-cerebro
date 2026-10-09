// Short-lived GitHub Actions OIDC JWTs must not be reused for an entire
// long-running browser audit. Refresh before expiry; never log raw tokens,
// audience claims or GitHub OIDC response bodies.
export function tokenExpiryMs(jwt) {
  try {
    const parts = String(jwt || "").split(".");
    if (parts.length !== 3) return 0;
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const seconds = Number(claims?.exp);
    return Number.isSafeInteger(seconds) && seconds > 0 ? seconds * 1000 : 0;
  } catch {
    return 0;
  }
}

export function createAuditOidcTokenProvider({
  initialToken,
  requestUrl,
  requestToken,
  fetcher = fetch,
  now = Date.now,
  audience = "segundo-cerebro-web-audit"
}) {
  let token = String(initialToken || "");
  let refreshPending = null;
  const safetyMarginMs = 75_000;

  async function refresh() {
    if (!requestUrl || !requestToken) throw new Error("AUDIT_OIDC_REFRESH_UNAVAILABLE");
    try {
      const endpoint = new URL(requestUrl);
      endpoint.searchParams.set("audience", audience);
      const response = await fetcher(endpoint.toString(), {
        headers: {
          Authorization: "bearer " + requestToken,
          Accept: "application/json"
        }
      });
      if (!response.ok) throw new Error("INVALID_OIDC_RESPONSE");
      const body = await response.json();
      const value = String(body?.value || "");
      if (!value || tokenExpiryMs(value) <= now() + safetyMarginMs) {
        throw new Error("INVALID_OIDC_EXPIRY");
      }
      token = value;
      return token;
    } catch {
      // Caller/audit may mark the affected requests as failed, but secrets
      // and potentially identifying upstream messages never reach Actions logs.
      throw new Error("AUDIT_OIDC_REFRESH_FAILED");
    }
  }

  return async function getAuditToken() {
    if (token && tokenExpiryMs(token) > now() + safetyMarginMs) return token;
    if (!refreshPending) {
      refreshPending = refresh().finally(() => { refreshPending = null; });
    }
    return refreshPending;
  };
}
