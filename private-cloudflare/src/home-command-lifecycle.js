// Pure home command state machine. No IO, robot connections, timers or persistence.
// All identifiers/timestamps in production remain in authenticated private storage.
export const HOME_COMMAND_STATES = Object.freeze([
  "pending", "dispatched", "accepted", "observed", "failed", "expired", "unknown"
]);

const TRANSITIONS = Object.freeze({
  pending: Object.freeze(["dispatched", "expired"]),
  dispatched: Object.freeze(["accepted", "failed", "unknown"]),
  accepted: Object.freeze(["observed", "failed", "unknown"]),
  unknown: Object.freeze(["observed", "failed"]),
  observed: Object.freeze([]),
  failed: Object.freeze([]),
  expired: Object.freeze([])
});

// A dispatched command must not be re-sent automatically on timeout: it might
// have reached the robot without an acknowledgement.
export function nextHomeCommandState(current, event, { nowMs = Date.now() } = {}) {
  if (!current || typeof current !== "object" ||
      !HOME_COMMAND_STATES.includes(current.status) ||
      typeof current.expiresAt !== "string" ||
      !Number.isFinite(Date.parse(current.expiresAt)) ||
      !Number.isFinite(nowMs)) {
    return { ok: false, code: "HOME_STATE_INVALID" };
  }
  if (typeof event !== "string" || !HOME_COMMAND_STATES.includes(event)) {
    return { ok: false, code: "HOME_EVENT_INVALID" };
  }
  // Duplicate notifications may be ignored safely, but must not create another dispatch.
  if (current.status === event) return { ok: true, unchanged: true, state: current };

  const expiresAtMs = Date.parse(current.expiresAt);
  if (current.status === "pending" && nowMs >= expiresAtMs) {
    return event === "expired"
      ? { ok: true, unchanged: false, state: { ...current, status: "expired" } }
      : { ok: false, code: "HOME_EXPIRED" };
  }
  if (event === "expired" && current.status !== "pending") {
    return { ok: false, code: "HOME_CANNOT_EXPIRE_SENT" };
  }
  if (!(TRANSITIONS[current.status] || []).includes(event)) {
    return { ok: false, code: "HOME_TRANSITION_DENIED" };
  }
  if (event === "dispatched" && nowMs >= expiresAtMs) {
    return { ok: false, code: "HOME_EXPIRED" };
  }
  return { ok: true, unchanged: false, state: { ...current, status: event } };
}

// Only the provider's observation of the robot state warrants "observed".
// Transport-level success or a cloud acknowledgement warrants "accepted" at most.
export function homeCommandDisplayStatus(status) {
  const labels = {
    pending: "Pendiente de envío",
    dispatched: "Enviado; sin confirmación",
    accepted: "Aceptado; ejecución sin verificar",
    observed: "Confirmado por telemetría",
    failed: "Fallido",
    expired: "Caducado; no enviado",
    unknown: "Resultado desconocido; no reenviar automáticamente"
  };
  return Object.hasOwn(labels, status) ? labels[status] : "Estado no disponible";
}
