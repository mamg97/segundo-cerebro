// Only funded bank allocations belong in the balance chart.
export function isFundedFinanceAllocation(item) {
  const status = String(item?.status || "active").trim().toLowerCase();
  const kind = String(item?.kind || "").trim().toLowerCase();
  const excluded = new Set(["cancelled","canceled","released","executed",
    "paid","closed","completed","unfunded","uncovered","not_funded"]);
  return Boolean(item?.accountId) && item?.amount != null &&
    !excluded.has(status) && kind !== "budget_funding_gap";
}

// A failed optional Sheet read is not evidence of unallocated funds.
export function requireFinanceReservationSource(accountRows, reservationRows) {
  if (!Array.isArray(accountRows) || accountRows.length <= 1) return;
  const header = Array.isArray(reservationRows?.[0]) ? reservationRows[0] : [];
  const columns = new Set(header.map(value => String(value || "").trim().toLowerCase()));
  if (!["account_id","amount","status","kind"].every(key => columns.has(key))) {
    const error = new Error("FINANCE_RESERVATIONS_UNAVAILABLE");
    error.code = "FINANCE_RESERVATIONS_UNAVAILABLE";
    throw error;
  }
}
