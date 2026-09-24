let cache = {
  value: null,
  expiresAt: 0,
  spreadsheetId: null,
  spreadsheetIdExpiresAt: 0
};

export function hasPantryGoogleConfig(env) {
  return Boolean(
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_SECRET &&
    env.GOOGLE_REFRESH_TOKEN
  );
}

function table(values = []) {
  if (!values.length) return [];
  const headers = values[0].map((value) => String(value ?? "").trim());
  return values.slice(1)
    .filter((row) => row.some((value) => value !== "" && value !== null && value !== undefined))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row?.[index] ?? null])));
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = String(value).trim().replace(/\s/g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function dateOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const epoch = Date.UTC(1899, 11, 30);
    const date = new Date(epoch + value * 86400000);
    return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const es = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (es) return es[3] + "-" + String(es[2]).padStart(2, "0") + "-" + String(es[1]).padStart(2, "0");
  const parsed = new Date(raw);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
}

function normalizeLocation(value) {
  const text = String(value || "").trim().toLocaleLowerCase("es");
  if (text.includes("never")) return "Nevera";
  if (text.includes("congel")) return "Congelador";
  if (text.includes("desp")) return "Despensa";
  return "Otros";
}

function normalizeStock(value) {
  const text = String(value || "").trim().toLocaleLowerCase("es");
  if (["suficiente", "alto", "alta", "lleno", "llena", "in_stock", "ok"].includes(text)) return "sufficient";
  if (["medio", "media", "medium"].includes(text)) return "medium";
  if (["bajo", "baja", "low"].includes(text)) return "low";
  if (["agotado", "agotada", "out", "empty", "0"].includes(text)) return "out";
  return "unknown";
}

function purchaseState(value) {
  const text = String(value || "REVISAR").trim().toUpperCase();
  return ["REVISAR", "COMPRAR", "COMPRADO"].includes(text) ? text : "REVISAR";
}

function inferCategory(product = {}) {
  const explicit = String(product.category || "").trim();
  const canonical = ["Proteínas", "Verduras", "Fruta", "Lácteos", "Conservas", "Salsas", "Pasta/arroz", "Snacks", "Bebidas", "Otros"];
  if (canonical.includes(explicit)) return explicit;

  const text = [product.name, product.category, product.format].filter(Boolean).join(" ").toLocaleLowerCase("es");
  if (/(pollo|pavo|at[uú]n|bonito|salm[oó]n|merluza|huevo|prote[ií]na|carne|jam[oó]n|pechuga)/.test(text)) return "Proteínas";
  if (/(tomate|lechuga|espinaca|br[oó]coli|verdura|calabac[ií]n|cebolla|pimiento|zanahoria)/.test(text)) return "Verduras";
  if (/(manzana|pl[aá]tano|banana|naranja|mandarina|fresa|fruta|pera|kiwi|uva|mel[oó]n|sand[ií]a)/.test(text)) return "Fruta";
  if (/(leche|yogur|queso|k[eé]fir|l[aá]cteo|reques[oó]n|skyr)/.test(text)) return "Lácteos";
  if (/(conserva|lata|tarro|legumbre cocida|ma[ií]z|esp[aá]rrago)/.test(text)) return "Conservas";
  if (/(salsa|mayonesa|ketchup|mostaza|vinagre|aceite|soja)/.test(text)) return "Salsas";
  if (/(pasta|arroz|espagueti|macarr[oó]n|fideo|cusc[uú]s|quinoa)/.test(text)) return "Pasta/arroz";
  if (/(snack|galleta|chocolate|patata|pico|fruto seco|barrita|palomita)/.test(text)) return "Snacks";
  if (/(agua|refresco|zumo|caf[eé]|bebida|cerveza|infusi[oó]n)/.test(text)) return "Bebidas";
  return "Otros";
}

