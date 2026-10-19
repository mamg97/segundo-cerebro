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

## Resultado observado — comparación oficial 19/10/2026

[GitHub Actions 39222046842](https://github.com/mamg97/segundo-cerebro/actions/runs/39222046842)
ha descargado y contrastado ambos CSV oficiales. Solo se han publicado recuentos:

| Evidencia | Resultado |
|---|---:|
| Eventos edición diciembre 24.0.12 | 2.110 |
| Eventos edición enero 25.0.1 | 2.159 |
| IDs coincidentes en ambas | 7 |
| Coincidencias país/tipo contradictorias | 0 |
| IDs coincidentes con intervalo modificado | 2 |
| IDs coincidentes con `date_prec` modificado | 2 |
| `date_prec=0` en diciembre | 6 |
| De esos 6, observados con el mismo ID/país/tipo en enero | **6** |
| De esos 6, aún `date_prec=0` en enero | **5** |
| De esos 6, `date_prec` pasa a 1–5 | **1** |
| De esos 6, intervalo de fechas modificado | 1 |
| `date_prec=0` total de enero | 7 |
| Filas sin extremo en su mes nominal | 0 en ambos archivos |

Hash del CSV **enero observado en octubre 2026**, aún sin ancla histórica
independiente: `805c36c8ca7e2fa71285a5dc7db3461e3d4b1724ddd99ded48e2aab2bb27c9a3`.
El SHA-256 de diciembre coincide con el fijado en la inspección anterior.

**Interpretación:** el código 0 persiste de una release mensual a la siguiente,
lo que debilita la hipótesis de un simple error aislado del CSV de diciembre.
Sin embargo, ni su significado técnico ni la fecha pública de esos bytes
quedan determinados por la comparación. Una transición de código no es
prueba de que el evento fuera conocido en el corte temporal. No se ha
construido un roster negativo ni calculado una sola métrica predictiva.

### Patrón temporal del valor 0 en dos ediciones

La [ejecución 39222302947](https://github.com/mamg97/segundo-cerebro/actions/runs/39222302947)
incorpora el diagnóstico agregado de la posición de los extremos
respecto a cada ventana mensual:

| Ventana | Filas `date_prec=0` | Empiezan dentro del mes | Terminan después del mes | Terminan dentro del mes | Intervalo mismo día |
|---|---:|---:|---:|---:|---:|
| Diciembre 2024 | 6 | 6 | 6 | 0 | 0 |
| Enero 2025 | 7 | 0 | 0 | 7 | 0 |

Todas las filas con código 0 examinadas atraviesan el límite temporal de
su edición (en diciembre, hacia el mes siguiente; en enero, desde el anterior).
**Hipótesis exploratoria:** el código 0 está asociado a intervalos de
solapamiento entre exportaciones mensuales. No existe una definición oficial
validada de esta categoría y el hecho de que coincida en dos versiones no
implica causalidad ni universalidad. No reinterpretar código 0 como una nueva
categoría ni cambiar las fechas originales. Debe consultar al proveedor
antes de admitir este campo para un modelo.
