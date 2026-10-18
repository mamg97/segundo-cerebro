# PSICOHISTORIA — Núcleo científico primero: puerta de evidencia v1

**18/10/2026 · Decisión:** posponer los experimentos bursátiles hasta
disponer de una señal predictiva reproducible y convincentemente validada
en el núcleo de conflictos y fenómenos colectivos.

## La pregunta correcta

No buscamos un algoritmo que dibuje porcentajes, sino un **método
probabilístico generalizable** que permita anticipar acontecimientos
colectivos **desconocidos al emitirlo**, y que supere referencias sencillas
sobre los mismos ejemplos.

Dos problemas que no deben confundirse:

- `presence`: violencia estatal >=25 fallecidos durante año objetivo.
  El éxito histórico puede deberse en gran medida a **persistencia**.
- `onset`: transición agregada desde un año previo por debajo de 25
  fallecidos a un año >=25. Es **más raro y difícil**; tampoco representa
  el inicio formal de una guerra según díadas UCDP ni un suceso causal.
  El histórico revisado 2016–2025 muestra Brier aproximadamente
  **0,017576 (frequency) vs 0,017557 (V2)**: diferencia diminuta.
  No afirmar skill demostrado.

Los experimentos previos de GED país-mes y reaparición 24m son
retrospectivos sobre GED 25.1 revisado; la evaluación no solapada de
reaparición usa únicamente **tres fechas de test**. No equivale a
tres años de predicciones emitidas ni permite inferencia estadística
sólida. La puerta anterior `ged_asof_provenance.py` sigue rechazando
vintages Candidate sin evidencia histórica propia.

## Puerta de falsación de un modelo candidato

`research/psychohistory/core_model_readiness.py` audita el informe
anual `retrospective_revised_release` intacto y compara
`v2_logistic` y `frequency` sobre EXACTAMENTE la misma población,
por separado para `presence` y `onset`. Exige:

1. N y positivos idénticos para los dos modelos, 10 años test fijos
   2016–2025, mismos años y denominadores de los scores anuales.
2. El Brier anual recombina el resultado agregado sin discrepancias.
3. Brier Skill puntual positivo **y extremo inferior positivo** del
   intervalo emparejado de bootstrap por bloques de años. Este último
   intervalo es descriptivo, condicionado al modelo entrenado y a solo
   diez años; NO equivale a prueba estadística definitiva.
4. Mejora positiva en **ambas mitades prefijadas**, 2016–2020 y
   2021–2025; al menos 20 positivos en la evaluación anual. Son
   **umbrales de prudencia metodológica**, no leyes universales.
5. Al superar estos tests, el estado es solamente
   `RESEARCH_CANDIDATE_NOT_CONFIRMATORY`. Nunca pasa automáticamente a
   `operational_model_approved`.

Esta puerta se diseñó **después de observar los backtests previos**.
Por ello es una disciplina de investigación, NO un protocolo
confirmatorio independiente de dichos resultados. Antes de declarar
habilidad científica, se debe:

- Reconstruir `as-of` real con vintages Candidate del periodo y
  ámbito geográfico apropiados; las fuentes definitivas revisadas no
  sirven como si existieran íntegramente en cada origen.
- Comparar con baseline fuerte de persistencia/recencia local y
  con modelos externos solo cuando target/universo y fecha coincidan.
- Hacer suficientes orígenes temporales no solapados y estimar
  precisión/calibración, dispersión temporal, tasa de positivos,
  sensibilidad al cambio de vintage y cobertura.
- Emitir pronósticos prospectivos reales con evidencia temporal
  independiente, sin mirar el resultado; actualizar los scores
  solo cuando el horizonte y la fuente oficial hayan madurado.
- Aplicar una nueva confirmación en datos que no se hayan utilizado
  en selección ni diseño del gate. Una métrica retrospectiva no
  demuestra conocimiento del futuro.

## Uso offline privado

```sh
python3 research/psychohistory/core_model_readiness.py \
  --report /PRIVATE/benchmark_report.json
```

El script no modifica predicciones; solo imprime estado de aceptación
y recuentos agregados. Los valores país-año y la evidencia real
permanecen en Drive privado. La CI ejecuta exclusivamente fixtures
sintéticos que comprueban alteraciones de métricas, falta de eventos,
inestabilidad temporal y falsas declaraciones prospectivas.

## Repriorización F1B bolsa

`research/psychohistory/equities_drawdown_research.py` se conserva
como prototipo sintético sin datos reales, trading ni costes, pero
queda marcado `PARKED` hasta que exista un modelo central con
validación temporal `as-of` y evidencia prospectiva suficiente.
No se borran tests ni cambia MIDAS. Evitar invertir recursos en
páginas bursátiles, optimización de carteras o compra/venta hasta
entonces. **Una vez validado el método científico**, un proyecto de
mercados recibirá **su propio** target, fuentes temporales, benchmarks
y validación, sin trasplantar directamente un modelo de violencia.

## Próxima acción empírica

La [lista oficial de versiones Candidate](https://ucdp.uu.se/downloads/olddw.html)
publica snapshots mensuales de distintos años, y su [download center](https://ucdp.uu.se/downloads/)
identifica explícitamente revisiones preliminares. El siguiente
experimento debe reconstruir un panel con **fechas reales de
publicación y geografía verificadas**, empezando por un vintage
concreto. En ausencia de ese input, detener el backtest as-of y
registrar `NO_EVALUABLE` en vez de imputar ausencia de violencia.

La regla no pretende demostrar que Asimov tenía razón: impone criterios
por los que una hipótesis psicohistórica pueda **fallar públicamente**.
