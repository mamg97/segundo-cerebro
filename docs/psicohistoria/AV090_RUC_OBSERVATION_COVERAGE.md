# AV-090 — Cobertura y retrasos de observaciones RUC

22/10/2026. Continuación técnica de [AV-089](AV089_MACRO_RUC_VINTAGES.md),
sin modelo, backtest, señal ni predicción.

## Pregunta y método

¿Qué meses aparecen por primera vez en cada vintage trimestral del libro RUC
de la Fed de Filadelfia? El nuevo auditor vuelve a exigir el **SHA completo**
del libro original y la validación estructural de AV-089 antes de contar.
Calcula el desfase entre el mes observado y el último mes que podría estar
disponible en el corte trimestral. No asigna una fecha de publicación BLS a
ninguna columna. Los 226 meses hasta el corte potencial del primer vintage
(1965Q4) se excluyen del cálculo de primera aparición porque están censurados
por la izquierda: ya había historia antes de empezar el libro.

Sobre el original RUC observado el 22/10/2026, con SHA-256
`d971e59d3ed5f1322a46631743508fb1ad5eee39bfbe12425a641a277fdd9b9a`:

| Cobertura técnica | Meses o vintages |
| --- | ---: |
| Meses con primera aparición RUC evaluable | 728 |
| Desfase 0 meses | 242 |
| Desfase 1 mes | 242 |
| Desfase 2 meses | 243 |
| Desfase 4 meses | 1 |
| Mes posterior al primer corte nunca observado | octubre de 2025 |
| Vintages cuyo último dato coincide con el mes potencial | 243 |
| Vintage cuyo último dato queda dos meses antes | 1 (2025Q4) |

La excepción de cuatro meses es septiembre de 2025, cuya primera aparición
en este libro es 2026Q1. La [nota oficial BLS sobre el cierre federal de
2025](https://www.bls.gov/cps/methods/2025-federal-government-shutdown-impact-cps.htm)
declara que los datos de septiembre se publicaron el 20 de noviembre de 2025,
más de seis semanas después de lo previsto, y que no se recogieron datos CPS
de octubre. El [archivo oficial de Employment Situation](https://www.bls.gov/bls/news-release/empsit.htm)
marca octubre de 2025 como no publicado. Esto explica la excepción a nivel
documental, pero el libro RUC **no identifica la primera publicación BLS**;
su primera aparición sólo se observa con resolución trimestral. La página
actual del archivo BLS tampoco acredita por sí sola cuándo estaban
disponibles históricamente los bytes de cada vintage RUC.

## Reproducción y límite

`research/psychohistory/ruc_observation_coverage.py` produce contadores y
banderas explícitas `first_bls_release_identified=false`,
`exact_historical_release_times_verified=false`,
`forecast_issued=false` y `predictive_skill_demonstrated=false`. Las pruebas
sintéticas cubren la censura inicial y meses ausentes. La CI ejecuta el
auditor sobre una descarga efímera con hash fijado y elimina el XLSX.

La siguiente puerta requiere archivar y verificar fechas BLS originales por
mes, capturar el calendario de disponibilidad RUC, y fijar el objetivo de
primera publicación a seis meses. Hasta entonces no se construye un panel de
labels ni se puntúa un modelo. `MAC-02` continúa `PARCIAL` y
`criterio_superado=NO`. Candidate permanece `SOURCE_QUALITY_BLOCKED`.
