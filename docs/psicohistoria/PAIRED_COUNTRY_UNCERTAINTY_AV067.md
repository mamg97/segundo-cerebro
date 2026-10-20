# PSICOHISTORIA · AV-067 — Incertidumbre emparejada entre países, dos tests reales

20/10/2026. **Esta incertidumbre se propone DESPUÉS de observar los resultados 2024 y 2025**. Solo descriptiva: no añade grados de libertad al entrenamiento ni convierte retrospectiva en pronóstico.

## Pregunta adicional

¿El cambio medio de Brier V2 frente a persistence/Markov/interaction_table cambia de signo en remuestreos de países completos, en cada año por separado?

Se resamplean **países** (N=196), conservando emparejada la pérdida del challenger y comparator en cada observación. Semilla fija 20261020, 1.000 réplicas, percentiles 2,5/97,5. Se reporta **diferencia de Brier V2 menos comparator**, por lo que menor que cero favorece V2. Baselines fijos: frecuencia, persistencia, Markov e interacciones. Los mismos resultados, fuentes y código de entrenamiento; no se optimiza ni se escoge modelo ex post.

LÍMITE CIENTÍFICO EXPLÍCITO: los países NO SON independientes, las guerras tienen dependencias regionales, y un año de test NO representa bootstrap temporal; incluso un IC país negativo no confirma estabilidad en otras épocas. Los dos cortes se diseñaron durante la investigación retrospectiva. **No se otorga prospectividad a UCDP 23.1/24.1 ni a la cohorte 2027**. No hay órdenes ni señales de mercado.

El programa `paired_country_uncertainty.py` es puro (sin IO) con controles de IDs, un único año, probabilidades finitas, outcomes binarios, resampling pareado y parámetros fijados. Los reportes de las cohortes 2024 y 2025 añaden solo campos agregados. Material por país no se escribe fuera de la RAM del runner efímero.

## Datos reales, sin selección posterior

Las mismas cohortes oficiales ya registradas se han reejecutado sin cambios de modelado. [CI 2024 #39457269332](https://github.com/mamg97/segundo-cerebro/actions/runs/39457269332) y [CI 2025 #39457269585](https://github.com/mamg97/segundo-cerebro/actions/runs/39457269585): ejecución, unit tests y fuentes oficiales con SHA coincidente, **SUCCESS**. 196 países en cada año. Los intervalos se expresan como diferencias medias de Brier **V2 − comparador**; valores negativos favorecen V2. Los percentiles de países se redondean a 8 decimales.

| Año | Referencia | Diferencia V2 - baseline | IC95% descriptivo por países |
| --- | --- | ---: | --- |
| 2024 | Frequency | -0.11555726 | [-0.15163255, -0.08077467] |
| 2024 | Persistence | -0.01911662 | **[-0.04391946, +0.00188640]** |
| 2024 | Markov | -0.01399365 | **[-0.03132139, +0.00108897]** |
| 2024 | Interaction_table | -0.00313658 | [-0.01100072, +0.00411862] |
| 2025 | Frequency | -0.10710956 | [-0.14318147, -0.07131896] |
| 2025 | Persistence | -0.00407305 | **[-0.01821232, +0.00989815]** |
| 2025 | Markov | -0.00234692 | **[-0.01097375, +0.00686542]** |
| 2025 | Interaction_table | +0.00041797 | [-0.00553457, +0.00716493] |

**Decisión:** V2 supera la frecuencia simple en punto e intervalo descriptivo país, pero **los intervalos contra las dos referencias fuertes cruzan cero en los dos años**. Por tanto el criterio razonable es `EVIDENCIA_INSUFICIENTE_FRENTE_A_REFERENCIAS_FUERTES`, no `SUPERIORIDAD_DEMOSTRADA`. Además el bootstrap no modeliza correlación por conflicto/región ni variación temporal, y fue diseñado ex post. Las estimaciones no deben recibir pruebas confirmatorias ni señal de inversión.

**Trabajo siguiente:** ampliar el número de orígenes y auditar fuente verdadera antes de cada uno; valorar error/modelos en nuevos períodos independientes y avanzar el sello prospectivo 2027. No ajustar V2 para convertir estos intervalos en significativos.
