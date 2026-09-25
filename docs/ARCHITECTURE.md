# Arquitectura

## Visión

Segundo Cerebro es un sistema coordinado, no una colección de agentes con memorias independientes.

```text
Usuario
  ↓
Coordinador / Organizador
  ↓
Estado global común
  ↓
Módulos especializados
  ↓
Fuentes propietarias y persistencia privada
```

## Superficies

### Demo pública

GitHub Pages publica únicamente la interfaz y mocks. No accede a datos privados ni secretos.

### Aplicación privada remota

```text
Mac / iPhone / iPad
        ↓
Cloudflare Access
        ↓
Cloudflare Worker + Static Assets
        ↓
API privada
   ↙        ↓        ↘
 D1      Sheets     CalDAV
  ↑                    ↓
Health ingest        iCloud
Worker
```

La aplicación privada activa el modo `private-remote` y obtiene el estado desde el Worker protegido.

## Coordinador y estado común

El Coordinador interpreta la intención del usuario y combina información entre áreas. Los módulos aportan reglas de dominio, pero no mantienen memorias independientes.

D1 mantiene instantáneas privadas y determinadas entidades operativas propias del sistema. Cuando una fuente externa es propietaria del dato, D1 o el Worker solo transportan o derivan el contexto mínimo necesario.

## Módulos operativos

### Finance

La fuente financiera externa continúa siendo la autoridad de importes y presupuesto. Una hoja privada derivada normaliza el estado que consume el Worker. El dashboard muestra presupuesto, compromisos, deudas, patrimonio y conciliación sin convertir Git ni D1 en una contabilidad paralela.

### Electricity history

La categoría financiera Luz usa dos capas con responsabilidades distintas:

- presupuesto/gasto/comprometido/saldo: fuente financiera oficial;
- histórico de facturas y consumo: `LuzHistorico`, capa privada derivada.

El Worker lee `LuzHistorico` directamente desde la fuente privada, normaliza únicamente campos analíticos y expone `/api/finance/electricity`. La UI nunca procesa PDFs ni datos contractuales. El endpoint se reconstruye desde la fuente, por lo que nuevas filas se reflejan sin despliegues de frontend.

### Calendar

iCloud Calendar se consulta mediante CalDAV. Esta integración es deliberadamente de solo lectura: el Worker usa operaciones de consulta y no modifica calendarios.

### Habits / HabitQuest

El Google Sheet original de HabitQuest sigue siendo la fuente de verdad. Segundo Cerebro puede leer el estado diario y gestionar hábitos mediante endpoints privados. La escritura conserva la semántica de sincronización de HabitQuest.

### Health

Salud agrupa Médicos, Gimnasio y Nutrición.

- Médicos deriva citas desde iCloud y permanece lectura.
- El plan de gimnasio vive en una fuente privada y las sesiones registradas se persisten en D1.
- Nutrición usa un Sheet privado para comidas, registro y objetivos.
- El gasto energético automático se almacena en D1 y puede entrar desde Apple Health mediante el Worker de ingesta dedicado.

### Parents / Gestor Padres

Gestor Padres es un dominio privado separado de la salud personal del usuario. D1 es la fuente operativa para `family_cases`, acciones y referencias mínimas cuando no existe una fuente externa propietaria.

- La UI separa `mother`, `father` y `shared`.
- Calendario, Finanzas y LITOS conservan la autoridad de sus respectivos datos; Gestor Padres solo guarda referencias e impacto operativo.
- Los documentos completos permanecen en su fuente autorizada. D1 conserva metadatos y referencias.
- La home general recibe únicamente un resumen mínimo de atención (conteos y próximo vencimiento), nunca el detalle médico o patrimonial.
- El módulo se deriva exclusivamente en `private-remote`; la demo pública no lo instancia.

## Escritura selectiva

La aplicación privada ya no es globalmente de solo lectura. Los permisos se definen por dominio:

- iCloud Calendar: lectura.
- Finanzas: lectura del estado derivado desde el dashboard.
- HabitQuest: lectura y gestión de hábitos.
- Gimnasio: lectura y registro/borrado de sesiones.
- Nutrición: lectura y escritura de comidas/registros autorizados.
- Energía Apple Health: ingesta controlada hacia D1.

Cualquier nueva capacidad de escritura debe tener una fuente de verdad clara, validación de entrada y documentación de privacidad.

## Apple Health

Apple Health no se consulta directamente desde el navegador.

```text
Apple Watch
  ↓
Apple Health
  ↓
Atajo de iPhone
  ↓
segundo-cerebro-health-ingest
  ↓  Service Binding
segundo-cerebro
  ↓
D1 health_energy_daily
  ↓
Salud / Nutrición
```

El Worker de ingesta usa un token secreto y recibe solo el resumen energético necesario. No requiere credenciales de Google ni expone D1 directamente.

## Código

```text
app/                    frontend común
core/                   mocks de la demo pública
agents/                 contratos de dominio
docs/                   memoria técnica y decisiones
private-cloudflare/     Worker, API, build y scripts privados
.private/               estado auxiliar local, ignorado por Git
```

## Principios

- Una sola arquitectura conceptual y un estado global coherente.
- Cada dominio conserva una fuente de verdad explícita.
- Git nunca almacena datos privados reales.
- Los secretos solo existen en configuración privada.
- Minimizar datos transportados y persistidos.
- Añadir escritura solo donde aporta valor y puede reconciliarse.
- La demo pública y la aplicación privada deben permanecer separadas.

## Despensa privada

La Despensa se integra como dominio nativo sin duplicar su fuente:

```text
SEGUNDO CEREBRO - DESPENSA (Google Sheet privado)
        ↓ OAuth Google existente
Cloudflare Worker
        ├── /api/state → pantrySummary minimizado
        └── /api/pantry → detalle bajo demanda
        ↓
Dashboard privado protegido por Access
```

