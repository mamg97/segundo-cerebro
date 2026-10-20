# PSICOHISTORIA — AV-054 · Auditoría de procedencia Onset 19.1 y categorías de conflicto

**Fecha de estudio: 20/10/2026.** Investigación de revisiones documentales; no es prueba de rendimiento predictivo.

## Falsación planteada

El [codebook Onset 19.1](https://ucdp.uu.se/downloads/onset/UCDP_Onset_Dataset_Codebook_19.1.pdf) describe un conjunto *monádico* de países-año 1946–2018 referido a los conflictos internos e internos internacionalizados UCDP/PRIO (tipos 3–4). En cambio, el enlace que en la actualidad identifica como 19.1 el [catálogo de versiones históricas UCDP](https://ucdp.uu.se/downloads/olddw.html) entrega `onsets_computed.csv`, SHA-256 observado en 2026 `ba54aeace175173b7643a2c14ba35ce89a2fcfd31712085e4fd13de656f752a8`, que contiene **10.203 filas para 10.142 claves GW-año y acaba en 2017**, con 61 filas adicionales. Por tanto no debe tratarse sin más como una copia auténtica e íntegra de la edición descrita.

Hay además un testigo académico externo de la discrepancia estructural: la documentación de `peacesciencer`, función `add_ucdp_onsets`, distingue unidad nominal país-año de datos con varios *episodios* país-díada-año, y cita casos de violencia extraestatal/interstatal como ejemplos de repetición ([fuente académica](https://rdrr.io/cran/peacesciencer/src/R/add_ucdp_onsets.R)). Ese comentario documenta una anomalía relevante, **pero no autentica la fecha de descarga de esos bytes ni demuestra la naturaleza de nuestros 51 casos**.

## Experimento implementado

`research/psychohistory/onset_provenance_types_av054.py` abre dentro del runner efímero los mismos cinco ficheros oficiales comprobados por SHA-256 en AV-047–AV-052: Onset antiguo, Onset 25.1 intrastatal country/conflict y UCDP/PRIO ACD 19.1/25.1. La muestra y la regla de selección están bloqueadas por las cifras originales: **10.130 GW-año comparables**, **218** discordancias antiguo-country, **96** antiguo-conflict, **85** casos antiguo=1/moderno=0 en ambas variantes y **61** de ellos con `newconf=1` antiguo.

Para esos 61 registros se contabiliza en las ediciones ACD la presencia **por código `gwno_loc` y año** de las cuatro categorías declaradas por UCDP:
- Tipo 1: **extraestatal**.
- Tipo 2: **interestatal**.
- Tipo 3: **interno**.
- Tipo 4: **interno internacionalizado**.

El auditor diferencia un registro exclusivamente no interno, exclusivamente interno, mixto o sin clave codificada en la versión examinada; no convierte una `gwno_loc` irresoluble o una ausencia de filas en evidencia de ausencia histórica de violencia. Se calcula el cruce agregado entre ACD 19.1 y 25.1, la división antes/después de 1989 y el subconjunto fijo de **51 sin correspondencia interna en ambas**. No publica IDs, nombres de países, actores, díadas, eventos ni filas.

`test_onset_provenance_types_av054.py` y `.github/workflows/psychohistory-onset-provenance-types.yml` someten la clasificación a casos ficticios, duplicados, categorías mezcladas, fechas fuera de edición, fallos SHA y un universo falsificado. Sin cron, infraestructura de pago, modificación de Workers, Sheets privados o modelos.

## Interpretación y barreras

La aparición de actividad extraestatal o interestatal en una combinación GW-año antigua sería **evidencia de coincidencia en una categoría diferente**, no prueba de que el indicador antiguo se construyera con ese conflicto concreto. Tampoco una coincidencia `gwno_loc` prueba que se trate de un conflicto del mismo gobierno ni demuestra linaje entre versiones. El codebook es una especificación; el CSV actualmente servido es un artefacto cuya equivalencia con ella sigue sin certificar.

Se mantienen invariablemente: `asof_source_bytes_pre2020_verified=false`, `model_training_authorised=false`, `backtest_authorised=false`, `forecast_issued=false`. No se imputan ceros ni se genera un Brier. La cohorte de pronósticos privados sombra 2027 permanece sin alterar.

**Siguiente decisión empírica:** si existe discrepancia entre definición del manual y cobertura / categorías observadas del archivo, identificar el origen verificable del CSV realmente publicable en 2019 o 2020 y su fecha independiente; sin eso bloquearlo como fuente histórica entrenable. `MAD-02` permanece `PARCIAL`.

## Resultado real con fuentes oficiales y hashes conservados

El job de [GitHub Actions de la PR #698](https://github.com/mamg97/segundo-cerebro/pull/698) ha descargado y verificado nuevamente los cinco archivos UCDP oficiales con los mismos SHA-256 observados en 2026. Se conserva la muestra **10.130 GW-año**, los **85** residuos y el subconjunto de **61** antiguos `newconf=1`.

**Clasificación reproducida en ambas ediciones UCDP/PRIO ACD, siempre por coincidencia `(gwno_loc, año)`:**

| Clasificación de conflicto en esos 61 casos | ACD 19.1 | ACD 25.1 |
|---|---:|---:|
| Actividad exclusivamente no interna (tipos 1/2) | **38** | **38** |
| Actividad interna + no interna (alguno de tipos 3/4 y 1/2) | **10** | **10** |
| Solo actividad interna | **0** | **0** |
| No coincide con clave GW-año de ACD | **13** | **13** |

Dentro de los **38** exclusivamente no internos, **37** presentan tipo **2 interestatal** y **uno** tipo **1 extraestatal** en ambas ediciones. Los **13** sin correspondencia ACD son **todos anteriores a 1989**. De los 10 casos mixtos, seis son anteriores a 1989 y cuatro corresponden a 1989–2017. Entre los 38 no internos exclusivos, 32 son anteriores a 1989 y seis posteriores. No existen errores de parsing de ubicación `gwno_loc` en los CSV analizados.

El resultado de AV-052 (**10 con al menos una actividad interna en ambas ediciones y 51 sin interna en ninguna**) sigue siendo **exactamente correcto**: 51 se descompone ahora en **38 con otra clase de conflicto identificada** y **13 sin ninguna coincidencia**.

La fuente antigua que figura bajo Onset 19.1 confirma por bytes observados (SHA `ba54aeace175173b7643a2c14ba35ce89a2fcfd31712085e4fd13de656f752a8`): 10.203 filas, 10.142 claves país-año, 61 filas duplicadas sin etiquetas `onset1` contradictorias, cobertura **1946–2017**, **ninguna observación 2018**. Esto contradice estructuralmente dos afirmaciones del [codebook Onset 19.1](https://ucdp.uu.se/downloads/onset/UCDP_Onset_Dataset_Codebook_19.1.pdf): monadicidad por país-año y finalización en 2018.

**Interpretación epistemológica:** en 48/61 GW-año hay al menos alguna actividad no intrastatal según ACD; para **38** no se identifica ninguna interna. Esta concordancia es compatible con que el Onset antiguo contenga episodios de otra unidad de análisis o que el archivo servido se haya etiquetado con una versión que no le corresponde. **No es una demostración de que los 38 `newconf` antiguos provinieran exactamente de esos 38 conflictos interestatales/extraestatales**: se requiere un ID de episodio/identidad de conflicto trazable, no presente en la tabla usada para unir los ficheros. Los trece restantes y los diez mixtos continúan sin diagnóstico causal cerrado.

**Decisión técnica:** etiquetar el Onset antiguo como `INCOMPATIBLE_UNVERIFIED_VINTAGE` para modelar onset intrastatal 25.1 y bloquear su utilización como etiquetas de training históricas, hasta conseguir un archivo original completo con procedencia y fecha, y homologar la definición de target. Este avance valida la auditoría diagnóstica, no la madurez científica del forecasting.

El job solo muestra categorías y estadísticos agregados; la identidad de países, eventos y conflictos no sale a los logs ni al repositorio. `MAD-02=PARCIAL`; sin Brier, scores, emisiones o coste adicional.
