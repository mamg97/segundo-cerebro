# AV134 · Sello externo con raíz contrastada independientemente

24/10/2026. Prueba **solo sintética**, sin probabilidades, datos de investigación
ni emisión de un pronóstico real.

## Evidencia obtenida

Se envió una única solicitud RFC3161 del hash de un texto expresamente
sintético al [endpoint documentado por DigiCert](https://knowledge.digicert.com/general-information/rfc3161-compliant-time-stamp-authority-server).
El recibo firmado consigna **24/10/2026 10:18:08 UTC**, algoritmo SHA256 y
política2.16.840.1.114412.7.1. Se conservaron solicitud original, nonce,
respuesta binaria, token, certificados y texto decodificado fuera de Git.

El ancla utilizada se extrajo de `/etc/ssl/cert.pem`; su SHA256 DER es:

`552f7bdcf1a7af9e6ce672017f4f12abf77240c78e761ac203d1d9d20ac89988`

Coincide con la fila única **DigiCert Trusted Root G4** del
[catálogo vigente publicado por Apple](https://support.apple.com/en-us/126047).
Se archivó el HTML completo y se contrastó la huella dentro de esa fila,
no por una coincidencia de nombre en todo el documento. La raíz no se aceptó
solo por descargarla del propio emisor de sellos. La búsqueda previa en el
Keychain SystemRoot no devolvió certificado: no se presenta como éxito.

Esto aporta identificación externa del ancla y una cadena criptográfica
verificada. No equivale a acreditación regulatoria, infalibilidad del operador,
ni a que cualquier contexto o propósito de confianza quede automáticamente
aprobado por aparecer en el catálogo.

## Verificaciones reales

| Comprobación | Resultado |
| --- | --- |
| Firma/cadena y hash del texto exacto con raíz fijada | Verification: OK |
| Firma/cadena y nonce de la solicitud original | Verification: OK |
| Texto diferente | Rechazado: message imprint mismatch |
| Otra solicitud, mismo texto pero nonce diferente | Rechazado: nonce mismatch |
| Raíz no relacionada | Rechazado: certificate verify error |
| Cadena con propósito timestampsign y CRL de toda la cadena | OK |

Se descargaron las dos CRL indicadas en los certificados, se verificaron sus
firmas y se comprobó que la hora de consulta estaba entre lastUpdate y
nextUpdate. La CRL del emisor de sellos vence11/11/2026 16:40:26UTC y la del
emisor intermedio13/11/2026 17:42:35UTC. Estos resultados solo acreditan la
comprobación actual; deben renovarse para usos posteriores. No se prueba
revocación futura ni permanencia del servicio.

El endpoint usa HTTP según la documentación: solo recibió la solicitud del
hash sintético, sin datos privados. La autenticidad del recibo se comprobó
criptográficamente. No hubo credenciales, compra ni infraestructura recurrente.

## Conservación y alcance

Archivo privado `source-archive/tsa-independent-probe-2026-10-24/`:
`PROBE_RESULT.json`, `INDEPENDENT_ANCHOR_CHECK.json`,
`REVOCATION_CHECK.json`, `MANIFEST.json`, originales y `verify_probe.py`.
El verificador de repetición reproduce los dos positivos y tres negativos;
las CRL y su vigencia quedan en el informe separado.

**No se ha sellado un pronóstico real.** Esta prueba no modifica flags del
verificador existente, no acredita disponibilidad as-of de una fuente y no
escribe ISSUED ni PsicoPredicciones. MAC-05 pasa a PARCIAL/NO por preparación
verificada, no a COMPLETADA. Las puertas UCDP permanecen separadas.

Siguiente entrega: integrar una política de ancla fijada y revocación con el
compromiso privado exacto, verificar fuentes antes del corte y preparar la
referencia mensual bajo un contrato explícitamente adaptado tras AV133.
