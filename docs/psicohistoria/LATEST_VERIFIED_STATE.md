# PSICOHISTORIA — Estado científico vigente · 19/10/2026

## AV-20261019-039 — Panel GW/UCDP y transiciones sin confundir onset

[PR #674](https://github.com/mamg97/segundo-cerebro/pull/674)
fusionada en `main`, squash `13484ca86013f0083f8122bf8ccdcbca82da5b64`.
Nuevo diagnóstico `research/psychohistory/ucdp_gw_annual_alignment.py`
compara **UCDP OrganizedViolenceCY 24.1** y
**Gleditsch–Ward v7.0 + microestados** con checksums originales observados
en octubre de 2026. Fuentes solo en runner efímero, salida pública
únicamente agregada, CI real, tests sintéticos y privacidad verdes.
[Informe científico](UCDP_GW_ANNUAL_ALIGNMENT.md).

### Resultados empíricos

- 1989: **172** país–años UCDP, **171** miembros GW,
  **171** códigos numéricos coincidentes.
- 2006: **194** UCDP, **194** GW, **193** códigos coincidentes.
- 2019 y 2020: **196** UCDP, **197** GW, **194** coincidentes;
  dos solo UCDP y tres solo GW. **No declarar concordancia geográfica
  aprobada por la simple coincidencia del número.**
- GW v7 termina 2020; comparaciones de 2021–2023 marcadas
  `NO_EVALUABLE_GW7_EXPIRED_2020`.
- Transiciones retrospectivas UCDP 2020 sobre 196 filas con 2019
  presente: **7** cambios `0→1`, **55** `1→1`,
  **10** `1→0`, **124** `0→0`. `0→1` significa
  inicio/reaparición de *alguna* violencia codificada en un
  país–año; **NO** inicio de una nueva díada o conflicto.

### Estado canónico privado comprobado

- `PsicoAvances`: **39** eventos, último `AV-20261019-039`.
- `PsicoFases.MAD-02=PARCIAL`;
  `PsicoHitos.V2-02=EN_CURSO`;
  `PsicoPredicciones=0`.
- Cohorte shadow 2027 y sus probabilidades intactas.
  Sin cambios en Worker, frontend, modelos ni servicios de pago.

### Próximo hito científico

1. Investigar las discrepancias entre códigos UCDP/GW con
   metadatos de territorio y tiempo, sin asumir equivalencia numérica.
2. Definir **onset por ID de conflicto/díada** con historial previo,
   período de paz y tratamiento del primer año censurado.
3. Verificar genuinos vintages de **features disponibles antes del
   origen** de predicción, con evidencia independiente del
   contenido exacto de los archivos.
4. **No** reportar Brier ni afirmar skill de predicción nueva
   hasta superar estas puertas.

`docs/HANDOFF.md` conserva un encabezado de PSICOHISTORIA obsoleto
porque su tamaño impide actualizarlo a través del conector.
Esta nota pequeña del subproyecto y la hoja privada son el
relevo operativo vigente.
