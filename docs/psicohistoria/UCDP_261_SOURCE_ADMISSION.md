# PSICOHISTORIA — Admisión de la fuente OrganizedViolenceCY 26.1

Estado: **capacidad desarrollada y probada localmente, aún NO fusionada**. Esta entrega no introduce nuevos pronósticos.

## Problema científico

El repositorio ya fija, antes de esta entrega, los hashes SHA-256 del ZIP oficial UCDP Country-Year Organized Violence 26.1 y de su codebook en `research/psychohistory/protocol.json`. `download.mjs` verifica ambos al descargarlos y el runner retrospectivo `benchmark.py` valida el esquema del CSV. No era correcto describir estos hashes como una pieza todavía no implementada.

Esta puerta nueva (`source_release_intake.py`) permite una revisión de admisibilidad **sin entrenar ni puntuar modelos**. Exige el ZIP exacto, el PDF exacto, un CSV seguro, campos oficiales, versión 26.1 por fila, IDs país-año únicos, 7.132 filas, 199 países, años 1989–2025, series nacionales sin huecos internos y conteos de fallecimientos no negativos y enteros. Rechaza ZIPs con rutas peligrosas, miembros adicionales o tamaños desproporcionados.

**Qué NO demuestra:** los hashes garantizan identidad de contenido respecto al protocolo ya fijado, no la fecha original de publicación ni que un fichero concreto fuese accesible en cada corte histórico. Un reloj local o una URL actual no son por sí solos sellos temporales independientes. El resultado siempre declara `historicalAsOfVerified=false`, `independentPublicationEvidenceVerified=false`, `prospectiveEligible=false` y `modelTrained=false`. Tampoco prueba que se haya emitido ningún pronóstico.

## Uso privado

Mantener las fuentes y resultados fuera del repositorio público:

```bash
# Ejecutar desde el repositorio (cuando esta rama esté integrada)
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

Las cinco pruebas de `test_source_release_intake.py` utilizan solo filas, países y ZIPs inequívocamente **sintéticos**. No incorporan microdatos UCDP, credenciales, datasets reales ni informes experimentales en Git. La ejecución local de esta entrega pasa 5/5 pruebas. No sustituye CI de la PR ni una validación con los bytes UCDP oficiales.
