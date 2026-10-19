# PSICOHISTORIA — Evidencia oficial sobre aparición de conflictos (UCDP Onset)

**19/10/2026 · AV-041. Auditoría retrospectiva, no pronósticos as-of.**

## Por qué cambia la definición del objetivo

El [codebook oficial UCDP Onset v25.1](https://ucdp.uu.se/downloads/onset/ucdp-codebook-onset-251.pdf)
describe seis variantes, tres de conflicto interno y tres
interestatal. En particular, dos de las **intrastatales**
tienen universos de elegibilidad distintos:

- **Por conflicto:** determina novedad o reinicio en la historia
  del `conflict_id`; permite diferentes inicios en el mismo
  país y año, incluso con otros conflictos en curso.
- **Por país:** examina la historia de *todos* los conflictos
  internos del Estado (`gwno_a`); un país con conflicto interno
  vigente **no está en riesgo** de nuevo onset con esta
  definición, y hay como máximo una fila país-año.

Se codifican `newconf` y `onset1, onset2, onset3, onset5,
onset10, onset20`. Los últimos combinan nueva aparición con
reinicio después de años de inactividad; por tanto un `onset5=1`
**no equivale necesariamente a primera aparición de una
nueva identidad de conflicto**. Las variantes excluyen la violencia
no estatal y unilateral, que pertenecen a categorías diferentes.

## Ediciones y accesibilidad realmente verificadas

[Catálogo oficial histórico](https://ucdp.uu.se/downloads/olddw.html):

| Versión | Intrastate conflict-level CSV | Intrastate country-level CSV |
|---|---|---|
| 24.1 | **HTTP 404** observado en CI 19/10/2026 | **HTTP 404** |
| 25.1 | **HTTP 200**, descargado y validado | **HTTP 200**, descargado y validado |

La mera existencia de un enlace en el catálogo **no demuestra**
que la edición esté disponible: no se puede afirmar que se hayan
verificado los datos CSV 24.1. No se mezclan cifras ni indicadores
de 24.1 y 25.1, ni se infiere que la edición 25.1 ya existiera
en un origen de 2020.

La implementación `research/psychohistory/ucdp_official_onset_v241.py`
resuelve URLs sin inventar nombres, fija host HTTPS de UCDP,
comprueba estado de descarga y esquema con **tres puertas**
separadas: presencia en índice, obtención de bytes y
validación estructural del archivo.

## Validación empírica: datos oficiales Onset 25.1

<small>Los CSV originales se descargan solo en un runner efímero.
No se guardan filas ni `conflict_ids` o `gwno_a` en Git.
Los hashes son observaciones de octubre de 2026, no
atestados históricos.</small>

| Indicador | Intrastatal por conflicto | Intrastatal por país |
|---|---:|---:|
| Filas 1946–2024 | **12.606** | **12.553** |
| Combinaciones únicas país-año | **12.553** | **12.553** |
| Filas adicionales por misma combinación país-año | **53** | **0** |
| `newconf=1` en 2020, según cada variante | 1 | 4 |
| `onset1=1` en 2020 | 10 | 4 |
| `onset5=1` en 2020 | **3** | **1** |
| `onset5=1` en 2024 | **2** | **1** |

Estas diferencias no se atribuyen automáticamente a errores:
las dos variantes definen **targets** y conjuntos en riesgo
distintos. La comparación es solo descriptiva y no se suman
recuentos de `newconf` entre variantes como si fueran
el mismo universo.

SHA-256, observado en 2026:
- CSV 25.1 por conflicto:
  `a5a64b749693c85fd3b50a1311608a44c0846d528352baeb3767f25e50d52fe1`
- CSV 25.1 por país:
  `e2b59e65aaca88403991465b78fb407d7eddcefadeb18c7f1397bfe2ea83fe6a`
- Catálogo histórico HTML actual:
  `0891e752a08f7eff1a8be0066cdd717ab74823c6227b130a3b89cd9d1a0b8057`

La cabecera oficial del archivo por país incluye espacios
iniciales delante de `conflict_ids`. El validador normaliza
**solo los nombres de columna en memoria**, rechaza duplicados
después de normalizar y comprueba los bytes originales
contra el hash de origen. No modifica ni exporta los CSV.

El [auditor de semántica](../../research/psychohistory/ucdp_onset_v251_semantics.py)
exige años 1946–2024, indicadores de inicio binarios,
ID numérico de Estado, un solo registro país-año en la
variante por país y permite múltiples en la variante por
conflicto. Los vacíos en `year_prev` **no** se convierten
en prueba de ausencia de historial: la documentación usa
el valor especial 1815 para ausencia de inicio previo,
un concepto distinto de un campo vacío.

## Barreras científicas que permanecen cerradas

- **Ninguna predicción emitida:** 25.1 es una base de
  resolución retrospectiva de 2025, **no** información
  disponible para features emitidas previamente.
- **Sin scoring:** faltan historial de predictores anterior
  a cada origen, población elegible sincronizada con
  la definición de país/conflicto, mecanismo de
  fecha de emisión y evidencia de versiones pre-origen.
- **Sin equiparar UCDP Onset intrastatal con Country-Year
  OrganizedViolenceCY (tres categorías) o Candidate GED
  mensual.**
- **Sin homologación automática GW–COW**, ni identificación
  de un onset por observar un país que cambia 0→1.

El código devuelve
`historical_vintage_byte_timestamps_verified=false`,
`backtest_authorized=false`, `models_scored=false`
y `forecast_issued=false`.

### Próximo trabajo

Tomar **una sola** definición y universo de riesgo
(por ejemplo onset intrastatal país–año en países sin conflicto
interno activo), elaborar contrato formal de emisión a 1 de
enero y construir solo con variables que efectivamente
existieran en ese instante una evaluación temporal
reproducible. Si se buscan nuevos conflictos concurrentes
en un país con otros activos, optar expresamente por la
variante por conflicto, no mezclar unidades.

Los registros UCDP usados en CI son públicos de terceros,
pero **no se versionan por filas** para minimizar la
superficie pública del proyecto.
