# PSICOHISTORIA — Vintages y ensayo prospectivo para 2027

**Estado:** investigación reproducible. NO se ha emitido ni sellado un pronóstico prospectivo. Revisión 17/10/2026.

## Archivo oficial de versiones UCDP

El [archivo histórico de UCDP](https://ucdp.uu.se/downloads/olddw.html) publica ediciones anteriores de OrganizedViolenceCY: **23.1 (XLSX), 24.1 (CSV) y 25.1 (CSV)**. La edición 26.1 cubre 1989–2025.

- 24.1: https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy-241-csv.zip
- 25.1: https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy-251-csv.zip
- 26.1: https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy-261-csv.zip
- Codebook 25.1: https://ucdp.uu.se/downloads/organizedviolencecy/UCDP_OrganizedViolenceCY_Codebook_251.pdf

Una release editorial 25.1 no pudo estar disponible cuando se originaban predicciones en 2016/2020. **Versión histórica** no implica **disponibilidad demostrada en cada origen**. Su utilización permite medir revisiones retrospectivas; no basta para declarar evaluación vintage-correct. Filtrar un año en la API actual tampoco recupera lo que se sabía entonces.

## Comparador de ediciones

Archivo: research/psychohistory/vintage_audit.py. Acepta únicamente CSV ZIP de 24.1/25.1/26.1, con checksum SHA-256 fijado previamente y filas country-year auditadas. 23.1 requiere un adaptador XLSX posterior. Cuantifica cambios de conteos y de la etiqueta binaria de 25 muertes solo en país-año presentes en ambas ediciones. Países-año ausentes no se imputan como negativos. El informe es descriptivo y SIEMPRE marca as_of_verified=false.

Ejemplo con archivos oficiales ya guardados fuera del repo (reemplazar HASH_251_FIJADO por valor efectivamente revisado):

    python3 research/psychohistory/vintage_audit.py \
      --earlier /privado/ucdp-251.zip --earlier-version 25.1 \
      --earlier-sha256 HASH_251_FIJADO \
      --later /privado/ucdp-261.zip --later-version 26.1 \
      --later-sha256 66910888f5653af42776d2debc1d72fe527559e7f7fc82e69b7c8771467f2d34 \
      --output /privado/revisiones.json

## Preparación no sellada de una cohorte de 2027

Archivo: research/psychohistory/prospective_rehearsal.py.

Solo acepta un año objetivo todavía no iniciado y entradas auditadas cuyo último año sea exactamente objetivo−2. Para origen 2027 los datos terminan en 2025; 2026 es un puente no observado, que se integra sin condicionar con datos posteriores. Los cinco modelos producen distribuciones de cuatro estados y riesgo acumulado de superar el umbral en horizontes declarados 1, 3, 5 y 10. No generan scores ni incluyen desenlaces futuros.

Ejemplo con datos verificados y directorios privados:

    node research/psychohistory/download.mjs /privado/ucdp26
    python3 research/psychohistory/prospective_rehearsal.py \
      --data-dir /privado/ucdp26 \
      --target-year 2027 \
      --output-dir /privado/candidato-2027

El resultado es **UNSEALED_DRY_RUN_DO_NOT_SCORE_AS_PROSPECTIVE**. Crea manifest y archivo con permisos privados, no sobrescribe previos y prohíbe guardarlos en el repo. La hora local y el hash propio NO acreditan por sí solos la fecha real de emisión.

## Puertas antes de emitir y evaluar

1. Demostrar con evidencia independiente que los bytes exactos del dataset estaban disponibles antes de emitir (referencia, checksum SHA-256 y fecha contrastable).
2. Congelar universo de países, cinco modelos, priors, años y probabilidades en un lote privado; tramitar compromiso salado ante TSA RFC3161 de confianza y verificar la respuesta antes de atribuirle independencia temporal. sealing.py solo contiene el mecanismo inicial para casos individuales; el sellado de lotes falta.
3. Mantener el evaluador prospectivo en modo fail-closed. No colocar candidatos como RESUELTA o VERIFICADA en PsicoPredicciones ni declarar habilidad predictiva sin verificación.
4. Tras disponer de observaciones oficiales completas de 2027 (previsiblemente en 2028, no garantizado), puntuar TODO lo congelado, con cobertura, exclusiones y revisiones. Los horizontes 3, 5 y 10 se resolverán mucho más adelante.

**No se ha demostrado forecasting prospectivo.** La arquitectura sigue sin costes incrementales, sin nuevos cron y sin datos operativos reales publicados en GitHub.
