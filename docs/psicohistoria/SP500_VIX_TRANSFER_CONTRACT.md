# Frozen S&P 500 price-index transfer screen

This is a new target/source study, frozen before downloading the price history
or fitting it. The prior French aggregate total-return findings remain intact.
The selected VIX mechanism is transferred without hyperparameter search; this
is exploratory and shares historical market regimes with the previous sample.

Target: at least one of the next 20 observed market-session closes of the S&P
500 **price index** is at or below 95% of its origin close. It excludes dividends
and is neither an ETF execution price nor portfolio P/L. Sources: FRED SP500
(S&P Dow Jones Indices) and the daily CSV linked by Cboe's VIX history page.
Capture original bytes privately, SHA-256 pins, URL, retrieval time and headers.
No source redistribution, fees, broker, timestamp service or issuance.

Freeze the requested price range to 2016-10-29 through 2026-10-28. Use every
available positive observation in that range in ascending order. Require the
last close to equal the fixed end date. Validate every input row, including
missing-value placeholders, before selection. Within the selected interval,
positive FRED dates must equal Cboe daily dates exactly. A missing price on a
VIX date, missing VIX close, duplicate or discrepancy blocks the whole study;
never interpolate, intersect away a discrepancy or silently drop a session.
Agreement of two sources is a calendar crosscheck, not independent proof of
complete exchange-calendar coverage or historical edition availability.

Features start at index60. First test origin is index331, the earliest origin
with 252 labels fully matured at the origin (60 through origin-20 inclusive).
Subsequent origins advance by20, stopping before incomplete horizons. If all
training labels have one class, retain that origin in an explicit exclusion
ledger; exclude it from **every** paired method, without shifting the schedule.
Otherwise a solver failure blocks rather than silently discarding a case.

Candidate: natural log of VIX CLOSE on the exact preceding price session;
train-only population standardization (floor1e-9), existing logistic solver,
ridge.1, 50iterations. References recalculated on this new target and identical
matured training rows: expanding Laplace frequency; most recent252 Laplace
frequency; logistic realized-volatility-only using trailing20 log returns at
the origin, population deviation times sqrt20. No other features, cutoffs,
lags, date selection, refitted old negative candidates or tuning.

Frozen screen unchanged: at least100 paired cases and20 events; Brier at least
5% below both frequency references and strictly below realized volatility.
Insufficient cases/events is INSUFFICIENT_SAMPLE, not a pass or a rescued
negative. Report all metrics and all three conditional descriptive paired
block12/1000replicate/seed20261029 intervals, plus all exclusions. Preserve
every result. Independent recomputation from original bytes must check labels,
training endpoints, predictions, metrics and intervals before closing.

A pass means PROMISING_RETROSPECTIVE_ONLY. Current revised history cannot
demonstrate historical as-of availability. No model admission, current-risk
estimate, forecast emission, trading utility or independent confirmation is
implied. A future prospective protocol needs its own actual source/temporal,
calendar, registration and authorization gates.

Primary references:
- https://fred.stlouisfed.org/series/SP500
- https://www.cboe.com/tradable-products/vix/vix-historical-data
- https://www.nyse.com/trade/hours-calendars
