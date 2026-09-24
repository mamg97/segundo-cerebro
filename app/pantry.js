const moneyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2
});

const shortDateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short"
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[character]));
}

function money(value, currency = "EUR") {
  const number = Number(value);
  if (!Number.isFinite(number)) return "Sin precio";
  if (currency === "EUR") return moneyFormatter.format(number);
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(number);
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  const date = new Date(String(value).slice(0, 10) + "T12:00:00");
  return Number.isFinite(date.getTime())
    ? shortDateFormatter.format(date).replace(".", "")
    : String(value);
}

function stockLabel(value) {
  return {
    sufficient: "Suficiente",
    medium: "Medio",
    low: "Bajo",
    out: "Agotado",
    unknown: "Sin confirmar"
  }[String(value || "").toLowerCase()] || "Sin confirmar";
}

function stockProgress(value) {
  return {
    sufficient: 100,
    medium: 62,
    low: 27,
    out: 0,
    unknown: 42
  }[String(value || "").toLowerCase()] ?? 42;
}

function quantityLabel(item) {
  if (item.quantity === null || item.quantity === undefined || item.quantity === "") {
    return "Cantidad sin confirmar";
  }
  return String(item.quantity) + (item.quantityUnit ? " " + String(item.quantityUnit) : "");
}

function sparkline(history = []) {
  const values = history.map((row) => Number(row.price)).filter(Number.isFinite);
  if (values.length < 2) return "";
  const width = 300;
  const height = 72;
  const pad = 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(0.01, max - min);
  const points = values.map((value, index) => {
    const x = pad + ((width - pad * 2) * index) / Math.max(1, values.length - 1);
    const y = height - pad - ((height - pad * 2) * (value - min)) / spread;
    return x.toFixed(1) + "," + y.toFixed(1);
  }).join(" ");
  return '<svg class="pantry-sparkline" viewBox="0 0 300 72" role="img" aria-label="Evolución del precio"><polyline points="' + points + '"></polyline></svg>';
}

export function pantryAreaFromState(state, privateModeKind) {
  if (privateModeKind !== "remote") return null;
  const summary = state?.pantrySummary || {};
  const lowCount = Number(summary.lowStockCount || 0);
  const pendingCount = Number(summary.pendingPurchaseCount || 0);
  return {
    id: "area-pantry",
    slug: "pantry",
    title: "Despensa",
    shortTitle: "Despensa",
    summary: summary.homeMessage || "Inventario doméstico, precios y próxima compra.",
    health: lowCount > 0 ? Math.max(55, 88 - Math.min(28, lowCount * 4)) : 88,
    tone: "cyan",
    module: "Pantry",
    sensitivity: "personal",
    status: lowCount || pendingCount ? "attention" : "steady"
  };
}

export function renderHomePantryCard(state, privateModeKind) {
  const card = document.querySelector("#home-pantry-card");
  if (!card) return;
  const summary = state?.pantrySummary || null;
  const visible = privateModeKind === "remote";
  card.hidden = !visible;
  if (!visible) return;

  const set = (selector, value) => {
    const node = card.querySelector(selector);
    if (node) node.textContent = value;
  };

  if (!summary) {
    set("#home-pantry-available", "—");
    set("#home-pantry-low", "—");
    set("#home-pantry-buy", "—");
    set("#home-pantry-cost", "—");
    set("#home-pantry-status", "Despensa disponible · fuente privada pendiente de lectura");
    set("#home-pantry-review", "Abrir para comprobar conexión");
    card.dataset.sourceStatus = "unavailable";
    return;
  }

  delete card.dataset.sourceStatus;
  set("#home-pantry-available", Number(summary.availableProductCount || 0));
  set("#home-pantry-low", Number(summary.lowStockCount || 0));
  set("#home-pantry-buy", Number(summary.pendingPurchaseCount || 0));
  set(
    "#home-pantry-cost",
    Number.isFinite(Number(summary.estimatedBasketTotal))
      ? money(Number(summary.estimatedBasketTotal), summary.currency || "EUR") + (summary.estimatedBasketPartial ? " +" : "")
      : "Sin estimar"
  );
  set("#home-pantry-status", summary.homeMessage || "Inventario doméstico conectado.");
  set(
    "#home-pantry-review",
    summary.lastInventoryReview ? "Revisión " + formatDate(summary.lastInventoryReview) : "Sin fecha de revisión"
  );
}

