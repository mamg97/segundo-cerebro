# PSICOHISTORIA — Estado científico verificado · 19/10/2026

## Último avance — AV-20261019-035

[PR #667](https://github.com/mamg97/segundo-cerebro/pull/667) fusionada en
`main` con squash `b5bbcf19cc42751fbc0ca3b9857009b485ed3cd7`.
El módulo `research/psychohistory/cow_annual_origin_gate.py`
reproduce la regla documental de COW `system2024`: un país-año figura
si el Estado existió en el sistema **en cualquier momento de ese año**.
Por tanto no constituye automáticamente el roster conocido el 1 de enero.

Fuente pública `states2024` fijada por hash observado en octubre de 2026.
[GitHub Actions](https://github.com/mamg97/segundo-cerebro/actions/runs/39245169245)
reprodujo recuentos reales con tests sintéticos, privacidad y CI verdes.
[Informe del avance](COW_ANNUAL_ORIGIN_GATE.md).

**Resultado retrospectivo (códigos anuales frente a códigos 1/01):**
1990 165/161; 2002 192/191; 2006 193/192 (194 pares código–abreviatura
anuales por sucesión); 2008 194/193; 2011 195/194; 2020 y 2024
195/195. El año 2025 queda sin cobertura en esta versión.

**Importante:** se reconstruyó la *regla oficial* desde el CSV de
intervalos `states2024`; NO se ha verificado directamente el CSV
`system2024`. La versión COW 2024 se publicó en noviembre de 2025;
no sirve como dato históricamente disponible para emisiones
anteriores. Código COW no equivale a identificador UCDP/GW.

## Canónico privado y límites

- `PsicoAvances`: último `AV-20261019-035` (**35 eventos**),
  escrito y releído.
- `PsicoFases.MAD-02=PARCIAL`, `PsicoHitos.V2-02=EN_CURSO`,
  `PsicoPredicciones` sin emisiones.
- Cohorte shadow 2027 y probabilidades sin cambios. Sin modificaciones
  al Worker, frontend ni servicios de pago.
- Sin testigos temporales de bytes exactos, sin correspondencia territorial
  aprobada ni cobertura UCDP para Estados con cero sucesos: **NO**
  entrenar ni emitir un backtest `as-of` como válido.

## Siguiente tarea concreta

1. Conseguir y cotejar el **CSV oficial** `system2024`, si resulta
   descargable, preservando cómo representa cambios de nombre bajo
   el mismo código.
2. Buscar roster realmente disponible en el origen histórico con
   testigo independiente de contenido y fecha.
3. Auditar el universo de cobertura UCDP, incluidos países sin eventos,
   sin convertir `ausencia de fila` en etiqueta negativa.

**Relevo:** `docs/HANDOFF.md` conserva secciones históricas extensas y
una cabecera antigua de PSICOHISTORIA; esta nota pequeña es el último
relevo técnico del subproyecto cuando el conector bloquea la escritura
del documento global demasiado grande. El seguimiento privado sigue
siendo la autoridad para el estado de avances y fases.
