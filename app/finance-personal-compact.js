// Progressive enhancement: use the existing compact budget table layout for
// personal categories without changing finance calculations or private data.
// The underlying budget source remains the app renderer and canonical Sheets.
function el(tag, className = "", text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

function addAmount(line, className, label, amount) {
  const node = el("span", "budget-compact-amount " + className, amount);
  node.dataset.label = label;
  line.append(node);
}

export function compactPersonalBudgetGroup(section) {
  const original = section.querySelector(":scope > .budget-detail-list");
  if (!original) return false;
  const articles = [...original.querySelectorAll(":scope > .budget-category-item")];
  if (!articles.length) return false;

  const owner = section.classList.contains("budget-group-miguel") ? "Miguel" : "Andrea";
  const table = el("div", "budget-compact-table");
  table.setAttribute("aria-label", "Partidas del presupuesto personal de " + owner);
  const header = el("div", "budget-compact-columns");
  header.setAttribute("aria-hidden", "true");
  ["Partida", "Progreso", "Presupuesto", "Gastado", "Saldo", ""].forEach(label => {
    header.append(el("span", "", label));
  });
  const rows = el("div", "budget-compact-rows");

  for (const card of articles) {
    const title = card.querySelector(".budget-category-title")?.childNodes[0]?.textContent?.trim()
      || "Partida personal";
    const percentText = card.querySelector(".budget-category-head-right > strong")?.textContent?.trim() || "—";
    const pct = Number.parseFloat(percentText.replace(",", "."));
    const planned = card.querySelector(".budget-category-metrics > span:nth-child(1) strong")?.textContent?.trim() || "—";
    const spent = card.querySelector(".budget-category-metrics > span:nth-child(2) strong")?.textContent?.trim() || "—";
    const committed = card.querySelector(".budget-category-metrics > span:nth-child(3) strong")?.textContent?.trim() || "—";
    const remaining = card.querySelector(".budget-category-metrics > span:nth-child(4) strong")?.textContent?.trim() || "—";
    const isOver = card.classList.contains("over-budget");
    const isNear = Number.isFinite(pct) && pct >= 85 && pct <= 100;
    const details = el("details", "budget-compact-entry" + (isOver ? " is-over" : isNear ? " is-near" : ""));
    const summary = el("summary", "budget-compact-line");
    summary.setAttribute("aria-label", title + ". " + percentText + " gastado. Ver detalle");
    summary.append(el("span", "budget-compact-label", title));
    const progressCell = el("span", "budget-compact-progress-cell");
    const originalBar = card.querySelector(".budget-category-progress");
    if (originalBar) {
      const bar = originalBar.cloneNode(true);
      bar.className = "";
      progressCell.append(bar);
    }
    progressCell.append(el("span", "budget-compact-percent", percentText));
    summary.append(progressCell);
    addAmount(summary, "budget-compact-planned", "Prev.", planned);
    addAmount(summary, "budget-compact-spent", "Gast.", spent);
    const negativeRemaining = remaining.startsWith("-") || remaining.startsWith("−");
    addAmount(summary, "budget-compact-remaining" + (negativeRemaining ? " is-negative" : ""), "Saldo", remaining);
    summary.append(el("span", "budget-compact-chevron", "⌄"));
    summary.lastElementChild.setAttribute("aria-hidden", "true");
    details.append(summary);

    const detail = el("div", "budget-compact-detail");
    const detailMetrics = el("div", "budget-compact-detail-metrics");
    [["Presupuesto", planned], ["Gastado", spent], ["Comprometido", committed], ["Saldo partida", remaining]].forEach(([label, value]) => {
      const part = el("span", "", label + " ");
      part.append(el("strong", "", value));
      detailMetrics.append(part);
    });
    detail.append(detailMetrics);
    const source = card.querySelector(".budget-source");
    if (source) detail.append(el("p", "budget-compact-status", "Conciliación: " + source.textContent.trim()));
    const note = card.querySelector(".budget-category-note");
    if (note) detail.append(el("p", "budget-compact-note", note.textContent));
    details.append(detail);
    rows.append(details);
  }
  table.append(header, rows);
  original.replaceWith(table);
  return true;
}

export function installPersonalBudgetCompactView() {
  const body = document.querySelector("#dialog-body");
  if (!body) return;
  const enhance = () => {
    const dialog = document.querySelector("#detail-dialog");
    if (!dialog?.classList.contains("budget-dialog")) return;
    body.querySelectorAll(".budget-group-miguel, .budget-group-andrea")
      .forEach(compactPersonalBudgetGroup);
  };
  const observer = new MutationObserver(enhance);
  // The main finance renderer replaces dialog-body innerHTML. Observe only
  // that direct replacement; avoid feedback loops from the enhancement itself.
  observer.observe(body, { childList: true });
  enhance();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installPersonalBudgetCompactView, { once: true });
  } else {
    installPersonalBudgetCompactView();
  }
}
