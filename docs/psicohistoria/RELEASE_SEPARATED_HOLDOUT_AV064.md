# PSICOHISTORIA — AV-064 · Aislamiento real entre entrenamiento y outcomes

**20/10/2026 — preregistro anterior a evaluación del holdout.** No se ha visto un solo score 2025 de este experimento.

## Pregunta concreta

¿Las seis familias de `benchmark.py`, con los hiperparámetros ya fijados, muestran alguna mejora frente a `frequency` si el entrenamiento y TODAS las features proceden de **UCDP OrganizedViolenceCY 24.1 (hasta 2023)** y los desenlaces de **2025** solo se leen de **26.1 (2026)**? No se usarán labels ni revisiones 26.1 en entrenamiento, normalización o selección de hiperparámetros. Se excluye cualquier cambio a los seis modelos para favorecer 2025.

El codebook oficial 24.1 está fechado en 2024 y la URL oficial figura en el índice histórico; su presencia hoy NO autentica los bytes que circularon en 2024. La edición 26.1 no estaba disponible en 2025. Este diseño es **holdout entre releases observado retrospectivamente**, no predicción de 2025 emitida en 2024, ni inferencia causal.

## Protocolo cerrado antes de ver métricas

- Target único: `sb_total_deaths_best >= 25` en país-año 2025. No nuevo inicio ni onset. Política del experimento principal V2 conservada.
- Cohorte: países en 2023 de 24.1, con histórico 2019–2023 completo. Si no existe un desenlace 2025 26.1, la unidad es `NO_EVALUABLE`, jamás cero. Sin países nuevos añadidos a partir de la fuente futura.
- Features: último estado 2023, prevalencia cinco años, log fatalities 2023 en tres clases. `benchmark.panel/predict_origin` entrena con etiquetas de 24.1 hasta 2023 y ningún dato posterior.
- Seis modelos registrados: `frequency, persistence, markov, v1_memory_index, v2_logistic, interaction_table` con hiperparámetros originales. **No seleccionar mejor modelo en función de este mismo test**.
- Métricas: Brier, Brier Skill respecto al mismo `frequency`, log loss, AP (solo si hay positivos) calculadas sobre idéntico conjunto de países. Informe de exclusiones y revisiones de etiqueta 2023 entre versiones. Un único año no permite bootstrap por bloques temporales ni claim generalizable.
- Si `v2_logistic` no mejora el baseline, el experimento demuestra ausencia de valor incremental EN ESTA MUESTRA, no invalida universalmente forecasting. Si lo mejora, no permite declararlo validado. En ambos casos exigir años y ediciones independientes + prospectividad real.

## Seguridad de la investigación

`release_separated_holdout.py` acepta ZIPs oficiales con SHA256 exacto y rechaza versiones/fechas, orígenes y formatos alterados. El informe stdout solo contiene métricas y agregados, sin filas, identificadores ni países individuales. Sin modificar Sábana 2027, `PsicoPredicciones`, MIDAS, interfaz o Worker. ZIP/CSV efímeros de GitHub Actions, eliminados tras job. La fase inicial **solo obtiene hash de 24.1 hoy**, no puntúa ni interpreta skill. En una PR posterior fijar SHA24 observado, activar scoring y estudiar resultados honestamente. Cero nuevos cron/servicios/costes.

## Límites irreductibles

No hay testigo histórico independiente de los bytes 24.1. El fichero oficial actualizado en 2026 podría no ser idéntico al original de 2024. Puede haber cambios de codificación territorial entre ediciones y los países no son independientes. Si faltan campos en 24.1, no fabricar features ni scores: devolver error y evaluar otro diseño. El experimento sigue subordinado al sello 2027 y la reconstrucción temporal del núcleo científico.

## Antes del primer score (procedencia del pin)

