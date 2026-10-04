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

La disponibilidad de CalDAV no condiciona la continuidad visual de la agenda. El Worker mantiene en D1 una copia derivada `last-known-good` de la última lectura completa y no vacía. iCloud sigue siendo autoridad: la copia solo actúa como caché de resiliencia. Un timeout, una respuesta vacía sospechosa o un descubrimiento parcial de calendarios no puede reemplazarla. En una lectura parcial se mezclan los calendarios frescos con la última copia de los calendarios temporalmente ausentes.

La **resolución conversacional de agenda/eventos es federada** y está separada de la autoridad temporal de iCloud. Cualquier agente que responda preguntas como «qué eventos tengo», «cuál es el próximo» o «qué tengo este fin de semana» debe partir del Sheet canónico `SEGUNDO CEREBRO - EVENTOS` y contrastarlo con todos los calendarios y fuentes autorizadas disponibles (todos los calendarios iCloud/CalDAV, todos los calendarios Google accesibles y, para confirmación, email/reservas/documentos). Un resultado parcial de un proveedor no puede presentarse como agenda global completa. Si una fuente no puede consultarse, la respuesta se marca provisional y explicita la carencia.

### Habits / HabitQuest

El Google Sheet original de HabitQuest sigue siendo la fuente de verdad. Segundo Cerebro puede leer el estado diario y gestionar hábitos mediante endpoints privados. La escritura conserva la semántica de sincronización de HabitQuest.

### Health

Salud agrupa Médicos, Gimnasio y Nutrición.

- Médicos deriva citas desde iCloud y permanece lectura.
- El plan de gimnasio vive en una fuente privada y las sesiones registradas se persisten en D1.
- Nutrición usa un Sheet privado para comidas, registro, objetivos y `MenuSemanal`.
- `MenuSemanal` es la fuente canónica del contenido semanal. La web y el Worker solo interpretan su esquema y estados; un cambio de plato, día, ración o sustitución doméstica se realiza en el Sheet, sin modificar frontend ni versionar datos reales en Git.
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

## Principio data-driven: código estable, estado en fuentes

Segundo Cerebro separa deliberadamente **lógica de producto** y **estado operativo**.

- Frontend, Worker, adaptadores y motores de derivación deben ser genéricos respecto a los datos reales.
- El cambio normal del día a día ocurre en la fuente canónica del dominio: Sheet, D1, iCloud, Apple Health u otra fuente propietaria documentada.
- Si una nueva fila, saldo, reserva, comida, prenda, objetivo, compra, sesión o evento ya cabe en el contrato vigente, debe aparecer en la web por lectura/derivación sin modificar ni desplegar código.
- Ningún gestor debe hardcodear un caso real en `app/`, `private-cloudflare/`, mocks o documentación para conseguir que la web refleje un dato.
- Cuando el gestor que recibe la petición no es propietario de la fuente, entrega la intención al gestor propietario en lugar de crear una copia o parche local.

Una modificación de código está justificada cuando cambia al menos una de estas cosas:

1. capacidad funcional;
2. contrato o esquema de datos;
3. integración o transporte;
4. validación, seguridad o reconciliación;
5. corrección de un bug;
6. rendimiento o resiliencia;
7. presentación/UX deliberadamente nueva.

**Prueba operativa:** si para reflejar un dato nuevo que ya cumple el esquema vigente hay que editar el frontend o el Worker, se considera una señal de acoplamiento indebido y debe corregirse el diseño en vez de añadir otro caso especial.

## Apple Health

Apple Health no se consulta directamente desde el navegador. La integración objetivo usa una aplicación nativa mínima de iPhone como puente local y conserva el Worker de ingesta ya existente.

```text
Apple Watch / otras fuentes autorizadas
  ↓
Apple Health / HealthKit
  ↓
SegundoCerebroHealthBridge (iOS, Swift)
  ├── HKObserverQuery + Background Delivery
  ├── BGAppRefresh como reconciliación
  └── sincronización manual de diagnóstico
  ↓ HTTPS + Bearer privado
segundo-cerebro-health-ingest
  ↓ Service Binding
segundo-cerebro
  ↓
D1
  ├── health_energy_daily
  ├── health_body_samples
  └── health_recovery_daily
  ↓
Salud / Nutrición / análisis longitudinal
```

