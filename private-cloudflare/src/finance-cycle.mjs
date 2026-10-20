// Finance uses 20th-of-month cycles in the user's Madrid time zone.
// This guard is display-only: it never mutates canonical budget or bank records.
const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sept","oct","nov","dic"];

function madridYmd(when) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(when);
  const p = Object.fromEntries(parts.filter(x => x.type !== "literal").map(x => [x.type, x.value]));
  return [Number(p.year), Number(p.month), Number(p.day)];
}
function ymd(y, m) { return `${y}-${String(m).padStart(2,"0")}-20`; }

export function currentFinanceCycle(now = new Date()) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new TypeError("Invalid finance cycle date");
  let [year, month, day] = madridYmd(now);
  if (day < 20) { month -= 1; if (month < 1) { month = 12; year -= 1; } }
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return {
    start: ymd(year, month),
    end: ymd(nextYear, nextMonth),
    label: `20 ${MONTHS[month-1]} – 20 ${MONTHS[nextMonth-1]}`
  };
}

export function ensureCurrentFinanceCycle(monthly, now = new Date()) {
  if (!monthly) return monthly;
  const cycle = currentFinanceCycle(now);
  if (monthly.periodStart === cycle.start && monthly.periodEnd === cycle.end) {
    return { ...monthly, pendingCycle: false };
  }
  // An expired (or future) source must not masquerade as this month's spending.
  // Preserve independently verified bank accounts, but withhold old category
  // budgets, spending totals, salaries and monthly net forecasts.
  return {
    ...monthly,
    previousSourcePeriod: monthly.period || null,
    period: `${cycle.start}/${cycle.end}`,
    periodStart: cycle.start,
    periodEnd: cycle.end,
    periodLabel: cycle.label,
    pendingCycle: true,
    budgetStatus: "PENDING_CANONICAL_CYCLE_ROLLOVER",
    income: null,
    plannedOutflows: null,
    commonBudget: null,
    savingsTarget: null,
    spent: null,
    personalNet: null,
    miguelNet: null,
    andreaNet: null,
    jointNet: null,
    categories: []
  };
}
