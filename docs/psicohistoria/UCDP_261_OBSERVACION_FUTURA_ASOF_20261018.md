# PSICOHISTORIA — Evidencia de disponibilidad futura de UCDP 26.1

**Auditoría: 18/10/2026 · Objetivo prospectivo: 2027.**

## Hallazgo observable

La ejecución pública de [GitHub Actions #39130567553](https://github.com/mamg97/segundo-cerebro/actions/runs/39130567553)
tiene metadatos del **propio proveedor**, contrastados mediante la API
de GitHub en esta investigación:

- Commit de la ejecución: `5a6767096acf277ff0a4f86569b96eeed2f1f6f8`.
- Inicio: **2026-10-18 13:13:01 UTC**.
- Finalización no posterior a: **2026-10-18 13:13:19 UTC**.
- Estado: `completed/success`.
- En su job `official-source-probe` constan como `success`
  tanto la descarga oficial ZIP/PDF como el cotejo de **ambos SHA-256
  preregistrados**, el gate de 7.132 filas / 199 países / 1989–2025
  y `benchmark.audit(strict=True)`.
- El protocolo `research/psychohistory/protocol.json` fija los
  SHA-256 de ZIP y PDF; el archivo privado conserva bytes equivalentes
  verificados sin necesidad de nuevas copias.

El metadato de finalización es un **límite superior para la observación
de bytes**: la descarga y su validación terminaron antes de ese instante.
Eso ofrece una pista verificable de disponibilidad de la fuente antes
del **1 de enero de 2027**, suficiente como evidencia documental de
que los bytes existían entonces si el registro público mantiene
autenticidad. **No es una certificación criptográfica autónoma** de
ese límite ni equivale a evidencia de emisión de pronósticos.

## Separación de relojes y clases de prueba

| Afirmación | Estado | Motivo |
|---|---|---|
| UCDP difundió estadísticas de 2025 el 09/06/2026 | SOPORTADA | Nota oficial Uppsala |
| El ZIP y PDF de hashes exactos ya estaban accesibles ese 09/06 | NO DEMOSTRADO | Nota de prensa no identifica SHA |
| GitHub CI descargó y verificó esos hashes el 18/10 | SOPORTADA POR API/LOGS | Run externo comprobado |
| Disponibilidad de versión exacta en orígenes históricos 2016–2025 | NO DEMOSTRADA | La observación de 2026 es posterior |
| Fecha de emisión de probabilidades 2027 | NO VERIFICADA | Un TSQ preparado no es sello |
| Elegibilidad de evaluación prospectiva | NO | No hay TSR/verificación ni registro ISSUED |

La nota oficial usada únicamente como referencia de contexto es:
https://www.uu.se/en/press/press-releases/2026/2026-06-09-ucdp-record-number-of-conflicts-between-states

El inventario de la observación externa (solo hashes públicos y
agregados) está en `research/psychohistory/source_observation_20261018.json`.
`source_observation_gate.py` **rechaza** comparar este testimonio con
orígenes de 2016–2026, rechaza SHA cambiados, URLs no oficiales,
fechas incoherentes y supuestos de que la prensa fechó el ZIP.

Ejemplo sobre el manifiesto público local:

```sh
python3 research/psychohistory/source_observation_gate.py --target-year 2027
```

El validador **no consulta por sí mismo** la API de GitHub:
un JSON local puede editarse y NO acredita la integridad del proveedor.
Reconsultar por vía independiente los metadatos públicos del run y su
job, idealmente conservar además una prueba criptográfica de
anterioridad. Nunca promover `sourceAsOfForActualIssuanceCertified`,
`historicalAsOfVerified` ni `forecastIssued` a `true` a partir de
estos datos únicamente.

## Próximas puertas

1. Preservar la auditoría pública de GitHub como evidencia documental;
   si procede, capturar un testigo criptográfico adicional de hashes
   públicos sin sacar fuentes privadas de Drive.
2. Revisar **el propio instante de emisión futura**, código, cohortes
   y evidencia de origen antes de emitir; no reemplazar
   certificación temporal por fecha autodeclarada.
3. Recibir/verificar un recibo temporal independiente de un
   compromiso real, vinculado al nonce o a un anclaje Bitcoin
   efectivamente confirmado, y registrar append-only antes del
   periodo objetivo.
4. La calidad predictiva sigue sin probarse: evaluación Brier prospectiva
   solo después de resolución oficial de 2027.

No se cambian probabilidades, codebook, hashes de UCDP ni
`PsicoPredicciones`.
