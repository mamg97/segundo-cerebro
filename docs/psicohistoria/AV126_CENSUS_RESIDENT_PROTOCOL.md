# AV-126 · Protocolo demográfico retrospectivo Census v1

24/10/2026. Contrato fijado antes de calcular los errores de este ensayo.
No es una prerregistración confirmatoria: el diseño procede de investigación previa.

## Pregunta y comparación

¿Cómo difiere la serie principal de proyecciones Census 2023 de población residente de las estimaciones residentes posteriores, y cómo compara con dos reglas simples disponibles al origen?

- Origen: publicación del 09/11/2023. Base: 01/07/2022.
- Universo: población residente total de los 50 estados y Distrito de Columbia, al 1 de julio.
- Objetivos: 01/07/2024 frente a Vintage 2024; 01/07/2025 frente a Vintage 2025.
- Sensibilidad predefinida: el objetivo 2024 también frente a Vintage 2025; se informa separado, sin elegir la referencia favorable.
- Comparadores: nivel constante de 2022 y extrapolación lineal de la diferencia 2021–2022, ambos desde Vintage 2022. No se incorporan revisiones posteriores al origen a esos comparadores.

Los dos horizontes comparten origen y no son dos experimentos independientes. El predictor es la proyección oficial Census. El problema WPP de facto/residente queda separado.

## Fuentes conservadas

[Proyección principal 2023](https://www2.census.gov/programs-surveys/popproj/tables/2023/2023-summary-tables/np2023-t1.xlsx), [estimaciones V2022](https://www2.census.gov/programs-surveys/popest/tables/2020-2022/state/totals/NST-EST2022-POP.xlsx), [V2024](https://www2.census.gov/programs-surveys/popest/tables/2020-2024/state/totals/NST-EST2024-POP.xlsx) y [V2025](https://www2.census.gov/programs-surveys/popest/tables/2020-2025/state/totals/NST-EST2025-POP.xlsx).

Los cuatro originales están archivados privadamente y fijados por tamaño y SHA-256 en el contrato. Se inspeccionaron etiquetas XML, hojas y coordenadas sin calcular errores. El libro de proyección declara miles; convertir a personas multiplicando el valor numérico almacenado por 1000. Los libros de estimaciones expresan recuentos de población; no confundir su base abril2020 con columnas julio2022/2024/2025. Usar la fila United States, sin sumar regiones, estados ni Puerto Rico.

Los metadatos indican publicación de las estimaciones en diciembre2022, diciembre2024 y enero2026. La recuperación actual no acredita bytes exactos del primer día. Las [metodologías Census](https://www2.census.gov/programs-surveys/popest/technical-documentation/methodology/2020-2024/methods-statement-v2024.pdf) permiten revisiones completas; las estimaciones no constituyen verdad definitiva e independiente.

## Métricas fijadas

Por objetivo y por predictor: error firmado F−E, error absoluto y error porcentual firmado 100(F−E)/E. Media descriptiva de error absoluto entre los dos objetivos primarios; sensibilidad2024/V2025 por separado. Aritmética Decimal, precisión28, sin redondear valores intermedios a enteros. Preservar precisión numérica almacenada, distinta del formato visible de Excel.

Separar algebraicamente la diferencia de base y la diferencia de crecimiento:

`F_y − E_y,V = (F_2022 − E_2022,V) + [(F_y − F_2022) − (E_y,V − E_2022,V)]`.

La diferencia de base puede mezclar revisión y precisión de la tabla de proyección. Esta identidad no atribuye causalmente el error a un componente demográfico.

## Ejecución y límites

Abortar con hashes, metadatos, fechas, unidades o celdas ausentes/duplicadas/inesperadas. No imputar ni sustituir escenarios o ediciones. Verificar la relación de la hoja del libro antes de usar coordenadas. El ejecutor deberá probar con datos sintéticos conversión de unidades, fechas, unicidad y descomposición.

Publicar este contrato antes de ejecutar el cálculo real. No calcular probabilidades, Brier, calibración ni significación; no afirmar habilidad general, independencia o emisión propia. DEM-01/02 siguen PARCIAL/NO. El siguiente avance debe registrar implementación y resultados con sus limitaciones.

Contrato: `research/psychohistory/census_resident_protocol_v1.json`.
SHA-256: `b60d344eaac44df3b0a7020bb238d9189d206c61d3b74e83abb8b2b517840271`.
