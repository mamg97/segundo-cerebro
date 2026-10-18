"""External VIEWS monthly forecast intake: versioned, private, read-only science.

This is a STRICTLY EXTERNAL independent comparator (fatalities003), NOT a
PSICOHISTORIA-generated forecast. Never mix month-level VIEWS probability
of >=25 battle-related deaths with the annual UCDP 2027 presence target.
No API credentials, automatic fetches, payments, Git data or real issuance.
"""
from __future__ import annotations

import argparse
import csv
from datetime import date
import hashlib
import json
import math
from pathlib import Path
import re

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
RELEASE = re.compile(r"^fatalities003_(20\d{2})_(0[1-9]|1[0-2])_t01$")
REQUIRED = (
    "country_id", "month_id", "name", "gwcode", "isoab", "year", "month",
    "main_mean", "main_dich", "main_mean_ln",
)
FIELDS = (
    "provider", "release", "input_through", "forecast_month", "lead_months",
    "gwcode", "isoab", "country_name", "expected_fatalities",
    "probability_25_brds_in_month", "model_origin",
    "scientific_status",
)
SCHEMA = "psychohistory.external_views_monthly_readonly.v1"


def month_offset(year: int, month: int, ahead: int):
    index = year * 12 + month - 1 + ahead
    return index // 12, index % 12 + 1


def private_file(path, *, new=False):
    p = Path(path).absolute()
    if (p.is_symlink() or p.resolve().is_relative_to(REPO)
            or p.parent.is_symlink() or not p.parent.is_dir()):
        raise ValueError("Source/output must remain outside public repo")
    if new:
        if p.exists():
            raise ValueError("Create-only private output already exists")
    elif not p.is_file() or p.stat().st_size > 40_000_000:
        raise ValueError("Existing regular private CSV required (<=40MB)")
    return p


def parse_release(release):
    m = RELEASE.fullmatch(release) if isinstance(release, str) else None
    if not m:
        raise ValueError("Pin an explicit fatalities003_YYYY_MM_t01 release")
    return int(m.group(1)), int(m.group(2))


def load(source, release, *, expected_sha256):
    """Strict parsing; no implicit country or missing-month imputations."""
    yr, mo = parse_release(release)
    if not isinstance(expected_sha256, str) or not re.fullmatch("[a-f0-9]{64}", expected_sha256):
        raise ValueError("Exact externally downloaded CSV SHA256 must be pinned")
    path = private_file(source)
    raw_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    if raw_hash != expected_sha256:
        raise ValueError("Original VIEWS release bytes failed pinned SHA256")
    result = []
    countries = {}
    observed = set()
    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None or not set(REQUIRED).issubset(reader.fieldnames):
            raise ValueError("Unexpected country-month VIEWS CSV schema")
        for row in reader:
            try:
                cid = int(row["country_id"])
                gw = int(row["gwcode"])
                month_id = int(row["month_id"])
                year = int(row["year"])
                month = int(row["month"])
                mean = float(row["main_mean"])
                dich = float(row["main_dich"])
                ln = float(row["main_mean_ln"])
            except (ValueError, TypeError, KeyError) as exc:
                raise ValueError("Invalid VIEWS country-month value") from exc
            if not (1 <= month <= 12 and cid > 0 and gw > 0 and
                    month_id > 0 and year >= yr and
                    math.isfinite(mean) and math.isfinite(dich) and math.isfinite(ln) and
                    mean >= 0 and 0 <= dich <= 1 and ln >= 0):
                raise ValueError("Nonfinite or out-of-bounds VIEWS prediction")
            isoab, name = (row["isoab"] or "").strip(), (row["name"] or "").strip()
            if not re.fullmatch(r"[A-Z]{3}", isoab) or not name or len(name) > 150:
                raise ValueError("Invalid country label")
            lead = (year - yr) * 12 + month - mo
            if not (1 <= lead <= 36):
                raise ValueError("Forecast month must be 1-36 months after release inputs")
            pair = (cid, year, month)
            if pair in observed:
                raise ValueError("Duplicate country-month forecast")
            observed.add(pair)
            if cid in countries and countries[cid] != (gw, isoab, name):
                raise ValueError("Country changed GW/ISO identifiers within one release")
            countries[cid] = (gw, isoab, name)
            result.append({
                "country_id":cid,"gwcode":gw,"isoab":isoab,"name":name,
                "month_id":month_id,"year":year,"month":month,
                "lead":lead,"main_mean":mean,"main_dich":dich,
                "main_mean_ln":ln,
            })
    if not result:
        raise ValueError("Empty VIEWS country-month input")
    # Require every identified country's full 36-month sequence; no partial
    # sums masquerading as comprehensive 3-month horizons.
    by_country = {}
    for row in result:
        by_country.setdefault(row["country_id"], set()).add(row["lead"])
    if any(leads != set(range(1,37)) for leads in by_country.values()):
        raise ValueError("Incomplete 36-month country forecast; do not impute")
    return result


