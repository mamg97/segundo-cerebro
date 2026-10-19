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
