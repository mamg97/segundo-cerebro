# PSICOHISTORIA · AV-066 — 2024 second edition-separated holdout

**20/10/2026: preregistered before outcome 2024 inspection.** 2025 was observed previously; this analysis is **exploratory**, not independent confirmation.

Frozen earlier source: UCDP OrganizedViolenceCY 23.1 XLSX, <https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy_v23_1.xlsx>, bytes observed NOW SHA256 `6c7dc09cc3173b21568a88d70862bee6a9199b2c6b217719698d9298ca8ecaff` in CI [AV-065](https://github.com/mamg97/segundo-cerebro/pull/723).

The 23.1 workbook has required 9 columns including *_cy suffixes (country, ID, year, region, best/low/high state based, nonstate best, one-sided best), observed 6,545 physical rows including heading. No outcome 2024 has been inspected by that job.

For 2024:
- Features + fitting: only v23.1 through 2022; five consecutive years 2018–2022 for 2024 test cohort, and lagged training labels.
- Outcomes: UCDP v25.1 CY publication covering 2024, only if official ZIP hash can be fixed BEFORE held-out scoring. The earlier release 23.1 must never be trained using 25.1 labels.
- Target: state-based fatalities >=25 anywhere in country's borders during calendar 2024. Strictly **presence**, not onset or first conflict.
- Models: six previously frozen `benchmark.py` (frequency, persistence, Markov, V1, V2 logistic, interactions), unchanged code and hyperparameters.
- Compare identical country cohort and frequency, persistence, Markov, interaction table; evaluate Brier, Brier skill vs frequency, log-loss, AP; report N, positives, drops, historical label revisions. No optimization nor model selection on 2024.
- Fail closed if archival XLSX checksum, year range, unique country-year, exactly mapped features or 25.1 checksum fails. No row or name outputs.
- Must report experimental status as `RETROSPECTIVE_ONE_YEAR_RELEASE_SEPARATED_NOT_CONFIRMATORY` and `forecast_issued=false`. No certainty or trading claim from two years.

This PR **only pins 25.1 hash and tests synthetic inputs**. It does not compute real 2024 scores until the pinned SHA is inserted in the source after inspecting official download logs. No UI changes, no paid infrastructure, no changes to 2027 cohort.
