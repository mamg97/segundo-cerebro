# AV-089 — Primera fuente macroeconómica con vintages

22/10/2026. Auditoría de estructura y procedencia observada hoy; sin
pronóstico, backtest ni afirmación de ventaja predictiva.

## Pregunta separada de UCDP

¿Puede la información de desempleo de EE. UU. disponible en un corte
trimestral anticipar una subida de al menos 0,5 puntos porcentuales durante
los seis meses siguientes mejor que un benchmark que conserva el último
valor observado? El umbral y el horizonte quedan propuestos **antes** de
probar resultados; habrá que fijar una fecha exacta de emisión, calendario
de disponibilidad y etiqueta de primera publicación para cada observación.
Una revisión posterior no puede entrar como predictor del pasado.

## Fuente y comprobación realizada

La [Reserva Federal de Filadelfia publica RUC](https://www.philadelphiafed.org/surveys-and-data/real-time-data-research/ruc)
como tasa de desempleo desestacionalizada, observaciones mensuales y vintages
trimestrales, junto a documentación y fechas de publicación. Se descargó el
enlace oficial `rucQvMd.xlsx` visible el 22/10/2026. Archivo original fuera de
Git; 575.288 bytes; SHA-256
`d971e59d3ed5f1322a46631743508fb1ad5eee39bfbe12425a641a277fdd9b9a`.
El enlace permite descargar un libro actualizado; este hash acredita la
observación de hoy, no su existencia en un corte histórico.

La [documentación general de la Fed de Filadelfia](https://www.philadelphiafed.org/-/media/FRBP/Assets/Surveys-And-Data/real-time-data/data-files/documentation/gen_doc_nonNIPA.pdf?hash=8BD09C82580BA89D3C098226605C15E8&sc_lang=en)
y las [notas RUC](https://www.philadelphiafed.org/-/media/FRBP/Assets/Surveys-And-Data/real-time-data/data-files/RUC/specific_documentation_RUC.pdf?hash=6BE5193C1647B3EDF9DBF9D719144461&sc_lang=en)
sitúan cada vintage hacia el día 15 del mes central del trimestre. Por ello
el último mes potencialmente disponible es enero, abril, julio u octubre,
según el trimestre. `research/psychohistory/ruc_vintage_audit.py` exige el
hash completo, valida encabezados, meses ordenados sin saltos, celdas
numéricas, rangos de tasa y que ninguna columna contenga valores de meses
posteriores a ese corte.
Usa solo la biblioteca estándar y publica contadores agregados. Resultado:

| Medida | Observado |
| --- | ---: |
| Vintages | 244, de 1965Q4 a 2026Q3 |
| Meses de observación | 955, de 1947-01 a 2026-07 |
| Celdas numéricas | 141.146 |
| Celdas posteriores al mes potencialmente disponible | 0 |

Los cortes no garantizan la disponibilidad del último mes potencial;
por ejemplo, el último mes numérico varía entre columnas. Tampoco se ha
comprobado aquí la hora exacta de publicación de cada vintage o de cada dato
del Bureau of Labor Statistics. El campo de vintage no es un sello temporal
independiente. Las pruebas sintéticas rechazan hash diferente, mes duplicado,
texto inesperado y una observación futura.
El workflow `psychohistory-ruc-vintage-audit.yml` repite la descarga oficial,
comprueba el hash y borra el archivo efímero; no tiene cron.

## Siguiente experimento admisible

1. Archivar y comprobar las fechas de publicación oficiales enlazadas desde
   la misma página. Definir el instante de emisión **posterior** a cada
   publicación y determinar el último mes realmente disponible.
2. Extraer la primera publicación del objetivo futuro desde un corte posterior
   y establecer el benchmark y un protocolo de evaluación con ventanas
   separadas temporalmente. Mantener un tramo final sin mirar para evaluación.
3. Sólo entonces ejecutar un backtest temporal que compare tasas de error,
   calibración y cobertura; documentar revisiones y observaciones ausentes.

La fuente RUC es de **EE. UU.** y no mide conflicto, otros países ni
geopolítica. El ensayo macroeconómico no repara `SOURCE_QUALITY_BLOCKED` de
Candidate, no habilita predicciones de mercados y no modifica la cohorte
2027 `SHADOW_NO_EMITIDO`.
