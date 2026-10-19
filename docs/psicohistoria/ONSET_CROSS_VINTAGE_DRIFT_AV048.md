# PSICOHISTORIA — AV-048 · Divergencia real de etiquetas UCDP Onset entre ediciones

El objetivo del nuevo auditor no es puntuar un pronostico, sino determinar si una etiqueta historica aparentemente disponible en 2020 coincide con una etiqueta retrospectiva revisada publicada despues.

Fuentes oficiales observadas en octubre de 2026:
- https://ucdp.uu.se/downloads/onset/onsets_computed.csv (enlace catalogado como 19.1; bytes SHA-256 ba54aeace175173b7643a2c14ba35ce89a2fcfd31712085e4fd13de656f752a8; contiene 1946-2017 en vez de 2018 y 61 filas repetidas por clave gwno_a/año).
- https://ucdp.uu.se/downloads/onset/ucdp-intrastate-country-onset-251.csv (edicion 25.1; SHA-256 e2b59e65aaca88403991465b78fb407d7eddcefadeb18c7f1397bfe2ea83fe6a, 1946-2024).

El modulo onset_cross_vintage_label_drift.py compara intersecciones de claves numericas country-year bajo condiciones estrictas. Distingue valores 0/1 comunes, cambios 0 a 1, 1 a 0, claves presentes solo en una edicion y etiquetas ausentes o ambiguas. Las 61 filas extra de la edicion antigua pueden compartir el mismo valor, pero la herramienta NO aprueba deduplicacion automatica como regla de entrenamiento. Si hay etiquetas contradichas para una clave, no se compara esa observacion. No se reporta ningun pais ni identificador.

Advertencia: coincidencia de un codigo GW numerico no demuestra equivalencia territorial independiente. Una discrepancia de etiquetas entre vintages tampoco prueba error de un modelo. La edicion 25.1 nunca se considera informada en 2020 y ninguna muestra de test se selecciona mirando un outcome futuro.

El workflow privado temporal descarga dos CSV oficiales a memoria, valida su SHA ya observado, publica exclusivamente agregados y ejecuta siete pruebas ficticias. Todos los flags de as-of, training autorizado, Brier, scoring y forecast siguen en FALSE. No se tocan probabilidades 2027, Sheets de resultados, Workers ni costes.

El resultado determina la magnitud del riesgo de revision de etiquetas antes de comenzar un entrenamiento o un backtest historical as-of. La siguiente dependencia sera una fuente previa al origen con hash temporal, version de labels realmente contemporanea y roster country-year historicamente autenticado.

## Resultado de la ejecución empírica oficial

Fuentes observadas y comprobadas por SHA-256 en el runner:
- El archivo antiguo etiquetado como 19.1 acaba en 2017: 10.203 filas, 10.142 claves GW-año únicas, 61 duplicadas sin contradicción binaria observada.
- El archivo revisado 25.1 contiene 12.553 claves únicas hasta 2024.
- Intersección de códigos GW-año: 10.130 observaciones, todas con las dos etiquetas binarias legibles.
- Etiquetas iguales: 9.912 (9.638 ceros y 274 unos).
- Etiquetas discordantes: 218 (212 antiguas 1 frente a nuevas 0; seis antiguas 0 frente a nuevas 1). Porcentaje de discrepancias: 218/10130 = 2,15 %.
- Claves solo presentes en archivo antiguo: 12; solo en nueva edición: 2.423 (incluidos años 2018–2024). Estas cifras no son ni migración demográfica certificada ni todos Estados diferentes.

El conjunto comparable incluye 486 positivos en la codificación antigua (274 comunes + 212 solo antiguos) y 280 positivos en la nueva (274 comunes + seis solo nuevos). Esto describe un cambio importante de *etiquetado* en el rango compartido, pero no necesariamente revisiones de incidentes reales: las definiciones y la semántica condicionada a riesgo entre ediciones pueden diferir. **Prohibido atribuir 212 correcciones de errores, skill o falsos positivos de un modelo.**

No se ha realizado una comparacion de identidades territoriales mas alla de codigos GW iguales, ni prueba de autenticidad temporal de los bytes de 2019. No se autoriza entrenar con esos labels ni score Brier. El hallazgo recomienda investigar por separado la definicion de Onset19.1 y su relacion con country-onset 25.1 antes de cualquier calibracion.
