const SHEET_TITLE = "SEGUNDO CEREBRO - OBJETOS";
const SOURCE_KEY = "OBJECTS_SHEET_ID";
const CACHE_MS = 30_000;
const VISUAL_PROCESS_STATES = new Set(["pendiente", "procesada", "revisar"]);
const LOOK_ROLES = new Set(["superior", "exterior", "inferior", "calzado", "accesorio"]);

let cache = {
  value: null,
  expiresAt: 0,
  spreadsheetId: null,
  spreadsheetIdExpiresAt: 0,
  sourceMissingUntil: 0
};

export function hasObjectsGoogleConfig(env) {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN);
}

function table(values = []) {
  if (!values.length) return [];
  const headers = values[0].map((value) => String(value ?? "").trim());
  return values.slice(1)
    .filter((row) => row.some((value) => value !== "" && value !== null && value !== undefined))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row?.[index] ?? null])));
}

function value(row, ...keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") return row[key];
  }
  return null;
}

function numberOrNull(input) {
  if (input === null || input === undefined || input === "") return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  const normalized = String(input).trim().replace(/\s/g, "").replace(",", ".");
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}

function boolOrNull(input) {
  if (input === null || input === undefined || input === "") return null;
  const text = String(input).trim().toLowerCase();
  if (["1", "true", "sí", "si", "yes", "y", "x"].includes(text)) return true;
  if (["0", "false", "no", "n"].includes(text)) return false;
  return null;
}

function dateOrNull(input) {
  if (input === null || input === undefined || input === "") return null;
  if (typeof input === "number" && Number.isFinite(input)) {
    const date = new Date(Date.UTC(1899, 11, 30) + input * 86400000);
    return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
  }
  const text = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const es = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (es) return es[3] + "-" + String(es[2]).padStart(2, "0") + "-" + String(es[1]).padStart(2, "0");
  const parsed = new Date(text);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
}

function list(input) {
  if (input === null || input === undefined || input === "") return [];
  return String(input).split(/[|;,]/).map((item) => item.trim()).filter(Boolean);
}

export function inferWardrobeLayer(input) {
  const text = String(input || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/zapato|zapatilla|sneaker|mocasin|alpargata|bota|sandalia|calzado/.test(text)) return "calzado";
  if (/pantalon|vaquero|chino|short|bermuda|falda/.test(text)) return "inferior";
  if (/abrigo|chaqueta|blazer|cazadora|parka|trench|rebeca/.test(text)) return "exterior";
  if (/camisa|camiseta|polo|jersey|sudadera|top/.test(text)) return "superior";
  if (/cinturon|gorra|sombrero|bufanda|reloj|bolso|mochila|gafas|accesorio/.test(text)) return "accesorio";
  return null;
}

export function normalizeLookRole(input) {
  const text = String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  const aliases = {
    "capa superior": "superior",
    "parte superior": "superior",
    "capa exterior": "exterior",
    "prenda exterior": "exterior",
    "capa inferior": "inferior",
    "parte inferior": "inferior",
    "zapatos": "calzado",
    "zapatillas": "calzado",
    "complemento": "accesorio"
  };
  return aliases[text] || text;
}

function visualProcessState(input, hasProcessedImage = false) {
  const raw = String(input || "").trim().toLowerCase();
  if (VISUAL_PROCESS_STATES.has(raw)) return raw;
  return hasProcessedImage ? "procesada" : "pendiente";
}

function visualImageUrl(...values) {
  for (const item of values) {
    const text = String(item || "").trim();
    if (text) return text;
  }
  return null;
}

function objectStatus(input) {
  const raw = String(input || "DISPONIBLE").trim().toUpperCase().replace(/\s+/g, "_");
  const aliases = {
    REPARACION: "REPARACIÓN",
    EN_REPARACION: "REPARACIÓN",
    EN_REPARACIÓN: "REPARACIÓN",
    TIRADO: "DESCARTADO",
    DESECHADO: "DESCARTADO"
  };
  const normalized = aliases[raw] || raw;
  const allowed = new Set(["DISPONIBLE", "EN_USO", "PRESTADO", "REPARACIÓN", "VENDIDO", "DONADO", "DESCARTADO", "PERDIDO"]);
  return allowed.has(normalized) ? normalized : "DISPONIBLE";
}

