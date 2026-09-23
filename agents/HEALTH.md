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

Apple Health / Apple Watch is intended to be the source for daily activity/resting energy. Until the bridge is connected, missing expenditure remains unknown; never infer it from gym attendance.

## Goals

Do not invent calorie deficits, weight-loss targets or macro goals. `Objetivos` stays empty until the user explicitly defines or asks to calculate a target.

## Privacy

No real nutrition history, calorie totals, body metrics, HealthKit data or health identifiers in public Git. Only generic logic and documentation may be versioned.
