# AV-094 — Fuente candidata de comportamiento social: HTOPS

22/10/2026. Auditoría de fuente; no hay modelo, pronóstico ni comparación de habilidad.

## Evidencia original

El [Census Bureau](https://www.census.gov/programs-surveys/household-pulse-survey/data/tables.html) indica que Household Pulse dejó el diseño transversal en septiembre de 2024, HTOPS fue longitudinal durante 2025 y volvió a diseño transversal en marzo de 2026. La [nota de julio de 2026](https://www.census.gov/newsroom/press-releases/2026/htops-data-tables.html) informa una corrección de ponderaciones de marzo y mayo; la página de tablas dice que marzo fue actualizado el 24/09/2026. Esto impide tratar todo el histórico 2020–2026 como una serie homogénea sin una reconstrucción metodológica.

Se archivaron fuera de Git tres XLSX oficiales actuales: tabla nacional de soledad y apoyo social de [marzo 2026](https://www.census.gov/data/tables/2026/demo/hhp/2603.html), tabla nacional de soledad de [julio 2026](https://www.census.gov/data/tables/2026/demo/hhp/2607.html) y tabla de apoyo social de julio. Bytes, URLs, captura y SHA-256 en `source-archive/census-htops-social-2026-10-22/MANIFEST.json`. Son **bytes revisados visibles hoy**, no la primera publicación histórica.

Lectura de las tablas: ambas usan una población total nacional de 261.534.494 adultos. La tabla de marzo separa `Always`, `Usually`, `Sometimes`, `Rarely`, `Never`, `Did not report` para soledad; la de julio agrupa `Always or Usually` y `Rarely or Never`. Marzo informa 4.581.660 + 10.013.921 en las dos primeras categorías; julio 22.640.959 en la primera categoría agrupada. Es una comparación descriptiva de archivos actuales. **No se infiere un aumento real**: hay revisión de ponderación, categorías de publicación distintas y deben cotejarse cuestionario, tabla de errores estándar y composición muestral. Incluso las bandas de edad publicadas cambian (18–29/30–39 en marzo; 18–34/35–49 en julio), por lo que las filas de edad no se pueden empalmar directamente.

## Pregunta futura posible y gate

Una pregunta prospectiva acotada sería anticipar la proporción nacional de adultos que declaran soledad `Always or Usually` en una futura ola HTOPS, con fecha de corte anterior a su trabajo de campo, definición idéntica de pregunta, tratamiento fijo de no respuesta y benchmark de persistencia de la última ola admisible. Deben fijarse antes del resultado la ola, primera publicación objetivo, tolerancia de revisión, incertidumbre muestral y calendario. También hay que verificar que la pregunta seguirá incluida.

Estado: **fuente localizada, contrato y reloj as-of bloqueados**. No empalmar 2020–2026, no entrenar con las tablas actuales como si fueran vintages originales y no emitir probabilidad.
