# PSICOHISTORIA — Denominador COW 2024 frente a GW v7 con microestados

**Avance propuesto 31 — 19/10/2026. Solo análisis territorial. Ningún backtest ni forecast habilitado.**

## Hallazgo documental

El proyecto académico [Correlates of War, State System Membership v2024](https://correlatesofwar.org/data-sets/state-system-membership/)
publicó una versión que termina **31/12/2024**, anunciada el **3 de noviembre de 2025**.
Define países miembros del sistema internacional con criterios propios. Es una
fuente independiente de los sucesos UCDP, pero por su fecha de publicación
**no puede funcionar como roster publicado antes de una emisión de 2024**.

La [lista Gleditsch-Ward versión 7.0](https://ksgleditsch.com/statelist.html)
termina en 2020; su suplemento separado de microestados es parte del
sistema. COW y GW usan identificadores **numéricos diferentes en casos
importantes** y no son sustituibles por un join directo de números.
Ejemplos: la codificación de Alemania y Serbia difiere. Tampoco se puede
sustituir GW/UCDP `country_id` por el `ccode` COW a partir de coincidencias
numéricas accidentales.

## Experimento

`research/psychohistory/cow_gw_denominator_bridge.py` compara:

1. COW 2024: intervalos de pertenencia hasta 2024-12-31, código COW.
2. GW 7.0: lista principal histórica hasta 2020-12-31, código GW.
3. GW microestados: suplemento histórico separado, sin duplicados permitidos.

El parser valida cabeceras estrictas, fechas y sus rangos, códigos numéricos,
duplicados de intervalos y checksums SHA-256 de los bytes originales. El
análisis calcula el número de miembros durante todo el mes y miembros
parciales de cada sistema por separado. Entre 2020 puede indicar la
intersección **solo numérica** de códigos como detector de discordancias,
con `numeric_code_overlap_not_identity_verified=false`, nunca como
concordancia de países. Para 2024 el resultado es necesariamente
`COW_POPULATION_ONLY_GW_CENSORED`; 2025 queda
`NO_EVALUABLE_COW_AFTER_2024`.

El job `.github/workflows/psychohistory-cow-gw-denominator.yml` descarga
solo copias públicas en una ejecución efímera desde el commit fijado
`0dda0ef93b7958f67c79031c1695dd9e5408a62c` del repositorio académico
[brentonk/us_diplomatic_missions](https://github.com/brentonk/us_diplomatic_missions),
y borra todos los ficheros. Publica solo estadísticas agregadas. No exporta
filas por país ni copia fuentes al repositorio. Sin cron ni coste recurrente.

## Límites que bloquean evaluación

- La versión COW v2024 es retrospectiva respecto a predicciones hipotéticas
  de 2024: publicación anunciada noviembre de 2025.
- No hay equivalencia de identidades COW→GW/UCDP aprobada.
- Un país miembro de un sistema estatal no equivale a país cubierto por
  un archivo Candidate de violencia.
- La ausencia de incidentes en el fichero UCDP no genera un negativo
  verificable. No se conoce la disponibilidad de sus bytes a la fecha.
- Los 196 países de la cohorte 2027 y sus probabilidades NO se modifican.

Por tanto todos los indicadores `source_as_of_verified`,
`geographic_concordance_reviewed`, `ucdp_event_archive_coverage_verified`,
`absent_ucdp_record_means_negative`, `vintage_correct_backtest`,
`models_scored` y `forecast_issued` permanecen `false`.

**Siguiente tarea:** buscar evidencia territorial verdaderamente disponible
antes de la fecha hipotética de emisión y elaborar un crosswalk versionado
con reglas explícitas para fronteras, microestados y casos problemáticos;
después verificar cobertura completa del archivo Candidate y bytes
históricos con una fecha autenticable.
