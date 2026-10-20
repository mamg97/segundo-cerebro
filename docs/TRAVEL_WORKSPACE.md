# Viajes — ficha privada especializada

## Objetivo
Área **Viajes** en la navegación de Segundo Cerebro, inmediatamente después de Proyectos.
Cada viaje es una ficha con resumen, vuelos, alojamiento, itinerario por día, reservas,
referencias, presupuesto enlazado y preparación. El primer viaje documentado utiliza
un registro ya existente en el Sheet privado de Eventos.

## Fuentes y contratos
- Identidad, fechas, estado y trazabilidad: \`SEGUNDO CEREBRO - EVENTOS\`, pestaña \`Eventos\`,
  filtro \`kind=travel\`, leído mediante \`GET /api/events?scope=all&kind=travel\`.
- Hechos de cada viaje: pestaña privada \`EventoHechos\`, leída mediante
  \`GET /api/events/:id\`; el frontend no guarda ningún itinerario ni reserva real.
- Referencias: pestaña privada \`EventoRefs\`, perteneciente a Eventos.
- Presupuesto: \`financeSummary.upcomingCommitments\`, unido por el \`financeRef\` de Eventos.
  Los montos \`totalBudget\`, \`reserved\` y \`needed\` son **provisiones**, no pagos.
  La ejecución bancaria es propiedad de Finanzas y no se recalcula en Viajes.
- Actualización de tareas: \`POST /api/events/:id/facts\` con tipo \`PLAN\` y resumen
  \`TAREA_ESTADO | <id-estable> | COMPLETADA|PENDIENTE\`. Sólo se añade un nuevo hecho,
  preservando histórico. Las marcas no reservan vuelos/tours ni registran gastos.

## Formato de hechos normalizados (prefix | campos)
Los valores aquí mostrados son ilustrativos, nunca datos de un viaje real.
- \`DESTINO | Ciudad Ejemplo · País Ejemplo\`
- \`VUELO | IDA | Información de vuelo verificada\`
- \`ALOJAMIENTO | Información y horarios\`
- \`RESERVA | PROVEEDOR | Información y estado de fuente\`
- \`PLAN_DIA | AAAA-MM-DD | Actividades previstas\`
- \`TAREA | id-estable | PENDIENTE | Acción concreta\`
- \`TAREA_ESTADO | id-estable | COMPLETADA\`
- \`NOTA_VIAJE | Consideraciones opcionales\`
- \`FINANZAS | Regla de origen financiero\` (no replicar movimientos)

Tipos permitidos para estas filas: \`LUGAR\`, \`TRANSPORTE\`, \`NOTA\`, \`PLAN\`.
Añadir nuevas filas al Sheet, no editar el JS para cambiar el viaje.

## Privacidad y degradación
- El apartado solo se añade si \`privateModeKind === "remote"\`.
- Las llamadas mismas son same-origin a endpoints del Worker protegidos por Cloudflare Access.
- GitHub Pages / demo no muestra viajes reales ni carga \`/api/events\`.
- No mostrar enlaces no HTTPS ni identificadores privados como URLs públicas.
- Si Eventos no está disponible, mostrar error y botón reintentar sin inventar fichas.
- No hay costes, cron, servicios ni credenciales adicionales.

## UX
- Navegación \`Proyectos → Viajes\`.
- Lista de viajes futuros y pasados, orden temporal.
- Lectura del detalle solo al abrirlo; primera tarjeta activa se precarga para mostrar
  el nombre del destino que consta en \`EventoHechos\`.
- Panel responsive de vuelos, alojamiento, itinerario, reservas, dinero, tareas y referencias.
- Las tareas se confirman mediante API y se reflejan al releer el evento.
- El calendario no se modifica automáticamente por marcar tareas.
- A futuro: sincronizar el estado de nuevas reservas tras su confirmación real y
  enlazar la lista de equipaje con Objetos cuando exista \`objectsListRef\`.

## Verificaciones
- \`node --test app/travels.test.mjs\`
- CI y build privado \`private-cloudflare/package.json\`.
- Control autenticado de escritorio/móvil tras despliegue, incluida la no exposición en Pages.


## Panel visual ampliado (v2)
- Cabecera visual del viaje, indicadores de días/tareas/provisiones, navegación de secciones, mapa y planning con pestañas de días, más panel de reservas y presupuesto.
- La consulta de ubicación se extrae exclusivamente del primer ALOJAMIENTO del evento privado, hasta el primer punto y coma. Si no existe dirección se muestra vacío, sin suposiciones.
- El iframe de Google Maps solo se crea tras un clic explícito en Mostrar mapa interactivo. Hasta entonces Google no recibe la dirección. La CSP autoriza únicamente frame-src https://www.google.com https://maps.google.com y mantiene frame-ancestors none.
- La barra del presupuesto representa provisión de fondos de financeSummary.upcomingCommitments, jamás pagos ejecutados. El enlace conduce a Finanzas para el detalle.
- Los planes por día y tours deseados no equivalen a reservas. Las tareas editables mantienen la escritura append-only TAREA_ESTADO en Eventos.
- Sin APIs de pago, claves, almacenaje local, geolocalización del dispositivo ni datos privados en Git.
- Pruebas: node --test app/travels.test.mjs app/travels-dashboard.test.mjs; revisar mapa en producción solo bajo sesión autenticada.


## Vista a pantalla completa
- El apartado Viajes utiliza un dialog exclusivo de ancho y alto completo mientras está abierto, sin el límite de 920 px de otros módulos. Cabecera y cierre quedan accesibles y el contenido tiene un solo scroll vertical.
- El mapa y las tareas se reparten el espacio horizontal en escritorio. La altura del mapa crece con el viewport y la checklist no introduce un segundo scroll; en tablet y móvil se apilan los bloques.
- Se respetan las safe areas en pantallas móviles, y la clase de Viajes se limpia al cerrar para no alterar otros módulos.
- Validación: app/travels-fullscreen.test.mjs y comprobación geométrica en Chromium con viewports 1600x900, 1024x768, 768x1024 y 390x844 (geometría sintética sin datos privados).
