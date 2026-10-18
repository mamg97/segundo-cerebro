# PSICOHISTORIA — Prerregistro de evaluación prospectiva 2027 (SIN emisión)

**Fecha de decisión:** 2026-10-18. Documento vinculado al contrato
[policy_2027.json](../../research/psychohistory/policy_2027.json).
No es un resultado del modelo ni una predicción emitida.

## Experimento principal

**Pregunta falsable:** ¿mejora `v2_logistic` la probabilidad de violencia
estatal agregada frente al baseline `frequency` en 2027?

**Variable dependiente:** para cada país UCDP elegible, indicador de
`sb_total_deaths_best >= 25` *dentro de su territorio* durante
el año natural 2027 completo. No equivale a predecir una guerra concreta
ni un ataque contra una persona.

**Universo:** roster de 2025 de UCDP OrganizedViolenceCY 26.1, exigiendo
serie ininterrumpida 2021–2025 (196 candidatos previstos). Países
ausentes o nuevas entidades posteriores **no se imputan**. Se guardará en
privado la lista exacta de IDs junto al conjunto de probabilidades.

**Información de entrada:** último año de features 2025, entrenamiento
con etiquetas solo hasta 2025. La fuente 26.1, su ZIP y codebook siguen
identificados por sus SHA-256 preregistrados. Nunca incorporar desenlaces
2026–2027 como features para la cohorte congelada.

**Comparación principal:** media pareada del Brier Score de
`v2_logistic` frente a `frequency`, calculada exactamente en los
mismos países resueltos; Brier Skill definido solo si el Brier del
baseline es positivo. Una mejora implica evidencia de skill para esa
cohorte; un valor negativo es un fracaso informativo.

**Cuatro comparadores adicionales:** `persistence`, `markov`,
`v1_memory_index`, `interaction_table`; todos se publicarán y
puntuarán en la misma cohorte, sin selección posterior. `log_loss`,
calibración y AP cuando estén definidas son secundarios exploratorios,
no pruebas confirmatorias adicionales sin corrección de multiplicidad.

**Sesgo declarado:** la elección de `v2_logistic` como challenger
principal se hace **ahora**, tras haber observado tests históricos
sobre una release revisada. Por ello la exploración histórica no es
confirmatoria. La evaluación hacia adelante 2027 sí podrá considerarse
una cohorte temporal nueva, siempre que **antes del desenlace**
se cumplan las puertas de emisión/registro/trust.

## Resolución y pérdidas de cobertura

El outcome se tomará de la **primera publicación oficial** UCDP
OrganizedViolenceCY que cubra íntegramente 2027, fijando enseguida la
versión, los hashes exactos del ZIP y codebook y la fecha verificable
de descarga. Revisiones posteriores se informarán aparte como análisis
de sensibilidad; no se elegirá retrospectivamente la revisión más
favorable. La fecha concreta de publicación futura **no se inventa**.

Ausencia de país/registro no equivale a resultado negativo. Excluir
o conservar casos irresueltos se hará explícito, con motivos y recuentos.
Tanto los modelos como el baseline usan el **mismo subconjunto puntuable**.
La dependencia entre países y el escaso número de años de prueba
limitan las afirmaciones: reportar diferencia de Brier y sensibilidad
por bootstrap de países no garantiza inferencia temporal generalizable.

## Puerta técnica

`issue_2027_preflight.py` evalúa en privado:
- esquema de la cohorte 2027, 196 IDs sin duplicar, 1.176
  probabilidades finitas válidas, seis modelos idénticos;
- `outcome=null`, features y labels hasta 2025, baseline fijo;
- dos SHA de fuente 26.1, compatibilidad del protocolo;
- para el generador canónico, **hash exacto del archivo generador,
  modelo y protocolo** con los ficheros de la revisión ejecutada;
- para el artefacto previo calculado mediante wrapper, reconoce su
  estructura pero **no** lo declara provenance-ready, aunque sus
  probabilidades sean equivalentes.

Su salida siempre permanece `forecastIssued=false`,
`issuanceEligible=false` y `evaluationEligible=false`; no
cambia ni crea filas en `PsicoPredicciones`. El resultado y los detalles
de países/probabilidades permanecen únicamente en Drive o directorios
privados. No se escriben datos reales en el repositorio público.

### Puertas para que pueda llegar a ser un experimento prospectivo

1. Ejecución literal y archivada del generador canónico (o una
   prueba de equivalencia explícita y aprobada) más registro privado
   congelado de su universo y predicciones.
2. Procedencia independiente de los datos disponibles **antes** de
   la fecha de emisión concreta, no confundirlo con backtest `as-of`
   de años anteriores.
3. Compromiso salted SHA256 + solicitud RFC 3161 con nonce + recibo
   real + raíz confiable verificada fuera de la propia TSA.
4. Emisión real predesenlace, evidencia de registro append-only, y
   elegibilidad concedida por una puerta separada que todavía NO existe.

**A 18/10/2026: se ha preregistrado una regla de evaluación,
no se ha acreditado todavía una emisión prospectiva.**
