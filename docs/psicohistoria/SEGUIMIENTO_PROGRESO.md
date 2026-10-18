# PSICOHISTORIA — Seguimiento vivo de fases y avances

**Incorporado 18/10/2026. Fuente de verdad: Google Sheets privado del dominio PROYECTOS.**
No publicar valores de las tablas en Git ni crear un registro paralelo en la
demo de GitHub Pages.

## Tres capas; una sola fuente privada

- `PsicoFases` (**7 filas iniciales para conflictos y geopolítica**): foto
  vigente del nivel de madurez científica, último evento de evidencia, bloqueo
  y siguiente paso. Los códigos MAD-01…MAD-07 corresponden a las **siete
  etapas de madurez por modelo**, NO a siete dominios de investigación.
- `PsicoAvances`: bitácora de avance **append-only**. Cada cambio
  comprobable tiene un ID `AV-YYYYMMDD-NNN`, fecha, vertiente, fase,
  estado, enlace a evidencia, impacto y siguiente acción. Nunca borrar,
  reescribir ni cambiar de orden una fila histórica; una corrección se
  documenta en **otro evento** con referencia al anterior.
- `PsicoHitos`: tareas existentes por vertiente V1–V4; siguen siendo
  canónicas. Actualizar sus estados cuando cambie la evidencia. No
  presentar el marcador de un hito como evidencia de forecast emitido.

`PsicoExperimentos` continúa registrando experimentos y artefactos privados.
`PsicoPredicciones` es el único registro de emisiones prospectivas y
**nunca** se rellenará por una transición en `PsicoFases` o por un evento
`PsicoAvances`.

## Procedimiento obligatorio para CADA avance

1. Antes de comenzar: leer el último `PsicoFases`, el evento más
   reciente de `PsicoAvances` y el hito V1–V4 relevante.
2. Ejecutar el cambio y verificar pruebas/CI/PR/archivo privado según
   corresponda. Un commit pendiente o CI en rojo es `EN_CURSO`;
   **no** es `VERIFICADO`.
3. **Añadir una nueva fila al final** de `PsicoAvances`, con ID único,
   fecha real, URL de evidencia y límites del hallazgo. Si un PR
   en curso se fusiona después, registrar OTRO evento de cierre en vez
   de modificar el inicial.
4. Actualizar la fila relevante de `PsicoFases`: fase, estado, bloqueo,
   siguiente acción, fecha y `ultimo_avance_id` del nuevo evento.
   Cambiar `criterio_superado` a `SI` solo si el objetivo científico de
   la fase está cumplido, no si pasó la CI. En `PsicoHitos` actualizar
   únicamente tareas afectadas.
5. Releer los rangos escritos y confirmar que el último evento existe
   y el estado científico no se ha sobredeclarado. Una comprobación
   fallida crea un evento de corrección; no se sobrescribe el histórico.
6. Al cerrar la sesión, reflejar el estado verificable en
   `docs/HANDOFF.md`. No introducir URLs de Drive, probabilidades
   privadas, hashes secretos ni identidades en Git.

Los dominios aún no desarrollados no se marcan como «completados»
simplemente por compartir infraestructura. Cada nuevo dominio necesitará
sus propias filas/IDs de madurez y evidencia.

## Estados y puertas de evidencia

Estados de fase: `COMPLETADA`, `PARCIAL`,
`PREPARADO_NO_EMITIDO`, `NO_INICIADA`, `BLOQUEADA`.
Solo `COMPLETADA` admite `criterio_superado=SI`.

Estados de evento: `VERIFICADO`, `IMPLEMENTADO`,
`SINTETICO_VERIFICADO`, `EN_CURSO`, `BLOQUEADO`, `SUPERADO`.
Un evento `VERIFICADO` puede acreditar algo pequeño (p. ej. código
reproducible) y no implica que la fase de emisión esté terminada.

**Fase prospectiva:** `PREPARADO_NO_EMITIDO` hasta que
independencia de TSA, fuente `as-of`, recibido TSR e inscripción
append-only de una emisión real sean acreditados mediante herramientas
independientes. El futuro resultado anual UCDP 2027 no existe todavía.
No inventar Brier, skill, alertas ni avances porcentuales.

## Auditor externo de consistencia

`research/psychohistory/progress_audit.py` usa Python estándar y
**CSV exportados privadamente**, nunca credenciales ni lectura pública:

```bash
python3 research/psychohistory/progress_audit.py \
  --phases-csv /PRIVATE/PsicoFases.csv \
  --advances-csv /PRIVATE/PsicoAvances.csv \
  --previous-advances-csv /PRIVATE/PsicoAvances_Previous.csv
```

Valida cabeceras, IDs, fechas, no duplicados, fase/hito consistente,
estados permitidos, criterios de completitud y enlaces de evidencia.
Cuando se suministra un snapshot anterior confiable, comprueba que todas
sus filas son **prefijo idéntico** del nuevo registro. Una única copia
actual **no permite probar inmutabilidad histórica ni ausencia de
borrados anteriores**. El auditor muestra solo contadores, sin datos
privados. Todas las pruebas del repositorio son sintéticas.

**Importante:** la actualización en Google Sheets no se ejecuta sola
al fusionar una PR pública. Hacerlo automáticamente exigiría un puente
privado autorizado, credenciales protegidas y revisión de privacidad.
Hasta que exista, la escritura se ejecuta con el conector de Sheets
en cada sesión que implementa un avance. No fingir sincronización
automática ni prometer cambios fuera de la sesión.

## Dependencias

El repositorio público conserva solo el esquema y el proceso.
Las tablas privadas viven en la fuente autorizada por `agents/PROJECTS.md`.
No hay coste recurrente, cron, servicio nuevo ni OAuth en Git.
