// Finite vocabulary for public GitHub Actions audit logs. Caller-provided
// error values (IDs, URLs, tokens, balances, medical values) are never emitted.
const KNOWN_CODES = new Set([
  "D1_READ_FAILED", "OBJECTS_MEDIA_CORRUPT",
  "OBJECTS_MEDIA_DB_NOT_CONFIGURED",
  "OBJECTS_SHEET_READ_FAILED", "OBJECTS_SHEET_CONTRACT_INVALID",
  "OBJECTS_SHEET_UPDATE_FAILED", "OBJECTS_MEDIA_UPLOAD_FAILED",
  "SOURCE_READ_FAILED", "SOURCE_AUTH_FAILED",
  "SOURCE_UPSTREAM_TEMPORARY", "SOURCE_TIMEOUT",
  "OBJECTS_IMAGE_FAILED", "OBJECTS_LOOK_IMAGE_FAILED",
  "HEALTH_OVERVIEW_READ_FAILED", "AUDIT_GATEWAY_UPSTREAM_FAILED",
  "AUDIT_GATEWAY_BINDING_FETCH_FAILED", "AUDIT_GATEWAY_RESPONSE_FAILED",
  "AUDIT_GATEWAY_WORKER_RESOURCE_LIMIT", "AUDIT_GATEWAY_SUBREQUEST_LIMIT",
  "AUDIT_GATEWAY_BINDING_TIMEOUT"
]);

export function safePrivate502Origin(contentType, body) {
  if (!/^application\/json(?:;|$)/i.test(String(contentType || "").trim())) {
    return "NON_JSON_5XX";
  }
  const diagnostic = typeof body?.diagnostic === "string" ? body.diagnostic : "";
  const code = typeof body?.code === "string" ? body.code : "";
  if (KNOWN_CODES.has(diagnostic)) return diagnostic;
  if (KNOWN_CODES.has(code)) return code;
  return "JSON_UNCLASSIFIED_5XX";
}
