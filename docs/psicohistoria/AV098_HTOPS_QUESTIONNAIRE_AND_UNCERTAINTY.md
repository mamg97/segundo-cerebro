# AV-098 — HTOPS: pregunta de soledad e incertidumbre

23/10/2026. Continuación de [AV-094](AV094_HTOPS_SOCIAL_SOURCE_FEASIBILITY.md). Auditoría de admisibilidad de fuente; no es una predicción ni un backtest.

## Originales y comprobación

Se archivaron fuera de Git los cuestionarios oficiales de [marzo](https://www2.census.gov/programs-surveys/demo/technical-documentation/hhp/HTOPS_2603_Questionnaire_ENGLISH.pdf) y [julio](https://www2.census.gov/programs-surveys/demo/technical-documentation/hhp/HTOPS_2607_Questionnaire_ENGLISH.pdf), sus declaraciones de [fuente y exactitud de marzo](https://www2.census.gov/programs-surveys/demo/technical-documentation/hhp/HTOPS_2603_Source_and_Accuracy.pdf) y [julio](https://www2.census.gov/programs-surveys/demo/technical-documentation/hhp/HTOPS_2607_Source_and_Accuracy.pdf), las medidas de calidad y las tablas oficiales de error estándar 3a. El manifiesto privado `source-archive/census-htops-social-2026-10-22/MANIFEST.json` registra URL, captura y SHA-256 de cada original. Son versiones observadas ahora; **no reconstruyen lo disponible en la primera publicación**.

En ambos cuestionarios, `SOC2_first` pregunta «How often do you feel lonely?» con las mismas cinco opciones ordenadas: `Always`, `Usually`, `Sometimes`, `Rarely`, `Never`. No hay periodo retrospectivo explícito en la pregunta. La diferencia de categorías en las tablas públicas es de **presentación/recodificación**: marzo publica las cinco por separado y julio agrega `Always or Usually` y `Rarely or Never`. La [nota de julio](https://www2.census.gov/programs-surveys/demo/technical-documentation/hhp/2607_HTOPS_Household_Pulse_User_Notes_09102026.pdf) avisa expresamente de variables recodificadas para evitar divulgación. La identidad de la pregunta permite proponer una definición común a nivel nacional; no prueba por sí sola comparabilidad plena de estimaciones ni continuidad futura del ítem.

## Lectura de incertidumbre de las tablas actuales

Las dos olas de 2026 son muestras transversales independientes. La tasa nacional de respuesta sin ponderar fue **9,2 % en marzo** y **9,4 % en julio**; la ponderada, **10,4 % en ambas**, según las declaraciones oficiales. El riesgo de sesgo por falta de respuesta no está contenido en el error estándar. Census usa 80 pesos replicados y replicación por diferencias sucesivas para estimar varianzas.

En julio, la tabla nacional 3a informa **22.640.959** adultos en `Always or Usually` de **261.534.494**, esto es **8,657 %** usando el total publicado como denominador. Su tabla 3a de errores estándar da **3.186.541,525 personas** para esa celda, equivalente a **1,218 puntos porcentuales** si se divide por el mismo total. Un intervalo ilustrativo de muestreo del 90 % con 1,645 errores estándar sería **6,653–10,661 %**. Este cálculo trata el control poblacional publicado como fijo y omite sesgo sistemático, revisiones y cualquier covarianza no publicada; no debe confundirse con cobertura total de incertidumbre.

En marzo, sumar `Always` y `Usually` da **14.595.581 / 261.534.494 = 5,581 %**, pero la tabla de errores estándar solo publica cada componente (820.443,631 y 1.750.602,899 personas). **No se obtiene el error estándar del agregado sumando esos dos errores**: falta su covarianza o calcularlo con los 80 pesos replicados del microdato. Tampoco se declara que la diferencia entre marzo y julio represente un cambio real: marzo/mayo sufrieron una corrección de ponderaciones, julio cambió la presentación y la incertidumbre no muestral sigue abierta.

Las tablas de «Data Quality Measures» archivadas describen recuentos de muestra, tasas de respuesta y cobertura por región/área; **no sustituyen** a las tablas 3a de errores estándar del indicador.

## Contrato candidato y bloqueos

Target candidato: porcentaje nacional de adultos de 18 años o más con respuesta `Always` o `Usually` en `SOC2_first`, sobre el **total adulto publicado**, incluyendo la no respuesta en el denominador. Si la siguiente tabla elimina o altera esa pregunta, no se emite. Un benchmark preliminar sería persistencia de la última ola admisible publicada antes de la fecha de corte. Para una evaluación prospectiva hacen falta aún: fijar la ola futura y la fecha de corte anterior al campo, conservar la primera publicación y todas sus revisiones con fechas verificables, decidir cómo se puntúa una revisión, y calcular la varianza del agregado histórico desde pesos replicados o una tabla agregada oficial. El intervalo ilustrativo de julio no valida habilidad predictiva.

Estado: **pregunta y error estándar de julio verificados; admisión prospectiva bloqueada**. No escribir `PsicoPredicciones`, no entrenar con los bytes actuales como si fueran vintages originales y no abrir un gate científico como completado.
