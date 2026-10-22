# AV-093 — Viabilidad de pronósticos de réplicas USGS

22/10/2026. Exploración de la línea «catástrofes y riesgos sistémicos». **No es** un pronóstico del proyecto ni un backtest. El objeto posible es condicional: tras un sismo principal ya observado, estimar la probabilidad de réplicas en una región, magnitud y ventana predefinidas. No se plantea predecir fecha o lugar de un sismo principal.

## Fuentes y captura

- [API ComCat](https://earthquake.usgs.gov/fdsnws/event/1/) y [archivo de Aftershock Forecasts](https://earthquake.usgs.gov/data/oaf/) oficiales.
- [Descripción de productos ComCat](https://earthquake.usgs.gov/data/catalog/products.php) y [calendario de actualizaciones OAF](https://earthquake.usgs.gov/data/oaf/schedule.php): un evento puede tener pronósticos sucesivos. Por eso la versión **vigente hoy** no representa necesariamente la primera versión disponible al emitir.
- Se conservaron en privado, con bytes y SHA-256, la respuesta ComCat de eventos con producto OAF, magnitud mínima 5 y fecha de evento 2026-09-01 a 2026-10-01, el detalle de `us6000tx38` y su `forecast.json` vigente. Véase `source-archive/usgs-oaf-2026-10-22/MANIFEST.json`. El conjunto actual devolvió **11 eventos**. Es una consulta filtrada por presencia de producto OAF, no el denominador de todos los sismos ni una muestra histórica congelada al día del suceso.

El detalle de `us6000tx38` muestra un único producto `oaf` en la respuesta consultada. El JSON correspondiente expone `creationTime`, `timeStart`, `timeEnd`, magnitudes y probabilidades, con cuatro ventanas. El `updateTime` de ese producto es posterior al sismo principal. La respuesta actual no demuestra que versiones previas no existieran: la [programación USGS](https://earthquake.usgs.gov/data/oaf/schedule.php) contempla múltiples actualizaciones, automáticas y manuales.

## Contrato científico antes de evaluar

1. Elegir si el proyecto evaluará **pronósticos OAF existentes de USGS** (comparación/calibración externa) o un **modelo propio** de réplicas. Son preguntas distintas. El primero no atribuye habilidad nueva a Psicohistoria.
2. Fijar antes de consultar outcomes la región, criterio de sismo principal, exclusiones, umbral de magnitud de réplica, ventana, versión de catálogo y tratamiento de eventos solapados.
3. Para cada emisión, conservar el JSON original, hash, URL de versión, hora de captura independiente y reloj `as-of`. Verificar que `creationTime` y captura preceden `timeStart` del outcome. Una versión posterior puede incorporar réplicas ya observadas y contaminar el backtest.
4. Construir el denominador de todos los sismos principales elegibles, incluidos los **sin** producto OAF, y distinguir cobertura de habilidad. Definir cómo medir réplicas con revisiones del catálogo y región consistente.
5. Predefinir benchmark, score probabilístico, splits temporales y evaluación de calibración. No puntuar el snapshot actual ni inferir precisión de las 11 observaciones filtradas.

Estado: **fuente localizada; calidad temporal y denominador bloqueados**. No registrar fase superada, score ni predicción.

**Avance posterior:** [AV-101](AV101_USGS_OAF_VERSIONS_AND_DENOMINATOR.md)
recupera 27 versiones OAF de `us6000tx38` con `includesuperseded=true`,
archiva las tres primeras y compara 167 sismos M≥5 con 11 que tienen OAF en
la consulta actual. La primera ventana empieza antes de la actualización del
producto; aún no hay cohorte prospectiva ni score admisible.
