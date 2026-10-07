# AGENTS.md — Segundo Cerebro

Estas reglas son permanentes y se aplican a cualquier herramienta que continúe el proyecto.

## Propósito

Construir un segundo cerebro personal y privado: un sistema operativo de vida con un coordinador central, estado global común y módulos especializados. El repositorio es la memoria técnica oficial del proyecto; nunca se debe depender del historial de una conversación.

## Antes de cambiar nada

1. Leer este archivo completo.
2. Leer `docs/HANDOFF.md` completo.
3. Consultar `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/PRIVACY.md` y `docs/DECISIONS.md` según el trabajo.
4. Leer el contrato de `agents/` correspondiente al dominio afectado.
5. Revisar el estado de Git y entender el propósito del trabajo previo antes de modificarlo.

## Restricción de coste operativo cero

- **Privacidad y coste operativo cero son restricciones de primer nivel y tienen la misma prioridad.**
- La solución ordinaria debe funcionar con infraestructura gratuita / free tier ya disponible. No introducir suscripciones, upgrades, APIs premium, licencias de pago ni servicios con coste recurrente.
- Ante un límite de un free tier, la respuesta por defecto es reducir trabajo, cachear, hacer cargas bajo demanda, eliminar polling/cron innecesario, simplificar almacenamiento/procesamiento o redistribuir trabajo; pagar para ampliar límites no es una corrección válida.
- Solo se puede proponer o activar gasto si el usuario revoca explícitamente esta restricción para un caso concreto.
- Las optimizaciones de coste nunca pueden degradar la privacidad ni mover datos privados a una superficie pública.

## Límites de privacidad

- GitHub solo puede contener código, documentación técnica, licencias y datos ficticios inequívocos.
- No guardar datos personales reales, emails reales, saldos, extractos, patrimonio real, datos familiares o médicos, contraseñas, tokens, claves API, credenciales OAuth, cookies ni secretos.
- Las integraciones reales están autorizadas únicamente dentro de la infraestructura privada descrita en la arquitectura y con los permisos mínimos necesarios.
- Las fuentes originales conservan la propiedad de sus datos salvo que una decisión explícita documente que D1 es la fuente operativa de una entidad concreta.
- Todo dato debe admitir una sensibilidad: `normal`, `personal`, `confidencial` o `muy_confidencial`.
- Antes de cada commit, revisar que no haya secretos, valores personales ni metadatos sensibles.

## Arquitectura vigente

- Flujo conceptual objetivo: Usuario → CEREBRO GLOBAL / Coordinador → enrutamiento por intención → módulos especializados → fuentes canónicas / D1 → respuesta unificada.
- Los módulos no crean memorias aisladas ni estados paralelos.
- La aplicación debe ser **data-driven**: el frontend, el Worker y los adaptadores implementan lógica genérica y estable; el estado operativo real vive en la fuente canónica de cada dominio.
- Un cambio ordinario de datos o estado (movimiento, saldo, reserva, comida, prenda, inventario, objetivo, evento derivado, etc.) debe resolverse actualizando la fuente canónica autorizada, no hardcodeando el caso ni desplegando código.
- Tocar código se reserva para nueva capacidad, cambio de contrato/esquema, nueva integración, corrección de bug, seguridad, rendimiento o mejora deliberada de interfaz/arquitectura. Si un dato nuevo ya cabe en el contrato vigente, modificar código solo para mostrarlo es un defecto de diseño.
- GitHub Pages sigue siendo exclusivamente la demo pública mock.
- La aplicación privada usa Cloudflare Worker + Access + D1.
- Algunas fuentes son estrictamente de lectura, como iCloud Calendar.
- Otras permiten escritura privada controlada, como HabitQuest, gimnasio, nutrición y la ingesta energética.
- Finanzas mantiene su fuente oficial externa y el dashboard consume un estado derivado; no debe inventarse contabilidad paralela.
- Mantener la solución pequeña, legible, responsive y sin dependencias innecesarias.
- La barra lateral es la navegación canónica de dominios de la aplicación privada.
- `OPEN_LOOP`, `GOAL`, `DECISION` y otras entidades transversales no son áreas de vida: deben mostrarse dentro del contexto correspondiente, no crear entradas de navegación propias salvo una decisión explícita futura.

## Enrutamiento de dominios

El punto de entrada principal es `agents/COORDINATOR.md`. El Coordinador decide qué contratos de dominio debe leer y combinar.

Antes de trabajar con datos de un dominio, leer su contrato específico en `agents/`.

- Finanzas → `agents/FINANCE.md`
- Eventos / viajes → `agents/EVENTS.md`
- Salud / nutrición → `agents/HEALTH.md`
- Hábitos → `agents/HABITS.md`
- Despensa → `agents/PANTRY.md`
- Objetos / armario / looks / kits / equipaje → `agents/OBJECTS.md`
- Proyectos / repositorios / documentación / relaciones entre proyectos → `agents/PROJECTS.md`
- Carrera profesional / empleo / compensación laboral / candidaturas → `agents/CAREER.md`
- Coordinación global / routing / composición multi-dominio → `agents/COORDINATOR.md`

Si un gestor necesita objetos, ropa, equipaje, kits o listas contextuales, debe usar el contrato de OBJETOS y la fuente canónica `SEGUNDO CEREBRO - OBJETOS`; no crear tablas propias ni copiar inventario.

