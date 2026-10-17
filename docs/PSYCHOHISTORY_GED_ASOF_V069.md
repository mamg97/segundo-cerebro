# PSICOHISTORIA — GED v0.6.9 · puerta de procedencia `as-of` y vintages históricos

**Estado 17/10/2026:** código de auditoría y tests exclusivamente sintéticos implementados. Se ha realizado una **comprobación privada independiente** contra el ZIP GED casebook v0.6.8, archivada en un ZIP nuevo en Drive. La comprobación privada no sustituye la ejecución byte a byte del módulo público ni constituye un backtest vintage-correct. Ningún score empírico ni dato real entra en Git; no se modifica la interfaz v0.5.8. No hay pronósticos nuevos.

## Hallazgo documental externo y límite decisivo

UCDP proporciona versiones históricas del **GED definitivo anual** y del **GED Candidate preliminar**, con identificadores mensuales desde 2018. Candidate se actualiza durante el año, pero sus reglas de recopilación, revisión y **cobertura geográfica** han evolucionado; las primeras ediciones solo cubrían África y la fuente metodológica original documenta revisiones y eliminaciones entre Candidate y el GED final. Ni la fecha de un incidente, ni la fecha de su publicación en prensa, ni el nombre de versión de Candidate prueban por sí solos la fecha en que ese registro estuvo disponible a un analista.

Fuentes de referencia oficiales:
- Índice histórico UCDP: https://ucdp.uu.se/downloads/olddw.html
- Descargas y contraste GED / Candidate: https://ucdp.uu.se/downloads/
- API con identificadores de releases Candidate: https://ucdp.uu.se/apidocs/index.html
- Metodología y revisiones: Hegre et al. (2020), *Introducing the UCDP Candidate Events Dataset*, doi:10.1177/2053168020935257

**Regla:** Candidate y GED final son fuentes distintas. Un candidato vintage puede servir como **insumo** de un futuro backtest reconstruido, pero requiere recalcular el universo de países/actores, la elegibilidad en el corte, las etiquetas históricas y los modelos usando únicamente información disponible entonces. Se conserva el resultado revisado GED 25.1 solo como referencia ex post independiente.

## Fechas distintas

1. `event.date`: ocurrencia retrospectiva exacta según GED.
2. `source_date`: publicación de artículos citados; no garantiza que UCDP conociera/codificara el evento entonces.
3. `candidate.release_date`: supuesto día de salida de una **edición completa**, que debe documentarse con evidencia datada y archivo local inmutable.
4. `hypothetical_issue_month`: primer día del mes después de `cutoff_month`, siempre **23 meses antes** del mes final `target_end_month` en una ventana mensual de 24 meses.
5. `real_forecast_issued_at`: **NULO** para todos los experimentos GED existentes; ningún timestamp histórico independiente verifica emisión real.

Una release fechada el mismo día de emisión hipotética se **rechaza** si se ignora la hora efectiva de disponibilidad. En otras palabras: `release_date < hypothetical_issue_date`, nunca `<=`.

## Implementación

`research/psychohistory/ged_asof_provenance.py`:

- Exige el SHA-256 exacto del JSON privado GED casebook v0.6.8 antes de leerlo. Valida esquemas y flags retrospectivos, 74/944 u otros totales **desde los inputs** (sin hardcodear cantidades), claves de evento únicas, país/fecha, cortes C, horizonte 24m y que cada evento enlazado cae en su ventana.
- Parsea `source_article_publication_dates_raw` con tres resultados diferenciados: `PARSED_SOURCE_PUBLICATION_ONLY`, `NOT_RECORDED`, `PARTLY_UNPARSEABLE`. Las publicaciones son solo **contexto de fuentes**, nunca sellos de disponibilidad UCDP.
- Sin registro de archivos vintage verificados, clasifica todos los vínculos como `NO_PINNED_IN_SCOPE_VINTAGE` y mantiene `source_as_of_verified=false` y `prospective_eligible=false`.
- Acepta opcionalmente un manifiesto de **Candidate** y un directorio privado. Rechaza archivos inexistentes o con SHA modificado, nombres con `../`, versiones duplicadas, scopes de países no verificados, GED final presentado como Candidate y fechas de release sin enlace de evidencia. Exige edición, SHA-256, release_date, evidencia, país y `target_comparability_verified=false`.
- Incluso ante un Candidate fechado antes del corte y de geografía coincidente, la salida es `SNAPSHOT_PRESENT_REBUILD_TARGET_REQUIRED` —**no certifica ningún backtest vintage-correct**. Sigue siendo necesario reestimar las features, los targets y las métricas sobre la misma cohorte histórica.
- Nunca cambia `PsicoPredicciones` ni proyecta en la UI que exista `prospective skill`. Salida JSON **create-only** fuera del repo público y reproducible con código versionado.

Las pruebas sintéticas comprueban cambios indebidos de fecha final o de corte, duplicación de vínculos, publicación no normalizada, ausencia de fuentes, publicaciones posteriores, hash de vintage, límite temporal estricto, scope geográfico y afirmaciones falsas de prospectividad.

## Protocolo privado

Entrada: extraer `ged_incident_casebook.json` del ZIP privado v0.6.8; verificar hash del archivo exacto, fijar el commit del analizador y conservar ambos SHA. No reutilizar el SHA del ZIP como si fuera el del JSON interno.

```bash
python3 research/psychohistory/ged_asof_provenance.py \
  --casebook /privado/ged_incident_casebook.json \
  --casebook-sha256 <sha256_DEL_JSON> \
  --out /privado/ged_asof_provenance_v069.json
```

El manifiesto opcional `psychohistory.ged.vintage_manifest.v1` NO es una certificación independiente por sí solo. Campos por snapshot: `source_type: UCDP_CANDIDATE`, `edition`, `archive_file`, `sha256`, `release_date`, `release_date_evidence_url`, `source_scope_verified: true`, `country_ids_in_verified_scope`, `target_comparability_verified: false`. Un valor de fecha afirmado por un usuario o una página actual no sustituye un registro de publicación histórica demostrado.

## Próximo experimento científicamente defendible

1. Elegir una sola release Candidate histórica cuyo fichero y fecha de publicación se puedan verificar externamente; comenzar por una edición de la **cobertura geográfica realmente documentada**. No asumir globalidad de Candidate 2018.
2. Congelar un universo común y un target definido desde el primer momento: candidato preliminar versus desenlace definitivo GED, sin reutilizar etiquetas ni denominadores.
3. Evaluar únicamente cortes posteriores al primer vintage archivado y con entrenamiento anterior suficientemente documentado. Si no hay fuente para un corte, marcarlo **NO EVALUABLE**, no imputar cero incidentes.
4. Emitir desde ahora pronósticos de fecha futura con log externo (hash, timestamp, artefactos privados) para demostrar honestamente skill prospectivo con el paso del tiempo.

**Cierre esperado:** una auditoría de procedencia y un inventario explícito de bloqueos, no un porcentaje de éxito ni una cifra de mejoras del forecasting.
