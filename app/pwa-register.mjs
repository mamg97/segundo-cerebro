// PWA on the private Cloudflare origin only; no personal data enters browser storage.
const REFRESH_INTERVAL_MS = 5 * 60_000;
const QUIET_AFTER_EDIT_MS = 2 * 60_000;

export function dueForVisibleRefresh({
  now, lastRefreshAt, visible, online, editing, dialogOpen, quietUntil, busy
}) {
  return visible && online && !editing && !dialogOpen && !busy &&
    now >= quietUntil && now - lastRefreshAt >= REFRESH_INTERVAL_MS;
}

export function installVisibleRefresh({ win = window, doc = document, clock = Date.now } = {}) {
  let lastRefreshAt = clock();
  let quietUntil = 0;
  const markEdited = (event) => {
    if (event.target?.matches?.("input, textarea, select, [contenteditable]")) {
      quietUntil = clock() + QUIET_AFTER_EDIT_MS;
    }
  };
  doc.addEventListener("input", markEdited, true);
  doc.addEventListener("change", markEdited, true);
  doc.querySelector("#refresh-app")?.addEventListener("click", () => {
    lastRefreshAt = clock(); // Manual refresh resets the periodic clock.
  }, true);

  function check() {
    const button = doc.querySelector("#refresh-app");
    if (!button || !dueForVisibleRefresh({
      now: clock(),
      lastRefreshAt,
      visible: doc.visibilityState === "visible",
      online: win.navigator.onLine !== false,
      editing: Boolean(doc.activeElement?.matches?.("input, textarea, select, [contenteditable]")),
      dialogOpen: Boolean(doc.querySelector("dialog[open]")),
      quietUntil,
      busy: button.disabled
    })) return;
    lastRefreshAt = clock();
    button.click(); // Reuse canonical incremental refresh, never duplicate source logic.
  }

  win.setInterval(check, REFRESH_INTERVAL_MS);
  win.addEventListener("focus", check);
  win.addEventListener("pageshow", check);
  win.addEventListener("online", check);
  doc.addEventListener("visibilitychange", check);
}

// iOS paints any non-layout standalone PWA bottom strip from the page's
// theme-color, not from a fixed navigation element. Keep it in sync with
// the real dock colour, even if the user switches light/dark mode.
export function privateShellThemeColor(theme) {
  return theme === "light" ? "#ffffff" : "#0b1728";
}
export function installPrivateShellTheme({ doc = document, Observer = globalThis.MutationObserver } = {}) {
  const meta = doc.querySelector('meta[name="theme-color"]');
  if (!meta) return null;
  const sync = () => meta.setAttribute("content", privateShellThemeColor(doc.documentElement.dataset.theme));
  sync();
  if (typeof Observer !== "function") return null;
  const observer = new Observer(sync);
  observer.observe(doc.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return observer;
}

export async function registerPrivatePwa({ nav = navigator } = {}) {
  if (!("serviceWorker" in nav)) return false;
  try {
    await nav.serviceWorker.register("./pwa-sw.js", {
      scope: "./",
      updateViaCache: "none"
    });
    // Registration checks updates on navigation; avoid an immediate redundant
    // network request while the authenticated dashboard is still bootstrapping.
    return true;
  } catch {
    // Supported browsers continue without PWA; do not interrupt the app.
    return false;
  }
}

if (typeof window !== "undefined" && globalThis.__SECOND_BRAIN_REMOTE__ === true) {
  const start = () => {
    installVisibleRefresh();
    installPrivateShellTheme();
    void registerPrivatePwa();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
