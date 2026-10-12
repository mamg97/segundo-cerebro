// Read-only UI decision: the budget may load while the banking subranges fail.
// No balances, accounts or transactions are fabricated to fill the gap.
export function financeAccountWorkspaceIncomplete(financeSummary) {
  const accounts = financeSummary?.monthlyBudget?.liquidityAccounts;
  const movements = financeSummary?.accountTransactions;
  const catalog = financeSummary?.bankWorkspaceAccounts;
  const hasAccounts = (Array.isArray(accounts) && accounts.length > 0) ||
    (Array.isArray(catalog) && catalog.length > 0);
  const hasMovements = Array.isArray(movements) && movements.length > 0;
  return !hasAccounts && !hasMovements;
}
