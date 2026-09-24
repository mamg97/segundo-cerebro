const DEMO_MODE_STORAGE_KEY = "segundo-cerebro-demo-mode";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "OPTION", "SVG", "PATH"]);
const NUMBER_PATTERN = /\d+(?:[.,:/-]\d+)*(?:\s?(?:%|€|EUR|kcal|kg|g|kWh|h|min|d[ií]as?))?/gi;

let observer = null;

function shouldSkip(node) {
  const parent = node?.parentElement;
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  if (parent.closest(".demo-number, [data-demo-unmasked='true']")) return true;
  return false;
}

function instrumentTextNode(node) {
  if (!node || shouldSkip(node)) return;
  const text = node.nodeValue || "";
  NUMBER_PATTERN.lastIndex = 0;
  if (!NUMBER_PATTERN.test(text)) return;
  NUMBER_PATTERN.lastIndex = 0;

  const fragment = document.createDocumentFragment();
  let cursor = 0;
  for (const match of text.matchAll(NUMBER_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) fragment.append(document.createTextNode(text.slice(cursor, start)));

    const span = document.createElement("span");
    span.className = "demo-number";
    span.textContent = match[0];
    span.setAttribute("data-demo-sensitive", "number");
    fragment.append(span);
    cursor = start + match[0].length;
  }

  if (cursor < text.length) fragment.append(document.createTextNode(text.slice(cursor)));
  node.replaceWith(fragment);
}

function instrumentRoot(root) {
  if (!root) return;

  if (root.nodeType === Node.TEXT_NODE) {
    instrumentTextNode(root);
    return;
  }

  if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current);
    current = walker.nextNode();
  }
  nodes.forEach(instrumentTextNode);
}

function updateToggle(enabled) {
  const button = document.querySelector("#demo-mode-toggle");
  if (!button) return;
  button.setAttribute("aria-pressed", String(enabled));
  button.setAttribute("aria-label", enabled ? "Desactivar modo demo" : "Activar modo demo");
  button.title = enabled ? "Mostrar cifras reales" : "Ocultar cifras para enseñar la app";
  button.classList.toggle("active", enabled);
  const label = button.querySelector(".demo-mode-label");
  if (label) label.textContent = enabled ? "Demo activo" : "Demo";
}

export function setDemoMode(enabled, persist = true) {
  const active = Boolean(enabled);
  document.documentElement.dataset.demoMode = active ? "true" : "false";
  updateToggle(active);

  if (persist) {
    try {
      if (active) sessionStorage.setItem(DEMO_MODE_STORAGE_KEY, "1");
      else sessionStorage.removeItem(DEMO_MODE_STORAGE_KEY);
    } catch {}
  }

  if (active) instrumentRoot(document.body);
}

export function toggleDemoMode() {
  setDemoMode(document.documentElement.dataset.demoMode !== "true");
}

export function initDemoMode() {
  instrumentRoot(document.body);

  if (!observer) {
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => instrumentRoot(node));
        if (mutation.type === "characterData") instrumentTextNode(mutation.target);
      }
    });
    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  let enabled = false;
  try {
    enabled = sessionStorage.getItem(DEMO_MODE_STORAGE_KEY) === "1";
  } catch {}
  setDemoMode(enabled, false);
}
