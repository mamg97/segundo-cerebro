# PSICOHISTORIA · AV-083 — Riesgo de primer cambio condicionado a duración de régimen

**21/10/2026 · V2/V4 · EXPLORATORIO · Sin emisión ni habilidad prospectiva demostrada**

## Hipótesis y construcción

Los estados de violencia del motor original son discretos, basados en `sb_total_deaths_best ≥ 25` (OrganizedViolenceCY), y los modelos de transición existentes utilizan tasas estacionarias o una memoria corta. Se explora si **el tiempo consecutivo en el mismo régimen (≥25 / <25 muertes)** ayuda a estimar el **primer cruce** de umbral en los próximos dos años.

- Variable estrictamente calculada con registros país-año **anteriores al origen**: número de años consecutivos de bit anual igual al de su último año admitido. El cómputo se detiene ante una observación faltante y nunca imputa años.
- Buckets fijados en el código antes de ejecutar AV-083: **1, 2–3, 4–7 y ≥8 años**.
- Por tipo de régimen `r`, estimar tasa de salida global a partir de *pares históricos* `t-1,t` anteriores al cutoff: `q_r=(N_change+1)/(N_total+2)`. Por bucket `d`, suavizar mediante `h_(r,d)=(N_change(r,d)+20*q_r)/(N_total(r,d)+20)`. Concentración fija **20** (inspirada en el mismo orden de regularización anterior; **no estimada mediante el test**).
- Al pronosticar, `P(primer cambio en año 1)=h(r,edad)`, `P(primer cambio en año 2)=[1-h(r,edad)]*h(r,edad+1)`, `P(sin cambio)=[1-h(r,edad)]*[1-h(r,edad+1)]`.
- Las tasas se ajustan únicamente con filas hasta 2022 o 2023. Cinco modelos preexistentes `frequency, persistence, markov, memory2, country_shrinkage` se ejecutan **sin modificar ninguno de sus parámetros**.

Código: `research/psychohistory/duration_hazard_first_passage.py`; pruebas sintéticas `test_duration_hazard_first_passage.py`; workflow `.github/workflows/psychohistory-duration-hazard.yml`. Descarga temporal de archivos oficiales; lectores existentes verifican SHA-256 estricto, se destruyen los archivos y solo se publican estadísticas agregadas (sin nombres, IDs, probabilidades o pérdidas por país). La alteración de filas 2022/2023 de las ediciones posteriores no afecta aprendizaje ni métricas; cambiar outcomes 2024 sí afecta solo scoring. Tests, privacy y engine CI: **SUCCESS** en PR #753.

## Resultados oficiales en dos ventanas solapadas

| Modelo | Entrena 23.1 hasta 2022 / evalúa 25.1 2023–24 | Entrena 24.1 hasta 2023 / evalúa 26.1 2024–25 |
| --- | ---: | ---: |
| **Hazard por duración AV-083** | **0,089821** | **0,078591** |
| Country shrinkage (Markov por país regularizado) | 0,093725 | 0,079299 |
| Memoria dos estados | 0,095549 | 0,080887 |
| Persistencia | 0,112245 | 0,081633 |
| Markov global | 0,109672 | 0,087524 |
| Frecuencia global | 0,406585 | 0,400992 |

Cada ventana evalúa 196 países; **2023–2024**: 11 primeros cruces (7 + 4), 185 sin cambio; **2024–2025**: ocho (5 + 3), 188 sin cambio. Los resultados usan Brier multicategoría **tiempo del primer cruce en dos años, o ausencia de cambio**, no Brier anual.

En las dos ventanas, el nuevo hazard obtiene el menor error Brier **sobre estos mismos resultados históricos ya inspeccionados**. No seleccionar campeón.

## Desglose por clase observada: qué se está mejorando realmente

| Ventana | Modelo | Brier sobre países con **primer cambio** | Brier sobre países **sin** cambio |
| --- | --- | ---: | ---: |
| 2023–24 | Hazard duración | 1,339867 | 0,015493 |
| 2023–24 | Country shrinkage | **1,326314** | 0,020436 |
| 2024–25 | Hazard duración | 1,585968 | 0,014447 |
| 2024–25 | Country shrinkage | **1,472105** | 0,020031 |

El hazard de duración **no anticipó mejor las transiciones observadas** en estas dos ventanas que country shrinkage; ganó globalmente por **menor error en la clase mayoritaria estable**. Esto reduce la fuerza de la hipótesis de anticipación de puntos de inflexión, aunque justifica investigar calibración temporal más precisa.

## Incertidumbre emparejada, descriptiva y post hoc

Tres mil bootstrap por país, **pareados entre los dos modelos** y estratificados por régimen inicial alto/bajo. Seeds `56205` y `56206` para cortes 2022 y 2023. Diferencia de Brier = hazard duración menos el modelo comparado (negativo favorece al hazard).

| Ventana | Referencia | ΔBrier medio | Banda percentil 95 % |
| --- | --- | ---: | --- |
| 2023–24 | Country shrinkage | −0,003905 | [−0,018013; +0,010333] |
| 2023–24 | Persistencia | −0,022424 | [−0,051856; +0,002429] |
| 2024–25 | Country shrinkage | −0,000708 | [−0,010518; +0,009774] |
| 2024–25 | Persistencia | −0,003041 | [−0,022141; +0,012041] |

**Todas las bandas incluyen cero.** Además, 2024 se repite entre las dos muestras y los países comparten shocks geopolíticos; las bandas no modelan dependencia regional ni certifican habilidad futura. Con pocos primeros cruces no resulta razonable afirmar victoria del nuevo modelo.

## Decisión y continuidad

1. **Conservar** hazard duración como prototipo de investigación V2/V4. **No promocionar a motor del Explorador, alertas, cartera o 2027**. No cambiar el ensemble ni `PsicoPredicciones`.
2. La próxima hipótesis científicamente relevante será la **interacción con señales preexistentes**, diferenciando países estables y transiciones raras, y exige evaluar en un nuevo período futuro y no seguir midiendo sobre los años ya consultados.
3. Registrar por adelantado horizonte, `risk set`, baseline fuerte (country shrinkage/persistencia), métrica para primeros cambios, calibración condicional por régimen y procedimiento de incertidumbre regional/temporal. **No usar AV-083 como un holdout independiente ni como selección confirmatoria.**
4. Las ediciones antiguas, aunque con checksum actual, carecen de fecha independiente acreditada en el origen hipotético. No hay predicción sellada del momento. Sigue `2027 SHADOW_NO_EMITIDO`.

**Límite:** mejora de una métrica histórica ≠ anticipación fiable de conflictos ≠ estrategia bursátil rentable.
