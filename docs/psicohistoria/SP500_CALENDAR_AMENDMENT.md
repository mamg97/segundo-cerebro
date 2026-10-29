# Pre-score calendar correction to the SP500 transfer contract

The original contract and intake result remain preserved. Its equality of all
Cboe dates with cash-index sessions blocked before labels, fitting or scores:
Cboe includes observations on some US cash-market holidays. Its official BOE
specification describes global-hours sessions on selected US holidays while
regular sessions are suspended. These are not missing cash-market prices.

For an explicitly selected `nyse-2016-2026` revision only, replace the initial
two-source equality gate with a bounded, independently sourced cash-session
calendar. Do not change source bytes, target, date range, origin sequence,
model, lag, references, exclusions, score thresholds or statistical procedure.
Retain `equal-source-dates` as the original mode and its blocked result. This
amendment is committed before any real target labels or model scores.

The positive FRED dates must equal **every** expected NYSE session in the fixed
range, including the first and last session; missing placeholders must be
non-sessions. Require VIX on every cash session. Additional VIX dates are
allowed only on verified non-sessions and are recorded individually; they are
never used as the preceding cash-session feature. No missing session is
filled, intersected away or admitted by agreement between two incomplete files.

Calendar is bounded to 2016–2026, weekdays minus the published NYSE holidays:
New Year (Sunday observed Monday; Saturday has no prior-Friday observation),
third Mondays in January/February, Good Friday, last Monday in May, July4,
first Monday in September, fourth Thursday in November and Christmas.
Juneteenth starts in2022; ordinary Saturday/Sunday observance is Friday/Monday.
Exceptional cash closures: 2018-12-05 and 2025-01-09. Early closes remain
sessions. Reject use outside the covered interval; no future calendar promise.

Primary calendar tables and exceptional-closure notices:
- https://ir.theice.com/press/news-details/2016/NYSE-Group-Announces-2017-Holiday-and-Early-Closings-Calendar/default.aspx
- https://ir.theice.com/press/news-details/2017/NYSE-Group-Announces-2018-2019-and-2020-Holiday-and-Early-Closings-Calendar/default.aspx
- https://ir.theice.com/press/news-details/2020/NYSE-Group-Announces-2021-2022-and-2023-Holiday-and-Early-Closings-Calendar/default.aspx
- https://ir.theice.com/press/news-details/2021/NYSE-Group-Announces-2022-2023-and-2024-Holiday-and-Early-Closings-Calendar/default.aspx
- https://ir.theice.com/press/news-details/2023/NYSE-Group-Announces-2024-2025-and-2026-Holiday-and-Early-Closings-Calendar/default.aspx
- https://ir.theice.com/press/news-details/2018/New-York-Stock-Exchange-to-Honor-President-George-H-W-Bush/default.aspx
- https://ir.theice.com/press/news-details/2024/The-New-York-Stock-Exchange-Will-Close-Markets-on-January-9-to-Honor-the-Passing-of-Former-President-Jimmy-Carter-on-National-Day-of-Mourning/default.aspx
- https://www.cboe.com/document/tech-spec/document/technical-specifications/cboe-titanium-u.s.-options-boe-specification

Calendar validation still does not prove historical edition availability or
admit a forecast. Revised-history and exploratory limitations remain unchanged.
