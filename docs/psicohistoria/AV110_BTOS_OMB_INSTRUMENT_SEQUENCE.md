# AV-110 — Secuencia documental OMB de instrumentos BTOS

23/10/2026. Continuación de [AV-103](AV103_BTOS_LIVE_INSTRUMENT_DRIFT.md). Se conservaron fuera de Git los dos expedientes HTML, sus fichas de instrumentos y los dos DOCX completos, con URL, fecha de captura, tamaño y SHA-256 en `source-archive/census-btos-ai-2026-10-23/MANIFEST.json`.

| Expediente oficial | Conclusión OMB | Instrumento adjunto observado | Alcance de la prueba |
| --- | --- | --- | --- |
| [202507-0607-004](https://www.reginfo.gov/public/do/PRAViewICR?ref_nbr=202507-0607-004) | 28/08/2025, aprobado sin cambios | [Content V4, Cycle 2, AI, revisado 23/07/2025](https://www.reginfo.gov/public/do/DownloadDocument?objectID=160825901) | Testigo de texto AI anterior; la pregunta de uso actual menciona producción de bienes o servicios. |
| [202608-0607-006](https://www.reginfo.gov/public/do/PRAViewICR?ref_nbr=202608-0607-006) | 19/10/2026, aprobado con cambios | [Content V5, Cycle 2, SI](https://www.reginfo.gov/public/do/DownloadDocument?objectID=172332502) | Testigo de texto SI posterior; la pregunta de uso actual abarca cualquier función empresarial. |

El libro BTOS actual fecha el campo de `202621` del **05 al 18/10/2026** y su publicación el 22/10. La conclusión OMB del expediente SI es **posterior al final de ese campo**. Esta secuencia es una pista temporal fuerte para investigar el cambio AI→SI, pero **ni la fecha de aprobación ni la presencia de un DOCX en el expediente identifican el formulario efectivamente administrado** a `202621`. Tampoco prueban el momento exacto de implementación. El cuestionario SI público actual está rotulado para periodos `202702–202713`.

La [nota Census de cambio de redacción de 2025](https://www.census.gov/hfp/btos/downloads/AI%20Question%20Wording%20Updates.pdf) declara una nueva serie desde diciembre de 2025 tras pasar a uso en cualquier función. El DOCX AI V4 de julio de 2025 conserva todavía la pregunta anterior sobre producción de bienes o servicios. Por tanto, **no sirve como instrumento de la ola de octubre de 2026** sin una cadena documental adicional. Entre V4 AI y V5 SI falta identificar la versión administrada en `202621` y mapear sus ítems a `Question ID 7/24` del libro. El anexo OMB tampoco aporta los XLSX de primera publicación.

`TEC-02` permanece `PARCIAL`, `criterio_superado=NO`; sin serie homogénea admitida, score ni pronóstico. Siguiente paso: localizar la versión intermedia posterior a noviembre de 2025 y la constancia de despliegue por ciclo/periodo.
