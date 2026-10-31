// Financial reconciliation guard: private source data in, bounded derived checks out.
// Do not persist account figures in code or log any amounts in public CI.
const cents = (value) => value === null || value === undefined || value === ""
  ? null : Number.isFinite(Number(value)) ? Math.round(Number(value) * 100) : null;

const activeKind = (value) => /^eci[_-]/i.test(String(value || "").trim());
const dateKey = (value) => /^\d{4}-\d{2}-\d{2}/.test(String(value || ""))
  ? String(value).slice(0, 10) : null;

export function reconcileCreditReceiptProvisions({
  creditAccounts = [], creditFuture = [], liquidityAccounts = [],
  periodStart = null, periodEnd = null
} = {}) {
  const start = dateKey(periodStart);
  const end = dateKey(periodEnd);
  const checks = [];
  if (!start || !end || start > end) return { status: "unverified", checks };

  for (const credit of creditAccounts) {
    if (String(credit?.status || "active").toLowerCase() !== "active") continue;
    const linked = String(credit?.linkedPaymentAccount || "");
    const productIds = new Set((credit?.products || []).map((p) => p.id).filter(Boolean));
    if (!linked || !productIds.size) continue;
    const possibleRows = creditFuture.filter((row) =>
      productIds.has(row?.componentId) &&
      dateKey(row?.dueDate) >= start && dateKey(row?.dueDate) <= end);
    if (!possibleRows.length) continue;

    const dueDate = possibleRows.map((row) => dateKey(row.dueDate)).sort()[0];
    const dueRows = possibleRows.filter((row) => dateKey(row.dueDate) === dueDate);
    const expectedParts = dueRows.map((row) => cents(row.grossAmount));
    const estimate = cents(credit.estimatedNextReceipt);
    const bank = liquidityAccounts.find((account) => account.id === linked);
    const funded = (bank?.allocations || [])
      .filter((allocation) => activeKind(allocation?.kind) &&
        !["executed", "paid", "closed", "released", "cancelled", "canceled"]
          .includes(String(allocation?.status || "active").toLowerCase()));
    const reservedParts = funded.map((allocation) => cents(allocation.amount));
    const expectedValid = expectedParts.every((amount) => amount !== null && amount >= 0);
    const fundedValid = reservedParts.every((amount) => amount !== null && amount >= 0);
    const expectedCents = expectedValid ? expectedParts.reduce((a, b) => a + b, 0) : null;
    const reservedCents = fundedValid ? reservedParts.reduce((a, b) => a + b, 0) : null;

    let code = "OK";
    if (!bank || !expectedValid || !fundedValid || estimate === null) code = "SOURCE_INCOMPLETE";
    else if (expectedCents !== estimate) code = "SCHEDULE_TOTAL_MISMATCH";
    else if (reservedCents !== expectedCents) code = "RESERVATIONS_TOTAL_MISMATCH";
    else if (
      expectedParts.slice().sort((a, b) => a - b).join(",") !==
      reservedParts.slice().sort((a, b) => a - b).join(",")
    ) code = "RESERVATIONS_COMPONENT_MISMATCH";

    checks.push({
      accountId: credit.id,
      linkedPaymentAccount: linked,
      dueDate,
      code,
      status: code === "OK" ? "ok" : code === "SOURCE_INCOMPLETE" ? "unverified" : "mismatch",
      expectedGross: expectedCents === null ? null : expectedCents / 100,
      reservedGross: reservedCents === null ? null : reservedCents / 100,
      estimatedReceipt: estimate === null ? null : estimate / 100,
      componentCount: expectedParts.length,
      reservationCount: reservedParts.length
    });
  }

  return {
    status: checks.some((check) => check.status === "mismatch")
      ? "mismatch" : checks.length && checks.every((check) => check.status === "ok")
        ? "ok" : "unverified",
    checks
  };
}
