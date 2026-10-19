# PSICOHISTORIA — Revisión de discordancias por nombres de Estados

**19/10/2026 · Avance propuesto 33.** Este procedimiento **no
aprueba un crosswalk**, no construye etiquetas de violencia y no
autoriza scores o emisiones.

## Motivación

El [avance 32](COW_GW_TOKEN_REVIEW.md) aisló cuatro coincidencias de
abreviatura con código diferente y doce registros (cinco COW y siete
Gleditsch–Ward) sin la misma abreviatura en diciembre de 2020.

Se han contrastado las fuentes públicas en versión fija:
[COW 2024 y Gleditsch–Ward 7.0 con suplemento de microestados](https://github.com/brentonk/us_diplomatic_missions/tree/0dda0ef93b7958f67c79031c1695dd9e5408a62c/input).
La revisión de esas doce ausencias requiere distinguir diferencias
de texto de delimitación político-territorial. Una relación meramente
lexical **no** es una equivalencia país-año.

## Nuevo método de triaje

El módulo `research/psychohistory/cow_gw_name_triage.py` valida
primero los tres archivos con los lectores existentes, conserva sus
SHA-256 observados en octubre de 2026 y selecciona países miembros del
mes completo. Los meses posteriores a 2020 se marcan como **GW
fuera de cobertura** y los posteriores a 2024 como **ambos fuera de
cobertura**.

Entre los registros que no tienen abreviatura común se buscan
nombres que coincidan **solo tras normalizar Unicode, espacios y
mayúsculas**, exigiendo una coincidencia uno a uno dentro de cada
fuente. Se rechazan nombres repetidos, abreviaturas activas ambiguas,
intervalos inválidos y respuestas fuera del período de vigencia.

Se publican solo agregados: cuántos nombres idénticos tienen
abreviaturas diferentes, cuántos códigos numéricos son iguales o
diferentes, cuántos nombres son ambiguos y cuántos Estados siguen
sin correspondencia. Los registros concretos para revisión opcional
se guardarían con permisos `0600` en un archivo privado de
**creación exclusiva**, nunca dentro del repositorio ni en CI.

Incluso cuando coincide nombre, abreviatura y código, pueden
diferir las reglas de reconocimiento, independencia y delimitación
territorial. Ningún caso se aprueba sin examen documental,
fechas efectivas y política sobre sucesión/microestados.

## Puertas científicas vigentes

- COW v2024 fue publicada después de 2024; Gleditsch–Ward 7.0
  termina en diciembre de 2020.
- La pertenencia al sistema estatal no prueba cobertura de países
  sin incidentes en Candidate.
- Ningún hash calculado en 2026 demuestra la disponibilidad de sus
  bytes antes de emitir una predicción hipotética en 2020 o 2024.
- `geographic_identity_verified=false`, `source_as_of_verified=false`,
  `ucdp_country_coverage_verified=false`,
  `absence_of_events_means_negative=false`,
  `vintage_correct_backtest=false`, `models_scored=false`,
  `forecast_issued=false`.

[Workflow de inspección real](../../.github/workflows/psychohistory-cow-gw-name-triage.yml).
La sección de resultados empíricos se incorporará tras pasar CI.
