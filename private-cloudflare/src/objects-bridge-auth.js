const HEX_RE = /^[a-f0-9]{64}$/i;

function toHex(bytes) {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqualHex(left, right) {
  const a = String(left || "").toLowerCase();
  const b = String(right || "").toLowerCase();
  if (!HEX_RE.test(a) || !HEX_RE.test(b)) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(new Uint8Array(digest));
}

export async function isObjectsBridgeAuthenticated(request, env) {
  const expected = String(env?.OBJECTS_BRIDGE_UPSTREAM_SHA256 || "").trim().toLowerCase();
  if (!HEX_RE.test(expected)) return false;
  const header = String(request?.headers?.get("authorization") || "").trim();
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const supplied = match[1].trim();
  if (!supplied || supplied.length > 512) return false;
  const actual = await sha256Hex(supplied);
  return constantTimeEqualHex(actual, expected);
}
