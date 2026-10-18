# PSICOHISTORIA — Admisión de la fuente OrganizedViolenceCY 26.1

Estado: **integrada en `main` mediante PR #613**, tras superar pruebas y control de privacidad. **El ZIP y el PDF oficiales todavía no se han validado contra sus hashes en un entorno con acceso a los archivos.** Esta entrega no introduce nuevos pronósticos.

## Problema científico

El repositorio ya fija, antes de esta entrega, los hashes SHA-256 del ZIP oficial UCDP Country-Year Organized Violence 26.1 y de su codebook en `research/psychohistory/protocol.json`. `download.mjs` verifica ambos al descargarlos y el runner retrospectivo `benchmark.py` valida el esquema del CSV. No era correcto describir estos hashes como una pieza todavía no implementada.

Esta puerta nueva (`source_release_intake.py`) permite una revisión de admisibilidad **sin entrenar ni puntuar modelos**. Exige el ZIP exacto, el PDF exacto, un CSV seguro, campos oficiales, versión 26.1 por fila, IDs país-año únicos, 7.132 filas, 199 países, años 1989–2025, series nacionales sin huecos internos y conteos de fallecimientos no negativos y enteros. Rechaza ZIPs con rutas peligrosas, miembros adicionales o tamaños desproporcionados.

**Qué NO demuestra:** los hashes garantizan identidad de contenido respecto al protocolo ya fijado, no la fecha original de publicación ni que un fichero concreto fuese accesible en cada corte histórico. Un reloj local o una URL actual no son por sí solos sellos temporales independientes. El resultado siempre declara `historicalAsOfVerified=false`, `independentPublicationEvidenceVerified=false`, `prospectiveEligible=false` y `modelTrained=false`. Tampoco prueba que se haya emitido ningún pronóstico.

## Auditoría de bytes oficiales — 18/10/2026

**Evidencia empírica positiva:** [GitHub Actions run 39130567553](https://github.com/mamg97/segundo-cerebro/actions/runs/39130567553),
job `official-source-probe`, `success`. Un runner efímero descargó **el ZIP y el
codebook oficiales originales** de las dos URL registradas; `download.mjs`
verificó que **ambos SHA-256 coinciden exactamente** con `protocol.json`;
`source_release_intake.py` validó **7.132 filas, 199 países, 1989–2025**;
y `benchmark.audit(strict=True)` pasó sobre el CSV real.

**Hallazgo de esquema:** el codebook 26.1 **documenta** columnas `*_cy`,
pero las cabeceras del ZIP real descargado con el checksum fijado utilizan
`country_id` y `year` sin ese sufijo (`INTERNAL_ALIASES` en los logs).
Por tanto el código previo ya era compatible con el CSV original. Se
descartó el adaptador de cabeceras propuesto inicialmente: habría agregado
complejidad no necesaria para los bytes fijados. Se conservan el validador,
benchmark, tests y hashes originales sin cambios.

**Límite operativo:** los originales y el manifiesto se procesaron en
`RUNNER_TEMP` y se borraron al finalizar el job, **sin subir archivos a
GitHub/artifacts**. Aún falta archivar permanentemente ambos originales y el
manifiesto en Drive privado. El hecho de descargarlos durante este workflow
acredita acceso a los bytes en la fecha de ejecución, **no acredita su
disponibilidad histórica exacta en junio de 2026, ni una TSA independiente,
ni una emisión prospectiva**. `PsicoPredicciones` sigue con cero filas.

## Uso privado

Mantener las fuentes y resultados fuera del repositorio público:

```bash
# Ejecutar desde el repositorio (PR #613 ya integrada)
node research/psychohistory/download.mjs "$HOME/Private/PSICOHISTORIA/UCDP_CY_26_1"
mkdir -p "$HOME/Private/PSICOHISTORIA/AUDITS"
python3 research/psychohistory/source_release_intake.py \
  --source-dir "$HOME/Private/PSICOHISTORIA/UCDP_CY_26_1" \
  --out "$HOME/Private/PSICOHISTORIA/AUDITS/ucdp_cy261_source_intake.json"
```

El comando lee **exclusivamente el protocolo del repositorio** y crea el manifiesto con `open('x')` para no sobrescribir pruebas previas. El informe solo contiene hashes, recuentos agregados, período, versión y flags de verificación. Almacenar ese manifiesto y los originales en Drive **privado**, sin publicar los microdatos en Git.

## Próxima puerta

1. Recuperar efectivamente ZIP y PDF oficiales con el downloader; verificar que coinciden los SHA preregistrados; conservar copia privada de los bytes (esta sesión no pudo obtenerlos ni localizar su copia en Drive).
2. Obtener prueba independiente de fecha/edición de publicación, con trazabilidad temporal antes del `asOf` de las variables que se usarán para el horizonte futuro.
3. Construir las features del primer origen futuro únicamente con información anterior al corte; fijar universo y baseline (el benchmark retrospectivo actual no genera sin cambios predicciones de un año sin resultado observado).
4. Crear un borrador privado; comprobar contenido, recibo de TSA independiente y contrato de resolución. Solo después habilitar una **primera emisión**. La calibración y utilidad requerirán observar resultados posteriores y un número de casos suficiente.

## Pruebas

Las cinco pruebas de `test_source_release_intake.py` utilizan solo filas, países y ZIPs inequívocamente **sintéticos**. No incorporan microdatos UCDP, credenciales, datasets reales ni informes experimentales en Git. La ejecución local de esta entrega pasa 5/5 pruebas. La CI de PR #613 y el control de privacidad pasaron. No sustituye una validación con los bytes UCDP oficiales.