function locationTiles(payload) {
  const summaries = Array.isArray(payload.locationSummary) ? payload.locationSummary : [];
  return ["Nevera", "Despensa", "Congelador"].map((name) => {
    const item = summaries.find((row) => row.location === name) || { available: 0, low: 0 };
    return '<button class="pantry-location-tile" type="button" data-pantry-filter="' + escapeHtml(name) + '">' +
      '<span>' + escapeHtml(name) + '</span>' +
      '<strong>' + Number(item.available || 0) + '</strong>' +
      '<small>' + (Number(item.low || 0) ? Number(item.low || 0) + " por revisar" : "sin alertas") + '</small>' +
      '</button>';
  }).join("");
}

function renderProductDetail(item, payload) {
  const body = document.querySelector("#dialog-body");
  const currency = payload.summary?.currency || "EUR";
  const nutrition = item.nutrition || {};
  const nutritionRows = [
    ["Kcal / 100 g", nutrition.kcal100g, ""],
    ["Proteína", nutrition.protein100g, " g"],
    ["Carbohidratos", nutrition.carbs100g, " g"],
    ["Grasas", nutrition.fat100g, " g"]
  ].filter((row) => row[1] !== null && row[1] !== undefined && row[1] !== "");

  body.innerHTML =
    '<button id="pantry-back" class="pantry-back" type="button">← Volver a despensa</button>' +
    '<section class="pantry-product-detail">' +
      '<div class="pantry-detail-head"><div>' +
        '<span class="pantry-product-category">' + escapeHtml(item.categoryLabel || "Otros") + '</span>' +
        '<h3>' + escapeHtml(item.name || "Producto") + '</h3>' +
        '<p>' + escapeHtml([item.brand, item.format].filter(Boolean).join(" · ") || "Sin marca/formato") + '</p>' +
      '</div><span class="stock-chip stock-' + escapeHtml(item.stockStatus || "unknown") + '">' + escapeHtml(stockLabel(item.stockStatus)) + '</span></div>' +
      '<div class="pantry-detail-grid">' +
        '<span><small>Stock</small><strong>' + escapeHtml(quantityLabel(item)) + '</strong></span>' +
        '<span><small>Ubicación</small><strong>' + escapeHtml(item.location || "Otros") + '</strong></span>' +
        '<span><small>Precio reciente</small><strong>' + escapeHtml(money(item.latestPrice?.price, currency)) + '</strong></span>' +
        '<span><small>Último ticket</small><strong>' + escapeHtml(money(item.lastTicketPrice?.price, currency)) + '</strong></span>' +
        '<span><small>Última compra</small><strong>' + escapeHtml(formatDate(item.lastPurchaseDate)) + '</strong></span>' +
        '<span><small>Confianza</small><strong>' + escapeHtml(item.confidence || "Sin indicar") + '</strong></span>' +
      '</div>' +
      (Array.isArray(item.priceHistory) && item.priceHistory.length > 1
        ? '<div class="pantry-price-history"><div><strong>Evolución de precio</strong><span>' + item.priceHistory.length + ' observaciones</span></div>' + sparkline(item.priceHistory) + '</div>'
        : '') +
      (nutritionRows.length
        ? '<div class="pantry-nutrition"><strong>Información nutricional</strong><div>' +
          nutritionRows.map((row) => '<span><small>' + escapeHtml(row[0]) + '</small><b>' + escapeHtml(String(row[1]) + row[2]) + '</b></span>').join('') +
          '</div></div>'
        : '') +
      '<div class="pantry-detail-notes"><strong>Notas / confianza</strong><p>' + escapeHtml(item.notes || "Sin notas.") + '</p></div>' +
      (item.productUrl
        ? '<a class="pantry-product-link" href="' + escapeHtml(item.productUrl) + '" target="_blank" rel="noreferrer">Abrir producto ↗</a>'
        : '') +
    '</section>';

  body.querySelector("#pantry-back")?.addEventListener("click", () => renderWorkspace(payload));
}