El frontend no conoce credenciales ni accede a Google Sheets directamente. El Worker resuelve el Sheet canónico por título exacto en Drive; `PANTRY_SHEET_ID` queda disponible como fallback privado opcional. La caché de lectura es breve para que nuevas filas de inventario, precios o lista de compra aparezcan sin cambios de código.

La demo pública de GitHub Pages no instancia el módulo Despensa ni contiene inventario real.

### Registro privado de integraciones

Para evitar depender de Drive search en runtime, el Worker puede resolver identificadores de fuentes desde la pestaña oculta `IntegracionesPrivadas` del Sheet privado de estado financiero, cuya referencia ya vive como secreto del Worker. Este registro contiene únicamente punteros de infraestructura; no inventario, precios ni datos de dominio. Despensa sigue teniendo como única fuente canónica su propio Sheet privado.


## Objetos privado

OBJETOS se integra como dominio privado de primer nivel sin persistencia paralela:

```text
SEGUNDO CEREBRO - OBJETOS (Google Sheet privado)
        ↓ OAuth Google existente
Cloudflare Worker
        ├── /api/state → objectsSummary minimizado
        └── /api/objects → detalle bajo demanda
        ↓
Dashboard privado protegido por Access
```

GESTOR OBJETOS Y ARMARIO es el propietario funcional. ORGANIZADOR presenta los datos. Otros gestores consultan el mismo dominio mediante referencias estructuradas.

La fuente fue creada el 2026-09-24 y está registrada en el registro privado de integraciones. El Worker la resuelve mediante `OBJECTS_SHEET_ID`, el registro privado o búsqueda exacta por título. `source-pending` se conserva únicamente como degradación segura si la fuente deja de estar disponible.

Las listas contextuales pueden enlazar `evento_ref` y `lista_id`: GESTOR EVENTOS aporta contexto y conserva la referencia; el inventario y la lista material permanecen en OBJETOS.


## Navegación y composición de Home

La barra lateral es la navegación canónica de dominios. La portada no replica todos los dominios en una segunda parrilla.

- `General` vuelve al inicio.
- `Finanzas` abre el presupuesto mensual conectado.
- `Agenda` lleva a la semana real de calendario.
- `Patrimonio`, `Salud`, `Hábitos`, `Despensa`, `Objetos` y `Padres` abren sus vistas especializadas.
- Carrera y Pareja/Familia usan un detalle contextual que reúne proyectos, pendientes, objetivos y decisiones abiertas de su propio ámbito. Proyectos usa su workspace privado y puede mostrar las decisiones abiertas del área.

`OPEN_LOOP`, `GOAL` y `DECISION` son capas transversales, no dominios. Los pendientes viven en `Próximos movimientos`; los objetivos y decisiones se integran en su área propietaria. Una decisión solo entra también en `Próximos movimientos` cuando tiene una siguiente acción o un vencimiento explícito.

La antigua parrilla `Áreas de tu vida` y la vista técnica `Sistema` se retiraron de Home. La arquitectura técnica se documenta en `docs/`, evitando duplicar información técnica potencialmente obsoleta en la interfaz operativa.


## Consulta rápida de Home

La tarjeta superior de Home es una interfaz de **consulta/navegación rápida**, no sustituye las conversaciones especializadas.

Puede:
- abrir módulos mediante órdenes cortas (`abre despensa`, `abre objetos`, `ver presupuesto`);
- abrir Nutrición/Hábitos/Patrimonio/Padres;
- llevar a Agenda;
- responder consultas simples derivadas del estado ya cargado, como `qué tengo hoy`;
- buscar coincidencias básicas en áreas, proyectos, pendientes, objetivos, decisiones, eventos y hábitos.

No ejecuta todavía razonamiento multiagente ni modificaciones complejas de fuentes. Para planificación, decisiones o escritura en dominios se usan los gestores especializados.

En móvil, el `thinking-orb` permanece visible en un espacio reservado de la tarjeta, con tamaño reducido y `pointer-events: none`, de modo que nunca se solapa ni bloquea el input o el CTA.


## Registro privado de proyectos

PROYECTOS usa una fuente privada canónica independiente:

```text
SEGUNDO CEREBRO - PROYECTOS
        ↓ OAuth Google existente
Cloudflare Worker
        ├── /api/state → projectsSummary minimizado
        └── /api/projects → catálogo + documentación + relaciones
        ↓
Dashboard privado
```

La aplicación pública no contiene el catálogo real. Esto evita filtrar en Git nombres de proyectos sensibles, repositorios privados o relaciones personales/profesionales.

El registro no sustituye la documentación propietaria de cada proyecto. Mantiene:
- identidad y estado;
- enlaces a repo/web/documentación;
- resumen y siguiente acción;
- descripción estructurada suficiente para que otros gestores entiendan el proyecto;
- relaciones con otros proyectos y dominios.

La UI de Proyectos se carga bajo demanda desde `/api/projects`.


## Salud — adherencia mensual

La adherencia es una proyección derivada en tiempo de lectura:

```text
SEGUNDO CEREBRO - SALUD
  Registro / Objetivos / ObjetivosActividad / MenuSemanal / AdherenciaManual
        +
Apple Health → D1 health_energy_daily
        +
D1 gym_sessions
        +
HabitQuest
        ↓
central adherence engine
        ↓
GET /api/health/adherence?month=YYYY-MM
        ↓
Salud → Adherencia
```

No se persiste un segundo histórico calculado. El estado mensual se recalcula desde las fuentes canónicas y se cachea brevemente.

La clasificación manual en `AdherenciaManual` solo representa una decisión explícita sobre el estado del día; no duplica comidas, actividad, gym ni hábitos.
