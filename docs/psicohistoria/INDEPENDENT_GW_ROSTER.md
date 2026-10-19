# PSICOHISTORIA — Auditoría del denominador independiente GW v7.0

**19/10/2026 — solo población independiente, NO etiquetas de conflicto.**

## Fuente y límites

La [lista oficial de Estados independientes](https://ksgleditsch.com/statelist.html)
de Kristian S. Gleditsch y Michael Ward utiliza códigos GW compatibles con
el campo territorial country_id de UCDP
([documentación de la API](https://ucdp.uu.se/apidocs/)).

La versión oficial **7.0** termina el **31 de diciembre de 2020** y fue
publicada el **13 de mayo de 2021**. El experimento consulta una
[copia académica pública en commit inmutable](https://github.com/brentonk/us_diplomatic_missions/blob/0dda0ef93b7958f67c79031c1695dd9e5408a62c/input/ksgmdw.txt)
del fichero de intervalos, descargada ahora; ello NO prueba que los
mismos bytes estuvieran disponibles antes de cada fecha hipotética.

**Motivo científico:** un país no puede desaparecer del universo de
evaluación solo por no aparecer en un CSV con sucesos violentos.
El denominador se debe definir al margen de los incidentes.

## Auditor

El nuevo módulo **research/psychohistory/independent_gw_roster.py**
valida fechas ISO, códigos GW, ausencia de intervalos solapados,
integridad SHA opcional y límite estricto de cobertura 2020.
Cuenta estados miembros durante todo el mes y membresías parciales.
No publica identificadores individuales, crea etiquetas, scores ni
predicciones.

| Mes | Decisión |
|---|---|
| Diciembre 2019 | Solo roster GW descriptivo; publicación de esta versión fue posterior |
| Diciembre 2020 | Último mes cubierto |
| Enero 2021 | NO_EVALUABLE_SOURCE_CENSORED_2020 |
| Diciembre 2024 | NO_EVALUABLE_SOURCE_CENSORED_2020 |

**Advertencia:** GW v7.0 omite microestados codificados por separado;
ser miembro de GW no acredita que un vintage Candidate tuviera cobertura
del país. No inferir ausencia de violencia por falta de fila. Sin
concordancia de población objetivo, datación de inputs y evidencia
independiente de publicación, no hay backtest vintage-correct.

Todos estos indicadores permanecen false:
source_as_of_verified; ucdp_coverage_including_zero_event_states_verified;
absence_of_events_means_zero_target; vintage_correct_backtest;
models_scored; forecast_issued.

## Reproducibilidad

El workflow **.github/workflows/psychohistory-gw-roster.yml** lee
el TSV público desde un commit fijado a un runner temporal, ejecuta
el análisis y elimina el archivo; las pruebas usan solamente Estados
ficticios. No hay nuevos servicios ni costes.

Siguiente paso: localizar lista GW validada hasta 2024/25 y acreditar
fuentes Candidate históricas, incluida cobertura explícita de países
sin incidentes, antes de evaluar un onset o una crisis nueva.

## Primera ejecución empírica · 19/10/2026

La [ejecución del auditor con fuente GW real](https://github.com/mamg97/segundo-cerebro/actions/runs/39230716327)
ha procesado 216 intervalos, correspondientes a 202 códigos de
Estado distintos en **toda la historia**. Para diciembre de 2019
y de 2020 se identificaron **174 Estados miembros durante todo el
mes**, sin altas parciales en esos dos meses. Para enero de 2021 y
diciembre de 2024 el resultado fue correctamente
NO_EVALUABLE_SOURCE_CENSORED_2020.

Al leer la fuente se comprobó que el fichero contiene caracteres de
codificación heredada (Windows-1252), por lo que el parser acepta
explícitamente ese formato cuando falla UTF-8, sin alterar bytes ni
checksum original. El SHA-256 observado **hoy** es:
70ba63cd8a936a25a701be5daffa1105411da5298ff890bf4bc27ed688892b2b.
Se ha fijado como control de integridad en el workflow.

**No es una certificación de datos disponibles antes de 2021** ni
transforma las ausencias de incidentes en etiquetas negativas UCDP.
