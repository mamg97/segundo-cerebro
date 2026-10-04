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
- `Recetas` / `IngredientesReceta`: recipe definitions and ingredients. `Recetas` also stores the private photo reference metadata (`foto_drive_file_id`, MIME and update timestamp); the binary image itself is not embedded in the Sheet.
- `PasosReceta`: canonical ordered preparation steps for recipes. Store only user-confirmed or source-supported instructions; never invent missing cooking steps merely to make a recipe look complete.
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

### Recipe capture and photo workflow

Recipe ingredient product cards:
- `IngredientesReceta.producto_id` is an optional stable reference to canonical Pantry `Productos.producto_id` (column L in the current table).
- Every ingredient opens a card inside the recipe panel and returns to the same recipe. Product identity, photo URL, nutrition and dated price observations remain Pantry-owned.
- An explicit ID is authoritative. A missing ID may use a unique exact normalized-name match; never use fuzzy matching or substitute a different packaged product. A broken explicit ID stays pending rather than falling back by name.
- Ingredient quantities/macros stay separate from the product's per-100-g nutrition. Missing data is pending, never zero.
- Generic ingredients and composed subrecipes without an exact packaged-product reference still open their ingredient context; do not attach an unrelated Mercadona SKU merely to fill the card.
- Ordinary new links and catalogue enrichment are canonical Sheet updates, without a deployment.

Runbook operativo obligatorio para fotografías: antes de ingerir, sustituir o corregir una imagen de receta, leer `docs/RECIPES_IMAGE_INGEST.md` y cerrar su checklist end-to-end. La generación o edición visual por sí sola no completa la ingesta.

When the user supplies a recipe, its durable representation remains data-driven and must not require a frontend deployment:

1. Reuse or create a stable `recipe_id` in `Recetas`.
2. Store the original recipe photo as a private file under `DOCUMENTOS/SEGUNDO CEREBRO/AUXILIARES/RECETAS - FOTOS`; do not make it public and do not store the bytes in Git.
3. Save the private Drive file reference, MIME type and photo update timestamp in the matching `Recetas` row.
4. Generate a compact web preview and store it in hidden technical tab `RecipeMedia` (`recipe_id`, MIME, base64 preview, dimensions/hash, original Drive ref and timestamp). This preview exists because the current production Google OAuth can read Sheets but Drive media may answer 403. The original remains the archival image; `RecipeMedia` is only the private web derivative.
   - The preview must preserve the complete original photo. For portrait/square sources shown in the 16:9 recipe hero, fit the whole image inside a 16:9 derivative (neutral or blurred side padding is acceptable) rather than cropping with `cover`.
5. Store ingredient rows in `IngredientesReceta`.
6. Store preparation instructions in `PasosReceta`, preserving explicit order and only instructions confirmed by the user or supported by the supplied source.
7. Verify that the private `Recetas` view renders the photo first and, underneath, ingredients and preparation. Missing photo/ingredients/steps stay visibly pending rather than being invented.

The Worker proxies recipe images through an authenticated same-origin endpoint. It serves `RecipeMedia` first and only falls back to direct Drive media when no Sheet preview exists. The browser never needs the raw private Drive file identifier. Ordinary recipe additions or edits are Sheet/Drive mutations only; code changes are reserved for schema/capability/UI changes.

### Household menu invariants

- The shared lunch/dinner plan agreed with Andrea is a household constraint, not a free optimization variable.
- By default, lunch and dinner are prepared for Miguel + Andrea and are split 50/50 unless the user confirms different portions.
- Do not move, replace or invent a shared lunch/dinner merely to hit Miguel's calorie/protein targets. Optimize Miguel's breakfast, office coffees, mid-morning, afternoon snack, dessert or shake around the household plan instead.
- If Andrea explicitly changes one meal (for example, moving a dish because an ingredient was not prepared), change only the affected meal(s) and preserve the remaining agreed sequence.
- Pantry is household stock. Do not interpret multiple packs/trays as all belonging to Miguel; resolve the intended household meal and portion split before assigning consumption.
- Keep planned and consumed distinct. Do not decrement Pantry stock until consumption/preparation is confirmed, unless the stock is explicitly reserved and the note says so.
- A temporary training pause is represented in `ObjetivosActividad` by an effective row with `strength_sessions_week=0`; optional activity floors can be left unset when they must not be judged. Adherence must treat strength as `ignored`, never failed, while that row is effective.
- The base gym plan remains preserved during a pause. The private UI must suppress session suggestions/entry and show the pause reason from the active objective; reactivation happens by a later objective row after the user confirms the pause can end.

