# PSICOHISTORIA — Contrato de emisión de aparición de conflicto intrastatal · 19/10/2026

**AV-042: contrato candidato con puertas cerradas, NO backtest certificado ni predicción emitida.**

## Qué intentaríamos pronosticar

En una emisión **hipotética el 1 de enero del año Y**:

- **Unidad de predicción:** un Estado/año, no el ID desconocido de un conflicto futuro.
- **Fenómeno:** comienzo o reanudación de conflicto armado **intrastatal** en Y.
- **Objetivo experimental provisional:** `ucdp25.1_intrastate_country_onset1`, usando la columna oficial `onset1` del archivo [UCDP Onset Country Level v25.1](https://ucdp.uu.se/downloads/onset/ucdp-intrastate-country-onset-251.csv).
- **Horizonte:** año calendario completo Y, finaliza el 31 de diciembre.
- **No confundir:** este `onset1` incluye potenciales **reinicios** después de inactividad conforme a la fuente, no equivale a `newconf` ni a la primera aparición de una díada; la variante por conflicto tiene otro denominador.

El [codebook oficial](https://ucdp.uu.se/downloads/onset/ucdp-codebook-onset-251.pdf) diferencia onset país y conflicto; un país con conflicto intrastatal en curso no pertenece automáticamente al conjunto en riesgo de un nuevo inicio **a nivel país**.

La versión del resultado v25.1 procede de 2025: se usa **solo para evaluar retrospectivamente**, nunca como feature disponible en 1989–2024. El campo `year_prev` vacío no certifica un país en paz. La fase MAD-02 continúa PARCIAL.

## Puertas deterministas

El módulo [`onset_issue_contract.py`](../../research/psychohistory/onset_issue_contract.py) valida un manifiesto **sintético** sin IDs ni registros de países reales:

1. Origen `YYYY-01-01`, objetivo `Y`, desenlace al finalizar Y. La fecha no puede cambiar a febrero sin **otra definición de horizonte**.
2. Objetivo fijo país/intrastatal/`onset1` y versión del outcome `25.1`. No se admiten `onset5` o `conflict_id` como sustitución encubierta.
3. Información real de conflicto intrastatal del año Y−1 y cobertura territorial verificables, con semántica específica del fenómeno; no valen ausencia de fila GED o una transición genérica `0→1`.
4. La fuente de actividad, el roster y las features deben estar publicados **antes** de la emisión, no el mismo día. Se exigen fechas completas y se rechazan formatos/periodos imposibles.
5. Aunque un fichero sintético afirme fechas anteriores y no actividad, **no** puede declararse admisible ni calcular Brier sin un testigo externo que pruebe criptográficamente el contenido exacto, su fecha, el universo completo en riesgo y la concordancia territorial. El programa mantiene esas puertas en `false`.

### Restricción de latencia descubierta

Si la fuente anual **cubre todo el año Y−1**, la observación no puede
considerarse completa antes de terminar el **31 de diciembre**. En
el corte preciso del **1 de enero de Y, 00:00**, obtener y publicar
ese archivo definitivo puede ser imposible por latencia de
recolección, validación y publicación. Una versión elaborada en
2025 para resolver retrospectivamente 2020 nunca prueba
conocimiento antes del origen.

Una alternativa científicamente válida para un experimento posterior
sería usar un origen **más tardío**, con horizonte redefinido, o
un estado de conflicto de **mayor antigüedad conocido as-of** más
indicadores oportunos que no asuman cierre definitivo del año
inmediatamente anterior. No automatizar el cambio de origen o
horizonte sin declararlo.

## Prueba con fuente oficial

La [CI específica](../../.github/workflows/psychohistory-onset-issue-gate.yml) descarga únicamente el CSV país 25.1 auténtico (hash SHA-256 observado octubre 2026 `e2b59e65aaca88403991465b78fb407d7eddcefadeb18c7f1397bfe6a`) a memoria efímera.
Valida unicidad país-año, campos oficiales, fechas, `onset1` y `onset5`, y calcula agregados de:

- número de filas país-año con `onset1=1` y `onset5=1`;
- cuántas filas de un año tienen **fila** del año anterior (no actividad verificada);
- cuántos valores faltan de onset y si aparece `onset5=1` sin `onset1=1`.

**Tener fila en Y−1 no implica país sin conflicto en Y−1,
ni disponibilidad de su contenido el 1 de enero de Y.**
Los agregados no autorizan un universo en riesgo.
El runner elimina el CSV y no publica filas, nombres,
IDs, predicciones ni probabilidades.

Las pruebas unitarias contienen solo países y ficheros ficticios
y bloquean anticipación imposible, datos futuros, períodos
no ordenados, campos no contemplados, pertenencia no probada
y confusión país–conflicto.

## Qué falta para una evaluación científica real

El primer backtest defendible requiere **antes de cada origen**:
una política de pertenencia que incluya países sin eventos y
sin ambigüedades territoriales, información sobre si seguía
activo un conflicto intrastatal (incluido retraso de
publicación), features con hash/testigos pre-origen,
models/baselines congelados, cohortes completas y
resultados externos auditables posteriores al origen.
Sin esto, no hay Brier válido, `MAD-02` no puede pasar
a COMPLETADA y `PsicoPredicciones` debe quedar vacío.

**Todos los outputs reales y sintéticos fijan:**
`vintage_verified_by_independent_historical_witness=false`,
`full_risk_set_at_issue_verified=false`,
`historical_issue_evidence_verified=false`,
`backtest_authorized=false`,
`models_scored=false` y `forecast_issued=false`.
