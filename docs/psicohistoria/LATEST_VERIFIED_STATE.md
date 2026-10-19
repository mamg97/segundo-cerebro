# PSICOHISTORIA — Estado científico vigente · 19/10/2026

## AV-20261019-040 · Corrección de CI posterior al avance 39

- **AV-039**, [PR #674](https://github.com/mamg97/segundo-cerebro/pull/674)
  fusionada: comparación anual de UCDP OrganizedViolenceCY 24.1 con
  GW v7.0 + microestados. 2020: **196** país–años UCDP y
  **197** miembros GW; **194** números de código comunes,
  **2** solo en UCDP y **3** solo en GW. No se han homologado
  identidades nacionales. [Documento científico](UCDP_GW_ANNUAL_ALIGNMENT.md).
- En las transiciones retrospectivas **2019→2020**, UCDP cuenta
  **7** países que pasan de ningún indicador de violencia codificada
  a alguno (`0→1`), **55** que persisten (`1→1`), **10**
  que pasan a cero y **124** que se mantienen en cero.
  **No es onset por ID de conflicto o díada**; son cambios anuales
  de presencia de violencia GED bajo criterios UCDP.
- **AV-040**, [PR #676](https://github.com/mamg97/segundo-cerebro/pull/676)
  fusionada, squash `829f06e7d980575b45f976da9f0e3493969abb9a`.
  La CI de `main` posterior a PR #674 encontró una prueba antigua
  intermitente que buscaba `100` y `2010` dentro de
  `str(metadata)`: un hash SHA puede contener cualquiera de esas
  subcadenas sin que haya publicación de filas.
  Sustituida por checks de privacidad estructurales y prueba
  de ausencia de una **fila completa**.
  **CI científica, privacidad y despliegue de main de PR #676 SUCCESS.**
  El avance 39 ni sus datos han sido alterados.

## Estado privado canónico (escritura y relectura confirmadas)

- `PsicoAvances=40`, último `AV-20261019-040`
  (evento correctivo separado de AV-039).
- `PsicoFases.MAD-02=PARCIAL`,
  `PsicoHitos.V2-02=EN_CURSO`,
  `PsicoPredicciones=0` emisiones.
- Cohorte shadow 2027, probabilidades, modelos, Worker y
  aplicación sin cambios operativos atribuibles a este trabajo.

## Límites y próximo paso

GW v7 termina en 2020; no extrapolar miembros 2021–2023.
El cruce numérico de UCDP y GW no sustituye una concordancia
geográfica histórica. Los archivos UCDP 24.1 y GW7 fueron
publicados después de muchos orígenes hipotéticos: los hashes
observados en octubre de 2026 no acreditan bytes `as-of`.

**Próximo hito:** auditar las discordancias GW–UCDP por
codificación y tiempo; definir onset a nivel conflicto/díada
con paz previa, censura del primer registro e identidad estable,
y verificar vintages anteriores al origen para las features.
**No publicar Brier/skill ni emitir predicciones hasta
cumplir las puertas científicas pendientes.**

`docs/HANDOFF.md` global conserva una cabecera histórica
obsoleta por limitaciones de tamaño del conector. La hoja
privada de PROYECTOS y esta nota técnica pequeña son el
relevo actual de PSICOHISTORIA.
