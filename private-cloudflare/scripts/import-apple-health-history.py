#!/usr/bin/env python3
"""Normalize an Apple Health export into idempotent D1 SQL for Segundo Cerebro.

Privacy: the ZIP is read locally. Raw health data is never uploaded to GitHub.
The generated SQL should live under .private/ (gitignored).

Usage:
  python3 scripts/import-apple-health-history.py /path/to/export.zip
  python3 scripts/import-apple-health-history.py /path/to/export.zip --apply

By default the export's latest date is excluded from activity backfill so the live
23:55 Shortcut remains authoritative for the current day. Body samples remain
idempotent and may include that date.
"""
from __future__ import annotations

import argparse
import collections
import json
import math
import statistics
import subprocess
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path

RECORD_TYPES = {
    "HKQuantityTypeIdentifierActiveEnergyBurned": "activeKcal",
    "HKQuantityTypeIdentifierBasalEnergyBurned": "restingKcal",
    "HKQuantityTypeIdentifierStepCount": "steps",
    "HKQuantityTypeIdentifierAppleExerciseTime": "exerciseMinutes",
    "HKQuantityTypeIdentifierBodyMass": "bodyMass",
    "HKQuantityTypeIdentifierBodyFatPercentage": "bodyFatPercentage",
    "HKQuantityTypeIdentifierBodyMassIndex": "bodyMassIndex",
    "HKQuantityTypeIdentifierLeanBodyMass": "leanBodyMass",
}
BODY_TYPES = {"bodyMass", "bodyFatPercentage", "bodyMassIndex", "leanBodyMass"}
WATCH_MARKER = "apple watch"
IPHONE_MARKER = "iphone"
ZEPP_MARKER = "zepp life"


