// Read-only presentation of budget envelopes: only unspent funding may remain
// in the bank allocation chart. Never create or mutate a bank transaction here.
const categoryByKind = Object.freeze({
  gym_budget_envelope: "salud-gimnasio",
  medicine_budget_envelope: "salud-medicinas",
  grocery_budget_envelope: "hogar-comida",
  water_budget_envelope: "hogar-agua",
  electricity_budget_envelope: "hogar-luz",
  transport_partial_funded_envelope: "transporte-gasolina"
});
const cents = (v) => Math.round((Number(v) || 0) * 100);

export function reconcileBudgetEnvelopeForDisplay(allocation, categoriesById) {
  const categoryId = categoryByKind[String(allocation?.kind || "").toLowerCase()];
  if (!categoryId) return allocation;
  // If the canonical category source is unavailable, retain the source
  // allocation instead of inventing zero or marking the payment as settled.
  const category = categoriesById?.get(categoryId);
  if (!category) return allocation;

  const budget = cents(category.budgeted);
  const spent = cents(category.spent);
  const committed = cents(category.committed);
  const left = Math.max(0, budget - spent - committed);
  const funded = Math.max(0, cents(allocation.amount));
  // Cap to both the bank-funded envelope and the remaining budget.
  const amountCents = Math.min(funded, left);
  return {
    ...allocation, amount: amountCents / 100,
    budgetCategoryId: categoryId,
    budgetExecuted: spent / 100,
    budgetTotal: budget / 100,
    budgetEnvelopeComplete: budget === 0 || left === 0
  };
}
