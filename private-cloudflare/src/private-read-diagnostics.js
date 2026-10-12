// Deliberately closed vocabulary. Never echo raw error messages, IDs, URLs,
// credentials, SQL or any other private source content into runtime logs.
const KNOWN_MEDIA_ERRORS = new Set([
  "AUTH_REQUIRED", "INVALID_IMAGE_VERSION", "INVALID_IMAGE_TYPE",
  "IMAGE_NOT_FOUND", "OBJECTS_MEDIA_CORRUPT",
  "OBJECTS_MEDIA_DB_NOT_CONFIGURED",
  "OBJECTS_MEDIA_KEY_EXISTS", "OBJECTS_MEDIA_EMPTY",
  "OBJECTS_MEDIA_CAP_EXCEEDED",
  "OBJECTS_SHEET_READ_FAILED", "OBJECTS_SHEET_CONTRACT_INVALID",
  "OBJECTS_SHEET_UPDATE_FAILED", "OBJECTS_MEDIA_UPLOAD_FAILED"
]);

export function safePrivateReadDiagnostic(error) {
  const explicit = typeof error?.code === "string" ? error.code : "";
  if (KNOWN_MEDIA_ERRORS.has(explicit)) return explicit;
  const name = typeof error?.name === "string" ? error.name : "";
  const message = typeof error?.message === "string" ? error.message : "";
  if (message === "OBJECTS_MEDIA_CORRUPT") return "OBJECTS_MEDIA_CORRUPT";
  if (message === "OBJECTS_MEDIA_DB_NOT_CONFIGURED") return "OBJECTS_MEDIA_DB_NOT_CONFIGURED";
  if (name === "D1_ERROR" || message.startsWith("D1_ERROR:")) return "D1_READ_FAILED";
  if (/^GOOGLE_SHEETS_(401|403)$/.test(message)) return "SOURCE_AUTH_FAILED";
  if (/^GOOGLE_SHEETS_(429|5[0-9]{2})$/.test(message)) return "SOURCE_UPSTREAM_TEMPORARY";
  if (/^[A-Z_]+_TIMEOUT$/.test(message)) return "SOURCE_TIMEOUT";
  return "SOURCE_READ_FAILED";
}
