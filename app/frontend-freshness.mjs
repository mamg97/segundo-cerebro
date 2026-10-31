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

// A modal dialog lives in the browser's top layer. An update banner placed
// only on document.body would be invisible and unclickable behind it.
export function privateUpdateNoticeHost(doc) {
  return doc.querySelector("dialog[open]") || doc.body;
}
function showPrivateAppUpdateNotice({confirmDiscard=false}={}) {
  let notice=document.querySelector("[data-private-app-update]");
  if(notice){
    privateUpdateNoticeHost(document).append(notice);
    return;
  }
  notice = document.createElement("aside");
  notice.className = "private-app-update-notice";
  notice.dataset.privateAppUpdate = "available";
  notice.setAttribute("role", "status");
  const message = document.createElement("span");
  message.textContent = "Hay una versión nueva de Segundo Cerebro. Recarga la página para ver la nueva interfaz (no solo los datos).";
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Cargar versión nueva";
  button.addEventListener("click", () => {
    if(confirmDiscard&&!window.confirm("Hay datos que podrían estar sin guardar. ¿Cargar la nueva versión y descartar lo no guardado?"))return;
    window.location.reload();
  });
  notice.append(message, button);
  privateUpdateNoticeHost(document).append(notice);
}

export function installPrivateAppFreshnessGuard() {
  // Only the authenticated remote app needs a release handshake; no polling.
  if (globalThis.__SECOND_BRAIN_REMOTE__ !== true) return;
  const script = document.querySelector('script[type="module"][src*="app.js"]');
  const current = privateAppRevision(script?.getAttribute("src"));
  if (!current) return;
  document.documentElement.dataset.privateFrontendRevision = current;

  // Compare immediately on the first foreground resume, even after short iOS suspensions.
  let lastCheck = 0;
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
        showPrivateAppUpdateNotice({confirmDiscard:dirtyInput||Boolean(editing)});
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
  // Explicit data refresh must also check the *code* version. This is how
  // a long-lived Boda dialog immediately discovers new deploys.
  document.addEventListener("click", (event) => {
    if(event.target?.closest?.("#refresh-app, #desktop-area-refresh, #wed-main-refresh, #mobile-refresh-action")) {
      void checkFreshness(true);
    }
  }, true);
  // Keep the warning reachable after the user closes an editing dialog.
  document.addEventListener("close", (event) => {
    if(!event.target?.matches?.("dialog"))return;
    const notice=event.target.querySelector("[data-private-app-update]");
    if(notice)document.body.append(notice);
  }, true);
}
