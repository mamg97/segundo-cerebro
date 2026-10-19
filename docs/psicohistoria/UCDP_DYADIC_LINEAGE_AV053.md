# PSICOHISTORIA — AV-053 · Linaje de díadas UCDP 19.1 y 25.1

**Protocolo científico:** comparar la actividad de díadas gobierno–oposición para las mismas 61 observaciones GW-país-año que el antiguo Onset marca como `onset1=1` y `newconf=1`, y las ediciones modernas intrastatales country/conflict como `onset1=0`. Es un contraste retrospectivo de definiciones, **no un backtest, un forecast ni un arbitraje de verdad**.

## Justificación

El AV-052 documentó 61 casos: diez tenían conflicto intrastatal tipo 3/4 en ambos conjuntos UCDP/PRIO ACD 19.1 y 25.1, mientras 51 no lo tenían en ninguno según código `gwno_loc` y año. Un ID de conflicto puede contener más de una díada; las ediciones modernas pueden incluir cambios de entidad, de nomenclatura, de fechas, de umbrales y de clasificación.

La [documentación oficial de UCDP Dyadic 19.1](https://ucdp.uu.se/downloads/dyadic/ucdp-dyadic-191.pdf) define `dyad_id`, `conflict_id`, `year`, `type_of_conflict` y `gwno_loc`; esta última identifica el Estado de la incompatibilidad, no necesariamente la geografía de los sucesos. El [catálogo histórico de UCDP](https://ucdp.uu.se/downloads/olddw.html) proporciona las ediciones 19.1 y 25.1. La propia [historia de cambios Dyadic 25.1](https://ucdp.uu.se/downloads/dyadic/version-history-dyadic-251.pdf) enumera incorporaciones y revisiones de díadas y años.

## Ingeniería

- `research/psychohistory/ucdp_dyadic_lineage_av053.py`: encuentra en el catálogo oficial las URL de Dyadic 19.1 y 25.1, comprueba rutas HTTPS al proveedor, conserva los CSV sólo en la memoria efímera del runner y utiliza los digests SHA-256 ya observados de ACD y Onset para inmovilizar el referente de comparación. Clasifica únicamente díadas en conflictos internos tipos 3–4.
- `test_ucdp_dyadic_lineage_av053.py`: pruebas adversariales **con datos ficticios**, de país con varias díadas, conflicto distinto, ausencia de ubicaciones, fechas incompatibles, catálogo falsificado, universos incompletos y bloqueo de inferencias causales.
- `.github/workflows/psychohistory-ucdp-dyadic-lineage.yml`: validación en GitHub Actions, sin repositorios de datos descargados, sin publicar códigos de Estado, IDs de conflictos, filas ni probabilidades.

El resultado medirá de forma agregada la presencia de díadas en ambas ediciones, sólo antigua, sólo moderna y ninguna; compartición meramente *numérica* de `dyad_id` y `conflict_id`; y correspondencias internas con UCDP/PRIO ACD. No se permitirá que la falta de `gwno_loc` se convierta en un país sin conflicto.

## Limitaciones de investigación

**Identidad de bytes observada en 2026 no es sello de publicación pre-2020.** Igualdad de `dyad_id` no demuestra continuidad histórica verificable y coincidencia de `gwno_loc` no reemplaza un crosswalk certificado GW/UCDP. Una ausencia en un dataset de conflicto-año o díada-año no demuestra ausencia de violencia. No entrenar con UCDP v25.1 suponiendo que estuvo disponible en 2020.

El gate MAD-02 permanece PARCIAL; `PsicoPredicciones` continúa sin emisiones y el sistema privado de 2027 queda sin tocar. El siguiente paso dependerá de la capacidad real para reconciliar *dyad-year*, `newconf` y vintage editorial de origen.

## Ejecución oficial real y resultado (19/10/2026)

UCDP ha servido las siguientes versiones de Dyadic, ambas descubribles desde el catálogo oficial. Los SHA-256 corresponden a los bytes observados en octubre de 2026 y están fijados en el código para detectar sustituciones:

| Fuente | Archivo | Filas | Cobertura | SHA-256 de descarga |
|---|---|---:|---|---|
| Dyadic 19.1 | `https://ucdp.uu.se/downloads/dyadic/ucdp-dyadic-191.csv` | **3.000** | Hasta 2018 | `b1eed9ae6540268a157694068c8f3b2be9bb6104640aec2d1c43dab487c9a0f6` |
| Dyadic 25.1 | `https://ucdp.uu.se/downloads/dyadic/ucdp-dyadic-251-csv.zip` | **3.432** | Hasta 2024 | `e34d26c39d23739ab65bc52fd42747aa88e7ecdf84d16c7bacafd590ed767330` |

Para Dyadic 25.1, el SHA-256 del CSV **interno al ZIP** es `e5bf6e3779a903f3df3ec476592332ce51ccf3798174b3db4c1b06dd1dd5a7ba`. Los tres digests quedan verificados tras releer los ZIP/CSV reales, pero ninguno representa un sello temporal de disponibilidad anterior a julio de 2020.

### Observaciones en el subconjunto fijo

Se han comprobado exactamente **10.130** claves GW-año compartidas entre los archivos de Onset; la selección anterior de **61** registros antiguos con `newconf=1` y variantes modernas `onset1=0` permanece inalterada.

- **10** muestran díadas intrastatales tipos 3–4 en **ambas** versiones Dyadic.
- **0** aparecen solo en Dyadic 19.1 y **0** solo en Dyadic 25.1.
- **51** no presentan una díada interna identificable en ninguna. De estos, **45** pertenecen a años anteriores a 1989 y **6** a 1989–2017.
- Los diez con díadas en ambas versiones coinciden en algún ID numérico de díada y de conflicto.
- No se observaron diferencias entre IDs de conflicto obtenidos por las díadas y los que reflejaba ACD para el mismo GW-año en esos 61 casos.
- Ninguna fila `gwno_loc` del fichero Dyadic 19.1 ni 25.1 quedó sin poder interpretar bajo la regla aplicada.

La **coincidencia agregada con AV-052 es total** para el criterio presencia/ausencia de actividad intrastatal. De ello no se desprende equivalencia general entre datasets: los `newconf` antiguos con valor 1 pueden codificar la historia de una díada, una identidad política distinta o incluso corresponder a una definición de universo no homologada. La ausencia de correspondencia en 51 casos no convierte las etiquetas antiguas automáticamente en errores.

## Implicación y próxima decisión

La investigación del linaje de fuentes ha reducido la hipótesis de que la diferencia de unidad conflicto/díada explique estas **51** discordancias: con la proyección definida, el conteo por díadas y por conflicto es idéntico.

**AV-054 recomendado:** auditar el codebook y el esquema real de `onsets_computed.csv` catalogado como 19.1, especialmente si mezcla onset *intrastate*, *interstate* o conflicto/díada; y determinar por qué el archivo servido desde el catálogo no cubre 2018 pese a la documentación. Esa cuestión debe resolverse antes de cualquier etiqueta canónica para modelos.

Todas las banderas de origen `as-of`, calidad del roster y entrenamiento siguen en false. `MAD-02=PARCIAL`, cero emisiones de predicción y cohortes privadas de 2027 sin cambios.
