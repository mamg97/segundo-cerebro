# PSICOHISTORIA v0.6 — hechos fechados UCDP GED 25.1

**Estado:** adaptador offline y pruebas sintéticas. **No se han extraído ni publicado aún incidentes GED oficiales de un caso real.** El modelo Onset 25.1 sigue siendo retrospectivo, no prospectivo sellado.

## Objetivo

Acompañar los **50 casos país-año positivos** del catálogo privado `psychohistory.onset.casebook.v1` con documentación verificable de incidentes de violencia letal registrada por UCDP, incluyendo fecha de inicio/final, actores, lugar, precisión temporal/geográfica y el ID del incidente, **sin convertir ese contexto en una predicción inventada**.

Fuentes oficiales:
- [UCDP Georeferenced Event Dataset v25.1, ZIP CSV](https://ucdp.uu.se/downloads/ged/ged251-csv.zip)
- [Codebook GED 25.1](https://ucdp.uu.se/downloads/ged/ged251.pdf)
- [Archivo UCDP de versiones históricas](https://ucdp.uu.se/downloads/olddw.html)

GED 25.1 cubre **1989–2024**, registra incidentes de violencia letal de varios tipos, y tiene precisiones `date_prec` y `where_prec` que se deben respetar: `date_start` y `date_end` pueden describir un intervalo, **no siempre un día exacto**. Exige citar UCDP y la versión.

## Contrato semántico: imprescindible

- `onset1` en el archivo **country-level UCDP Onset 25.1** significa inicio/reanudación de un conflicto según su definición oficial, medido en **participación de país-año**.
- GED `country_id` y `year` expresan **lugar y calendario de un incidente**, no necesariamente país de la parte armada ni año de primer inicio.
- La coincidencia `country_id + year` **no prueba** que un incidente GED sea el inicio del conflicto ni que pertenezca a la díada cuyo onset se registró. El riesgo de confusión es especialmente alto en conflictos interestatales (una parte puede participar fuera de sus fronteras).
- El adaptador GED se limita deliberadamente a `type_of_violence=1` (eventos ligados a conflicto armado **estatal**). No fusiona la violencia no estatal o unilateral como si fuera su objetivo. No confundir incidentes con «invasiones», «guerras nuevas», «golpes de Estado», ni eventos políticos no letales.
- Las **3 muestras** por país-año se escogen por mayor valor `best` de muertes, con orden estable. Son ejemplos descriptivos sesgados hacia episodios grandes: **no** son los primeros incidentes cronológicos ni prueba del onset. Se registra el **conteo total de incidentes estatales** en el territorio de cada caso y los ausentes no se interpretan como ausencia general de violencia.
- El programa no modifica features, matrices, probabilidades, Brier, scores, `PsicoExperimentos` ni `PsicoPredicciones`. Es evidencia histórica **posterior**, y la publicación retrospectiva de 2025 no estaba disponible en los orígenes históricos.

## Implementación

`research/psychohistory/ged_event_context.py` acepta un ZIP oficial previamente guardado fuera de Git, el hash SHA-256 fijado antes del proceso, un JSON **privado** del casebook y un destino igualmente **privado** y nuevo. Verifica el checksum íntegro, número/tamaño del miembro CSV, cabeceras, duplicados de ID GED, país, año, tipo y campos numéricos/fechas. Procesa el CSV en streaming (no carga ~250 MB completos en RAM), filtra solo país-año indicados, y guarda el siguiente contrato:

`psychohistory.onset.ged_context.v1`, con `gedEventId`, fecha o intervalo, `datePrecision`, `locationPrecision`, lugar, díada, conflicto, valor `bestDeaths`, intervalo de muertes, coordenadas e indicadores `notAnOnsetEventLink=true`, `prospectiveEligible=false`, `asOfVerified=false`.

Preparación **una vez** que el archivo oficial y el casebook se hayan materializado en un entorno privado (sin copiar registros originales a Git):

```bash
python3 research/psychohistory/ged_event_context.py \
  --ged-zip /privado/ged251-csv.zip \
  --expected-sha256 SHA256_VERIFICADO_FUERA_DEL_REPO \
  --casebook-json /privado/onset-casebook-v1.json \
  --output-json /privado/onset-ged-context-v1.json
```

Ni los archivos, ni las identidades de casos del Sheet, ni los ejemplos reales entrarán en este repositorio. Los tests de CI son exclusivamente sintéticos y no acreditan todavía la ejecución sobre GED auténtico.

## Puertas antes de visualizar en la web

1. Descargar y conservar el ZIP original UCDP GED 25.1, con checksum observado y evidencia de procedencia; revisarlo frente al codebook.
2. Ejecutar el adaptador con los casos canónicos extraídos del Sheet privado. Verificar cobertura y revisar manualmente casos con recuento GED nulo y los casos interestatales (pueden tener eventos fuera del país participante).
3. Guardar informe/índice resultante en Google Drive **solo propietario** y, si se desea consumo del Worker, usar un sobre **privado y versionado** en `PsicoExperimentos`, con tamaño limitado, validaciones semánticas y nunca eventos hardcodeados en frontend.
4. Añadir un detalle por caso con fecha, lugar, actores, incertidumbre y la advertencia **«Incidente geolocalizado, no necesariamente el incidente de inicio»**. Nunca presentar como pronóstico de un acontecimiento específico un resultado de un modelo entrenado para `onset1`.
5. Repetir con fuentes verdaderamente disponibles as-of y pronósticos sellados antes de declarar capacidad prospectiva. Los intervalos y la causalidad exigen análisis separado.

**Coste incremental:** cero. Sin cuenta API UCDP ni token: se utiliza la descarga oficial ZIP de uso abierto. La [API oficial UCDP](https://ucdp.uu.se/apidocs/) pide token desde 2026; no implementar acceso no autorizado ni eludir ese requisito.
