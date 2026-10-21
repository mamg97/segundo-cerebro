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

Implementación local completa, pendiente de cierre remoto y sincronización
canónica hasta que conste evidencia posterior en este documento:

- Corrección CY: geografía dentro de fronteras, derivada de GED, no actor
  participante. Reconciliación 196/196 totales por edición y nombres sin
  discrepancias. Fuentes correlacionadas por construcción.
- `ged_monthly_panel` + `monthly_descriptors`: doce meses exactos y calidad,
  fechas adversariales, códigos temporales y validación de registros anuales.
- `ged_monthly_cy_diagnostics.py`: comparación intacta de seis modelos,
  falsas alarmas, Brier/log loss/calibración y sensibilidad por cinco regiones.
- Cuatro codebooks oficiales con hash y seis archivos de datos con hash;
  reproducción completa de los cortes 2022 y 2023; cifras en el informe AV-086.
- 413 tests locales superados, incluyendo trece del puente/diagnóstico.
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
Actualizar el registro append-only con evento correctivo que referencie AV-085,
y MAD-02/MAD-04 sin completarlas. No reescribir la fila histórica AV-085.
