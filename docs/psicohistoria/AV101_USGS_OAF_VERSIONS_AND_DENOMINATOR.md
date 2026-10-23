# AV-101 — Versiones OAF y denominador preliminar USGS

23/10/2026. Auditoría de una muestra temporal y una consulta global de septiembre de 2026. No es un pronóstico de Psicohistoria ni un backtest de USGS.

## Recuperación de versiones

La [API oficial de eventos USGS](https://earthquake.usgs.gov/fdsnws/event/1/) permite `includesuperseded=true`; la [documentación de productos ComCat](https://earthquake.usgs.gov/data/comcat/products.php) identifica versiones por fuente, tipo, código y hora de actualización. En [AV-093](AV093_USGS_OAF_SOURCE_FEASIBILITY.md) el detalle normal de `us6000tx38` mostraba solo el producto OAF vigente. Con `includesuperseded=true`, el mismo evento devuelve **27 versiones OAF** del mismo código, fechadas desde 23/09/2026 13:32:39 UTC hasta 21/10/2026 13:12:04 UTC. Se archivaron privadamente la respuesta completa y los JSON `forecast.json` de las tres primeras versiones, todos con URL, hora de captura, bytes y SHA-256 en `source-archive/usgs-oaf-2026-10-22/MANIFEST.json`.

| Versión | Inicio de la primera ventana de 24 h | Actualización del producto | Retraso desde inicio | Probabilidad USGS de ≥1 réplica M≥5 en esa ventana |
| --- | --- | --- | ---: | ---: |
| [Primera](https://earthquake.usgs.gov/product/oaf/us6000tx38/us/1790170359014/forecast.json) | 23/09 13:20:00 UTC | 23/09 13:32:39 UTC | 12 min 39 s | 3,246 % |
| [Segunda](https://earthquake.usgs.gov/product/oaf/us6000tx38/us/1790170918690/forecast.json) | 23/09 13:40:00 UTC | 23/09 13:41:58 UTC | 1 min 59 s | 3,000 % |
| [Tercera](https://earthquake.usgs.gov/product/oaf/us6000tx38/us/1790172113562/forecast.json) | 23/09 14:00:00 UTC | 23/09 14:01:53 UTC | 1 min 54 s | 2,815 % |

Las horas de `creationTime` del JSON son anteriores al inicio de ventana, pero la hora de actualización del **producto** es posterior en las tres versiones. El encabezado `Last-Modified` de cada URL se aproxima a esa actualización. Ninguna captura se hizo en septiembre: estos bytes se recuperaron el **22/10/2026**. Por tanto, esos metadatos no prueban por sí solos disponibilidad pública en el instante histórico. Además, la probabilidad se refiere a la ventana completa, que ya había empezado antes de la actualización; no puede puntuarse limpiamente contra ese desenlace como una emisión prospectiva íntegra. Recortar el outcome al instante de publicación cambiaría la pregunta probabilística y requeriría una nueva probabilidad para la ventana recortada.

### Contraejemplo temporal en una versión posterior

La versión OAF vigente del mismo evento al capturar el archivo privado, [actualizada el 21/10/2026](https://earthquake.usgs.gov/product/oaf/us6000tx38/us/1792588324773/forecast.json), tiene `updateTime` 13:12:04.773 UTC y una primera ventana de 24 horas que empieza a las 14:00:00 UTC: **47 min 55,227 s después**. Por ello, el desfase negativo de las tres primeras versiones no es una propiedad de todas las versiones del evento. Los JSON de detalle y pronóstico guardados en `source-archive/usgs-oaf-2026-10-22/MANIFEST.json` tienen hashes verificados; el pronóstico da 0,03417 % para ≥1 réplica M≥5 en esa ventana.

La captura independiente del pronóstico fue el **22/10 a las 19:04:47 UTC**, después del final de esa ventana (22/10 14:00 UTC). Este hallazgo permite diseñar una futura captura antes del inicio, pero **no** convierte esta versión archivada en una emisión observada prospectivamente ni habilita su puntuación. Harían falta captura independiente anterior al inicio, versión del catálogo y outcome compatibles, y universo elegible fijado.

## Denominador observado

Se archivó también la consulta oficial [sin filtro de producto](https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2026-09-01&endtime=2026-10-01&minmagnitude=5&limit=200): **167** sismos únicos M≥5 del 01/09 al 01/10/2026 en el catálogo actual. La [consulta filtrada por OAF](https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&producttype=oaf&starttime=2026-09-01&endtime=2026-10-01&minmagnitude=5&limit=50) conserva **11**, todos incluidos en el conjunto de 167. Esto mide la cobertura **de estas consultas actuales**, no una tasa de emisión exigible: la política USGS puede limitar OAF por región, magnitud, tipo o criterio operativo, y los catálogos pueden revisarse. Los 156 sin OAF no son errores de pronóstico ni negativos de réplica.

`research/psychohistory/usgs_oaf_version_audit.py` reproduce contadores, integridad y el desfase de las tres versiones con los originales privados. El programa no consulta outcomes ni calcula habilidad.

## Puerta pendiente

Separar formalmente evaluación de los pronósticos USGS de un modelo propio; fijar universo elegible, versión de catálogo, región, umbral y ventana cuyo **inicio sea posterior a una captura independiente** de la emisión. Solo entonces elegir benchmark y score. `SIS-02` permanece `PARCIAL`, `criterio_superado=NO`; no hay predicción nueva.