async function resolvePantryIdFromPrivateRegistry(env, token) {
  if (!env.FINANCE_SHEET_ID) return null;

  const range = encodeURIComponent("IntegracionesPrivadas!A1:B20");
  const endpoint =
    "https://sheets.googleapis.com/v4/spreadsheets/" +
    encodeURIComponent(String(env.FINANCE_SHEET_ID).trim()) +
    "/values/" +
    range +
    "?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE";

  try {
    const response = await fetch(endpoint, {
      headers: { Authorization: "Bearer " + token }
    });
    if (!response.ok) return null;

    const rows = (await response.json())?.values || [];
    const entry = rows.find((row) => String(row?.[0] || "").trim() === "PANTRY_SHEET_ID");
    const value = String(entry?.[1] || "").trim();
    return /^[A-Za-z0-9_-]{20,}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

async function resolveSpreadsheetId(env, token) {
  if (env.PANTRY_SHEET_ID) return String(env.PANTRY_SHEET_ID).trim();
  if (cache.spreadsheetId && cache.spreadsheetIdExpiresAt > Date.now()) return cache.spreadsheetId;

  const privateRegistryId = await resolvePantryIdFromPrivateRegistry(env, token);
  if (privateRegistryId) {
    cache.spreadsheetId = privateRegistryId;
    cache.spreadsheetIdExpiresAt = Date.now() + 10 * 60_000;
    return privateRegistryId;
  }

  const params = new URLSearchParams({
    q: "name = 'SEGUNDO CEREBRO - DESPENSA' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
    fields: "files(id,name,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: "10"
  });
  const response = await fetch("https://www.googleapis.com/drive/v3/files?" + params.toString(), {
    headers: { Authorization: "Bearer " + token }
  });
  if (!response.ok) throw new Error("GOOGLE_DRIVE_" + response.status);
  const files = (await response.json())?.files || [];
  const sheet = files.find((item) => item?.name === "SEGUNDO CEREBRO - DESPENSA");
  if (!sheet?.id) throw new Error("PANTRY_SHEET_NOT_FOUND");

  cache.spreadsheetId = sheet.id;
  cache.spreadsheetIdExpiresAt = Date.now() + 10 * 60_000;
  return sheet.id;
}

function buildPayload(valueRanges = []) {
  const productRows = table(valueRanges[0]?.values || []);
  const inventoryRows = table(valueRanges[1]?.values || []);
  const priceRows = table(valueRanges[2]?.values || []);
  const ticketRows = table(valueRanges[3]?.values || []);
  const shoppingRows = table(valueRanges[4]?.values || []);

  const products = productRows.map((row) => ({
    id: String(row.producto_id || "").trim(),
    name: row.nombre_canonico || row.nombre || "Producto",
    brand: row.marca || null,
    store: row.comercio || null,
    category: row.categoria || null,
    format: row.formato || null,
    ean: row.ean || null,
    productUrl: row.url_producto || null,
    nutrition: {
      kcal100g: numberOrNull(row.kcal_100g),
      protein100g: numberOrNull(row.proteinas_g_100),
      carbs100g: numberOrNull(row.carbohidratos_g_100),
      fat100g: numberOrNull(row.grasas_g_100)
    },
    nutritionSource: row.fuente_nutricional || null,
    verification: row.verificacion || null,
    notes: row.notas || null,
    updatedAt: row.updated_at || null
  })).filter((item) => item.id);

  const productsById = new Map(products.map((item) => [item.id, item]));

  const prices = priceRows.map((row) => ({
    productId: String(row.producto_id || "").trim(),
    name: row.nombre || null,
    price: numberOrNull(row.precio),
    priceBase: row.base_precio || null,
    date: dateOrNull(row.fecha_precio),
    store: row.tienda || null,
    source: row.fuente || null,
    ticketId: row.ticket_id || null,
    productUrl: row.url_producto || null,
    notes: row.observaciones || null
  })).filter((item) => item.productId && item.price !== null);

  const pricesByProduct = new Map();
  for (const item of prices) {
    if (!pricesByProduct.has(item.productId)) pricesByProduct.set(item.productId, []);
    pricesByProduct.get(item.productId).push(item);
  }
  for (const rows of pricesByProduct.values()) {
    rows.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  }

  const inventory = inventoryRows.map((row) => {
    const productId = String(row.producto_id || "").trim();
    const product = productsById.get(productId) || {};
    const history = pricesByProduct.get(productId) || [];
    const latestPrice = history.length ? history[history.length - 1] : null;
    const ticketPrices = history.filter((item) => item.ticketId || /ticket/i.test(String(item.source || "")));
    const lastTicketPrice = ticketPrices.length ? ticketPrices[ticketPrices.length - 1] : null;
    const name = row.nombre || product.name || "Producto";
    return {
      inventoryId: row.inventario_id || null,
      productId,
      name,
      brand: product.brand || null,
      format: product.format || null,
      categoryLabel: inferCategory({ ...product, name }),
      location: normalizeLocation(row.ubicacion),
      quantity: numberOrNull(row.cantidad_aprox) ?? (row.cantidad_aprox === "" ? null : row.cantidad_aprox ?? null),
      quantityUnit: row.unidad_stock || null,
      stockStatus: normalizeStock(row.nivel_stock),
      opened: row.abierto || null,
      expiryVisible: dateOrNull(row.caducidad_visible),
      confidence: row.confianza || null,
      source: row.origen || null,
      lastReviewedAt: dateOrNull(row.ultima_revision),
      notes: row.notas || product.notes || null,
      productUrl: product.productUrl || latestPrice?.productUrl || null,
      latestPrice,
      lastTicketPrice,
      lastPurchaseDate: lastTicketPrice?.date || null,
      priceHistory: history.slice(-12),
      nutrition: product.nutrition || {},
      nutritionSource: product.nutritionSource || null
    };
  }).filter((item) => item.productId || item.inventoryId);

  const shoppingList = shoppingRows.map((row) => {
    const productId = String(row.producto_id || "").trim();
    const product = productsById.get(productId) || {};
    const history = pricesByProduct.get(productId) || [];
    const latestPrice = history.length ? history[history.length - 1] : null;
    const targetQuantity = numberOrNull(row.cantidad_objetivo) ?? (row.cantidad_objetivo || null);
    const unitPrice = numberOrNull(row.precio_estimado) ?? latestPrice?.price ?? null;
    const explicitCost = numberOrNull(row.coste_estimado);
    const targetNumber = numberOrNull(targetQuantity);
    const estimatedCost = explicitCost ?? (
      unitPrice !== null
        ? (targetNumber !== null && targetNumber > 0 ? unitPrice * targetNumber : unitPrice)
        : null
    );
    return {
      productId,
      name: row.nombre || product.name || "Producto",
      state: purchaseState(row.estado),
      priority: row.prioridad || null,
      targetQuantity,
      targetUnit: row.unidad || null,
      reason: row.motivo || null,
      estimatedUnitPrice: unitPrice,
      estimatedCost,
      source: row.fuente || null,
      updatedAt: row.updated_at || null
    };
  }).filter((item) => item.productId || item.name);

  const activeShopping = shoppingList.filter((item) => item.state !== "COMPRADO");
  const confirmedShopping = shoppingList.filter((item) => item.state === "COMPRAR");
  const reviewShopping = shoppingList.filter((item) => item.state === "REVISAR");
  const knownBasket = activeShopping.map((item) => item.estimatedCost).filter((value) => value !== null);
  const estimatedBasketTotal = knownBasket.length ? knownBasket.reduce((sum, value) => sum + value, 0) : null;
  const missingPriceCount = activeShopping.length - knownBasket.length;

  const availableProductCount = new Set(
    inventory
      .filter((item) => item.stockStatus !== "out")
      .map((item) => item.productId || item.inventoryId)
  ).size;
  const lowStockCount = inventory.filter((item) => ["low", "out"].includes(item.stockStatus)).length;
  const lastInventoryReview = inventory
    .map((item) => item.lastReviewedAt)
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  const locationSummary = ["Nevera", "Despensa", "Congelador", "Otros"].map((location) => {
    const rows = inventory.filter((item) => item.location === location);
    return {
      location,
      total: rows.length,
      available: rows.filter((item) => item.stockStatus !== "out").length,
      low: rows.filter((item) => ["low", "out"].includes(item.stockStatus)).length
    };
  });

  const fridge = locationSummary.find((item) => item.location === "Nevera");
  let fridgePhrase = "Nevera sin revisar";
  if (fridge?.total) {
    if (fridge.available <= 3 || fridge.low >= Math.ceil(fridge.total / 2)) fridgePhrase = "Nevera bastante vacía";
    else if (fridge.low >= 2) fridgePhrase = "Nevera con varias cosas por reponer";
    else fridgePhrase = "Nevera con stock razonable";
  }

  const euro = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2
  });
  const purchasePhrase = activeShopping.length
    ? estimatedBasketTotal !== null
      ? "próxima compra estimada " + euro.format(estimatedBasketTotal) + (missingPriceCount ? " + productos sin precio" : "")
      : "próxima compra aún sin precio"
    : "sin compra pendiente";
  const reviewPhrase = reviewShopping.length
    ? reviewShopping.length + (reviewShopping.length === 1 ? " cosa por revisar" : " cosas por revisar")
    : confirmedShopping.length
      ? confirmedShopping.length + (confirmedShopping.length === 1 ? " compra confirmada" : " compras confirmadas")
      : "sin reposiciones pendientes";

  const categories = [...new Set(inventory.map((item) => item.categoryLabel || "Otros"))]
    .sort((a, b) => a.localeCompare(b, "es"));

  return {
    summary: {
      availableProductCount,
      lowStockCount,
      pendingPurchaseCount: activeShopping.length,
      confirmedPurchaseCount: confirmedShopping.length,
      reviewCount: reviewShopping.length,
      estimatedBasketTotal,
      estimatedBasketPartial: missingPriceCount > 0,
      missingPriceCount,
      lastInventoryReview,
      currency: "EUR",
      homeMessage: [fridgePhrase, reviewPhrase, purchasePhrase].join(" · ")
    },
    items: inventory,
    shoppingList,
    locationSummary,
    categories,
    ticketSummary: {
      count: ticketRows.length,
      latestDate: ticketRows.map((row) => dateOrNull(row.fecha)).filter(Boolean).sort().at(-1) || null
    },
    source: {
      kind: "private-sheet",
      name: "SEGUNDO CEREBRO - DESPENSA",
      owner: "GESTOR DESPENSA Y SUMINISTROS"
    }
  };
}

