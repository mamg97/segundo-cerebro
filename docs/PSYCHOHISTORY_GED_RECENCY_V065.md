# PSICOHISTORIA — contraste GED v0.6.5: tiempo desde último incidente elegible

**Estado a 17/10/2026:** comparador implementado, probado sintéticamente y **reproducido retrospectivamente con originales privados**, con informes y manifiestos custodiados en Drive. La cabecera anterior reflejaba el estado previo a esa reproducción; no debe seguir presentarse como pendiente. No se publicaron scores reales en Git ni se certificó ningún pronóstico prospectivo.

## Pregunta

¿Conocer **cuánto tiempo lleva un país sin registrar un incidente estatal letal con fecha exacta** aporta señal adicional para anticipar la reaparición de al menos un incidente elegible durante los siguientes 24 meses?

Es exactamente el mismo objetivo de `ged_reemergence.py`. Para el mes **final** del horizonte T, el corte C=T−24 define el estado informativo y la emisión **hipotética** sería el primer día de C+1. Los países elegibles han tenido 12 meses completos sin incidentes GED elegibles, y la fecha futura de incidente no se usa en elegibilidad o entrenamiento.

## Variables predefinidas

Clasificar la recencia **exclusivamente al corte**, en intervalos:

- `12_23m`: incidente elegible más reciente registrado entre 12 y 23 meses antes del corte.
- `24_59m`: último incidente entre 24 y 59 meses antes.
- `60plus_documented`: al menos 60 meses de historial de membresía país-año sin nuevos incidentes elegibles, comprobados explícitamente. No inferir ausencia antes de la cobertura del dataset.
- `history_incomplete`: no puede acreditarse la antigüedad de 60 meses, por corte inicial del archivo o discontinuidad del roster. En este caso se usa la tasa global, **no** se finge un periodo tranquilo.

El riesgo conocido del país no incorpora datos de los 24 meses posteriores. No identificar GED elegibles con la inexistencia de otras formas de violencia: siguen excluidos incidentes con fecha imprecisa, bajas `best=0` y otras tipologías de violencia.

## Cuarto baseline

Para cada corte C, recuperar **únicamente** cohortes históricas que ya habían completado los 24 meses de desenlace antes de C, con anclas entre C−24−59 y C−24.

Para cada grupo de recencia:

```
tasa_global = (eventos_globales_maduros + 1) / (cohortes_maduras + 2)
P_Grupo = (eventos_grupo_maduros + 20 * tasa_global) / (cohortes_grupo_maduras + 20)
```

El factor 20 es fijo, no calibrado ex post para estos resultados. Si faltan cohortes en el grupo se usa la frecuencia global. Compite **sobre los mismos países, ventanas y etiquetas** con los tres baselines originales: `global_reemergence`, `country_shrinkage` y `country_history`. Ningún modelo se elige a partir de su puntuación en el test.

## Salvaguardas

El módulo `research/psychohistory/ged_reemergence_recency.py` exige:

1. Informe original exacto `psychohistory.ged.reemergence_24m.v1` con banderas retrospectivas, fuentes GED+roster y hashes que coinciden con los archivos nuevamente verificados.
2. Cohorte sin duplicados; todos los países elegibles en el corte, roster posterior explícito y desenlaces recalculados contra GED.
3. Reproducción de la frecuencia global original con las cohortes maduras. Discrepancias mayores que la tolerancia rechazan el análisis.
4. Resultados separados para 2016–19 (validación) y 2020–24 (test); guardado privado create-only, sin Git ni resultados hardcodeados en el frontend.
5. Comparación global como diagnóstico **exploratorio** (ventanas solapadas), y sensibilidad de ventanas no solapadas que terminan en enero de 2016/2018 y enero de 2020/2022/2024. Esas fechas de fin de horizonte corresponden a hipotéticas emisiones en febrero de 2014/2016 y febrero de 2018/2020/2022.
6. Solo dos bloques de validación y tres de test: **IC, significación y afirmaciones de eficacia = no disponibles**. Se muestran N y eventos. Países dentro de cada bloque siguen correlacionados.

### Comando privado tras CI

```sh
python3 research/psychohistory/ged_reemergence_recency.py \
  --original-report /privado/ged-reemergence-24m.json \
  --ged-zip /privado/ged251-csv.zip \
  --ged-sha256 SHA_GED_VERIFICADO \
  --roster-csv /privado/ucdp-intrastate-country-onset-251.csv \
  --roster-sha256 SHA_ONSET_VERIFICADO \
  --out /privado/ged-reemergence-recency-comparison.json
```

La comparación con el informe anterior debe usar idénticos hashes de fuente, horizonte, universo y desenlaces. Si no mejora contra el comparador fuerte, comunicar el resultado sin seleccionar después parámetros más favorables.

**Hitos pendientes tras reproducción:** auditoría completa de integridad ZIP→manifiesto→informe; sensibilidad de composición y calendarios adicionales si existen datos suficientes; contraste externo solo si el target, universo, horizonte y emisión son comparables. UCDP GED 25.1 es retrospectivo revisado: la disponibilidad `as-of` y la emisión real continúan sin probar. El paquete 2027 previo sigue sin sello TSA externo.


## Auditoría de una reproducción real (sin publicar sus valores)

La reproducción con originales privados descubrió que `save_private` serializa JSON con claves alfabéticamente ordenadas. El adaptador debe validar el **conjunto exacto** de nombres de modelos, no el orden de las claves del diccionario. Esta corrección no modifica ninguna probabilidad ni etiqueta. El test reproduce explícitamente el JSON `sort_keys=True` del informe privado.

La evaluación descriptiva ya incluye **Brier Skill por fecha final de horizonte** y **leave-one-anchor-out** de ventanas completas. Todas las comparaciones conservan exactamente la población, el desenlace y los tres modelos previos. Esos diagnósticos pueden revelar que una aparente mejora proviene de una única fecha; no producen IC ni significación estadística al disponer de solo 2/3 bloques de calendario.

Los valores empíricos, país-mes y ficheros originales están restringidos a Drive privado, con manifiesto de integridad; nunca deben copiarse a Git ni confundirse con pronósticos sellados.