El bridge lee únicamente tipos HealthKit autorizados por el usuario. El token de ingesta se guarda en Keychain del dispositivo y no se versiona. La app sincroniza hoy y ayer de forma idempotente para que una actualización parcial del día actual pueda reconciliarse después.

La ingesta admite tres grupos:
- actividad: energía activa/basal, pasos, minutos de ejercicio y workouts;
- composición: peso, grasa, IMC y masa magra;
- recuperación: FC en reposo, HRV SDNN, frecuencia respiratoria, SpO₂, VO₂ máx., temperatura de muñeca y resumen de sueño/fases cuando existen muestras.

La aplicación no calcula una puntuación de recuperación tipo WHOOP. Persiste señales observadas para análisis posterior y mantiene ausencia como `null`.

El Atajo de iPhone se conserva como fallback de transición hasta que la primera sincronización del bridge nativo quede validada en dispositivo real.


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
- El código permanece estable ante cambios ordinarios de estado; las fuentes canónicas alimentan la interfaz mediante contratos genéricos.
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

### Apple Reminders como interfaz compartida de compra

`ListaCompra` y la lista compartida de Apple no son fuentes independientes. Un agente macOS EventKit mantiene el espejo 1:1 mediante endpoints autenticados del Worker. El Sheet conserva el estado enriquecido; D1 solo conserva enlaces de identidad, cola idempotente, timestamps y auditoría. El agente no recibe credenciales Google.

```text
Apple Reminders / iCloud ⇄ EventKit Agent ⇄ shopping-sync Worker ⇄ Service Binding
                                                                    ↓
                                                             Worker privado
                                                              ├─ ListaCompra
                                                              └─ D1 metadata
```

La entrada mínima por token evita abrir rutas del dashboard protegido por Access. La escucha `EKEventStoreChanged` aporta baja latencia y un ciclo de 90 segundos reconcilia cambios perdidos. La disponibilidad depende de que el Mac esté encendido y con sesión iniciada. Detalle operativo: `docs/APPLE_REMINDERS_SYNC.md`.

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

### Armario visual

La visualización de ropa no introduce una segunda identidad ni una base paralela. El Sheet `SEGUNDO CEREBRO - OBJETOS / Armario` sigue siendo la fuente canónica de pertenencia, estado y referencia visual activa. Los bytes se guardan en el D1 privado ya existente mediante tablas técnicas de assets/chunks.

```text
Imagen original o procesada
        ↓ multipart
POST /api/objects/:objeto_id/image
        ↓ valida objeto/Armario/MIME/tamaño/overwrite
D1 privado
        ├─ objects_media_assets
        └─ objects_media_chunks
             ├─ objects/<objeto_id>/original/<version>
             ├─ objects/<objeto_id>/processed/<version>
             └─ objects/<objeto_id>/thumbnail/<version>
        ↓
SEGUNDO CEREBRO - OBJETOS / Armario
        ├─ foto_original_url
        ├─ foto_procesada_url
        ├─ miniatura_url
        ├─ estado_procesado
        └─ ultima_actualizacion_visual
        ↓
GET /api/objects/:objeto_id/image/:tipo?v=<version>
        ↓
Armario visual / ficha / combinador / mosaicos
```

Las URLs guardadas en el Sheet son rutas same-origin del Worker privado. La UI no necesita conocer D1 ni el layout físico de chunks.

Una subida `processed` conserva la imagen principal recibida y genera dentro del Worker una miniatura WebP de hasta 512 px en el lado largo mediante WebAssembly. El recorte/eliminación de fondo ocurre antes del upload; el endpoint no inventa ni reinterpreta la prenda.

La consistencia con Sheets se resuelve con claves versionadas y compensación: primero se escriben los nuevos assets en D1; solo después se actualiza `Armario`. Si esa escritura falla, los nuevos assets se eliminan. En un overwrite correcto, el Sheet empieza a apuntar a la nueva versión y la versión anterior se limpia best-effort.

Por seguridad se aceptan únicamente PNG/JPEG/WebP de hasta 8 MiB, se contrasta MIME con firma binaria y se valida el `objeto_id`. El almacén visual impone además una salvaguarda interna de 200 MiB. R2 no está activo para OBJETOS y no debe activarse sin una nueva decisión explícita.

