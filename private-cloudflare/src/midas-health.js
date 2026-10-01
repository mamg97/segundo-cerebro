const SPECS = [
  { name: "MIDAS paper comparison", weekdays: [1,2,3,4,5], hour: 23, minute: 37, graceHours: 6, activeFrom: "2026-09-28T00:00:00Z" },
  { name: "MIDAS TFM shadow forecasts", weekdays: [1,2,3,4,5], hour: 19, minute: 23, graceHours: 10, activeFrom: "2026-09-28T00:00:00Z" },
  { name: "MIDAS capital cycle paper", weekdays: [1,2,3,4,5], hour: 23, minute: 57, graceHours: 6, activeFrom: "2026-09-30T00:00:00Z" },
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
    if (!latest || Date.parse(latest.created_at) < due) {
      return { name: spec.name, ok: false, state: "missing_due_run", latest,
        detail: "no existe ejecución schedule para la última ventana debida" };
    }
    if (latest.status !== "completed") return { name: spec.name, ok: true, state: "running", latest };
    if (latest.conclusion !== "success") {
      return { name: spec.name, ok: false, state: "failed", latest,
        detail: "última ejecución schedule terminó " + String(latest.conclusion || "sin conclusión") };
    }
    return { name: spec.name, ok: true, state: "success", latest };
  });
  return { ok: workflows.every((item) => item.ok), workflows, issues: workflows.filter((item) => !item.ok) };
}
