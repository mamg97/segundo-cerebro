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

export async function registerPrivatePwa({ nav = navigator } = {}) {
  if (!("serviceWorker" in nav)) return false;
  try {
    const registration = await nav.serviceWorker.register("./pwa-sw.js", {
      scope: "./",
      updateViaCache: "none"
    });
    // New releases replace the static cache; never persist private API payloads.
    await registration.update();
    return true;
  } catch {
    // Supported browsers continue without PWA; do not interrupt the app.
    return false;
  }
}

if (typeof window !== "undefined" && globalThis.__SECOND_BRAIN_REMOTE__ === true) {
  const start = () => {
    installVisibleRefresh();
    void registerPrivatePwa();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
