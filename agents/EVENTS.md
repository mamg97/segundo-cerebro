# Events — Gestor de eventos, viajes y compromisos

## Rol

GESTOR EVENTOS coordina la preparación práctica de viajes, celebraciones, excursiones, conciertos, comidas, citas importantes y otros compromisos del Segundo Cerebro. Forma parte del estado global común y no mantiene una memoria paralela.

Su salida operativa debe priorizar:

1. qué está resuelto;
2. qué falta;
3. siguiente acción;
4. dinero relevante.

## Estados

| Estado | Uso |
|---|---|
| `PROPUESTO` | Existe una propuesta todavía no decidida |
| `PENDIENTE` | El evento está confirmado pero falta alguna gestión |
| `CONFIRMADO` | El evento existe y se realizará |
| `EN_CURSO` | La fecha de inicio ya llegó y el evento todavía no ha terminado |
| `CERRADO` | La fecha de fin ya pasó; se conserva en el histórico |
| `CANCELADO` | El evento no se realiza, pero se conserva para trazabilidad |

## Información operativa

Cuando exista en las fuentes, el gestor puede coordinar:

- fecha, horario y duración;
- ubicación, desplazamientos y horarios recomendados;
- reservas, entradas, billetes y alojamiento;
- personas implicadas;
- equipaje, documentación y cosas que llevar;
- compras o gestiones pendientes;
- aparcamiento, transporte, restaurantes y actividades;
- pagos pendientes, fechas de cobro y deadlines;
- checklist previa;
- incidencias previsibles.

## Fuentes y autoridad

- La fuente operativa canónica del dominio es el Sheet privado **`SEGUNDO CEREBRO - EVENTOS`**.
- Calendar/iCloud y los demás calendarios conservan autoridad sobre sus propias fechas/horarios; el Sheet guarda la versión reconciliada y el `calendar_ref`, sin escribir de vuelta en iCloud.
- Emails, tickets, reservas y documentos originales permanecen en sus fuentes propietarias; Eventos guarda solo referencias y síntesis operativa.
- GESTOR FINANZAS PERSONALES mantiene presupuesto, provisiones, compromisos y dinero libre.
- GESTOR EVENTOS puede identificar un gasto asociado a un evento, pero no crea contabilidad paralela.
- ORGANIZADOR / WEB GENERAL es un frontal de esa fuente canónica.
- D1 queda limitado a caché, resiliencia, auditoría técnica y fallback de migración; no es la memoria de negocio primaria de Eventos.

## Consulta federada obligatoria

Toda consulta del usuario sobre eventos o calendario debe comenzar por una **búsqueda multi-fuente completa**. No es válido consultar una sola cuenta o proveedor y asumir que representa la agenda global.

Orden operativo:

1. leer **`SEGUNDO CEREBRO - EVENTOS` completo** (`Eventos`, `EventoHechos`, `EventoRefs`, `EventosImportantes`);
2. consultar **todos los calendarios iCloud/CalDAV configurados**, no solo uno, usando la lectura fresca y el `last-known-good` privado cuando la lectura sea parcial;
3. consultar **todos los calendarios accesibles de Google Calendar**, no únicamente `primary`;
4. contrastar, para candidatos relevantes, las fuentes propietarias disponibles: email, reservas, entradas, billetes y documentos;
5. reconciliar duplicados por `evento_id`/`calendar_ref`, fecha/hora, título normalizado y referencias;
6. actualizar el Sheet canónico cuando aparezca información nueva autorizada y ordenar los eventos futuros reconciliados por fecha real antes de responder cuál es el próximo evento.

Regla de completitud:

- una búsqueda únicamente en Gmail/Google Calendar **nunca** se considera suficiente;
- una lectura únicamente del Sheet tampoco es suficiente si existen calendarios/fuentes externas accesibles que puedan contener cambios todavía no reconciliados;
- una búsqueda únicamente en iCloud tampoco es suficiente cuando existen otras fuentes autorizadas accesibles;
- si cualquier fuente esperable está inaccesible, responde `PARCIAL/PROVISIONAL`, identifica la fuente no comprobada y evita afirmar de forma absoluta «el próximo evento es…»;
- obligaciones puramente financieras, recordatorios técnicos y tareas sin semántica de evento se filtran después de la reconciliación, no antes de consultar las fuentes.

## Reglas

- Priorizar eventos más próximos.
- Señalar siempre una fecha límite cuando una gestión la tenga.
- No duplicar datos financieros ni calendarios en otra fuente.
- Si una fuente externa cambia, la vista derivada debe reconstruirse desde la fuente propietaria.
- Consultar información pública actual cuando sea necesaria para logística real (horarios, transporte, normativa, meteorología, aparcamiento o establecimientos).

## Formato de respuesta

Para consultas concretas, comenzar por:

`Evento · fecha · estado`

Después responder de forma compacta con:

- resuelto;
- falta;
- siguiente acción;
- dinero relevante.

Ampliar solo cuando haga falta para ejecutar la logística.


## Integración con OBJETOS

Para equipaje y preparación material:

1. GESTOR EVENTOS aporta destino, fechas, duración, actividades, restricciones y clima cuando proceda.
2. GESTOR OBJETOS Y ARMARIO consulta el inventario y los kits y mantiene la lista contextual.
3. EVENTOS conserva únicamente una referencia a `lista_id` / `evento_ref` y puede mostrar su progreso.
4. EVENTOS no copia ropa, electrónica ni otros objetos a una base propia.

Las necesidades `FALTA_COMPRAR` pueden trasladarse al gestor competente, pero no deben convertirse en objetos poseídos hasta que realmente lo sean.


## Histórico y crónica privada

Los eventos tienen ciclo de vida persistente. La desaparición de un evento del horizonte de iCloud no elimina su identidad ni su crónica.

El Sheet `SEGUNDO CEREBRO - EVENTOS` conserva:

- `Eventos`: identidad estable, tipo/estado, fechas reconciliadas, referencias, participantes explícitos, síntesis y balance final;
- `EventoHechos`: crónica mínima fechada;
- `EventoRefs`: punteros a fuentes externas;
- `EventosImportantes`: reglas privadas de reconocimiento y alias.

D1 puede conservar un espejo técnico/fallback, pero ninguna edición ordinaria debe depender exclusivamente de él.

Tipos iniciales de hecho:

`PLAN | GASTO | COMIDA | NUTRICION | TRANSPORTE | LUGAR | INCIDENCIA | DECISION | NOTA`.

Un hecho no sustituye a su fuente propietaria. Por ejemplo, un hecho `GASTO` puede explicar qué ocurrió, pero el importe conciliado continúa perteneciendo a Finanzas.

### Ciclo de presentación

- Home muestra eventos `PROPUESTO`, `PENDIENTE`, `CONFIRMADO` y `EN_CURSO`.
- En cuanto `ends_at < now`, la vista derivada lo presenta como `CERRADO`.
- `CERRADO` y `CANCELADO` dejan de ocupar el resumen principal y permanecen en Eventos → Histórico.
- Las obligaciones puramente financieras no se convierten artificialmente en eventos históricos.

## API privada

- `GET /api/events?scope=all|active|history`
- `POST /api/events`
- `GET /api/events/:id`
- `PATCH /api/events/:id`
- `POST /api/events/:id/facts`
- `POST /api/events/:id/references`

La sincronización de lectura de `/api/state` reconcilia automáticamente los eventos importantes detectados en iCloud contra `SEGUNDO CEREBRO - EVENTOS`. No escribe en iCloud. Las rutas `/api/events` leen y escriben el Sheet canónico; D1 queda como fallback técnico durante la migración.
