# PSICOHISTORIA — Inventario preciso de predictores del benchmark UCDP anual

**Auditoría 18/10/2026.** Fuente primaria:
`research/psychohistory/benchmark.py:panel()` y
`predict_origin()`, protocolo `ucdp-cy-v2`.
Catálogo operativo privado `PsicoVariables` (13 filas).

## Qué hace el modelo

**No predice el número de muertos.** El objetivo binario es
`sb_total_deaths_best >= 25` dentro de las fronteras de un país
en **todo el año objetivo**. En 2027 produce una probabilidad de superar
ese umbral, no de fallecimientos esperados ni de aparición estricta de una
guerra nueva.

La regresión logística L2 de V2 usa exactamente estas **cinco features**:

| Índice | Entrada | Expresión efectiva para año objetivo t | Valor para 2027 |
| --- | --- | --- | --- |
| x[0] | Actividad estatal última | `1[sb_best_(t-2)>=25]` | umbral 2025 |
| x[1] | Frecuencia de actividad | media de los indicadores anteriores en cinco años consecutivos terminados en t-2 | 2021–2025 |
| x[2] | Intensidad estatal | `log1p(sb_total_deaths_best_(t-2))` | 2025 |
| x[3] | Intensidad no estatal | `log1p(ns_total_deaths_best_(t-2))` | 2025 |
| x[4] | Intensidad unilateral contra civiles | `log1p(os_total_deaths_best_(t-2))` | 2025 |

En entrenamiento, `x` se estandariza con **media/desviación típica
estimadas exclusivamente sobre las filas de entrenamiento de cada
origen**. La logística multivariable estima un intercepto y cinco
coeficientes con regularización L2 fija; no hay actualización en línea,
ni pesos macroeconómicos, geoespaciales o de noticias.

El índice V1 solo promedia las features estandarizadas **x[1] a x[4]**:
**no** incluye x[0] directamente. `interaction_table` utiliza
indicadores `x[0]>0`, `x[1]>0`, `x[3]>0` y `x[4]>0`; **no**
utiliza x[2] directamente en su llave categórica.
`persistence` y `markov` aprovechan por separado el último
estado derivado; `frequency` usa la tasa base global histórica
suavizada. Por eso no es correcto describir los seis modelos como si
todos compartieran las mismas cinco entradas.

La etiqueta secundaria `onset` en el backtest es
`activo_en_t AND NO activo_en_(t-1)`. La actividad t-1 usada para
definir esa etiqueta **no** se convierte en predictor en el momento
de emisión. Su interpretación es episodio agregado país-año, no
inicio UCDP por díada ni riesgo de crisis políticas general.

## Lo que sigue fuera

PIB, inflación, desempleo, desigualdad, democracia, cambios de
régimen, migración, condiciones climáticas, noticias recientes,
relaciones internacionales, comercio, alianzas, contagio fronterizo
y actividad mensual contemporánea **no forman parte** de la cohorte
canónica 2027. No añadirlos implícitamente a explicaciones,
simulaciones del modelo anual ni gráficos de importancia.

No se han exportado en el observatorio actual coeficientes del V2 ni
contribuciones individuales auditadas. No interpretar porcentajes
como efectos causales de las variables. Un ranking no explica
por sí mismo por qué un país recibió una probabilidad.

## Siguiente mejora de interpretabilidad

Para el próximo experimento **separado** de 2027, generar un ledger
privado con, por país: `x` original, medias/escalas de entrenamiento,
coeficientes congelados, `intercept`, contribución lineal por
feature, suma `logit` y probabilidad reproducida con tolerancia
predefinida. No modificar probabilidades ni reentrenar la cohorte
prerregistrada. Priorizar métricas de falsos positivos, calibración y
estabilidad respecto de la fuente/as-of antes de llamar «causa» a
un predictor.

## Metodología de ampliación científica

El nuevo bloque mensual con VIEWS solo constituye un **comparador
externo**; nuestro programa aún NO modela el número de fallecidos
por mes ni ha importado un CSV real de VIEWS. Véase
[PREDICCIONES_MENSUALES_REFERENCIA_VIEWS.md](PREDICCIONES_MENSUALES_REFERENCIA_VIEWS.md).
La ampliación futura a indicadores económicos, institucionales o
meteorológicos exige identificar la disponibilidad real de cada
vintage en cada fecha de emisión y evaluar su mejora sobre modelos
ingenuos y sobre VIEWS sin fuga temporal.

El catálogo de fuente es privado, mientras este contrato técnico
es genérico y puede publicarse.
