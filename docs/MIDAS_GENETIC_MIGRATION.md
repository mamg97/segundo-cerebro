# Original genetic migration

Prepared 2026-10-29; operational handover is pending.

The public optimizer is distinct from `paper_demo`. Its allowlist contains only
audited code, tests, the original universe CSV and three simulated diaries.
The legacy diary ends 2026-09-25; the interrupted forward cohort ends 2026-10-07;
the independent active cohort starts 2026-10-12. No capital is reset, no historical
sessions are synthesized, and these curves remain separate from personal finance.

The ingest Worker accepts only signed GitHub OIDC tokens for repository ID
1392125585, owner ID 110605707, repository `mamg97/midas-paper-lab`, main, exact
workflow `.github/workflows/genetic_sp500.yml`, schedule/workflow_dispatch and
the existing dedicated audience. Forks, PRs and other producers are rejected.
The payload persists only simulated equity and provenance; history must extend
the existing prefix. Identical retries are idempotent, independent of repository
run-ID numbering. Conflicts, stale curves and concurrent replacements fail closed.

Handover order: validate local and public CI; run full-size read-only training;
deploy the producer change; republish the exact existing summaries and verify the
private MIDAS view. Install a private per-run interlock before a genuine public
trial, confirm no private writer is active, and dispatch inside the causal window.
Only after the public session is committed and ingested disable the private
schedule and enable the public schedule. Verify the subsequent natural run.

Standard public `ubuntu-latest` compute is free under GitHub's published Actions
billing terms. No paid infrastructure, credentials in code, public application
access, account upgrades or payment-method changes are introduced.
