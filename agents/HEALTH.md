# HEALTH agent contract

## Purpose

Coordinate the private Health area of Segundo Cerebro without creating duplicate sources of truth.

## Nutrition workflow

The private spreadsheet `SEGUNDO CEREBRO - SALUD` is the source of truth for nutrition. It is never mirrored with real values in Git.

Tabs:
- `Comidas`: reusable food/dish database.
- `Registro`: planned and consumed meals by date.
- `Objetivos`: effective calorie/macro targets.
- `EnergiaDiaria`: active, resting and total energy expenditure.

When the user tells ChatGPT what they plan to eat:
1. Resolve each reusable dish against `Comidas`.
2. If it does not exist, create a new food record only when calories/macros are known or explicitly estimated.
3. Append the dated meal to `Registro` with `estado=planificado`.
4. If the user later confirms they actually ate it, record/update the real consumption as `consumido`; do not silently treat planned food as eaten.
5. Preserve the user's notes and portion information.

When nutritional values are estimated rather than label-confirmed, write the source/note accordingly. Never present an estimate as measured data.

## Energy expenditure

Apple Health / Apple Watch is the intended source for daily active and resting energy. Automatic imports enter through the dedicated token-protected Health ingest Worker and are stored in private D1 (`health_energy_daily`). The Sheet tab `EnergiaDiaria` is retained as a manual/fallback source.

For each date, D1 keeps exactly one current energy snapshot. Repeated Apple Health synchronizations for the same day replace that row via UPSERT; the D1 row wins over the Sheet fallback. Missing expenditure remains unknown; never infer it from gym attendance.

The intended calculation is:
- total expenditure = Apple Health total energy when supplied;
- otherwise active energy + resting/basal energy when both are available;
- daily energy balance = consumed kcal - total expenditure.

Do not treat Apple Watch active calories alone as total daily expenditure.

## Goals

Do not invent calorie deficits, weight-loss targets or macro goals. `Objetivos` stays empty until the user explicitly defines or asks to calculate a target.

## Privacy

No real nutrition history, calorie totals, body metrics, HealthKit data or health identifiers in public Git. Only generic logic and documentation may be versioned.


## Unified Apple Health bridge

There is exactly one Apple Health ingestion bridge:

```text
Apple Health → iOS Shortcut → segundo-cerebro-health-ingest
→ Service Binding → segundo-cerebro → private D1
```

The existing token-protected ingest Worker is extended; do not create a second token, app, endpoint family or public datastore.

Endpoints:
- `/v1/energy`: backwards-compatible energy-only endpoint.
- `/v1/sync`: unified activity + body-measurement endpoint.

Automatic Health imports use D1 because it provides reliable idempotency. The private Sheet remains the historical/manual/fallback source and is merged at read time.

### Daily activity

`health_energy_daily` is the existing daily snapshot and now also accepts:
- active kcal;
- resting/basal kcal;
- total kcal;
- steps;
- exercise minutes;
- workout count;
- optional workout metadata;
- source/source details;
- source sampling timestamp;
- import timestamp.

The logical key remains the date. Re-running the Shortcut for the same date replaces the snapshot rather than duplicating it.

### Body measurements

Automatic body measurements are normalized in private D1 table `health_body_samples`.

Supported metric types:
- `bodyMass`;
- `bodyFatPercentage`;
- `bodyMassIndex`;
- `leanBodyMass`.

Idempotency key is effectively `metric_type + measured_at + source`. Re-importing the same measurement updates it rather than creating another copy.

Every imported sample preserves:
- original measurement timestamp;
- original source name when Shortcuts exposes it;
- import timestamp;
- unit and value.

The private Sheet tab `MedicionesCorporales` remains the historical/manual baseline and now has optional columns for BMI, lean body mass, original measurement time and import time.

## Body trend rules

Weight is not evaluated from one isolated reading.

Segundo Cerebro calculates:
- today's latest weight sample;
- a 7-day moving average based on daily mean weight;
- the previous 7-day average;
- weekly change = current 7-day average − previous 7-day average.

All same-day measurements are retained.

Body-fat percentage and other consumer bioimpedance metrics are treated as trend indicators, not exact measurements. Do not make decisions from a single reading.

## Activity goals and nutrition interaction

`ObjetivosActividad` is the source for current activity targets such as steps and weekly exercise minutes.

Apple Watch energy is observational. Never adjust calorie intake 1:1 from the watch's calorie estimate. Nutrition decisions should use 7–14 day trends together with weight/composition trends, adherence and training context.

The operational manager for these signals is the conversation `GESTOR GYM Y NUTRI`.

## Zepp / Zepp Life source audit

Before enabling body-metric import on the iPhone, verify what Apple Health actually contains.

Do not assume that Xiaomi/Zepp writes body-fat percentage, BMI or lean body mass merely because the scale measures them. The source audit must be performed in Apple Health using each metric's `Data Sources & Access` view. Only metrics with real contributing records should be added to the Shortcut.

## Confirmed Apple Health / Zepp Life source audit

Confirmed on iPhone on 2026-09-24:
- body mass / Peso: Zepp Life appears as a data source;
- body fat percentage / Porcentaje de grasa corporal: Zepp Life appears as a data source;
- body mass index / Índice de masa corporal: Zepp Life appears as a data source;
- lean body mass / Masa corporal sin grasa: Zepp Life appears as a data source;
- dedicated muscle mass / `muscleMass`: no matching Apple Health data type was found in the iPhone Health search; Zepp's “Músculo” remains a Zepp-specific metric and must not be mapped to `leanBodyMass`.

Zepp Life itself also displays proprietary/derived body-composition metrics such as muscle mass, body water, basal metabolism estimate, visceral fat, protein percentage, body score and ideal weight. These must not be silently mapped onto standard HealthKit metrics unless Apple Health exposes an equivalent type and contains real samples.

In particular:
- Zepp “Músculo” is not the same quantity as HealthKit `leanBodyMass`;
- Zepp “Metabolismo basal” is a body-composition estimate and must not be substituted for Apple Health daily `basalEnergyBurned` / resting energy;
- body score, visceral fat score, protein percentage and ideal weight are Zepp-specific unless separately verified through a supported source.

