# PSICOHISTORIA — AV-055 · Observatorio 2027 consultable desde móvil

**20/10/2026 · Producto privado experimental, NO pronóstico emitido.**

## Entrega real

A partir del observatorio HTML privado del 18/10/2026 se construyó una hoja nativa de Google Sheets **privada**, almacenada dentro de la carpeta privada de experimentos PSICOHISTORIA. El vínculo exacto permanece exclusivamente en el índice canónico privado `PsicoExperimentos`; no publicar enlaces identificadores ni valores país en GitHub.

La hoja contiene:
- **196 países**, la misma ordenación preregistrada por `v2_logistic` y las seis familias de modelos sin reentrenar.
- **1.176 valores probabilísticos**: `v2_logistic`, `frequency`, `interaction_table`, `v1_memory_index`, `markov`, `persistence`.
- Comparación `(v2_logistic-frequency)*100` en puntos porcentuales y desacuerdo `abs(v2_logistic-interaction_table)*100`, ambos sin confundirlos con intervalos de confianza.
- Pestaña con filtros y cabeceras congeladas; pestaña `Guía y límites` con definición, origen, horizontes, advertencias y calendario de evaluación.
- Confirmación desde Drive: archivo `shared=false`, 197 filas con cabecera, **196 nombres únicos**; los valores no se escribieron en GitHub ni en `PsicoPredicciones`.

La fuente sigue siendo el conjunto canónico privado de candidatas sombra: ZIP oficial UCDP OrganizedViolenceCY 26.1 observado en octubre 2026, fecha máxima de datos de entrada **2025**, outcome 2027 por país igual a `sb_total_deaths_best>=25`; ninguna observación de 2026 o 2027 entra en las features. No significa "probabilidad de guerra nueva", golpe de Estado, estallido de protesta o enfrentamiento concreto.

## Comprobación técnica

Se añade `research/psychohistory/shadow_observatory_2027_integrity.py`, auditor **offline** de HTML privado que parsea JSON embebido sin ejecutar JavaScript. Comprueba cardinalidad de la cohorte, seis probabilidades [0,1] por país, unicidad de IDs/nombres, ranking ordenado, delta de baseline y desacuerdo en puntos porcentuales (con tolerancia de redondeo), disclaimers y `issued=false`. Solo imprime estadísticos globales; no imprime países, probabilidades ni contenido privado. El CI de GitHub utiliza **solo fixtures inventados** y jamás consume la hoja privada.

Lectura independiente de los bytes reales originales desde Google Drive, antes de crear la hoja: 196 IDs únicos, seis valores por país finitos en rango válido, ranking consecutivo y descendente, cálculos derivados acordes (error máximo 0,005 puntos), **33 países con `p(v2)>=0,5`** y **uno** con `|p(v2)-p(interacciones)|>=20 puntos`. Estos dos recuentos son descripciones ilustrativas, **NO calibración, skill ni alertas**.

## Calendario honesto de utilidad

| Hito | Momento | Tipo de evidencia |
| --- | --- | --- |
| Consulta privada móvil del ranking relativo 2027 | **Disponible en octubre 2026** | Exploratoria, no validada |
| Emisión prospectiva válida de cohorte 2027 | **Debe realizarse antes de empezar 2027** y requiere cadena externa de timestamp, disponibilidad fuente y registro inmutable | Pendiente; no se concede por generar una tabla |
| Primer resultado anual oficial completo 2027 | **Esperable durante 2028**, sujeto al calendario y versión real que publique UCDP | Solo entonces Brier/skill prospectivos |
| Predicción propia de nuevos conflictos 30–90 días | **Sin fecha científica acreditada** | Requiere nuevas etiquetas mensuales fechadas, universo completo, baseline, test prequential y comparación externa |

La mejora histórica de Brier de la regresión logística para **presencia** puede reflejar persistencia; para **nuevos episodios**, la mejora fue mínima. No convertir el ranking presente en recomendaciones de viaje, seguridad o inversión. Un observatorio accesible es un resultado de producto, no una nueva evidencia de poder anticipar eventos desconocidos.

**MAD-02 permanece PARCIAL**, cohortes privadas 2027 intactas, `PsicoPredicciones` sin emisiones, 0 € de infraestructura nueva. La siguiente prioridad es congelar el experimento prospectivo con tercero confiable y avanzar un modelo separado para nuevas apariciones mensuales, sin confundirlo con la investigación de fuentes UCDP Onset 19.1.