## Documentación viva

- `docs/HANDOFF.md` describe solo el presente y el siguiente paso operativo. No es un diario.
- `docs/DECISIONS.md` conserva decisiones duraderas, incluidas las ya superadas cuando siguen siendo útiles históricamente.
- `docs/ARCHITECTURE.md` describe cómo funciona el sistema hoy.
- `docs/DATA_MODEL.md` define entidades y contratos.
- `docs/PRIVACY.md` define fronteras de datos y seguridad.
- `docs/WEB_AUDIT.md` define la auditoría read-only de producción, su periodicidad, umbral de 90 minutos, clasificación de fallos y diagnóstico. ORGANIZADOR debe conservarla cuando cambie navegación, fuentes o estilos compartidos.
- Si el código contradice la documentación, resolver la inconsistencia antes de terminar.

## Convenciones de trabajo

- Hacer commits pequeños y descriptivos.
- Ejecutar las comprobaciones disponibles y registrar en `docs/HANDOFF.md` únicamente las que sigan siendo relevantes para el relevo.
- No borrar ni sobrescribir trabajo previo sin comprobar para qué sirve.
- Tratar los archivos bajo `sources/` como referencias de solo lectura.
- No incorporar datos privados en ejemplos de documentación; usar nombres y valores genéricos.
- No cambiar la fuente de verdad de un dominio sin registrarlo en `docs/DECISIONS.md`.
- **Puerta previa a Git:** antes de modificar frontend, Worker o lógica de dominio para atender una petición operativa, comprobar si puede resolverse con una mutación de la fuente canónica existente. Si puede, no tocar código; si el gestor no tiene permiso de escritura, debe enrutar la intención al propietario funcional de esa fuente.
- **EVENTOS / CALENDARIO — consulta federada obligatoria:** la fuente operativa canónica del gestor es el Sheet privado `SEGUNDO CEREBRO - EVENTOS`; la web es su frontal y D1 solo puede actuar como caché/espejo técnico. Ante cualquier pregunta sobre agenda, próximos eventos, bodas, cumpleaños, viajes, celebraciones, citas o compromisos, no se puede responder desde un único calendario, una sola cuenta ni el calendario `primary` de Google. Antes de afirmar qué eventos existen o cuál es el siguiente, consultar y reconciliar **todas las fuentes de eventos autorizadas y accesibles**: `SEGUNDO CEREBRO - EVENTOS`, todos los calendarios iCloud/CalDAV configurados (incluido su `last-known-good` privado cuando proceda), todos los calendarios accesibles de Google Calendar y las fuentes propietarias de confirmación/detalle (email, reservas, entradas, billetes y documentos) cuando existan. Si alguna fuente no está disponible, la respuesta debe declararse parcial/provisional y no presentar el resultado como exhaustivo. Nunca inferir la agenda global a partir de Gmail/Google Calendar solamente.
- **OBJETOS visual — cierre obligatorio:** generar o procesar una imagen de una prenda NO completa la tarea. Cuando el usuario pida añadir/subir una prenda al Armario y exista acceso operativo, leer `docs/OBJECTS_IMAGE_INGEST.md` y ejecutar la ingesta canónica hasta verificar `ok=true`, `foto_procesada_url`, `miniatura_url` y `estado_procesado=procesada`. Después restaurar el bridge a su arranque normal y limpiar cualquier staging temporal. No concluir que “no se puede subir” sin revisar primero ese runbook y las herramientas disponibles.
- **OBJETOS visual — autocorrección ante falsa falta de capacidad:** existe un fallo recurrente conocido en el que, después de generar/procesar una imagen, el gestor puede olvidar el bridge ya operativo y concluir erróneamente que solo puede generar imágenes pero no ingerirlas. Cualquier pensamiento o borrador del tipo «no puedo subirla», «no tengo forma de subirla», «solo puedo generar la imagen» o equivalente debe tratarse como sospecha de falso negativo de capacidad. Antes de comunicarlo al usuario, releer `agents/OBJECTS.md` + `docs/OBJECTS_IMAGE_INGEST.md`, inspeccionar las herramientas realmente disponibles (especialmente Drive, Railway y acceso a la fuente canónica) y ejecutar la ruta normal o el fallback `seed.mjs + OBJECTS_SEED_JOBS` si están disponibles. La ausencia de un POST HTTP arbitrario NO equivale a falta de capacidad. Si el usuario recuerda que ya se hizo antes, esa observación obliga a revalidar documentación + tooling antes de contradecirlo. Solo puede comunicarse un bloqueo tras identificar una dependencia concreta realmente ausente o fallida; nunca mediante una negativa genérica.
- **OBJETOS visual — fondo transparente obligatorio:** toda imagen `processed` destinada al Armario debe representar únicamente la prenda/objeto, con fondo realmente transparente (canal alpha), sin lienzo blanco, gris, negro ni decorativo. Antes de ingerir, comprobar transparencia real; si el archivo está aplanado sobre un fondo, no subirlo: regenerar/corregir y sustituir con `overwrite=true`. Las miniaturas pueden renderizarse sobre el fondo de la UI, pero el asset `processed` canónico debe seguir siendo transparente.
