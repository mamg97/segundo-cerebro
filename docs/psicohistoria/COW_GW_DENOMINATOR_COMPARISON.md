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

## Observación sobre las tres fuentes reales · 19/10/2026

La [ejecución empírica de COW y GW](https://github.com/mamg97/segundo-cerebro/actions/runs/39232848303)
ha confirmado los siguientes recuentos, sin publicar filas individuales:

| Período | COW (Estados de todo el mes) | GW+suplemento | Estado |
|---|---:|---:|---|
| Diciembre 2020 | 195 | 197 | Dos sistemas con criterios distintos |
| Diciembre 2024 | 195 | No evaluable | GW caduca en 2020 |
| Enero 2025 | No evaluable | No evaluable | Ambos fuera de cobertura |

En 2020 hay 189 códigos numéricos presentes en ambos rosters, seis
solo en COW y ocho solo en GW. **Estas no son cifras de países
armonizados**, ya que el mismo número puede designar realidades diferentes.
Además se detectó una sucesión bajo el mismo código COW en la fecha
2006-06-03 (código 345) con ambos intervalos **incluyentes**: se conserva
como `n_cow_shared_day_handoffs_not_disambiguated=1` y no se
deduplica silenciosamente. Para meses de transición sin intervalo único
que cubra todo el mes, se mantiene como pertenencia parcial.

El sistema GW v7 consta de **202 códigos en lista principal y 23
en el suplemento**, total combinado de 225 a lo largo de toda su
historia. El recuento de 197 en diciembre 2020 corresponde a la
definición GW con microestados incluidos. No sustituye los 174 de la
lista principal del avance 30; explica su diferencia de alcance.

Checksums SHA-256 de los bytes públicos observados **en octubre 2026**:

- COW 2024: `722153b45eda9c39826a04aab80ca7b29a8b1cfdfe5d92714503420555675484`
- GW principal: `70ba63cd8a936a25a701be5daffa1105411da5298ff890bf4bc27ed688892b2b`
- GW microestados: `02b6cc749405b744258c3b314b668fa6438fbb7d869c3e7be4bd2cb6da2c5288`

Estos hashes se fijan para la próxima CI pero **no constituyen
testigos criptográficos de disponibilidad en 2020 o 2024**.

La discordancia es una razón adicional para impedir un join automático
COW→GW/UCDP y construir etiquetas negativas sin verificaciones de
cobertura país-vintage.
