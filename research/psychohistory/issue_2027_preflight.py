"""Private, read-only preflight for the frozen 2027 country-year policy.

Never writes probabilities to Git or a shared log. A valid shadow report is
NOT an issued forecast. Source timestamps and TSA independence are separate
external gates, not inferred from the mere existence of this report.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
CANONICAL_SCHEMA = "psychohistory.ucdp_cy261_future_candidates.v1"
LEGACY_SCHEMA = "psychohistory.ucdp_cy261_6model_private_execution.v1"
RESULT_SCHEMA = "psychohistory.2027.private_issuance_preflight.v1"


def digest(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def safe_private_file(path):
    path = Path(path).absolute()
    if path.is_symlink() or not path.is_file() or path.resolve().is_relative_to(REPO):
        raise ValueError("Expected an existing private regular file outside Git")
    if path.stat().st_size > 20_000_000:
        raise ValueError("Unexpected shadow report size")
    return path


def inspect_report(report, policy, protocol):
    """Validate *unissued* probabilities without inspecting future outcomes."""
    if not isinstance(report, dict) or not isinstance(policy, dict):
        raise ValueError("Invalid report or frozen 2027 policy")
    if policy.get("schema") != "psychohistory.2027.country_year.prespecified_scoring.v1":
        raise ValueError("Wrong scoring policy schema")
    if (policy.get("input_edition") != protocol["dataset_version"] or
        policy.get("input_zip_sha256") != protocol["archive_sha256"] or
        policy.get("input_codebook_sha256") != protocol["codebook_sha256"] or
        policy.get("models") != protocol["models"] or
        policy.get("baseline") != "frequency" or
        policy.get("primary_challenger") != "v2_logistic" or
        policy.get("target_year") != 2027 or
        policy.get("expected_roster_size") != 196 or
        policy.get("feature_cutoff_year") != 2025 or
        policy.get("training_labels_through_year") != 2025 or
        policy.get("scoring_authorized") is not False):
        raise ValueError("Frozen scoring policy no longer matches preregistered source/model")
    if report.get("schema") not in (CANONICAL_SCHEMA, LEGACY_SCHEMA):
        raise ValueError("Unsupported private candidate schema")
    if (report.get("status") != "UNISSUED_SHADOW_CANDIDATES_ONLY" or
        report.get("datasetVersion") != protocol["dataset_version"] or
        report.get("targetYear") != 2027 or
        report.get("featuresAvailableThroughYear") != 2025 or
        report.get("inputZipSha256") != protocol["archive_sha256"] or
        report.get("inputCodebookSha256") != protocol["codebook_sha256"] or
        report.get("models") != policy["models"] or
        report.get("benchmarkModel") != policy["baseline"] or
        report.get("sourceIntegrityVerified") is not True or
        report.get("forecastIssued") is not False or
        report.get("prospectiveEligible") is not False or
        report.get("sourcePublicationAsOfVerified") is not False or
        report.get("independentTimestampVerified") is not False):
        raise ValueError("Report has incompatible source, horizon or issuance claims")

    values = report.get("candidates")
    if not isinstance(values, list) or len(values) != policy["expected_roster_size"]:
        raise ValueError("Missing or incomplete frozen 2027 roster")
    seen = set()
    for row in values:
        if not isinstance(row, dict) or set(row) != {
            "countryId", "targetYear", "featureCutoffYear", "trainingLabelsThroughYear",
            "trainingN", "outcome", "probabilities"
        }:
            raise ValueError("Unexpected country candidate fields")
        cid = row["countryId"]
        if type(cid) is not int or cid <= 0 or cid in seen:
            raise ValueError("Duplicate or invalid country identifier")
        seen.add(cid)
        if (row["targetYear"] != 2027 or row["featureCutoffYear"] != 2025 or
            row["trainingLabelsThroughYear"] != 2025 or
            type(row["trainingN"]) is not int or row["trainingN"] <= 0 or
            row["outcome"] is not None):
            raise ValueError("Observed outcome, look-ahead or missing training evidence")
        probabilities = row["probabilities"]
        # JSON canonical serialization may sort object keys alphabetically.
        # Model identity (not dictionary iteration order) is the scientific gate.
        if (not isinstance(probabilities, dict) or
                len(probabilities) != len(policy["models"]) or
                set(probabilities) != set(policy["models"])):
            raise ValueError("All frozen models must have a probability for each country")
        if any(type(p) not in (float, int) or not math.isfinite(p) or p < 0 or p > 1
               for p in probabilities.values()):
            raise ValueError("Invalid model probability")

    code_verified = False
    if report["schema"] == CANONICAL_SCHEMA:
        code_verified = (
            report.get("protocolSha256") == digest(HERE / "protocol.json") and
            report.get("modelCodeSha256") == digest(HERE / "benchmark.py") and
            report.get("candidateCodeSha256") == digest(HERE / "future_2027_candidates.py")
        )
        if not code_verified:
            raise ValueError("Canonical generator checksum mismatch")
    elif report.get("candidateGeneratorCodeFromGitExecutedDirectly") is not False:
        raise ValueError("Prior wrapper must explicitly disclose noncanonical execution")

    # No receipt, independently attested source publication, issued payload
    # or future outcome is read here. They cannot become verified by default.
    return {
        "schema": RESULT_SCHEMA,
        "status": ("CANONICAL_SHADOW_PREFLIGHT_PASSED_NOT_ISSUED"
                   if code_verified else "LEGACY_SHADOW_STRUCTURALLY_VALID_NOT_CANONICAL"),
        "targetYear": 2027,
        "countries": len(seen),
        "models": len(policy["models"]),
        "probabilitiesChecked": len(seen) * len(policy["models"]),
        "modelProtocolAndCodeMatched": code_verified,
        "outcomesObserved": 0,
        "forecastIssued": False,
        "independentTsaVerified": False,
        "sourcePublicationAsOfVerified": False,
        "issuanceEligible": False,
        "evaluationEligible": False,
        "primaryMetric": policy["primary_metric"],
        "baselineModel": policy["baseline"],
        "primaryChallenger": policy["primary_challenger"],
        "remainingGates": [
            "Independent verification of source availability before forecast issuance",
            "Independently trusted, nonce-bound RFC3161 receipt for committed forecast",
            "Frozen universe and probability payload published to append-only private issuance ledger",
            "Resolution against first official full-year 2027 UCDP release, not yet available",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate-json", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--require-canonical", action="store_true")
    args = parser.parse_args()
    source = safe_private_file(args.candidate_json)
    target = args.out.absolute()
    if target.resolve().is_relative_to(REPO) or target.is_symlink() or not target.parent.is_dir():
        raise ValueError("Preflight report destination must be an existing private directory")
    policy_path = HERE / "policy_2027.json"
    policy = json.loads(policy_path.read_text())
    protocol = json.loads((HERE / "protocol.json").read_text())
    report = json.loads(source.read_text())
    result = inspect_report(report, policy, protocol)
    if args.require_canonical and not result["modelProtocolAndCodeMatched"]:
        raise ValueError("Noncanonical prior wrapper cannot pass strict preissue provenance")
    result["candidateFileSha256"] = digest(source)
    result["frozenScoringPolicySha256"] = digest(policy_path)
    result["validatedAtUtc"] = dt.datetime.now(dt.timezone.utc).isoformat()
    with target.open("x", encoding="utf-8") as f:
        json.dump(result, f, sort_keys=True, indent=2, ensure_ascii=False)
        f.write("\n")
    target.chmod(0o600)
    # Aggregate only; never print any country, probability, or private path.
    print(json.dumps({
        "status": result["status"],
        "countries": result["countries"], "models": result["models"],
        "candidateFileSha256": result["candidateFileSha256"],
        "issuanceEligible": False,
        "outcomeKnown": False
    }, sort_keys=True))


if __name__ == "__main__":
    main()
