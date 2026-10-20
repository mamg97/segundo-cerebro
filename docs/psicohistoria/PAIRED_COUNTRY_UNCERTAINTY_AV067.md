# PSICOHISTORIA · AV-067 — Incertidumbre emparejada entre países, dos tests reales

20/10/2026. **Esta incertidumbre se propone DESPUÉS de observar los resultados 2024 y 2025**. Solo descriptiva: no añade grados de libertad al entrenamiento ni convierte retrospectiva en pronóstico.

## Pregunta adicional

¿El cambio medio de Brier V2 frente a persistence/Markov/interaction_table cambia de signo en remuestreos de países completos, en cada año por separado?

Se resamplean **países** (N=196), conservando emparejada la pérdida del challenger y comparator en cada observación. Semilla fija 20261020, 1.000 réplicas, percentiles 2,5/97,5. Se reporta **diferencia de Brier V2 menos comparator**, por lo que menor que cero favorece V2. Baselines fijos: frecuencia, persistencia, Markov e interacciones. Los mismos resultados, fuentes y código de entrenamiento; no se optimiza ni se escoge modelo ex post.

LÍMITE CIENTÍFICO EXPLÍCITO: los países NO SON independientes, las guerras tienen dependencias regionales, y un año de test NO representa bootstrap temporal; incluso un IC país negativo no confirma estabilidad en otras épocas. Los dos cortes se diseñaron durante la investigación retrospectiva. **No se otorga prospectividad a UCDP 23.1/24.1 ni a la cohorte 2027**. No hay órdenes ni señales de mercado.

El programa `paired_country_uncertainty.py` es puro (sin IO) con controles de IDs, un único año, probabilidades finitas, outcomes binarios, resampling pareado y parámetros fijados. Los reportes de las cohortes 2024 y 2025 añaden solo campos agregados. Material por país no se escribe fuera de la RAM del runner efímero.
