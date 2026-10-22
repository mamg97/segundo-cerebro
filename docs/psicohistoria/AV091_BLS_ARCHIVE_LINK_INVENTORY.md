# AV-091 — Índice de enlaces BLS para el reloj macro

22/10/2026. Inventario privado de enlaces oficiales, sin tasas extraídas,
labels, modelo ni backtest. Complementa [AV-089](AV089_MACRO_RUC_VINTAGES.md)
y [AV-090](AV090_RUC_OBSERVATION_COVERAGE.md).

## Qué se observó

Se recorrió el [archivo oficial BLS de Employment Situation](https://www.bls.gov/bls/news-release/empsit.htm)
para cada mes de referencia entre enero de 2011 y septiembre de 2026.
Hay 189 meses de calendario: 188 enlaces a comunicados oficiales y una
excepción explícita, octubre de 2025. En 20 enlaces, el lector web devolvió
un error para HTML y se abrió el PDF oficial ofrecido en la misma fila.
Las fechas del índice privado se extraen del nombre oficial
`empsit_MMDDYYYY` de cada URL. La [nota BLS sobre el cierre de
2025](https://www.bls.gov/cps/methods/2025-federal-government-shutdown-impact-cps.htm)
confirma que los datos CPS de octubre no se recogieron y que los de
septiembre se publicaron el 20 de noviembre.

`research/psychohistory/bls_archive_index_audit.py` valida el CSV privado
fijado por SHA: cabecera, meses completos y ordenados, dominio y ruta
oficiales, fecha coherente con el nombre del archivo y excepción justificada.
Produce únicamente contadores. En el índice observado:

| Comprobación | Resultado |
| --- | ---: |
| Meses de referencia 2011-01…2026-09 | 189 |
| Enlaces a comunicados archivados | 188 |
| Mes sin comunicado ni observación CPS | 1 (2025-10) |
| Comunicado después del mes siguiente | 1 (2025-09, publicado 2025-11-20) |

El CSV y su manifiesto están en el archivo privado local, fuera de Git. La
CI pública sólo prueba el contrato con datos sintéticos; no lee ese índice
ni reproduce la consulta BLS, que respondió HTTP 403 a la descarga CLI.
Los 188 archivos **no** se descargaron ni se conservaron como originales.
La fecha en la URL no equivale a comprobar el encabezado y la tasa inicial
de cada comunicado, su disponibilidad histórica independiente ni la hora
de cierre de cada vintage RUC.

## Siguiente puerta

Conservar los originales BLS que se usen, cotejar fecha y tasa de primera
publicación dentro de cada uno, y establecer un reloj externo para RUC.
Después se podrá fijar el target y un protocolo de evaluación temporal,
sin reutilizar revisiones posteriores como información disponible al emitir.
`MAC-02` permanece `PARCIAL`, `criterio_superado=NO`. Este inventario no
autoriza un score ni una predicción.
