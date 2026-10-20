# PSICOHISTORIA · AV-078 — Incertidumbre de los errores del primer cambio

**Fecha:** 20/10/2026 · V2/V4 · **RETROSPECTIVO_EXPLORATORIO**. Continuación del AV-077: las diferencias del Brier medio de un catálogo revisado no bastan para proclamar modelo ganador.

## Protocolo y reproducibilidad

Se emplean los mismos cinco modelos originales, exacto objetivo `tiempo hasta primera entrada o salida del régimen anual de 25 muertes UCDP`, y los catálogos canónicos 2016 y 2020, sin reentrenar. Para cada país se calcula **una** diferencia de Brier `modelo - persistencia` usando *el mismo* desenlace; los vectores de cambios son pareados y se remuestrean juntos.

Script autónomo: `research/psychohistory/audit_future_first_passage_bootstrap.mjs`; prueba sintética `audit_future_first_passage_bootstrap.test.mjs`. Remuestreo con reposición de países **estratificado por régimen inicial bajo/alto** (preserva N bajo/alto de cada cohorte), generador xorshift32 con seed `54117 + año_origen`, 2.000 réplicas, percentiles empíricos 2,5 y 97,5. Brier multicategoría sobre `primer cambio en un año` más `censurado sin cambio al final`, no Brier de un estado anual. Un cambio de signo del intervalo NO debe interpretarse como prueba confirmatoria.

**Límite mayor:** países geopolíticamente dependientes y catálogos 2016/2020 con años solapados y fuentes revisadas UCDP 26.1; el bootstrap por país subestima potencialmente la incertidumbre de **regiones/años/ediciones**. Estos intervalos son **descriptivos condicionales a la cohorte observada**, no CI validados de una habilidad prospectiva, no ensayos pre-registrados y NO as-of.

## Resultados reales, Δ Brier frente a persistencia (negativo = mejor)

| Modelo | Origen 2016: Δ Brier [percentiles 95 %] | Origen 2020: Δ Brier [percentiles 95 %] |
| --- | --- | --- |
| Markov país regularizado | −0,037215 [−0,100844; +0,025317] | −0,000285 [−0,048743; +0,046997] |
| Memoria dos estados | −0,016382 [−0,070129; +0,035426] | −0,000459 [−0,041103; +0,038488] |
| Markov global | +0,016891 [−0,044511; +0,076362] | +0,027939 [−0,019522; +0,075509] |
| Frecuencia constante | +0,578815 [+0,471559; +0,678750] | +0,531872 [+0,441276; +0,616833] |

Origen 2016: 195 países evaluables (165 inicialmente bajo, 30 alto), 34 con cambio. Origen 2020: 196 (163 bajo, 33 alto), 23 con cambio. Ningún intervalo de los tres primeros modelos comparativos excluye cero. La frecuencia constante aparece peor en ambas muestras, pero incluso esa discrepancia **no constituye por sí sola validación futura**. No se selecciona un ganador.

## Decisión científica

**Ningún modelo queda promovido** por AV-077/078. El hallazgo de Túnez es un ejemplo retrospectivo del problema del cambio de régimen, no una justificación para tunear características y re-evaluar estos mismos años. El siguiente desarrollo tendrá que verificar **disponibilidad as-of auténtica**, definir por anticipado cohortes temporales independientes, estimar riesgo/hazard por régimen inicial, considerar agrupación regional/temporal y realizar evaluación prospectiva sellada. Un modelo sin transición (persistencia) mantiene su valor de benchmark, pero no debe confundirse con probabilidad calibrada de primer cambio.

**Salvaguardas:** sin tocar la publicación web, Worker privado, matrices, UCDP canónico, `PsicoPredicciones` ni el 2027 `SHADOW_NO_EMITIDO`. No se generan señales de trading ni probabilidades actuales.
