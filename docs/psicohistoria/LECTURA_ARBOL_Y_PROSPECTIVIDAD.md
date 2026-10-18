# Psicohistoria — Estado predictivo y lectura del árbol (UI v0.5.12)

## Objeto del árbol Futures

Fuente canónica: UCDP OrganizedViolenceCY 26.1 (edición histórica revisada), serie anual de violencia organizada **estatal** agregada por país. La variable binaria de cada año es superar el umbral de **25 muertes estatales**; el estado del motor concatena el indicador de dos años consecutivos:
- 00: bajo umbral en ambos años.
- 01: entrada al umbral (bajo → alto).
- 10: salida del umbral (alto → bajo).
- 11: permanencia por encima del umbral (alto → alto).

Se utiliza el mismo estado ya definido por Futures Engine, no una nueva etiqueta. Por tanto, en cualquier año final **P(al menos 25 muertes) = P(estado 01) + P(estado 11)** y **P(menos de 25) = P(00) + P(10)**. Cuatro alternativas exhaustivas; las probabilidades son del **estado agregado país-año**, no de la probabilidad de una invasión, golpe, ataque o guerra nueva. Un estado 00 tampoco demuestra paz ni ausencia de otras violencias.

El grafo conserva la distinción entre **nodo = masa marginal que reúne muchas historias** y **línea = flujo entre nodos**, con masa total conservada, mientras el trayecto ámbar se obtiene de observaciones conocidas a posteriori y no es una predicción específica.

## Fechas y prospectividad

Si el origen retrospectivo es 2020, el corte admisible en el protocolo es 2018, 2019 es puente no observado y los años objetivo de un horizonte de tres años son 2020, 2021 y 2022. Las fuentes revisadas no prueban por sí mismas disponibilidad histórica as-of. La evaluación de su Brier/calibración es retrospectiva. El árbol no emite ni sella forecasts actuales.

La pregunta «¿cuándo habrá predicciones reales útiles?» tiene **dos hitos distintos**:
1. **Primera emisión prospectiva real (shadow forecast)**: solo después de seleccionar un target operacional, verificar una edición de datos existente **antes de la emisión**, versionar código/datos/baseline/protocolo de resolución, registrar probabilidad y obtener un recibo temporal independiente verificable. Un hash local o borrador no satisface por sí solo la puerta. No hay fecha de finalización anunciada ni emisión real confirmada.
2. **Evaluación de utilidad**: cuando finalice cada horizonte y una fuente independiente publique resultados, con una cohorte suficiente de predicciones congeladas y benchmarks comunes. Aun así, los resultados podrían demostrar *ausencia* de mejora. No es razonable prometer una capacidad predictiva antes de observar esta comparación.

Para llegar antes a evidencia evaluable se pueden desarrollar paralelamente objetivos con resolución más frecuente (p. ej. macroeconomía/mercados mensual o trimestral), sin reutilizar el target UCDP, sin mezclar datasets o métricas incompatibles y sin sacrificar licencia, privacidad, definiciones de datos o procedencia.

## Cambio UI v0.5.12

- Elegir el país UCDP **España (ID 230)** al montar la vista si está incluido en el catálogo privado. Si falta, usar la sugerencia válida del catálogo y, en último término, el primer país; no cambiar preferencias elegidas explícitamente por el usuario. Si cambia el origen, conservar el país actual cuando exista.
- Antes del árbol aparece la pregunta anual exacta, un desglose derivado de las cuatro probabilidades **ya emitidas por el motor** y la leyenda de cuatro códigos con interpretación comprensible.
- Las explicaciones no escriben datos ni cambian la matriz. Pruebas sintéticas de selección, normalización, probabilidades complementarias, fechas, semántica y escapado.
- UI v0.5.12 independiente de versiones científicas GED v0.6.9 y del Futures Engine v1. No se cambia `PsicoPredicciones`, Worker, UCDP ni coste.
