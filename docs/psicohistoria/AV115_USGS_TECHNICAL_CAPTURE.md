# AV-115 — Captura conjunta del pronóstico y su archivo técnico

23/10/2026. Implementación derivada de [AV-114](AV114_USGS_GEOMETRY_PROVENANCE.md), sin emisión real.

`usgs_oaf_prewindow_capture.py` exige ahora también `forecast_data.json` de la misma identidad y versión de producto que `forecast.json`. Comprueba URL oficial exacta, ID del evento, un único indicador de modelo publicado y la igualdad completa del objeto JSON seleccionado con el pronóstico público. Formatos sin un único objeto compatible se rechazan; no hay sustitución automática por otro modelo.

El capturador guarda tres originales con SHA-256: detalle ComCat, pronóstico y archivo técnico. Solo admite la captura si tanto la recepción técnica como la persistencia de los tres archivos preceden al inicio de la ventana. El manifiesto v2 registra modelo seleccionado y verificación del par. Conserva `local_clock_independently_attested=false` y `forecast_issued_by_psicohistoria=false`.

Siete pruebas sintéticas pasan: integridad y creación única; ventana iniciada; persistencia tardía; URL de pronóstico ajena; identidad/modelo técnico incorrecto, ambiguo o incompatible; URL técnica ajena; descarga técnica que llega exactamente al inicio y se rechaza sin archivo admitido. No se añadieron dependencias, automatizaciones ni consultas de desenlaces.

Límite: igualdad de archivos y reloj local no acreditan disponibilidad histórica independiente, completitud del catálogo, contrato de outcome ni habilidad. La nueva capacidad no convierte los archivos retrospectivos de AV-114 en capturas prospectivas. `SIS-02` sigue `PARCIAL/NO`; falta una captura real admitida y el protocolo científico de evaluación.
