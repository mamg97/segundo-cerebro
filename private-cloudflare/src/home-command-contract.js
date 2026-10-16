// Home robot command contract: no external calls; production execution disabled by default.
// Never log payloads: they may contain identifiers of a private household.
export const HOME_ROBOT_ACTIONS = Object.freeze([
  "start_cleaning", "pause", "stop", "return_home", "clean_rooms"
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID_RE = /^[a-z0-9][a-z0-9_-]{2,63}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const KEYS = new Set(["command_id", "device_id", "action", "created_at", "expires_at", "room_ids"]);
const MAX_TTL_MS = 120_000;
const MAX_CLOCK_SKEW_MS = 5_000;

function denied(code) {
  return { ok: false, code };
}
function parseTimestamp(value) {
  if (typeof value !== "string" || !ISO_RE.test(value)) return NaN;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : NaN;
}

// Every flag must come from trusted server-side checks; NEVER read them from command JSON.
export function homeTransportApproved({
  enabled = false, encrypted = false, serverIdentityVerified = false, protocolVerified = false
} = {}) {
  return enabled === true && encrypted === true &&
    serverIdentityVerified === true && protocolVerified === true;
}

export function validateHomeRobotCommand(input, {
  nowMs = Date.now(), trustedActor = false, transportApproved = false, enabled = false,
  allowedDeviceIds = [], allowedRoomIds = []
} = {}) {
  // Fail closed. This function does not authenticate clients or persist idempotency keys.
  if (!enabled || !trustedActor || !transportApproved) return denied("HOME_DISABLED");
  if (!input || typeof input !== "object" || Array.isArray(input)) return denied("HOME_INVALID_INPUT");
  if (Object.keys(input).some((key) => !KEYS.has(key))) return denied("HOME_INVALID_FIELDS");
  if (typeof input.command_id !== "string" || !UUID_RE.test(input.command_id)) return denied("HOME_INVALID_ID");
  if (typeof input.device_id !== "string" || !ID_RE.test(input.device_id) ||
      !allowedDeviceIds.includes(input.device_id)) return denied("HOME_DEVICE_DENIED");
  if (!HOME_ROBOT_ACTIONS.includes(input.action)) return denied("HOME_ACTION_DENIED");

  const createdAt = parseTimestamp(input.created_at);
  const expiresAt = parseTimestamp(input.expires_at);
  if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt) || !Number.isFinite(nowMs)) {
    return denied("HOME_INVALID_TIME");
  }
  if (createdAt > nowMs + MAX_CLOCK_SKEW_MS || nowMs >= expiresAt ||
      expiresAt <= createdAt || expiresAt - createdAt > MAX_TTL_MS) {
    return denied("HOME_EXPIRED");
  }

  let roomIds = [];
  if (input.action === "clean_rooms") {
    if (!Array.isArray(input.room_ids) || input.room_ids.length < 1 || input.room_ids.length > 12 ||
        input.room_ids.some((roomId) => typeof roomId !== "string" || !ID_RE.test(roomId)) ||
        new Set(input.room_ids).size !== input.room_ids.length ||
        input.room_ids.some((roomId) => !allowedRoomIds.includes(roomId))) {
      return denied("HOME_ROOMS_DENIED");
    }
    roomIds = [...input.room_ids];
  } else if (Object.hasOwn(input, "room_ids")) {
    return denied("HOME_INVALID_FIELDS");
  }

  return {
    ok: true,
    command: {
      commandId: input.command_id.toLowerCase(),
      deviceId: input.device_id,
      action: input.action,
      createdAt: new Date(createdAt).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      roomIds
    }
  };
}
