# PSICOHISTORIA — TSA externa: prueba real, **solo sintética** · 18/10/2026

## Resultado empírico

El workflow `.github/workflows/psychohistory-external-tsa-probe.yml` crea
un fichero fijo **ficticio** y ejecuta `openssl ts -query -sha256 -cert`.
Un runner efímero obtiene una respuesta firmada auténtica de
`https://freetsa.org/tsr` y descarga certificados públicos desde el
sitio HTTPS del proveedor.

**Evidencia:** [GitHub Actions run 39133887629](https://github.com/mamg97/segundo-cerebro/actions/runs/39133887629),
job `verify-external-tsa-with-fake-data`: **success**.
OpenSSL `ts -verify -data` respondió `Verification: OK`.
El token emitido consigna `Oct 18 13:58:26 2026 GMT`. La raíz pública
servida por la TSA exhibía la huella SHA-256:
`A6:37:9E:7C:EC:C0:5F:AA:3C:BF:07:60:13:D7:45:E3:27:BB:BA:A3:8C:0B:9A:F2:24:69:D4:70:1D:18:AA:BC`.

**Qué se prueba:** funcionamiento real del protocolo RFC 3161 con un operador
externo, correspondencia exacta del hash de la muestra ficticia y cadena
válida **respecto de la raíz publicada por el mismo proveedor**. El servicio
publica procedimiento de solicitud y certificados:
https://freetsa.org/index_en.php; la TSA informa de renovación de su
certificado en marzo de 2026.

**Qué NO se prueba:** respaldo independiente o acreditación de la raíz de
confianza externa, identidad regulatoria del prestador, continuidad de
disponibilidad futura, publicación as-of del ZIP UCDP, emisión real, mérito
predictivo o sellado de la cohorte 2027. Una verificación criptográfica con
raíz proporcionada por la propia TSA no satisface por sí sola el requisito
`externalAuthorityIndependenceVerified`.

## Aislamiento de privacidad y coste

- El contenido transmitido es la muestra inequívocamente sintética
  `SYNTHETIC TEST - NOT A FORECAST - NO REAL DATA`, nunca datos privados.
- No se transmiten probabilidades, IDs de países de la cohorte, hashes de
  artefactos reales, claves, credenciales ni identificadores familiares.
- No se publica ningún TSR ni se sube como artifact; `RUNNER_TEMP`
  se elimina tras la prueba.
- Sin cron, consumo continuo ni nueva infraestructura de pago.

## Puerta pendiente para un pronóstico real

1. Auditoría previa de fuente 26.1 y disponibilidad temporal **antes de la
   emisión efectiva**, fijando universo y decisión de modelo/baseline.
2. Preparar en privado el payload de cada predicción, nonce y compromiso
   exacto, junto con archivos congelados de código/datos/protocolo y hash de
   resolución. No emplear resultados 2027 ni fechas históricas ficticias.
3. Identificar y fijar un ancla de confianza de TSA verificable por terceros,
   distinta de simplemente aceptar una CA servida por el mismo endpoint.
4. Enviar **solo la solicitud RFC3161 de un compromiso privado** desde
   infraestructura autorizada; recibir TSR auténtico, verificar timestamp
   y ligadura criptográfica con `sealing.verify` y
   `prospective_receipt_gate.py`. Guardar recibo exclusivamente en Drive
   privado, sin datos en Git, logs de Actions ni servicios públicos de archivo.
5. Efectuar append-only en registro privado y etiquetar `ISSUED` **solo si
   todas** las evidencias (independencia de TSA, source as-of y emisión real)
   son suficientes. Esta prueba sintética deja `ISSUED=0`.

El código del motor y los SHA preregistrados de UCDP no se modifican.
