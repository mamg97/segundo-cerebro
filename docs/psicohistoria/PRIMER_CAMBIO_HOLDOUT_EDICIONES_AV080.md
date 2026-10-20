# PSICOHISTORIA · AV-080 — Primera transición de dos años, versiones UCDP separadas

**20/10/2026 · V2/V4 · ESTADO: HOLDOUT SEPARADO POR EDICIÓN RETROSPECTIVO, NO PROSPECTIVO.**

## Motivación

Las cohortes AV-076/077/078 mezclaban, dentro de una única edición revisada 26.1, valores históricos que fueron corregidos después del origen. El archivo de UCDP sí contiene ediciones antiguas del **mismo producto estadístico** [OrganizedViolenceCY 24.1 y 25.1](https://ucdp.uu.se/downloads/olddw.html). Aprovechamos el experimento existente `research/psychohistory/release_separated_holdout.py` y ampliamos la evaluación de objetivo anual a **primer cruce del umbral de 25 muertes estatales**, sin recalibrar después del resultado.

## Diseño: origen hipotético 1 enero 2025

| Etapa | Fuente | Uso |
| --- | --- | --- |
| Entrenamiento y universo de países | OrganizedViolenceCY **24.1** (datos hasta 2023) | Construir frecuencias, Markov, memoria2, shrinkage y último estado conocido al corte 2023. Solo si hay los cinco años de historia completos definidos en el motor original. |
| Año puente **2024** | **No observado para el ajuste**; etiquetas solo de 26.1 al evaluar | Posible **primer** cambio; se integra su probabilidad sin condicionar predictores. |
| Objetivo **2025** | OrganizedViolenceCY **26.1** | Segundo año de observación posterior; si 2024 cambió, no volver a contar 2025 como primer cambio. |
| Tercer desenlace | No cruce del umbral en 2024 ni 2025 | Categoría explícita, no valor desconocido. Si falta la etiqueta 2024 o 2025, el país se excluye de la puntuación; nunca se imputa como 0. |

La etiqueta binaria procede de `sb_total_deaths_best >= 25` (estado actual; no agregados de violencia unilateral o no estatal). La matriz se construye **solo** mediante `futures.prepare` + `futures.fit(...,origin=2025)` sobre la edición 24.1, usando el `futures_protocol.json` fijado. `futures.matrix_for` genera los cinco kernels ya existentes, sin cambios de pesos. La masa se absorbe al primer cruce: `P(2024)`, `P(primera vez en 2025)` y `P(ningún cambio hasta 2025)` suman 1.

**Métricas:** Brier multicategoría del primer evento y log loss con clipping `1e-12` únicamente para estabilidad numérica (se cuenta cada resultado al que el modelo asignó 0). Los países elegibles proceden exclusivamente de 24.1, **no del panel final 26.1**. La revisión de etiqueta de 2023 en 26.1 se calcula aparte como indicador de drift, y nunca modifica el ajuste.

**Fuentes oficiales originales (observadas ahora):**
- 24.1: `https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy-241-csv.zip` · SHA-256 archivado `00410bdb65023d1bc8799f47f188677965046bb73447ee33094782db30076260`.
- 26.1: `https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy-261-csv.zip` · SHA-256 archivado `66910888f5653af42776d2debc1d72fe527559e7f7fc82e69b7c8771467f2d34`.

Los checksums demuestran **integridad del contenido descargado respecto a una observación previa**, pero **no acreditan independientemente** que esos bytes estuvieron accesibles el 1 de enero de 2025. El experimento sirve como holdout retrospectivo separado por edición, no como pronóstico genuino emitido antes de 2024/2025.

## Reproducibilidad y validación de filtraciones

Código: `research/psychohistory/release_separated_first_passage.py`. Tests: `test_release_separated_first_passage.py`. El workflow ya existente `.github/workflows/psychohistory-frozen-vintage-holdout.yml` descarga ambos archivos oficiales, verifica los SHA-256, ejecuta el experimento y borra los archivos del runner. Nunca se publican datos país a país, parámetros individuales ni predicciones por entidad; solo métricas agregadas.

Se incluyen pruebas que comprueban (a) conservación de probabilidades, (b) ausencia de cambios en entrenamiento y métricas al alterar exclusivamente las **revisiones 2023** de 26.1, (c) sensibilidad de las métricas —pero no del entrenamiento— al cambiar etiquetas 2024/25, (d) exclusión de datos faltantes en 2024/25, (e) rechazo de ZIP no pinneados y (f) ausencia de datos de países en la salida.

## Interpretación y limitaciones

- Muestra de **un solo origen y una ventana de dos años**, no una serie de pronósticos independientes ni capacidad generalizada. Las métricas dependen de la revisión de UCDP 26.1.
- El resultado histórico de 2024 es un año puente **no observado para el modelo**; no confundir con que 2024 fuese realmente futuro cuando hoy se ejecuta el backtest.
- Sin prueba independiente de fecha de publicación exacta de 24.1, no se autoriza el etiquetado `ASOF_VERIFIED`, ni emisión 2025, ni selección automática de campeón.
- Priorizar un siguiente corte y fuente independientes (p. ej. 23.1→25.1 con formato y codebook verificados), horizonte distinto y evaluación sellada antes de extraer conclusiones.
- No alterar `PsicoPredicciones`, fuentes canónicas 26.1, inversiones, aplicaciones de pago ni el estado de 2027 `SHADOW_NO_EMITIDO`.

**Resultados reales:** solo se añadirán cuando el workflow pinneado termine y puedan auditarse sus salidas; nunca se rellenarán cifras supuestas.
