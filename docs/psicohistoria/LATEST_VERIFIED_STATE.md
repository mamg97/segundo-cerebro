# PSICOHISTORIA — Relevo científico vigente · 19/10/2026

## Avance AV-20261019-036

[PR #669](https://github.com/mamg97/segundo-cerebro/pull/669)
fusionada en `main` (squash `8af3750a1e9a4d7e29e4641d22990c115bd43d25`).
Se descargó por primera vez el **ZIP oficial COW System2024**
desde el proveedor y se contrastó su CSV original de cuatro
columnas (`ccode`, `stateabb`, `statenme`, `year`) con la
reconstrucción desde intervalos públicos COW v2024.

**Resultado real:** 17.511 códigos–año en el archivo oficial y
17.511 en la reconstrucción; **17.511 coincidencias exactas**,
cero registros extra/faltantes y cero abreviaturas fuera
de las previstas por los intervalos. Hay un código–año de 2006
con dos abreviaturas distintas en el histórico de intervalos,
pero solo una fila oficial para ese código–año.

[Informe metodológico y SHA observados](COW_OFFICIAL_SYSTEM2024_RECONCILIATION.md).
[CI empírica oficial](https://github.com/mamg97/segundo-cerebro/actions/runs/39247215972)
más unit-tests sintéticos y control privacidad completados en verde.

La conciliación demuestra **integridad interna del panel COW actual**;
no que los registros estuvieran disponibles en los orígenes históricos,
ni que códigos COW y GW/UCDP fueran geográficamente equivalentes.
La edición oficial v2024 fue publicada en noviembre de 2025.
**No hay skill prospectiva demostrada ni backtest as-of autorizado.**

## Estado canónico y barreras

- Google Sheets privado: `PsicoAvances=36` (último
  `AV-20261019-036`, escritura y relectura verificadas).
- `PsicoFases.MAD-02=PARCIAL`, `PsicoHitos.V2-02=EN_CURSO`,
  `PsicoPredicciones` únicamente cabecera, cero emisiones.
- Cohorte shadow 2027 intacta. Ninguna acción sobre
  probabilidades, Worker, front-end ni infraestructura de pago.
- Prohibido inferir un país sin violencia desde ausencia de evento,
  o extrapolar una edición posterior como si estuviese
  disponible en origen.

## Siguiente trabajo científico

1. Localizar un **testigo independiente de fecha + hash de bytes**
   de ediciones históricas UCDP y de rosters territoriales.
2. Aprobar documentalmente un crosswalk temporal COW↔GW/UCDP,
   especialmente para sucesiones, fronteras y microestados.
3. Acreditar el universo completo de países cubiertos en cada
   vintage UCDP, incluidos los de cero incidentes, y entonces
   evaluar onset con particiones cronológicas y baselines adecuados.

`docs/HANDOFF.md` es un archivo global muy grande cuya cabecera de
PSICOHISTORIA conserva un evento antiguo por limitaciones de
escritura del conector. **Esta nota pequeña y la hoja privada**
son el relevo actualizado; no mantener dos estados canónicos distintos.
