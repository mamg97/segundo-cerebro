# Psicohistoria — Puerta criptográfica de recepción v0.2

## Estado y problema resuelto

El ledger v0.1 almacena **borradores no emitidos** y `sealing.py` prepara compromisos salted SHA-256 y verifica **respuestas RFC 3161** mediante OpenSSL contra una cadena y raíz confiable proporcionadas. Hasta ahora ambas funciones estaban aisladas: poder validar un recibo sobre un fichero arbitrario no probaba que correspondiese a una entrada del ledger ni a los archivos efectivos de código y datos.

`research/psychohistory/prospective_receipt_gate.py` vincula **criptográficamente el borrador privado, el compromiso firmado y cuatro artefactos canónicos**. No contacta automáticamente con ninguna autoridad de sellado ni modifica registros operativos.

## Puertas aplicadas

1. Revalidar todo el ledger con `scan()`: integridad de la cadena, secuencias, IDs y hashes; localizar exclusivamente el hash de entrada solicitado.
2. Releer el `payload` canónico del borrador y exigir identidad exacta con el preparado sellado. El nonce aleatorio de 256 bits y `commitment.bin` deben reconstruir el mismo compromiso SHA-256.
3. Comprobar mediante hash *streaming* los **bytes exactos** de: dataset, código, protocolo del modelo y protocolo de resolución. Rechazar alteraciones, cambios de edición o salidas de la carpeta privada.
4. La edición fuente debe indicar una fecha nominal estrictamente anterior al **día** `asOf`. Una publicación fechada el mismo día, sin hora verificable, se rechaza; esta fecha indicada es solo una **afirmación**, no evidencia externa de disponibilidad.
5. Ejecutar `sealing.verify()` para validar la respuesta RFC 3161 real con OpenSSL y la cadena de confianza proporcionada. Verificar además que el recibo, raíz, ID, hash del compromiso y fecha coinciden con el borrador, y que el sello antecede al instante planificado de emisión.
6. Emitir un **informe create-only privado**, con hashes y metadatos de validación, pero manteniendo siempre `prospectiveEligible=false`, `evaluationEligible=false` y `sourceAvailabilityAsOfVerified=false`.

## Alcance del resultado

El estado más favorable posible en esta fase es:

`RFC3161_SIGNATURE_VALIDATED_PENDING_INDEPENDENT_ASOF_AND_ISSUANCE`

Un certificado raíz suministrado por el operador puede verificar la **firma** sin probar que la TSA sea independiente; tampoco el recibo atestigua que las variables del dataset estuvieran publicadas, que ese pronóstico se hubiera entregado a un destinatario antes del desenlace o que su modelo fuera predictivo. Faltan: validación independiente de la TSA y cadena, procedencia *as-of* externa del dataset, publicación/registro de emisión, y posterior scoring cuando corresponda. **Ningún estado ISSUED, RESOLVED o SCORED queda habilitado.** Esta fase es una mejora real de la puerta técnica, no una predicción nueva.

## Uso en entorno privado

Mantener ledger, preparados, recibos y artefactos íntegramente fuera de Git. Primero preparar un borrador real con el ledger, luego generar compromiso usando `sealing.py prepare` y obtener la respuesta `*.tsr` de una TSA independiente de acuerdo con su política de uso.

```bash
python3 research/psychohistory/prospective_receipt_gate.py \
  --ledger-dir /privado/psycho-ledger \
  --entry-sha256 HASH_DE_LA_ENTRADA \
  --prepared-dir /privado/compromiso-001 \
  --receipt /privado/compromiso-001/receipt.tsr \
  --trust-root /privado/tsa/root.pem \
  --chain /privado/tsa/chain.pem \
  --data-archive /privado/sources/dataset.bin \
  --code-archive /privado/source/model-code.zip \
  --model-protocol /privado/protocol/model.md \
  --resolution-protocol /privado/protocol/outcome.md \
  --report /privado/audits/receipt-check-001.json
```

Si falta cualquiera de estos artefactos, el comando falla sin crear el informe. Un archivo creado con `open('x')` no se sobrescribe. El CLI solo imprime el hash del informe, el hash de la entrada y los flags de seguridad; jamás muestra probabilidades ni datos privados.

## Validación

Tests sintéticos `test_prospective_receipt_gate.py`: identidad de borrador, cadena, cambios de bytes, edición tardía, sello tardío, errores de firma y ausencia permanente de elegibilidad prospectiva. El doble de TSA **simula** el verificador solo para controlar esas puertas. Además, `test_prospective_receipt_openssl.py` genera en tiempo de test una CA y una TSA **ficticias efímeras**, firma un recibo RFC 3161 auténtico a nivel de formato criptográfico con OpenSSL, verifica el circuito completo contra artefactos sintéticos y rechaza su alteración. Es una prueba criptográfica REAL con autoridad AUTOFIRMADA LOCAL, **no** una certificación independiente ni un recibo de TSA externa.

## Próximas fases

- Verificar con una autoridad TSA externa y certificado independiente auténticos —si existe opción gratuita y fiable— una transacción de prueba previamente comprometida, nunca una predicción real todavía.
- Construir inventario de release y evidencia de publicación del primer dataset *as-of*, con licencia y cobertura.
- Congelar objetivo/horizonte/universo y ejecutar `ISSUED` solo cuando todas las puertas estén conectadas, con prueba de emisión **antes** del desenlace.
- Resolver, puntuar y comparar cohortes sin contaminar o borrar pronósticos anteriores.

Coste incremental: cero. No se escriben nuevas filas en `PsicoPredicciones`.