function renderWorkspace(payload) {
  const body = document.querySelector("#dialog-body");
  const summary = payload.summary || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  const shopping = Array.isArray(payload.shoppingList) ? payload.shoppingList : [];
  const categories = Array.isArray(payload.categories) ? payload.categories : [];
  const currency = summary.currency || "EUR";

  const productCards = items.map((item) => {
    const low = ["low", "out"].includes(String(item.stockStatus || ""));
    return '<button class="pantry-product-card" type="button" ' +
      'data-pantry-product="' + escapeHtml(item.productId || item.inventoryId || "") + '" ' +
      'data-name="' + escapeHtml((item.name || "").toLocaleLowerCase("es")) + '" ' +
      'data-location="' + escapeHtml(item.location || "Otros") + '" ' +
      'data-category="' + escapeHtml(item.categoryLabel || "Otros") + '" ' +
      'data-stock="' + escapeHtml(item.stockStatus || "unknown") + '" ' +
      'style="--stock-progress:' + stockProgress(item.stockStatus) + '%">' +
        '<span class="pantry-product-top"><span class="pantry-product-category">' + escapeHtml(item.categoryLabel || "Otros") + '</span>' +
        '<span class="stock-chip stock-' + escapeHtml(item.stockStatus || "unknown") + '">' + escapeHtml(stockLabel(item.stockStatus)) + '</span></span>' +
        '<strong class="pantry-product-name">' + escapeHtml(item.name || "Producto") + '</strong>' +
        '<span class="pantry-product-brand">' + escapeHtml([item.brand, item.format].filter(Boolean).join(" · ") || "Sin marca/formato") + '</span>' +
        '<span class="pantry-product-meta"><span>' + escapeHtml(item.location || "Otros") + ' · ' + escapeHtml(quantityLabel(item)) + '</span>' +
        '<strong>' + escapeHtml(money(item.latestPrice?.price, currency)) + '</strong></span>' +
        '<span class="pantry-stock-track"><i></i></span>' +
        '<span class="pantry-product-foot">' + (item.confidence && String(item.confidence).toLowerCase() !== "alta" ? "≈ cantidad estimada · " : "") + (low ? "Conviene revisar" : "Abrir ficha") + '</span>' +
      '</button>';
  }).join("");

  const shoppingRows = shopping.map((item) => {
    const stateClass = String(item.state || "REVISAR").toLowerCase();
    const target = [item.targetQuantity, item.targetUnit].filter((value) => value !== null && value !== undefined && value !== "").join(" ");
    return '<div class="pantry-shopping-row">' +
      '<div><strong>' + escapeHtml(item.name || "Producto") + '</strong>' +
      '<span>' + escapeHtml(target || "Cantidad por definir") + ' · ' + escapeHtml(item.reason || "Sin motivo") + '</span></div>' +
      '<span class="purchase-state state-' + escapeHtml(stateClass) + '">' + escapeHtml(item.state || "REVISAR") + '</span>' +
      '<span class="pantry-shopping-price">' + escapeHtml(money(item.estimatedCost, currency)) + '</span>' +
      '</div>';
  }).join("");

  body.innerHTML =
    '<div class="pantry-shell">' +
      '<section class="pantry-hero">' +
        '<div><p class="pantry-human-status">' + escapeHtml(summary.homeMessage || "Inventario doméstico conectado.") + '</p>' +
        '<span>' + escapeHtml(summary.lastInventoryReview ? "Última revisión " + formatDate(summary.lastInventoryReview) : "Sin revisión fechada") + '</span></div>' +
        '<div class="pantry-metrics">' +
          '<span><small>En casa</small><strong>' + Number(summary.availableProductCount || 0) + '</strong></span>' +
          '<span><small>Stock bajo</small><strong>' + Number(summary.lowStockCount || 0) + '</strong></span>' +
          '<span><small>Lista compra</small><strong>' + Number(summary.pendingPurchaseCount || 0) + '</strong></span>' +
          '<span><small>Próxima compra</small><strong>' + escapeHtml(money(summary.estimatedBasketTotal, currency)) + (summary.estimatedBasketPartial ? " +" : "") + '</strong></span>' +
        '</div>' +
      '</section>' +
      '<section class="pantry-location-strip">' + locationTiles(payload) + '</section>' +
      '<section class="pantry-controls">' +
        '<div class="pantry-filter-row">' +
          '<button class="active" type="button" data-pantry-filter="Todo">Todo</button>' +
          '<button type="button" data-pantry-filter="Despensa">Despensa</button>' +
          '<button type="button" data-pantry-filter="Nevera">Nevera</button>' +
          '<button type="button" data-pantry-filter="Congelador">Congelador</button>' +
          '<button type="button" data-pantry-filter="Stock bajo">Stock bajo</button>' +
        '</div>' +
        '<input id="pantry-search" class="pantry-search" type="search" placeholder="Buscar producto…" autocomplete="off">' +
        '<div class="pantry-category-row"><button class="active" type="button" data-pantry-category="Todo">Todas</button>' +
          categories.map((category) => '<button type="button" data-pantry-category="' + escapeHtml(category) + '">' + escapeHtml(category) + '</button>').join('') +
        '</div>' +
      '</section>' +
      '<section><div class="pantry-section-heading"><div><small>Inventario</small><strong id="pantry-visible-count">' + items.length + ' productos</strong></div></div>' +
        '<div id="pantry-product-grid" class="pantry-product-grid">' + (productCards || '<p class="pantry-empty">Todavía no hay inventario disponible.</p>') + '</div>' +
      '</section>' +
      '<section class="pantry-shopping-section">' +
        '<div class="pantry-section-heading"><div><small>Próxima compra</small><strong>Lista de compra</strong></div>' +
        '<span>' + (summary.estimatedBasketPartial ? "Estimación parcial" : "Estimación disponible") + '</span></div>' +
        '<div class="pantry-shopping-list">' + (shoppingRows || '<p class="pantry-empty">No hay productos pendientes.</p>') + '</div>' +
        '<div class="pantry-shopping-total"><span>Total estimado próxima compra</span>' +
        '<strong>' + escapeHtml(money(summary.estimatedBasketTotal, currency)) + (summary.estimatedBasketPartial ? " + productos sin precio" : "") + '</strong></div>' +
      '</section>' +
    '</div>';

  let activeLocation = "Todo";
  let activeCategory = "Todo";
  let searchText = "";

  const applyFilters = () => {
    let visible = 0;
    body.querySelectorAll(".pantry-product-card").forEach((card) => {
      const locationOk = activeLocation === "Todo" || (
        activeLocation === "Stock bajo"
          ? ["low", "out"].includes(card.dataset.stock)
          : card.dataset.location === activeLocation
      );
      const categoryOk = activeCategory === "Todo" || card.dataset.category === activeCategory;
      const searchOk = !searchText || String(card.dataset.name || "").includes(searchText);
      const show = locationOk && categoryOk && searchOk;
      card.hidden = !show;
      if (show) visible += 1;
    });
    const count = body.querySelector("#pantry-visible-count");
    if (count) count.textContent = visible + (visible === 1 ? " producto" : " productos");
  };

  body.querySelectorAll("[data-pantry-filter]").forEach((button) => button.addEventListener("click", () => {
    activeLocation = button.dataset.pantryFilter || "Todo";
    body.querySelectorAll(".pantry-filter-row [data-pantry-filter]").forEach((node) => {
      node.classList.toggle("active", node.dataset.pantryFilter === activeLocation);
    });
    applyFilters();
  }));

  body.querySelectorAll("[data-pantry-category]").forEach((button) => button.addEventListener("click", () => {
    activeCategory = button.dataset.pantryCategory || "Todo";
    body.querySelectorAll("[data-pantry-category]").forEach((node) => {
      node.classList.toggle("active", node.dataset.pantryCategory === activeCategory);
    });
    applyFilters();
  }));

  body.querySelector("#pantry-search")?.addEventListener("input", (event) => {
    searchText = String(event.target.value || "").trim().toLocaleLowerCase("es");
    applyFilters();
  });

  body.querySelectorAll("[data-pantry-product]").forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.pantryProduct;
    const item = items.find((row) => String(row.productId || row.inventoryId || "") === id);
    if (item) renderProductDetail(item, payload);
  }));
}

