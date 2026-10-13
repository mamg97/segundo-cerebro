// Only deterministic, non-identifying control codes may reach public Actions logs.
// All raw names/details (including page DOM and URL paths) remain process-local.
const categories = [
  [/^MIDAS\b/i, "MIDAS"], [/^Finanzas\b/i, "FINANCE"],
  [/^(Salud|Gym|M[eé]dicos|Recetas|Health)\b/i, "HEALTH"],
  [/^(Nutrici[oó]n|Men[uú]|Home.*(?:kcal|prote[ií]na))\b/i, "NUTRITION"],
  [/^Despensa\b/i, "PANTRY"], [/^(Objetos|Armario|Looks|Look)\b/i, "OBJECTS"],
  [/^(Visual|Paleta|Contraste)\b/i, "VISUAL"],
  [/^(Calendario|Agenda|Evento)\b/i, "CALENDAR"],
  [/^(Proyectos|Carrera)\b/i, "WORKSPACE"],
  [/^(API|Fuente|Estado privado|Producci[oó]n|Sin respuestas|Sin errores|Recuperaci[oó]n|Auditor[ií]a)\b/i, "INFRA"]
];
export function safeAuditLog(kind, ordinal, untrustedName, _untrustedDetail) {
  const level = ["PASS", "FAIL", "INFO"].includes(kind) ? kind : "INFO";
  const id = Number.isSafeInteger(ordinal) && ordinal >= 0 ? ordinal : 0;
  const section = categories.find(([pattern]) => pattern.test(String(untrustedName || "")))?.[1] || "OTHER";
  return `[${level}] ${section} CHECK-${String(id).padStart(5, "0")}`;
}


