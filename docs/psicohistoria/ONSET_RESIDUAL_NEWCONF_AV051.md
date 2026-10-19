# PSICOHISTORIA — AV-051 · Diagnóstico de 85 etiquetas residuales de Onset

Fecha de diseño: 19/10/2026. Estado: auditoría descriptiva de vintages observados en octubre de 2026; **NO** equivale a capacidad de pronóstico.

## Pregunta

La triangulación de tres CSV UCDP oficiales, verificados por SHA-256, encontró 218 diferencias antiguas contra la variante moderna `country-onset1`. De los 212 casos antiguo positivo y country negativo, 127 tienen la señal moderna positiva en la variante por conflicto y otros **85** no la tienen en ninguna de las dos.

No se puede denominar automáticamente a los 85 «errores» de una edición. Las reglas de onset y la historia de los conflictos difieren; el fichero antiguo bajo el enlace etiquetado 19.1 termina de hecho en 2017 y tiene 61 filas duplicadas, mientras que las versiones 25.1 se actualizaron años después.

## Contraste empírico preregistrado

Leer exactamente los tres CSV fijados en AV-049 y exigir la misma intersección original de **10.130** pares GW-año, los **85**, los **127**, los seis inversos y las **218/96** divergencias originales. No seleccionar países a partir de los desenlaces futuros ni descartar observaciones difíciles.

Para cada uno de tres subgrupos —85 residuales, 127 correspondientes a la variante conflict-level y seis inversos— informar exclusivamente contadores agregados de `newconf` y `onset5` en las tres ediciones. Si un indicador es desconocido, se conserva como `unknown`, no como cero. Las filas repetidas por GW-año se proyectan como «al menos un 1» solo para esta comparación, sin modificar el dataset canónico. El grupo de 85 se desglosa por 1946–1969, 1970–1988, 1989–1999 y 2000–2017 y por año sin identificar Estados.

La distinción es científicamente importante: el [codebook UCDP Onset 19.1](https://ucdp.uu.se/downloads/onset/UCDP_Onset_Dataset_Codebook_19.1.pdf) define `newconf` como nueva identidad de conflicto o díada; `onset1` también admite reinicios. El [codebook Onset 25.1](https://ucdp.uu.se/downloads/onset/ucdp-codebook-onset-251.pdf) documenta múltiples universos de riesgo según conflicto y Estado. Por tanto, usar `newconf` como única explicación causal sería metodológicamente erróneo.

## Ficheros y seguridad

- Auditor: `research/psychohistory/onset_residual_newconf_audit.py`.
- Pruebas: `research/psychohistory/test_onset_residual_newconf_audit.py`.
- CI: `.github/workflows/psychohistory-onset-residual-newconf.yml`.

El auditor no publica nombres ni códigos de países, identificadores de conflictos, CSV originales o predicciones. Descarga las fuentes oficiales actuales dentro de un runner efímero, verifica sus hashes observados en 2026, publica únicamente estadísticas. Las pruebas adversariales usan solo códigos ficticios.

**Barreras científicas permanentes:** la coincidencia o divergencia de `newconf` entre dos ediciones no adjudica causalidad ni prueba que las fuentes concretas estuvieran disponibles a 01/07/2020. No se autoriza entrenamiento, backtest, Brier, forecast, cambio de target AV-042/AV-046 o modificación de la cohorte privada 2027. La fase MAD-02 permanece PARCIAL.

## Próxima falsación

Separar revisiones del código histórico de los cambios semánticos. Priorizar una revisión independiente de definiciones y un conjunto de etiquetas verdaderamente accesible antes del origen de un experimento, con roster país-año válido y país sin eventos. Solo entonces diseñar un baseline prospectivo honesto.
