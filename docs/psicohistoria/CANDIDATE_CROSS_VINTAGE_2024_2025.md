# PSICOHISTORIA — Auditoría entre ediciones mensuales UCDP Candidate

**19/10/2026 · Pregunta empírica:** ¿qué ocurre en la siguiente edición con
los seis eventos de `24.0.12` cuya precisión temporal es `date_prec=0`
y cuyo intervalo comienza en diciembre de 2024 y acaba en 2025?

## Fuentes y método

El [archivo oficial de ediciones UCDP](https://ucdp.uu.se/downloads/olddw.html)
identifica `24.0.12` (diciembre 2024) y `25.0.1` (enero 2025).
El [codebook Candidate 1.3](https://ucdp.uu.se/downloads/candidateged/ucdp-candidate-codebook1.3.pdf)
define la inclusión mensual por `date_start` **o** `date_end` en el mes
exportado, el carácter preliminar y el rango documentado de `date_prec`
(1–5). La edición 1.4 del manual tampoco documenta el 0, pero eso no
autoriza a redefinirlo.

`research/psychohistory/candidate_cross_vintage.py` analiza dos CSV
originales en memoria, con formato validado y comparación **únicamente
descriptiva** por el identificador `id` de evento de UCDP. No se supone
que un ID idéntico garantice inmutabilidad del evento entre releases:
si difieren país o tipo de violencia, la coincidencia se excluye del
subconjunto comparable y se contabiliza una colisión potencial.

Se mide **solo con contadores agregados**: filas por edición, frecuencia de
`date_prec`, eventos presentes en ambas ediciones, cambios de fechas y
precisión en los ID comparables, supervivencia o no aparición posterior
de los seis casos con valor 0. También se revisan los extremos de fecha
de cada fichero frente a su mes nominal.

**Importante:** un ID no observado en enero puede indicar sencillamente
que el suceso ya no entra en el filtro de ventana mensual, o bien una
revisión; no es prueba de eliminación/retractación. Un ID coincidente
tampoco demuestra que los datos estuvieran publicados en la fecha
hipotética de predicción.

### Ejecución empírica en CI

La tarea
`.github/workflows/psychohistory-candidate-vintage-comparison.yml`
descarga exclusivamente las dos URLs públicas oficiales a un directorio
efímero de GitHub Actions, contrasta los bytes de diciembre con el
SHA-256 observado en la ejecución anterior de octubre de 2026 y
publica solo el **JSON agregado** en logs. Los CSV se borran con
`if: always()`; no se generan artifacts, se usan credenciales o
servicios de pago. No hay cron.

El hash de diciembre, aunque fijado frente a la observación de
**octubre de 2026**, **no es** una prueba histórica de publicación
en diciembre de 2024. El hash de enero es inicialmente una observación
actual sin un pin previo independiente.

```bash
python3 research/psychohistory/candidate_cross_vintage.py \
  --december /PRIVATE/GEDEvent_v24_0_12.csv \
  --january /PRIVATE/GEDEvent_v25_0_1.csv \
  --december-sha256 <SHA256_OBSERVADO_ANTERIORMENTE>
```

## Puerta científica inalterada

Se mantienen `historical_publication_dates_independently_verified=false`,
`source_as_of_verified=false`, `models_scored=false`,
`country_zero_event_roster_verified=false`,
`forecast_issued=false` y `prospective_skill_demonstrated=false`.

El archivo de eventos no contiene los países con cero incidentes; sin
roster independiente completo, datación histórica independiente y
reconstrucción de etiqueta/entrenamiento de cada origen, **no existe
backtest vintage-correct admisible**.

El resultado experimental se documentará **después** de observar CI:
no escribir conclusiones empíricas hipotéticas en esta página.
