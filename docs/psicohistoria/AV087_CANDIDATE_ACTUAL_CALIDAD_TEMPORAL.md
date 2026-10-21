# AV-087 — Candidate mensual vigente: sin códigos 0 en esta edición, alcance pendiente

21/10/2026. Observación de fuente nueva, sin entrenamiento, scoring o emisión.
No replica los experimentos de diciembre 2024 / enero 2025 de AV-026–028.

## Datos oficiales observados

La [página oficial de descargas](https://ucdp.uu.se/downloads/) anuncia Candidate
**26.0.9**, septiembre 2026, y enlaza ahora el **codebook 1.5 (2026)**. No se
debe asumir que el codebook 1.3 utilizado en los estudios históricos sigue
siendo el vigente. El 1.5 aún define `date_prec` en 1–5; no documenta el 0.
Declara extracción el día 20 de cada mes: un calendario declarado no certifica
fecha exacta de primera publicación de estos bytes.

| Fuente exacta | Tamaño observado | SHA-256 observado 21/10/2026 |
| --- | ---: | --- |
| [CSV 26.0.9](https://ucdp.uu.se/downloads/candidateged/GEDEvent_v26_0_9.csv) | 1.611.352 | `20256b0d674f4c58d747c7c75ddc012eabfedf44ada22f436ef2d9a6405567d5` |
| [Codebook 1.5](https://ucdp.uu.se/downloads/candidateged/ucdp-candidate-codebook1.5.pdf) | 739.188 | `0107eac75e0b0bf0c0c1f2146dd1818af8ec943e254471b73453f53a64384d33` |

El CSV íntegro contiene **2.014 registros**, correspondientes a **44 países con
algún registro**. No son 44 países elegibles ni el denominador de países en paz.

| Precisión de fecha | Registros |
| --- | ---: |
| 1 | 1.725 |
| 2 | 262 |
| 3 | 6 |
| 4 | 15 |
| 5 | 6 |
| 0 o no documentada | 0 |

Hay 1.725 registros de un día exacto dentro del mes; **991** son estatales.
Son conteos descriptivos: no se han comprobado aquí atribución, estimación
fatal (`best`), estatus de codificación ni umbral anual para entrenar un modelo.

## Hallazgo y decisión de admisión

Un intervalo **abarca septiembre entero sin ningún extremo dentro del mes**.
No hay intervalos enteramente anteriores ni posteriores al mes, ni fechas
exactas contradictorias. El codebook p. 3 describe la inclusión por fecha de
inicio o fin dentro del mes; el registro no satisface esa regla operativa.

Esto **no demuestra** que el suceso ocurriera en el futuro ni que UCDP haya
publicado un error: la regla de exportación o el tratamiento de intervalos que
abarcan meses completos necesita aclaración. La auditoría conserva el registro
y devuelve `SOURCE_QUALITY_BLOCKED`, `rowsSilentlyDropped=0`. No lo transforma
en un evento exacto de septiembre ni lo elimina para conseguir aprobación.

La ausencia de `date_prec=0` solo resuelve ese defecto en **esta edición**;
no asigna significado retroactivo al 0 de 2024/25. Tampoco valida las fechas
históricas de disponibilidad de ninguna edición anterior.

## Código y comprobaciones

- Se reutiliza `candidate_cross_vintage.read_month`, añadiendo la edición
  vigente al inventario y rechazando CSV irregulares. La comparación histórica
  conserva explícitamente sus dos ediciones y objetivos originales.
- `candidate_current_snapshot_audit.py` exige ambos hashes antes de auditar
  intervalos/precisión y solo emite agregados. No devuelve IDs de actores,
  eventos o países. Las banderas de scoring, backtest y forecast son falsas.
- Cuatro tests nuevos adversariales: extremos fuera de mes conservados;
  intervalo con un extremo dentro no llamado filtración futura; código 0 y
  contradicción de día exacto; hashes y filas irregulares. **417 tests** Python
  locales; quince de Candidate. Ejecución íntegra del CSV/PDF reales.
- Workflow sin cron ni credenciales adicionales, con archivos efímeros
  borrados; CI confirma la reproducción, no aprueba el uso científico de la
  fuente cuando el propio auditor encuentra una discrepancia.

## Siguiente paso concreto

Precisar documentalmente el contrato para intervalos que abarcan un mes entero,
comparar su representación en snapshots oficiales sin presumir igualdad de
vintages y conservar una fecha externa de observación anterior al nuevo origen.
Después fijar una cohorte y objetivo **mensual** con negativos de registro
explícitos, sin interpretarlos como ausencia de violencia real. Solo entonces
preespecificar una señal adelantada/actores/geografía y evaluar meses futuros
no solapados. El estado de la cohorte anual 2027 no cambia.

Cierre: PR [#761](https://github.com/mamg97/segundo-cerebro/pull/761) fusionada;
cuatro checks SUCCESS, reproducción oficial run `39617592333`. Registro
AV-20261021-087 y experimento agregado escritos y releídos; MAD-02 PARCIAL.
