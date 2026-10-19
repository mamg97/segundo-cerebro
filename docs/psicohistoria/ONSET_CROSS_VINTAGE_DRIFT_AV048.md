# PSICOHISTORIA — AV-048 · Divergencia real de etiquetas UCDP Onset entre ediciones

El objetivo del nuevo auditor no es puntuar un pronostico, sino determinar si una etiqueta historica aparentemente disponible en 2020 coincide con una etiqueta retrospectiva revisada publicada despues.

Fuentes oficiales observadas en octubre de 2026:
- https://ucdp.uu.se/downloads/onset/onsets_computed.csv (enlace catalogado como 19.1; bytes SHA-256 ba54aeace175173b7643a2c14ba35ce89a2fcfd31712085e4fd13de656f752a8; contiene 1946-2017 en vez de 2018 y 61 filas repetidas por clave gwno_a/año).
- https://ucdp.uu.se/downloads/onset/ucdp-intrastate-country-onset-251.csv (edicion 25.1; SHA-256 e2b59e65aaca88403991465b78fb407d7eddcefadeb18c7f1397bfe2ea83fe6a, 1946-2024).

El modulo onset_cross_vintage_label_drift.py compara intersecciones de claves numericas country-year bajo condiciones estrictas. Distingue valores 0/1 comunes, cambios 0 a 1, 1 a 0, claves presentes solo en una edicion y etiquetas ausentes o ambiguas. Las 61 filas extra de la edicion antigua pueden compartir el mismo valor, pero la herramienta NO aprueba deduplicacion automatica como regla de entrenamiento. Si hay etiquetas contradichas para una clave, no se compara esa observacion. No se reporta ningun pais ni identificador.

Advertencia: coincidencia de un codigo GW numerico no demuestra equivalencia territorial independiente. Una discrepancia de etiquetas entre vintages tampoco prueba error de un modelo. La edicion 25.1 nunca se considera informada en 2020 y ninguna muestra de test se selecciona mirando un outcome futuro.

El workflow privado temporal descarga dos CSV oficiales a memoria, valida su SHA ya observado, publica exclusivamente agregados y ejecuta siete pruebas ficticias. Todos los flags de as-of, training autorizado, Brier, scoring y forecast siguen en FALSE. No se tocan probabilidades 2027, Sheets de resultados, Workers ni costes.

El resultado determina la magnitud del riesgo de revision de etiquetas antes de comenzar un entrenamiento o un backtest historical as-of. La siguiente dependencia sera una fuente previa al origen con hash temporal, version de labels realmente contemporanea y roster country-year historicamente autenticado.
