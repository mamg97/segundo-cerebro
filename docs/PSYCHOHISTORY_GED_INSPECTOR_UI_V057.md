# PSICOHISTORIA — Laboratorio privado v0.5.8 · Inspector GED de reapariciones

**Estado actualizado 17/10/2026:** interfaz v0.5.8 implementada con los 74 incidentes únicos y 944 enlaces del casebook retrospectivo. No es una publicación científica prospectiva.

## Qué añade
- La red probabilística anual de Futuros sigue siendo la primera sección de la página.
- Debajo del contexto Onset se consulta `psychohistory.ged.incident_preview_batch.v1` desde el **Sheet privado canónico PsicoExperimentos** a través de `GET /api/research-lab`. No se crean rutas, almacenamiento ni APIs de pago.
- Filtro por país y año y detalle por incidente, con GED ID, fecha exacta, localidad, díada, actores codificados, best/low/high, precisión espacial y enlace a informe original.
- Las cuatro probabilidades son de **una ventana binaria de 24 meses** que contenía el incidente, elegida como contexto; nunca de que ocurriera ese incidente particular ni de una guerra/invasión en esa fecha.

## Evidencia y cobertura
El informe privado v0.6.8 conserva 74 incidentes GED únicos y 944 vínculos positivos país-horizonte. **Cobertura completa del casebook:** se sustituyó la muestra editorial inicial de 12 incidentes y 205 vínculos por los 74 incidentes y 944 vínculos presentes en el archivo v0.6.8, sin modificar las probabilidades archivadas ni los incidentes originales. La muestra inicial no fue una validación científica y las ventanas siguen siendo dependientes por solapamiento.

La información procedente del archivo completo permanece en Drive privado con manifiesto y SHA256. Los **cuatro lotes** del inspector están en `SEGUNDO CEREBRO - PROYECTOS / PsicoExperimentos`, filas `A46:L49`, con 20, 20, 20 y 14 incidentes únicos y recuentos por horizonte que suman 944. Su contenido se valida contra recuentos, edición GED, cuatro probabilidades originales, fechas de corte y horizonte, totalidad de lotes, unicidad de GED ID y fuente privada. Falta un compromiso criptográfico público independiente para los registros de Sheet (ningún SHA solo bajo control del mismo operador constituye TSA).

## Contrato de seguridad
`app/research-ged-reemergence.mjs` rechaza *en bloque* registros incompletos, alterados, sin flags retrospectivos, con ventanas incoherentes, IDs duplicados, probabilidades imposibles o evidencia no aprobada. El renderizado escapa texto de GED antes de inyectarlo en el DOM.

- `sourceAvailabilityVerified=false`, `asOfVerified=false`, `prospectiveEligible=false`, `eventSpecificForecast=false`.
- Un GED puede corresponder a violencia en un país diferente del país representado por el actor estatal, y no implica un onset/cambio de régimen.
- La fecha `issueMonth` es **hipotética**; `targetEndMonth` es el final de la ventana observada. No confundirlas.
- La UI no muestra probabilidades inventadas cuando falla el registro privado.
- No se ha añadido un modelo, ni modificado probabilidades, ni se han tocado `PsicoPredicciones`.

## Próximo paso
Verificar despliegue de v0.5.8 y lectura autenticada de los cuatro lotes desde el Worker; después mejorar la conexión entre grafo anual y etiquetas GED **sin equiparar sus variables objetivo**, establecer sellado temporal independiente y fuentes vintage-correct.
