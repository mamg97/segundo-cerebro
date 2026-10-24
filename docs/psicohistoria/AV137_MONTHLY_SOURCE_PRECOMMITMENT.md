# AV137 — Fuente anterior al corte y cálculo preparatorio

24/10/2026. Tras publicar/fusionar el contrato AV136 (PR #832), se descarga de
nuevo el original público de ALFRED mediante HTTPS con comprobación de certificado.
Se conservan formulario, respuesta original, cabeceras, metadata y hashes privados.
Auditoría: 189 meses, 335 intervalos, exportación del día de captura.

## Evidencia temporal y cálculo

Se envía a DigiCert solo una solicitud RFC3161 con la huella del archivo público y
nonce aleatorio. El verificador AV135 valida raíz/catálogo fijados, propósito,
política, impronta, nonce y CRL del firmante real del CMS. El sello externo del
24/10 es anterior al corte del 25/10 23:59:59 UTC. Informe y recibo privados.

La TSA demuestra existencia de los bytes identificados, no quién los publicó.
La procedencia oficial se observa separadamente mediante la descarga HTTPS. Esto
no autentica retroactivamente bytes de una primera publicación BLS histórica.

Se ejecuta una preparación de la referencia para noviembre con el contrato ya
publicado. Quedan 58 pares válidos y 2 excluidos por extremos ausentes, sin imputar.
Un segundo programa privado lee directamente el CSV y usa Fraction, sin importar
el motor: confirma todos los pares/diferencias, la base y numerador/denominador
exactos de la probabilidad. Resultado PASS. Probabilidades y originales privados.

## Estado y siguiente paso

No es una emisión. No se ha sellado todavía el compromiso de forecast ni se ha
inscrito una predicción en la fuente canónica. MAC-02/03/05 siguen PARCIAL/NO.
El futuro corte aún no ha terminado y la ventana de emisión comienza el día26.

Siguiente: implementar la transición privada append-only que consume la evidencia
de fuente, contrato, ledger y recibo exactos, con hora efectiva dentro de la ventana,
registro idempotente y comprobación de inscripción canónica. Probar rechazo de
emisión prematura/tardía, duplicada, fuente/código alterados o recibos no coincidentes.
Solo entonces preparar el alta real durante la ventana fijada; si no se llega,
registrar omisión. No abrir otra familia de modelos ni alterar AV133.
