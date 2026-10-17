# PSICOHISTORIA — GED v0.6.8 · vínculo factual de incidentes a resultados positivos

**Estado:** constructor offline implementado y pruebas sintéticas. Una ejecución privada con UCDP GED 25.1 oficial y el informe de recencia retrospectivo archivado reconstruyó los vínculos a incidentes reales y verificó identidades, fechas y etiquetas. La salida privada y el manifiesto SHA-256 se guardaron en un archivo nuevo bajo PSICOHISTORIA - EXPERIMENTOS. **No publicar datos ni puntuaciones reales en el Git público.**

## Unidad de análisis: no confundir objetivo y ejemplo histórico

**Objetivo pronosticado en GED v0.6.5:** país elegible con 12 meses completos sin incidentes estatales letales GED de fecha exacta hasta el corte C. Probabilidad retrospectiva de registrar **al menos un** incidente elegible en los 24 meses C+1..T.

**Vínculo factual:** para cada caso con Y=1, el constructor localiza el **primer incidente elegible** en ese intervalo (orden fecha/GED ID); para Y=0, valida que no exista ninguno. El incidente ilustra el desenlace, NO fue pronosticado individualmente. Puede haber varios incidentes posteriores en la misma ventana que el casebook no recoge.

Se mantienen por separado:
- Evento único: GED ID, fecha exacta, país del lugar físico, localidad geocodificada y grado de precisión espacial, lado A/B, díada, conflicto codificado, bajas best/low/high, versión oficial 25.1 y metadatos de fuentes publicadas.
- Vínculo país-horizonte: mes final T, corte C=T−24, fecha **hipotética** de emisión primer día de C+1, cuatro probabilidades congeladas y GED ID del primer evento observado dentro del horizonte.
- Semántica: **un evento puede explicar múltiples ventanas positivas solapadas**. El resultado tiene catálogo de incidentes deduplicado por ID y tabla de vínculos independiente. No sumar vínculos como incidentes, guerras nuevas o aciertos prospectivos.

## Disponibilidad histórica y referencias

Fuente pública oficial: https://ucdp.uu.se/downloads/ged/ged251-csv.zip

Codebook: https://ucdp.uu.se/downloads/ged/ged251.pdf

Dataset: UCDP GED v25.1, revisión de periodos históricos hasta 2024. El campo \`source_date\` recoge fechas de publicaciones fuente cuando existen; **no es la fecha de disponibilidad del registro en UCDP**. Se guarda \`ucdp_record_release_date_verified=null\` y \`information_available_at_historical_issue_verified=false\` hasta contar con una evidencia externa específica. Tampoco existe un sello independiente de la emisión retrospectiva.

Un GED estatal exacto con best≥1 es un incidente de violencia organizada según el dataset; NO demuestra por sí solo inicio de guerra, invasión, revolución, golpe de Estado, disolución gubernamental ni causalidad de un onset UCDP.

## Salvaguardas del módulo

\`research/psychohistory/ged_incident_casebook.py\`:
1. Compara SHA-256 del ZIP original contra el valor indicado, exige un único CSV oficial, límites de tamaño/filas e IDs GED únicos.
2. Aplica exactamente los filtros congelados: \`type_of_violence=1\`, \`best>=1\`, \`date_prec=1\`, \`date_start=date_end\`, fecha compatible con el año y país de localización GED.
3. Verifica el esquema retrospectivo, la definición exacta del target, la cohorte, etiquetas Y, fechas T/C, conteos por partición y existencia/ausencia de eventos dentro del horizonte.
4. Selecciona el primer evento sin inventar un relato narrativo; guarda hechos codificados por UCDP y fechas de fuentes sin fingir verificación as-of.
5. Escritor privado **create-only**, con bloqueo explícito de rutas internas del repositorio público.
6. Pruebas exclusivamente sintéticas: ZIP validado, fecha exacta, rechazo de fechas inciertas, mapeo 1:N, deduplicación, etiquetas incompatibles y no-prospectividad.

La ejecución con fuentes reales se realiza solo desde almacenamiento privado, con manifiesto verificable y sin introducir country-horizon scores en Git. El laboratorio privado v0.5.6 y su grafo de Futuros permanecen sin cambios; no publicar el casebook hasta comprobar el contrato de UI, privacidad y coherencia con el registro canónico.

## Siguiente experimento

Auditar fichas históricas contra el codebook, garantizar visualización de las ventanas y no del «evento predicho», disponer de una fecha real de publicación de fuentes cuando sea posible y crear un target **diferente** para sucesos políticos/económicos antes de prometer previsión de tales acontecimientos.
