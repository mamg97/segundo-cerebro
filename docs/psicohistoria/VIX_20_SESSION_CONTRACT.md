# One frozen options-information contrast

Before downloading/calculating the candidate, freeze this single specification.
The mechanism differs from the closed return-only and filtered-historical
candidates: option-implied volatility may contain forward-looking information.
The Cboe VIX is a 30-calendar-day SPX volatility index, not a physical probability
of a decline and not the same universe as the US aggregate French market proxy.
This is an exploratory transfer test, not a conversion of VIX into crash odds.

Source: the daily closing CSV linked by Cboe's official VIX historical-data page.
Keep raw bytes, hash and retrieval metadata privately; no paid source or raw
redistribution. The current historical series includes reconstructed history
and does not establish point-in-time availability at earlier origins.

Target, sample and references remain exactly those in the completed first
real-market report: a 5% decline from the origin within 20 following closes of
the total-return aggregate-market proxy, original origins from 2010 onward
at stride20, lookback start60, matured training labels only, minimum252.
Recompute labels only as an integrity crosscheck; verify exact origin, end date,
training count and outcome against the pinned original report. Reuse its stored
expanding frequency, recent frequency and realized-volatility-only probabilities
without re-estimating those closed comparisons. Missing/duplicate source dates
or report mismatches block this experiment; never fill/drop cases silently.

Candidate: one logistic predictor, natural log of the VIX CLOSE from the
immediately preceding *market session*. Require the exact date; do not forward
fill. Use the existing train-only standardizer and solver, ridge=.1 and50
iterations. No market-return features, alternative lags, interactions, cutoffs,
period selection or parameter search. Train at each fixed origin with labels
fully known by that origin. Only this candidate is newly fitted.

Frozen screen: at least100 test cases and20 adverse events; Brier at least5%
below both frequency references and strictly below realized-volatility-only.
Report all three paired comparisons and block12/1000replicate/seed20261029
conditional descriptive uncertainty. Same original sample means no new
independent test cases; additional candidate searching raises selection risk.
Even a pass means promising retrospective evidence only, never model admission,
current risk, an issued forecast or investment utility. Preserve a negative
result without retuning. No emissions, external timestamps, orders or messages.
