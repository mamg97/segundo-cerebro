# AV-099 — Fuente candidata de transformación tecnológica: BTOS

23/10/2026. Auditoría de fuente, calendario y definición del indicador. No hay modelo, pronóstico ni evaluación de habilidad.

## Originales y reloj observable

El [Census Bureau](https://www.census.gov/data/experimental-data-products/business-trends-and-outlook-survey.html) describe BTOS como encuesta quincenal de empresas empleadoras estadounidenses, con unas 1,2 millones de empresas repartidas en seis paneles y publicaciones cada dos semanas. El archivo oficial [National.xlsx](https://www.census.gov/hfp/btos/downloads/National.xlsx) se archivó **fuera de Git** junto con la [nota del cambio de redacción](https://www.census.gov/hfp/btos/downloads/AI%20Question%20Wording%20Updates.pdf), el [cuestionario público actual](https://www2.census.gov/data/experimental-data-products/business-trends-and-outlook-survey/questionnaire.pdf) y la [metodología versión 5](https://www2.census.gov/data/experimental-data-products/business-trends-and-outlook-survey/methodology.pdf). El manifiesto privado `source-archive/census-btos-ai-2026-10-23/MANIFEST.json` fija URL, hora UTC, bytes y SHA-256 de los cuatro originales. Son bytes **actuales**, no vintages originales de cada publicación.

`National.xlsx` contiene `Response Estimates`, `Response Standard Errors`, `Collection and Reference Dates` y diccionario. Para código `202621`, la hoja de fechas indica referencia **21/09–04/10/2026**, campo **05–18/10/2026** y publicación **22/10/2026**. La celda nacional `Question ID 7`, respuesta `Yes`, muestra **24,6 %** y error estándar publicado **0,27 puntos porcentuales**. Su par `Question ID 24`, respuesta `Yes`, expresa **expectativa** de uso en seis meses (**28,6 %**), no el uso futuro observado; no tratarlo como desenlace ni como habilidad de pronóstico. Las fechas del propio libro permiten preparar un reloj, pero todavía no prueban qué valores exactos estaban disponibles el día de cada publicación anterior.

## Rupturas de serie y metadatos

La nota oficial dice que desde el **17/11/2025** la pregunta pasó de uso de IA «para producir bienes o servicios» a uso «en cualquier función de la empresa». Census observó un salto de nivel y creó una **nueva serie** con datos publicados desde el **04/12/2025**. No empalmar la serie vieja con la nueva para entrenar o medir tendencia. La metodología actual documenta además una interrupción de campo en `202521–202523` por cierre federal; las celdas correspondientes del archivo son estructuralmente ausentes, no ceros.

Hay otra cautela de vintage: el libro actual rotula las preguntas con «Super Intelligence or SI (formerly ... AI)», y el PDF de cuestionario que enlaza la página oficial está marcado para **periodos 202702–202713**. La nota de diciembre de 2025 usa «Artificial Intelligence». Por ello el rótulo actual del XLSX **no demuestra** la redacción administrada en `202621` ni la fecha exacta de cualquier segundo cambio. Además, el cuestionario futuro numera la pregunta de expectativa como 28, mientras el libro actual la identifica como `Question ID 24`. Se necesita un instrumento fechado de cada cohorte y una tabla de mapeo por periodo antes de interpretar cambios entre olas.

## Pregunta prospectiva candidata

Una pregunta evaluable sería anticipar la proporción nacional `Yes` a uso actual de IA/SI en una **ola futura elegida antes del campo**, con universo, redacción administrada, categoría de no respuesta y versión de primera publicación fijados de antemano. Benchmark mínimo: persistencia de la última ola admisible disponible antes del corte. Usar la fecha real de publicación del resultado como verificación del desenlace, nunca la expectativa de seis meses del mismo cuestionario. La estimación de `202621` es solo un ejemplo de lectura de fuente, **no una predicción retroactiva**.

Estado: **fuente y reloj de ejemplo localizados; contrato as-of y comparabilidad bloqueados**. Falta conservar bytes originales de la primera publicación, fechar los instrumentos usados en 2026, delimitar la serie homogénea y fijar el protocolo prospectivo. No escribir `PsicoPredicciones` ni declarar skill.

**Avance posterior:** [AV-103](AV103_BTOS_LIVE_INSTRUMENT_DRIFT.md) conserva
el suplemento SI actual y verifica que el enlace del suplemento AI previo
devuelve 404. Los PDF actuales usan otra numeración que el libro; todavía no
hay mapeo por periodo administrado. `TEC-02` sigue PARCIAL/NO.