El constructor visual sigue siendo una operación separada: valida los `objeto_id` contra el armario vigente y escribe únicamente `Looks + LookItems`. No crea objetos, no copia prendas y no persiste composición paralela en D1.


## Navegación y composición de Home

La barra lateral es la navegación canónica de dominios. La portada no replica todos los dominios en una segunda parrilla.

- `General` vuelve al inicio.
- `Finanzas` abre el presupuesto mensual conectado.
- `Agenda` lleva a la semana real de calendario.
- `Patrimonio`, `Salud`, `Hábitos`, `Despensa`, `Objetos` y `Padres` abren sus vistas especializadas.
- Carrera y Pareja/Familia usan un detalle contextual que reúne proyectos, pendientes, objetivos y decisiones abiertas de su propio ámbito. Proyectos usa su workspace privado y puede mostrar las decisiones abiertas del área.

`OPEN_LOOP`, `GOAL` y `DECISION` son capas transversales, no dominios. Sus datos siguen perteneciendo a sus áreas/gestores propietarios; Home ya no mantiene un bloque global `Próximos movimientos`. Los objetivos y decisiones se muestran en contexto cuando la vista propietaria los necesita.

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


## Salud — recetas privadas

El recetario reutiliza la fuente canónica de Salud y un almacén binario privado mínimo:

```text
SEGUNDO CEREBRO - SALUD
  Recetas + IngredientesReceta + PasosReceta
        │
        ├── metadatos/ref de foto
        ↓
Drive privado · AUXILIARES/RECETAS - FOTOS (original)
        │
        └── preview web derivada → Salud/RecipeMedia (oculta)
                                   ↓
Cloudflare Worker · proxy same-origin
        ↓
Salud → Recetas
```

La identidad, nombre, raciones, macros, ingredientes y pasos siguen siendo autoridad del Sheet. Drive conserva la foto original y la pestaña técnica oculta `RecipeMedia` conserva únicamente una preview privada compacta para el frontal. No se crea un catálogo paralelo: ambas referencias dependen del mismo `recipe_id`. El frontend muestra foto → ingredientes → preparación y se actualiza al cambiar la fuente, sin hardcodes por receta.

Cada ingrediente puede abrir la ficha compartida de Despensa mediante `IngredientesReceta.producto_id`. El módulo de detalle se carga bajo demanda; conserva la receta y permite volver a ella. La identidad, nutrición por 100 g, imagen pública y precios son propiedad del catálogo canónico de Despensa. La referencia pública Mercadona solo enriquece la ficha con imagen/precio orientativo de un SKU exacto, con timeout y caché; no modifica fuentes ni el registro de consumo.

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


## Evolución a Cerebro Global

La arquitectura objetivo elimina la necesidad de que el usuario seleccione manualmente una conversación especializada.

```text
Usuario
  ↓
CEREBRO GLOBAL
  ↓
Intent Router
  ↓
Context Planner
  ↓
Gestores especializados
  ↓
Fuentes canónicas / D1 / conectores
  ↓
Result Composer
  ↓
Respuesta única
```

Los gestores no desaparecen: cambian de papel.

- siguen siendo propietarios semánticos de su dominio;
- conservan contratos, fuentes y permisos;
- pueden seguir existiendo como consolas de mantenimiento;
- dejan de ser la interfaz diaria obligatoria.

El Coordinador no persiste una copia global de todos los datos. Planifica lecturas y escrituras contra las fuentes propietarias.

La hoja de ruta completa está en `docs/EVOLUTION_GLOBAL_BRAIN.md`.


## Eventos e histórico privado

La fuente operativa canónica es el Sheet privado `SEGUNDO CEREBRO - EVENTOS`. La agenda de iCloud sigue siendo de solo lectura y autoridad temporal sobre sus fechas; el Worker reconcilia esos datos en el Sheet para que web y gestores compartan una superficie accesible y editable sin depender de D1.

