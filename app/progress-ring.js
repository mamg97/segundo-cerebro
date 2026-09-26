function normalizePercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : null;
}

function clampPercent(value) {
  const normalized = normalizePercent(value);
  return normalized === null ? null : Math.min(100, normalized);
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>'"]/g, function (c) {
    return { "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c];
  });
}

function lapPercent(displayPct, lapIndex) {
  if (displayPct === null) return 0;
  const start = lapIndex * 100;
  return Math.max(0, Math.min(100, displayPct - start));
}

function fixed(value) {
  return Number(value.toFixed(3));
}

function arcPath(radius, percent) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  if (pct <= 0 || pct >= 100) return "";
  const startX = 50;
  const startY = 50 - radius;
  const endAngle = (-90 + pct * 3.6) * Math.PI / 180;
  const endX = 50 + radius * Math.cos(endAngle);
  const endY = 50 + radius * Math.sin(endAngle);
  const largeArc = pct > 50 ? 1 : 0;
  return [
    "M", fixed(startX), fixed(startY),
    "A", radius, radius, 0, largeArc, 1, fixed(endX), fixed(endY)
  ].join(" ");
}

function progressShapeMarkup(className, radius, percent) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  if (pct <= 0) return "";
  if (pct >= 100) {
    return '<circle class="' + className + ' progress-ring-full" cx="50" cy="50" r="' + radius + '"></circle>';
  }
  return '<path class="' + className + ' progress-ring-arc" data-progress="' + pct + '" d="' + arcPath(radius, pct) + '"></path>';
}

function ringSvgMarkup(percent, displayPct) {
  const main = percent === null ? 0 : percent;
  const lap2 = lapPercent(displayPct, 1);
  const lap3 = lapPercent(displayPct, 2);
  return '<svg class="progress-ring-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
    '<circle class="progress-ring-track" cx="50" cy="50" r="36"></circle>' +
    progressShapeMarkup("progress-ring-stroke progress-ring-main", 36, main) +
    progressShapeMarkup("progress-ring-stroke progress-ring-lap progress-ring-lap-2", 44, lap2) +
    progressShapeMarkup("progress-ring-stroke progress-ring-lap progress-ring-lap-3", 48, lap3) +
    '</svg>';
}

function updateRingSvg(node, percent, displayPct) {
  const markup = ringSvgMarkup(percent, displayPct);
  const current = node.querySelector(".progress-ring-svg");
  if (current) current.outerHTML = markup;
  else node.insertAdjacentHTML("afterbegin", markup);
}

export function progressRingMarkup(value, options) {
  options = options || {};
  const normalized = normalizePercent(value);
  const pct = clampPercent(value);
  const rawDisplay = Number(options.displayPercent);
  const displayPct = Number.isFinite(rawDisplay) ? Math.max(0, Math.round(rawDisplay)) : normalized;
  const id = options.id ? ' id="' + escapeHtml(options.id) + '"' : "";
  const tone = escapeHtml(options.tone || "blue");
  const size = escapeHtml(options.size || "md");
  const label = options.label ? '<small>' + escapeHtml(options.label) + '</small>' : "";
  const aria = escapeHtml(options.ariaLabel || (displayPct === null ? "Progreso sin datos" : displayPct + "% de progreso"));
  const ariaMax = displayPct !== null && displayPct > 100 ? displayPct : 100;
  return '<span' + id + ' class="progress-ring tone-' + tone + ' size-' + size + (displayPct > 100 ? ' has-overflow' : '') + (pct === null ? ' is-empty' : '') + '" role="progressbar" aria-valuemin="0" aria-valuemax="' + ariaMax + '"' +
    (displayPct === null ? '' : ' aria-valuenow="' + displayPct + '"') + ' aria-label="' + aria + '">' +
    ringSvgMarkup(pct, displayPct) +
    '<span class="progress-ring-center"><strong class="progress-ring-value">' + (displayPct === null ? "—" : displayPct + "%") + '</strong>' + label + '</span></span>';
}

export function updateProgressRing(node, value, options) {
  if (!node) return;
  options = options || {};
  const normalized = normalizePercent(value);
  const pct = clampPercent(value);
  const rawDisplay = Number(options.displayPercent);
  const displayPct = Number.isFinite(rawDisplay) ? Math.max(0, Math.round(rawDisplay)) : normalized;

  updateRingSvg(node, pct, displayPct);
  node.classList.toggle("is-empty", pct === null);
  node.classList.toggle("has-overflow", displayPct !== null && displayPct > 100);

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
