# AV-088 — Correspondencia mensual y trimestral de Candidate 2026

22/10/2026 · Investigación en revisión. Es una comparación de dos descargas
oficiales del mismo proveedor, no una fuente independiente ni un pronóstico.

## Pregunta y fuentes

AV-087 observó un registro cuyo intervalo cubre septiembre entero sin que
`date_start` o `date_end` caiga en septiembre. El [codebook Candidate 1.5](https://ucdp.uu.se/downloads/candidateged/ucdp-candidate-codebook1.5.pdf)
describe la inclusión mensual por uno de esos extremos. Se contrasta su
representación en la edición trimestral enero–septiembre, sin interpretar la
presencia en esta como explicación del contrato mensual.

| Descarga oficial | Bytes observados 22/10/2026 | SHA-256 |
| --- | ---: | --- |
| [Septiembre 26.0.9](https://ucdp.uu.se/downloads/candidateged/GEDEvent_v26_0_9.csv) | 1.611.352 | `20256b0d674f4c58d747c7c75ddc012eabfedf44ada22f436ef2d9a6405567d5` |
| [Enero–septiembre 26.01.26.09](https://ucdp.uu.se/downloads/candidateged/GEDEvent_v26_01_26_09.csv) | 13.065.779 | `134da9b3df08b65266802c4b662e572f396c70c92ab62297319be657540bcede` |

La [página oficial de descargas](https://ucdp.uu.se/downloads/) enlaza ambas
ediciones y denomina trimestral a la segunda. Estos hashes son observaciones
actuales: no certifican cuándo se publicaron por primera vez los bytes.

## Observación agregada

El CSV mensual contiene 2.014 registros; el trimestral, 16.633. Los 2.014
identificadores mensuales aparecen en el trimestral y sus seis campos básicos
auditados —identificador, país, tipo de violencia, fechas inicial/final y
precisión— coinciden. El único intervalo de AV-087 que abarca septiembre sin
extremos dentro del mes también está en el trimestral con esos campos iguales.
Ningún ID de evento o país se registra en este informe ni en los logs.

La coincidencia confirma que la anomalía persiste en dos exportaciones de
UCDP. **No** aclara por qué el registro entra en el archivo mensual bajo la
regla textual de extremos, ni demuestra un error del proveedor, un evento
futuro, identidad independiente entre ediciones o disponibilidad histórica.
El estado sigue `SOURCE_QUALITY_BLOCKED`; no se retira el registro ni se
autoriza replay, scoring, modelo nuevo o emisión.

## Reproducción y siguiente decisión

`candidate_monthly_quarterly_audit.py` exige ambos hashes, rechaza CSV
irregulares y devuelve exclusivamente contadores y banderas negativas de
admisión. La CI descarga las fuentes de manera efímera y las borra. Los tests
sintéticos cubren persistencia del intervalo, discrepancias, ausencias, hash y
filas irregulares. La verificación remota de la PR aún está pendiente.

Para levantar el bloqueo hace falta una aclaración documental de UCDP sobre
los intervalos que abarcan un mes completo o una regla de exportación
demostrada con evidencia suficiente. Después siguen pendientes el reloj
externo anterior al origen, un roster completo y un objetivo mensual propio
preespecificado. La cohorte anual 2027 permanece `SHADOW_NO_EMITIDO`.
