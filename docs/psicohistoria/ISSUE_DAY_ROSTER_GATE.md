# PSICOHISTORIA — Puerta de universo territorial al día de emisión

**19/10/2026 — Avance 34. Diagnóstico del sesgo por utilizar países del mes completo para emitir el día 1.**

## Problema científico distinto del crosswalk

Los avances 30–33 estudiaron la pertenencia a COW y Gleditsch–Ward y
sus discrepancias de códigos, abreviaturas y nombres. Pero hay **dos
conjuntos diferentes**: Estados miembros el día exacto en que se habría
emitido un pronóstico (día 1 de un mes) y Estados cuya pertenencia se
prolongó durante el mes completo.

Si un Estado sale, se divide o es reconocido durante ese mes, usar el
segundo conjunto como sustituto del primero condiciona la selección a
un acontecimiento posterior a la emisión. No puede construir un roster
de predicción sin control específico de `look-ahead`.

## Código y comprobación

`research/psychohistory/issue_day_state_roster_gate.py` utiliza los
validadores de bytes COW v2024 y GW v7.0 con microestados. Por cada
mes y fuente ofrece **solo números agregados** de:

- miembros en el primer día del mes frente a miembros del mes completo;
- miembros del día 1 que dejaron de cumplir pertenencia antes de fin;
- altas posteriores al origen y bajas durante el mes;
- códigos con dos intervalos activos en el origen, sin resolverlos
  arbitrariamente.

Una sucesión con dos intervalos que comparten el día 1 se trata como
**ambigüedad**; si la posterior «pertenencia al mes completo» depende
de seleccionar arbitrariamente una identidad, el auditor lanza error.

### Control de disponibilidad de la versión original

Además de la geometría retrospectiva, para cada par fuente/origen se
distinguen tres situaciones:

| Situación | Estado |
|---|---|
| Mes posterior al fin de la cobertura de la fuente | `SOURCE_COVERAGE_EXPIRED` (sin siquiera reconstruir miembros de ese período) |
| La fuente declara haberse publicado en la fecha de emisión o después | `DOCUMENTED_RELEASE_NOT_BEFORE_ISSUE` |
| La fuente declara fecha anterior y cubre el período | `METADATA_ONLY_NO_TIME_AUTHENTICATED_BYTES`, todavía NO admisible |

Las fechas documentales de referencia **no son pruebas
criptográficas** de los bytes históricos: COW v2024 se anunció el
[3/11/2025](https://correlatesofwar.org/news/state-system-membership-update-v2024/)
y [GW v7](https://ksgleditsch.com/statelist.html) fue publicada el
13/05/2021, con datos hasta 31/12/2020.

Este auditor **no habilita ninguna aprobación**: la pertenencia
deducida de ficheros actuales no implica que un emisor conociese
los hechos entonces. La ausencia de sucesos UCDP sigue siendo
desconocida; los códigos COW y GW no están homologados.

`as_of_roster_admissible=false`,
`historically_authenticated_vintages=false`,
`crosswalk_verified=false`,
`country_negative_labels_validated=false`,
`model_scored=false`, `forecast_issued=false`.

## Prueba con datos públicos

[Workflow](../../.github/workflows/psychohistory-issue-day-roster.yml):
descarga tres ficheros públicos de fuentes estatales a un runner efímero,
desde un commit y con checksums SHA-256 observados en octubre de 2026.
Revisa junio de 2006, julio de 2011, diciembre de 2020, diciembre de
2024 y enero de 2025. Solo guarda contadores en el log, borra archivos
en todos los casos y no crea servicios de pago. Las pruebas unitarias
usan exclusivamente países ficticios.

**Objetivo siguiente:** demostrar históricamente una versión de roster
que ya existiera al origen, fijar la identidad geográfica revisada
por cada período y documentar cobertura UCDP de todos los Estados
(incluidos los de cero sucesos) antes de probar onset.

## Resultados de la primera ejecución real

La [ejecución independiente del auditor](https://github.com/mamg97/segundo-cerebro/actions/runs/39242330576)
ha pasado la descarga y validación SHA de los tres archivos.

| Mes | Sistema | Miembros al día 1 | Miembros del mes completo | Altas después del día 1 | Bajas dentro del mes |
|---|---|---:|---:|---:|---:|
| 2006-06 | COW 2024 | 192 | 191 | 2 | 1 |
| 2006-06 | GW v7 + micro | 192 | 191 | 2 | 1 |
| 2011-07 | COW 2024 | 194 | 194 | 1 | 0 |
| 2011-07 | GW v7 + micro | 196 | 196 | 1 | 0 |
| 2020-12 | COW 2024 | 195 | 195 | 0 | 0 |
| 2020-12 | GW v7 + micro | 197 | 197 | 0 | 0 |
| 2024-12 | COW 2024 | 195 | 195 | 0 | 0 |
| 2024-12 | GW v7 + micro | No evaluable | No evaluable | — | — |
| 2025-01 | Ambos | No evaluable | No evaluable | — | — |

Los recuentos de altas son códigos de Estado cuyo intervalo
empieza durante el mes *después* del día 1; no se atribuyen a
predicciones realmente emitidas ni implican violencia. Los casos
observados de 2006 prueban que los dos criterios de pertenencia
tienen resultados distintos; en julio 2011 coinciden los
denominadores para el primer día y todo el mes, pero existe
una nueva pertenencia posterior al día 1.

**Limitación esencial:** todos esos intervalos proceden de
versiones publicadas en 2021 o 2025; por eso la reconstrucción
retrospectiva es descriptiva y **no demuestra que el registro
hubiera sido conocido por un analista en el origen**.
