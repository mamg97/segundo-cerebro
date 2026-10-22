# AV-102 — Contraste de alcance poblacional ONU–Census en EE. UU.

23/10/2026. Primer contraste de una fuente nacional externa con WPP. Los números siguientes **no** son errores de pronóstico ni una evaluación de habilidad.

## Fuentes y reloj

[AV-092](AV092_WPP_DEMOGRAPHIC_VINTAGES.md) archivó los CSV ONU de las ediciones 2022 y 2024. La edición WPP 2022 se publicó el 11/07/2022: su fila `USA`, variante `Medium`, `TPopulation1July`, año 2023, era una proyección para una fecha posterior. WPP 2024 revisó retrospectivamente 2023. El [portal de datos ONU](https://population.un.org/dataportal/data/indicators/71/locations/840/start/2023/end/2023/metadata) describe el indicador de población de 1 de julio como **de facto**. La [metodología WPP 2024](https://population.un.org/wpp/assets/Files/WPP2024_Methodology.pdf), conservada con SHA en el manifiesto privado, define población de facto como personas físicamente presentes en un territorio.

El [Census Bureau publicó su Vintage 2023 el 19/12/2023](https://www.census.gov/newsroom/press-releases/2023/population-trends-return-to-pre-pandemic-norms.html). El [libro oficial `NST-EST2023-POP.xlsx`](https://www2.census.gov/programs-surveys/popest/tables/2020-2023/state/totals/NST-EST2023-POP.xlsx) da población **residente** de EE. UU. al 01/07/2023. La [metodología Vintage 2023](https://www2.census.gov/programs-surveys/popest/technical-documentation/methodology/2020-2023/methods-statement-v2023.pdf) explica que esa serie se revisa con cada edición y que la población residente comprende a quienes residen en el país. XLSX, metodología y comunicado se conservaron completos, con URL, bytes y SHA en `source-archive/census-popest-v2023-2026-10-23/MANIFEST.json`, **fuera de Git**. Son bytes recuperados el 22/10/2026, no prueba de que los archivos actuales sean exactamente los del primer día de publicación.

## Lectura comparable en fecha, distinta en definición

| Fuente | Fecha de referencia | Personas |
| --- | --- | ---: |
| WPP 2022, proyección USA para 2023 | 01/07/2023 | 339.996.563 |
| WPP 2024, estimación revisada USA 2023 | 01/07/2023 | 343.477.335 |
| Census Vintage 2023, población residente USA | 01/07/2023 | 334.914.895 |

Las diferencias aritméticas son **5.081.668** entre WPP 2022 y Census Vintage 2023, y **8.562.440** entre WPP 2024 y Census Vintage 2023. `research/psychohistory/wpp_us_census_v2023_audit.py` exige el SHA de cada archivo, selecciona `USA`/`2023` en ambos CSV, lee el libro oficial y reproduce esas diferencias. WPP se expresa originalmente en miles y se multiplica por 1.000; Census está en personas.

La misma fecha de referencia no implica el mismo universo estadístico. De facto y residente tienen reglas distintas; además, las dos instituciones aplican métodos y posibles fuentes compartidas que deben auditarse. El valor Census es una **estimación** que también puede revisarse, no un censo definitivo ni verdad independiente pura. Por eso las diferencias no se etiquetan como error WPP ni sirven para seleccionar modelo o afirmar precisión predictiva.

## Puerta siguiente

Antes de usar Census como desenlace, documentar cobertura territorial, residencia/presencia, dependencias de datos entre ONU y Census, edición exacta disponible en cada corte y regla de revisión. Definir si el objetivo es la **primera estimación Census** o una edición congelada posterior, con benchmark prospectivo y frecuencia anual. `DEM-02` sigue `PARCIAL`, `criterio_superado=NO`; no hay pronóstico demográfico admitido.
