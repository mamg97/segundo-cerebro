// Short-lived, isolate-local cache for the private read-only banking workspace.
// It avoids requesting the same canonical Sheets ranges twice as Chromium
// checks the source and the app independently. Never caches failures or
// stores private records in Cache API, disk, logs or durable storage.
export function createFinanceBankWorkspaceCache(load, {
  ttlMs = 30_000,
  now = () => Date.now()
} = {}) {
  let current = null;
  return async (env) => {
    const sheetId = String(env?.FINANCE_SHEET_ID || "").trim();
    if (!sheetId) return load(env);
    if (current?.sheetId === sheetId) {
      if (current.pending) return current.pending;
      if (current.value && current.expiresAt > now()) return current.value;
    }
    const entry = {
      sheetId,
      pending: Promise.resolve().then(() => load(env)),
      value: null,
      expiresAt: 0
    };
    current = entry;
    try {
      const workspace = await entry.pending;
      if (current === entry) {
        entry.value = workspace;
        entry.expiresAt = now() + ttlMs;
        entry.pending = null;
      }
      return workspace;
    } catch (error) {
      if (current === entry) current = null;
      throw error;
    }
  };
}