def parse_health_dt(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%d %H:%M:%S %z")


def iso_health_dt(value: str) -> str:
    return parse_health_dt(value).isoformat(timespec="seconds")


def q(value):
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        if not math.isfinite(float(value)):
            return "NULL"
        return repr(float(value)) if isinstance(value, float) else str(value)
    return "'" + str(value).replace("'", "''") + "'"


def norm_source(value: str) -> str:
    return str(value or "").replace("\u00a0", " ").strip()


def source_is(source: str, marker: str) -> bool:
    return marker in norm_source(source).lower()


def find_export_xml(zf: zipfile.ZipFile) -> str:
    candidates = [n for n in zf.namelist() if n.lower().endswith(".xml") and "cda" not in n.lower()]
    if not candidates:
        raise RuntimeError("No se encontró el XML principal de Apple Health dentro del ZIP.")
    return max(candidates, key=lambda n: zf.getinfo(n).file_size)


def iter_health(zip_path: Path):
    with zipfile.ZipFile(zip_path) as zf:
        name = find_export_xml(zf)
        with zf.open(name) as stream:
            for _event, elem in ET.iterparse(stream, events=("end",)):
                if elem.tag in ("Record", "Workout"):
                    yield elem.tag, dict(elem.attrib)
                elem.clear()


def workout_payload(raw: dict) -> dict:
    out = {
        "type": str(raw.get("workoutActivityType", "")).replace("HKWorkoutActivityType", ""),
        "startDate": iso_health_dt(raw["startDate"]) if raw.get("startDate") else None,
        "endDate": iso_health_dt(raw["endDate"]) if raw.get("endDate") else None,
        "source": norm_source(raw.get("sourceName", "")),
    }
    for key in ("duration", "totalDistance", "totalEnergyBurned"):
        try:
            if raw.get(key) not in (None, ""):
                out[key] = float(raw[key])
        except ValueError:
            pass
    for key in ("durationUnit", "totalDistanceUnit", "totalEnergyBurnedUnit"):
        if raw.get(key):
            out[key] = raw[key]
    return out


def choose_workouts(items: list[dict]) -> list[dict]:
    """Prefer Apple Watch workouts; keep non-Watch sessions only if not overlapping."""
    watch = [w for w in items if source_is(w.get("sourceName", ""), WATCH_MARKER)]
    others = [w for w in items if w not in watch]
    selected = list(watch)
    watch_times = []
    for w in watch:
        try:
            watch_times.append(parse_health_dt(w["startDate"]))
        except Exception:
            pass
    for w in others:
        try:
            start = parse_health_dt(w["startDate"])
        except Exception:
            continue
        if any(abs((start - ws).total_seconds()) <= 30 * 60 for ws in watch_times):
            continue
        selected.append(w)
    selected.sort(key=lambda w: w.get("startDate", ""))
    return [workout_payload(w) for w in selected]


def build(zip_path: Path, through: str | None = None):
    sums = {
        metric: collections.defaultdict(lambda: collections.defaultdict(float))
        for metric in ("activeKcal", "restingKcal", "steps", "exerciseMinutes")
    }
    watch_hours = collections.defaultdict(set)
    body = []
    workouts_by_day = collections.defaultdict(list)
    min_date = None
    max_date = None
    sources = collections.Counter()

    for tag, a in iter_health(zip_path):
        if tag == "Workout":
            if not a.get("startDate"):
                continue
            day = parse_health_dt(a["startDate"]).date().isoformat()
            workouts_by_day[day].append(a)
            min_date = day if min_date is None or day < min_date else min_date
            max_date = day if max_date is None or day > max_date else max_date
            sources[norm_source(a.get("sourceName", ""))] += 1
            continue

        metric = RECORD_TYPES.get(a.get("type"))
        if not metric or not a.get("startDate"):
            continue
        source = norm_source(a.get("sourceName", ""))
        day = parse_health_dt(a["startDate"]).date().isoformat()
        min_date = day if min_date is None or day < min_date else min_date
        max_date = day if max_date is None or day > max_date else max_date
        sources[source] += 1
        try:
            value = float(a.get("value", ""))
        except ValueError:
            continue

        if metric in BODY_TYPES:
            # Apple exports Zepp percentage values as fractions (0.223 == 22.3 %).
            if metric == "bodyFatPercentage" and value <= 1.5:
                value *= 100.0
            body.append({
                "type": metric,
                "value": value,
                "unit": "%" if metric == "bodyFatPercentage" else ("count" if metric == "bodyMassIndex" else "kg"),
                "date": day,
                "measuredAt": iso_health_dt(a["startDate"]),
                "source": source,
            })
            continue

        sums[metric][day][source] += value
        if metric == "restingKcal" and source_is(source, WATCH_MARKER):
            watch_hours[day].add(parse_health_dt(a["startDate"]).hour)

    if not max_date:
        raise RuntimeError("El export no contiene registros compatibles.")

    watch_days = sorted({
        day for day, by_source in sums["restingKcal"].items()
        if any(source_is(src, WATCH_MARKER) and value > 0 for src, value in by_source.items())
    })
    watch_start = watch_days[0] if watch_days else None

    full_watch_rest = []
    for day in watch_days:
        wh = len(watch_hours.get(day, set()))
        total = sum(v for src, v in sums["restingKcal"][day].items() if source_is(src, WATCH_MARKER))
        if wh >= 22 and total > 0:
            full_watch_rest.append(total)
    median_watch_rest = statistics.median(full_watch_rest) if full_watch_rest else None

    def source_total(metric: str, day: str, marker: str) -> float:
        return sum(v for src, v in sums[metric].get(day, {}).items() if source_is(src, marker))

    final_activity_date = through or (datetime.fromisoformat(max_date).date() - timedelta(days=1)).isoformat()
    all_days = sorted({day for metric in sums.values() for day in metric.keys()} | set(workouts_by_day.keys()))
    activity_rows = []
    quality_counts = collections.Counter()

    for day in all_days:
        if day > final_activity_date:
            continue
        after_watch = bool(watch_start and day >= watch_start)

        if after_watch:
            wh = len(watch_hours.get(day, set()))
            resting = source_total("restingKcal", day, WATCH_MARKER)
            active = source_total("activeKcal", day, WATCH_MARKER)
            watch_steps = source_total("steps", day, WATCH_MARKER)
            phone_steps = source_total("steps", day, IPHONE_MARKER)
            # Do not sum Watch + iPhone raw steps; they overlap. Max is a conservative fallback.
            steps = max(watch_steps, phone_steps)
            exercise = max(
                source_total("exerciseMinutes", day, WATCH_MARKER),
                source_total("exerciseMinutes", day, IPHONE_MARKER),
            )
            ratio = (resting / median_watch_rest) if median_watch_rest and resting else 0.0
            if wh >= 22 and ratio >= 0.85:
                quality = "full"
            elif wh >= 16 and ratio >= 0.60:
                quality = "partial"
            elif wh > 0 or resting > 0:
                quality = "low"
            else:
                quality = "no_watch"
            source = "apple_health_export_watch" if quality == "full" else "apple_health_export_partial"
            details = [
                {
                    "kind": "coverage",
                    "quality": quality,
                    "watchRestingHours": wh,
                    "watchRestingRatio": round(ratio, 3),
                    "watchStart": watch_start,
                },
                {
                    "kind": "steps",
                    "method": "max_source_total",
                    "watch": round(watch_steps),
                    "iphone": round(phone_steps),
                },
            ]
        else:
            wh = 0
            active = source_total("activeKcal", day, IPHONE_MARKER)
            resting = source_total("restingKcal", day, IPHONE_MARKER)
            steps = source_total("steps", day, IPHONE_MARKER)
            exercise = source_total("exerciseMinutes", day, IPHONE_MARKER)
            quality = "phone_only"
            source = "apple_health_export_phone"
            details = [{
                "kind": "coverage",
                "quality": quality,
                "watchRestingHours": 0,
                "watchStart": watch_start,
            }]

        canonical_workouts = choose_workouts(workouts_by_day.get(day, []))
        has_active = bool(sums["activeKcal"].get(day))
        has_resting = bool(sums["restingKcal"].get(day))
        has_steps = bool(sums["steps"].get(day))
        has_exercise = bool(sums["exerciseMinutes"].get(day))

        active_v = active if has_active else None
        resting_v = resting if has_resting else None
        total_v = (active + resting) if has_active and has_resting else None
        steps_v = int(round(steps)) if has_steps else None
        exercise_v = exercise if has_exercise else (0.0 if canonical_workouts else None)

        note = (
            "Apple Health historical backfill. "
            f"coverage={quality}. "
            + (
                "Día apto para tendencia de gasto."
                if quality == "full"
                else "No usar este día para inferir gasto/actividad completos; el Apple Watch no cubre todo el día."
                if after_watch
                else "Periodo previo al Apple Watch; actividad dependiente de llevar el iPhone encima."
            )
        )

        activity_rows.append({
            "date": day,
            "active": active_v,
            "resting": resting_v,
            "total": total_v,
            "steps": steps_v,
            "exercise": exercise_v,
            "workouts": canonical_workouts,
            "source": source,
            "note": note,
            "details": details,
            "quality": quality,
        })
        quality_counts[quality] += 1

    # Keep Zepp Life as canonical for composition. Other weight-only sources are kept
    # only when Zepp has no measurement on that date.
    zepp_weight_dates = {
        item["date"] for item in body
        if item["type"] == "bodyMass" and source_is(item["source"], ZEPP_MARKER)
    }
    body_rows = []
    for item in body:
        if item["type"] != "bodyMass" and not source_is(item["source"], ZEPP_MARKER):
            continue
        if (
            item["type"] == "bodyMass"
            and not source_is(item["source"], ZEPP_MARKER)
            and item["date"] in zepp_weight_dates
        ):
            continue
        body_rows.append(item)

    report = {
        "zip": str(zip_path),
        "range": {
            "first": min_date,
            "last": max_date,
            "activityImportedThrough": final_activity_date,
        },
        "watch": {
            "firstDetected": watch_start,
            "medianFullDayRestingKcal": median_watch_rest,
        },
        "activityDays": len(activity_rows),
        "coverage": dict(quality_counts),
        "bodySamples": len(body_rows),
        "bodyByType": dict(collections.Counter(item["type"] for item in body_rows)),
        "workouts": sum(len(item["workouts"]) for item in activity_rows),
        "topSources": sources.most_common(12),
    }
    return activity_rows, body_rows, report


def sql_for(activity_rows, body_rows) -> str:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    lines = [
        "-- Generated locally from Apple Health export. Do not commit this file.",
        "CREATE TABLE IF NOT EXISTS health_energy_daily (id INTEGER PRIMARY KEY AUTOINCREMENT, energy_date TEXT NOT NULL, active_kcal REAL, resting_kcal REAL, total_kcal REAL, source TEXT NOT NULL DEFAULT 'manual', note TEXT, recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, steps INTEGER, exercise_minutes REAL, workout_count INTEGER, sampled_at TEXT, source_details TEXT, workouts_json TEXT);",
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_health_energy_date ON health_energy_daily(energy_date);",
        "CREATE TABLE IF NOT EXISTS health_body_samples (id INTEGER PRIMARY KEY AUTOINCREMENT, metric_type TEXT NOT NULL, metric_value REAL NOT NULL, unit TEXT NOT NULL, sample_date TEXT NOT NULL, measured_at TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'apple_health', imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(metric_type, measured_at, source));",
        "CREATE INDEX IF NOT EXISTS idx_health_body_date_type ON health_body_samples(sample_date, metric_type);",
    ]

    for row in activity_rows:
        lines.append(
            "INSERT INTO health_energy_daily (energy_date,active_kcal,resting_kcal,total_kcal,source,note,recorded_at,steps,exercise_minutes,workout_count,sampled_at,source_details,workouts_json) VALUES ("
            + ",".join([
                q(row["date"]),
                q(row["active"]),
                q(row["resting"]),
                q(row["total"]),
                q(row["source"]),
                q(row["note"]),
                q(now),
                q(row["steps"]),
                q(row["exercise"]),
                q(len(row["workouts"])),
                q(row["date"] + "T23:59:59+02:00"),
                q(json.dumps(row["details"], ensure_ascii=False, separators=(",", ":"))),
                q(json.dumps(row["workouts"], ensure_ascii=False, separators=(",", ":"))),
            ])
            + ") ON CONFLICT(energy_date) DO UPDATE SET active_kcal=excluded.active_kcal, resting_kcal=excluded.resting_kcal, total_kcal=excluded.total_kcal, source=excluded.source, note=excluded.note, recorded_at=excluded.recorded_at, steps=excluded.steps, exercise_minutes=excluded.exercise_minutes, workout_count=excluded.workout_count, sampled_at=excluded.sampled_at, source_details=excluded.source_details, workouts_json=excluded.workouts_json;"
        )

    for row in body_rows:
        lines.append(
            "INSERT INTO health_body_samples (metric_type,metric_value,unit,sample_date,measured_at,source,imported_at) VALUES ("
            + ",".join([
                q(row["type"]),
                q(row["value"]),
                q(row["unit"]),
                q(row["date"]),
                q(row["measuredAt"]),
                q(row["source"]),
                q(now),
            ])
            + ") ON CONFLICT(metric_type,measured_at,source) DO UPDATE SET metric_value=excluded.metric_value, unit=excluded.unit, sample_date=excluded.sample_date, imported_at=excluded.imported_at;"
        )

    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("zip", type=Path, help="ZIP exportado por Apple Salud")
    parser.add_argument(
        "--through",
        help="Último día de actividad a importar (YYYY-MM-DD). Por defecto: día anterior al último del export.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="SQL de salida. Por defecto: .private/apple-health-history.sql en la raíz del repo.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Aplicar el SQL a D1 remoto con Wrangler tras generarlo.",
    )
    args = parser.parse_args()

    zip_path = args.zip.expanduser().resolve()
    if not zip_path.exists():
        raise SystemExit(f"No existe: {zip_path}")
    if args.through:
        datetime.strptime(args.through, "%Y-%m-%d")

    if args.output:
        output = args.output.expanduser().resolve()
    else:
        repo_root = Path(__file__).resolve().parents[2]
        output = (repo_root / ".private" / "apple-health-history.sql").resolve()
    output.parent.mkdir(parents=True, exist_ok=True)

    activity_rows, body_rows, report = build(zip_path, through=args.through)
    output.write_text(sql_for(activity_rows, body_rows), encoding="utf-8")
    report_path = output.with_suffix(".report.json")
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    print(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"\nSQL: {output}")
    print(f"Informe: {report_path}")
    print("El ZIP no se modifica y no se guarda ningún dato personal dentro del repositorio.")

    if args.apply:
        command = [
            "npx", "wrangler", "d1", "execute", "segundo-cerebro-private",
            "--remote", "--config", "wrangler.bootstrap.jsonc", "--file", str(output),
        ]
        print("\nAplicando a D1 remoto...")
        subprocess.run(command, cwd=Path(__file__).resolve().parents[1], check=True)
        print("OK: backfill aplicado a D1.")


if __name__ == "__main__":
    main()
