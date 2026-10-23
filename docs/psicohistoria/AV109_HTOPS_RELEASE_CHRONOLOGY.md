# AV-109 — Cronología pública de tablas HTOPS 2026

23/10/2026. Complementa el [reloj de campo AV-108](AV108_HTOPS_FIELDWORK_CLOCK.md). Se archivaron fuera de Git las páginas HTML completas observadas ahora, con URL, fecha de captura, tamaño y SHA-256 en `source-archive/census-htops-social-2026-10-22/MANIFEST.json`.

El [comunicado oficial Census del 23/07/2026](https://www.census.gov/newsroom/press-releases/2026/htops-data-tables.html) anuncia ese día tablas nuevas de la muestra **marzo 2026** con, entre otros temas, conexión social. La página actual del comunicado contiene una nota añadida sobre corrección de ponderaciones de marzo/mayo y dice que se revisó por última vez el 24/09/2026. Por tanto, su **fecha de comunicado** y sus **bytes actuales** representan momentos distintos; el HTML observado no reconstruye el contenido exacto del 23/07.

El [índice oficial actual de tablas](https://www.census.gov/programs-surveys/household-pulse-survey/data/tables.html) fecha la entrada de **julio** el **24/09/2026** y declara que las tablas de **marzo** se actualizaron ese mismo día a partir del PUF revisado. Esta evidencia fija una cronología pública mínima: marzo anunciado el 23/07 y revisado el 24/09; julio listado el 24/09. No acredita por sí sola que julio no tuviera una versión anterior ni conserva los XLSX originales de marzo del 23/07.

Para un score prospectivo hay que especificar si el desenlace es la **primera tabla publicada** o una versión posterior congelada. El objetivo de persistencia puede cambiar si se entrena con la revisión de marzo como si hubiera existido antes de julio. Se necesitan el XLSX de primera salida, hora verificable, revisiones sucesivas y reglas de admisión del ítem `SOC2_first`; no basta la fecha de una página mutable.

`SOC-02` continúa `PARCIAL`, `criterio_superado=NO`. Sin forecast, backtest ni inferencia de cambio real entre olas.