function listImportance(input) {
  const text = String(input || "RECOMENDADO").trim().toUpperCase().replace(/\s+/g, "_");
  return ["NECESARIO", "RECOMENDADO", "OPCIONAL"].includes(text) ? text : "RECOMENDADO";
}

function packingState(input) {
  const raw = String(input || "SELECCIONADO").trim().toUpperCase().replace(/\s+/g, "_");
  const aliases = { PREPARADO_EN_MALETA: "PREPARADO", METIDO: "PREPARADO", COMPRAR: "FALTA_COMPRAR" };
  const text = aliases[raw] || raw;
  return ["FALTA_COMPRAR", "SELECCIONADO", "PREPARADO", "DESCARTADO"].includes(text) ? text : "SELECCIONADO";
}

async function resolveFromPrivateRegistry(env, token) {
  if (!env.FINANCE_SHEET_ID) return null;
  const range = encodeURIComponent("IntegracionesPrivadas!A1:B50");
  const endpoint =
    "https://sheets.googleapis.com/v4/spreadsheets/" +
    encodeURIComponent(String(env.FINANCE_SHEET_ID).trim()) +
    "/values/" + range +
    "?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE";

  try {
    const response = await fetch(endpoint, { headers: { Authorization: "Bearer " + token } });
    if (!response.ok) return null;
    const rows = (await response.json())?.values || [];
    const found = rows.find((row) => String(row?.[0] || "").trim() === SOURCE_KEY);
    const id = String(found?.[1] || "").trim();
    return /^[A-Za-z0-9_-]{20,}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

async function resolveSpreadsheetId(env, token) {
  if (env.OBJECTS_SHEET_ID) return String(env.OBJECTS_SHEET_ID).trim();
  if (cache.spreadsheetId && cache.spreadsheetIdExpiresAt > Date.now()) return cache.spreadsheetId;
  if (cache.sourceMissingUntil > Date.now()) return null;

  const registered = await resolveFromPrivateRegistry(env, token);
  if (registered) {
    cache.spreadsheetId = registered;
    cache.spreadsheetIdExpiresAt = Date.now() + 10 * 60_000;
    return registered;
  }

  const params = new URLSearchParams({
    q: "name = '" + SHEET_TITLE + "' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
    fields: "files(id,name,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: "10"
  });
  const response = await fetch("https://www.googleapis.com/drive/v3/files?" + params.toString(), {
    headers: { Authorization: "Bearer " + token }
  });
  if (!response.ok) throw new Error("GOOGLE_DRIVE_" + response.status);
  const files = (await response.json())?.files || [];
  const sheet = files.find((item) => item?.name === SHEET_TITLE);
  if (!sheet?.id) {
    cache.sourceMissingUntil = Date.now() + 5 * 60_000;
    return null;
  }

  cache.spreadsheetId = sheet.id;
  cache.spreadsheetIdExpiresAt = Date.now() + 10 * 60_000;
  return sheet.id;
}

export async function resolveObjectsSpreadsheetId(env, token) {
  return resolveSpreadsheetId(env, token);
}

export function invalidateObjectsCache() {
  cache.value = null;
  cache.expiresAt = 0;
}

async function sheetTitles(spreadsheetId, token) {
  const endpoint =
    "https://sheets.googleapis.com/v4/spreadsheets/" +
    encodeURIComponent(spreadsheetId) +
    "?fields=sheets.properties.title";
  const response = await fetch(endpoint, { headers: { Authorization: "Bearer " + token } });
  if (!response.ok) throw new Error("GOOGLE_SHEETS_META_" + response.status);
  return new Set(((await response.json())?.sheets || []).map((sheet) => sheet?.properties?.title).filter(Boolean));
}

async function readRows(spreadsheetId, token, titles, tab, range) {
  if (!titles.has(tab)) return [];
  const encoded = encodeURIComponent(tab + "!" + range);
  const endpoint =
    "https://sheets.googleapis.com/v4/spreadsheets/" +
    encodeURIComponent(spreadsheetId) +
    "/values/" + encoded +
    "?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE";
  const response = await fetch(endpoint, { headers: { Authorization: "Bearer " + token } });
  if (!response.ok) throw new Error("GOOGLE_SHEETS_" + response.status + "_" + tab);
  return table((await response.json())?.values || []);
}

function emptyPayload() {
  return {
    summary: null,
    objects: [],
    wardrobe: [],
    looks: [],
    kits: [],
    lists: [],
    facets: { categories: [], locations: [], statuses: [], garmentTypes: [], seasons: [], contexts: [], brands: [], colors: [], formalities: [], layers: [] },
    source: {
      kind: "private-sheet",
      name: SHEET_TITLE,
      owner: "GESTOR OBJETOS Y ARMARIO",
      available: false,
      contractVersion: "0.3"
    }
  };
}

function buildPayload(rows) {
  const objects = rows.objects.map((row) => {
    const id = String(value(row, "objeto_id", "id") || "").trim();
    return {
      id,
      name: value(row, "nombre", "name"),
      category: value(row, "categoria", "category") || "Otros",
      subcategory: value(row, "subcategoria", "subcategory"),
      brand: value(row, "marca", "brand"),
      model: value(row, "modelo", "model"),
      quantity: numberOrNull(value(row, "cantidad", "quantity")) ?? 1,
      location: value(row, "ubicacion", "location"),
      status: objectStatus(value(row, "estado", "status")),
      condition: value(row, "condicion", "condición", "condition"),
      purchaseDate: dateOrNull(value(row, "fecha_compra", "purchase_date")),
      purchasePrice: numberOrNull(value(row, "precio_compra", "precio", "purchase_price")),
      estimatedValue: numberOrNull(value(row, "valor_aprox", "valor_aproximado", "estimated_value")),
      currency: value(row, "moneda", "currency") || "EUR",
      serialNumber: value(row, "numero_serie", "número_serie", "serial_number"),
      warrantyUntil: dateOrNull(value(row, "garantia_hasta", "garantía_hasta", "warranty_until")),
      receiptRef: value(row, "factura_ref", "recibo_ref", "receipt_ref"),
      photoUrl: value(row, "foto_url", "photo_url"),
      link: value(row, "enlace", "url", "link"),
      tags: list(value(row, "etiquetas", "tags")),
      contexts: list(value(row, "contextos", "usos", "contexts")),
      disposition: value(row, "salida_sugerida", "disposition"),
      notes: value(row, "notas", "notes"),
      createdAt: dateOrNull(value(row, "created_at", "fecha_alta")),
      updatedAt: dateOrNull(value(row, "updated_at", "fecha_revision"))
    };
  }).filter((item) => item.id && item.name);

  const byId = new Map(objects.map((item) => [item.id, item]));

  const wardrobe = rows.wardrobe.map((row) => {
    const objectId = String(value(row, "objeto_id", "id") || "").trim();
    const base = byId.get(objectId) || {};
    return {
      objectId,
      name: base.name || value(row, "nombre", "name"),
      category: base.category || "Ropa",
      subcategory: base.subcategory || value(row, "tipo_prenda", "subcategoria"),
      brand: base.brand || value(row, "marca"),
      status: base.status || objectStatus(value(row, "estado")),
      location: base.location || value(row, "ubicacion"),
      photoUrl: visualImageUrl(
        value(row, "miniatura_url", "thumbnail_url"),
        value(row, "foto_procesada_url", "processed_photo_url"),
        value(row, "foto_original_url", "original_photo_url"),
        base.photoUrl,
        value(row, "foto_url", "photo_url")
      ),
      originalPhotoUrl: visualImageUrl(value(row, "foto_original_url", "original_photo_url"), base.photoUrl),
      processedPhotoUrl: visualImageUrl(value(row, "foto_procesada_url", "processed_photo_url")),
      thumbnailUrl: visualImageUrl(value(row, "miniatura_url", "thumbnail_url")),
      processedState: visualProcessState(
        value(row, "estado_procesado", "processed_state"),
        Boolean(value(row, "foto_procesada_url", "processed_photo_url"))
      ),
      garmentView: value(row, "vista_prenda", "garment_view"),
      color: value(row, "color"),
      primaryColor: value(row, "color_principal", "primary_color") || value(row, "color"),
      pattern: value(row, "patron", "patrón", "pattern"),
      visualCategory: value(row, "categoria_visual", "categoría_visual", "visual_category"),
      layer: value(row, "capa", "layer") || inferWardrobeLayer([base.subcategory, value(row, "tipo_prenda", "subcategoria"), base.name].filter(Boolean).join(" ")),
      visualUpdatedAt: dateOrNull(value(row, "ultima_actualizacion_visual", "última_actualizacion_visual", "visual_updated_at")),
      size: value(row, "talla", "size"),
      season: value(row, "temporada", "season"),
      formality: value(row, "formalidad", "formality"),
      contexts: list(value(row, "contextos", "contexts")).length ? list(value(row, "contextos", "contexts")) : (base.contexts || []),
      office: boolOrNull(value(row, "oficina", "office")),
      lastUsed: dateOrNull(value(row, "ultimo_uso", "último_uso", "last_used")),
      useCount: numberOrNull(value(row, "frecuencia_uso", "veces_usado", "use_count")),
      compatibleWith: list(value(row, "compatible_con", "compatible_with")),
      notes: value(row, "notas", "notes") || base.notes || null
    };
  }).filter((item) => item.objectId && item.name);

  const lookItems = new Map();
  for (const row of rows.lookItems) {
    const lookId = String(value(row, "look_id") || "").trim();
    if (!lookId) continue;
    if (!lookItems.has(lookId)) lookItems.set(lookId, []);
    const objectId = String(value(row, "objeto_id") || "").trim();
    lookItems.get(lookId).push({
      objectId: objectId || null,
      name: byId.get(objectId)?.name || value(row, "nombre"),
      role: normalizeLookRole(value(row, "rol", "role"))
    });
  }

  const looks = rows.looks.map((row) => {
    const id = String(value(row, "look_id", "id") || "").trim();
    return {
      id,
      name: value(row, "nombre", "name"),
      items: lookItems.get(id) || [],
      photoUrl: value(row, "foto_url", "photo_url"),
      context: value(row, "contexto", "context"),
      formality: value(row, "formalidad", "formality"),
      season: value(row, "temporada", "season"),
      climate: value(row, "clima", "temperatura", "climate"),
      office: boolOrNull(value(row, "oficina", "office")),
      lastUsed: dateOrNull(value(row, "ultimo_uso", "último_uso", "last_used")),
      useCount: numberOrNull(value(row, "veces_usado", "use_count")),
      usageHistory: list(value(row, "historico_usos", "histórico_usos", "usage_history")),
      notes: value(row, "notas", "notes")
    };
  }).filter((item) => item.id && item.name);

  const relatedLookIds = new Map();
  for (const look of looks) {
    for (const item of look.items || []) {
      if (!item.objectId) continue;
      if (!relatedLookIds.has(item.objectId)) relatedLookIds.set(item.objectId, []);
      relatedLookIds.get(item.objectId).push(look.id);
    }
  }
  for (const item of wardrobe) {
    item.relatedLookIds = relatedLookIds.get(item.objectId) || [];
  }

  const kitItems = new Map();
  for (const row of rows.kitItems) {
    const kitId = String(value(row, "kit_id") || "").trim();
    if (!kitId) continue;
    if (!kitItems.has(kitId)) kitItems.set(kitId, []);
    const objectId = String(value(row, "objeto_id") || "").trim();
    kitItems.get(kitId).push({
      objectId: objectId || null,
      name: byId.get(objectId)?.name || value(row, "nombre", "necesidad"),
      quantity: numberOrNull(value(row, "cantidad", "quantity")) ?? 1,
      importance: listImportance(value(row, "importancia", "importance")),
      notes: value(row, "notas", "notes")
    });
  }

  const kits = rows.kits.map((row) => {
    const id = String(value(row, "kit_id", "id") || "").trim();
    return {
      id,
      name: value(row, "nombre", "name"),
      description: value(row, "descripcion", "descripción", "description"),
      context: value(row, "contexto", "context"),
      tags: list(value(row, "etiquetas", "tags")),
      items: kitItems.get(id) || [],
      updatedAt: dateOrNull(value(row, "updated_at", "fecha_revision"))
    };
  }).filter((item) => item.id && item.name);

  const listItems = new Map();
  for (const row of rows.listItems) {
    const listId = String(value(row, "lista_id") || "").trim();
    if (!listId) continue;
    if (!listItems.has(listId)) listItems.set(listId, []);
    const objectId = String(value(row, "objeto_id") || "").trim();
    listItems.get(listId).push({
      objectId: objectId || null,
      name: byId.get(objectId)?.name || value(row, "nombre", "necesidad"),
      quantity: numberOrNull(value(row, "cantidad", "quantity")) ?? 1,
      importance: listImportance(value(row, "importancia", "importance")),
      state: packingState(value(row, "estado", "state")),
      sourceKitId: value(row, "kit_id", "source_kit_id"),
      notes: value(row, "notas", "notes")
    });
  }

  const contextLists = rows.lists.map((row) => {
    const id = String(value(row, "lista_id", "id") || "").trim();
    return {
      id,
      name: value(row, "nombre", "name"),
      context: value(row, "contexto", "context"),
      eventRef: value(row, "evento_ref", "event_ref"),
      destination: value(row, "destino", "destination"),
      startDate: dateOrNull(value(row, "fecha_inicio", "start_date")),
      endDate: dateOrNull(value(row, "fecha_fin", "end_date")),
      climate: value(row, "clima", "climate"),
      activities: list(value(row, "actividades", "activities")),
      status: value(row, "estado", "status") || "ACTIVA",
      items: listItems.get(id) || [],
      updatedAt: dateOrNull(value(row, "updated_at", "fecha_revision")),
      notes: value(row, "notas", "notes")
    };
  }).filter((item) => item.id && item.name);

  const activeObjects = objects.filter((item) => !["VENDIDO", "DONADO", "DESCARTADO", "PERDIDO"].includes(item.status));
  const apparel = activeObjects.filter((item) => /ropa|calzado|zapato|zapatilla|armario/i.test([item.category, item.subcategory].filter(Boolean).join(" ")));
  const electronics = activeObjects.filter((item) => /electr[oó]nica|ordenador|m[oó]vil|tablet|audio|c[aá]mara|cargador/i.test([item.category, item.subcategory].filter(Boolean).join(" ")));
  const repair = activeObjects.filter((item) => item.status === "REPARACIÓN");
  const loaned = activeObjects.filter((item) => item.status === "PRESTADO");
  const disposition = activeObjects.filter((item) => /vender|donar|tirar|descartar/i.test(String(item.disposition || "")));
  const activeLists = contextLists.filter((item) => !/cerrad|complet|archivad/i.test(String(item.status || "")));
  const latest = [...objects]
    .filter((item) => item.createdAt || item.purchaseDate)
    .sort((a, b) => String(b.createdAt || b.purchaseDate).localeCompare(String(a.createdAt || a.purchaseDate)))
    .slice(0, 6);

  const locations = new Map();
  for (const item of activeObjects) {
    const key = item.location || "Sin ubicación";
    locations.set(key, (locations.get(key) || 0) + 1);
  }

  const categories = [...new Set(objects.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const locationNames = [...locations.keys()].sort((a, b) => a.localeCompare(b, "es"));
  const statuses = [...new Set(objects.map((item) => item.status).filter(Boolean))].sort();
  const garmentTypes = [...new Set(wardrobe.map((item) => item.subcategory).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const seasons = [...new Set(wardrobe.map((item) => item.season).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const brands = [...new Set(wardrobe.map((item) => item.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const colors = [...new Set(wardrobe.map((item) => item.primaryColor || item.color).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const formalities = [...new Set(wardrobe.map((item) => item.formality).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const layers = [...new Set(wardrobe.map((item) => item.layer).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const contexts = [...new Set([
    ...objects.flatMap((item) => item.contexts || []),
    ...looks.map((item) => item.context).filter(Boolean),
    ...kits.map((item) => item.context).filter(Boolean)
  ])].sort((a, b) => a.localeCompare(b, "es"));

  return {
    summary: {
      totalObjects: activeObjects.length,
      wardrobeCount: Math.max(apparel.length, wardrobe.length),
      electronicsCount: electronics.length,
      repairCount: repair.length,
      loanedCount: loaned.length,
      dispositionReviewCount: disposition.length,
      activeListCount: activeLists.length,
      lookCount: looks.length,
      kitCount: kits.length,
      visualWardrobe: {
        processed: wardrobe.filter((item) => item.processedState === "procesada").length,
        pending: wardrobe.filter((item) => item.processedState === "pendiente").length,
        review: wardrobe.filter((item) => item.processedState === "revisar").length
      },
      latestAdditions: latest.map((item) => ({ id: item.id, name: item.name, date: item.createdAt || item.purchaseDate })),
      locations: [...locations.entries()].map(([location, count]) => ({ location, count })),
      upcomingContexts: activeLists
        .filter((item) => item.startDate)
        .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))
        .slice(0, 5)
        .map((item) => ({ id: item.id, name: item.name, startDate: item.startDate, destination: item.destination }))
    },
    objects,
    wardrobe,
    looks,
    kits,
    lists: contextLists,
    facets: { categories, locations: locationNames, statuses, garmentTypes, seasons, contexts, brands, colors, formalities, layers },
    source: {
      kind: "private-sheet",
      name: SHEET_TITLE,
      owner: "GESTOR OBJETOS Y ARMARIO",
      available: true,
      contractVersion: "0.3"
    }
  };
}

export async function fetchObjectsSummary(env, getGoogleAccessToken) {
  if (!hasObjectsGoogleConfig(env)) return { status: "not-configured", value: emptyPayload() };
  if (cache.value && cache.expiresAt > Date.now()) return { status: "ok-cache", value: cache.value };

  const token = await getGoogleAccessToken(env);
  const spreadsheetId = await resolveSpreadsheetId(env, token);
  if (!spreadsheetId) return { status: "source-pending", value: emptyPayload() };

  const titles = await sheetTitles(spreadsheetId, token);
  const [objects, wardrobe, looks, lookItems, kits, kitItems, lists, listItems] = await Promise.all([
    readRows(spreadsheetId, token, titles, "Objetos", "A1:AZ5000"),
    readRows(spreadsheetId, token, titles, "Armario", "A1:AZ5000"),
    readRows(spreadsheetId, token, titles, "Looks", "A1:AZ2000"),
    readRows(spreadsheetId, token, titles, "LookItems", "A1:AZ10000"),
    readRows(spreadsheetId, token, titles, "Kits", "A1:AZ2000"),
    readRows(spreadsheetId, token, titles, "KitItems", "A1:AZ10000"),
    readRows(spreadsheetId, token, titles, "Listas", "A1:AZ2000"),
    readRows(spreadsheetId, token, titles, "ListaItems", "A1:AZ10000")
  ]);

  const payload = buildPayload({ objects, wardrobe, looks, lookItems, kits, kitItems, lists, listItems });
  cache.value = payload;
  cache.expiresAt = Date.now() + CACHE_MS;
  return { status: "ok-live", value: payload };
}


async function appendSheetRows(spreadsheetId, token, tab, rows) {
  if (!Array.isArray(rows) || !rows.length) return;
  const range = encodeURIComponent(tab + "!A:Z");
  const endpoint =
    "https://sheets.googleapis.com/v4/spreadsheets/" +
    encodeURIComponent(spreadsheetId) +
    "/values/" + range +
    ":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values: rows })
  });
  if (!response.ok) throw new Error("GOOGLE_SHEETS_APPEND_" + response.status + "_" + tab);
}

export function validateObjectsLookSelection(wardrobe = [], rawItems = []) {
  const byId = new Map((Array.isArray(wardrobe) ? wardrobe : []).map((item) => [String(item.objectId), item]));
  const normalized = (Array.isArray(rawItems) ? rawItems : [])
    .map((item) => ({
      objectId: String(item?.objectId || "").trim(),
      role: normalizeLookRole(item?.role)
    }))
    .filter((item) => item.objectId || item.role);

  if (normalized.length < 3 || normalized.length > 5) throw new Error("INVALID_OBJECTS_LOOK_ITEMS");
  const seenRoles = new Set();
  for (const item of normalized) {
    if (!LOOK_ROLES.has(item.role)) throw new Error("INVALID_OBJECTS_LOOK_ROLE");
    if (seenRoles.has(item.role)) throw new Error("INVALID_OBJECTS_LOOK_DUPLICATE_ROLE");
    seenRoles.add(item.role);
    const garment = byId.get(item.objectId);
    if (!garment) throw new Error("INVALID_OBJECTS_LOOK_OBJECT");
    if (["VENDIDO", "DONADO", "DESCARTADO", "PERDIDO"].includes(String(garment.status || ""))) {
      throw new Error("INVALID_OBJECTS_LOOK_OBJECT_STATUS");
    }
    const garmentLayer = normalizeLookRole(garment.layer || inferWardrobeLayer([garment.subcategory, garment.name].filter(Boolean).join(" ")));
    if (garmentLayer && garmentLayer !== item.role) {
      throw new Error("INVALID_OBJECTS_LOOK_LAYER");
    }
  }
  for (const required of ["superior", "inferior", "calzado"]) {
    if (!seenRoles.has(required)) throw new Error("INVALID_OBJECTS_LOOK_INCOMPLETE");
  }
  return normalized;
}

export async function createObjectsLook(env, getGoogleAccessToken, payload = {}) {
  if (!hasObjectsGoogleConfig(env)) throw new Error("OBJECTS_NOT_CONFIGURED");
  const token = await getGoogleAccessToken(env);
  const spreadsheetId = await resolveSpreadsheetId(env, token);
  if (!spreadsheetId) throw new Error("OBJECTS_SOURCE_PENDING");

  const current = await fetchObjectsSummary(env, getGoogleAccessToken);
  const wardrobe = Array.isArray(current.value?.wardrobe) ? current.value.wardrobe : [];
  const normalized = validateObjectsLookSelection(wardrobe, payload.items);

  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);
  const id = "look-visual-" + dateKey.replaceAll("-", "") + "-" + crypto.randomUUID().slice(0, 8);
  const requestedName = String(payload.name || "").trim();
  const name = requestedName || ("Look visual · " + dateKey);
  const context = String(payload.context || "").trim();
  const formality = String(payload.formality || "").trim();
  const season = String(payload.season || "").trim();
  const climate = String(payload.climate || "").trim();
  const office = payload.office === true ? "sí" : payload.office === false ? "no" : "";
  const notes = String(payload.notes || "").trim() || "Creado desde el combinador visual de Segundo Cerebro.";

  await appendSheetRows(spreadsheetId, token, "Looks", [[
    id,
    name,
    "",
    context,
    formality,
    season,
    climate,
    office,
    "",
    0,
    "",
    notes
  ]]);
  await appendSheetRows(
    spreadsheetId,
    token,
    "LookItems",
    normalized.map((item) => [id, item.objectId, item.role])
  );

  cache.value = null;
  cache.expiresAt = 0;
  return {
    id,
    name,
    itemCount: normalized.length,
    source: { kind: "private-sheet", name: SHEET_TITLE }
  };
}
