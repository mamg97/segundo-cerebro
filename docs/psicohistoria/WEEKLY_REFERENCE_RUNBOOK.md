# Piloto semanal ICSA: preparación, emisión y resolución

Contrato reutilizable: `research/psychohistory/weekly_reference_policy_v1.json`.
Mantiene los parámetros del piloto privado autorizado:12objetivos semanales,
ventana miércoles00–12UTC, evento de subida≥10.000sobre base congelada,
frecuencia Beta(1,1) y persistencia0. No promueve los modelos descartados.

La primera semana fue omitida por pausa obligatoria de cuota y ventana cerrada.
La siguiente preparación está programada para4nov08UTC; objetivo31oct y
release previsto5nov. Verificar calendario efectivo. Nunca reutilizar una
intención del28oct para aparentar una emisión nueva o pasada.

## Preparar una semana

1. Medir ambas cuotas y leer el checkpoint. Capturar porHTTPS el ZIP oficial
   ALFREDICSA vigente, formulario/parámetros, fecha/hora de recepción y SHA256
   en carpeta privada nueva. Resolver el Sheet privadoPROYECTOS desde su
   configuración autorizada; leer cabecera eIDs de PsicoPredicciones.
2. Confirmar fecha prevista de publicación desde calendario oficial. La
   observación base debe ser exactamente el sábado anterior al objetivo;
   si la fuente está retrasada, no desplazar el horizonte. Dato del objetivo
   ya disponible o release el mismo día de emisión: omitir conservadoramente.
3. Ejecutar el preparador con fuente, captura real, target, release, IDs y
   carpeta nueva fuera de Git:

```sh
python3 research/psychohistory/weekly_reference_pilot.py \
  --claims /PRIVATE/source.zip --source-sha256 SOURCE_SHA256 \
  --captured-at CAPTURE_ISO_UTC --target TARGET_SATURDAY \
  --release-date EXPECTED_RELEASE_DATE --existing-ids /PRIVATE/ids.json \
  --output /PRIVATE/weekly-reference-lifecycle/TARGET
```

Sólo `PREPARED_NOT_ISSUED` produce compromiso salado y TSQ. Un ID ya presente
exige recuperación. Una ventana cerrada produce omisión sin TSQ ni solicitud.
El programa no contacta servicios, no escribe Sheets ni acredita origen.
No sustituir el reloj real con una fecha de ensayo para emitir.

## Inscripción asistida y recuperable

- Conservar `before.json` completo y normalizado antes de la escritura. El
  compromiso liga política, fuente y dosfilas previstas. Guardar salt y datos
  sólo en privado; únicamente improntaSHA256/nonce sale al TSA autorizado.
- Usar el ayudante privado `weekly-reference-lifecycle/stamp_weekly.py` con
  fase `commitment`. Verificar firma, nonce, política, ancla y CRL actuales
  mediante `independent_timestamp.verify_detached`; un JSON de proof aportado
  no sustituye esa verificación. Si las CRL caducan, obtenerlas de sus URLs
  oficiales y conservar versiones; nunca rebajar la validación.
- El ayudante limita intentos por target/fase y el total a24. Un timeout con
  entrega incierta no se reintenta automáticamente. Preservar la incidencia.
- Tras recibo previo válido y comprobación de ventana/cuota, obtener la horaUTC real de la solicitud y usar `materialize_request` para
  asignarla a `fecha_emision`; sólo cambia ese metadato, no las probabilidades
  comprometidas. Una sola llamada autenticada añade esas dosfilas. La hora
  declarada es la de la solicitud; el alta efectiva queda acotada por los
  recibos independientes y no se confunde con ese instante. Guardar respuesta y relectura completa en
  `after.json`. `audit_readback` exige prefijo íntegro y apéndice exacto.
  Si la llamada quedó pendiente, leer IDs antes de cualquier recuperación.
- Guardar `observation.json` con `requested_at`, `plan_sha256` canónico y el resultado exacto
  de `audit_readback(..., requested_at=...)` en `readback`; sellar fase `observation`. Revalidar ambos
  recibos sobre sus bytes originales y aplicar `check_receipt_interval`.
  Ambos sellos deben acotar el alta dentro de la ventana, antes de12UTC, y contener entre ellos la hora declarada de la solicitud.
- Sólo las respuestas auténticas observadas de las herramientas de captura,
  escritura y relectura, junto a los recibos válidos, permiten un acta privada
  `ISSUED_EXPERIMENTAL`. Los auditores retornan consistencia, nunca ese estado.
  Un sello prueba bytes/hora, no origenDOL/Google ni habilidad predictiva.

Con fallo parcial, conservar todoslos originales eIDs, no duplicar ni borrar
filas. Si no se verificó el alta dentro de ventana, registrar incidencia y
excluir del score. No cambiar probabilidades ni fechas para rescatarla.

## Resolver y continuar

Sólo una semana efectivamente emitida se puede resolver. Programar el mismo
seguimiento para release previsto+5min; confirmar publicación real. Conservar
PDF/HTMLoriginal, URL final, hash, hora real de captura y target. Dentro de48h,
verificar fecha, semana y el valor **advance SA initial claims** de la primera
edición DOL; el valor revisado de la semana anterior no es el desenlace.
`resolution_candidate` calcula evento/Brier y exige target, PDF e intervalo,
pero deja explícita la comprobación de origen y valor por las herramientas.

Conservar revisiones separadas. Reprogramar este mismo seguimiento al próximo
miércoles08UTC de la cohorte tras resolución u omisión, sin compensar fechas
perdidas. Una fuente aún vieja permite una comprobación adicional acotada;
no crear polling continuo. Cuota bloqueante activa sólo el coordinador global,
con checkpoint/cola y este seguimiento pausado para evitar duplicados.

`cohort_review` cuenta objetivos semanales, no las dosfilas de modelos como
casos independientes. Exige cohorte cerrada,10resueltos,2porclase y mejora
Brier10%frente a persistencia. Incluso pasar la regla no demuestra utilidad
ni independencia y no cambia automáticamente ninguna fase científica.
El piloto mensual y la cohorte anual conservan sus fuentes y reglas propias.
