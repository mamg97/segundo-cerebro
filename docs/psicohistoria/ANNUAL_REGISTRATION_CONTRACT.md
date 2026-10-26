# Registro prospectivo anual: contrato operativo

La cohorte científica, sus modelos y probabilidades permanecen congelados. Este
contrato implementa la inscripción de la cohorte completa, sin reentrenamiento.
`annual_publication.py` prepara el plan privado y audita evidencias. No escribe
Sheets, no contacta una TSA y no convierte un JSON local en una emisión.

## Plan y fuente

1. Recuperar candidato canónico y compromiso originales. Verificar sus hashes,
   código, política, seis modelos y roster mediante los validadores existentes.
2. Recapturar por HTTPS los dos originales oficiales fijados por protocolo;
   conservar observación de origen y comprobar ZIP/PDF con `source_release_intake`.
   La fecha HTTP/local no es un sello independiente ni acredita vintages antiguos.
3. Preparar plan privado con identidad canónica, fecha UTC prevista y filas para
   cada pareja país/modelo. No filtrar países/modelos. Cada fila conserva la
   probabilidad de frecuencia como comparador y resultado vacío. La fecha de
   resolución queda vacía hasta conocer el release efectivo; horizonte año2027.
   `as_of` es la captura actual de la fuente; las features siguen limitadas a2025.
4. Ampliar previamente la capacidad de la tabla privada y del lector si resulta
   insuficiente. Conservar cada fila existente; una ampliación no emite nada.
   El lector actual limita a300filas: NO iniciar la inscripción anual hasta
   adaptar y verificar su capacidad para toda la cohorte.

## Evidencia temporal y publicación

5. Verificar recibos independientes para ambos originales, el compromiso original,
   el plan de inscripción y la observación posterior. Sólo solicitudes opacas a
   un destino autorizado; no datos originales. No regenerar sal/TSQ de cohorte.
6. El plan sellado fija la orden previa; comprobar tabla completa mediante una
   lectura autenticada, escribir una vez sin sobrescribir y releer tabla completa.
   Guardar respuestas originales y alcance exacto de lecturas. Conservar las
   filas existentes idénticas y toda la nueva cohorte contigua, sin duplicados.
7. Sellar la observación posterior. Ambos límites deben estar en la fecha UTC
   registrada y antes de2027. Si se cruza fecha/horizonte sin completar gates,
   conservar incidente; no editar fecha ni reemplazar originales para simular éxito.
8. Ejecutar el auditor contra bytes y recibos originales. Revalida ancla/política,
   nonce, firmante/CRL, fuente, cohorte y el diff de tabla. No acepta un booleano
   de aprobación ni un informe previo en lugar del material criptográfico.
9. El resultado offline es `BYTE_AND_TIME_EVIDENCE_CONSISTENT_ORIGIN_ATTESTATION_REQUIRED`:
   la autenticación de origen HTTPS y de las respuestas del proveedor debe haberse
   observado directamente con herramientas autorizadas en la operación asistida.
   Sólo entonces conservar acta final privada de emisión y actualizar madurez.
   No atribuir a la TSA autenticación de Google ni hora exacta de escritura.

## Recuperación

Si el ID ya existe, NO volver a añadir. Recuperar plan/observación/recibos de la
operación original y comparar bytes. No puede reconstruirse a posteriori un
límite temporal ausente. Conflictos, filas parciales o cambios ajenos dejan la
cohorte no elegible y requieren diagnóstico sin borrado/sobrescritura.

## Comprobaciones y límites

Once pruebas sintéticas cubren cohorte íntegra, probabilidad/resultado cambiado,
mutación de fila existente, replay, offsets, fragmentos, fórmulas, capacidad,
orden temporal y separación de procedencia. Junto a preflight/compromiso/ancla,
33pruebas pasan; los tests del ancla ejecutan OpenSSL real con autoridad efímera
sintética. No hay emisión anual real ni pruebas de habilidad por este código.
Los JSON del conector no son autoautenticantes: el auditor rechaza lecturas
incompatibles, pero no puede inferir por sus bytes si el operador pidió el rango
completo. Se exige observar y conservar esa llamada. No publicar evidencia privada.
