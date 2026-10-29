# Historical loss-distribution comparisons

The private laboratory renders a generic paired comparison from existing
`PsicoExperimentos.notes`; no observations or results are embedded in public
assets. Brief shows the latest comparison; Evidence shows all admitted display
records. Display admission is unrelated to scientific model admission.

Schema `psychohistory.market-loss-distribution.v1` requires:

- `runType=adaptive_historical_screen`, `forecastIssued=false`,
  `skillDemonstrated=false`, `currentRiskEstimated=false`;
- `target=MAX_CLOSE_LOSS_FROM_ORIGIN_WITHIN_20_SESSIONS`,
  `horizonSessions=20`, positive integer `n`, `inputThrough` no later than
  the record date, `source`, `criterion`, and the registered joint `decision`
  (`rejected` or `screen_passed`);
- exactly two named `methods`, candidate first and reference second, each
  with `quantiles.q90` and `quantiles.q95`. Each quantile contains a finite
  `pinball` score in [0,1] and integer `exceedances` in [0,n];
- row `metric=quantile_pinball`, `value` equal to candidate q90 pinball and
  `baseline` equal to reference q90 pinball. Both quantiles remain visible;
  the summary metric does not turn them into independent studies.

Notes are bounded to 12,000 characters. Duplicate IDs, incomplete records,
contradictory metrics, malformed dates and prospective claims fail closed.
Canonical text is escaped. Evidence links only admit pull requests in this
repository. Backend passes through the existing bounded notes; no new table,
credential, endpoint, dependency or recurring job is needed.

Each quantile shows numeric pinball error and observed exceedances, with a
nominal-frequency marker. Graphs use independent scales, explained in the
reading guide. Pinball is in fractional loss units, not Brier or a probability.
The target is worst close relative to the initial close, not intraday loss or
peak-to-trough drawdown. A historical screen never establishes future utility.

Validation uses fictional records. Private local browser inspection covers
full desktop and narrow/mobile layout, readable values and the details control.
The source cutoff and absence of current-risk estimation remain visible outside
collapsed help. Do not claim private data were synchronized merely because this
renderer was deployed. Canonical writes and full-report storage require their
own authorized, verified operation.
