# PSICOHISTORIA — UCDP 24.1 frente a Gleditsch–Ward v7: cobertura y cambios de violencia

**19/10/2026 · AV-039 en revisión.** [Código](../../research/psychohistory/ucdp_gw_annual_alignment.py) y [workflow](../../.github/workflows/psychohistory-ucdp-gw-annual.yml).

## Pregunta científica

¿Coinciden los códigos–año incluidos en el panel retrospectivo
**UCDP OrganizedViolenceCY 24.1** con el roster de pertenencia
estatal de **Gleditsch–Ward v7.0**, incluido su suplemento de
microestados? ¿Puede distinguirse una **reaparición anual de violencia
codificada en un país** de una **persistencia** sin afirmar
erróneamente que se trata del inicio de una nueva díada?

Se descargan el ZIP original UCDP y dos ficheros públicos GW
procedentes de una copia académica fijada a commit, siempre con
**SHA-256 observados en octubre de 2026**. Los originales se
utilizan solo en la memoria de GitHub Actions y se eliminan
al terminar; no se publican códigos individuales ni filas.

**Universo GW:** un código es miembro del año si su intervalo
de existencia solapa **cualquier fecha del año**; no es una
lista conocida el 1 de enero. Una intersección de **códigos
numéricos** entre GW y UCDP es una **propuesta**, no una
prueba de equivalencia territorial completa.

## Resultado con datos originales (19/10/2026)

| Año | Filas UCDP | Miembros GW con microestados | Códigos iguales en ambos | Solo UCDP | Solo GW |
|---|---:|---:|---:|---:|---:|
| 1989 | 172 | 171 | 171 | 1 | 0 |
| 1990 | 173 | 172 | 172 | 1 | 0 |
| 2006 | 194 | 194 | 193 | 1 | 1 |
| 2011 | 196 | 197 | 194 | 2 | 3 |
| 2019 | 196 | 197 | 194 | 2 | 3 |
| 2020 | 196 | 197 | 194 | 2 | 3 |
| 2021 y 2023 | 196 | **NO_EVALUABLE** | — | — | — |

**La comparación no es una homologación automática.** GW v7
termina el **31/12/2020**, de modo que extrapolar a 2021–2023
crearía falsos rosters. Las diferencias numéricas requieren
investigación específica de codificación, reconocimiento
y cobertura antes de permitir joins.

## Diferencia entre estado y aparición de un conflicto

Sobre el panel anual original, sin entrenar modelos ni emitir
predicciones, se calcula por código con **ambos años presentes**:

- `0→0`: dos años sin violencia codificada según los tres
  indicadores UCDP del país.
- `0→1`: aparición o reaparición de **alguna** categoría de
  violencia codificada en ese país.
- `1→1`: persistencia de violencia codificada (no necesariamente
  la misma díada o conflicto).
- `1→0`: desaparición de la violencia codificada de esas
  categorías respecto del año anterior.
- Sin observación en el año anterior o primer año (1989):
  **censurado/desconocido**, nunca cero imputado.

| Año | 0→1 | 1→1 | 1→0 | 0→0 | Año anterior ausente |
|---|---:|---:|---:|---:|---:|
| 1989 | 0 | 0 | 0 | 0 | 172 |
| 2006 | 2 | 42 | 10 | 139 | 1 |
| 2019 | 13 | 52 | 7 | 124 | 0 |
| 2020 | 7 | 55 | 10 | 124 | 0 |
| 2023 | 9 | 54 | 12 | 121 | 0 |

**Advertencia crítica:** 0→1 no prueba el inicio de un
conflicto/díada nuevo: puede ser una díada antigua que reaparece,
una nueva categoría de violencia o una revisión posterior. El
criterio de onset exigirá identificadores de conflicto y un
período de paz explícito. Tampoco se puede deducir una predicción
por conocer la transición **ex post**.

## Puertas científicas

Permanecen false:
`source_independent_geography_concordance_approved`,
`retrospective_annual_transitions_are_new_conflicts`,
`feature_bytes_available_asof_verified`,
`ucdp_candidate_monthly_scope_verified`,
`backtest_authorized`, `brier_computed`, `forecast_issued`.

Fuentes posteriores a los orígenes hipotéticos: GW v7
(publicada 2021) y OrganizedViolenceCY 24.1 (2024). El hash
calculado hoy no constituye testigo histórico. Los indicadores
UCDP están sujetos a umbrales de codificación; cero no
demuestra ausencia absoluta de violencia real.

**Próximo paso:** documentar las discrepancias de códigos
GW/UCDP con fuentes oficiales y desarrollar una definición
reproducible de aparición por **ID de conflicto**, manteniendo
aparte la persistencia y respetando el historial de paz y
las vintages auténticas antes de emitir.
