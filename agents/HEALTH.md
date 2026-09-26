# HEALTH agent contract

## Purpose

Coordinate the private Health area of Segundo Cerebro without creating duplicate sources of truth.

## Nutrition workflow

The private spreadsheet `SEGUNDO CEREBRO - SALUD` is the source of truth for nutrition. It is never mirrored with real values in Git.

Tabs:
- `Comidas`: reusable personal dishes/meal definitions and legacy compatibility rows; it is not the canonical packaged-product catalogue.
- `Registro`: planned and consumed meals by date.
- `Objetivos`: effective calorie/macro targets.
- `EnergiaDiaria`: active, resting and total energy expenditure.
- `Recetas` / `IngredientesReceta`: recipe definitions.
- `MenuSemanal`: planned menu.

Packaged-product identity, EAN, store URL, product-level nutrition and physical availability are owned by the private canonical source `SEGUNDO CEREBRO - DESPENSA`, primarily `Productos` and `Inventario`.

When the user tells ChatGPT what they plan to eat:
1. For a packaged product, resolve it first against Pantry `Productos` and reuse its `producto_id`; do not create a duplicate product master in Health.
2. For a recipe/personal dish, resolve it against `Recetas` / `Comidas` as appropriate.
3. Before recommending or planning food, cross nutritional needs with Pantry `Inventario`.
4. Append the dated meal to `Registro` with `estado=planificado`.
5. If the user later confirms they actually ate it, record/update the real consumption as `consumido`; do not silently treat planned food as eaten.
6. Preserve the user's notes and portion information.
7. If the plan needs an absent/low-stock product, hand that need to GESTOR DESPENSA so it can be represented in `ListaCompra`.

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

## GESTOR GYM Y NUTRI — continuity protocol

This conversation is the operational manager for training, nutrition and the interpretation of Apple Health / Zepp signals. If the chat reaches its context limit or another ChatGPT/Codex session takes over, the new session must recover state in this order:

1. Read `agents/HEALTH.md` and the current `docs/HANDOFF.md`.
2. Read the live private targets from `Objetivos`, `ObjetivosActividad` and `ObjetivosProgreso`; never copy personal target values into Git.
3. Read current nutrition from `Registro`, recipes from the private Health Sheet and planned meals from `MenuSemanal`.
4. Read Pantry `Productos`, `Inventario` and `ListaCompra` before resolving packaged products or recommending what to eat.
5. Read gym plan from the private source and completed gym sessions from D1.
6. Read automatic Apple Health activity and body data from D1; use Sheet body measurements only as historical/manual fallback.
7. Continue the same measurement and decision rules below instead of rebuilding a new plan from conversation memory.

### Measurement conventions

- Scale/body composition: prefer the morning measurement after using the bathroom, before eating/drinking or training, and under comparable clothing/conditions.
- Weight decisions use a 7-day moving average, not one isolated measurement.
- Waist: measure at the same anatomical point (operationally, around navel level), relaxed, under comparable morning conditions, about once per week. Store the real value only in the private source.
- Consumer bioimpedance metrics are secondary trend signals; do not overrule weight, waist, training performance and adherence with one BIA reading.
- Strength progression should record actual load, actual reps and an approximate RIR when available. A prescribed load is not proof that the target reps were completed.

### Goal hierarchy

Do not reduce the system to a single hard daily calorie maximum and a hard Apple Watch calorie-burn minimum. The operational hierarchy is:

1. **Nutrition intake:** use the active calorie target/range from `Objetivos`, evaluated mainly as adherence and short moving averages. Avoid treating one day slightly above/below target as failure.
2. **Protein:** treat the active protein target as a daily minimum/priority when feasible; use the private target rather than a hard-coded Git value.
3. **Fat/carbohydrate/fibre:** use the live macro/fibre targets as supporting constraints, with protein and total energy taking priority unless the plan explicitly says otherwise.
4. **Activity:** use steps, strength-session adherence and weekly exercise minutes from `ObjetivosActividad` as controllable floors/targets.
5. **Apple Watch energy:** treat active/resting/total kcal primarily as observed output and trend context, not as a calorie target to chase and never as permission to eat calories back 1:1.
6. **Body recomposition outcome:** evaluate the joint trend of weight average, waist, body-composition trend, gym performance and adherence over the configured review window.

A personalized active-kcal floor may be added later only after enough real Apple Health history exists to establish a stable baseline. Until then, do not invent one.

### Menu-building workflow

Build the menu progressively from the user's real recipes, confirmed portions and the current Pantry inventory, rather than generating a detached generic diet.

For each planned day:
1. Start from the active calorie and protein targets.
2. Read Pantry `Inventario` and join it to `Productos`; unavailable items are not presented as "eat now" options.
3. Allocate protein across realistic meals using available foods first.
4. Fill remaining energy with preferred carbohydrates, fats, vegetables and recipes while respecting the live targets.
5. Reuse Pantry `producto_id` for packaged products and Health `Recetas` / personal dishes for composed meals; label estimates clearly.
6. Write future meals to `MenuSemanal` / `Registro` as `planificado` only. Convert to `consumido` only after confirmation.
7. When a useful ingredient/product is absent or low, communicate it to GESTOR DESPENSA for `ListaCompra` rather than silently assuming availability.
8. Prefer a small library of repeatable meals with known portions/macros, then expand variety gradually.
9. Adjust menus from 7–14 day outcome trends and adherence, not from one high/low calorie day or one Apple Watch reading.

### Progress review

