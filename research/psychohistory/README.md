# Psicohistoria — motores experimentales v0.1

Código público genérico; los datos reales NO se versionan aquí.

## Benchmark real v0.2

`download.mjs` verifica dos descargas oficiales UCDP por SHA-256; `benchmark.py` audita el panel país-año y ejecuta seis comparadores con walk-forward, dos objetivos, métricas completas, incertidumbre temporal, sensibilidad low/high y una rejilla ABM sintética. `registry.py` prepara filas para el registro privado, sin publicar ni escribir automáticamente. Python estándar; Node para descargas; coste incremental cero.

Contrato y ejecución: [PSYCHOHISTORY_BENCHMARK.md](../../docs/PSYCHOHISTORY_BENCHMARK.md). **Release histórica revisada, no disponibilidad as-of demostrada.** Los resultados numéricos permanecen en las fuentes privadas. `sealing.py` prepara compromisos y verifica recibos RFC3161; no contacta ninguna autoridad ni habilita el scoring prospectivo en producción.

- V1: índice estructural explícito de indicadores normalizados con pesos prefijados, transformado a probabilidad mediante logística calibrada en entrenamiento.
- V2: regresión logística regularizada y baseline Laplace.
- V3: simulación simple de contagio por umbrales en red con semillas reproducibles.
- V4: backtest rolling-origin, Brier pareado, Brier Skill y control de disponibilidad temporal.

## Demo reproducible (SOLO DATOS SINTÉTICOS)

python3 research/psychohistory/engines.py --synthetic-demo --test-from 2025-01-01

## Datos externos

python3 research/psychohistory/engines.py --csv /ruta/privada/panel.csv --features tension,polarizacion --test-from 2023-01-01 --output /ruta/privada/evaluacion.json

Columnas requeridas:
country,issued_at,resolved_at,feature_as_of,target,<columnas numéricas de los indicadores>

Fechas ISO YYYY-MM-DD. El objetivo es binario. feature_as_of <= issued_at < resolved_at. El panel debe expresar inequívocamente a qué episodio/horizonte corresponde target. El backtest solo usa filas de entrenamiento cuya etiqueta ya estuviera resuelta en la fecha de emisión evaluada; la normalización y el ajuste se aprenden únicamente con esas filas.

**Precauciones:** esta versión no reconstruye automáticamente las distintas revisiones históricas de datasets, no tiene bootstrap bloqueado, no adjudica causalidad y utiliza pesos V1 iniciales arbitrarios. Por ello **no es un modelo científicamente validado ni listo para forecasting real**. No añadir la salida de esta demo a PsicoPredicciones/PsicoKPIs como resultados observados.

Próximo paso: definir un evento real, auditar dataset abierto, congelar hipótesis y baseline, fijar origen de las etiquetas y ejecutar evaluación histórica más estricta. Solo después emitir pronósticos prospectivos.
