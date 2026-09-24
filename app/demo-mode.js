const DEMO_MODE_STORAGE_KEY = "segundo-cerebro-demo-mode";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "OPTION", "SVG", "PATH"]);
const NUMBER_PATTERN = /\d+(?:[.,:/-]\d+)*(?:\s?(?:%|€|EUR|kcal|kg|g|kWh|h|min|d[ií]as?))?/gi;

let observer = null;
let enabled = false;
let applyingMask = false;
const originalText = new Map();

function shouldSkip(node) {
  const parent = node?.parentElement;
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  if (parent.closest("[data-demo-unmasked='true']")) return true;
  return false;
}

function maskedValue(value) {
  return String(value ?? "").replace(NUMBER_PATTERN, "** **");
}

function maskTextNode(node) {
  if (!enabled || applyingMask || !node || shouldSkip(node)) return;
  const text = node.nodeValue || "";
  NUMBER_PATTERN.lastIndex = 0;
  if (!NUMBER_PATTERN.test(text)) return;
  NUMBER_PATTERN.lastIndex = 0;

  const previous = originalText.get(node);
  if (previous && node.nodeValue === maskedValue(previous)) return;

  originalText.set(node, text);
  applyingMask = true;
  node.nodeValue = maskedValue(text);
  applyingMask = false;
}

function maskRoot(root) {
  if (!enabled || !root) return;

  if (root.nodeType === Node.TEXT_NODE) {
    maskTextNode(root);
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
  nodes.forEach(maskTextNode);
}

function restoreOriginalText() {
  applyingMask = true;
  for (const [node, value] of originalText.entries()) {
    if (node?.isConnected) node.nodeValue = value;
  }
  originalText.clear();
  applyingMask = false;
}

function updateToggle(active) {
  const button = document.querySelector("#demo-mode-toggle");
  if (!button) return;
  button.setAttribute("aria-pressed", String(active));
  button.setAttribute("aria-label", active ? "Desactivar modo demo" : "Activar modo demo");
  button.title = active ? "Mostrar cifras reales" : "Ocultar cifras para enseñar la app";
  button.classList.toggle("active", active);
  const label = button.querySelector(".demo-mode-label");
  if (label) label.textContent = active ? "Demo activo" : "Demo";
}

export function setDemoMode(active, persist = true) {
  enabled = Boolean(active);
  document.documentElement.dataset.demoMode = enabled ? "true" : "false";
  updateToggle(enabled);

  if (enabled) {
    maskRoot(document.body);
  } else {
    restoreOriginalText();
  }

  if (persist) {
    try {
      if (enabled) sessionStorage.setItem(DEMO_MODE_STORAGE_KEY, "1");
      else sessionStorage.removeItem(DEMO_MODE_STORAGE_KEY);
    } catch {}
  }
}

export function toggleDemoMode() {
  setDemoMode(!enabled);
}

export function initDemoMode() {
  if (!observer) {
    observer = new MutationObserver((mutations) => {
      if (!enabled || applyingMask) return;
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          maskTextNode(mutation.target);
          continue;
        }
        mutation.addedNodes.forEach((node) => maskRoot(node));
      }
    });
    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  let active = false;
  try {
    active = sessionStorage.getItem(DEMO_MODE_STORAGE_KEY) === "1";
  } catch {}
  setDemoMode(active, false);
}
