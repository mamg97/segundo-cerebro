# PSICOHISTORIA · AV-082 — Segunda ventana de primer cambio: versiones 23.1 → 25.1

**20/10/2026 · V2/V4 · ESTADO: RETROSPECTIVO SEPARADO POR EDICIÓN, SIN EMISIÓN HISTÓRICA.**

## Diseño

Se reproduce el horizonte de dos años **2023–2024**, distinto de AV-080/081 (**2024–2025**), pero **solapado en 2024**. Los modelos ya existentes no cambian. Se entrena solamente con la edición auténtica UCDP **OrganizedViolenceCY 23.1 (XLSX)** hasta 2022 y se evalúa solamente con los años 2023–2024 de **OrganizedViolenceCY 25.1 (CSV ZIP)**. Estado inicial del país: 2021–2022. El **año puente 2023** se integra en las transiciones sin utilizarlo como entrada; resultado = primer cambio en 2023, primero en 2024 o ningún cambio hasta 2024.

SHA-256 originales verificados en workflow:
- 23.1 XLSX: `6c7dc09cc3173b21568a88d70862bee6a9199b2c6b217719698d9298ca8ecaff`
- 25.1 CSV ZIP: `564ce9a33652a5d7adef30f00ce6ac86411dedbcc10ef60ca9bdfbfeb9fea917`

Código `research/psychohistory/historic23_first_passage_2024.py` reutiliza validadores oficiales y matrices `futures.py`. El scorer nunca utiliza datos de edición 25.1 para el fit, la selección del universo o las matrices. Pruebas unitarias de cuatro aspectos: integridad, cambio de etiquetas futuras sin modificar fit, revisión 2022 nueva sin contaminar fit y exclusión de países con etiquetas futuras incompletas. La muestra solo puede reducirse si falta algún resultado; ausencia en fuente NO significa cero. Las salidas contienen únicamente sumarios agregados, no country ID, ni predicciones individuales.

## Resultado oficial observado

**196 países**, estados iniciales 159 bajos y 37 altos. Primer cambio de umbral en **2023 para siete países**, **2024 para cuatro**, y **sin cambio para 185**. Total 11 primeros cambios. Ninguna exclusión por etiqueta futura ausente; ninguna modificación del bit binario 2022 comprobable en ambas ediciones. Una revisión del conteo de muertes que conserve el umbral puede existir.

| Modelo | Brier multicategoría del momento del primer cambio | Log loss recortado a 1e-12 | Estados verdaderos de probabilidad nula |
| --- | ---: | ---: | ---: |
| **Markov país regularizado** | **0,093725** | **0,198509** | 0 |
| Memoria dos estados | 0,095549 | 0,225519 | 0 |
| Persistencia determinista | 0,112245 | 1,550721 | **11** |
| Markov global | 0,109672 | 0,251343 | 0 |
| Frecuencia global | 0,406585 | 0,918107 | 0 |

La comparación con persistencia sobre una única cohorte describe solo este par de versiones y este horizonte. El Brier de Markov país es menor, pero su diferencia **Δ = −0,018520** debe acompañarse de la incertidumbre.

### Incertidumbre añadida: 3.000 remuestreos pareados

Los 196 países se remuestrean juntos por modelo (se conservan 159 con régimen inicial bajo y 37 con régimen alto), seed `54182`, usando `release_first_passage_uncertainty.uncertainty_summary(...,origin=2024)`. Bandas por percentiles 2,5/97,5 %; no consideran dependencia regional, no son pruebas confirmatorias.

| Modelo menos persistencia | ΔBrier | Banda percentil 95 % |
| --- | ---: | --- |
| Markov país regularizado | −0,018520 | **[−0,044460; +0,004610]** |
| Memoria de dos estados | −0,016696 | [−0,046150; +0,008619] |
| Markov global | −0,002573 | [−0,025157; +0,017129] |
| Frecuencia global | +0,294340 | [+0,210051; +0,368472] |

**Los tres modelos de transición comparados con persistencia tienen bandas que incluyen cero**, de manera que no se ha demostrado ventaja estadística estable. La frecuencia global queda claramente peor en esta muestra, pero no permite afirmar capacidad prospectiva de los otros modelos.

## Comparación con AV-080/081 y límites

| Ventana | Entrenamiento hasta | Evaluación posterior | N países / primeros cambios | Brier Markov país | Brier persistencia |
| --- | --- | --- | --- | ---: | ---: |
| 2023–2024 | Edición 23.1, hasta 2022 | Edición 25.1 | 196 / 11 | 0,093725 | 0,112245 |
| 2024–2025 | Edición 24.1, hasta 2023 | Edición 26.1 | 196 / 8 | 0,079299 | 0,081633 |

Aunque Markov por país encabezó las dos ventanas, **las cohortes comparten 2024, países y shocks geopolíticos**. Los dos resultados no son ensayos independientes ni prueba prospectiva. Los archivos antiguos, aunque completos y con checksum verificado hoy, carecen de timestamp externo independiente que certifique exactamente qué información estaba publicada al 01/01/2024 y 01/01/2025. Los protocolos y preguntas fueron inspeccionados tras observar datos antiguos: no usar estas ventanas para seleccionar/corregir modelo y después presentarlas como holdout nuevo.

**Próximo paso:** preespecificar modelos, riesgo de transición y horizonte antes de futuros datos nuevos, reunir vintages exactos con fecha verificable y evaluar temporalmente sin solapamiento. Si se estudian características nuevas —duración del episodio, señales de líderes, agendas oficiales, exposición bursátil— deberán verificarse individualmente en as-of y medirse frente a persistencia y los cinco modelos originales, sin reutilizar estas ventanas como prueba de habilidad. 2027 continúa `SHADOW_NO_EMITIDO`. No emitir alertas de inversión ni actuar sobre posiciones de bolsa por estos resultados.
