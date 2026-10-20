# PSICOHISTORIA · AV-081 — ¿La ventaja de Markov por país se sostiene?

**2026-10-20. V2/V4. Estado:** `POSTHOC_SINGLE_ORIGIN_DESCRIPTIVE_ONLY`. No predicción prospectiva, no habilidad demostrada. [PR #750](https://github.com/mamg97/segundo-cerebro/pull/750).

## Protocolo inmutable

La investigación AV-080 produjo `OrganizedViolenceCY 24.1` como única fuente de parámetros hasta 2023 y `OrganizedViolenceCY 26.1` únicamente para los desenlaces de 2024 y 2025. El objetivo de tiempo de primer cambio contiene tres clases: primer cruce en 2024, primer cruce en 2025 o sin cruce. El modelo nunca observa el puente 2024 al calcular una probabilidad ni admite revisiones de 26.1 en sus características.

Para comprobar **incertidumbre de la ventaja Brier**, se calculan las diferencias emparejadas país por país contra persistencia (Brier modelo − Brier persistencia), con 3.000 remuestreos pseudoaleatorios reproducibles (seed 54181) **estratificados por régimen inicial bajo/alto**, conservando 162 y 34 países por estrato. El código inmutable para la comparación es `research/psychohistory/release_first_passage_uncertainty.py`, verificado por `test_release_first_passage_uncertainty.py` y el workflow existente `.github/workflows/psychohistory-frozen-vintage-holdout.yml`.

**Fuentes originales oficiales, ZIP con hash fijado:** 24.1 SHA-256 `00410bdb65023d1bc8799f47f188677965046bb73447ee33094782db30076260`; 26.1 SHA-256 `66910888f5653af42776d2debc1d72fe527559e7f7fc82e69b7c8771467f2d34`.

## Resultados oficiales agregados

Misma muestra AV-080: **196 países**, de los cuales 162 empezaron con estado anual bajo, 34 alto. Se observaron **8 primeros cambios** (5 en 2024, 3 en 2025), y **188 países** permanecieron sin cambio. Tasa empírica de primer cambio 4,0816 %. Wilson descriptivo 95 %, bajo supuesto **no demostrado** de independencia: 2,0825–7,8461 %.

| Modelo vs persistencia | ΔBrier medio (modelo − persistencia) | Intervalo percentil 95 % de países estratificados | ¿Cruza cero? |
|---|---:|---:|---|
| Markov por país regularizado | **−0,002334** | **[−0,022757; +0,014653]** | **Sí** |
| Memoria de dos estados | −0,000745 | [−0,020929; +0,015543] | Sí |
| Markov global | +0,005891 | [−0,012761; +0,021544] | Sí |
| Frecuencia global constante | +0,319359 | [+0,254212; +0,372600] | No |

La frecuencia constante es peor en estos países y este período, pero ello no implica generalización histórica ni superioridad prospectiva del resto.

### El conflicto entre sensibilidad a eventos raros y falsa alarma

| Modelo | Brier medio en 8 países con primer cambio | Brier medio en 188 países SIN cambio |
|---|---:|---:|
| Markov por país | 1,472105 | 0,020031 |
| Memoria 2 estados | 1,551538 | 0,018306 |
| Persistencia determinista | **2,000000** | **0,000000** |
| Markov global | 1,530285 | 0,026130 |
| Frecuencia constante | 0,994195 | 0,375749 |

En *esta muestra*, Markov por país asigna masa positiva a los cambios y supera a persistencia para el subconjunto de eventos, pero genera error donde el país se mantiene estable. Estos subconjuntos están **definidos a posteriori** por las etiquetas, no son dos cohortes independientes de prueba. Ninguna de estas diferencias autoriza ajuste posterior de hiperparámetros ni selección de un campeón.

**Control de fugas: SUCCESS.** El cambio de cifras revisadas 2023 en 26.1 no altera los resultados ni las probabilidades aprendidas; alterar las etiquetas 2024 sí cambia la evaluación y no los parámetros. Los archivos corruptos o con huecos internos se rechazan en la ingesta. Las estadísticas de salida no contienen nombres ni identificadores por país y todos los datos originales efímeros se eliminan al acabar la ejecución.

## Decisión científica

**No hay campeón verificado**. El intervalo de ΔBrier de Markov por país y memoria2 incluye cero. Solo 8 eventos para estimar la probabilidad de cambio y una ventana temporal solapada de dos años; países y regiones comparten shocks, de modo que la banda por país no proporciona incertidumbre completa ni evidencia prospectiva. Fuente 24.1 descargada hoy carece de testimonio independiente que pruebe su disponibilidad exacta en 01/01/2025. Tampoco existía entonces un modelo con pronóstico sellado según este experimento. **No usar estos resultados para trading o predicciones actuales.**

**Siguiente estudio sugerido:** buscar un origen separado con edición OrganizeViolenceCY 23.1 de archivo, reconstrucción semántica XLSX y test posterior de 2024 en 25.1; medir cambios de cobertura y fechas de publicación verdaderas. Si no son verificables, seguir denominando retrospectivo. A medio plazo: nueva cohorte prospectiva congelada antes de que suceda el resultado, calibración de hazard del primer cambio, intervalos regional-temporales y comparación contra todos los modelos existentes.

No se modifican datos canónicos de UCDP, modelo, registros de predicciones ni 2027 SHADOW_NO_EMITIDO.