// These identifiers are literal source-code check descriptions, never DOM/API values.
// Only known, fixed labels may become diagnostic codes in public Actions logs.
const knownFailureCodes = new Map([
  ["Home · motivo de pausa Gym breve", "HOME_GYM_PAUSE"],
  ["Home · Peso coincide con última medición real", "HOME_WEIGHT_PARITY"],
  ["Home · Peso muestra fuente y fecha de medición", "HOME_WEIGHT_FRESHNESS"],
  ["Patrimonio · benchmark préstamo vs inversión visible en Home", "HOME_LOAN_BENCHMARK_PRESENT"],
  ["Patrimonio · benchmark visible y accionable", "HOME_LOAN_BENCHMARK_VISIBLE"],
  ["Patrimonio · benchmark sin valores inválidos", "HOME_LOAN_BENCHMARK_VALID"],
  ["Patrimonio · benchmark abre detalle", "HOME_LOAN_BENCHMARK_OPEN"],
  ["Patrimonio · detalle muestra comparación financiera", "HOME_LOAN_BENCHMARK_DETAIL"],
  ["Home · ECI ya no ocupa tarjeta independiente", "HOME_ECI_DETACHED"],
  ["Home · ECI integrado en Obligaciones activas", "HOME_ECI_INTEGRATED"],
  ["Regalos · panel visible", "HOME_GIFTS_VISIBLE"],
  ["Regalos · sobre actual y bodas futuras disponibles", "HOME_GIFTS_SUMMARY"],
  ["Regalos · estructura de sobre, fondos y bodas", "HOME_GIFTS_STRUCTURE"],
  ["Regalos · tipografía compacta pero legible", "HOME_GIFTS_TYPOGRAPHY"],
  ["Regalos · sin overflow", "HOME_GIFTS_OVERFLOW"],
  ["Home · Despensa y Objetos compactos", "HOME_CARDS_COMPACT"],
  ["Home · tarjetas contiguas Despensa/Objetos tienen el mismo tamaño", "HOME_CARDS_EQUAL"],
  ["Home · bloques financieros contiguos usan altura equilibrada", "HOME_FINANCE_LAYOUT"],
  ["Home · Patrimonio y columna Obligaciones/Regalos alineados", "HOME_FINANCE_ALIGN"],
  ["Home · Regalos ocupa el hueco bajo Obligaciones sin solape", "HOME_GIFTS_GAP"],
  ["Salud · Resumen usa los cinco KPIs del Home", "HEALTH_OVERVIEW_KPIS"],
  ["Salud · Resumen conserva cuatro anillos y Peso estático", "HEALTH_OVERVIEW_RINGS"],
  ["Salud · composición muestra freshness/cobertura por métrica", "HEALTH_BODY_FRESHNESS"],
  ["Salud · Resumen integra Adherencia mensual", "HEALTH_ADHERENCE_SUMMARY"],
  ["Salud · Adherencia compacta muestra métricas clave", "HEALTH_ADHERENCE_METRICS"],
  ["Salud · Adherencia ofrece detalle mensual desde Resumen", "HEALTH_ADHERENCE_EXPAND"],
  ["Salud · API expone histórico de balance calórico de 30 días", "HEALTH_CALORIE_HISTORY"],
  ["Salud · Resumen muestra gráfica de balance calórico", "HEALTH_CALORIE_CHART"],
  ["Salud · gráfica conserva eje cero", "HEALTH_CALORIE_ZERO_LINE"],
  ["Salud · gráfica muestra treinta días", "HEALTH_CALORIE_DAY_COUNT"],
  ["Salud · gráfica de 30 días permite scroll horizontal contenido", "HEALTH_CALORIE_SCROLL"],
  ["Salud · gráfica explica verde negativo y rojo positivo", "HEALTH_CALORIE_LEGEND"],
  ["Salud · gráfica representa los treinta registros más recientes", "HEALTH_CALORIE_PARITY"],
  ["Salud · Resumen expone selector de fecha y balance diario visible", "HEALTH_DATE_SELECTOR"],
  ["Salud · fecha del balance coincide con la API", "HEALTH_DATE_PARITY"],
  ["Salud · selector recupera fecha anterior sin cambiar registros", "HEALTH_DATE_PREVIOUS"],
  ["Salud · volver a Hoy restaura fecha y balance", "HEALTH_DATE_TODAY"],
  ["Salud · Gym conserva Mi plan", "HEALTH_GYM_PLAN"],
  ["Salud · Gym ofrece Biblioteca de ejercicios", "HEALTH_GYM_LIBRARY"],
  ["Salud · Gym biblioteca termina de cargar", "HEALTH_GYM_LIBRARY_LOAD"],
  ["Salud · Gym biblioteca declara fuente libre y coste cero", "HEALTH_GYM_LIBRARY_SOURCE"],
  ["Salud · Gym biblioteca devuelve ejercicios", "HEALTH_GYM_LIBRARY_ROWS"],
  ["Salud · Gym ofrece GIF propios por variante, sin duplicados", "HEALTH_GYM_GIF_COUNT"],
  ["Salud · Gym inventario coincide con las variantes GIF vigentes", "HEALTH_GYM_GIF_INVENTORY"],
  ["Salud · Gym distingue GIF realmente publicado de vídeo verificado", "HEALTH_GYM_GIF_STATUS"],
  ["Salud · Gym ejercicio muestra recurso visual", "HEALTH_GYM_VISUAL"],
  ["Salud · Gym abre ficha visual de ejercicio", "HEALTH_GYM_DETAIL"],
  ["Salud · Gym ficha tiene demostración/referencia visual", "HEALTH_GYM_DETAIL_MEDIA"],
  ["Salud · Gym ficha con GIF incluye instrucciones visibles", "HEALTH_GYM_EXPLANATION"],
  ["Salud · Gym declara explícitamente disponibilidad de vídeo en la ficha", "HEALTH_GYM_VIDEO_STATUS"],
  ["Salud · Gym ficha conserva atribución según procedencia", "HEALTH_GYM_ATTRIBUTION"],
  ["Salud · Gym solo permite añadir desde fichas con ID real wger", "HEALTH_GYM_ADD_SOURCE"],
  ["Sin respuestas 5xx ni fallos de red", "INFRA_NETWORK_FAILURES"]
]);
export function safeAuditDiagnosticCode(name) {
  const value=String(name || "");
  if (knownFailureCodes.has(value)) return knownFailureCodes.get(value);
  // All returned identifiers are fixed constants, never arbitrary tab names or DOM text.
  const overviewParity = value.match(/^Salud · Resumen (habits|kcal|protein|gym|weight) coincide con Home$/);
  if (overviewParity) return "HEALTH_OVERVIEW_PARITY_" + overviewParity[1].toUpperCase();
  if (/^Visual .* · imágenes cargadas$/.test(value)) return "VISUAL_IMAGES_FAILED";
  if (/^Visual .* · texto sin clipping$/.test(value)) return "VISUAL_TEXT_CLIPPED";
  if (/^Visual .* · sin solapes$/.test(value)) return "VISUAL_OVERLAPS";
  if (/^Visual .* · componentes dentro de su tarjeta$/.test(value)) return "VISUAL_CARD_OVERFLOW";
  if (/^Visual .* · imágenes sin deformación$/.test(value)) return "VISUAL_IMAGES_DISTORTED";
  if (/^Visual .* · contenido dentro del viewport$/.test(value)) return "VISUAL_OUT_OF_BOUNDS";
  if (/^Finanzas · movimientos por cuenta · pestaña .* activa$/.test(value)) return "FINANCE_TAB_ACTIVE";
  if (/^Finanzas · movimientos por cuenta · panel .* visible$/.test(value)) return "FINANCE_TAB_PANEL";
  if (/^Finanzas · movimientos por cuenta · pestaña .* · desapareció tras render$/.test(value)) return "FINANCE_TAB_MISSING";
  if (/^Finanzas · enlace al Sheet de movimientos visible$/.test(value)) return "FINANCE_SHEET_LINK";
  return "CHECK_UNMAPPED";
}
const failureFamilies = [
  // Keep route families fixed and non-identifying; never emit recipe, user or record IDs.
  // This distinguishes intermittent recipe-media errors from core Health API failures.
  [/^\/api\/health\/overview$/, "HEALTH_OVERVIEW"],
  [/^\/api\/health\/adherence$/, "HEALTH_ADHERENCE"],
  [/^\/api\/health\/history$/, "HEALTH_HISTORY"],
  [/^\/api\/health\/appointments(?:\/|$)/, "HEALTH_APPOINTMENTS"],
  [/^\/api\/health\/vision(?:\/|$)/, "HEALTH_VISION"],
  [/^\/api\/health\/recipes\/[^/?]+\/image$/, "HEALTH_RECIPE_IMAGE"],
  [/^\/api\/health\/recipes(?:\/|$)/, "HEALTH_RECIPES"],
  [/^\/api\/health\/sync$/, "HEALTH_SYNC"],
  [/^\/api\/health$/, "HEALTH_ROOT"],
  [/^\/api\/health(?:\/|$)/, "HEALTH_OTHER"],
  [/^\/api\/objects\/[^/?]+\/image(?:\/|$)/, "OBJECTS_IMAGE"],
  [/^\/api\/objects\/look\/[^/?]+\/image(?:\/|$)/, "LOOK_IMAGE"],
  [/^\/api\/objects(?:\/|$)/, "OBJECTS_OTHER"],
  [/^\/api\/state$/, "STATE"],
  [/^\/api\/finance(?:\/|$)/, "FINANCE_API"],
  [/^\/api\/pantry(?:\/|$)/, "PANTRY"],
  [/^\/api\/nutrition(?:\/|$)/, "NUTRITION"],
  [/^\/api\/gym(?:\/|$)/, "GYM"],
  [/^\/api\/calendar(?:\/|$)/, "CALENDAR"],
  [/^\/api\/career(?:\/|$)/, "CAREER"],
  [/^\/api\/projects(?:\/|$)/, "PROJECTS"],
  [/^\/app(?:\/|$)/, "FRONTEND"]
];
// The browser-local overlap probe contains DOM-derived names; public logs
// receive only these fixed structural buckets, never the input string.
export function safeAuditVisualOverlapCode(overlap) {
  const value = String(overlap || "");
  if (value === "dialog-close ↔ dialog-title-text") return "DIALOG_CLOSE_TITLE";
  // The live Chromium probe's shortName() emits e.g. "div.account-transactions-tabs"
  // (not just ".account-transactions-tabs"), possibly with a second CSS class.
  // Parse only the container before ':', never inspect or log private child text.
  const container = value.split(":", 1)[0];
  const dot = container.indexOf(".");
  const classes = dot >= 0 ? container.slice(dot + 1).split(".") : [container];
  const categories = [
    ["liquidity-account-legend", "FINANCE_LIQUIDITY_ROWS"],
    ["account-transactions-tabs", "FINANCE_ACCOUNT_TABS"],
    ["topbar", "TOPBAR"],
    ["top-actions", "TOP_ACTIONS"],
    ["health-tabs", "HEALTH_TABS"],
    ["daily-card-heading", "DAILY_HEADING"],
    ["weekly-menu-meal-main", "WEEKLY_MENU"],
    ["weekly-menu-day", "WEEKLY_MENU"],
    ["recipe-card-body", "RECIPES"],
    ["recipe-ingredients", "RECIPES"],
    ["pantry-view-nav", "PANTRY_TABS"],
    ["objects-tabs", "OBJECTS_TABS"],
    ["projects-tabs", "PROJECTS_TABS"],
    ["events-tabs", "EVENTS_TABS"],
    ["area-nav", "AREA_NAV"]
  ];
  return categories.find(([className]) => classes.includes(className))?.[1] || "OTHER";
}