At each configured review interval, evaluate together:
- current and previous 7-day average weight;
- weekly waist trend when available;
- average calorie/protein adherence;
- steps and exercise/strength-session adherence;
- exercise performance (load + reps + RIR/quality where available);
- sleep/recovery context when available;
- BIA metrics only as secondary trend evidence.

If weight/waist are moving in the intended direction while strength is stable or improving, keep the plan unless adherence/recovery indicates a problem. If trends stall or move too quickly for multiple weeks, adjust intake or activity modestly rather than making large day-to-day corrections.

## Private historical summary bridge

Raw Apple Health backfill remains canonical in private D1 and is not duplicated into Git. To let authorized ChatGPT health-manager sessions analyze trends without Cloudflare Access cookies, the private Health Sheet contains a derived tab `HistoricoResumen`.

Whenever `GET /api/health/history` is read for a supported range (30/90/180/365/all), the Worker overwrites the corresponding fixed summary row with D1-derived aggregates: coverage-quality counts, comparable activity averages, body-sample count, latest standard body metrics, 7-day/previous-7-day weight averages, weekly weight change and latest waist from the private Sheet.

The same read also refreshes private tab `ActividadDiaria` with the daily D1 detail for the requested range: date, active/resting/total kcal, steps, exercise minutes, workout count, coverage quality, source, sample/import timestamps, source details and workout metadata. This exists so an authorized health-manager chat can inspect an exact day instead of inferring it from aggregates.

These are derived access surfaces, not new sources of truth. Raw daily activity/body samples continue to live in D1. Decisions must use comparable `full`/`live` days and must not treat `partial` or `phone_only` days as equivalent Watch coverage. If a selected date has no D1 row, do not display zero: show it as missing/not synchronized.

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
- body water percentage: no matching usable Apple Health body-composition data type was found in the iPhone Health search; Zepp's body-water percentage remains Zepp-specific.
- steps / Pasos: Apple Watch, iPhone and Zepp Life all appear as data sources. Do not sum raw cross-source samples blindly; use Apple Health's consolidated daily value or otherwise avoid double-counting overlapping sources.
- workouts / Entrenos: Apple Watch and Wikiloc appear as data sources. Preserve the original workout source when importing individual workouts.
- exercise minutes / Minutos de ejercicio: Apple Watch and iPhone appear as data sources. Prefer Apple Health's consolidated daily value rather than summing overlapping device samples.

Zepp Life itself also displays proprietary/derived body-composition metrics such as muscle mass, body water, basal metabolism estimate, visceral fat, protein percentage, body score and ideal weight. These must not be silently mapped onto standard HealthKit metrics unless Apple Health exposes an equivalent type and contains real samples.

In particular:
- Zepp “Músculo” is not the same quantity as HealthKit `leanBodyMass`;
- Zepp “Metabolismo basal” is a body-composition estimate and must not be substituted for Apple Health daily `basalEnergyBurned` / resting energy;
- body score, visceral fat score, protein percentage and ideal weight are Zepp-specific unless separately verified through a supported source.


- The unified ingest also accepts parallel list fields from Shortcuts (`bodyMassValues` + `bodyMassMeasuredAts` + `bodyMassSources`, and equivalents for fat %, BMI and lean mass) so every same-day sample can be preserved without one HTTP request per sample.


## Adherencia mensual

Salud dispone de una vista derivada mensual de adherencia. No crea una base paralela.

Fuentes:
- `Registro` + `Objetivos` para kcal/proteína;
- `ObjetivosActividad` para pasos;
- Apple Health / D1 para pasos, ejercicio y workouts;
- D1 `gym_sessions` para sesiones de gimnasio realmente registradas;
- HabitQuest para hábitos programados/completados;
- `MenuSemanal.sesion_gym` para obligación diaria explícita de entrenamiento cuando exista;
- `AdherenciaManual` para correcciones explícitas del gestor/usuario.

Pestaña privada nueva:
- `AdherenciaManual`
  - `fecha`
  - `estado`: `CUMPLIDO | PARCIAL | NO_CUMPLIDO | SIN_DATOS`
  - `motivo`
  - `fuente`
  - `updated_at`

### Precedencia

Una clasificación manual válida prevalece sobre la heurística automática. Esto permite registrar correctamente expresiones explícitas del usuario como “hoy no he cumplido”, evitando que un día incompleto se confunda con “sin datos”.

### Clasificación automática

La lógica está centralizada en `private-cloudflare/src/adherence.js`.

Principios:
- kcal y proteína solo se juzgan cuando el registro del día tiene cobertura suficiente;
- pasos se comparan primero contra el suelo activo configurado y después contra el objetivo como contexto;
- no se penaliza “no ir al gym” si no existe una sesión diaria explícitamente programada;
- HabitQuest participa cuando hay hábitos programados ese día;
- hacen falta al menos dos dimensiones juzgables para clasificar automáticamente;
- `SIN_DATOS` no penaliza el porcentaje del mes;
- los días futuros no entran en métricas;
- `CUMPLIDO` no exige perfección absoluta: puede tolerar una desviación pequeña sin fallos claros;
- `PARCIAL` representa cumplimiento mixto;
- `NO_CUMPLIDO` requiere desviación clara o varias dimensiones fallidas.

La UI debe explicar siempre los motivos y mostrar las dimensiones disponibles.

### Métrica mensual

Porcentaje de adherencia:
- cumplido = 1;
- parcial = 0,5;
- no cumplido = 0;
- sin datos = excluido.

También se calculan:
- cobertura de datos;
- racha actual de días cumplidos;
- mejor racha;
- adherencia laborable;
- adherencia de fin de semana.

Endpoint privado:
- `GET /api/health/adherence?month=YYYY-MM`

La vista vive en `Salud → Adherencia`.
