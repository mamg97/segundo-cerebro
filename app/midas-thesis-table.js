// Tabla MIDAS de tesis: parsing y ordenación independientes del origen de datos.
// Las cifras siguen perteneciendo a MIDAS - TESIS Y WATCHLIST.

export function midasCagrNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  // Google Sheets puede representar el signo negativo con U+2212 (−).
  const normalized = String(value)
    .replace(/[\u2212\u2012\u2013\u2014]/g, "-")
    .replace("%", "")
    .replace(",", ".")
    .replace("+", "")
    .replace(/\s/g, "")
    .trim();
  if (!normalized || normalized === "-") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

// MIDAS v1.2: the statistical valuation is a labeled sensitivity, not a published thesis.
export function midasDisplayValuation(cagr = {}, tracking = {}) {
  const stats = cagr.statistical;
  const provisional = Boolean(
    stats && String(stats.status || "").toUpperCase().includes("PROVISIONAL") &&
    [stats.bear, stats.base, stats.bull].every((v) => midasCagrNumber(v) !== null) &&
    [stats.bearPrice5y, stats.basePrice5y, stats.bullPrice5y, stats.priceFor15].every((v) =>
      typeof v === "number" && Number.isFinite(v) && v >= 0
    )
  );
  return {
    provisional,
    bear: provisional ? stats.bear : cagr.bear,
    base: provisional ? stats.base : cagr.base,
    bull: provisional ? stats.bull : cagr.bull,
    bearPrice5y: provisional ? stats.bearPrice5y : tracking.bearPrice5y,
    basePrice5y: provisional ? stats.basePrice5y : tracking.basePrice5y,
    bullPrice5y: provisional ? stats.bullPrice5y : tracking.bullPrice5y,
    priceFor15: provisional ? stats.priceFor15 : tracking.priceFor15,
    multiple: provisional ? stats.baseMultiple : null,
    status: provisional ? stats.status : cagr.status
  };
}

export function compareMidasSortValues(a, b, { numeric = false, direction = "asc" } = {}) {
  const av = a === undefined || a === null ? "" : String(a).trim();
  const bv = b === undefined || b === null ? "" : String(b).trim();
  const aNum = numeric && av !== "" ? Number(av) : null;
  const bNum = numeric && bv !== "" ? Number(bv) : null;
  const aMissing = !av || (numeric && !Number.isFinite(aNum));
  const bMissing = !bv || (numeric && !Number.isFinite(bNum));
  if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1;
  const delta = numeric ? aNum - bNum : av.localeCompare(bv, "es", { numeric: true, sensitivity: "base" });
  return direction === "desc" ? -delta : delta;
}

export function bindMidasResearchSorting(root) {
  const table = root.querySelector(".midas-research-table");
  if (!table) return;
  const tbody = table.tBodies[0];
  const buttons = [...table.querySelectorAll("[data-midas-sort-key]")];
  const search = root.querySelector("[data-midas-thesis-search]");
  const count = root.querySelector("[data-midas-visible-count]");
  const noMatches = root.querySelector("[data-midas-no-matches]");
  if (!tbody) return;

  const numericKeys = new Set(["current", "bull", "bear", "central", "entry", "target", "thesis"]);
  const rows = [...tbody.rows];
  let activeKey = "central";
  let direction = "desc";

  function filter() {
    const query = (search?.value || "").trim().toLocaleLowerCase("es-ES");
    let visible = 0;
    for (const row of rows) {
      const haystack = (row.getAttribute("data-midas-search") || "").toLocaleLowerCase("es-ES");
      const matches = !query || haystack.includes(query);
      row.hidden = !matches;
      if (matches) visible++;
    }
    if (count) count.textContent = query ? String(visible) + " de " + rows.length + " empresas" : "";
    if (noMatches) noMatches.hidden = visible !== 0;
  }

  function sort(key, newDirection) {
    const numeric = numericKeys.has(key);
    rows.sort((a, b) => compareMidasSortValues(
      a.getAttribute("data-midas-sort-" + key),
      b.getAttribute("data-midas-sort-" + key),
      { numeric, direction: newDirection }
    ) || compareMidasSortValues(
      a.getAttribute("data-midas-sort-ticker"),
      b.getAttribute("data-midas-sort-ticker")
    ));
    const frag = document.createDocumentFragment();
    for (const row of rows) frag.appendChild(row);
    tbody.appendChild(frag);
    activeKey = key;
    direction = newDirection;
    for (const button of buttons) {
      const selected = button.dataset.midasSortKey === key;
      button.closest("th")?.setAttribute("aria-sort", selected ? (direction === "desc" ? "descending" : "ascending") : "none");
      const arrow = button.querySelector("[data-midas-sort-indicator]");
      if (arrow) arrow.textContent = selected ? (direction === "desc" ? "↓" : "↑") : "↕";
    }
    filter();
  }

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const key = button.dataset.midasSortKey;
      const nextDirection = key === activeKey
        ? (direction === "desc" ? "asc" : "desc")
        : (["ticker", "company", "market"].includes(key) ? "asc" : "desc");
      sort(key, nextDirection);
    });
  }
  search?.addEventListener("input", filter);
  // El servidor no controla el orden de visualización: la tabla arranca por CAGR Base.
  sort("central", "desc");
}
