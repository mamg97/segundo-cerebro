# Psicohistoria — Ejecución explicable v0.5.9

## Implementado y alcance

La primera experiencia de «Calcular predicción retrospectiva» reutiliza **Futures Engine** y sus cinco modelos reales: frecuencia, persistencia, Markov global, Markov por país regularizado y memoria de dos estados. No crea una predicción prospectiva ni modifica los datos canónicos.

`GET /api/research-futures` continúa calculando el resultado con `buildFutures`. El servidor genera además `psychohistory.futures.computation_trace.v1` mediante `buildComputationTrace`, aplicando los mismos conteos, matriz y propagaciones: comprueba igualdad numérica entre cada multiplicación y los niveles del motor, masa total 1, el año puente sin observar y baseline de frecuencia en la misma cohorte y horizonte. Una discrepancia provoca rechazo del cálculo, nunca un panel ficticio.

El frontend `app/research-explainable.mjs` verifica de nuevo los frames contra el resultado recibido antes de dibujarlos. Cada clic sobre «Inspeccionar cálculo / Siguiente operación» **reproduce valores ya calculados**: no crea una barra de progreso de CPU ni vuelve a ajustar el modelo. En el inspector se muestra explícitamente «reproducción retrospectiva». Desde **UI v0.5.10**, el panel de selección y el aviso de backtest quedan **encima** del grafo; el grafo probabilístico continúa como **primer resultado analítico** y la ejecución explicable aparece debajo de él. Antes de v0.5.10 el grafo estaba por encima de los selectores.

## Secuencia auditable

1. Fuente y corte; se declara la edición retrospectiva revisada y el año puente no observado.
2. Conteos históricos realmente incluidos en el ajuste y tratamiento de suavizado; persistencia es determinista.
3. Matriz estocástica 4×4, con transiciones permitidas e imposibles.
4. Propagación al año puente no observado, sin condicionar en el resultado posterior.
5. Propagación año a año con cuatro sumas de productos por transición.
6. Distribución final comparada con el baseline de frecuencia sobre la **misma fecha y país**, sin fabricar una medida de skill.

Los elementos `runId`, `protocolSha256`, `codeSha256`, versión y cortes se arrastran del catálogo privado. El motor no incluye un registro prospectivo ni demuestra vintage-correct/as-of; los intervalos son incertidumbre paramétrica condicionada, no evidencia de cobertura prospectiva. El frontend rechaza frames manipulados, probabilidades no normalizadas y claims prospectivos no fundamentados.

## Gobierno y privacidad

- Los módulos JS y las pruebas de Git usan exclusivamente **fixtures sintéticos**. La traza real viaja sobre la API ya protegida por Cloudflare Access, no se escribe en Git, consola, D1 ni en archivos temporales.
- No se añade coste recurrente ni polling. Las etapas son replays locales controlados con botones, sin temporizadores. Respetar `prefers-reduced-motion`.
- En caso de ausencia de catálogo o de traza válida, la UI no muestra una alternativa sintética como si fuera real.
- V1–V4 continúan siendo vertientes del laboratorio, no cuatro modelos específicos de este motor. Cada dominio predictivo futuro necesita su propia variable objetivo, fuente y contrato de traza.
- La generación de trazas por sí misma no emite pronósticos, ni asigna un sello temporal externo.

## Siguiente iteración

Registrar predicciones prospectivas en un ledger privado create-only, con hash de contenido y cadena de integridad, sin declarar inmutabilidad probatoria hasta integrar sellado externo independiente, procedencia de los datos as-of y política de resolución. Evitar reutilizar la arquitectura del replay como si fuera un registrador prospectivo.