- Las reglas de cohortes y seis modelos quedaron en PR #720 con commit `aaaf021bc1dc921255b9a1872945d9fc910133dc`, **antes** de observar el rendimiento de 2025.
- [GitHub Actions #39452503769](https://github.com/mamg97/segundo-cerebro/actions/runs/39452503769) descargó los ZIP oficiales y observó por primera vez su SHA-256 actual: 24.1 `00410bdb65023d1bc8799f47f188677965046bb73447ee33094782db30076260`, 26.1 `66910888f5653af42776d2debc1d72fe527559e7f7fc82e69b7c8771467f2d34` (ya registrado previamente). En ese job **no se ejecutó evaluación de etiquetas 2025**, solamente descarga y hash.
- La siguiente ejecución habilita el **primer score** con esos hashes obligatorios. El pin es una observación hecha en 2026, **no demuestra existencia de esos bytes en 2024**.


## Primer resultado EMPÍRICO observado (20/10/2026)

[GitHub Actions #39453143638](https://github.com/mamg97/segundo-cerebro/actions/runs/39453143638) ejecutó con **datos oficiales**, ZIPs comparados contra los SHA observados antes del scoring, adaptador de columnas de edición 24.1 limitado a alias exactos `_cy` y `Version` opcional sin rellenar features. Pruebas adversariales sintéticas, guard de privacidad y suite completa del núcleo: SUCCESS. Resultado con etiquetas 2025 de 26.1 que nunca entran en entrenamiento:

| Modelo ya fijado | Brier 2025 ↓ | Brier Skill vs frecuencia |
| --- | ---: | ---: |
| Frequency | 0.14385283 | 0.000000 |
| Persistence (estado 2023) | 0.04081633 | 0.716263 |
| Markov | 0.03909019 | 0.728263 |
| V1 memory index | 0.04750615 | 0.669759 |
| V2 logistic | 0.03674327 | 0.744577 |
| Interaction table | 0.03632530 | 0.747483 |

- Cohorte **196 países**, **34 positivos** (2025), sin desenlaces faltantes, 0 exclusiones por histórico entre los países 2023; train panel **5.556** observaciones históricas elegibles (24.1 hasta 2023). 196 países tenían su etiqueta 2023 presente en 24.1 y 26.1 y **0 cruzaron el umbral 25** entre ambas ediciones. Esto no significa ausencia de revisiones de las muertes numéricas.
- V2 mejora ~**74,46 %** el Brier respecto al baseline de frecuencia, ~**9,98 %** respecto a persistencia y ~**6,00 %** respecto a Markov; pierde ~**1,15 % relativo** en Brier frente a `interaction_table`. En log loss V2 (0.138745) aventaja marginalmente a `interaction_table` (0.139018), sin introducir selección posterior de ganador.
- **Interpretación prudente:** la mayor parte del beneficio refleja persistencia de violencia estatal. Un solo año no permite cuantificar estabilidad temporal ni extrapolar a onset o reacciones bursátiles. El éxito comparado con frecuencia NO es éxito frente a todos los comparadores fuertes. Las revisiones de la edición antigua, la codificación territorial y el testigo de bytes anterior a 2025 siguen sin verificar. `retrospective_single_target_year_not_confirmatory`, `prospective_skill_demonstrated=false`.
- **Acción científica siguiente:** replicar el diseño con ediciones fuente anteriores y años completos distintos. **24.1 → 2025 fue un experimento único**: repetirlo, inspeccionar regiones o ajustar pesos en ese mismo 2025 no convertiría un resultado exploratorio en confirmatorio. Mantener 2027 como evaluación genuinamente prospectiva condicionada al sello externo y sin cambiar sus seis modelos.

La fuente oficial histórica es [UCDP Historical Versions](https://ucdp.uu.se/downloads/olddw.html) y el [codebook 24.1](https://ucdp.uu.se/downloads/organizedviolencecy/UCDP_OrganizedViolenceCY_Codebook_241.pdf). Se reutiliza el protocolo de seis modelos de `benchmark.py`; **no** se ha calculado rentabilidad bursátil.
