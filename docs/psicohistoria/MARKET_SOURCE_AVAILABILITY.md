# Market outcomes and source availability use different clocks

A twenty-session label can mature on the market calendar before the provider
publishes the edition containing its returns. A backtest that purges unfinished
horizons has addressed outcome timing, not necessarily source availability.
For each historical origin, a validated point-in-time training set needs both:

1. the full label horizon ends by the origin;
2. the exact source edition used was available by the origin.

Unknown publication time means availability is unverified. It does not prove
the data were absent. A current file, database-month header, directory name,
HTTP modification date or local retrieval clock cannot independently date
those exact bytes at all historical origins. Do not retrofit an arbitrary
monthly lag and call it verified history.

## Official archive scope checked

French's factor archive index describes annual July cuts released in August,
with an alternative later cut when July is unavailable. That index is not a
complete grid of daily vintages for every market-session origin. The inspected
linked filenames do not supply a daily-vintage archive series.

A separate official December 2024 legacy library *does* expose a daily factors
file. It was retrieved privately and its scope checked without scoring. This
is a FIZ-era edition, whereas the current research library uses CIZ beginning
with its January 2025 release. Do not confuse that single legacy daily source
with a complete point-in-time history of the current CIZ series. Do not claim
there are no historical daily files merely because the annual archive index
has no daily links.

Provider-described edition/release months are useful provenance claims;
independent verification of exact historical bytes remains a separate gate.
Original snapshots and diagnostic metadata stay private. No prior experiment,
score, probability or protocol is changed by this audit.

## A future pilot is a separate opportunity

Failure to establish old point-in-time training availability does not prevent a
future research pilot from using an edition genuinely captured before its new
issuance. Freeze the exact present training snapshot, features, target,
comparators and evaluation contract before observing the future outcome, then
verify its independent temporal evidence and recoverable registration. This
would be prospective research, not proof that the historical screen was
point-in-time valid or that the candidate already has investment utility.

A contemporaneous comparison also needs fresh, consistent inputs for every
reference. Recent VIX against stale realized-return features is not a fair
substitute for a same-target realized-volatility reference. Define the object
of risk explicitly: aggregate-market research total return, ETF NAV and an
executable market price are different series. No new timestamp request or
forecast is authorized by this document.

Primary sources inspected:

- https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html
- https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/Data_Library/f-f_factors.html
- https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/Data_Library/f-f_factors_archive.html
- https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library_202412_archive.html
