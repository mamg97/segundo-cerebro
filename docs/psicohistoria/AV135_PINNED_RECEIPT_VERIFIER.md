# AV135 — Verificador de recibo con ancla externa fijada

24/10/2026. Infraestructura de preparación; ninguna emisión ni score nuevos.

## Cambio

`independent_timestamp.py` integra la política de raíz DigiCert Trusted Root G4
contrastada en AV134 contra el catálogo independiente Apple. Exige el SHA256 DER
de esa única raíz y los bytes exactos del catálogo archivado y revisado. No ofrece
una opción para admitir otra raíz o declarar confianza mediante un booleano.
Una actualización de política requiere revisión explícita; el archivo del catálogo
no se descarga ni autentica de nuevo durante esta verificación offline.

Cada ejecución copia los inputs a un directorio temporal y verifica: contenido
exacto, solicitud original con nonce obligatorio, política RFC3161, tiempo no futuro,
cadena y propósito timestampsign. Extrae el CMS del mismo recibo y verifica su
firmante real con `-crl_check_all`. La CAfile contiene exclusivamente la raíz fijada
y CRL; la ruta CA adicional está vacía. Los certificados suministrados no se vuelven
anclas. PEM con certificados añadidos a una raíz o a las CRL se rechaza.

El wrapper `verify_independent_precommitment` compone la comprobación de ledger,
artefactos, compromiso y fechas existente. Repite el gate para detectar cambios y
exige que el sello esté entre asOf e issuedAt. Mantiene las puertas de fuente,
emisión y evaluación en falso. No cambia el comportamiento del verificador antiguo.

## Evidencia

- Siete pruebas con CA/TSA sintéticas efímeras: integración con ledger, pins/política,
  revocación del firmante, CRL caducada, CAfile mezclada/falta de CRL, contenido/nonce
  distinto y solicitud sin nonce. OpenSSL comprueba firmas realmente. La caducidad
  usa el reloj `-attime` del verificador CMS a 36h: certificado válido48h, CRL24h.
- Dieciocho pruebas prospectivas anteriores siguen pasando.
- El nuevo CLI verifica también el recibo DigiCert sintético conservado en AV134,
  con los pins de producción y las CRL archivadas todavía vigentes. Informe privado.
  No se ha contactado al proveedor ni creado una predicción nueva para esta prueba.
- Claves de tests solo temporales; originales, certificados y recibos fuera de Git.

## Límite operativo

Las CRL deben ser válidas al comprobar, no solo al sellar. Un archivo histórico
cuyo CRL haya vencido será rechazado hasta conseguir evidencia actual; no se
retrocede el reloj en producción. Este verificador necesita reloj local correcto,
OpenSSL compatible y revisión del ancla ante cambios. No acredita disponibilidad
histórica de datos, publicación de una predicción ni utilidad predictiva.
MAC-05 permanece PARCIAL/NO. Siguiente: contrato adaptado de referencia mensual,
captura demostrable antes del corte y alta de emisión append-only con evidencia.
