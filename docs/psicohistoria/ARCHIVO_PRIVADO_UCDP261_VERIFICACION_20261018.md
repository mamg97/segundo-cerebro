# PSICOHISTORIA — Archivo privado UCDP 26.1 verificado · 18/10/2026

## Archivo canónico recuperado

En la carpeta **privada** `PSICOHISTORIA - EXPERIMENTOS` de Google Drive
existe desde el 16/10/2026 el paquete
`PSICOHISTORIA_UCDP_261_REPRODUCCION.zip`, de 833.213 bytes.
El archivo no está compartido públicamente según los metadatos de Drive.
**No publicar ni copiar a Git** este paquete: contiene resultados científicos
y artefactos reales, además de los originales UCDP.

| Miembro privado | SHA-256 comparado con `protocol.json` | Resultado |
| --- | --- | --- |
| `sources/ucdp.zip` | `66910888f5653af42776d2debc1d72fe527559e7f7fc82e69b7c8771467f2d34` | Coincide |
| `sources/codebook.pdf` | `88ba683426c2596fab908fcd68ae184025d0804ca9a099dea513898214b92b3c` | Coincide |

`MANIFEST.json` cubre los **24 archivos restantes** del paquete y su
verificación completa contra los bytes retornó **24/24 coincidencias**.
`sources/sources.json` incluye los dos hashes, nombres y URLs oficiales.
El ZIP anidado contiene `OrganizedViolenceCYDataSet26_1.csv` con
**7.132 filas, 199 países, 1989–2025, sin duplicados país-año ni huecos
internos**. La comprobación directa sobre el paquete privado es independiente
de la segunda descarga efectuada por GitHub Actions en el
[run 39130567553](https://github.com/mamg97/segundo-cerebro/actions/runs/39130567553).

**Distinción fundamental:** comparar hashes con el manifiesto incluido en
el mismo ZIP detecta modificaciones, pero no demuestra que el ZIP completo
fuera públicamente accesible en una fecha anterior, ni acredita una TSA
independiente. Los metadatos de Drive de creación el 16/10/2026 son
información del proveedor, NO un recibo RFC 3161 de la emisión del pronóstico.

## Verificador reutilizable

`research/psychohistory/private_archive_intake.py` recibe un ZIP existente
almacenado **fuera** del repositorio público, valida nombres seguros, entradas
sin duplicados, hashes completos de todos los miembros, coincidencia del
protocolo archivado con el actual, procedencia oficial y los dos originales
anidados, y delega la validación país-año a
`source_release_intake.inspect()`. Solo devuelve metadatos agregados y
conserva `sourcePublicationAsOfVerified=false`,
`independentTimestampReceiptVerified=false`,
`prospectiveEligible=false`. Las pruebas automatizadas usan archivos
ficticios, jamás microdatos o pronósticos.

No se vuelve a descargar ni a duplicar el archivo real en Drive.

## Rehearsal 2027 preexistente: no reutilizar como emisión

También hay un paquete privado anterior,
`PSICOHISTORIA_2027_CANDIDATOS_NO_SELLADOS.zip` (17/10/2026).
Su `manifest.json` declara
`UNSEALED_DRY_RUN_DO_NOT_SCORE_AS_PROSPECTIVE`.
Consta de 196 países, **cinco modelos**, cuatro horizontes y
3.920 candidatos preparatorios sin resultados observados. El paquete
contiene `seal/request.tsq`, que es solo una **solicitud RFC 3161**,
sin respuesta sellada por una autoridad independiente.
`external_timestamp_receipt_verified=false`;
`eligible_for_prospective_scoring=false`.

No mezclar esta reproducción retrospectiva/preparatoria de **cinco
modelos** con el runner actual `future_2027_candidates.py`, que exige
**seis modelos preregistrados**, baseline y `outcome=null`.
No hay cohortes prospectivas emitidas ni evaluación de skill real.

## Próximas puertas separadas

1. Ejecutar `future_2027_candidates.py` con los originales archivados
   en un entorno **privado**, conservar su JSON create-only y bloquearlo
   como `NOT_ISSUED`.
2. Fijar el universo exacto, algoritmo/baseline, código, as-of de features,
   protocolo de resolución anual y evidencias externas temporalmente válidas.
3. Obtener y validar un recibo temporal **real** de una TSA independiente
   sobre el compromiso del pronóstico, preservar el recibo en privado y
   hacer el append-only `ISSUED` únicamente después de demostrar todas
   las condiciones. Nunca inferir `ISSUED` por hash, fecha de fichero,
   publicación de noticia, request TSQ o ensayo en CI.

El presente informe es **un registro técnico de verificación de fuentes**,
no de emisión ni de validación de acierto predictivo.
