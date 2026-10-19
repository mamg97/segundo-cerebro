# PSICOHISTORIA — AV-047

Auditoria historica reproducible de UCDP GED 20.1 (eventos hasta 2019), UCDP Onset 19.1 (etiquetas pais-ano hasta 2018) y roster Gleditsch-Ward en un repositorio academico con commit de mayo de 2020.

Los modulos historical_training_source_audit.py y onset_gw_roster_2020_mirror.py comprueban identidades, esquemas y estadisticas agregadas sin publicar eventos ni paises. Los checks de Git y los hashes calculados hoy no autentican fechas historicas de acceso.

Fuente oficial: https://ucdp.uu.se/downloads/olddw.html

Publicacion 20.1: https://www.uu.se/en/department/peace-and-conflict-research/news/archive/2020-06-16-major-data-releases-from-ucdp

La definicion Onset 19.1 puede diferir de Onset 25.1: esta ultima sigue limitada a resolucion retrospectiva. Sin copia historica de bytes verificada, roster al origen, etiquetas train disponibles en 2020 y mapeo territorial, no hay backtest ni Brier autorizado. MAD-02 permanece PARCIAL y no se emiten predicciones; datos shadow 2027 intactos.

## Ejecucion empirica sobre descargas oficiales (19/10/2026)

La CI de AV-047 ha abierto los dos ficheros reales descubiertos directamente en el catalogo historico y calculado sus digests en runner efimero. Los pins siguientes identifican los bytes observados en octubre 2026, NO prueban su disponibilidad en julio 2020:

- GED20.1: URL https://ucdp.uu.se/downloads/ged/ged201-csv.zip. SHA-256 ZIP 5e35b74f52dc67a18aabfab86f69655c847e87320684662a6112dec46d65111f y CSV interior 14edadfe5b3842d4b5ba4d7260be6593332f671eafd08a02483d7b7dd3d6efb4. 225385 eventos en 1989-2019; 12484 eventos fechados 2019; 8964 de clase GED type_of_violence=1 (state-based, NO solo intrastatal). La clasificacion de evento y pais en riesgo de onset son conceptos distintos.
- Fuente enlazada bajo titulo UCDP Onset 19.1: URL https://ucdp.uu.se/downloads/onset/onsets_computed.csv. SHA-256 ba54aeace175173b7643a2c14ba35ce89a2fcfd31712085e4fd13de656f752a8. Tiene 10203 filas, 10142 claves (gwno_a,year) distintas, 61 filas adicionales duplicadas y 0 claves repetidas con desacuerdo en onset1. Periodo observado 1946-2017; **falta 2018**, pese a la cobertura 1946-2018 del codebook etiquetado 19.1.

**Diagnostico**: La etiqueta de un vinculo HTML que dice 19.1 no autentica que los bytes debajo correspondan a la publicacion 19.1; la falta de 2018 lo contradice como version completa. Tampoco cabe llamar al CSV estrictamente monadico al tener 61 filas repetidas. No se eliminan filas ni se convierten duplicados por intuicion: el auditor publica contadores y bloquea uso como labels de entrenamiento hasta reconciliacion de identidad/edicion, reglas de duplicados y temporalidad. Un enlace accesible hoy no es testigo criptografico pre-emision.

La fuente GED20.1 prueba que existe un dataset real con la ultima observacion hasta 2019 y muestra contenido coherente con su catalogo, pero no da roster country-year de paises sin conflicto ni una transformacion onset-country at-risk. **La barrera principal no se resuelve con contar eventos.**

La identidad Git de roster GW mayo2020 ha pasado en CI de metadatos, sin procesar el RData o validar que existiera en el servidor antes de 01/07/2020. El SHA Git y una fecha committer no son recibos independientes.

Todos los checks de as-of historico, elegibilidad, score y forecast siguen FALSE. La cohorte privada 2027 no se utiliza.
