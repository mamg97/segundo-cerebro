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

## Pin de resultado antes de puntuar

El primer job [CI #39455838398](https://github.com/mamg97/segundo-cerebro/actions/runs/39455838398) descargó SOLO la edición 25.1 con la sentencia explícita sin scoring; SHA256 actual `564ce9a33652a5d7adef30f00ce6ac86411dedbcc10ef60ca9bdfbfeb9fea917`. Al igual que 23.1, ese sello significa integridad desde nuestra observación de hoy, no identidad de los bytes históricos en 2023 o 2025. Se activa ahora el análisis de 2024 sin cambiar cohortes, umbral, features o hiperparámetros tras la observación de 2025.

## Primer experimento EMPÍRICO sobre 2024 — AV-066

**Pre-evaluation design** frozen at PR #724 commit `c3a835bbb3a73c74e4b0dc332675772a2bb27631`; source 23.1 metadata verified earlier in [AV-065 CI #39455222169](https://github.com/mamg97/segundo-cerebro/actions/runs/39455222169), source 25.1 checksum observed without score in [CI #39455838398](https://github.com/mamg97/segundo-cerebro/actions/runs/39455838398).

**First actual 2024 scored run:** [CI #39456067226](https://github.com/mamg97/segundo-cerebro/actions/runs/39456067226), job `official-2024-holdout-retrospective` **SUCCESS**, source bytes matched fixed SHA, 196 countries, 35 observed positive, zero unresolved outcomes, 5,360 retrospective train rows; no post-2022 source data fed into the models. 2022 threshold labels matched on the 196-country cross-edition comparison. Two editions differ in reporting year; no claim they existed bit-for-bit as of 2023.

| Preregistered model | Brier 2024 (lower better) | Brier skill vs frequency | Log loss | Average precision |
| --- | ---: | ---: | ---: | ---: |
| frequency | 0.14746105 | 0.000000 | 0.472117 | 0.178571 |
| persistence | 0.05102041 | 0.654008 | 1.409746 | 0.762493 |
| markov | 0.04589744 | 0.688749 | 0.181318 | 0.762493 |
| v1_memory_index | 0.04696158 | 0.681532 | 0.176812 | 0.930274 |
| v2_logistic | **0.03190378** | **0.783646** | **0.128317** | **0.951635** |
| interaction_table | 0.03504036 | 0.762375 | 0.135525 | 0.929040 |

**Compared with 2025:** the V2 logistic improves 2024 Brier by roughly 37.5% versus persistence and 30.5% versus Markov. For 2025, the respective improvements were ~10.0% and ~6.0%, whereas interaction_table marginally beat V2. No automatic choice of an ex-post winner, and pooled two-year means are descriptive only.

**Scientific admission:**
- VALID 2024 **retrospective** release-separated measurement and tests, not a forecast issued in 2023.
- NOT VALIDATED prospectively, NOT proof of source as-of provenance in 2023, and NOT evidence of new-war onset or market signals.
- The 2024 experiment was devised after 2025 was examined: *multiple evaluation years* here do not mean independently preregistered confirmatory evidence. Do not tune parameters with these two years.
- Next: archival source quality and multiple evaluation dates through properly timestamped vintages, baseline with local recent activity, sensitivity to official codebook changes, and externally timestamped 2027 forecast issuance.
