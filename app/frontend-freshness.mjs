// Private SPA release guard: on returning to an old open tab, compare only
// the public app.js content fingerprint. Never inspect or log private state.
const APP_PATH = "/app/app.js";
const CHECK_INTERVAL_MS = 120_000;

export function privateAppRevision(source) {
  if (!source || typeof source !== "string") return null;
  try {
    const url = new URL(source, "https://private-app.invalid/app/");
    const revision = url.searchParams.get("v");
    return url.pathname === APP_PATH && /^[0-9a-f]{16}$/.test(revision || "")
      ? revision : null;
  } catch {
    return null;
  }
}

export function privateAppRevisionFromHtml(html) {
  if (!html || typeof html !== "string") return null;
  for (const match of html.matchAll(/<script\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\btype\s*=\s*["']module["']/i.test(tag)) continue;
    const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    const revision = privateAppRevision(src);
    if (revision) return revision;
  }
  return null;
}

export function safeToReloadFrontend({ dirty = false, dialogOpen = false, editing = false } = {}) {
  return !dirty && !dialogOpen && !editing;
}

function showPrivateAppUpdateNotice() {
  if (document.querySelector("[data-private-app-update]")) return;
  const notice = document.createElement("aside");
  notice.className = "private-app-update-notice";
  notice.dataset.privateAppUpdate = "available";
  notice.setAttribute("role", "status");
  const message = document.createElement("span");
  message.textContent = "Hay una versión nueva de Segundo Cerebro.";
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Actualizar página";
  button.addEventListener("click", () => window.location.reload());
  notice.append(message, button);
  document.body.append(notice);
}

export function installPrivateAppFreshnessGuard() {
  // Only the authenticated remote app needs a release handshake; no polling.
  if (globalThis.__SECOND_BRAIN_REMOTE__ !== true) return;
  const script = document.querySelector('script[type="module"][src*="app.js"]');
  const current = privateAppRevision(script?.getAttribute("src"));
  if (!current) return;
  document.documentElement.dataset.privateFrontendRevision = current;

  let lastCheck = Date.now();
  let inFlight = false;
  let updateDetected = false;
  let dirtyInput = false;

  document.addEventListener("input", (event) => {
    if (event.target?.matches?.("input, textarea, select, [contenteditable]")) dirtyInput = true;
  }, true);
  document.addEventListener("change", (event) => {
    if (event.target?.matches?.("input, textarea, select, [contenteditable]")) dirtyInput = true;
  }, true);

  async function checkFreshness(force = false) {
    if (document.visibilityState === "hidden" || inFlight || updateDetected) return;
    const now = Date.now();
    if (!force && now - lastCheck < CHECK_INTERVAL_MS) return;
    lastCheck = now;
    inFlight = true;
    const abort = new AbortController();
    const timeout = window.setTimeout(() => abort.abort(), 8000);
    try {
      const response = await fetch("/app/", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "text/html" },
        signal: abort.signal
      });
      if (!response.ok || !/\btext\/html\b/i.test(response.headers.get("Content-Type") || "")) return;
      const latest = privateAppRevisionFromHtml(await response.text());
      if (!latest || latest === current) return; // Includes Access/SSO HTML: never loop.
      updateDetected = true;
      const editing = document.activeElement?.matches?.("input, textarea, select, [contenteditable]") || false;
      if (safeToReloadFrontend({
        dirty: dirtyInput,
        editing,
        dialogOpen: Boolean(document.querySelector("dialog[open]"))
      })) {
        window.location.reload();
      } else {
        showPrivateAppUpdateNotice();
      }
    } catch {
      // Offline or temporary Access/network failure: retain the usable UI.
    } finally {
      window.clearTimeout(timeout);
      inFlight = false;
    }
  }

  window.addEventListener("focus", () => { void checkFreshness(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkFreshness();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) void checkFreshness(true); // Back-forward cache restoration.
  });
}
