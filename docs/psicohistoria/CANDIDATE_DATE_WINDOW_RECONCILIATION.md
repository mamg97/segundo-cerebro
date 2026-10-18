# PSICOHISTORIA — Interpretación del período en Candidate 24.0.12

**Actualización metodológica 18/10/2026, sin emisión ni backtesting real.**

## Hallazgo que obliga a revisar el diagnóstico anterior

La inspección real del 18/10 encontró 6 filas con fecha `date_end`
posterior a diciembre de 2024. La versión anterior del auditor las llamaba
`OBSERVED_BUT_REPLAY_BLOCKED_DATE_SCOPE_ANOMALY`. Ese nombre resultó demasiado
concluyente: **UCDP admite rangos temporales de eventos que atraviesan el mes**.

El [codebook oficial Candidate 1.3](https://ucdp.uu.se/downloads/candidateged/ucdp-candidate-codebook1.3.pdf)
(página impresa 3, sección *Introduction*) especifica que la edición mensual
incluye todos los sucesos cuyo `date_start` **o** `date_end` está dentro del
mes exportado, y que el mismo evento puede aparecer en más de una edición.
La tabla de variables define `date_prec` y los extremos de intervalo
(páginas impresas 8–9). Por tanto, si los seis eventos empiezan en diciembre
de 2024 y terminan en enero de 2025, eso **no basta** para demostrar fuga
de información: deben analizarse el tipo y precisión temporal, la extracción
y la disponibilidad real de la versión.

## Nuevo diagnóstico, agregado e independiente de nombres de países

El `candidate_source_probe.py` ahora distingue:

- extremos de fecha que caen realmente en diciembre de 2024;
- intervalos que atraviesan diciembre;
- `date_end` posterior a 2024 **con inicio en diciembre**;
- eventos que empiezan después de la ventana nominal o cuyos extremos
  no coinciden con diciembre;
- fechas anteriores a 1989, tramos invertidos y distribución de `date_prec`
  de los registros que acaban después de 2024.

Los resultados agregados pueden inspeccionarse en el job efímero de GitHub.
El CSV original nunca se publica ni se adjunta como artifact.

Posibles estados:

- `NOMINAL_EVENT_MONTH_ENDPOINTS_INTACT_NOT_ASOF`
- `CROSS_YEAR_ENDS_COMPATIBLE_WITH_CODEBOOK_NOT_ASOF`
- `SOURCE_MONTH_SCOPE_MISMATCH_REVIEW_REQUIRED`

**Ningún estado autoriza automáticamente backtesting.** Se mantienen
`historical_release_time_independently_verified=false`,
`as_of_verified=false`, `backtest_authorized=false` y
`forecast_issued=false`. Los nombres de edición no demuestran los hashes
disponibles en su fecha, y el CSV de eventos tampoco proporciona países con
cero incidentes.

## Procedencia independiente y próxima investigación

El archivo de versiones [UCDP](https://ucdp.uu.se/downloads/olddw.html)
enumera 24.0.12. La publicación de un archivo de diciembre no equivale
a una emisión el 1 de diciembre: el codebook describe extracción de datos
el día 20 de cada mes. El catálogo de
[Our World in Data](https://datasette-public.owid.io/owid/origins)
conserva metadatos fechados de otras ediciones Candidate (por ejemplo la
versión trimestral 24.01.24.12), pero **no sirven para fechar los bytes
exactos de 24.0.12**.

El siguiente paso de admisión exige capturar evidencia histórica de publicación
de **esta edición y estos bytes**, construir el roster completo del universo
observado y fijar una política de asignación de eventos con fechas imprecisas
antes de calcular ningún onset ni Brier.

## Comprobación sobre el CSV oficial (ejecución real)

La ejecución efímera de [GitHub Actions 39167983799](https://github.com/mamg97/segundo-cerebro/actions/runs/39167983799)
sobre la edición 24.0.12 observada el 18/10/2026 encontró:

- 2.110 filas y **2.110** extremos de fecha en diciembre de 2024.
- **6** intervalos iniciados en diciembre de 2024 que finalizan en 2025;
  ninguno empieza después del mes exportado, ninguno tiene ambos extremos
  fuera de diciembre y ninguno presenta fechas invertidas.
- Los **6** finales tardíos tienen `date_prec=0`.

La clasificación de ventana pasó a
`CROSS_YEAR_ENDS_COMPATIBLE_WITH_CODEBOOK_NOT_ASOF`; este resultado
**solo** significa compatibilidad de los extremos con la regla de inclusión
mensual. No confirma que su contenido fuera cognoscible en diciembre.

**Advertencia adicional:** el [codebook v1.3](https://ucdp.uu.se/downloads/candidateged/ucdp-candidate-codebook1.3.pdf)
define `date_prec` con categorías 1–5, no 0. El nuevo auditor también mide la
distribución total de esta columna y emite
`SOURCE_PRECISION_CODEBOOK_MISMATCH_REVIEW_REQUIRED` cuando observa
valores no documentados. No interpreta 0 como una precisión numérica ni
imputa fechas exactas. Sigue pendiente determinar si el 0 refleja un
valor interno particular, una diferencia de versión o un problema del dato.

## Confirmación de la frecuencia de `date_prec` en fuente real

La [repetición CI 39168091726](https://github.com/mamg97/segundo-cerebro/actions/runs/39168091726)
del 18/10/2026 verificó, sin exponer filas ni países, esta frecuencia
agregada de `date_prec` en los **2.110 eventos** observados:

| Valor | Filas |
|---|---:|
| 0 (no documentado en v1.3) | 6 |
| 1 | 1.888 |
| 2 | 162 |
| 3 | 13 |
| 4 | 32 |
| 5 | 9 |

Los seis `date_prec=0` coinciden con el grupo cuya fecha final cruza
al año 2025. Los 2.104 registros restantes usan valores 1–5.

El estado admitido del archivo pasa a
`SOURCE_PRECISION_CODEBOOK_MISMATCH_REVIEW_REQUIRED` (diagnóstico,
**NO** aprobación) hasta que una fuente normativa permita interpretar
ese 0. En ningún caso se reconcilia un 0 forzándolo a 1–5; una columna
ausente produce asimismo revisión obligatoria. Los controles de
disponibilidad histórica y de ausencia de roster completo siguen cerrados.