```text
iCloud/CalDAV + otros calendarios
        ↓ lectura / reconciliación
SEGUNDO CEREBRO - EVENTOS
        ├── Eventos             ← estado y fechas reconciliadas
        ├── EventoHechos        ← crónica mínima
        ├── EventoRefs          ← punteros a fuentes
        └── EventosImportantes  ← reglas/alias privados
        ↓
GET/POST/PATCH /api/events
        ↓
Eventos / Histórico / ficha
        ├── Finanzas (referencia, no copia)
        ├── Salud-Nutrición (consulta por fechas)
        └── OBJETOS (lista contextual por evento_ref/lista_id)

D1 event_* → caché/espejo técnico y fallback de migración
```

### Reglas de composición

- `evento_id` es la identidad operativa del Sheet; `calendar_ref` enlaza la identidad del proveedor sin hacerla obligatoria para eventos manuales.
- La lectura de `/api/state` hace upsert/reconciliación en el Sheet de los eventos importantes actualmente visibles; nunca escribe en calendario.
- La fecha de fin determina automáticamente cuándo deja Home y aparece solo en Histórico.
- D1 no es la memoria primaria de Eventos y no replica detalle financiero, nutricional ni material.
- Las obligaciones financieras sin semántica de viaje/celebración no se presentan como eventos históricos.
- El dashboard expone `Eventos` como dominio de primer nivel y actúa como frontal de la fuente canónica.

## MIDAS: informe diario de estrategias demo

`midas-paper-lab` genera `strategy_state/dashboard.json` dentro de sus workflows de cierre de Madrid y EE. UU. El Worker privado de Segundo Cerebro lee ese JSON público bajo demanda mediante `GET /api/midas`, valida el contrato y mantiene una caché de cinco minutos. La interfaz abre la misma tabla desde Proyectos → MIDAS y desde la tarjeta Patrimonio de Home. GitHub Pages conserva la demo mock y no consulta MIDAS.

El agente genético original conserva el diario completo en `mamg97/personal_mamg`. Su workflow existente exporta solo fechas, capital inicial ficticio y valoraciones diarias a un Worker de ingesta dedicado. El Worker verifica firma y procedencia de un token GitHub OIDC de vida corta, limitado al workflow y rama previstos; D1 guarda ese resumen privado, nunca posiciones, tickers, operaciones, credenciales ni el diario bruto. `GET /api/midas` añade las cifras calculadas desde el resumen privado a su fila. El endpoint de ingesta no permite leer el resumen. No se añade una Action diaria ni un token GitHub permanente.

Desde el 28/09/2026, el mismo workflow conserva la curva histórica del genético original y exporta, cuando exista, una segunda curva de su campaña corregida `genetic_sp500_forward`. El historial antiguo se identifica como ejecución simulada al mismo cierre de la señal; la nueva campaña modela la siguiente apertura y mantiene un diario independiente. El Worker solo acepta esas dos combinaciones de identificador y calidad y la interfaz privada las muestra en filas separadas. Una primera sesión prospectiva no tiene aún retorno diario. Ninguna fila acredita órdenes de bróker.

El rendimiento heredado representa lo registrado por el simulador original: sus operaciones se contabilizaban al mismo cierre que generaba la señal. La UI lo identifica como simulación histórica con limitación metodológica, no como rendimiento ejecutado por bróker ni como una cartera directamente comparable con las nuevas. USD y EUR no se agregan ni se ordenan como una liga común. Si falta el extracto privado, la fila conserva fecha y rentabilidad ausentes.

### Laboratorio visual MIDAS

La app privada presenta además un laboratorio visual animado. La animación **no genera ni interpola rentabilidad**: dibuja exclusivamente las curvas de patrimonio ficticio ya registradas en los diarios de cada estrategia. El punto final y el color se derivan del último valor observado; cuando solo existe una sesión se muestra un estado de espera en vez de inventar una curva.

Para estrategias públicas, `strategy_state/dashboard.json` puede incluir un `equity_history` compacto derivado de los ledgers paper. El Worker valida y limita ese histórico antes de entregarlo a la UI. El genético privado aporta su propia curva ya saneada desde D1. El bootstrap Weekly ML del 25/09/2026 se puede mostrar como demostración técnica separada y siempre marcado como no prospectivo; desaparece como sustituto visual cuando exista un diario forward real de Weekly ML.

La interfaz usa SVG/CSS y respeta `prefers-reduced-motion`. No añade librerías de gráficos ni persiste un segundo histórico.


### Bridge ChatGPT → OBJETOS

