# AV138 — Comprobación conjunta previa a la emisión mensual

24/10/2026. Unidad acotada de preparación; ninguna emisión ni registro canónico
nuevo. El límite semanal deja margen reducido y se prioriza cerrar esta unidad.

`monthly_issue_preflight.py` enlaza el contrato mensual congelado, el ledger del
borrador, sus artefactos exactos y dos recibos: uno de la fuente y otro del compromiso
del forecast. Ejecuta los verificadores criptográficos existentes; no acepta un
JSON de éxito ni booleans de confianza suministrados por el llamador.

## Reglas

- Solo la cohorte fijada; modelo y resolución deben usar los bytes exactos del
  contrato AV136. Recalcula la referencia desde el original ALFRED auditado y
  contrasta objetivo, versión, base, probabilidad y comparador del borrador.
- La fuente sellada debe coincidir con el archivo enlazado al forecast y preceder
  al corte, dentro de la ventana de captura. Una fecha de exportación posterior
  al sello se rechaza.
- El sello del forecast y la comprobación deben estar dentro de la ventana del
  día 26. Se rechazan preparación prematura, recibo futuro, recibo tardío y
  comprobación después del plazo. La resolución no puede preceder al fin del mes.
- `issuedAt` del borrador se interpreta aquí únicamente como plazo planificado,
  fijado a las 12:00 UTC; se devuelve como `plannedDeadlineUtc`. El instante del
  sello se devuelve por separado como `externalCommitmentAtUtc`.
- La segunda verificación conserva todas las identidades firmadas y hashes;
  permite solo que cambie la hora de observación de una nueva comprobación.

## Pruebas y límites

Diez pruebas sintéticas de límites temporales y composición, incluyendo cambio de
fuente/recibo, cálculo incorrecto, cambio de mes/año y ventana cerrada antes de
iniciar criptografía. Las pruebas de composición sustituyen los verificadores por
fixtures explícitos; no son emisiones ni una prueba criptográfica nueva. Las siete
pruebas OpenSSL reales con autoridades sintéticas de AV135 siguen pasando.

El resultado es TEMPORAL_AND_CALCULATION_BINDINGS_VERIFIED_NOT_ISSUED. Solo acredita
existencia temporal de bytes y coincidencia de cálculo/compromiso. No autentica
por sí solo el origen oficial ni la inscripción remota. Registro canónico,
emisión efectiva, elegibilidad prospectiva y evaluación permanecen en falso.
No se ha ejecutado positivamente con una predicción real: la ventana aún está
cerrada. MAC-05 sigue PARCIAL/NO.

Siguiente: registro privado append-only con idempotencia y recuperación, observación
del alta canónica y definición verificable de hora efectiva. Reutilizar este
preflight en esa transición sin aceptar los informes como aprobaciones autónomas.
