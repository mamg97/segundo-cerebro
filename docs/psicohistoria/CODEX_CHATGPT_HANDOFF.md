# PSICOHISTORIA — Handoff Codex ↔ ChatGPT

Actualizado 21/10/2026. Continuar desde el estado remoto verificado, no desde el
prompt AV-085 interrumpido.

## Estado de partida comprobado

- `main` auditada: `cb60fa94edccd0565160abb5d92e7b7e71554b8a`.
- AV-085 ya fusionada en PR #757, squash
  `37c0cbe5b94be80a7f71f19c1ec4588a38c54ea5`; sus tres workflows SUCCESS.
- AV-077–085 revisados en `LATEST_VERIFIED_STATE.md`, documentos, código y
  registro canónico privado. AV-086 estaba libre antes de este incremento.

## Incremento actual AV-086

PR #760 fusionada, squash `31dba31a01e79bd1c27664126df3353ba13ef16c`.
Cuatro checks SUCCESS; reproducción oficial run `39615996330`, motores
`39615996361` y privacidad `39615996339`. AV-086 VERIFICADO y dos informes
agregados registrados/releídos en las hojas canónicas; AV-085 intacto.
MAD-02/MAD-04 siguen PARCIAL. Implementado:

- Corrección CY: geografía dentro de fronteras, derivada de GED, no actor
  participante. Reconciliación 196/196 totales por edición y nombres sin
  discrepancias. Fuentes correlacionadas por construcción.
- `ged_monthly_panel` + `monthly_descriptors`: doce meses exactos y calidad,
  fechas adversariales, códigos temporales y validación de registros anuales.
- `ged_monthly_cy_diagnostics.py`: comparación intacta de seis modelos,
  falsas alarmas, Brier/log loss/calibración y sensibilidad por cinco regiones.
- Cuatro codebooks oficiales con hash y seis archivos de datos con hash;
  reproducción completa de los cortes 2022 y 2023; cifras en el informe AV-086.
- 413 tests locales superados en AV086, incluyendo trece del puente/diagnóstico.
  Comprobar de nuevo tras cualquier cambio. Actions ejecuta también las
  fuentes completas y codebooks fijados; no confundir prueba local con CI.

## Límites y próxima tarea

No se cambió el motor productivo, aplicación, modelos originales, información
financiera ni la cohorte 2027. `SHADOW_NO_EMITIDO`; ninguna emisión nueva.
No se ajustó un predictor mensual ni se validó utilidad prospectiva.

La siguiente investigación debe construir una cohorte **Candidate GED mensual
nueva**, capturada antes del origen con evidencia externa, objetivo mensual
independiente de CY y política de precisión `0`. Revisar antes AV-025–038 y los
probes Candidate ya existentes para no repetirlos. Mantener los meses no
admisibles; nunca excluirlos silenciosamente ni imputar paz. No seleccionar
señales sobre 2023–2025 y llamarlas confirmaciones independientes.

Antes de asignar nuevos IDs, releer `PsicoAvances` y `PsicoExperimentos`.
La corrección AV-086 ya referencia AV-085 sin reescribir esa fila.

## Último incremento AV-087 verificado

Fuente Candidate vigente 26.0.9 y codebook 1.5, hashes fijados, 2.014 registros
y 44 países con registros. Cero precisiones no documentadas; un intervalo
abarca todo septiembre sin extremos dentro del mes. Se conserva, se señala
y se bloquea replay, sin calificarlo automáticamente como filtración futura.
`candidate_current_snapshot_audit.py` reutiliza el lector existente, añade
cuatro tests y un workflow de fuentes oficiales. 417 tests locales superados.
Informe: `AV087_CANDIDATE_ACTUAL_CALIDAD_TEMPORAL.md`.

PR [#761](https://github.com/mamg97/segundo-cerebro/pull/761) fusionada, squash
`de804901136903987af54325cfb117ff649f100f`; los cuatro checks SUCCESS:
fuente actual `39617592333`, regresión oficial Candidate 2024/25
`39617591921`, motores `39617591924` y privacidad `39617591932`.
El nuevo resultado SOURCE_QUALITY_BLOCKED se reprodujo en los logs; ese bloqueo
científico no es un fallo de ejecución.

Canónico: AV-20261021-086 y AV-20261021-087 VERIFICADOS, tres informes agregados
(dos AV086 y uno AV087), escritos y releídos con coincidencia exacta. Filas
históricas preservadas; MAD-02/MAD-04 PARCIAL, criterios NO. Hitos V2-04/V4-04
actualizados sin completarlos. PsicoPredicciones sigue solo con cabeceras.
Revisión visual de las cuatro hojas afectadas; formato existente conservado.

No hubo cambio de aplicación: no se atribuye un despliegue nuevo a estas PR.
Los cinco baselines, AV083, AV084 y la cohorte 2027 permanecen intactos.

Siguiente tarea: aclarar la regla de exportación para intervalos que abarcan
un mes completo y documentar reloj externo de snapshots nuevos antes de un
nuevo origen; luego fijar objetivo mensual y cohorte. No repetir el estudio
2024/25 ni interpretar las 44 ubicaciones con eventos como población total.

## AV-088 · Cotejo de la exportación trimestral

La [PR #778](https://github.com/mamg97/segundo-cerebro/pull/778) incorpora
un comparador de las ediciones oficiales septiembre 26.0.9 y enero–septiembre
26.01.26.09, fijadas por SHA. Los 2.014 registros mensuales aparecen con seis
campos básicos idénticos en el trimestral de 16.633 registros. La anomalía
de AV-087 permanece con las mismas fechas y precisión. Esta evidencia no
independiza las fuentes ni explica la regla de inclusión mensual; el resultado
sigue `SOURCE_QUALITY_BLOCKED`. La PR ejecuta tests sintéticos y descarga
efímera de ambos CSV. No hay scoring ni emisión. Informe:
[AV-088](AV088_CANDIDATE_MENSUAL_TRIMESTRAL.md).

Próximo paso científico: aclaración documental del contrato de UCDP para
intervalos que abarcan un mes completo, seguida de un testigo externo de
disponibilidad antes del nuevo origen, roster completo y target mensual
preespecificado. No actualizar `PsicoPredicciones` ni admitir la cohorte.

## Actualización 23/10/2026 · líneas independientes

HTOPS [AV-098](AV098_HTOPS_QUESTIONNAIRE_AND_UNCERTAINTY.md) y BTOS
[AV-099](AV099_BTOS_TECH_SOURCE_FEASIBILITY.md) están fusionadas y registradas
en el Sheet privado; ninguna ha superado el gate de emisión. En macro,
[AV-100](AV100_BLS_RELEASE_DOM_PILOT.md) extrae cinco tasas nacionales de
serializaciones DOM BLS completas conservadas privadamente con SHA. No son
bytes originales de primera publicación; faltan 183 páginas del índice y el
reloj RUC independiente. No ejecutar backtest ni escribir predicciones.

[AV-101](AV101_USGS_OAF_VERSIONS_AND_DENOMINATOR.md) encuentra las versiones
OAF superseded en ComCat, pero la primera ventana de tres productos ya estaba
en marcha al actualizarse cada uno. El conjunto actual de septiembre tiene
167 sismos M≥5 y solo 11 con OAF, sin que eso defina elegibilidad. SIS-02
sigue PARCIAL/NO; no puntuar la probabilidad USGS como predicción propia.