export async function openPantryDetail() {
  const dialog = document.querySelector("#detail-dialog");
  if (!dialog) return;
  dialog.classList.remove(
    "wealth-dialog",
    "health-dialog",
    "habits-dialog",
    "important-events-dialog",
    "budget-dialog",
    "parents-dialog",
    "electricity-dialog",
    "objects-dialog", "projects-dialog"
  );
  dialog.classList.add("pantry-dialog");
  document.querySelector("#dialog-context").textContent = "Despensa · Fuente privada";
  document.querySelector("#dialog-title").textContent = "Despensa";
  document.querySelector("#dialog-body").innerHTML = '<p class="pantry-empty">Cargando inventario…</p>';
  if (!dialog.open) dialog.showModal();

  try {
    const response = await fetch("/api/pantry", {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("PANTRY_" + response.status);
    renderWorkspace(await response.json());
  } catch (error) {
    console.warn("Pantry load failed", error);
    document.querySelector("#dialog-body").innerHTML =
      '<div class="pantry-source-error"><strong>Despensa disponible, datos pendientes de conexión</strong><p>No se ha podido leer ahora mismo la fuente privada. El módulo ya no desaparece cuando esto ocurre.</p><button id="pantry-retry" type="button">Reintentar</button></div>';
    document.querySelector("#pantry-retry")?.addEventListener("click", openPantryDetail);
  }
}
