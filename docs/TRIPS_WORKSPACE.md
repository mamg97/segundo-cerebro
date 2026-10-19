# Viajes — vista privada de Eventos

Área Viajes situada después de Proyectos en la navegación principal. Cada viaje tiene índice y ficha por evento.

## Fuente canónica
- Identidad: hoja privada SEGUNDO CEREBRO - EVENTOS (Eventos, EventoHechos y EventoRefs).
- La lista se lee en GET /api/events?scope=all&kind=travel y las fichas en GET /api/events/:id. Autenticación Cloudflare Access.
- Presupuesto, provisiones y cargos ejecutados siguen en FINANZAS y se consultan por finance_ref; sin contabilidad duplicada.
- Fechas y reservas originales conservan como autoridad calendarios y proveedores. Esta vista solo hace lectura.

## Contrato visual
- Los hechos pueden tener rótulos separados por barras verticales: DESTINO | lugar, VUELO | IDA | detalle, PLAN_DIA | fecha | plan, TAREA | id | PENDIENTE | acción.
- El parser del frontend agrupa estos hechos sin cambiar su naturaleza ni marcar tareas como resueltas.
- Las referencias web HTTPS se muestran como enlaces. Las claves o IDs privados solo permanecen en la fuente autorizada.
- Los eventos que no tengan hechos se muestran sin inventar una ciudad ni reservas.

## Privacidad y coste
- El área solo aparece en modo private-remote. GitHub contiene únicamente código genérico y tests sintéticos.
- Ningún endpoint nuevo, localStorage, fuente de datos paralela, token o pago.
- Los datos de cada viaje quedan en el sheet privado y no se versionan.

## Verificación
- Comprobar orden Proyectos → Viajes, agrupación de hechos, finales de estancia de calendario exclusivos y enlaces HTTPS seguros.
- En producción, contrastar con un viaje real tras login. Sin declarar confirmada una visita solo por aparecer en un planning.