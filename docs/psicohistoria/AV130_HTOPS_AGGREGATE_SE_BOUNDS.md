# AV-130 · Límites del error estándar agregado de soledad HTOPS

24/10/2026. Diagnóstico de incertidumbre con tablas actuales archivadas.
Complementa AV098 sin identificar la covarianza faltante ni puntuar forecasts.

## Qué puede calcularse

Para dos estimaciones A y B con errores estándar a y b:

`Var(A+B) = a² + b² + 2 Cov(A,B)`.

La desigualdad de Cauchy–Schwarz limita la covarianza entre−ab y+ab.
Por tanto, `|a−b| ≤ SE(A+B) ≤ a+b`. Sumar errores estándar da un
**límite superior**, no el error estándar observado del agregado. Suponer
covarianza cero tampoco está justificado por publicar dos categorías.

Los extremos son compatibles con matrices de covarianza válidas en
general; no se afirma que ambos puedan alcanzarse en este diseño de
encuesta concreto. Son límites exteriores con la información disponible.

## Aplicación a marzo2026

Las fuentes son la [tabla3a de estimaciones](https://www2.census.gov/programs-surveys/demo/tables/hhp/2026/2603/health3a.xlsx)
y su tabla de errores estándar archivada en AV098. Se verificaron hashes
contra el manifiesto existente, etiquetas Always/Usually y fila nacional.
El archivo de errores contiene820.443,631 y1.750.602,899personas en
US!C8:D8. El total publicado de261.534.494adultos se toma como fijo
únicamente para la normalización siguiente.

| Límite del error estándar de Always+Usually | Personas | Puntos porcentuales, denominador fijo |
| --- | ---: | ---: |
| Inferior | 930.159,268 | 0,355655 |
| Superior | 2.571.046,530 | 0,983062 |

Este rango **no es un intervalo de confianza de la prevalencia**. No
incluye sesgo por no respuesta, revisiones o incertidumbre de un
denominador aleatorio. Tampoco establece un cambio real entre olas.

## Implementación y límites

`research/psychohistory/aggregate_se_bounds.py` calcula estos límites
con entradas finitas/no negativas y denominador opcional positivo.
El CLI conserva hashes de entrada/código y rechaza sobrescritura.
Cuatro pruebas analíticas verifican correlaciones extremas, simetría,
casos cero, escala e inputs inválidos. El cálculo real se contrastó con
aritmética Decimal; originales y resultado permanecen privados.

Informe SHA-256:
`34fdcd4f136b19e864dbb47954432a7e596cb48b62382474ca7d324f80188f85`.

SOC-02/03 permanecen PARCIAL/NO. Para obtener un error estándar puntual
del agregado sigue haciendo falta la covarianza o calcularlo con los
80pesos replicados. El siguiente paso es localizar y validar el microdato
y su recodificación, antes de reproducir estimaciones/varianzas nacionales.
El reloj de primera publicación y la continuidad futura del ítem siguen
pendientes. No se altera PsicoPredicciones ni se afirma habilidad.
