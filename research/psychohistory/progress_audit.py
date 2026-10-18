"""Audit a PRIVATE scientific progress log without publishing any content.

The source of truth is the authorized private spreadsheet. This module
validates exported snapshots and append-only evolution; it NEVER contacts
Sheets, GitHub, a TSA, or any external provider, and never issues a forecast.

Use a prior signed/archived export for historical immutability checks.
Validating only a current CSV CANNOT establish that past cells were not edited.
"""
from __future__ import annotations

import argparse
import csv
from datetime import date
from pathlib import Path
import re
from urllib.parse import urlparse

PHASE_FIELDS = (
    "fase_id", "dominio", "fase_madurez", "estado",
    "resultado_acreditado", "criterio_o_evidencia", "evidencia_url",
    "bloqueo", "proxima_accion", "actualizado", "ultimo_avance_id",
    "criterio_superado",
)
EVENT_FIELDS = (
    "avance_id", "fecha", "dominio", "vertiente", "fase_id",
    "tipo", "descripcion", "estado", "evidencia_url", "referencia",
    "impacto", "siguiente_accion",
)
PHASE_STATES = {
    "COMPLETADA", "PARCIAL", "PREPARADO_NO_EMITIDO",
    "NO_INICIADA", "BLOQUEADA",
}
EVENT_STATES = {
    "VERIFICADO", "IMPLEMENTADO", "SINTETICO_VERIFICADO",
    "EN_CURSO", "BLOQUEADO", "SUPERADO",
}
PHASE_ID = re.compile(r"^[A-Z][A-Z0-9_-]{2,45}$")
ADVANCE_ID = re.compile(r"^AV-(\d{8})-(\d{3,})$")


def read_table(path, required_columns):
    with Path(path).open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if (reader.fieldnames is None or
                tuple(reader.fieldnames) != required_columns or
                len(reader.fieldnames) != len(set(reader.fieldnames))):
            raise ValueError("Private export has incorrect columns or duplicates")
        rows = list(reader)
    if not rows or any(None in row or any(v is None for v in row.values()) for row in rows):
        raise ValueError("Private export has no data or malformed rows")
    return rows


def iso_day(text):
    try:
        parsed = date.fromisoformat(text)
    except (ValueError, TypeError):
        raise ValueError("Expected a valid ISO calendar day") from None
    if parsed.isoformat() != text:
        raise ValueError("Date must use YYYY-MM-DD")
    return parsed


def evidence_url(url):
    if not url:
        raise ValueError("Evidence URL is required")
    parts = urlparse(url)
    if parts.scheme != "https" or not parts.hostname or parts.username or parts.password:
        raise ValueError("Evidence must use an absolute HTTPS link")
    if parts.hostname in ("localhost", "127.0.0.1"):
        raise ValueError("Local endpoints are not independent evidence")


def validate_tables(phases, advances, previous_advances=None):
    """Validate one current snapshot and optionally prove prefix preservation.

    Current history alone cannot prove true append-only operation: a trusted
    historical snapshot or hash chain is still required for that assertion.
    """
    if not phases or not advances:
        raise ValueError("Expected nonempty phase and advance tables")
    phase_by_id = {}
    for row in phases:
        pid = row["fase_id"]
        if not PHASE_ID.fullmatch(pid) or pid in phase_by_id:
            raise ValueError("Duplicate or invalid phase identity")
        if row["estado"] not in PHASE_STATES:
            raise ValueError("Unknown phase maturity state")
        criterion = row["criterio_superado"]
        if criterion not in ("SI", "NO") or (criterion == "SI") != (row["estado"] == "COMPLETADA"):
            raise ValueError("Completed phase and criterion gate disagree")
        if not all(row[k].strip() for k in (
            "dominio", "fase_madurez", "resultado_acreditado",
            "criterio_o_evidencia", "proxima_accion"
        )):
            raise ValueError("Maturity stage has incomplete rationale")
        evidence_url(row["evidencia_url"])
        iso_day(row["actualizado"])
        phase_by_id[pid] = row

    seen, by_event = set(), {}
    previous_day = None
    for row in advances:
        event_id = row["avance_id"]
        match = ADVANCE_ID.fullmatch(event_id)
        if not match or event_id in seen:
            raise ValueError("Duplicate or malformed advancement ID")
        seen.add(event_id)
        event_date = iso_day(row["fecha"])
        if match.group(1) != event_date.strftime("%Y%m%d"):
            raise ValueError("Event identifier does not match its calendar day")
        if previous_day and event_date < previous_day:
            raise ValueError("Events are not in chronological append order")
        previous_day = event_date
        if row["fase_id"] not in phase_by_id:
            raise ValueError("Advancement cites unknown maturity phase")
        if row["estado"] not in EVENT_STATES:
            raise ValueError("Unknown advancement state")
        if not all(row[k].strip() for k in (
            "dominio", "vertiente", "tipo", "descripcion", "referencia",
            "impacto", "siguiente_accion"
        )):
            raise ValueError("Advancement lacks an auditable explanation")
        evidence_url(row["evidencia_url"])
        by_event[event_id] = row

    for row in phases:
        latest = row["ultimo_avance_id"]
        if latest:
            if latest not in by_event or by_event[latest]["fase_id"] != row["fase_id"]:
                raise ValueError("Phase references an absent or unrelated advancement")
            if iso_day(row["actualizado"]) < iso_day(by_event[latest]["fecha"]):
                raise ValueError("Phase updated before its cited advancement")

    if previous_advances is not None:
        if len(previous_advances) > len(advances):
            raise ValueError("Prior historical log cannot shrink")
        if advances[:len(previous_advances)] != previous_advances:
            raise ValueError("Append-only log previously recorded rows were edited")

    # Report counts ONLY. This structural audit never verifies signed issuance,
    # predicts a real event or certifies source vintage or trust authority.
    return {
        "schema": "psychohistory.private_progress_audit.v1",
        "phases": len(phases),
        "advances": len(advances),
        "completedPhases": sum(r["estado"] == "COMPLETADA" for r in phases),
        "appendOnlyComparedWithPreviousSnapshot": previous_advances is not None,
        "forecastIssuanceVerified": False,
        "prospectiveSkillVerified": False,
        "scientificClaimsCertified": False,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--phases-csv", type=Path, required=True)
    parser.add_argument("--advances-csv", type=Path, required=True)
    parser.add_argument("--previous-advances-csv", type=Path)
    args = parser.parse_args()
    result = validate_tables(
        read_table(args.phases_csv, PHASE_FIELDS),
        read_table(args.advances_csv, EVENT_FIELDS),
        read_table(args.previous_advances_csv, EVENT_FIELDS)
        if args.previous_advances_csv else None,
    )
    import json
    print(json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    main()