export async function fetchPantrySummary(env, getGoogleAccessToken) {
  if (!hasPantryGoogleConfig(env)) return { status: "not-configured", value: null };
  if (cache.value && cache.expiresAt > Date.now()) return { status: "ok-cache", value: cache.value };

  const token = await getGoogleAccessToken(env);
  const spreadsheetId = await resolveSpreadsheetId(env, token);
  const ranges = [
    "Productos!A1:Q2000",
    "Inventario!A1:M2000",
    "Precios!A1:J4000",
    "Tickets!A1:G2000",
    "ListaCompra!A1:K2000"
  ];
  const params = new URLSearchParams();
  for (const range of ranges) params.append("ranges", range);
  params.set("majorDimension", "ROWS");
  params.set("valueRenderOption", "UNFORMATTED_VALUE");

  const endpoint =
    "https://sheets.googleapis.com/v4/spreadsheets/" +
    encodeURIComponent(spreadsheetId) +
    "/values:batchGet?" +
    params.toString();
  const response = await fetch(endpoint, {
    headers: { Authorization: "Bearer " + token }
  });
  if (!response.ok) throw new Error("GOOGLE_SHEETS_" + response.status);

  const payload = buildPayload((await response.json())?.valueRanges || []);
  cache.value = payload;
  cache.expiresAt = Date.now() + 30_000;
  return { status: "ok-live", value: payload };
}