### Weekly menu integrity invariants

- `MenuSemanal` is append-tolerant but the product behaves as an upserted plan. The logical identity of a row is `fecha + momento + recipe_id|food_id|nombre normalizado`; when several versions exist, the latest `updated_at` supersedes the older one.
- A later `omitido | retirado | cancelado` version suppresses an older planned version. Do not zero macros to simulate deletion and do not resurrect the previous row.
- Distinct components intentionally assigned to the same moment are preserved as separate source rows, but the UI groups them automatically into one **toma**. Do not duplicate the moment merely to make the UI render several cards.
- Canonical top-level meal moments are the actual eating occasions. `Postre` is never a standalone moment: store it under `Comida` or `Cena` according to which meal it belongs to. `Snack` is never a standalone moment either: store it under `Media mañana` or `Merienda` according to timing/context. `Cierre` is not a standalone moment: any closing shake/dessert/complement belongs to `Cena`. The runtime also folds legacy `Postre`, `Snack`, `Cierre` and `Cena · complemento` labels into their parent meal so old writers cannot create extra table rows.
- Before serving the menu, Segundo Cerebro automatically filters superseded rows, removes hidden states and resolves missing nutrition from the linked recipe master only when that recipe has usable confirmed/estimated per-serving macros.
- If a linked recipe is explicitly `pendiente` or the note says a quantity must still be confirmed, kcal/protein remain unknown. The UI must say that confirmation is pending and show only the known subtotal; it must not invent macros or reuse stale ingredient assumptions.
- This reconciliation is a permanent runtime rule. Do not fix recurring menu inconsistencies by manually editing the same day's rows each time.
- **Content/presentation separation is mandatory:** meal/date/menu changes are data mutations in the private Health Sheet (`MenuSemanal`, plus `Registro` when consumed), never frontend-code changes.
- The web/Worker must remain a generic renderer/reconciler of the canonical Sheet schema. Do not hard-code real dates, meal names, portions, household substitutions or weekly totals in Git.
- A code change is justified only for a reusable rendering/reconciliation defect that would affect arbitrary menu rows. After that generic defect is fixed, future menu edits must be Sheet-only.


### Navegación y sincronización de entidades

- Una fila de `MenuSemanal` que represente una receta debe conservar `recipe_id` y la web debe permitir abrir directamente esa receta desde el desplegable de la comida.
- Una fila que represente un producto/alimento comercial debe usar como `food_id` el `producto_id` canónico de `SEGUNDO CEREBRO - DESPENSA / Productos`.
- La web puede enriquecer esos `food_id` en lectura desde Despensa y abrir la ficha canónica del producto; no debe crear una segunda ficha comercial en Salud.
- `Comidas` queda reservado a platos/alimentos personales reutilizables y compatibilidad histórica. No es el maestro de productos envasados.
- Los macros explícitos de un consumo histórico no se reescriben retroactivamente cuando cambia una ficha de producto. Para filas planificadas con cantidad en gramos y macros ausentes, el runtime puede completar desde la ficha canónica por 100 g de Despensa.
- Si un `food_id` no resuelve en Despensa, debe quedar visible como incidencia de sincronización; nunca se corrige mediante coincidencia difusa.

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

## GESTOR GYM / GESTOR NUTRI — continuity protocol

Health is operated by two specialized conversations that share the same canonical sources without creating parallel state:

- `GESTOR GYM`: training plan, exercise selection, completed strength sessions, progression, technique, training recovery and return-to-training decisions.
- `GESTOR NUTRI`: food intake, macros, weekly menu, recipes and nutrition planning.

Both may read Apple Health / Zepp context when it is relevant to their own decisions. Neither owns a duplicate health dataset. If the chat reaches its context limit or another ChatGPT/Codex session takes over, the new session must recover state in this order:

