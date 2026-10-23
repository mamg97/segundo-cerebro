# AV-108 — Reloj de recogida de las olas HTOPS de 2026

23/10/2026. Complementa [AV-098](AV098_HTOPS_QUESTIONNAIRE_AND_UNCERTAINTY.md); sin emisión ni backtest.

Las declaraciones oficiales de **Source and Accuracy** de [marzo](https://www2.census.gov/programs-surveys/demo/technical-documentation/hhp/HTOPS_2603_Source_and_Accuracy.pdf) y [julio](https://www2.census.gov/programs-surveys/demo/technical-documentation/hhp/HTOPS_2607_Source_and_Accuracy.pdf), tabla 1 en la página PDF 3 de cada una, fijan estos intervalos de recogida:

| Ola rotulada | Inicio | Fin | Observación |
| --- | --- | --- | --- |
| Marzo 2026 | 13/03/2026 | 30/03/2026 | Dentro de marzo. |
| Julio 2026 | 15/07/2026 | 03/08/2026 | Cruza de julio a agosto. |

Los PDF completos están fuera de Git en `source-archive/census-htops-social-2026-10-22/`; sus SHA-256 verificados son `52e670065ba992a3359cbfe5437bf1f520a2a2e1e4e5e7eefb8ffa0178745173` (marzo) y `5b17eb1e2b01fe59eb434366a257da979be01c651be14b23f55d83747c644360` (julio). Son bytes observados el 22/10/2026, no capturas hechas antes de cada ola.

El resultado `SOC2_first` representa respuestas de una **ola de recogida**, no una medida puntual del calendario de marzo o julio. La pregunta de frecuencia de soledad no declara un intervalo retrospectivo. Por tanto, un contrato prospectivo debe identificar la ola y exigir un corte **anterior al primer día de campo**; para la ola de julio de 2026 eso habría sido antes del 15/07/2026, no antes del 01/08. La etiqueta mensual no fija por sí sola la fecha del desenlace ni su primer día de disponibilidad pública.

Faltan la primera publicación de cada tabla, el tratamiento de revisiones y una ola futura con pregunta confirmada. `SOC-02` sigue `PARCIAL`, `criterio_superado=NO`. No se calculan diferencias de cambio real, scores ni probabilidades nuevas.
