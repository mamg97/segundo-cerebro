# PSICOHISTORIA — Puerta RFC 3161: nonce original y alcance de confianza

**Fecha:** 2026-10-18 · **Estado:** endurecimiento técnico, SIN emisión real.

## Hallazgo

`sealing.verify()` ya verificaba el *message imprint* del compromiso y la
firma RFC 3161 con `openssl ts -verify -data`, pero **no comprobaba la
respuesta contra la solicitud original `request.tsq`**. Sin esa comparación
no estaba acreditado que la respuesta se hubiese emitido en contestación al
*nonce* generado para nuestra solicitud; un token anterior para el mismo
contenido podía superar las comprobaciones de firma y digest.

También devolvía `independentTimestamp=true` tras verificar una firma con
`trust_root` suministrado por el llamador. Esa firma puede ser técnicamente
válida aunque el ancla corresponda a una CA propia o no acreditada. Por eso
esa etiqueta excedía lo efectivamente probado.

## Corrección

- Dos verificaciones consecutivas, ambas obligatorias:
  1. `openssl ts -verify -data commitment.bin -in receipt.tsr` comprueba que el token firma el compromiso **exacto**.
  2. `openssl ts -verify -queryfile request.tsq -in receipt.tsr` vincula el
     token con el *nonce* original, además del algoritmo e impronta.
- Solicitud original ausente, symlink o modificada: **fallo cerrado**.
- `sealing.verify` ahora devuelve `rfc3161SignatureVerifiedWithSuppliedTrustRoot=true`,
  `rfc3161RequestNonceMatched=true` e `independentTimestamp=false`.
  El valor false **no** indica fallo de firma: significa que la
  independencia y el reconocimiento externo del prestador NO se evalúan
  con el fichero CA proporcionado.
- `prospective_receipt_gate.verify_precommitment` exige el nuevo contrato;
  el informe sigue declarando `externalAuthorityIndependenceVerified=false`,
  `sourceAvailabilityAsOfVerified=false` y `prospectiveEligible=false`.
- Prueba OpenSSL real con **CA/TSA efímeras y datos sintéticos**: un
  `request.tsq` nuevo (mismo commitment, distinto nonce) **debe fallar**
  frente al TSR original. También se ensayan consultas ausentes y tokens
  corrompidos.

## Frontera de ciencia reproducible

La [RFC 3161](https://www.rfc-editor.org/rfc/rfc3161) exige comprobar
la exactitud del *imprint*, la firma/certificado del emisor y la adecuación
del *nonce* de solicitud/respuesta para defenderse frente a repeticiones.
La inclusión de una CA en una trustlist reconocida o la aprobación
independiente del prestador es **una comprobación distinta** de
`openssl ts -verify -CAfile certificado-suministrado`.

Referencia a la lista de confianza europea:
https://eidas.ec.europa.eu/efda/trust-services/browse/eidas/tls

La prueba FreeTSA previa con muestra ficticia certificó
interoperabilidad y firma bajo la raíz del operador,
no que FreeTSA estuviese en una trustlist ni que fuese una TSA cualificada.

## Cobertura retrospectiva del verificador de cohortes legado — 18/10/2026

Además de `sealing.py`, la ruta histórica `cohort_timestamp.py` utilizada
por el antiguo ensayo de cinco modelos conservaba la misma debilidad:
verificaba RFC3161 con `-data` sin comparar `request.tsq`.
Se añadió comprobación obligatoria adicional con `-queryfile` de la
**solicitud original**, fail-closed si falta o es symlink, y prueba de
integración que firma un TSR auténtico con CA/TSA **locales ficticias**
y demuestra el rechazo de un TSQ con otro nonce para el mismo compromiso.

La evidencia de salida deja de llamar `independently_signed_utc` a un
sello validado solo con un CA suministrado por el operador; ahora se
denomina `signed_timestamp_utc_against_supplied_ca` y declara
`tsa_independence_verified=false`. Ningún resultado de esa ruta
es un pronóstico prospectivo emitido ni habilita puntuación futura.

**No se ha transmitido un solo compromiso de predicción real a una
TSA ni insertado emisiones en `PsicoPredicciones`.**
