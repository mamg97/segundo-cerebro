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
  const id = options.id ? ' id="' + escapeHtml(options.id) + '"' : "";
  const tone = escapeHtml(options.tone || "blue");
  const size = escapeHtml(options.size || "md");
  const label = options.label ? '<small>' + escapeHtml(options.label) + '</small>' : "";
  const aria = escapeHtml(options.ariaLabel || (pct === null ? "Progreso sin datos" : pct + "% de progreso"));
  return '<span' + id + ' class="progress-ring tone-' + tone + ' size-' + size + (pct === null ? ' is-empty' : '') + '" role="progressbar" aria-valuemin="0" aria-valuemax="100"' +
    (pct === null ? '' : ' aria-valuenow="' + pct + '"') + ' aria-label="' + aria + '" style="--ring-progress:' + (pct === null ? 0 : pct) + ';--ring-fill:' + (pct === null ? 0 : pct) + '%">' +
    '<span class="progress-ring-center"><strong class="progress-ring-value">' + (pct === null ? "—" : pct + "%") + '</strong>' + label + '</span></span>';
}

export function updateProgressRing(node, value, options) {
  if (!node) return;
  options = options || {};
  const pct = clampPercent(value);
  node.style.setProperty("--ring-progress", pct === null ? "0" : String(pct));
  node.style.setProperty("--ring-fill", (pct === null ? 0 : pct) + "%");
  node.classList.toggle("is-empty", pct === null);
  ["blue","mint","amber","coral","violet"].forEach(function (tone) {
    node.classList.toggle("tone-" + tone, (options.tone || "blue") === tone);
  });
  const out = node.querySelector(".progress-ring-value");
  if (out) out.textContent = pct === null ? "—" : pct + "%";
  const label = node.querySelector("small");
  if (label && options.label !== undefined) label.textContent = options.label || "";
  if (pct === null) node.removeAttribute("aria-valuenow");
  else node.setAttribute("aria-valuenow", String(pct));
  node.setAttribute("aria-label", options.ariaLabel || (pct === null ? "Progreso sin datos" : pct + "% de progreso"));
}
