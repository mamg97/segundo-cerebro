# PSICOHISTORIA — Cobertura de Candidate por país y origen

**18/10/2026. Investigación: solo admisión de cobertura, ningún backtest nuevo ni emisión.**

## Problema científico

La auditoría histórica de GED revisaba vínculos de horizontes **positivos**.
Esto no constituye el universo de evaluación de un pronóstico: los negativos
también deben entrar al denominador, y la ausencia de una fuente histórica
no equivale a ausencia de violencia.

La nueva herramienta **research/psychohistory/asof_cohort_coverage.py** audita
el universo completo de países en cada origen hipotético, *sin consultar
outcomes* ni calcular probabilidades. Reutiliza el verificador de manifiestos
de **ged_asof_provenance.py**, que lee archivos privados, compara sus hashes
SHA-256 exactos y rechaza GED final como sustituto de Candidate.

Una casilla se clasifica como:
- **PINNED_DECLARED_PREISSUE_SOURCE_REBUILD_REQUIRED** si existe archivo
  Candidate íntegro, alcance geográfico **declarado** que incluye el país y
  fecha de publicación **declarada** anterior al día 1 del mes de emisión.
- **NO_PREISSUE_PINNED_IN_SCOPE_SOURCE** en caso contrario: desconocido, no cero.

El auditor exige meses ordenados y no duplicados, corte de información
igual al mes completo anterior a la emisión, country IDs únicos y un esquema
que no permite outcomes ni predicciones.

## Ejemplo de roster ficticio, estrictamente privado

~~~json
{
  "schema": "psychohistory.candidate_country_origin_roster.v1",
  "origins": [
    {"issue_month": "2020-03", "cutoff_month": "2020-02", "country_ids": [123, 456]}
  ]
}
~~~

Se necesita el manifiesto ya existente:
**psychohistory.ged.vintage_manifest.v1**, con nombre del archivo, edición,
SHA-256, release_date, release_date_evidence_url, alcance y
target_comparability_verified=false. El roster se fija **antes** de examinar
los resultados. En ningún caso se supone que Candidate y GED definitivo
comparten la misma etiqueta.

### Ejecución offline

~~~bash
python3 research/psychohistory/asof_cohort_coverage.py \
  --manifest /PRIVATE/candidate_manifest.json \
  --archive-dir /PRIVATE/candidate_archives \
  --roster /PRIVATE/country_origin_roster.json \
  --output /PRIVATE/coverage_report_NEW.json
~~~

La salida detallada se escribe en JSON privado (create-only, permisos 0600).
La salida estándar contiene **solo contadores**. La CI opera únicamente con
bytes y países inequívocamente ficticios.

## Lo que sigue sin estar demostrado

Una fecha de release tecleada por el operador y una URL no constituyen prueba
independiente de disponibilidad histórica. Tampoco el alcance por país
declarado en el manifiesto demuestra por sí solo la cobertura real de los
registros dentro del CSV. Este módulo aún no interpreta los bytes de Candidate,
no reconstruye el target, no comprueba disponibilidad as-of de labels de
entrenamiento y no compara modelos.

Por diseño, todas estas banderas son **false** incluso con cobertura del 100 %:
source_release_dates_independently_authenticated, source_as_of_verified,
vintage_correct_backtest, scores_computed, forecast_issued y
prospective_skill_demonstrated.

La siguiente investigación necesita **un vintage Candidate verdadero**
pinned por SHA, datación independiente, extracción verificable del
alcance histórico, panel sin leakage, baseline de recencia local y bloques de
test independientes. Reportar NO_EVALUABLE en los casos no cubiertos.

Referencias: [histórico Candidate](https://ucdp.uu.se/downloads/olddw.html)
y [UCDP Download Center](https://ucdp.uu.se/downloads/).
