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

## Límites de privacidad

- GitHub solo puede contener código, documentación técnica, licencias y datos ficticios inequívocos.
- No guardar datos personales reales, emails reales, saldos, extractos, patrimonio real, datos familiares o médicos, contraseñas, tokens, claves API, credenciales OAuth, cookies ni secretos.
- Las integraciones reales están autorizadas únicamente dentro de la infraestructura privada descrita en la arquitectura y con los permisos mínimos necesarios.
- Las fuentes originales conservan la propiedad de sus datos salvo que una decisión explícita documente que D1 es la fuente operativa de una entidad concreta.
- Todo dato debe admitir una sensibilidad: `normal`, `personal`, `confidencial` o `muy_confidencial`.
- Antes de cada commit, revisar que no haya secretos, valores personales ni metadatos sensibles.

## Arquitectura vigente

- Flujo conceptual: Usuario → Coordinador → estado global común → módulos → fuentes externas / D1.
- Los módulos no crean memorias aisladas ni estados paralelos.
- GitHub Pages sigue siendo exclusivamente la demo pública mock.
- La aplicación privada usa Cloudflare Worker + Access + D1.
- Algunas fuentes son estrictamente de lectura, como iCloud Calendar.
- Otras permiten escritura privada controlada, como HabitQuest, gimnasio, nutrición y la ingesta energética.
- Finanzas mantiene su fuente oficial externa y el dashboard consume un estado derivado; no debe inventarse contabilidad paralela.
- Mantener la solución pequeña, legible, responsive y sin dependencias innecesarias.
- La barra lateral es la navegación canónica de dominios de la aplicación privada.
- `OPEN_LOOP`, `GOAL`, `DECISION` y otras entidades transversales no son áreas de vida: deben mostrarse dentro del contexto correspondiente, no crear entradas de navegación propias salvo una decisión explícita futura.

## Enrutamiento de dominios

Antes de trabajar con datos de un dominio, leer su contrato específico en `agents/`.

- Finanzas → `agents/FINANCE.md`
- Eventos / viajes → `agents/EVENTS.md`
- Salud / nutrición → `agents/HEALTH.md`
- Hábitos → `agents/HABITS.md`
- Despensa → `agents/PANTRY.md`
- Objetos / armario / looks / kits / equipaje → `agents/OBJECTS.md`
- Proyectos / repositorios / documentación / relaciones entre proyectos → `agents/PROJECTS.md`

Si un gestor necesita objetos, ropa, equipaje, kits o listas contextuales, debe usar el contrato de OBJETOS y la fuente canónica `SEGUNDO CEREBRO - OBJETOS`; no crear tablas propias ni copiar inventario.

## Documentación viva

- `docs/HANDOFF.md` describe solo el presente y el siguiente paso operativo. No es un diario.
- `docs/DECISIONS.md` conserva decisiones duraderas, incluidas las ya superadas cuando siguen siendo útiles históricamente.
- `docs/ARCHITECTURE.md` describe cómo funciona el sistema hoy.
- `docs/DATA_MODEL.md` define entidades y contratos.
- `docs/PRIVACY.md` define fronteras de datos y seguridad.
- Si el código contradice la documentación, resolver la inconsistencia antes de terminar.

## Convenciones de trabajo

- Hacer commits pequeños y descriptivos.
- Ejecutar las comprobaciones disponibles y registrar en `docs/HANDOFF.md` únicamente las que sigan siendo relevantes para el relevo.
- No borrar ni sobrescribir trabajo previo sin comprobar para qué sirve.
- Tratar los archivos bajo `sources/` como referencias de solo lectura.
- No incorporar datos privados en ejemplos de documentación; usar nombres y valores genéricos.
- No cambiar la fuente de verdad de un dominio sin registrarlo en `docs/DECISIONS.md`.