La ruta operativa vigente no usa `ImageIngestQueue` como camino principal. Reutiliza el mismo upload canónico mediante un bridge server-to-server:

```text
ChatGPT / GESTOR OBJETOS
        ↓ openaiFileIdRefs temporal
objects-chatgpt-bridge
        ↓ multipart + Bearer upstream
segundo-cerebro-objects-ingest
        ↓ Service Binding
Worker principal /api/internal/objects/:objeto_id/image
        ↓ uploadObjectsImage
D1 media + Armario
```

`objects-chatgpt-bridge` descarga exactamente un archivo temporal desde hosts OpenAI permitidos, no lo persiste en Railway y lo convierte en multipart. `segundo-cerebro-objects-ingest` no ofrece lectura ni storage propio: reenvía la escritura mediante Service Binding al Worker principal. El Bearer server-to-server se valida contra un hash SHA-256 en el Worker principal.

Cuando una conversación no dispone de una acción HTTP directa al bridge pero sí puede operar Google Drive + Railway, se usa el bootstrap `objects-chatgpt-bridge/seed.mjs`: una copia privada de Drive sirve solo para materializar una referencia descargable, `OBJECTS_SEED_JOBS` alimenta temporalmente el lote (máximo 8), el servicio arranca con `node seed.mjs && npm start`, y tras `ok=true` se verifica `Armario`, se vacía la variable, se restaura `npm start` y se elimina el staging.

La antigua ruta `Drive staging → ImageIngestQueue → cron` queda como legado histórico. Las filas `OBJECTS_STAGING_META_403` pertenecen a ese intento anterior y no representan el estado vigente.

El procedimiento operativo detallado y el checklist de cierre están en `docs/OBJECTS_IMAGE_INGEST.md`.


## Finanzas · histórico Delta

El detalle patrimonial consume bajo demanda un export histórico privado de Delta. La referencia al spreadsheet vive en `IntegracionesPrivadas` de la fuente financiera; Git no contiene IDs reales ni operaciones.

El Worker expone `GET /api/finance/delta`, protegido por la misma capa privada, con paginación y separación entre compraventas operativas y ajustes automáticos de sincronización. El navegador no descarga las miles de filas durante el arranque del Home: la consulta se realiza al abrir Patrimonio y se cachea brevemente en el Worker.


## Salud — biblioteca visual de ejercicios

La biblioteca de ejercicios amplía Gimnasio sin cambiar la autoridad del plan:

```text
wger público (catálogo + media con licencia)
        ↓ lectura server-side
Cloudflare Worker privado
        ├── /api/gym/exercises
        ├── /api/gym/exercises/:id
        └── /api/gym/exercises/:id/media/...  ← proxy same-origin
        ↓
Salud → Gimnasio → Biblioteca / ficha técnica
        │
        ├── vincular ficha → D1 gym_exercise_links (mapping técnico)
        └── añadir al plan → GimnasioPlan canónico
                              ↓
                        /api/gym normal
```

wger es una referencia externa de técnica y multimedia, no almacena ni recibe el estado personal del entrenamiento. Segundo Cerebro solo envía términos genéricos de búsqueda/filtros y recupera catálogo/media pública. Cargas, repeticiones realizadas, notas, histórico y objetivos permanecen en las fuentes privadas.

La UI sirve vídeo/imagen mediante rutas same-origin autenticadas. Esto evita exponer una dependencia directa del navegador y permite validar host, recurso y licencia antes de retransmitirlo. El sistema no mantiene un mirror completo del catálogo: obtiene únicamente el contenido solicitado y usa caché efímera.

Para ejercicios curados puede existir una animación ilustrada propia versionada como asset estático de la aplicación. La selección se realiza únicamente por ID/nombre canónico exacto y afecta solo a la presentación: la ficha técnica, músculos/equipo y atribución pública continúan viniendo de wger, mientras que plan, cargas e histórico permanecen en sus fuentes privadas. Si no existe animación propia revisada, se conserva el vídeo/imagen libre de wger como fallback.

La restricción de producto es coste incremental cero: no se introducen APIs premium, R2 ni licencias de pago para esta capacidad. La ausencia de media libre se representa explícitamente; nunca se rellena mediante scraping de proveedores comerciales.
