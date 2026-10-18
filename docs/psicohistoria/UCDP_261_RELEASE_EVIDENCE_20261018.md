# PSICOHISTORIA — Evidence dossier: UCDP OrganizedViolenceCY 26.1

> **Actualización empírica posterior — 18/10/2026, 13:13 UTC:** el workflow
> [39130567553](https://github.com/mamg97/segundo-cerebro/actions/runs/39130567553)
> descargó el ZIP/PDF originales UCDP 26.1 y ambos hashes **coincidieron**
> con el protocolo; `source_release_intake.inspect()` y
> `benchmark.audit(strict=True)` pasaron para **7.132 filas, 199 países,
> 1989–2025**. El CSV original utiliza cabeceras sin `_cy`, pese al codebook.
> Se borraron los originales del runner, sin artifact ni permanencia en Drive.
> La tabla inferior es la auditoría documental anterior a ese run y **queda
> superada solo en las filas de checksum, descarga y cobertura**, NO en las
> de disponibilidad histórica, sellado independiente o emisión. Los hashes
> observados no demuestran que estos mismos bytes estuvieran disponibles
> exactamente en junio de 2026.

**Review date:** 2026-10-18 · **Type:** documentary release evidence only; no downloaded official source bytes have been validated in this session.

## Evidence with explicit, limited scope

1. **UCDP official download center (current page):**
   https://ucdp.uu.se/downloads/
   Lists *UCDP Country-Year Dataset on Organized Violence within Country Borders version 26.1* and links its CSV/codebook. This supports the current identity of the series and version, **not** the timestamp of any exact ZIP bytes.
2. **Uppsala University press release, dated 2026-06-09:**
   https://www.uu.se/en/press/press-releases/2026/2026-06-09-ucdp-record-number-of-conflicts-between-states
   Publicly announced UCDP figures for 2025. The release has a visible last-modified date 2026-06-18. This is dated evidence that some UCDP 2025 information was public by that time, **not** a cryptographic deposit of the source ZIP.
3. **UCDP official codebook 26.1:**
   https://ucdp.uu.se/downloads/organizedviolencecy/UCDP_OrganizedViolenceCY_Codebook_261.pdf
   The codebook names UCDP OrganizedViolenceCY 26.1 and its 1989-01-01–2025-12-31 coverage. The PDF was readable as public reference, but its complete bytes were not retrieved and locally hashed here.
4. **Exact official ZIP path already frozen in the repository's protocol:**
   https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy-261-csv.zip
   Public page links the ZIP. Binary download attempts failed in this environment, so there is no byte-level result and **no assertion that the pinned SHA was matched**.

## Protocol pins (already preregistered before this review)

- ZIP SHA256: `66910888f5653af42776d2debc1d72fe527559e7f7fc82e69b7c8771467f2d34`
- PDF SHA256: `88ba683426c2596fab908fcd68ae184025d0804ca9a099dea513898214b92b3c`
- Expected release: `26.1`; raw years: 1989–2025; expected countries: 199; expected raw rows: 7132.
- Source of pins: `research/psychohistory/protocol.json` in `mamg97/segundo-cerebro`. No repinning or alteration has been performed.

## Strict admissibility decision

| Criterion | Status |
| --- | --- |
| Official URL for current release and version | VERIFIED_REFERENCE |
| Dated public UCDP announcement of 2025 statistics | VERIFIED_REFERENCE_2026-06-09 |
| Specific ZIP/PDF exact bytes match preregistered SHA | NOT_EXECUTED_SOURCE_UNAVAILABLE |
| Specifically these exact bytes were accessible by June 2026 | NOT_PROVEN |
| Country-year coverage of actual 26.1 ZIP matches protocol | NOT_EXECUTED |
| Independent RFC3161 timestamp of prediction | NOT_EXECUTED |
| Vintage-correct/as-of input availability for a planned forecast | NOT_PROVEN |
| Forecast prospectively issued | FALSE |

The published-release evidence may support **designing** a future `asOf` after June 2026, but does not itself upgrade `historicalAsOfVerified` or `prospectiveEligible`. The exact bytes, their release history, and any model-origin features must still be independently verified. No probability or real-world forecast is included in this dossier.

## Actions required before prospective issuance

Download the ZIP and codebook from the official URLs *to a private directory*, run the existing `download.mjs` hash-pinned downloader, run the pending `source_release_intake.py`, preserve a private immutable archive and both SHA manifests, and independently verify the provenance/release timeline. Freeze a future issuance time, benchmark, target resolution and model inputs; obtain a genuine independent TSA receipt before declaring `ISSUED`. It remains prohibited to insert synthetic or retrospective rows into `PsicoPredicciones` as real forecasts.
