"""Generate a decision-oriented PRIVATE risk table from canonical 2027 shadow data.

No new forecast, ensemble, onset prediction, calibration, scoring or issuance.
Validation uses pinned UCDP bytes and frozen code/policy. Original predictions
never appear in public Git, CI logs or artifacts. The CSV is written privately.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import math
from pathlib import Path
import zipfile

from issue_2027_preflight import inspect_report, safe_private_file
from private_archive_intake import verify_private_archive, verified_input

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
FIELDS = (
    "ranking_por_v2", "country_id", "pais_ucdp", "horizonte",
    "v2_logistic", "baseline_frequency", "diferencia_vs_baseline_pp",
    "interaction_table", "markov", "v1_memory_index", "persistence",
    "desacuerdo_v2_interaction_pp", "estado",
)
STATUS = "SHADOW_NO_EMITIDO"


def safe_name(name):
    if not isinstance(name, str) or not name.strip() or len(name) > 180:
        raise ValueError("Invalid country name")
    # Google Sheets formula-injection protection for controlled CSV exports.
    if name.lstrip().startswith(("=", "+", "-", "@")):
        return "'" + name
    return name


def build_risk_rows(report, policy, names):
    if (not isinstance(report, dict) or not isinstance(policy, dict)
            or not isinstance(names, dict)):
        raise ValueError("Missing report, policy or country names")
    if (report.get("schema") != "psychohistory.ucdp_cy261_future_candidates.v1" or
            report.get("forecastIssued") is not False or
            report.get("prospectiveEligible") is not False or
            report.get("targetYear") != 2027 or
            report.get("models") != policy.get("models") or
            policy.get("target_year") != 2027 or
            len(report.get("candidates", [])) != policy.get("expected_roster_size")):
        raise ValueError("Only the complete canonical unissued cohort is admissible")
    models = set(policy["models"])
    out = []
    seen = set()
    for candidate in report["candidates"]:
        cid = candidate["countryId"]
        if type(cid) is not int or cid in seen or cid not in names:
            raise ValueError("Missing or duplicate country name")
        seen.add(cid)
        if (candidate.get("outcome") is not None or
                candidate.get("targetYear") != 2027 or
                candidate.get("featureCutoffYear") != 2025):
            raise ValueError("Future outcome or lookahead in the candidate file")
        ps = candidate["probabilities"]
        if not isinstance(ps, dict) or set(ps) != models or any(
            type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v <= 1
            for v in ps.values()
        ):
            raise ValueError("Invalid or incomplete probability vector")
        v2 = ps["v2_logistic"]
        freq = ps["frequency"]
        interaction = ps["interaction_table"]
        out.append({
            "ranking_por_v2": None,
            "country_id": cid,
            "pais_ucdp": safe_name(names[cid]),
            "horizonte": 2027,
            "v2_logistic": v2,
            "baseline_frequency": freq,
            "diferencia_vs_baseline_pp": (v2 - freq) * 100,
            "interaction_table": interaction,
            "markov": ps["markov"],
            "v1_memory_index": ps["v1_memory_index"],
            "persistence": ps["persistence"],
            "desacuerdo_v2_interaction_pp": abs(v2 - interaction) * 100,
            "estado": STATUS,
        })
    out.sort(key=lambda row: (-row["v2_logistic"], row["country_id"]))
    for rank, item in enumerate(out, 1):
        item["ranking_por_v2"] = rank
    return out


def canonical_private_view(candidate_path, archive_path):
    candidate_path = safe_private_file(candidate_path)
    archive_path = verified_input(archive_path)
    policy = json.loads((HERE / "policy_2027.json").read_text(encoding="utf-8"))
    protocol = json.loads((HERE / "protocol.json").read_text(encoding="utf-8"))
    report = json.loads(candidate_path.read_text(encoding="utf-8"))
    preflight = inspect_report(report, policy, protocol)
    if (preflight["status"] != "CANONICAL_SHADOW_PREFLIGHT_PASSED_NOT_ISSUED"
            or preflight["modelProtocolAndCodeMatched"] is not True
            or preflight["issuanceEligible"] is not False):
        raise ValueError("The candidate report is not the canonical unissued model")
    gate = verify_private_archive(archive_path, protocol)
    if gate["sourceChecksumMatchesPinnedProtocol"] is not True:
        raise ValueError("Original UCDP source archive was not verified")
    with zipfile.ZipFile(archive_path) as top:
        official = top.read("sources/ucdp.zip")
    with zipfile.ZipFile(io.BytesIO(official)) as inner:
        infos = [i for i in inner.infolist() if not i.is_dir()]
        if len(infos) != 1:
            raise ValueError("UCDP source ZIP must have a single CSV")
        rows = csv.DictReader(io.TextIOWrapper(inner.open(infos[0]), encoding="utf-8-sig"))
        names = {}
        for row in rows:
            if int(row["year"]) != 2025:
                continue
            cid = int(row["country_id"])
            if cid in names:
                raise ValueError("Duplicate country label for the source snapshot")
            names[cid] = row["country"]
    return build_risk_rows(report, policy, names)


def write_private_table(rows, output):
    out = Path(output).absolute()
    if (out.is_symlink() or out.exists() or out.resolve().is_relative_to(REPO) or
            not out.parent.is_dir() or out.parent.is_symlink()):
        raise ValueError("Private output must be a new file outside public Git")
    if len(rows) != 196:
        raise ValueError("The frozen 2027 roster is incomplete")
    with out.open("x", newline="", encoding="utf-8-sig") as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    out.chmod(0o600)
    return {
        "status": STATUS,
        "rows": len(rows),
        "probabilitiesPerCountry": 6,
        "forecastIssued": False,
        "prospectiveEligible": False,
        "warning": "This is a ranking of the presence target, not new conflict onset or demonstrated prospective accuracy.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate-json", type=Path, required=True)
    parser.add_argument("--private-archive", type=Path, required=True)
    parser.add_argument("--output-csv", type=Path, required=True)
    args = parser.parse_args()
    rows = canonical_private_view(args.candidate_json, args.private_archive)
    summary = write_private_table(rows, args.output_csv)
    # Never print country names, probabilities, local private path or SHA.
    print(json.dumps(summary, sort_keys=True))


if __name__ == "__main__":
    main()