1. Read `agents/HEALTH.md` and the current `docs/HANDOFF.md`.
2. Read the live private targets from `Objetivos`, `ObjetivosActividad` and `ObjetivosProgreso`; never copy personal target values into Git.
3. Read current nutrition from `Registro`, recipes from the private Health Sheet and planned meals from `MenuSemanal`.
4. Read Pantry `Productos`, `Inventario` and `ListaCompra` before resolving packaged products or recommending what to eat.
5. For `GESTOR GYM`, read the gym plan from the private canonical source and completed gym sessions from D1 before making progression decisions.
6. Read automatic Apple Health activity/body/recovery data from D1 when relevant; use derived Sheet surfaces only as inspection/history fallbacks.
7. For `GESTOR NUTRI`, read current intake/menu/recipes from the Health Sheet and use activity/body trends only as context, never as a second nutrition source.
8. Continue the same measurement and decision rules below instead of rebuilding state from conversation memory.

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

### Manager restart / conversation handoff

When either `GESTOR GYM` or `GESTOR NUTRI` is replaced because the chat is saturated, reconstruct the live state from canonical sources before answering operational questions. Do not assume the sibling manager's conversation history is canonical. Do not rely on the previous chat as the source of truth.

Read, at minimum:

For `GESTOR GYM`:
1. `ObjetivosActividad`: latest effective strength/activity objective and any temporary pause.
2. `ObjetivosProgreso`: active/paused strength, skill, body-composition and recovery benchmarks.
3. Canonical `GimnasioPlan`: days, exercise order, prescribed sets/reps/load/rest and coaching notes.
4. D1 `gym_sessions` + `gym_entries`: completed sessions and actual load/reps/notes; never infer completion from the plan.
5. D1 `gym_exercise_links`: current visual-reference mappings; wger remains reference-only.
6. Apple Health/D1 activity and recovery context when it materially affects training readiness or interpretation.
7. Nutrition only as supporting recovery/performance context; do not own or duplicate intake records.

For `GESTOR NUTRI`:
1. `Objetivos`: active calorie/macro targets and current nutrition notes.
2. `ObjetivosActividad` and relevant `ObjetivosProgreso` only as activity/body-trend context.
3. `MenuSemanal`: the current week, preserving plan/consumed/omitted states and household constraints.
4. `Registro`: recent actual consumption, especially today and yesterday.
5. `Recetas`, `IngredientesReceta` and `PasosReceta`: reusable dishes, recipe photo metadata and preparation.
6. Pantry `Productos` + `Inventario` for packaged-product identity, nutrition and live household stock.

Current personal values, medical reasons, live stock and dated meal history remain private in Sheets/D1/Drive and must not be copied into Git. The contract in Git describes how to recover them.

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

Every history read keeps the private Sheet as a complete derived inspection surface. The API may return the requested range (30/90/180/365/all), but the Sheet refresh uses the full available D1 history so a later 30- or 365-day query never truncates the visible historical archive.

Derived tabs:
- `ActividadDiaria`: complete daily D1 activity history (date, active/resting/total kcal, steps, exercise minutes, workout count, coverage quality, source, sample/import timestamps, source details and workout metadata).
- `MedicionesCorporalesApple`: complete D1 body-sample history (timestamp, date, metric type, value, unit, source and import timestamp).
- `RecuperacionDiariaApple`: complete D1 recovery/sleep history when those HealthKit metrics exist (heart-rate context, HRV, respiratory rate, SpO2, VO2 max, wrist temperature and sleep-stage minutes).
- `HistoricoResumen`: fixed aggregate rows for 30/90/180/365/all.

These are derived access surfaces, not new sources of truth. Raw daily activity/body samples continue to live in D1. Explicit rows recovered from a user-supplied Apple Health export are first staged in the private Health Sheet with source `apple_health_export_recovery` (activity) or an explicit recovery note (body metrics), then reconciled idempotently into D1 on the next Health read. This lets a complete export replace a stale partial live snapshot without keeping two competing truths. Decisions must use comparable `full`/`live` days and must not treat `partial` or `phone_only` days as equivalent Watch coverage. If a selected date has no D1 row, do not display zero: show it as missing/not synchronized.

## Privacy

No real nutrition history, calorie totals, body metrics, HealthKit data or health identifiers in public Git. Only generic logic and documentation may be versioned.


## Unified Apple Health bridge

There is exactly one Apple Health ingestion pipeline. The native iOS bridge becomes the preferred collector once its first real-device sync is validated; the existing Shortcut remains a temporary fallback, not a second source.

