// Chromium 5xx body reads are diagnostic-only and must never hold the
// production audit open indefinitely after all checks have completed.
export async function settleAuditDiagnostics(promises, timeoutMs = 1500) {
  if (!Array.isArray(promises) || !promises.length) {
    return { timedOut: false };
  }
  let timer;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => resolve("deadline"), timeoutMs);
  });
  try {
    const result = await Promise.race([
      Promise.allSettled(promises).then(() => "settled"),
      deadline
    ]);
    return { timedOut: result === "deadline" };
  } finally {
    clearTimeout(timer);
  }
}
