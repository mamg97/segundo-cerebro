# PSICOHISTORIA — GED v0.6.6 · auditoría del historial incompleto y composición temporal

**Estado:** actualización metodológica y de código sobre v0.6.5. Los resultados de una nueva ejecución con datos oficiales **no se han reproducido ni archivado todavía** para esta revisión. No introducir nuevos scores en la UI ni sobres de predicción en Sheets hasta reproducir el código actual y registrar una salida create-only en Drive privado.

## Error identificado y corrección de contrato

La documentación v0.6.5 fijó de antemano que `history_incomplete` (roster incompleto o historial insuficientemente documentado) debía utilizar **la tasa global**. Sin embargo, la implementación anterior podía estimar una tasa propia de esa categoría a partir de cohortes incompletas. Esto es una **desviación metodológica**, no un ajuste de hiperparámetros.

Se corrige `probability_for_bucket` para devolver siempre la tasa global en `history_incomplete`. No se modifican las tres probabilidades originales del informe v0.6.3, las etiquetas GED, la muestra elegible, los hiperparámetros (20 pseudocasos), el corte informativo ni las ventanas de validación/test. **Sí pueden cambiar las probabilidades derivadas de recencia** de la categoría afectada: el ZIP empírico v0.6.5 debe conservarse inalterado como artefacto histórico y esta variante debe reproducirse con una nueva identidad y hash privado. No trasladar automáticamente resultados antiguos a esta implementación.

## Diagnóstico de composición con fechas no solapadas

El informe derivado agrega `by_recency_bucket` solamente para las fechas finales objetivo fijas de enero de 2016/2018 (validación) y de enero de 2020/2022/2024 (test). Para cada categoría calcula N, eventos, tasa observada, probabilidad media y métricas de los **mismos cuatro modelos** y etiquetas. Los grupos vacíos llevan `null`, no supuestos ceros.

Permite detectar si una aparente mejora es consecuencia de:
- Concentración de casos en una sola categoría histórica.
- Cambios de composición de la muestra entre validación y test.
- Una simple codificación de persistencia, frente a `country_history` y `country_shrinkage`.

No demuestra capacidad predictiva, ni transforma países en observaciones independientes: siguen existiendo solo **2 y 3 fechas objetivo no solapadas**, con correlación entre países. Queda prohibido seleccionar el modelo ganador o reajustar los tramos después de observar este diagnóstico.

## Baseline externo: VIEWS

**Resultado del examen de comparabilidad:** las predicciones de probabilidad de conflicto de VIEWS `fatalities003` tienen como target `>=25` muertes relacionadas con combate por país-mes (o >=1 para celdas PRIO-GRID); predice entre 1 y 36 meses. Nuestro GED v0.6.5 mide `>=1` incidente **GED exacto y letal** en los siguientes 24 meses, condicionado a 12 meses elegibles sin incidentes. **No son el mismo objetivo.** No cruzar directamente probabilidades ni Brier de ambos. Fuentes públicas de metodología: https://viewsforecasting.org/model/fatalities003/ y https://viewsforecasting.org/data/.

Una comparación futura exige preregistrar un **target compartido**, congelar el universo GW y la agregación temporal, verificar vintages de emisión y cubrir el mismo horizonte y observaciones. Como alternativa, usar forecasts archivados por fecha para un nuevo experimento estrictamente comparable.

## Reproducción privada exigida antes de promover esta revisión

1. Recuperar GED ZIP oficial, roster CSV y reporte original de reemergencia desde Drive privado. Verificar sus SHA-256 y la identidad de los artefactos; no confiar únicamente en el nombre.
2. Ejecutar comparador actualizado y pruebas; mantener las tres series anteriores y todas las etiquetas congeladas.
3. Recalcular por categoría y fecha no solapada, asegurar que `history_incomplete` usa exactamente `global_reemergence`. Comparar scores de recencia anterior y nueva **sin seleccionar la mejor**.
4. Guardar ZIP **nuevo**, manifiesto con SHA-256 de todas las entradas y salidas, commit de código, fecha real de cómputo y flags `source_as_of_verified=false`, `prospective_eligible=false`. No sobrescribir v0.6.5.
5. Solo tras verificación independiente de fuente y resultados, actualizar estado del experimento en el Sheet privado; la interfaz de Futuros permanece inalterada.

**Bloqueadores pendientes:** comparación externa con target idéntico, series vintage-correct y sello temporal externo verificable. Nunca etiquetar una fecha de fin del horizonte como fecha de emisión.
