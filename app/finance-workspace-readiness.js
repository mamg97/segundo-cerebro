// Read-only UI decision: the budget may load while the banking subranges fail.
// No balances, accounts or transactions are fabricated to fill the gap.
export function financeAccountWorkspaceIncomplete(financeSummary) {
  const accounts = financeSummary?.monthlyBudget?.liquidityAccounts;
  const movements = financeSummary?.accountTransactions;
  const catalog = financeSummary?.bankWorkspaceAccounts;
  const hasAccounts = (Array.isArray(accounts) && accounts.length > 0) ||
    (Array.isArray(catalog) && catalog.length > 0);
  const hasMovements = Array.isArray(movements) && movements.length > 0;
  // Empty optional Sheet reads are not proof that a history is truly empty.
  // Only the separate, strictly checked bank reader can certify that result.
  if (financeSummary?.bankWorkspaceReadVerified === true) return false;
  return !hasAccounts || !hasMovements;
}

export function financeBankWorkspaceReady(financeSummary) {
  // A partial optional range is not enough for interactive bank tabs:
  // render them only after both ranges are present or the dedicated source
  // has explicitly verified that an empty range is genuine.
  return financeSummary?.bankWorkspaceReadVerified === true ||
    !financeAccountWorkspaceIncomplete(financeSummary);
}

// The bank endpoint is the only authority for a verified bank workspace.
// Optional budget/finance scopes may arrive later and replace unrelated
// summary fields, but cannot invalidate this same-session verified read.
export function mergeVerifiedFinanceBankWorkspace(summary, verified) {
  if (!verified || !Array.isArray(verified.accounts) ||
      !Array.isArray(verified.transactions)) return summary;
  return {
    ...(summary || {}),
    bankWorkspaceAccounts: verified.accounts,
    accountTransactions: verified.transactions,
    bankWorkspaceReadVerified: true
  };
}
