const SPECS = [
  { name: "MIDAS paper comparison", weekdays: [1,2,3,4,5], hour: 23, minute: 37, graceHours: 6, activeFrom: "2026-09-28T00:00:00Z" },
  { name: "MIDAS TFM shadow forecasts", weekdays: [1,2,3,4,5], hour: 19, minute: 23, graceHours: 10, activeFrom: "2026-09-28T00:00:00Z" },
  { name: "MIDAS capital cycle paper", weekdays: [1,2,3,4,5], hour: 23, minute: 57, graceHours: 6, activeFrom: "2026-09-30T00:00:00Z" },
  { name: "MIDAS Buy The Dip paper", weekdays: [1,2,3,4,5], hour: 23, minute: 27, graceHours: 6, activeFrom: "2026-10-01T00:00:00Z" },
  { name: "MIDAS weekly ML paper", weekdays: [5], hour: 23, minute: 17, graceHours: 8, activeFrom: "2026-10-02T00:00:00Z" },
  { name: "MIDAS TFG corrected paper", weekdays: [5], hour: 23, minute: 47, graceHours: 8, activeFrom: "2026-10-02T00:00:00Z" }
];

function latestDueOccurrence(spec, nowMs) {
  const activeFrom = Date.parse(spec.activeFrom);
  if (!Number.isFinite(activeFrom) || nowMs < activeFrom) return null;
  const now = new Date(nowMs);
  for (let offset = 0; offset <= 10; offset += 1) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset, spec.hour, spec.minute));
    if (!spec.weekdays.includes(day.getUTCDay()) || day.getTime() < activeFrom) continue;
    if (nowMs >= day.getTime() + spec.graceHours * 3600_000) return day.getTime();
  }
  return null;
}

export function evaluateMidasWorkflowRuns(runs, now = Date.now()) {
  const list = Array.isArray(runs) ? runs : [];
  const workflows = SPECS.map((spec) => {
    const due = latestDueOccurrence(spec, now);
    const scheduled = list
      .filter((run) => run?.name === spec.name && run?.event === "schedule")
      .filter((run) => Number.isFinite(Date.parse(run?.created_at || "")))
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const latest = scheduled[0] || null;
    if (due === null) return { name: spec.name, ok: true, state: "not_due_yet", latest };

    const cycle = scheduled.filter((run) => Date.parse(run.created_at) >= due);
    if (!cycle.length) {
      return { name: spec.name, ok: false, state: "missing_due_run", latest,
        detail: "no existe ejecución schedule para la última ventana debida" };
    }

    // Primario y backup pertenecen al mismo ciclo. Si cualquiera completó con
    // éxito, el ciclo está cubierto aunque un backup posterior falle.
    const successful = cycle.find((run) => run.status === "completed" && run.conclusion === "success");
    if (successful) {
      return {
        name: spec.name, ok: true, state: "success", latest: successful,
        attempts: cycle.length,
        detail: cycle.some((run) => run !== successful && run.conclusion && run.conclusion !== "success")
          ? "ciclo cubierto por una ejecución válida; otro intento de respaldo no fue necesario"
          : null
      };
    }

    const running = cycle.find((run) => run.status !== "completed");
    if (running) return { name: spec.name, ok: true, state: "running", latest: running, attempts: cycle.length };

    return { name: spec.name, ok: false, state: "failed", latest,
      attempts: cycle.length,
      detail: "ningún intento schedule de la última ventana terminó correctamente" };
  });
  return { ok: workflows.every((item) => item.ok), workflows, issues: workflows.filter((item) => !item.ok) };
}
