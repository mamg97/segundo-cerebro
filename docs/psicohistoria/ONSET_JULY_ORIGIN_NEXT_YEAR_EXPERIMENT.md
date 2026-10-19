# PSICOHISTORIA — AV-046 · Experimento alternativo de emisión en julio, horizonte año siguiente

Fecha de diseño: 19/10/2026. **Estado: propuesta preregistrable y probada únicamente con reglas sintéticas. NO es un backtest validado ni una emisión histórica.**

## Qué problema resuelve

El contrato AV-042 pretendía emitir el 1 de enero de Y usando la actividad intrastatal completa del 31 de diciembre de Y−1, sin establecer cómo esa información habría sido publicada y archivada en el instante de corte. Esto es una restricción temporal real, no un problema que debamos ocultar rellenando retrospectivamente datos.

Hay una oportunidad cronológica documentada: [Uppsala University anunció GED 20.1 el 16 de junio de 2020](https://www.uu.se/en/department/peace-and-conflict-research/news/archive/2020-06-16-major-data-releases-from-ucdp), con cobertura observacional **1989–2019**; el [codebook de GED 20.1](https://ucdp.uu.se/downloads/ged/ged201.pdf) confirma que se trata de un conjunto global de eventos y advierte que es revisable. Un anuncio de fecha anterior al origen **no** demuestra que tengamos los mismos bytes exactos accesibles antes de la emisión; necesita un testigo independiente.

## Objetivo nuevo, separado de AV-042

| Dimensión | AV-042 original (sin modificar) | AV-046 (nuevo, no homologado) |
|---|---|---|
| Instante de emisión | 01/01/Y, 00:00, zona sin precisar | **01/07/2020 00:00 UTC** |
| Información máxima usada como candidata | Actividad Y−1 no publicada necesariamente | **Hasta 31/12/2019**, GED 20.1 anunciado 16/06/2020 |
| Horizonte de resolución | Año Y completo | **01/01/2021–31/12/2021** |
| Población | Países *at risk* de onset1 intrastatal | **Todos los Estados del roster congelado el 01/07/2020**; no seleccionados según paz futura |
| Variable de resultado | UCDP country-onset1 v25.1 en universo elegible | Indicador UCDP country-onset1 v25.1, calculado **sobre roster de emisión** (incidencia incondicional, no hazard entre elegibles) |
| Resultado de madurez | Bloqueado | **Geometría temporal plausible; no se aprueba backtest ni se dan probabilidades** |

El [codebook oficial de UCDP Onset 25.1](https://ucdp.uu.se/downloads/onset/ucdp-codebook-onset-251.pdf) distingue expresamente onset por país frente al onset por ID de conflicto y señala que los Estados con conflicto intrastatal en curso no están en riesgo de un onset país nuevo. AV-046 **no presenta su incidencia sobre todos los Estados como probabilidad condicionada al conjunto en riesgo**. Un Brier global futuro sobre Estados en situación activa puede ser estadísticamente muy distinto del Brier sobre elegibles; será obligatorio separar y explicar ambos, sin prometer skill sobre riesgo de nuevos conflictos.

La pertenencia al roster tiene que fijarse con **un archivo de países fechado y autenticado antes del origen**, incluir países con cero eventos y guardar `UNRESOLVABLE` para desapariciones/cambios territoriales que impidan resolver el outcome posteriormente. Nunca se excluyen retrospectivamente Estados para mejorar la métrica. El roster usado para emitir, el territorio administrativo, UCDP/GW crosswalk y la política de resolución requieren versiones y pruebas independientes.

## Evitar fuga de información de entrenamiento

La edición del resultado **UCDP Onset v25.1** es posterior a 2020. Solo podría usarse en una futura **resolución retrospectiva** del target; no como etiqueta de entrenamiento disponible en julio de 2020. Un replay válido requiere versiones históricas de **todas las etiquetas de entrenamiento**, sus fechas de publicación y datos y transformaciones punto-en-tiempo verificables. La mera existencia retrospectiva de CSV GED o UCDP Onset 25.1 no basta.

El auditor `research/psychohistory/onset_july2020_nextyear_protocol.py` y su `test_onset_july2020_nextyear_protocol.py` fijan rigurosamente origen UTC, publicación anterior al origen, fin del periodo de features, origen del roster, año de resolución y población. Rechazan cambios de horizonte, publicación tardía, contaminación por target posterior, estados elegidos tras conocer los resultados y digest falso. Aunque reciba hashes y marcas de tiempo declaradas, ninguna bandera de admisión real se vuelve true: faltan autenticación independiente de bytes, roster, etiquetas históricas y modelo congelado en 2020.

La CI específica ejecuta tests **sin descargar eventos ni publicar identidades de países**, sin gastos, cron, cambios de frontend, Worker, ni modificación de la cohorte privada 2027.

## Próximo ensayo real exigible

1. Obtener una copia GED 20.1 con bytes SHA-256 y evidencia **anterior a 2020-07-01** verificable independientemente, sin usar un digest obtenido hoy como certificado histórico.
2. Obtener el roster país-asof al 01/07/2020 y testigos de disponibilidad anteriores, incluyendo ceros y equivalencias territoriales homologadas.
3. Reconstruir *training labels* conocidas antes del origen, train/validation splits cronológicos y baseline ingenuo comparable con exactamente el mismo universo.
4. Solo entonces producir **backtest retrospectivo honesto** del objetivo AV-046, manteniéndolo separado del objetivo AV-042. Nunca registrar una predicción auténticamente emitida en 2020 desde un ensayo construido en 2026.

**Estado administrativo esperado:** MAD-02 PARCIAL, PsicoPredicciones sin emisiones, 2027 shadow intacto. Este experimento cambia explícitamente definición temporal y denominador, no la historia científica de AV-042.