export function safeAuditNetworkFailureCode(entry) {
  // Entry is process-local and may contain a private URL or id; never emit it.
  const raw=String(entry || "");
  const status=(raw.match(/^http(\d{3}):/) || [])[1];
  const path=(raw.match(/^(?:http\d{3}|requestfailed):(\/[^:\s?]*)/) || [])[1] || "";
  const family=failureFamilies.find(([regex])=>regex.test(path))?.[1] || "UNMAPPED";
  const reason=status
    ? ["500","502","503","504","429"].includes(status) ? "HTTP_"+status : "HTTP_OTHER"
    : /net::ERR_ABORTED/.test(raw) ? "ERR_ABORTED"
      : /net::ERR_TIMED_OUT/.test(raw) ? "ERR_TIMEOUT"
        : /net::ERR_FAILED/.test(raw) ? "ERR_FAILED" : "NETWORK_OTHER";
  return family+"_"+reason;
}

// Browser errors may contain private page text or URLs. Emit only fixed buckets.
export function safeAuditBrowserFailureCode(entry) {
  const raw = String(entry || "");
  const channel = raw.startsWith("pageerror:") ? "PAGEERROR" : raw.startsWith("console:") ? "CONSOLE" : "OTHER";
  const type = /\bTypeError\b/.test(raw) ? "TYPEERROR"
    : /\bReferenceError\b/.test(raw) ? "REFERENCEERROR"
      : /\bSyntaxError\b/.test(raw) ? "SYNTAXERROR"
        : /\b(?:NetworkError|Failed to fetch)\b/i.test(raw) ? "NETWORK"
          : "OTHER";
  return channel + "_" + type;
}


