function clampPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : null;
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>'"]/g, function (c) {
    return { "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c];
  });
}

export function progressRingMarkup(value, options) {
  options = options || {};
  const pct = clampPercent(value);
  const rawDisplay = Number(options.displayPercent);
  const displayPct = Number.isFinite(rawDisplay) ? Math.max(0, Math.round(rawDisplay)) : pct;
  const id = options.id ? ' id="' + escapeHtml(options.id) + '"' : "";
  const tone = escapeHtml(options.tone || "blue");
  const overflowPct = displayPct !== null && displayPct > 100 ? Math.min(100, displayPct - 100) : 0;
  const overflowClass = overflowPct > 0 ? " has-overflow" : "";
  const size = escapeHtml(options.size || "md");
  const label = options.label ? '<small>' + escapeHtml(options.label) + '</small>' : "";
  const aria = escapeHtml(options.ariaLabel || (displayPct === null ? "Progreso sin datos" : displayPct + "% de progreso"));
  const ariaMax = displayPct !== null && displayPct > 100 ? displayPct : 100;
  return '<span' + id + ' class="progress-ring tone-' + tone + ' size-' + size + overflowClass + (pct === null ? ' is-empty' : '') + '" role="progressbar" aria-valuemin="0" aria-valuemax="' + ariaMax + '"' +
    (displayPct === null ? '' : ' aria-valuenow="' + displayPct + '"') + ' aria-label="' + aria + '" style="--ring-progress:' + (pct === null ? 0 : pct) + ';--ring-fill:' + (pct === null ? 0 : pct) + '%;--ring-overflow-fill:' + overflowPct + '%">' +
    '<i class="progress-ring-start" aria-hidden="true"></i><i class="progress-ring-cap" aria-hidden="true"></i>' +
    '<span class="progress-ring-center"><strong class="progress-ring-value">' + (displayPct === null ? "—" : displayPct + "%") + '</strong>' + label + '</span></span>';
}

export function updateProgressRing(node, value, options) {
  if (!node) return;
  options = options || {};
  const pct = clampPercent(value);
  const rawDisplay = Number(options.displayPercent);
  const displayPct = Number.isFinite(rawDisplay) ? Math.max(0, Math.round(rawDisplay)) : pct;
  const overflowPct = displayPct !== null && displayPct > 100 ? Math.min(100, displayPct - 100) : 0;
  node.style.setProperty("--ring-progress", pct === null ? "0" : String(pct));
  node.style.setProperty("--ring-fill", (pct === null ? 0 : pct) + "%");
  node.style.setProperty("--ring-overflow-fill", overflowPct + "%");
  node.classList.toggle("is-empty", pct === null);
  node.classList.toggle("has-overflow", overflowPct > 0);
  let startCap = node.querySelector(".progress-ring-start");
  let endCap = node.querySelector(".progress-ring-cap");
  if (!startCap) {
    startCap = document.createElement("i");
    startCap.className = "progress-ring-start";
    startCap.setAttribute("aria-hidden", "true");
    node.prepend(startCap);
  }
  if (!endCap) {
    endCap = document.createElement("i");
    endCap.className = "progress-ring-cap";
    endCap.setAttribute("aria-hidden", "true");
    node.prepend(endCap);
  }
  ["blue","mint","amber","coral","violet"].forEach(function (tone) {
    node.classList.toggle("tone-" + tone, (options.tone || "blue") === tone);
  });
  const out = node.querySelector(".progress-ring-value");
  if (out) out.textContent = displayPct === null ? "—" : displayPct + "%";
  const label = node.querySelector("small");
  if (label && options.label !== undefined) label.textContent = options.label || "";
  if (displayPct === null) node.removeAttribute("aria-valuenow");
  else node.setAttribute("aria-valuenow", String(displayPct));
  node.setAttribute("aria-valuemax", String(displayPct !== null && displayPct > 100 ? displayPct : 100));
  node.setAttribute("aria-label", options.ariaLabel || (displayPct === null ? "Progreso sin datos" : displayPct + "% de progreso"));
}
