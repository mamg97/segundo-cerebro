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
