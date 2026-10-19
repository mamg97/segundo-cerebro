# PSICOHISTORIA — AV-044 · Capturas archivadas y testigo temporal de GED 19.1 (19/10/2026)

**Estado: auditor de evidencia temporal en investigación. No existe todavía fuente as-of o conjunto en riesgo aprobado.**

## Fuentes verificadas y limitación fundamental

- El [índice histórico oficial UCDP](https://ucdp.uu.se/downloads/olddw.html) enlaza GED 19.1 y Candidate 20.0.10.
- [UCDP Update Alert 32](https://ucdp.uu.se/downloads/updatealert/ucdp_updatealert32.html) anuncia GED 19.1 y cobertura hasta 2018. Un comunicado no atestigua bytes exactos.
- Un [repositorio académico externo](https://rdrr.io/github/knapply/data4ds4da/src/data-raw/ucdp_19.1.R) anota «Date Obtained: 2020-01-10» para GED 19.1: fecha declarada posterior a 01/01/2020, no testigo pre-origen.
- El [formato CDX](https://wwws.loc.gov/preservation/digital/formats/fdd/fdd000590.shtml) recoge URL, timestamp de captura y digest. El [servidor CDX de Internet Archive](https://github.com/internetarchive/wayback/blob/master/wayback-cdx-server/README.md) expone estos metadatos, pero sin garantía criptográfica de fecha.

## Implementación

En onset_archive_witness.py se valida URL oficial inmutable, estructura de JSON CDX, tiempo UTC de 14 dígitos, status HTTP 200 y digest Base32 SHA-1. Las capturas posteriores o iguales al origen no son candidatas. Es posible contrastar el digest frente a bytes archivados, **solo en ficheros efímeros fuera del repositorio público**. SHA-1 de CDX no equivale al SHA-256 oficial; una coincidencia de bytes no acredita por sí sola cuándo existían.

El sondeo onset_archive_probe.py consulta únicamente el índice público de Internet Archive para GED 19.1 y capturas anteriores a 2020, sin descargar los ficheros de eventos. Si el servicio responde 403, 429, 5xx, bloquea o devuelve HTML, el estado es NO VERIFICABLE, nunca ausencia de capturas. No se almacenan respuestas originales en GitHub.

Tests sintéticos y CI comprueban rechazo de manipulación de tiempo, identidad, HTML, falsos digests y errores de red, sin datos personales o geográficos.

**Todas las banderas de disponibilidad histórica, riesgo completo, backtest y predicción siguen en false.** Un digest de archivo y una fecha indicada por el archivo son indicios externos, no un timestamp criptográfico independiente del instante de publicación.

## Precisión de origen y alcance

AV-042 exigía 1 de enero a las 00:00, pero no establecía huso horario. AV-044 prueba exclusivamente el **escenario hipotético de 1 de enero a las 00:00 UTC**, sin modificar retroactivamente AV-042; cualquier homologación requerirá preregistro del reloj.

Aunque encontrásemos GED 19.1 archivado en 2019, termina en 2018: no acredita la actividad intrastatal completa durante 2019 necesaria para la emisión 01/01/2020 ni establece países con ausencia de eventos. Tampoco certifica equivalencia territorial GW/UCDP ni la pertenencia al conjunto en riesgo de onset1.

## Próxima decisión

Investigar un archivo con bytes identificados temporalmente y actividad específica intrastatal de Y−1 más cobertura explícita de todos los países. Si el contrato 01/01/Y es irrealizable para una fuente anual definitiva, abrir **nuevo experimento preregistrado** con origen/horizonte distintos y sin modificar el target original en silencio.

Fase MAD-02 permanece PARCIAL. No se emiten probabilidades, no se puntuán modelos y la cohorte privada 2027 permanece intacta. Sin gasto incremental.
