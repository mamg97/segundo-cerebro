# PSICOHISTORIA · AV-077 — Probabilidad y tiempo hasta el primer cambio de estado

**Fecha:** 2026-10-20. **Vertientes:** V2 (transiciones) + V4 (auditoría de futuros). **Estado:** EXPLORATORIO_RETROSPECTIVO, no pronóstico emitido ni backtest as-of. **Objetivo:** comprobar si la probabilidad de la *primera transición* se comporta mejor que la clasificación modal del estado anual.

## Definición estricta del objetivo

El indicador original es UCDP `OrganizedViolenceCY 26.1`, violencia organizada con participación de un Estado y umbral anual ≥25 muertes. El modelo tiene cuatro estados (00, 01, 10, 11), que incorporan el estado de *dos años*. Para evaluar la primera salida/entrada se observa exclusivamente el **bit del año actual** (paridad del estado). Para cada país y corte:
1. El estado del último año admitido `cutoff=origin-2` fija el régimen inicial: bajo (0) o alto (1).
2. Se proyecta sin conocer el desenlace del **año puente** (`origin-1`) y luego todos los años objetivo hasta 2025. La masa que cruza el umbral queda **absorbida** y nunca se cuenta por segunda vez.
3. Vector del resultado: primer cambio en cada año proyectado más categoría final `sin cambio hasta 2025` (censurado a horizonte fijo, no missing).
4. La evaluación busca la **primera** diferencia del bit actual observado en la edición revisada UCDP; si existe `null` intermedio, el país **no es evaluable** para este criterio completo. El puente aporta una etiqueta ex post, NUNCA se utiliza para condicionar la predicción.
5. **Brier multicategoría** sobre las 12 posibilidades (11 años + censura) para el corte 2014, u 8 (7 + censura) para corte 2018. Complementariamente log loss del resultado real con recorte numérico de probabilidad cero en 1e-12 (reportar siempre número de imposibles, nunca vender el log loss recortado como log score auténtico). Brier medio acumulado durante el seguimiento, no independiente por año.

**Criterio diferenciador respecto a AV-076:** la clasificación modal de `10 Salida` podía fallar, aunque la probabilidad del evento fuera positiva. Este protocolo mira el primer cruce, penaliza probabilidades inconsistentes y no equipara «sin cambio» a detección de un evento.

El script reproducible es `research/psychohistory/audit_future_first_passage.mjs`, consume solamente un JSON de catálogo local (no descarga ni modifica registros) y emite **agregados sin nombres ni IDs de países**. Todos los algoritmos de transición usan `transitionMatrix` del motor original, sin reentrenamiento. Las pruebas sintéticas demuestran conservación de masa, diferentes riesgos con memoria2, evento en puente, censura, ausencia de observaciones y probabilidad cero.

## Resultados directos a partir de PsicoExperimentos

Catálogos: `3e3354a6acf0-catalog-2016` (195 países, último dato 2014, 11 pasos hasta 2025) y `3e3354a6acf0-catalog-2020` (196 países, último dato 2018, 7 pasos). En los primeros 34/195 países (17,44 %) se registró al menos un cambio en 2015–2025; 161 sin cambio hasta 2025. De los 34, 7 ocurrieron en el año puente 2015. En los siguientes 23/196 países (11,73 %) se registró al menos uno en 2019–2025; 173 sin cambio, de los cuales 4 cambios fueron en el puente 2019. Las dos cohortes se superponen y no representan 391 experimentos independientes.

| Modelo original | Brier primer cambio: origen 2016 (N=195) | Brier primer cambio: origen 2020 (N=196) | Log loss 2016, log(1e-12) cuando p=0 | Log loss 2020 |
| --- | ---: | ---: | ---: | ---: |
| **Markov por país regularizado** | **0,311503** | 0,234409 | **0,851978** | **0,599283** |
| Memoria de dos estados | 0,332336 | **0,234234** | 0,896840 | 0,612671 |
| Persistencia determinista | 0,348718 | 0,234694 | **4,817717 (34 imposibles)** | **3,242416 (23 imposibles)** |
| Markov global | 0,365609 | 0,262633 | 0,994832 | 0,678366 |
| Frecuencia constante | 0,927533 | 0,766566 | 3,793180 | 2,831446 |

Los casos que empiezan en régimen alto son mucho menos numerosos: **30** en 2014 (13 cambian al menos una vez) y **33** en 2018 (10 cambian). Deben analizarse por separado y con intervalos de incertidumbre por país, pero estos valores resultan insuficientes para afirmar superioridad por subgrupo sin validación.

### Túnez: transición observada de 2017 desde corte 2014

Estado inicial `11` (alto). El modelo Markov global utiliza una tasa estacionaria de salida de `(135+1)/(135+604+2) = 18,3536 %` por paso, mientras no ha salido. La probabilidad no condicionada de que el **primer** cruce a régimen bajo ocurriera en **2017** (tercer paso, habiendo sobrevivido 2015 y 2016) fue **12,2347 %**; la probabilidad acumulada de haber salido **no después de 2017** fue **45,5734 %**. La probabilidad de no salir en todo 2015–2025 fue **10,7475 %**. La primera observación ex post fue precisamente 2017. Esto aclara la confusión entre probabilidad de *estar* bajo un umbral en un año, probabilidad de *estar en estado 10*, y probabilidad de *primera transición* exactamente ese año.

**Advertencia:** la trayectoria histórica de Túnez fue seleccionada porque observamos el fallo. Su análisis y la inspección de ambas cohortes son exploratorios, no un experimento previamente registrado. No se recomiendan ajustes ni negociación bursátil a partir de este resultado.

## Hallazgos y siguientes falsaciones

1. La persistencia simple (sin ninguna transición) es un baseline robusto para distribuciones anuales desbalanceadas, pero **imposibilita todos los cambios** y por ello no es buena única referencia para análisis del primer evento.
2. Markov global es relativamente peor en estos registros; el modelo regularizado y memory2 reducen el Brier de tiempo hasta el primer cambio, sin demostrar causalidad ni predicción prospectiva.
3. **No hay validación de vintage/as-of original**: todos los desenlaces provienen de la edición retrospectiva UCDP 26.1. La observación actual del archivo no certifica lo que podía saberse en 2014/2018. Las muestras temporales y países son dependientes y los errores pueden cambiar por revisiones del indicador.
4. **MAD-04 sigue parcial.** Diseñar un test nuevo temporalmente bloqueado para transiciones con (i) duración en régimen y señales históricamente disponibles, (ii) baselines persistencia, memory2 y país regularizado, (iii) supervivencia/hazard, Brier de primer paso y calibración condicional a país inicial, (iv) intervalos por bootstrap agrupado por país o mejor bloques regionales-temporales. No ajustar y evaluar sobre estas mismas cohortes como si fueran pruebas independientes.
5. Publicar únicamente estadísticas agregadas y registrar versión SHA + fecha de corte de cualquier cohorte futura. **2027 SHADOW_NO_EMITIDO**; no tocar `PsicoPredicciones`, no emitir tasas de conflictos actuales, no elaborar señales de trading.

**Conservación:** los nuevos cálculos no modifican modelos, matrices, datos, fuentes privadas, UI ni infraestructura.
