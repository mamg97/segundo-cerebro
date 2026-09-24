# PARENTS — Gestor Padres

## Rol

Este módulo coordina los asuntos de los padres del usuario dentro de Segundo Cerebro: salud y seguimiento médico, incapacidad/jubilación, patrimonio, vivienda, financiación, inversiones, negocio familiar, trámites, documentación y próximos pasos.

No mantiene una memoria paralela. El estado operativo pertenece al Segundo Cerebro privado y se integra con el Coordinador / Organizador.

## Privacidad

Este dominio debe tratarse por defecto como `muy_confidencial`.

Reglas permanentes:

- Git contiene únicamente este contrato genérico, código y fixtures ficticios.
- Nunca versionar nombres reales, diagnósticos, informes médicos, importes, patrimonio, direcciones, emails, documentos, expedientes, números de préstamo o datos de terceros.
- Los datos reales viven exclusivamente en la infraestructura privada protegida y/o en sus fuentes propietarias.
- Minimizar: guardar estado operativo y referencias; no duplicar documentos completos si basta con una referencia a la fuente.
- Cualquier detalle médico o patrimonial visible debe aparecer solo en la aplicación privada protegida por Cloudflare Access.

## Modelo operativo

La unidad principal es un `family_case`: un asunto abierto o histórico que necesita seguimiento.

Campos mínimos sugeridos:

- `id`
- `person_scope`: `father`, `mother`, `shared`
- `domain`: `health`, `disability`, `retirement`, `property`, `mortgage`, `investment`, `business`, `tax`, `admin`, `legal`, `other`
- `title`
- `summary`
- `status`
- `priority`
- `next_action`
- `next_action_owner`
- `due_at`
- `waiting_on`
- `source_refs`
- `sensitivity`
- `updated_at`

Estados recomendados:

- `ACTIVE`
- `WAITING_EXTERNAL`
- `WAITING_DOCUMENT`
- `DECISION_OPEN`
- `SCHEDULED`
- `BLOCKED`
- `DONE`
- `ARCHIVED`

Las acciones relevantes pueden persistirse separadamente como `family_case_actions` cuando sea necesario conservar cronología y responsables.

## Personas y ámbitos

La UI debe separar tres ámbitos:

1. Padre.
2. Madre.
3. Familiar / patrimonial común.

La portada del dominio debe priorizar asuntos abiertos, próxima acción, responsable, fecha y bloqueo. El detalle puede añadir cronología y referencias documentales.

## Fuentes de verdad

Cada caso declara sus fuentes. Ejemplos genéricos:

- Calendario: iCloud cuando la cita exista allí.
- Finanzas personales: fuente financiera oficial del Segundo Cerebro para cualquier impacto en el presupuesto del usuario.
- Negocio familiar: LITOS para la operativa del taller; Gestor Padres solo conserva el impacto familiar, patrimonial o de jubilación.
- Email y documentos: permanecen en la fuente original o en un repositorio privado autorizado. Segundo Cerebro guarda referencias y resúmenes operativos, no copias públicas.
- Estado propio del caso, próximas acciones y decisiones: D1 privado puede ser la fuente operativa cuando el dato no tenga una fuente externa propietaria.

## Integración con otros gestores

### Finanzas

Gestor Padres no crea contabilidad personal paralela. Cuando un caso tenga impacto económico para el usuario, expone el compromiso/decisión al Gestor Finanzas, que mantiene la fuente financiera oficial.

### Salud

La salud de terceros no se mezcla con el historial médico del usuario. Puede reutilizar patrones técnicos de Health, pero debe mantener entidades y permisos separados.

### LITOS

LITOS sigue siendo la fuente operativa del negocio familiar. Este módulo solo registra hitos relevantes para jubilación, continuidad, patrimonio o decisiones familiares.

### Calendario

Las citas o vencimientos que el usuario necesite recordar pueden proyectarse al estado global. No escribir en iCloud desde este módulo salvo que una capacidad futura lo autorice explícitamente.

## Documentos

No almacenar blobs médicos o financieros en Git.

Para cada documento relevante basta inicialmente con metadatos privados:

- `document_type`
- `case_id`
- `source_provider`
- `source_ref`
- `document_date`
- `summary`
- `review_status`
- `updated_at`

Si en el futuro se necesita archivo propio, debe diseñarse almacenamiento privado independiente (por ejemplo R2/Drive autorizado) antes de persistir documentos completos.

## Contrato con el dashboard

La aplicación privada debe poder mostrar:

- resumen de Padre / Madre / Común;
- asuntos abiertos por prioridad;
- próxima acción y responsable;
- fechas límite y citas;
- asuntos esperando a un tercero;
- decisiones abiertas;
- referencias documentales;
- historial breve por caso;
- enlaces a módulos relacionados cuando proceda.

La home general solo debe mostrar el mínimo necesario: número de asuntos relevantes, próximos vencimientos y acciones prioritarias. El detalle sensible pertenece a la vista privada del dominio.

## Relevo entre conversaciones

Una conversación nueva de GESTOR PADRES debe recuperar el estado así:

1. Leer `AGENTS.md`.
2. Leer `docs/HANDOFF.md`.
3. Leer este contrato.
4. Consultar la fuente privada de `family_cases` y acciones.
5. Consultar las fuentes propietarias solo cuando el caso lo necesite.
6. No reconstruir el estado a partir de memoria de conversación si existe estado privado persistido.

## Regla de actualización

Cuando el usuario aporte información nueva sobre sus padres:

1. identificar el caso afectado o crear uno;
2. actualizar resumen, estado y próxima acción;
3. añadir vencimiento/responsable si existe;
4. conservar referencia mínima a la fuente;
5. propagar únicamente el impacto necesario a Finanzas, Calendario, LITOS u otro módulo;
6. no persistir en Git ningún dato real.
