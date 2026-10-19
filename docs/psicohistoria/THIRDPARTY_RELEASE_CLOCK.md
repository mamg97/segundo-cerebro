# PSICOHISTORIA — Puerta de exclusión temporal con metadatos de un tercero

**19/10/2026 · Investigación:** separar fecha declarada de publicación,
fecha registrada de consulta y prueba de contenido exacto. **No es
validación as-of, no emite predicciones y no ejecuta scores.**

## Evidencia publicada y volatilidad del catálogo externo

El [catálogo público OWID / Datasette](https://datasette-public.owid.io/owid)
contiene una entrada para UCDP Candidate mensual **24.0.10**:

- **datePublished = 2024-10-20** (declaración de publicación que conserva OWID).
- **dateAccessed = 2024-11-22** (fecha de acceso registrada por OWID).
- **urlDownload = https://ucdp.uu.se/downloads/candidateged/GEDEvent_v24_0_10.csv**
- Editor: Uppsala Conflict Data Program.

El registro figura en la [consulta viva de metadatos OWID para UCDP](https://datasette-public.owid.io/owid?p0=UCDP&sql=select+rowid%2C+id%2C+titleSnapshot%2C+title%2C+descriptionSnapshot%2C+description%2C+producer%2C+citationFull%2C+attribution%2C+attributionShort%2C+versionProducer%2C+urlMain%2C+urlDownload%2C+dateAccessed%2C+datePublished%2C+license+from+origins+where+%22attributionShort%22+%3D+%3Ap0+order+by+license+limit+101).

**Advertencia contrastada:** en un índice de búsqueda anterior se observó
también un registro trimestral \`v24.01.24.12\`, con publicación declarada
28/01/2025 y acceso 19/02/2025. Ese ID ya no fue recuperable como
coincidencia única durante la ejecución de la nueva CI. **No** se usó
para el experimento, y esta discrepancia demuestra que la base de metadatos
consultable hoy no es necesariamente un archivo histórico inmutable.
No extrapolar fechas del trimestral al mensual.

La edición mensual **24.0.10** tampoco es \`24.0.12\` (diciembre) ni
\`25.0.1\` (enero), estudiadas en los avances 27–28.

## Puerta implementada

\`research/psychohistory/thirdparty_release_clock.py\` exige un único
registro del tercero y comprueba editor, nombre de versión, URL exacta,
fechas ISO, respuesta no ambigua y orden de fechas de los orígenes.
Impide usar URLs de suplantación y versiones equivocadas.

Dado el corte de emisiones hipotéticas al **día 1**, clasifica:

| Emisión hipotética | Clasificación |
|---|---|
| 2024-10-01 | \`NOT_PUBLISHED_BY_DECLARED_DATE\`: el catálogo declara publicación posterior |
| 2024-11-01 | \`NO_THIRD_PARTY_ACCESS_BEFORE_ISSUE\`: la fecha de acceso registrada es posterior |
| 2024-12-01 | \`METADATA_PREISSUE_BYTES_NOT_ATTESTED\`: los dos metadatos preceden la emisión, **pero no acreditan los bytes exactos** |

El programa **no** permite ninguna aprobación de replay:
\`source_as_of_verified=false\`,
\`independent_timestamp_cryptographically_authenticated=false\`,
\`historical_byte_hash_attested_by_third_party=false\`,
\`vintage_correct_replay_authorized=false\`, \`models_scored=false\`,
\`forecast_issued=false\`.

La presencia de metadatos, aunque sean gestionados por un tercero,
no significa que el registro sea inmutable, que el fichero no haya
cambiado después, ni que el archivo GED Candidate incluya el universo
de países con cero incidentes. El cronograma de publicación no puede
deducirse del número de versión ni de las fechas de los eventos.

## Reproducción y siguiente hito

[GitHub Actions](../../.github/workflows/psychohistory-thirdparty-release-clock.yml)
consulta una sola fila de metadatos públicos por HTTPS en un runner
efímero. No descarga eventos, no almacena documentos ni crea un servicio
de pago. Se confrontan las tres fechas de emisión hipotética contra los
datos del catálogo en tiempo real; el resultado se guarda únicamente como
salida agregada.

Para avanzar científicamente se necesita un testigo externo
independientemente fechado **de los bytes exactos** (comprobable por
SHA-256), y después un roster de todos los países y features/etiquetas
reconstruidas con versiones realmente disponibles antes de cada origen.

**El módulo es una nueva barrera de exclusión, no una evidencia de skill.**
