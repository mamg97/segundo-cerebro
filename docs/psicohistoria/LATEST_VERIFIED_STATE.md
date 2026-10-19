# PSICOHISTORIA — Estado científico verificado · 19/10/2026

## AV-20261019-045 · Testigo Git tercero GED 19.1 (sin as-of)

- [PR #685](https://github.com/mamg97/segundo-cerebro/pull/685) fusionada en `main` (squash `b08286d71ee46ea85d6ec147ba71b2877bdc5106`); CI independiente del objeto Git, tests adversariales, privacidad y [CI de main](https://github.com/mamg97/segundo-cerebro/actions/runs/39288896539) SUCCESS; publicación Pages SUCCESS.
- [Evidencia académica](ONSET_THIRDPARTY_GIT_HISTORICAL_WITNESS.md): GED 19.1 mirror, commit Git `33316d9367907b8452d3a5ac3fe0ff2bd7da7f43` con fecha declarada 10/01/2020 y firma `unsigned`, árbol `9996db934c356ee561ba477b1a0a32bc996b0dc1`, blob `3f7e4621ba0d264a62b221fa06773e02d66d046f`, 68.235.762 bytes. El 11/01 la ruta se renombró conservando el mismo blob. Su timestamp Git no certifica recepción o acceso histórico pre-origen.
- **Canónico privado comprobado:** `PsicoAvances=45`, último `AV-20261019-045` VERIFICADO; `MAD-02=PARCIAL`; `PsicoPredicciones=0`. No se han modificado las 1.176 probabilidades sombra privadas de 2027.

## AV-20261019-044 · Auditor de capturas CDX

- [PR #684](https://github.com/mamg97/segundo-cerebro/pull/684), squash `7c6a74eae0233634e3988687a53f36cbb2a3a170`, CI real, 9 tests ficticios, privacidad, main y Pages SUCCESS.
- [Protocolo](ONSET_ARCHIVE_BYTE_WITNESS_TRIAL.md) y sondeo Internet Archive: `INDEX_REQUEST_UNAVAILABLE_NOT_EVIDENCE_OF_ABSENCE`; captura no verificable **no** equivale a ausencia. SHA1 CDX no autentica tiempo de depósito. Origen UTC del auditor es una hipótesis nueva, no la definición retroactiva de AV-042.
- Ningún backtest ni Brier nuevo, ninguna emisión de forecast. Coste incremental 0 €.

## Próxima entrega científica

Diseñar explícitamente un origen y horizonte que admitan publicaciones anuales con retraso de meses, y un denominador formal de observaciones prospectivas sin fingir riesgos condicionados. No reutilizar datasets revisados de años posteriores como inputs/labels históricos entrenables; exigir testigos independientes de publicación y roster completo antes de calcular cualquier skill.

---

## AV-20261019-043 · Vintages históricos con auditoría temporal fail-closed

- [PR #680](https://github.com/mamg97/segundo-cerebro/pull/680) **fusionada en main**, squash `396f12a7e3ca98d9c7eaa887b38d214c60b64d8a`. Workflow independiente de índice histórico UCDP, tests sintéticos y privacidad **SUCCESS**. [CI científica de main](https://github.com/mamg97/segundo-cerebro/actions/runs/39262787362), privacidad y demo Pages **SUCCESS**.
- [Documento científico](ONSET_HISTORICAL_VINTAGE_DISCOVERY.md): índice UCDP actual confirma enlaces a GED 19.1 (edición 2019, datos hasta 2018) y Candidate 20.0.10 (cobertura global declarada desde octubre 2020). Para origen **01/01/2020**, GED 19.1 es como máximo contexto de actividad rezagada hasta 2018 (Y−2), no evidencia de la actividad intrastatal del año 2019 (Y−1). Candidate 20.0.10 es posterior al origen y se descarta. No afirmar disponibilidad exacta de bytes en 2019 por disponer hoy del índice ni por comunicado antiguo.
- Software `onset_historical_vintages.py`: dos fuentes indexadas con identidad inmutable, origen temporal, disponibilidad *solo candidata*, exclusión automática de releases posteriores, cobertura de país desconocida y prueba adversarial. **Todas las autorizaciones de as-of, risk set, scoring y emisión son false.**
- **Canónico privado releído tras escritura:** `PsicoAvances=43`, último `AV-20261019-043` VERIFICADO; `MAD-02=PARCIAL`; `PsicoPredicciones=0`. Cohorte privada shadow 2027 sin modificar. El gasto adicional sigue en **0 €**; no hay cron, Worker ni modelos nuevos de predicción.
- **Siguiente bloqueo:** localizar archivos completos e íntegros de actividad intrastatal Y−1 **con testigos de bytes autenticados antes de 1 enero Y**, evidencia de países sin eventos y homologación territorial GW/UCDP; solo entonces crear elegibilidad país-onset1. Si el origen es inviable, preregistrar separadamente una nueva fecha y horizonte, nunca mutar a posteriori el objetivo del AV-042.

---

## AV-20261019-042 · Contrato de emisión anual sin información futura

- [PR #678](https://github.com/mamg97/segundo-cerebro/pull/678) **fusionada** en main, squash `19e8812e9672519062e630cea9fad146d139f773`. CI científica, lectura de fuente real, privacidad, Worker Builds y despliegue de main **SUCCESS**.
- Nuevo [contrato experimental](ONSET_ISSUE_DATE_CONTRACT.md): origen **1 de enero Y**, horizonte **año Y**, unidad **país-año**, etiqueta candidata **UCDP Onset v25.1 intrastatal por país, `onset1`**. `newconf`, `onset5` e inicio de una díada no son la misma definición ni se sustituyen en el código.
- El contrato sintético `research/psychohistory/onset_issue_contract.py` exige información de riesgo y actividad intrastatal, cobertura territorial, fecha de disponibilidad de cada fuente y corte de features estrictamente **anteriores** al origen. Todas las puertas de aprobación real (`vintage_verified`, `full_risk_set_at_issue`, `backtest`, `models_scored`, `forecast_issued`) siguen **false**.
- Hallazgo científico: un archivo **anual** que contiene actividad durante todo el 31/12 de Y−1 no puede suponerse completado, publicado y verificado a las 00:00 del **1/01/Y**. Se requiere un origen más tardío **con horizonte redefinido** o una fuente realmente oportuna ya disponible pre-origen; no se automatiza ningún cambio metodológico.
- Empírico UCDP 25.1 país-año (hash completo observado octubre de 2026, validado en runner efímero): **12.553** observaciones 1946–2024. `onset1=1` en **2006: 3**, **2019: 5**, **2020: 4**, **2023: 2**, **2024: 2**. En 2020 `onset5=1` en **1** país-año, pero **196 filas ≠ 196 países elegibles** al instante de emisión. Tener fila del año anterior tampoco prueba que se conociese su estado de paz antes del origen.
- Incidencia detectada en CI: SHA-256 inicial truncado a **57** caracteres en documento/código/workflow. Se confirmó con hash calculado en runner que UCDP **no** había mutado los bytes, se corrigió la transcripción a 64 caracteres y la ejecución real pasó. No se sobreescribió información canónica ni se cambió de fuente.

## Fuente canónica privada

- `PsicoAvances`: **42 eventos**; último `AV-20261019-042` verificado y releído.
- `PsicoFases.MAD-02=PARCIAL`; `PsicoHitos.V2-02=EN_CURSO`; `PsicoPredicciones=0` emisiones.
- Cohorte sombra 2027 y sus **1.176 probabilidades privadas intactas**. No se modificaron modelo, Worker, frontend ni infraestructura de pago; sin cron recurrentes.

## Siguiente entrega científica

1. Encontrar una fuente de **actividad intrastatal disponible antes de cada emisión**, con su fecha precisa, universo incluyendo países sin eventos y evidencia independiente de bytes históricos (no solo hash observado hoy).
2. Aprobar pertenencia, equivalencia GW/UCDP y conjunto en riesgo de `onset1`; excluir Estados con actividad intrastatal previa que los deje fuera según la definición país de UCDP y tratar desconocidos como **UNKNOWN**, no negativos.
3. Someter baselines y entrenamiento a verdaderos orígenes fuera de muestra, congelación de features y cohorts; solo después calcular Brier de onset sin confundir persistencia y novedad.

`docs/HANDOFF.md` del repositorio completo aún contiene una cabecera de PSICOHISTORIA antigua por su gran tamaño; esta **nota pequeña** y el seguimiento privado de PROYECTOS son la referencia operativa vigente del subproyecto. No crear otros registros paralelos.
