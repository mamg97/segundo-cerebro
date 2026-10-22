# AV-100 — Piloto de lectura de comunicados BLS

23/10/2026. Cinco meses elegidos para probar la lectura del objetivo macro; no es una cohorte ni un backtest.

## Evidencia y extracción

Se capturó por navegador el DOM completo de cinco páginas del [archivo oficial Employment Situation](https://www.bls.gov/bls/news-release/empsit.htm), después de que la descarga directa por terminal devolviera HTTP 403. Las cinco serializaciones HTML, URL, hora de captura, tamaño y SHA-256 están en el archivo **privado** `source-archive/bls-employment-situation-2026-10-22/dom-snapshots/MANIFEST.json`, fuera de Git. El programa público `research/psychohistory/bls_release_dom_pilot.py` verifica longitud y hash, exige una única tabla `cps_empsit_sum`, selecciona la columna del **mes de referencia** y la fila nacional `Unemployment rate`, y falla ante valores o columnas ambiguos.

| Mes de referencia | Fecha en el archivo | Tasa publicada en la página archivada consultada |
| --- | --- | ---: |
| [Enero de 2011](https://www.bls.gov/news.release/archives/empsit_02042011.htm) | 04/02/2011 | 9,0 % |
| [Abril de 2020](https://www.bls.gov/news.release/archives/empsit_05082020.htm) | 08/05/2020 | 14,7 % |
| [Septiembre de 2025](https://www.bls.gov/news.release/archives/empsit_11202025.htm) | 20/11/2025 | 4,4 % |
| [Enero de 2026](https://www.bls.gov/news.release/archives/empsit_02112026.htm) | 11/02/2026 | 4,3 % |
| [Septiembre de 2026](https://www.bls.gov/news.release/archives/empsit_10022026.htm) | 02/10/2026 | 4,2 % |

La fila contiene también valores de otros meses, algunos revisados; el extractor usa el encabezado del mes objetivo y no confunde el último campo de cambio mensual con una tasa. Octubre de 2025 sigue siendo ausencia estructural de CPS; la publicación de septiembre de 2025 se retrasó al 20/11/2025.

## Límite temporal

Estas son **serializaciones del DOM observadas el 22/10/2026**, no bytes HTTP originales ni una captura realizada el día de cada comunicado. El [archivo de abril de 2020](https://www.bls.gov/news.release/archives/empsit_05082020.htm) contiene incluso una nota de corrección posterior sobre empleo en nómina: demuestra que una página archivada puede cambiar. No se ha demostrado que los cinco valores fueran idénticos en el primer instante de publicación, aunque el texto archivado actual los presenta como tasas del mes. La fecha del nombre de la URL y el encabezado no bastan para un reloj point-in-time. Los otros 183 comunicados del índice siguen sin captura, y la vía de descarga CLI sigue dando 403.

El piloto valida una ruta de **extracción de fuente actual** con integridad local y meses bien etiquetados. Aún hay que obtener o fijar evidencias históricas de primera publicación, cubrir los meses pertinentes, alinear el corte de los vintages RUC y preespecificar target, horizonte y benchmark. `MAC-02` continúa `PARCIAL`, `criterio_superado=NO`. No se ha ajustado modelo, calculado score ni emitido pronóstico.