```text
Apple Health / HealthKit
        ↓
SegundoCerebroHealthBridge (preferred)
        │
        └── legacy Shortcut (fallback only)
        ↓
segundo-cerebro-health-ingest
→ Service Binding → segundo-cerebro → private D1
```

Do not create a second token, public datastore or competing Apple Health history.

Endpoints:
- `/v1/sync`: canonical unified ingestion endpoint;
- `/v1/energy`: backwards-compatible energy-only endpoint.

Private persistence:
- `health_energy_daily`: one current activity snapshot per date, UPSERT by date;
- `health_body_samples`: timestamped body-composition samples with original source;
- `health_recovery_daily`: one daily recovery/sleep signal snapshot per date, UPSERT by date.

The native bridge may read, when the user grants access and Apple Health contains samples:
- active/basal energy, steps, exercise time and workouts;
- weight, body-fat percentage, BMI and lean body mass;
- resting heart rate, walking heart-rate average, HRV SDNN, respiratory rate, oxygen saturation, VO₂ max and sleeping wrist temperature;
- sleep analysis, including Core/Deep/REM where available.

These are observed signals, not diagnoses and not an automatically inferred recovery score. A missing HealthKit sample remains missing. Do not synthesize values.

The bridge synchronizes today plus yesterday on each run. This keeps today's snapshot current while yesterday is repeatedly reconciled idempotently. HealthKit observer/background delivery is best-effort under iOS scheduling; manual sync remains a diagnostic action rather than the normal workflow.

Security:
- the app stores `HEALTH_INGEST_TOKEN` only in iOS Keychain;
- never store the token in Git, UserDefaults, logs or screenshots;
- the public repository contains source code and schemas but no real health values;
- the Worker remains the only public ingress and validates ranges before the main private Worker writes D1.

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

`GESTOR GYM` owns training/recovery interpretation for these signals; `GESTOR NUTRI` may consume them as context for nutrition but does not own training progression.

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


## Freshness contract for automatic body measurements

Automatic body-composition freshness is owned by the HealthKit → native bridge → ingest Worker → private D1 path. The private Sheet views are derived inspection surfaces and are not the source that Home polls for live weight.

Operational cadence:
- body mass, body-fat percentage, BMI and lean body mass request HealthKit Background Delivery with `.immediate`;
- high-frequency activity/recovery signals remain `.hourly`;
- bringing the bridge app to the foreground reconciles today + yesterday immediately;
- `BGAppRefreshTask` requests an additional one-hour fallback reconciliation, but iOS may run it later;
- a stale Home weight must therefore be diagnosed first as a device/HealthKit/bridge delivery issue, not “fixed” by manually overwriting `MedicionesCorporalesApple`.

The derived Sheet remains useful for analysis and audit. It may lag D1 until its normal derived-history refresh executes; that lag must never cause the Home to ignore a newer D1 sample.


## Gym exercise library contract

The visual exercise library is an external **read-only reference layer**, not a new source of truth for the user's training plan.

- Canonical plan: the private `GimnasioPlan` table already consumed by Segundo Cerebro.
- Completed sessions and progression: private D1 gym session tables.
- Reference catalogue: public wger exercise API.
- Technical mapping: D1 `gym_exercise_links` only links an existing canonical `exercise_id` to a wger exercise. It does not copy the plan, targets, loads or session history.
- Adding an exercise from the library must append a normal row to canonical `GimnasioPlan`; future rendering then comes from the same plan reader as every other exercise.
- Linking an existing plan exercise to a visual reference must never rename or rewrite the canonical exercise implicitly.
- Media is fetched server-side and exposed only through authenticated same-origin Gym media routes. The browser must not receive a direct dependency on a premium provider.
- Only media with explicit license metadata may be exposed. Attribution/license information must remain visible on the exercise detail.
- The library must introduce **no paid dependency**. Do not scrape Lyfta, RepDB Premium, ExerciseDB paid assets, or ambiguous third-party mirrors merely to improve coverage.
- If wger has no licensed media for an exercise, the UI must show that limitation rather than fabricate or copy a paid animation.
- Search/filter requests may send generic exercise names/categories to wger. Never send private loads, session history, health data, plan notes, or user identity to the external provider.
