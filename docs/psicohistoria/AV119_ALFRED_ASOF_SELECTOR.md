# AV-119 — Selección histórica diaria de UNRATE

23/10/2026. Implementación y contraste del selector de vintages; sin modelo ni evaluación predictiva.

## Fuentes y contrato

El [formulario oficial ALFRED](https://alfred.stlouisfed.org/series/downloaddata?seid=UNRATE) produjo dos ZIP archivados completos fuera de Git con sus solicitudes:

- Periodos de vigencia: 4.102 bytes, SHA-256 `e062befc437536d15e0604b3cffb34ff851851e9f5f9cd82ba1ebf8748d5c30b`.
- Cuatro vintages diarios: 1.843 bytes, SHA-256 `47eee0f1ccd82e2f8bceddc3528f54117470a882e9cc523ec176d29fe7a3aedc`.

La [ayuda ALFRED](https://alfred.stlouisfed.org/help/downloaddata) define inicio y fin como las primeras y últimas fechas en las que un valor es la revisión vigente; un fin vacío identifica la versión todavía vigente al generar la descarga. El auditor limita esa extensión a la fecha de exportación del README. No interpreta un extremo vacío como conocimiento de futuros vintages.

## Implementación

`research/psychohistory/alfred_asof_audit.py` comprueba los hashes, tamaños, miembros ZIP, serie UNRATE, unidades en porcentaje, frecuencia mensual, ajuste estacional, formato, fecha de exportación y esquema CSV. Exige meses consecutivos en el rango solicitado; intervalos ordenados, contiguos y sin solapamientos; tasas finitas o ausencia explícita; y un único intervalo terminal abierto por mes. Una exportación parcial que no satisface esas condiciones falla, aunque pudiera servir para otro uso.

El selector usa extremos diarios inclusivos y distingue `NOT_YET_RELEASED`, `MISSING` y `AVAILABLE`. No imputa ceros, no devuelve una revisión posterior al corte ni admite cortes posteriores al archivo. La fecha de inicio de la versión se conserva junto con cada valor seleccionado. Es una herramienta para consultar la convención temporal archivada por ALFRED, no una atestación intradía de la publicación BLS.

## Verificación

- Nueve pruebas sintéticas: bordes de revisión, ausencia, fecha futura, huecos, solapes, orden, terminal truncado, tasas/fechas inválidas, integridad, unidades transformadas, CSV malformado y contraste de exportaciones.
- Archivo real: **335 intervalos y 189 meses**, enero de 2011–septiembre de 2026.
- Exportación independiente del mismo proveedor: **724 celdas coincidentes**, 181 meses por cuatro cortes (19/20 de noviembre de 2025 y 10/11 de febrero de 2026). También se verifica que los meses omitidos no contienen valores disponibles en esos cortes.

Los cortes recuperan la publicación retrasada de septiembre de 2025 y la aparición de enero de 2026; octubre de 2025 permanece ausente. Este contraste comprueba coherencia entre dos formatos ALFRED, sin convertirlos en dos proveedores independientes.

## Estado

`MAC-02` permanece `PARCIAL/NO`. Queda definir el calendario de cortes, contrato de etiqueta a seis meses, población de entrenamiento, modelo y comparadores antes de ejecutar un experimento. El selector desbloquea la preparación de predictores históricos bajo la convención diaria declarada; no acredita pronósticos emitidos, disponibilidad intradía ni habilidad predictiva. El informe privado es `asof_audit.json`.
