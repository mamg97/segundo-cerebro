// Independent classic script: catches module-tree failures before app.js can start.
// Never reads or stores private app state. Only handles static asset cache recovery.
(function () {
  "use strict";
  if (globalThis.__SECOND_BRAIN_REMOTE__ !== true) return;

  let notice = null;
  let recovering = false;
  const TIMEOUT_MS = 20_000;

  async function recoverOnce(button = null) {
    if (recovering) return;
    recovering = true;
    if (button) {
      button.disabled = true;
      button.textContent = "Recuperando…";
    }
    // A query marker survives Safari's hard reload, preventing an infinite
    // reload loop even when private mode blocks sessionStorage.
    const next = new URL(location.href);
    next.searchParams.set("segun_reload", String(Date.now()));
    try {
      const clearStaleController = (async () => {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.filter(r => new URL(r.scope).pathname === "/app/")
            .map(r => r.unregister()));
        }
        if ("caches" in window) {
          const names = await caches.keys();
          await Promise.all(names.filter(name => name.startsWith("segun-public-static-"))
            .map(name => caches.delete(name)));
        }
      })();
      // Some iOS WebKit storage operations can stall indefinitely. Reload
      // rather than leave the user stuck at a disabled recovery button.
      await Promise.race([
        clearStaleController,
        new Promise(resolve => window.setTimeout(resolve, 2500))
      ]);
    } catch {
      // Login/network errors do not prevent a cache-busted navigation.
    }
    location.replace(next.href);
  }

  function showNotice() {
    if (notice || document.documentElement.dataset.segunBoot === "ready") return;
    if (!document.body) return;
    notice = document.createElement("aside");
    notice.id = "segun-startup-recovery";
    notice.setAttribute("role", "alert");
    notice.style.cssText = [
      "position:fixed", "z-index:2147483647", "left:12px", "right:12px",
      "top:max(12px,env(safe-area-inset-top))", "padding:15px",
      "background:#12263f", "color:#fff", "border:1px solid #f4a340",
      "border-radius:12px", "font:14px/1.5 system-ui,sans-serif",
      "box-shadow:0 8px 30px #0007"
    ].join(";");
    const title = document.createElement("strong");
    title.textContent = "SEGUN no ha terminado de iniciar.";
    const detail = document.createElement("p");
    detail.style.margin = "6px 0 12px";
    detail.textContent = "La interfaz se ha abierto sin cargar los datos. Reintenta la carga de los archivos; si continúa, comprueba el acceso privado.";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Recuperar conexión";
    button.style.cssText = "padding:9px 14px;border:0;border-radius:8px;color:#07101d;background:#f4a340;font:600 14px system-ui";
    button.addEventListener("click", () => { void recoverOnce(button); });
    notice.append(title, detail, button);
    document.body.prepend(notice);
  }

  window.addEventListener("segun:ready", () => {
    if (notice) { notice.remove(); notice = null; }
  });
  window.addEventListener("segun:boot-failed", showNotice);
  window.setTimeout(() => {
    if (document.documentElement.dataset.segunBoot === "ready") return;
    // First failed startup: self-repair only the public static caches.
    // Second failure: show the button so the Access/session issue is visible.
    if (!new URL(location.href).searchParams.has("segun_reload") &&
        navigator.onLine !== false) {
      void recoverOnce();
    } else {
      showNotice();
    }
  }, TIMEOUT_MS);
})();
