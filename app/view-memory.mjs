// Private SPA view retention: memory only, no persistent browser storage or polling.
// A failed or partial revalidation never invalidates the last rendered view.
export function calendarSnapshotComplete(calendarSummary) {
  const source = calendarSummary?.source;
  if (source?.freshness !== "live") return false;
  const providers = Object.values(source.providers || {})
    .filter((provider) => provider && provider.status !== "not-configured");
  return providers.length > 0 && providers.every((provider) => {
    if (!["ok", "ok-cache"].includes(provider.status) || provider.freshness === "fallback") return false;
    const selected = Number(provider.selectedCalendarCount);
    const matched = Number(provider.matchedCalendarCount);
    return !(Number.isFinite(selected) && selected > 0 && Number.isFinite(matched) && matched < selected);
  });
}

export function createOnDemandViewRefresh({
  freshForMs = 5 * 60_000,
  retryAfterMs = 45_000,
  clock = () => Date.now()
} = {}) {
  let lastVerifiedAt = null;
  let retryAt = 0;
  let inFlight = null;

  function markVerified() {
    lastVerifiedAt = clock();
    retryAt = 0;
  }
  function shouldRefresh({ hasData = true, force = false } = {}) {
    if (force) return true;
    if (clock() < retryAt) return false;
    return !hasData || lastVerifiedAt === null || clock() - lastVerifiedAt >= freshForMs;
  }
  function activate({ hasData = true, force = false, load, apply } = {}) {
    if (inFlight) return inFlight;
    if (!shouldRefresh({ hasData, force })) return Promise.resolve({ status: "cached" });
    // Only a navigation or an explicit refresh reaches this path.
    // No interval, timeout-driven fetch or global cache of private payloads.
    inFlight = (async () => {
      try {
        const payload = await load();
        const verified = await apply(payload);
        if (verified) {
          markVerified();
          return { status: "verified" };
        }
        retryAt = clock() + retryAfterMs;
        return { status: "partial" };
      } catch {
        retryAt = clock() + retryAfterMs;
        return { status: "failed" };
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  }
  return { markVerified, shouldRefresh, activate };
}


// Lazily loaded detail workspaces cache JSON in this tab only. Errors retain
// the last successful response; in-flight reads are shared and mutations may
// invalidate older requests to prevent stale async responses from winning.
export function createPayloadViewMemory({ freshForMs = 5 * 60_000, clock = () => Date.now() } = {}) {
  let value = null, signature = null, loadedAt = null, generation = 0, pending = null;
  function peek() { return value; }
  function isFresh() { return value !== null && loadedAt !== null && clock() - loadedAt < freshForMs; }
  function invalidate() { loadedAt = null; generation++; }
  function remember(next) {
    if (!next || typeof next !== "object" || next.ok === false || next.status === "error" || next.source?.available === false) throw new Error("INVALID_VIEW_RESPONSE");
    const text = JSON.stringify(next);
    const changed = text !== signature;
    value = next;
    signature = text;
    loadedAt = clock();
    generation++;
    return { status: changed ? "updated" : "unchanged", value, changed };
  }
  function refresh(read) {
    if (pending) return pending;
    if (isFresh()) return Promise.resolve({ status: "cached", value, changed: false });
    const revision = generation;
    pending = (async () => {
      try {
        const next = await read();
        if (revision !== generation) return { status: "superseded", value, changed: false };
        return remember(next);
      } catch {
        return { status: value ? "stale" : "failed", value, changed: false };
      } finally { pending = null; }
    })();
    return pending;
  }
  return { peek, isFresh, remember, invalidate, refresh };
}
