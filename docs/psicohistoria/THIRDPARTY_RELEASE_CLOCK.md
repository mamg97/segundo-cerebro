# PSICOHISTORIA — Puerta de exclusión temporal con metadatos de un tercero

**19/10/2026 · Investigación:** separar afirmaciones de publicación, observación
externa y certificación del contenido exacto. **No es una validación as-of**.

## Hallazgo público trazable

El catálogo público de [Our World in Data (OWID) / Datasette](https://datasette-public.owid.io/owid)
incluye un registro para UCDP Candidate **trimestral**
\`v24.01.24.12\` (enero a diciembre 2024):

- **datePublished**: 2025-01-28 (fecha **declarada** en el catálogo).
- **dateAccessed**: 2025-02-19 (fecha de **acceso registrada** por OWID).
- **urlDownload**: \`https://ucdp.uu.se/downloads/candidateged/GEDEvent_v24_01_24_12.csv\`.
- Editor: Uppsala Conflict Data Program.

**No confundir:** \`v24.01.24.12\` **NO** es la edición mensual
\`24.0.12\` previamente estudiada. La fecha de la primera no demuestra
nada sobre la fecha de publicación exacta de la segunda.

Consulta de metadatos del registro del tercero reproducida con un único
fetch efímero en [GitHub Actions (tercero)](../../.github/workflows/psychohistory-thirdparty-release-clock.yml).
No se descargan CSV de eventos ni se almacenan datos nacionales en Git.

## Contrato científico del nuevo auditor

\`research/psychohistory/thirdparty_release_clock.py\` comprueba por
identidad la versión, URL de descarga, editor y fechas del tercero.
Rechaza ediciones sustituidas, URLs que imitan el dominio oficial,
fechas imposibles, respuestas con varias filas y orígenes desordenados.

Para una hipótesis de pronóstico emitido el **día 1** de un mes:

| Emisión hipotética | Resultado del guard |
|---|---|
| 2025-01-01 | \`NOT_PUBLISHED_BY_DECLARED_DATE\`: la fecha declarada es posterior |
| 2025-02-01 | \`NO_THIRD_PARTY_ACCESS_BEFORE_ISSUE\`: OWID aún no registra acceso |
| 2025-03-01 | \`METADATA_PREISSUE_BYTES_NOT_ATTESTED\`: publicación y acceso declarados preceden al origen, pero NO existe testigo SHA-256 histórico |

**Ningún resultado positivo**. Aunque un tercero afirme haber consultado el
recurso en febrero, desconocemos si la fila del catálogo es inmutable y si
los bytes descargables hoy coinciden con los observados entonces. La
evidencia de una URL o de una fecha sin un contenido comprobable no valida
un retrospectivo. \`source_as_of_verified=false\`,
\`vintage_correct_replay_authorized=false\`, \`models_scored=false\`,
\`forecast_issued=false\`. Tampoco valida cobertura de los países
con cero incidentes.

El auditor no sustituye el verificador SHA de \`ged_asof_provenance.py\`
ni \`asof_cohort_coverage.py\`; es una **restricción adicional** de fecha
de fuente, todavía incapaz de habilitar un backtest.

## Evidencia que falta

Un testigo independiente temporal de **esos bytes exactos**, no solo
metadatos del catálogo, por ejemplo una instantánea externa fechada y
verificable con checksum cotejable. Debe fijarse también el instante de
emisión, embargo de etiquetas y roster de países predefinido sin información
posterior. La mera presencia histórica de UCDP Candidate no demuestra
capacidad predictiva.

Fuentes:
[histórico oficial UCDP](https://ucdp.uu.se/downloads/olddw.html),
[catálogo OWID, versión UCDP](https://datasette-public.owid.io/owid?p0=UCDP&sql=select+rowid%2C+id%2C+titleSnapshot%2C+title%2C+descriptionSnapshot%2C+description%2C+producer%2C+citationFull%2C+attribution%2C+attributionShort%2C+versionProducer%2C+urlMain%2C+urlDownload%2C+dateAccessed%2C+datePublished%2C+license+from+origins+where+%22attributionShort%22+%3D+%3Ap0+order+by+license+limit+101).
