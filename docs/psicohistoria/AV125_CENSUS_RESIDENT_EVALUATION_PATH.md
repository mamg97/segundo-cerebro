# AV-125 · Ruta demográfica con universo residente coherente

24/10/2026. Auditoría de fuentes y diseño candidato, sin calcular errores de proyección ni emitir forecast.

## Obstáculo y alternativa

El contraste ONU/Census de AV102/107 sigue sin armonización de facto/residente. Los dos totales agregados, por sí solos, no identifican cuántos residentes estaban ausentes ni cuántos no residentes estaban presentes en la fecha objetivo. No se inventa una corrección a partir de su diferencia.

Existe una vía adicional para avanzar en demografía: comparar **proyecciones Census 2023 de población residente** con una **edición posterior fijada de estimaciones residentes Census**. Cambia el predictor evaluado: sería la proyección oficial Census, no WPP ni un predictor propio de Psicohistoria. No resuelve por sustitución la evaluación WPP; esa línea se conserva separada.

## Fuentes y cronología verificadas

El [glosario nacional del programa de estimaciones](https://www.census.gov/programs-surveys/popest/about/glossary/national.html) delimita población residente a los 50 estados y Distrito de Columbia, incluidos civiles y militares residentes. La categoría que añade militares destinados fuera es distinta. No se agregan Puerto Rico, territorios ni categorías exteriores al total nacional.

La [metodología de proyecciones 2023](https://www2.census.gov/programs-surveys/popproj/technical-documentation/methodology/methodstatement23.pdf), página PDF 3, identifica explícitamente población residente y base al 01/07/2022 procedente de Vintage 2022. La proyección avanza cohortes mediante nacimientos, defunciones y migración. La [página de la serie principal](https://www.census.gov/data/tables/2023/demo/popproj/2023-summary-tables.html) enlaza el libro `np2023-t1.xlsx`; el enlace genérico de archivos observado conduce a una carpeta 2017, por lo que no se usó para identificar la edición 2023.

El [comunicado oficial](https://www.census.gov/newsroom/press-releases/2023/population-projections.html) fecha la publicación el **09/11/2023**. Por tanto, julio de 2023 precede a esa publicación; no se presentará como objetivo futuro emitido entonces. Julio de 2024 y posteriores sí son fechas futuras respecto a esa publicación, sin que ello pruebe una emisión propia o los bytes exactos disponibles el primer día.

La [metodología Vintage 2024](https://www2.census.gov/programs-surveys/popest/technical-documentation/methodology/2020-2024/methods-statement-v2024.pdf), primera página, define también una estimación residente y advierte que cada edición revisa la serie completa y su metodología. Compartir universo no convierte el desenlace en verdad definitiva ni en fuente estadísticamente independiente de la proyección. Es necesario fijar la edición usada y separar revisiones de la base del crecimiento posterior.

## Conservación y alcance

Seis originales recuperados: glosario, página de serie, comunicado, dos metodologías PDF y libro de proyecciones. Manifiesto privado con URL, hora de recuperación, tamaño, cabeceras y SHA-256; todos los hashes releídos. Libro de 31.263 bytes, ZIP íntegro, SHA-256 `244345cf31944b1b7a7faf7dc0af171a245cf3e8cf03475ef6fd086ed31c4d4e`. La conservación actual no certifica que no se hayan sustituido archivos después de su publicación histórica.

## Siguiente experimento candidato

Antes de calcular: fijar serie principal, total nacional residente, fechas futuras posteriores al09/11/2023 y vintages de desenlace; archivar las fuentes faltantes. Comparadores posibles: nivel constante o crecimiento previo, ambos con datos disponibles al origen. Congelar métricas y descomposición de revisión de base frente a crecimiento antes del cálculo. Dos horizontes de un mismo origen serían dependientes y no demostrarían habilidad general.

Esta auditoría habilita un diseño retrospectivo exploratorio; todavía no es protocolo congelado, evaluación externa independiente ni aprobación de gate. DEM-02 permanece PARCIAL/NO y conserva el bloqueo específico WPP.
