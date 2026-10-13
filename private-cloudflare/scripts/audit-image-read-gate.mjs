// Bounds cold private-image reads in the GitHub Actions Chromium auditor.
// This does not affect the browser used by real users, the Cloudflare Worker,
// the actual image bytes, or the audit's strict 5xx failure policy.
export function createAuditImageReadGate(limit = 3) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 8) {
    throw new RangeError("INVALID_AUDIT_IMAGE_CONCURRENCY");
  }
  let active = 0;
  let peak = 0;
  const waiting = [];

  function start(job) {
    active++;
    peak = Math.max(peak, active);
    Promise.resolve().then(job.execute).then(job.resolve, job.reject).finally(() => {
      active--;
      const next = waiting.shift();
      if (next) start(next);
    });
  }

  return {
    run(execute) {
      if (typeof execute !== "function") return Promise.reject(new TypeError("AUDIT_IMAGE_FETCH_REQUIRED"));
      return new Promise((resolve, reject) => {
        const job = { execute, resolve, reject };
        if (active < limit) start(job);
        else waiting.push(job);
      });
    },
    stats() { return { active, peak, waiting: waiting.length, limit }; }
  };
}
