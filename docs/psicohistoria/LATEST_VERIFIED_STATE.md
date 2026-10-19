# PSICOHISTORIA — Estado científico vigente · 19/10/2026

## AV-20261019-038 · Validación del panel oficial con ceros explícitos

[PR #673](https://github.com/mamg97/segundo-cerebro/pull/673) fusionada
en `main` (squash `3722e7effcda60bda36982bafb4cdc3c195042d2`).
Se implementó `research/psychohistory/ucdp_country_year_zeros.py`
y CI sin coste operativo adicional con fuente original UCDP
[OrganizedViolenceCY v24.1](https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy-241-csv.zip).
[Ficha científica](UCDP_COUNTRY_YEAR_EXPLICIT_ZEROS.md).

**Resultado empírico reproducible, fuente oficial:** 6.740 filas
país–año desde 1989 hasta 2023. **4.762** tienen los tres indicadores
`sb_exist_cy/ns_exist_cy/os_exist_cy` explícitamente en 0 y
**1.978** al menos un 1. En 2023: 196 filas; 133 ceros explícitos
y 63 con algún indicador 1.

Solo salen **agregados y SHA observados en 2026** de GitHub Actions;
los originales se descargan y eliminan en el runner sin upload de
filas ni artefactos. La PR pasó el test empírico, la batería sintética
de más de 240 pruebas y privacidad. No hay cambios de frontend,
Worker, pagos o modelos.

## Límites de interpretación

- Un cero de UCDP GED equivale a **ausencia de violencia codificada
  bajo su protocolo**, no inexistencia real de violencia; el codebook
  documenta restricciones y umbrales.
- El panel es **anual retrospectivo**, no una fuente de negativos
  mensuales UCDP Candidate ni una medida directa de *onset*.
- La versión publicada en 2024 **no estaba disponible como fuente
  histórica antes de los orígenes**; no debe alimentar features.
- No se ha cotejado aún el universo con un roster GW independiente
  y versionado. No se certifica comparabilidad con COW `ccode`.

## Estado canónico privado (releído tras escritura)

`PsicoAvances=38` (`AV-20261019-038`);
`PsicoFases.MAD-02=PARCIAL`,
`PsicoHitos.V2-02=EN_CURSO`,
`PsicoPredicciones=0` emisiones.
La cohorte sombra 2027 y sus probabilidades siguen intactas.

## Próximo trabajo

**Prioridad:** comprobar los 6.740 país–año frente a un roster GW
realmente independiente y datado, con frontera y sucesiones, y definir
onset frente a persistencia con suficiente historial. Solo después
investigar una validación retrospectiva admisible, teniendo las
features auténticamente disponibles antes de cada origen.
No reportar Brier/skill ni emitir predicciones sin esas garantías.

`docs/HANDOFF.md` es un registro global demasiado grande y contiene
una cabecera de PSICOHISTORIA desactualizada. Esta nota de dominio y el
Sheet privado son el relevo científico más reciente.