// Finance DOM diagnostics consume only booleans: never log a bank account identifier.
export function safeAuditFinanceStructureCode(flags) {
  if (!flags || typeof flags !== "object") return "FINANCE_DOM_UNKNOWN";
  if (!flags.dialogOpen) return "FINANCE_DIALOG_CLOSED";
  if (!flags.financeDialog) return "FINANCE_DIALOG_REPLACED";
  if (!flags.workspacePresent) return "FINANCE_WORKSPACE_REMOVED";
  if (flags.tabsShrunk) return "FINANCE_TAB_CATALOG_SHRUNK";
  if (!flags.tabPresent) return "FINANCE_TAB_NOT_FOUND";
  if (!flags.tabSelected) return "FINANCE_TAB_NOT_SELECTED";
  if (!flags.panelVisible) return "FINANCE_PANEL_HIDDEN";
  return "FINANCE_DOM_STABLE";
}

export function safeAuditExecutableFailureCode(error) {
  const message = String(error?.message || "");
  if (/timeout|timed out/i.test(message)) return "EXEC_TIMEOUT";
  if (/target page, context or browser has been closed|target closed/i.test(message)) return "EXEC_TARGET_CLOSED";
  if (/execution context was destroyed/i.test(message)) return "EXEC_NAVIGATION_RACE";
  if (/strict mode violation/i.test(message)) return "EXEC_DOM_NONUNIQUE";
  if (/net::ERR_|failed to fetch/i.test(message)) return "EXEC_NETWORK";
  if (error?.name === "TypeError") return "EXEC_TYPE_ERROR";
  if (error?.name === "ReferenceError") return "EXEC_REFERENCE_ERROR";
  return "EXEC_OTHER";
}
