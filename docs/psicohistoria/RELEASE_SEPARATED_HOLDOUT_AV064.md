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
