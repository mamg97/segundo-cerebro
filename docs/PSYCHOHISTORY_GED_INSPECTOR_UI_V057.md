# PSICOHISTORIA — Laboratorio privado v0.5.7 · Inspector GED de reapariciones

**Estado:** interfaz implementada, con muestra privada retrospectiva limitada; no es una publicación científica independiente ni una predicción prospectiva.

## Qué añade
- La red probabilística anual de Futuros sigue siendo la primera sección de la página.
- Debajo del contexto Onset se consulta `psychohistory.ged.incident_preview_batch.v1` desde el **Sheet privado canónico PsicoExperimentos** a través de `GET /api/research-lab`. No se crean rutas, almacenamiento ni APIs de pago.
- Filtro por país y año y detalle por incidente, con GED ID, fecha exacta, localidad, díada, actores codificados, best/low/high, precisión espacial y enlace a informe original.
- Las cuatro probabilidades son de **una ventana binaria de 24 meses** que contenía el incidente, elegida como contexto; nunca de que ocurriera ese incidente particular ni de una guerra/invasión en esa fecha.

## Evidencia y cobertura
El informe privado v0.6.8 conserva 74 incidentes GED únicos y 944 vínculos positivos país-horizonte. **La primera vista publicada es intencionadamente parcial:** 12 incidentes, con 205 vínculos positivos. Se seleccionaron fechas repartidas a lo largo del archivo, exclusivamente para validar navegación y comprensión del usuario; esta selección editorial NO sirve para comparar modelos ni calcular skill, y puede sobrerrepresentar casos repetidos por ventanas solapadas.

La información procedente del archivo completo permanece en Drive privado con manifiesto y SHA256. Los tres lotes de previsualización están en `SEGUNDO CEREBRO - PROYECTOS / PsicoExperimentos`. Su contenido se valida contra recuentos, edición GED, cuatro probabilidades originales, fechas de corte y horizonte, totalidad de lotes, unicidad de GED ID y fuente privada. Falta un compromiso criptográfico público independiente para los registros de Sheet (ningún SHA solo bajo control del mismo operador constituye TSA).

## Contrato de seguridad
`app/research-ged-reemergence.mjs` rechaza *en bloque* registros incompletos, alterados, sin flags retrospectivos, con ventanas incoherentes, IDs duplicados, probabilidades imposibles o evidencia no aprobada. El renderizado escapa texto de GED antes de inyectarlo en el DOM.

- `sourceAvailabilityVerified=false`, `asOfVerified=false`, `prospectiveEligible=false`, `eventSpecificForecast=false`.
- Un GED puede corresponder a violencia en un país diferente del país representado por el actor estatal, y no implica un onset/cambio de régimen.
- La fecha `issueMonth` es **hipotética**; `targetEndMonth` es el final de la ventana observada. No confundirlas.
- La UI no muestra probabilidades inventadas cuando falla el registro privado.
- No se ha añadido un modelo, ni modificado probabilidades, ni se han tocado `PsicoPredicciones`.

## Próximo paso
Completar los 74 registros o publicar una paginación selectiva dentro de un canal privado ya existente, mejorar la relación navegable entre el grafo anual y las etiquetas exactas **sin equiparar sus variables objetivo**, e implementar posterior control independiente de disponibilidad `as-of`.
