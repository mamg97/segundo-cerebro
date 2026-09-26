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

function circumference(radius) {
  return 2 * Math.PI * radius;
}

function dashGeometry(percent, radius) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  const circle = circumference(radius);
  return {
    dasharray: circle.toFixed(3),
    dashoffset: (circle * (1 - pct / 100)).toFixed(3)
  };
}

function circleMarkup(className, radius, percent, extraStyle) {
  const geometry = dashGeometry(percent, radius);
  const style = [
    'stroke-dasharray:' + geometry.dasharray,
    'stroke-dashoffset:' + geometry.dashoffset,
    extraStyle || ''
  ].filter(Boolean).join(';');
  return '<circle class="' + className + '" cx="50" cy="50" r="' + radius + '" style="' + style + '"></circle>';
}

function ringSvgMarkup(percent, displayPct) {
  const main = percent === null ? 0 : percent;
  const lap2 = lapPercent(displayPct, 1);
  const lap3 = lapPercent(displayPct, 2);
  return '<svg class="progress-ring-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
    '<circle class="progress-ring-track" cx="50" cy="50" r="36"></circle>' +
    circleMarkup("progress-ring-stroke progress-ring-main", 36, main, "") +
    circleMarkup("progress-ring-stroke progress-ring-lap progress-ring-lap-2", 44, lap2, "opacity:" + (lap2 > 0 ? 1 : 0)) +
    circleMarkup("progress-ring-stroke progress-ring-lap progress-ring-lap-3", 48, lap3, "opacity:" + (lap3 > 0 ? 1 : 0)) +
    '</svg>';
}

function setCircleProgress(circle, radius, percent) {
  if (!circle) return;
  const geometry = dashGeometry(percent, radius);
  circle.style.strokeDasharray = geometry.dasharray;
  circle.style.strokeDashoffset = geometry.dashoffset;
}

function updateRingSvg(node, percent, displayPct) {
  node.querySelectorAll(".progress-ring-start,.progress-ring-cap").forEach(function (item) { item.remove(); });
  let svg = node.querySelector(".progress-ring-svg");
  if (!svg) {
    node.insertAdjacentHTML("afterbegin", ringSvgMarkup(percent, displayPct));
    svg = node.querySelector(".progress-ring-svg");
  }

  const main = percent === null ? 0 : percent;
  const lap2 = lapPercent(displayPct, 1);
  const lap3 = lapPercent(displayPct, 2);
  const mainCircle = svg?.querySelector(".progress-ring-main");
  const lap2Circle = svg?.querySelector(".progress-ring-lap-2");
  const lap3Circle = svg?.querySelector(".progress-ring-lap-3");

  setCircleProgress(mainCircle, 36, main);
  setCircleProgress(lap2Circle, 44, lap2);
  setCircleProgress(lap3Circle, 48, lap3);

  if (lap2Circle) lap2Circle.style.opacity = lap2 > 0 ? "1" : "0";
  if (lap3Circle) lap3Circle.style.opacity = lap3 > 0 ? "1" : "0";
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
