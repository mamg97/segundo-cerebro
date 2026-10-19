# PSICOHISTORIA — AV-050 · Cuatro definiciones intrastatales bajo un único denominador

**Investigación comparativa, no entrenamiento ni backtest.** AV-049 comprobó que las etiquetas antiguas difieren 218 veces de 25.1 country-level pero 96 de 25.1 conflict-level en el mismo conjunto fijo de 10.130 pares. De los 212 antiguos positivos cuando country-level es cero, 127 coinciden con conflict-level positivo y 85 no.

El codebook oficial [UCDP 25.1](https://ucdp.uu.se/downloads/onset/ucdp-codebook-onset-251.pdf) define además **Intrastate Country Level Multiple Onset**: al identificar nuevos conflictos usa historia de conflicto, mientras que al identificar reinicios toma la historia del conjunto del país. No es reducible sin más a la versión conflict-level ni a la versión country-level sencilla.

El auditor `research/psychohistory/onset_four_variant_semantics.py` recupera la URL exacta de esta tercera versión moderna **desde el catálogo oficial**, bajo la sección y la edición apropiadas; nunca inventa ni deriva la ruta de un archivo ficticio. Comprueba SHA-256 antiguo/country/conflict fijados en AV-049 y registra el digest de la cuarta fuente como **observación actual**, no como prueba de fecha histórica. La regla de comparación exige las mismas 10.130 claves GW-año conocidas; no admite eliminar países ni etiquetas para favorecer la concordancia.

Entrega ocho subconjuntos descriptivos nuevos: 16 firmas binarias del orden `old, modern country, modern conflict ANY, modern country multiple`, cambios de etiqueta respecto a old y una comparación para el grupo residual antiguo=1/country=0/conflict=0. Rechaza faltantes, duplicados country-level y alteraciones del índice en pruebas ficticias. Todo se computa en runner efímero, sin exponer identidades de países, probabilidades ni filas.

La coincidencia de etiquetas a través de ediciones no demuestra causa ni disponibilidad **as-of** en 2020. Cualquier skill de predicción requerirá roster independiente, versiones de training labels auténticas anteriores a la emisión y un único estimand preregistrado. Por diseño todos los indicadores de backtest, score, emisión y autenticidad temporal quedan en false. No se modifica el protocolo original AV-042, el experimento alternativo AV-046, ni la cohorte sombra 2027.

## Resultado empírico contrastado (19/10/2026)

La versión oficial 25.1 Country Level Multiple Onset procede del vínculo `https://ucdp.uu.se/downloads/onset/ucdp-intrastate-country-multiple-onset-251.csv`; su SHA-256 observado en el runner es `5fe7411942aa7e6a38d6386faa64f4d7f0703482509f121c4136c0e3223d7f05`, ahora fijado sin presentarlo como hash pre-origen 2020.

El archivo contiene **12.606 filas y 53 filas adicionales** respecto a claves GW-año únicas, como la versión 25.1 conflict-level. Se mantiene esa multiplicidad y se proyecta a indicador binario ANY únicamente para esta comparación.

**Resultado sobre los mismos 10.130 pares país-año de AV-049:**

| Comparación con indicador antiguo | Discordancias |
|---|---:|
| Moderno country-level | **218** |
| Moderno conflict-level, proyección ANY | **96** |
| Moderno country-level multiple, proyección ANY | **218** |

El indicador `onset1` de la variante moderna country-level multiple coincide **exactamente** con la country-level sencilla en este subconjunto histórico, aunque la multiplicidad de filas y la codificación de aparición de nuevas identidades de conflicto pueden diferir. Por tanto ninguno de los **85** casos antiguo=1, country=0, conflict=0 queda explicado al sustituir country por country-multiple: los 85 siguen codificados como cero. No generalizar esa coincidencia a todos los años, a `newconf` ni a otros horizontes `onset2/onset5`.

**Siguiente falsación:** comparar definiciones usando `newconf`, las reglas de activación y conflictos nuevos a nivel individual, con datos originales UCDP/PRIO de ambas fechas, y concentrar los 85 residuos en 1946–1988 (66) y 1989–2017 (19). El análisis sigue **retrospectivo descriptivo**, nunca un modelo con skill demostrado o una predicción fechada falsamente en 2020.
