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
  ["Sin respuestas 5xx ni fallos de red", "INFRA_NETWORK_FAILURES"]
]);
export function safeAuditDiagnosticCode(name) {
  const value=String(name || "");
  if (knownFailureCodes.has(value)) return knownFailureCodes.get(value);
  if (/^Finanzas · movimientos por cuenta · pestaña .* activa$/.test(value)) return "FINANCE_TAB_ACTIVE";
  if (/^Finanzas · movimientos por cuenta · panel .* visible$/.test(value)) return "FINANCE_TAB_PANEL";
  if (/^Finanzas · movimientos por cuenta · pestaña .* · desapareció tras render$/.test(value)) return "FINANCE_TAB_MISSING";
  if (/^Finanzas · enlace al Sheet de movimientos visible$/.test(value)) return "FINANCE_SHEET_LINK";
  return "CHECK_UNMAPPED";
}
const failureFamilies = [
  [/^\/api\/health\/overview$/, "HEALTH_OVERVIEW"],
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
