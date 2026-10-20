"""Pre-forecast timing gate for public institutional agendas (no scraping or predictions).

Every observation is a snapshot known no later than the forecast issue time.
Self-declared publication dates are not independent proof of historical availability.
"""
from __future__ import annotations
from datetime import datetime, timezone
from urllib.parse import urlsplit
import re

SHA256 = re.compile(r"^[a-f0-9]{64}$")
KINDS = frozenset({"official_agenda", "official_attendance", "macro_release", "official_statement"})
OUTCOMES = frozenset({"rate_decision", "trade_measure", "regulation", "agreement", "no_agreement"})

def instant(value: str) -> datetime:
    """UTC-aware ISO 8601 input; reject ambiguous naive date stamps."""
    if not isinstance(value, str) or not value.strip():
        raise ValueError("timestamp required")
    try:
        value = value.replace("Z", "+00:00")
        result = datetime.fromisoformat(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("invalid ISO timestamp") from exc
    if result.tzinfo is None or result.utcoffset() is None:
        raise ValueError("timezone required")
    return result.astimezone(timezone.utc)

def assess(event: dict, issue_at: str, sources: list[dict]) -> dict:
    """Fail closed: report research readiness, never an issued forecast."""
    issue = instant(issue_at)
    if not isinstance(event, dict) or not event.get("event_id"):
        raise ValueError("event_id required")
    if event.get("outcome_kind") not in OUTCOMES:
        raise ValueError("outcome_kind must be pre-defined")
    start = instant(event.get("event_start_at"))
    if start <= issue:
        raise ValueError("issue must precede event")
    if not isinstance(sources, list) or not sources:
        raise ValueError("at least one source is required")
    independent_witnesses = 0
    for s in sources:
        if not isinstance(s, dict) or s.get("kind") not in KINDS:
            raise ValueError("unrecognized public-source type")
        uri = str(s.get("url") or "")
        parts = urlsplit(uri)
        if parts.scheme != "https" or not parts.netloc or parts.username or parts.password or parts.fragment:
            raise ValueError("source must use clean HTTPS URL")
        if not SHA256.fullmatch(str(s.get("capture_sha256") or "")):
            raise ValueError("full capture SHA256 required")
        published, captured = instant(s.get("published_at")), instant(s.get("captured_at"))
        if published > captured or captured > issue:
            raise ValueError("source not demonstrably observed before issuance")
        witness = s.get("external_receipt_verified", False)
        if not isinstance(witness, bool):
            raise ValueError("external_receipt_verified must be boolean")
        if witness:
            witnessed_at = instant(s.get("external_receipt_at"))
            if witnessed_at > issue or witnessed_at < captured:
                raise ValueError("external receipt not valid at issuance")
            independent_witnesses += 1
    # A verified receipt boolean is a caller assertion, not cryptographic verification.
    return {
        "status": "RESEARCH_ONLY_PROVENANCE_NEEDS_INDEPENDENT_VERIFICATION",
        "event_id": str(event["event_id"]),
        "outcome_kind": event["outcome_kind"],
        "sources_seen_by_issue": len(sources),
        "claimed_external_receipts": independent_witnesses,
        "forecast_issued": False,
        "forecast_probability": None,
        "trading_authorized": False,
    }