def summarize_months(rows, release, *, asof_month, next_n=3):
    """Select NEXT N WHOLE CALENDAR MONTHS, not literal 30/60/90 days.

    Summed point predictions of monthly fatalities are mechanically additive;
    probabilities of any conflict in a window are NOT additive or independent.
    """
    rel_year,rel_month = parse_release(release)
    if not re.fullmatch(r"20\d{2}-(0[1-9]|1[0-2])", asof_month):
        raise ValueError("Use YYYY-MM as the observer's calendar month")
    ay,am = map(int,asof_month.split("-"))
    # Must never declare forecasts for months that are past at viewing time.
    start_lead = (ay-rel_year)*12 + am-rel_month + 1
    if start_lead < 1 or start_lead+next_n-1 > 36 or not 1 <= next_n <= 12:
        raise ValueError("Requested complete future months lie outside 36-month release")
    names = ("M+"+str(i) for i in range(1,next_n+1))
    selected = {}
    for row in rows:
        if start_lead <= row["lead"] < start_lead + next_n:
            selected.setdefault(row["country_id"],[]).append(row)
    ids = {row["country_id"] for row in rows}
    if set(selected) != ids or any(len(v) != next_n for v in selected.values()):
        raise ValueError("Missing country-months in selected outlook")
    monthly = []
    totals = []
    for cid, vs in selected.items():
        vs.sort(key=lambda x:x["lead"])
        for n,row in enumerate(vs,1):
            y,m=month_offset(ay,am,n)
            if (row["year"],row["month"]) != (y,m):
                raise ValueError("Month ordinal/year mismatch")
            name=row["name"].lstrip()
            if name.startswith(("=","+","-","@")):
                name="'"+name
            monthly.append({
                "provider":"VIEWS","release":release,
                "input_through":f"{rel_year:04d}-{rel_month:02d}",
                "forecast_month":f"{y:04d}-{m:02d}",
                "lead_months":row["lead"],"gwcode":row["gwcode"],
                "isoab":row["isoab"],"country_name":name,
                "expected_fatalities":row["main_mean"],
                "probability_25_brds_in_month":row["main_dich"],
                "model_origin":"EXTERNAL_VIEWS_FATALITIES003",
                "scientific_status":"PUBLISHED_EXTERNAL_FORECAST_NOT_OURS",
            })
        totals.append({
            "gwcode":vs[0]["gwcode"],"isoab":vs[0]["isoab"],
            "country_name":vs[0]["name"],
            "calendar_months":next_n,
            "expected_fatalities_sum":sum(v["main_mean"] for v in vs),
            # DO NOT derive a probability for "any conflict in 3 months".
            "probability_any_conflict_in_window":None,
            "provider":"VIEWS",
            "forecastIssuedByPsychohistory":False,
        })
    monthly.sort(key=lambda x:(x["forecast_month"],x["gwcode"]))
    totals.sort(key=lambda x:(-x["expected_fatalities_sum"],x["gwcode"]))
    return monthly,totals


def write_private_csv(rows, destination, columns):
    p=private_file(destination,new=True)
    with p.open("x", newline="", encoding="utf-8-sig") as file:
        wr=csv.DictWriter(file,fieldnames=columns)
        wr.writeheader()
        wr.writerows(rows)
    p.chmod(0o600)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-csv",type=Path,required=True)
    parser.add_argument("--release",required=True)
    parser.add_argument("--sha256",required=True)
    parser.add_argument("--asof-month",required=True)
    parser.add_argument("--out-csv",type=Path,required=True)
    args=parser.parse_args()
    rows=load(args.input_csv,args.release,expected_sha256=args.sha256)
    view,summary=summarize_months(rows,args.release,asof_month=args.asof_month)
    write_private_csv(view,args.out_csv,FIELDS)
    # Never print any individual country, forecast value, path or source hash.
    print(json.dumps({
        "schema":SCHEMA,
        "status":"EXTERNAL_PUBLISHED_FORECAST_NOT_PSICOHISTORIA",
        "release":args.release,
        "countries":len(summary),"months":3,"rows":len(view),
        "windowAggregateConflictProbabilityAvailable":False,
        "annualUcdpTargetComparable":False,
        "ourForecastIssued":False,
    },sort_keys=True))


if __name__=="__main__":
    main()
