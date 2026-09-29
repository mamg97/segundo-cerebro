# Handoff — Segundo Cerebro

## Última actualización

- **Fecha:** 2026-09-28
- **Herramienta:** Codex
- **Rama operativa:** `main`
- **Repositorio:** `mamg97/segundo-cerebro`

## Propósito de este documento

Este archivo describe únicamente el estado vigente y el siguiente paso. El historial de implementación permanece en Git y las decisiones duraderas en `docs/DECISIONS.md`.

## Estado actual

Segundo Cerebro dispone de dos superficies separadas:

- **GitHub Pages:** demo pública con mocks, sin datos ni conexiones privadas.
- **Cloudflare:** aplicación privada protegida por Access, con Worker, D1 e integraciones autorizadas.

La aplicación privada ya no es un prototipo de solo lectura. Hay escritura selectiva en los dominios que la necesitan y lectura estricta en los que no.

## Arquitectura operativa

```text
Usuario
  ↓
ORGANIZADOR / WEB GENERAL
  ↓
Estado global común
  ↓
Finance · Calendar · Habits · Health · resto de áreas
  ↓
Fuentes propietarias / D1
```

Las conversaciones especializadas gestionan su dominio, pero no crean fuentes de verdad paralelas. Este repositorio y los contratos de `agents/` permiten relevo entre ChatGPT normal y Work/Codex.

## Funcionalidad vigente

### Interfaz

- Dashboard responsive para Mac, iPhone e iPad.
- Modo claro/oscuro.
- Logo cerebral común en navegación y favicon.
- Thinking Orb vendorizado con estados de actividad.
- Vista semanal de agenda y eventos importantes; las decisiones se presentan dentro de su área propietaria, no como bloque independiente.
- Diseño móvil corregido para evitar overflow y apariencia de escritorio comprimido.

### Finanzas

- Fuente oficial externa + memoria de reglas + hoja privada derivada.
- Resumen mensual, presupuesto, próximos movimientos y conciliación.
- Separación entre partidas comunes e individuales.
- Deudas con resumen y detalle.
- Patrimonio con evolución histórica.
- Flujo mensual separado conceptualmente de inversiones/ahorro.
- La categoría Luz abre un drilldown privado alimentado por `LuzHistorico`: importe/consumo mensual, métricas por día, comparativa interanual, última factura, cobro previsto, presupuesto/gasto/comprometido/saldo y alertas derivadas.
- El drilldown de Luz se reconstruye desde la capa privada y no lee PDFs ni expone datos contractuales.
- Contrato vigente: `agents/FINANCE.md`.

### Calendario

- Integración iCloud por CalDAV.
- Lectura únicamente.
- Vista semanal y eventos importantes.
- Reglas privadas de alias y clasificación viven fuera de Git.
- El horizonte ampliado permite detectar eventos relevantes futuros sin convertir la home en un calendario completo.

### Gestor Eventos

- Contrato vigente: `agents/EVENTS.md`.
- Coordina logística de viajes, celebraciones y compromisos sin crear calendario ni contabilidad paralelos.
- Calendar/iCloud conserva fechas y horarios; tickets, reservas, emails y documentos permanecen en sus fuentes propietarias.
- Finanzas conserva presupuesto, provisiones y dinero libre.
- Estados operativos del gestor: `CONFIRMADO`, `PROPUESTO`, `PENDIENTE`, `CERRADO`.

### Hábitos

- HabitQuest está integrado de forma nativa.
- El Sheet original sigue siendo fuente de verdad.
- Lectura de hábitos, histórico y progreso.
- Marcar/desmarcar respetando Last-Write-Wins.
- Crear, editar, archivar/restaurar, eliminar y reordenar hábitos.
- Paridad funcional ampliada: vista lista/compacta, ordenación, separación pendientes/completados y activos/archivados, progreso diario, estadísticas 60/90 días, semana actual, heatmap de cinco semanas, logros y feedback de gamificación. La vista de gestión usa tarjetas densas con metadatos/chips, estadísticas y acciones secundarias discretas para evitar el aspecto administrativo inicial.
- La aplicación independiente HabitQuest se mantiene como fallback durante la validación; no se duplican su login Google, onboarding, tema independiente ni import/export XLSX.

### Salud — Gimnasio

- Salud contiene Médicos, Gimnasio y Nutrición.
- Médicos deriva de iCloud y es solo lectura.
- El plan de gimnasio vive en la fuente privada.
- Las sesiones y ejercicios registrados se persisten en D1.
- La UI recuerda la última carga real por ejercicio, permite borrar sesiones y muestra progreso.

### Salud — Nutrición

- Fuente privada `SEGUNDO CEREBRO - SALUD`.
- Pestañas lógicas: comidas reutilizables, registro planificado/consumido, objetivos, energía y menú semanal.
- La UI muestra consumido, gasto total, balance, objetivo, comidas e histórico cuando existen datos.
- Los macros se comparan explícitamente con sus objetivos vigentes.
- La web propone opciones de la base de comidas según los macros que faltan, identificándolas como sugerencias orientativas y sin sustituir el menú planificado.
- `MenuSemanal` está conectado como fuente propia; si no contiene filas, la UI lo indica sin inventar un menú.
- No se inventan objetivos nutricionales ni gasto ausente.
- Contrato vigente: `agents/HEALTH.md`.

### Despensa y suministros

- Gestor operativo: `GESTOR DESPENSA Y SUMINISTROS`.
- Contrato vigente: `agents/PANTRY.md`.
- Fuente privada canónica inicializada: `SEGUNDO CEREBRO - DESPENSA`.
- `Productos` es el catálogo maestro de identidad de producto, formato/EAN/URL y nutrición de producto disponible.
- `Inventario` es la fuente de disponibilidad física, cantidad aproximada, ubicación y confianza.
- `ListaCompra` contiene necesidades/candidatos de reposición.
- La web privada integra Despensa de forma nativa: Home recibe solo `pantrySummary` y el detalle se carga con `GET /api/pantry`.
- La vista Despensa incluye resumen humano, métricas, filtros por ubicación/categoría, búsqueda, tarjetas de inventario, lista `REVISAR → COMPRAR → COMPRADO`, coste estimado parcial/total y ficha de producto con precio, ticket, histórico, nutrición y enlace cuando exista.
- El Worker resuelve `SEGUNDO CEREBRO - DESPENSA` por título exacto mediante Drive y admite `PANTRY_SHEET_ID` como fallback privado; no se versiona el identificador.
- Salud no crea una base paralela de productos. `SEGUNDO CEREBRO - SALUD` mantiene ingesta, recetas, objetivos, menú y balance; puede referenciar `producto_id` de Despensa.
- Las recomendaciones de comida deben cruzar primero objetivo nutricional + inventario. Lo que falte o esté bajo se coordina con Despensa para `ListaCompra`.
- Nueva nutrición fiable de un producto existente se incorpora a `Productos` conservando el mismo `producto_id` cuando sea posible.
- Implementado en código el espejo Apple Reminders ⇄ `ListaCompra` mediante un agente macOS Swift/EventKit, endpoints privados, enlaces/cola/auditoría D1 y campos de sincronización en el Sheet.
- `REVISAR` permanece interno; `COMPRAR` es recordatorio activo; `COMPRADO` es completado; `CANCELADO` se completa sin borrado destructivo. Completar nunca incrementa inventario.
- La portada muestra compra confirmada, primeros cinco artículos, coste conocido con prefijo `≥` si faltan precios y contador sin precio. Despensa ofrece acceso superior directo a la lista.
- El agente escucha cambios EventKit y reconcilia cada 90 segundos mediante `launchd`. Token en Keychain/Cloudflare Secret; el Mac no recibe OAuth Google.
- La activación real está deliberadamente detenida antes del primer permiso/dry-run. Procedimiento en `docs/APPLE_REMINDERS_SYNC.md`.

### Apple Health

- Salud dispone de dos superficies privadas derivadas desde D1 al consultar `/api/health/history`: `HistoricoResumen` (agregados por rango 30/90/180/365/all) y `ActividadDiaria` (detalle por día: kcal activa/reposo/total, pasos, ejercicio, workouts, cobertura y metadatos). Permiten que GESTOR GYM Y NUTRI analice tanto tendencias como un día exacto mediante el Sheet autorizado; D1 sigue siendo la fuente canónica y la ausencia de fila debe mostrarse como “sin sincronizar”, nunca como 0.

Hay un único puente privado:

```text
Apple Watch / Apple Health / Zepp
→ Atajo único de iPhone
→ segundo-cerebro-health-ingest
→ Service Binding
→ segundo-cerebro
→ D1 privado
→ Salud / GESTOR GYM Y NUTRI
```

Estado:
- el puente energético original sigue operativo y compatible en `/v1/energy`;
- el flujo v2 de producción usa `/v1/sync` y está validado end-to-end con actividad + composición corporal;
- `health_energy_daily` se amplió con pasos, minutos de ejercicio, entrenamientos opcionales, timestamp de muestreo y detalle de fuentes;
- `health_body_samples` guarda muestras corporales normalizadas e idempotentes por tipo + timestamp original + fuente;
- `MedicionesCorporales` conserva el baseline histórico/manual y se amplió con IMC, masa magra, timestamp original e importación;
- `EnergiaDiaria` conserva el fallback manual y se amplió con pasos, minutos de ejercicio, entrenamientos y metadatos de muestreo; las filas explícitas de recuperación desde una exportación de Apple Salud se reconcilian idempotentemente hacia D1 y pueden sustituir un snapshot parcial del mismo día;
- `ObjetivosActividad` ya contiene los objetivos operativos y la regla de no ajustar la comida 1:1 por kcal del reloj;
- Salud incorpora una pestaña `Resumen` convertida en cuadro de mando de recomposición con cuatro bloques: Composición corporal, Nutrición, Actividad y Rendimiento;
- el Resumen muestra peso de hoy, media 7 días, cambio semanal, grasa/IMC/masa magra, cintura cuando exista, kcal activa/reposo/total, pasos, actividad semanal, sesiones de fuerza y progreso frente a objetivos;
- `ObjetivosProgreso` alimenta objetivos de tendencia, cintura, nutrición, adherencia a fuerza, benchmarks de ejercicios y muscle-up;
- la UI no define un mínimo de kcal a quemar: el gasto del reloj se mantiene informativo;
- la media de peso usa promedios diarios y compara 7 días actuales frente a 7 anteriores;
- bioimpedancia se interpreta como tendencia;
- el gestor operativo es `GESTOR GYM Y NUTRI`;
- el Atajo del iPhone ya envía energía activa/reposo, pasos, minutos de ejercicio, peso, grasa corporal, IMC y masa magra;
- Zepp Life está confirmado como fuente de composición corporal;
- una referencia incorrecta heredada al duplicar bloques (`Body Fat Percentage` apuntando a `Weight`) fue detectada y corregida; el backend actualizó la misma muestra mediante UPSERT, sin dejar una muestra duplicada para ese timestamp;
- el refresh token de Google se renovó temporalmente usando el cliente OAuth existente de LITOS; queda pendiente crear un cliente OAuth dedicado de Segundo Cerebro.

## Fuentes de verdad

- Finanzas: fuente financiera externa; hoja derivada solo transporta estado normalizado.
- Calendario y citas: iCloud.
- HabitQuest: Google Sheet original.
- Ingesta, recetas, objetivos, menú y balance de Salud/Nutrición: Sheet privado de Salud.
- Identidad de productos, nutrición de producto, inventario y lista de compra: Sheet privado canónico de Despensa.
- Sesiones de gimnasio: D1.
- Actividad automática de Apple Health: D1 `health_energy_daily`.
- Composición corporal automática de Apple Health: D1 `health_body_samples`; baseline/manual en `MedicionesCorporales`.
- Código, arquitectura y contratos: Git.
- Secretos: configuración privada de Cloudflare/local, nunca Git.

## Privacidad

- No versionar cifras personales, eventos reales, históricos médicos, nombres privados de reglas, credenciales ni tokens.
- GitHub Pages debe seguir siendo mock.
- iCloud permanece de solo lectura.
- Las mutaciones privadas deben escribir exclusivamente en la fuente documentada para ese dominio.


## Gestor Padres

- Contrato vigente: `agents/PARENTS.md`.
- El módulo se instancia únicamente en la aplicación `private-remote`; GitHub Pages no crea el área Padres.
- D1 privado es la fuente operativa de `family_cases`, `family_case_actions` y `family_case_refs`.
- La UI separa Padre, Madre y Familiar/Patrimonial común y prioriza estado, prioridad, próxima acción, responsable, vencimiento, espera/bloqueo y última actualización.
- El detalle de caso muestra cronología breve y referencias mínimas a fuentes/documentos.
- Calendario, Finanzas y LITOS conservan sus fuentes de verdad; Gestor Padres no duplica esos datos.
- La home general recibe solo `familySummary`: conteos de atención/espera/decisión y próximo vencimiento, sin detalle sensible.
- Endpoints privados disponibles: listado/creación de casos, lectura/actualización por id, alta de acciones y alta de referencias.
- La sensibilidad de los casos se fija a `muy_confidencial` en esta fase.
- La estructura está preparada para cargar datos reales únicamente en runtime/D1 después del despliegue; ningún caso real vive en Git.


## Problemas o límites conocidos

- La caja de consulta sigue siendo principalmente una experiencia local del frontend; todavía no existe un asistente general con lenguaje natural conectado a todos los datos del sistema.
- La aplicación todavía no es una PWA offline.
- No todos los dominios previstos tienen contrato propio en `agents/`.
- La calidad del estado depende de que las fuentes privadas estén sincronizadas y reconciliadas.
- Apple Health v2 está validado end-to-end y la automatización diaria del Atajo está configurada a las 23:55; queda verificar una ejecución automática real y separar el OAuth de Google del proyecto LITOS.
- `MenuSemanal` está conectado pero actualmente no contiene filas de planificación; la pestaña Menú mostrará ese estado vacío hasta que el gestor de Salud escriba propuestas.

## Sistema visual

- En la portada oscura, los epígrafes/categorías de tarjeta usan naranja y todos los títulos e importes principales comparten la misma familia sans.

- La portada comienza su información operativa con dos tarjetas uniformes: Hábitos de hoy (clic → HabitQuest) y balance nutricional (consumidas, gastadas y objetivo; clic → Salud/Nutrición). El objetivo nunca se inventa: si no existe muestra `Pendiente`.

- La cabecera superior conserva saludo/fecha y control de tema. Se eliminaron el badge de estado privado, el avatar `SC`, el gran titular de portada y el indicador `Pulso general`; el primer bloque de contenido mantiene separación visual respecto a la línea inferior de la cabecera.

- El modo oscuro usa un sistema visual único azul noche + azul eléctrico + naranja.
- Tokens principales: fondo `#07101D`, superficie `#0B1728`, superficie secundaria `#10213A`, azul `#2F6BFF / #5FA8FF`, naranja `#FF7A1A / #FFB347`, texto `#F8FAFC`, muted `#A8B3C7`, borde `#1E3350`.
- En oscuro se unifica la tipografía en Avenir Next / Segoe UI / system sans; se elimina la mezcla de serif en títulos.
- El naranja queda reservado para énfasis, progreso, estados destacados y microinteracciones; el azul para navegación, acciones y estructura.
- Las áreas y módulos se restringen visualmente a la familia azul/naranja para evitar el mosaico multicolor anterior.

## Despliegue automático

- El Worker privado tiene workflow de producción en `.github/workflows/deploy-private-cloudflare.yml`.
- Un cambio relevante en `main` valida JavaScript, construye el bundle privado, comprueba que no entren archivos privados y ejecuta `wrangler deploy`.
- Los secretos de despliegue de Cloudflare ya están configurados en GitHub Actions.
- El 2026-09-23 se validó una ejecución real completa hasta producción.
- El flujo normal es ChatGPT/GitHub → commit a `main` → GitHub Actions → Cloudflare, sin `git pull` ni `npm run deploy` manuales.

### Configuración CI/CD completada

El deploy automático completo está activado con los *repository secrets* documentados:

- `CLOUDFLARE_API_TOKEN`: token de API de Cloudflare con permisos para editar/deployar Workers.
- `CLOUDFLARE_ACCOUNT_ID`: identificador de cuenta de Cloudflare.

Rutas oficiales:
- API Tokens: `https://dash.cloudflare.com/profile/api-tokens`
- GitHub: repositorio → Settings → Secrets and variables → Actions.

Reglas:
- nunca versionar ninguno de estos valores;
- nunca pegarlos en una conversación;
- los cambios relevantes en `main` se despliegan sin intervención local.

## Correcciones UX v0.24.0

- El contenido de escritorio vuelve a ocupar todo el ancho disponible a la derecha de la barra lateral; se elimina el tope visual de 1460 px.
- Modo claro y oscuro comparten la misma jerarquía tipográfica, tratamiento de tarjetas, controles, diálogos, navegación y acentos; cambia la paleta, no el nivel de acabado.
- La barra superior incorpora `Modo demo`: oculta visualmente cifras con `** **` sin modificar el estado ni las fuentes reales. Se mantiene solo durante la sesión del navegador.
- Despensa deja de depender de una lectura correcta del Sheet para existir en navegación/Home. Si la fuente privada falla, el módulo permanece visible con estado de conexión y reintento.
- Assets frontend versionados como `v0.24.0` para evitar caché obsoleta en cambios de navegación/estilo.

## Objetos y armario

- Nuevo dominio principal: `OBJETOS`.
- Propietario funcional: `GESTOR OBJETOS Y ARMARIO`; contrato en `agents/OBJECTS.md`.
- Fuente canónica: `SEGUNDO CEREBRO - OBJETOS`.
- Creada en Drive el 2026-09-24 con contrato v0.1 y registrada como `OBJECTS_SHEET_ID` en `IntegracionesPrivadas`.
- Pestañas: `Objetos`, `Armario`, `Looks`, `LookItems`, `Kits`, `KitItems`, `Listas`, `ListaItems`, `README`.
- No se han añadido datos personales ficticios ni se ha creado una fuente paralela.
- La web privada incluye navegación, tarjeta Home y workspace con `Resumen · Inventario · Armario · Looks · Kits · Listas`.
- `GET /api/objects` está conectado al Sheet canónico; conserva `source-pending` solo como degradación si la fuente deja de resolverse.
- `/api/state` puede transportar solo `objectsSummary`; el detalle se carga bajo demanda.
- Contrato inicial v0.1 preparado para `Objetos`, `Armario`, `Looks/LookItems`, `Kits/KitItems` y `Listas/ListaItems`.
- GESTOR EVENTOS no copia inventario: aporta contexto y referencia la lista de OBJETOS mediante `evento_ref/lista_id`.
- Modo claro, oscuro, responsive y Modo demo usan los componentes/tokens comunes.
- Assets frontend previstos: `v0.26.0`.

## Navegación y Home v0.27.0

- La barra lateral es la navegación canónica de dominios.
- Se elimina de Home la parrilla duplicada `Áreas de tu vida` y la vista técnica `Sistema`.
- `Open Loops` deja de ser un área: sus asuntos viven en `Próximos movimientos`.
- `Objetivos` deja de ser un área: los objetivos se muestran dentro del dominio responsable; los objetivos transversales aparecen de forma compacta junto al foco operativo.
- Se dejan de mostrar puntuaciones 0–100 de área sin semántica homogénea.
- Finanzas abre directamente el presupuesto; Agenda lleva a la semana; Patrimonio/Salud/Hábitos/Despensa/Objetos/Padres abren sus vistas especializadas.
- Carrera, Pareja/Familia y Proyectos muestran en su detalle proyectos, pendientes y objetivos relacionados.
- Los indicadores del menú lateral se normalizan al sistema visual azul/naranja; se elimina la dependencia del mosaico multicolor.
- El icono visual de OBJETOS pasa a `◈` para no duplicar el de Pareja.
- Se elimina del frontend el código muerto de `renderAreas`, `renderSystemMap` y `setView`.
- Assets frontend: `v0.27.0`.

## Consulta rápida móvil v0.28.0

- Corregido el solape del orbe en móvil: el componente real `thinking-orb#system-orb` se oculta por debajo de 760 px.
- La tarjeta pasa de “¿Qué necesitas?” a `Consulta rápida`, explicando que sirve para consultar estado o abrir módulos.
- Añadidos chips ejecutables: `Qué tengo hoy`, `Abrir despensa`, `Nutrición hoy`, `Ver presupuesto`, `Abrir objetos`.
- Las órdenes rápidas abren directamente Despensa, Objetos, Nutrición, Hábitos, Presupuesto, Patrimonio, Padres o Agenda.
- `Qué tengo hoy` resume eventos del día y progreso de hábitos cuando están disponibles.
- La búsqueda genérica permanece como fallback para coincidencias simples.
- Las tareas complejas siguen correspondiendo a los gestores especializados; esta barra no pretende ser un chat multiagente.
- Light/dark comparten estilos y los chips son scrollables horizontalmente en móvil.
- Assets frontend: `v0.28.0`.

## Registro de Proyectos v0.29.0

- Nueva fuente privada canónica: `SEGUNDO CEREBRO - PROYECTOS`.
- Pestañas: `Proyectos`, `Documentacion`, `Relaciones`, `README`.
- El catálogo real queda fuera de Git público.
- Nuevo contrato: `agents/PROJECTS.md`.
- Nuevo endpoint privado: `GET /api/projects`.
- `/api/state` recibe únicamente `projectsSummary`; `/api/health` solo contadores técnicos.
- El área `Proyectos` del menú abre una vista propia con `Resumen · Todos · Relaciones`.
- Cada proyecto puede mostrar estado, prioridad, área, tipo, resumen, siguiente acción, repositorio, documentación, web, responsable, subproyectos y documentación estructurada.
- La búsqueda permite filtrar por texto, estado y área.
- Los enlaces privados se leen desde la fuente privada, no desde código.
- El registro inicial incluye los proyectos que el usuario ha identificado y documentación marcada como parcial/pendiente cuando no existe evidencia suficiente.
- Las relaciones permiten conectar proyectos con dominios sin duplicar datos; por ejemplo, sistemas de inversión pueden relacionarse con Finanzas/Patrimonio sin copiar contabilidad.
- Assets frontend: `v0.29.0`.

## Tipografía móvil Home v0.29.1

- Ajuste exclusivamente tipográfico; no cambia estructura, orden, grids ni tamaño de las tarjetas.
- En móvil se aumentan claramente títulos, cifras principales, etiquetas KPI, textos secundarios y CTA de Home.
- Afecta a Hábitos, Nutrición, Despensa, Objetos, Finanzas, Patrimonio, Deudas, Próximos movimientos y Agenda.
- Se mantiene paridad visual light/dark mediante los mismos componentes y tokens.
- Asset CSS: `v0.29.1`.

## Salud · Adherencia mensual v0.30.0

- Nueva pestaña privada `AdherenciaManual` en `SEGUNDO CEREBRO - SALUD`.
- Nueva vista `Salud → Adherencia`.
- Nuevo endpoint `GET /api/health/adherence?month=YYYY-MM`.
- Motor centralizado en `private-cloudflare/src/adherence.js`.
- Fuentes combinadas: Registro/Objetivos/ObjetivosActividad/MenuSemanal, Apple Health/D1, gym D1 y HabitQuest.
- Estados diarios: `CUMPLIDO`, `PARCIAL`, `NO_CUMPLIDO`, `SIN_DATOS`; días futuros quedan fuera del cálculo.
- Una fila válida de `AdherenciaManual` prevalece sobre la heurística.
- Resumen: cumplidos, parciales, no cumplidos, sin datos, adherencia %, cobertura, racha actual/mejor y comparación laborables/fin de semana.
- El detalle diario explica kcal, proteína, pasos, gym, hábitos y motivos.
- Mobile: semanas presentadas como tarjetas legibles manteniendo visión mensual; desktop usa calendario + panel de detalle.
- Light/dark comparten la misma semántica visual.
- Assets frontend: `v0.30.0`.

## Anillos de progreso compartidos v0.31.0

- Nuevo componente común `app/progress-ring.js`.
- Home:
  - Hábitos sustituye la barra horizontal por anillo diario.
  - Nutrición sustituye la barra horizontal por anillo kcal; si se supera el objetivo de forma real, el anillo cambia a tono de aviso.
- Hábitos:
  - la vista diaria reutiliza el mismo anillo común, eliminando una implementación visual aislada.
- Nutrición:
  - los objetivos kcal/proteína/hidratos/grasas se muestran como tarjetas compactas con anillos en vez de cuatro barras largas.
- Salud:
  - Nutrición, Actividad y Fuerza usan anillos compactos en el resumen.
  - Recomposición sigue como texto porque no existe un porcentaje único honesto.
- Adherencia:
  - el porcentaje mensual usa el mismo componente.
- No se aplican anillos a Despensa, Objetos, deuda o cifras financieras por el mero hecho de ser números.
- Modo demo neutraliza también el arco de progreso para que no revele porcentajes aproximados.
- Assets frontend: `v0.31.0`.

## Orbe móvil seguro v0.32.0

- Se corrige la regresión introducida en v0.28 que ocultaba el Thinking Orb en pantallas móviles con `display: none !important`.
- El orbe vuelve a mostrarse en móvil:
  - tamaño interno real de 64 px;
  - situado en la esquina superior derecha del bloque de consulta rápida;
  - `pointer-events: none` para no capturar toques;
  - el bloque de texto reserva espacio específico para que nunca se solape;
  - input, botón y sugerencias siguen ocupando el ancho completo debajo.
- Desktop conserva el tamaño de 96 px.
- El cambio de tamaño se sincroniza con `matchMedia("(max-width: 760px)")`, por lo que también funciona al rotar/cambiar viewport.
- Light y dark comparten exactamente el mismo layout.
- Assets frontend: `v0.32.0`.

## Compatibilidad iOS de anillos v0.32.1

- Los anillos estaban implementados y presentes en `main`, pero el arco dependía de `calc(var(--ring-progress) * 3.6deg)` dentro de `conic-gradient`.
- Se sustituye por `--ring-fill: NN%`, compatible de forma más robusta con Safari/iOS.
- Se mantiene `--ring-progress` por compatibilidad interna, pero el render visual usa porcentaje directo.
- Se sube ligeramente el contraste del track.
- Se fuerzan nuevos asset versions para evitar que Safari reutilice JS/CSS previos.
- Assets frontend: `v0.32.1`.

## Decisiones contextuales v0.33.0

- Eliminado de Home el bloque independiente `3 decisiones abiertas` que aparecía debajo de la agenda.
- `DECISION` se conserva en el estado global y en la búsqueda rápida.
- Carrera, Pareja/Familia y otras áreas genéricas muestran sus decisiones abiertas junto a pendientes, proyectos y objetivos.
- Proyectos recibe las decisiones abiertas de `area-projects` y las muestra en su workspace; cuando el nombre/alias del proyecto coincide de forma inequívoca, también aparecen en el detalle del proyecto.
- Una decisión solo se eleva a `Próximos movimientos` cuando tiene `nextAction`, `dueDate` o `dueAt`.
- El contador de `Próximos movimientos` pasa a reflejar elementos accionables, no todas las decisiones existentes.
- Se elimina CSS y código muerto del antiguo bloque standalone.
- Assets frontend: `v0.33.0`.

## Evolución a Cerebro Global

- Se formaliza `CEREBRO GLOBAL` como interfaz principal futura.
- Nuevo contrato: `agents/COORDINATOR.md`.
- Nueva hoja de ruta: `docs/EVOLUTION_GLOBAL_BRAIN.md`.
- Objetivo: el usuario habla con un único coordinador; este enruta a Finanzas, Eventos, Salud, Hábitos, Despensa, Objetos, Padres, Proyectos y futuros módulos.
- Los gestores especializados conservan propiedad semántica y fuentes de verdad, pero dejan de requerir una conversación elegida manualmente.
- La transición no borra los chats actuales: quedan como mantenimiento/fallback hasta cubrir lectura, mutaciones y recuperación de errores.
- Prioridad siguiente:
  1. registro estructurado de capacidades de gestores;
  2. Context Planner;
  3. composición multi-dominio de solo lectura;
  4. después mutaciones coordinadas con confirmación.
- Motivación adicional: evitar conversaciones monolíticas muy largas y lentas; la continuidad debe depender del sistema/documentación, no del historial completo del chat.

## Botón Actualizar en cabecera v0.34.1

- Nuevo control global `Actualizar` en la cabecera.
- Desktop: botón textual `↻ Actualizar`.
- Móvil: botón circular con icono `↻` para conservar espacio.
- Al pulsarlo se recarga la aplicación y, durante el nuevo arranque, se vuelven a consultar el estado privado y sus fuentes conectadas.
- El control queda visible también en modo Demo (`data-demo-unmasked`).
- Mientras se inicia la recarga, el botón se deshabilita y el icono gira como feedback.
- No modifica navegación ni estructura de Home.
- Assets frontend: CSS `v0.34.1`, JS `v0.34.5`.

## Próxima acción exacta

Validar en producción la navegación simplificada y los dominios privados:

1. Confirmar que ya no aparece `Áreas de tu vida / Sistema` al final de Home.
2. Confirmar que `Open Loops` y `Objetivos` ya no aparecen en el menú lateral.
3. Probar navegación: Finanzas → presupuesto, Agenda → semana, Patrimonio/Salud/Hábitos/Despensa/Objetos/Padres → detalle.
4. Verificar que Carrera, Pareja/Familia y Proyectos muestran sus pendientes/proyectos/objetivos asociados.
5. Continuar después con validaciones funcionales pendientes de Despensa, Luz, Apple Health y HabitQuest.

## Archivos que debe leer el siguiente relevo

- `AGENTS.md`
- `docs/HANDOFF.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PRIVACY.md`
- `docs/DECISIONS.md`
- `agents/FINANCE.md`
- `agents/EVENTS.md`
- `agents/HEALTH.md`
- `agents/HABITS.md`
- `private-cloudflare/README.md`
- `docs/APPLE_HEALTH_SHORTCUT.md`

No reconstruir el proyecto desde conversaciones antiguas salvo que se investigue una decisión histórica concreta.

- Despensa: si no existe `PANTRY_SHEET_ID` como secret, el Worker consulta primero el registro privado `IntegracionesPrivadas` y solo después intenta Drive search. La pestaña es oculta y contiene únicamente referencias de infraestructura; los datos reales siguen en el Sheet canónico de Despensa.


### Nutrición v0.25.0

- Corregido un bug del Modo demo: anteriormente instrumentaba todos los números con `<span>` incluso desactivado, interfiriendo con selectores visuales de Nutrición y provocando saltos de línea, badges falsos y tarjetas desproporcionadas.
- El Modo demo ahora enmascara texto únicamente cuando está activo y restaura el contenido original al desactivarlo, sin alterar la estructura DOM.
- Nutrición mantiene el Health dialog amplio, pero usa un ancho interno de lectura de hasta 1180 px.
- KPIs, objetivos, planes sugeridos, fuentes, comidas, formulario rápido e histórico tienen nueva escala tipográfica y espaciado responsive.
- Assets frontend: `v0.25.0`.


## Eventos + Histórico v0.34.0

Implementado un dominio persistente de Eventos:

- nueva entrada `Eventos` en la navegación privada;
- botón `Ver histórico` en el bloque de Eventos importantes de Home;
- tarjetas de eventos pulsables;
- workspace con activos/en curso e histórico;
- ficha agregada con Finanzas, Nutrición/actividad por fechas, lista de OBJETOS, crónica, referencias y balance final;
- Home deja de tratar compromisos puramente financieros como eventos;
- eventos finalizados salen automáticamente de Home cuando termina su fecha y permanecen en D1;
- API privada `/api/events` y subrutas de detalle/hechos/referencias;
- tablas D1 `event_records`, `event_facts`, `event_refs`, creadas de forma idempotente; migración declarativa `0002_events.sql`;
- sincronización iCloud → D1 de solo lectura durante `/api/state`;
- `eventsSummary` minimizado en el estado general.

No se ha hardcodeado ningún viaje real en Git. Los eventos reales aparecen por reglas privadas + iCloud y sus gestores pueden enriquecer la crónica mediante la API.

Assets frontend: `v0.34.0`.

### Validación pendiente

1. CI: sintaxis, build y dry-run del Worker.
2. Producción: comprobar que `Eventos` aparece en barra lateral.
3. Abrir una tarjeta activa desde Home y revisar ficha agregada.
4. Verificar que una lista de OBJETOS con `evento_ref` se resuelve en la ficha.
5. Tras finalizar un evento, confirmar que desaparece de Home y figura en Histórico sin perder hechos.


## Hotfix de carga privada v0.34.1

- La captura posterior a v0.34.0 mostró el dashboard detenido en el esqueleto inicial: `/api/state` podía bloquear toda la inicialización mientras esperaba integraciones externas.
- `/api/state` ahora consulta Finanzas, HabitQuest, Nutrición, Despensa, Objetos, Proyectos, iCloud y resumen familiar en paralelo con límites de latencia.
- Una fuente lenta degrada su propio estado a `timeout/error` sin impedir que el resto del estado privado llegue al navegador.
- La persistencia y el resumen de Eventos son best-effort y tienen límites propios; nunca deben bloquear Home.
- El cliente aborta la carga inicial del estado privado a los 9 s como última salvaguarda y continúa renderizando en vez de quedar eternamente en `Cargando…`.
- Si esa salvaguarda entra, el lateral muestra `Modo privado · Conexión temporalmente no disponible` en lugar de aparentar una carga infinita.
- Assets frontend: `v0.34.1`.


## Hotfix de arranque iPad v0.34.2

- La segunda captura de iPad mostró que el problema no era solo latencia de `/api/state`: a las 20:04 el encabezado seguía mostrando `Buenos días`, prueba de que `app.js` no había llegado a ejecutar `init()`.
- El único módulo estático nuevo introducido por v0.34.0 era `events.js`. Un fallo de carga/parseo de cualquier import estático impide arrancar todo el grafo ES modules.
- `events.js` deja de ser dependencia estática del bootstrap. Se carga con `import()` únicamente al abrir Eventos/Histórico o una ficha.
- El área Eventos se puede construir desde `eventsSummary` sin importar el módulo de detalle.
- Si Eventos fallara en un navegador concreto, el dashboard principal continúa operativo y solo se degrada ese módulo.
- Se fuerza URL nueva para `app.js` y para el import dinámico de Eventos.
- Assets frontend: `v0.34.2`.


## Hotfix Eventos iPad v0.34.3

- Confirmado por captura: el dashboard ya arranca en iPad, pero la carga bajo demanda de `events.js` falla y activa el fallback "Módulo temporalmente no disponible".
- Para eliminar por completo esa dependencia de Safari/asset-loading, la UI de Eventos se integra ahora en `app.js`.
- `events.js` deja de ser necesario para el flujo de usuario en producción; la API privada y D1 no cambian.
- Se mantienen activos/histórico, ficha de evento, Finanzas, Nutrición, OBJETOS, crónica, referencias y balance final.
- El objetivo de este hotfix es evitar cualquier fallo por carga de un segundo módulo ES en iPad.
- Assets frontend: `v0.34.3`.


## Hotfix ciclo de vida Eventos v0.34.4

- La UI de Eventos ya cargaba correctamente en iPhone, pero el contador mostraba `En curso = 0` durante un viaje activo.
- La causa era de datos, no de render: D1 solo persistía eventos de iCloud que coincidían con una regla explícita. Un viaje real podía aparecer en Home por Finanzas y no existir todavía en el ledger histórico.
- El Worker ahora reconoce también eventos inequívocos de calendario por semántica de viaje/cumpleaños/celebración, sin convertir recordatorios financieros ordinarios en eventos.
- La vista Eventos mezcla los registros persistidos con el calendario iCloud vivo antes de calcular `Activos / En curso / Histórico`, por lo que el evento actual se refleja inmediatamente aunque el upsert de D1 sea best-effort.
- Histórico vacío ya explica que todavía no existen eventos cerrados guardados desde la activación del ledger; no implica un error de carga.
- Assets frontend: `v0.34.4`.


## Finanzas · Liquidez por cuenta + composición patrimonial v0.35.0

- Nueva visualización en Finanzas para separar, por cuenta, saldo actual, dinero ya reservado y dinero libre.
- Contrato privado opcional:
  - `Cuentas`
  - `ReservasCuenta`
- Cada cuenta se representa mediante una barra horizontal segmentada. La parte libre se deriva como saldo menos reservas cuando no existe `free_amount` explícito.
- Si reservas + libre superan el saldo, la UI marca una discrepancia de conciliación.
- Patrimonio incorpora una composición vertical segmentada tipo vault/cilindro por custodio o plataforma.
- Contrato privado opcional: `PatrimonioDetalle`.
- La vista patrimonial agregada mantiene las curvas históricas existentes y añade la distribución actual sin sustituir las apps de inversión.
- Ningún saldo, nombre de cuenta real ni cifra patrimonial queda hardcodeado en Git.
- El Gestor de Finanzas es responsable de mantener estas asignaciones cuando cambien saldos, provisiones o ubicaciones patrimoniales.
- Assets frontend: `v0.35.0`.


## Finanzas · Liquidez por cuenta — barras apiladas v0.35.1

- Sustituida la representación horizontal por una gráfica dinámica de barras apiladas verticales.
- Se muestra una barra por cuenta, alimentada exclusivamente por `Cuentas` + `ReservasCuenta`.
- Encima de cada barra aparece el saldo actual; cada franja representa una reserva/compromiso y el remanente se muestra como `Libre`.
- La leyenda lateral muestra destino, importe y porcentaje sobre el saldo.
- Cuando los compromisos superan el saldo, la barra conserva todos los compromisos y dibuja una línea de saldo real para visualizar el déficit sin falsear cifras.
- Las reservas con estado terminal (`executed`, `paid`, `released`, `closed`, `completed`, `cancelled`) dejan de entrar en la visualización.
- Responsive: 4 barras en escritorio ancho, 2 en viewport intermedio y 1 por fila en móvil.
- No se hardcodean saldos ni destinos en frontend; la visualización se recalcula al refrescar datos privados.
- Assets frontend: `v0.35.1`.



## Hotfix Finanzas · SVG CSP-safe v0.35.4

- Causa raíz de las barras verticales vacías: la app privada aplica CSP `style-src 'self'`; los porcentajes se estaban escribiendo mediante atributos `style=""` inline y el navegador los bloqueaba.
- Se elimina por completo la geometría basada en estilos inline.
- La barra de liquidez se renderiza ahora como SVG dinámico: cada reserva es un `rect` con `y` y `height` numéricos calculados en JavaScript; la línea de saldo en casos de overflow es un `line` SVG.
- Los colores siguen viniendo de CSS externo permitido por CSP.
- Verificación previa al cierre: render headless en Chromium con los importes reales conocidos de Openbank Miguel (191,42 €) y Openbank Andrea (150,95 €); ambas barras aparecen completamente rellenas y segmentadas, y Andrea muestra la línea de saldo real en el punto correcto.
- Despliegue privado de Cloudflare completado correctamente.
- Assets frontend: `v0.35.4`.


## Navegación + visualización financiera v0.36.0

- La navegación deja de ser plana:
  - Agenda → Eventos.
  - Familia → Padres.
  - Salud → Hábitos.
  - Objetos → Despensa.
- Los cumpleaños simples permanecen en Agenda/calendario y no se incorporan a Eventos. Solo aparecen en Eventos cuando el propio registro describe un plan concreto (comida, cena, fiesta, quedada, etc.).
- ORGANIZADOR no mantiene estado financiero paralelo: consume `Cuentas`, `ReservasCuenta` y `PatrimonioDetalle` preparados por GESTOR FINANZAS.
- Liquidez usa barras verticales rectangulares 2D de altura fija. Las retenciones existentes con `kind=card_hold` se separan visualmente de otros compromisos sin duplicar datos.
- El 100% de cada barra es el saldo actual. El exceso de compromisos se muestra como alerta y no se dibuja fuera del saldo.
- Patrimonio usa una barra horizontal apilada 2D y tarjetas por plataforma. `PatrimonioDetalle` es el total/distribución actual mostrado; el histórico de `Patrimonio` conserva su función temporal.
- Paleta de segmentos: estilo Activity/Fitness con colores vivos.
- Assets frontend: `v0.36.0`.


## Liquidez · líneas guía y paleta única v0.36.1

- Cada franja de la barra vertical de liquidez queda conectada con su etiqueta mediante una línea guía minimalista.
- La leyenda se ordena de arriba abajo igual que la barra, evitando cruces visuales.
- Las líneas solo conectan segmentos realmente dibujados dentro del saldo; los compromisos fuera de saldo se mantienen en texto sin fingir una franja.
- Los compromisos reciben colores por índice con una paleta de 12 tonos vivos y no repiten color dentro del mismo bloque mientras haya colores disponibles.
- `Retenciones bancarias` y `Libre` conservan colores dedicados y distintos de los compromisos.
- En móvil se ocultan las líneas guía para evitar saturación, manteniendo la leyenda normal.
- Assets frontend: `v0.36.1`.


## Liquidez · fecha de cobro en ítems v0.36.2

- Los compromisos muestran la fecha de cobro dentro del propio ítem cuando Finanzas ya dispone de ella.
- La UI prioriza campos estructurados opcionales (`charge_date`, `due_date`, `billing_date`, `charge_day`) y, mientras no existan, interpreta expresiones canónicas ya presentes en `note`: `cobro previsto DD/MM/YYYY`, `próximo cargo esperado DD/MM/YYYY`, `día N` o `alrededor del día N`.
- No se inventa una fecha cuando no existe información suficiente.
- La fecha aparece compacta bajo el importe, por ejemplo `Cobro: 30 sept`, `Cobro: día 4` o `Cobro: aprox. día 29`.
- ORGANIZADOR sigue siendo de solo lectura respecto al estado financiero.
- Assets frontend: `v0.36.2`.


## Apple Health nativo · HealthKit bridge

Estado 2026-09-28:

- Implementada `ios/SegundoCerebroHealthBridge`, app SwiftUI mínima para reemplazar la lógica manual de Atajos.
- Mantiene una única canalización: HealthKit → ingest Worker existente → Service Binding → Worker privado → D1.
- Reutiliza `HEALTH_INGEST_TOKEN`; el valor no está en Git y la app lo guarda en Keychain.
- Sincroniza hoy + ayer de forma idempotente.
- HealthKit:
  - actividad: energía activa/basal, pasos, ejercicio y workouts;
  - cuerpo: peso, grasa, IMC y masa magra;
  - recuperación: FC reposo, FC caminando, HRV SDNN, respiración, SpO₂, VO₂ máx., temperatura de muñeca;
  - sueño: asleep/in-bed/awake/Core/Deep/REM cuando existen.
- Añadida tabla privada `health_recovery_daily`; ausencia de señal = `null`, nunca cero inventado.
- `GET /api/health/history` expone también `recovery` para consumo privado posterior.
- El Worker de ingesta pasa a desplegarse automáticamente con el workflow privado.
- CI del backend valida sintaxis/build/Wrangler; CI iOS compila el proyecto con Xcode y sin firma.
- El Atajo actual permanece activo como fallback. No retirarlo todavía.

### Punto de intervención humana

No es necesario que el usuario edite código ni construya Atajos. El código y backend ya pueden prepararse sin intervención.

Antes de considerar el bridge una sustitución permanente hay que comprobar el Team de Xcode: un `Personal Team` gratuito expira a los 7 días y solo sirve para la prueba inicial. No desactivar el Atajo por ese motivo hasta decidir una vía de firma sostenible.

La primera intervención irreductible es:

1. abrir `ios/SegundoCerebroHealthBridge/SegundoCerebroHealthBridge.xcodeproj` en Xcode;
2. elegir su Apple Development Team y ejecutar la app en su iPhone;
3. introducir una vez el token existente `HEALTH_INGEST_TOKEN` recuperándolo localmente del Atajo actual, sin compartirlo;
4. conceder permisos de lectura de Salud;
5. pulsar `Sincronizar ahora` una vez y comunicar el resultado de Diagnóstico.

Después de esa primera sincronización se debe verificar D1/dashboard antes de retirar la automatización antigua.

## MIDAS en Segundo Cerebro · v0.37.5

- La aplicación privada abre el informe desde la ficha Proyectos → MIDAS → «Ver informe diario» y también desde la tarjeta Patrimonio → «Ver MIDAS» de la pantalla principal. Ambos accesos muestran las 31 líneas catalogadas: 9 carteras demo estadounidenses, 4 adaptaciones TFM EUR, el genético original con diario privado aún no enlazado y 17 ideas pendientes, incluida TimesFM como hipótesis de investigación.
- Por fila se ve estado, último cierre, variación del último día, acumulado y capital ficticio si existe. `—` significa dato ausente, no 0 %.
- `GET /api/midas` lee el informe público de `mamg97/midas-paper-lab` bajo Cloudflare Access y mantiene caché de cinco minutos. Pages no muestra datos MIDAS.
- Los workflows existentes de Madrid y EE. UU. actualizan el mismo informe. No se añade una Action periódica.
- En el primer día, antes de dos cierres, la variación diaria permanece vacía. El genético original conserva su diario privado fuera de este informe.
- El genético original S&P 500 aparece como primera sección del informe, con su diario privado marcado como no enlazado. La estrategia `genetic_frozen` de ocho acciones es una adaptación nueva y separada; sus resultados no se atribuyen al agente original.
- Cada fila muestra «Origen», derivado del catálogo público: TFG 2021, TFM, MIDAS Python, agente genético, experimentos históricos o campaña nueva de 2026. El origen no implica que una adaptación sea una réplica literal del código antiguo.
- Se ha preparado la conexión privada del diario genético original: el workflow propio envía solo su curva de capital ficticio a `segundo-cerebro-midas-ingest` con GitHub OIDC; D1 la sirve únicamente en el panel privado. Hay que verificar el primer envío y el valor mostrado. El diario bruto sigue fuera del repositorio público.
- La rentabilidad que aparecerá para ese agente procede del diario simulado original, que anotaba operaciones al cierre de la señal. La UI advierte de esa limitación; no se presenta como operación real ni como prueba de que el algoritmo sea rentable al ejecutarlo.


## Home · estado visual de cuentas y patrimonio v0.37.6

- El resumen principal de **Dinero** incorpora una versión compacta de la visualización de liquidez ya existente:
  - una mini barra vertical segmentada por cada cuenta;
  - saldo actual;
  - dinero libre;
  - retenciones cuando existen;
  - exceso/falta si los compromisos superan el saldo.
- La mini visualización consume exactamente `monthlyBudget.liquidityAccounts`; no mantiene una segunda lógica ni un segundo estado financiero.
- El modelo de segmentos se centraliza en `liquidityVisualModel()` y lo reutilizan tanto Home como el detalle de Liquidez.
- El resumen principal de **Patrimonio** muestra ahora:
  - patrimonio total;
  - barra horizontal 2D apilada por plataforma;
  - leyenda compacta con plataforma, porcentaje e importe.
- Patrimonio Home consume la misma colección `wealth.allocation` / `PatrimonioDetalle` que el detalle completo.
- Las visualizaciones son compactas y responsive: 4 cuentas en escritorio, 2×2 en anchuras menores.
- No se han añadido datos financieros ni nuevas fuentes; el cambio es exclusivamente de presentación.
- Assets frontend: `v0.37.6`.


## Home · jerarquía financiera v0.37.7

- **Dinero · Este mes** pasa a ocupar una fila completa del resumen financiero.
- Dentro de Dinero, el resumen presupuestario ocupa la zona izquierda y **Estado de cuentas** la derecha en escritorio, permitiendo leer las 4 cuentas con barras más grandes.
- Las mini barras de cuenta aumentan a 34×112 px en escritorio y conservan exactamente el mismo modelo canónico de liquidez.
- La segunda fila queda en dos columnas: **Patrimonio** a la izquierda y **Deudas** a la derecha.
- En móvil el orden es Dinero → Patrimonio → Deudas.
- Responsive:
  - >1180 px: Dinero en composición horizontal interna;
  - 901–1180 px: Dinero apila resumen + cuentas, manteniendo las 4 cuentas en una fila si caben;
  - ≤900 px: Patrimonio y Deudas pasan a una columna;
  - ≤520 px: las cuentas pasan a una columna.
- No cambia ningún dato ni contrato financiero; solo layout y escala de presentación.
- Assets frontend: `v0.37.7`.


## Finanzas · sincronía resumen/detalle v0.37.9

- El resumen financiero de Home y el detalle de liquidez siguen una única fuente: `monthly.liquidityAccounts`.
- Ambos proyectan las cuentas mediante `liquidityVisualModel()`; no existe un segundo estado financiero independiente para Home.
- La etiqueta del resumen pasa de **Falta** a **Pendiente de cubrir**, igual que en el detalle.
- Las reservas con estado terminal (`executed`, `paid`, `closed`, etc.) se excluyen en backend y desaparecen automáticamente tanto del resumen como del detalle al refrescar.
- Corrección de dato operativo: el seguro de moto de 183 € corresponde al ciclo anterior; el dinero repuesto ya forma parte del saldo BBVA actual y no debe contarse como compromiso del ciclo 20/09–20/10.
- Assets frontend: `v0.37.9`.


## Salud · menú semanal visual + Home v0.38.0

- Rediseñada la pestaña **Salud → Menú** como tablero semanal de tarjetas, sustituyendo la lista plana.
- Cada día muestra:
  - comidas planificadas;
  - kcal estimadas por comida;
  - proteína estimada por comida;
  - total diario planificado;
  - progreso de kcal frente al objetivo activo de `Objetivos`;
  - progreso de proteína frente al objetivo activo de `Objetivos`;
  - kcal/proteína que quedan por completar o exceso cuando proceda.
- No se hardcodean objetivos: la UI utiliza `data.objective.kcal` y `data.objective.protein` del contrato de Nutrición.
- El menú planificado sigue separado del registro real: ninguna comida del menú se trata como consumida.
- Añadido a **Home**, inmediatamente después del bloque de Agenda/Calendario, un resumen semanal con las mismas comidas, kcal, proteína y barras de cobertura.
- La Home reutiliza la llamada existente a `/api/nutrition`; no añade una segunda petición ni un nuevo estado.
- El CTA **Ver menú completo** abre Salud directamente en la pestaña Menú.
- En escritorio la semana se presenta como rejilla; en móvil pasa a carrusel horizontal con scroll-snap.
- Assets frontend: `v0.38.0`.


## Finanzas · compactación móvil de cuentas v0.38.2

- Corregido el desaprovechamiento de espacio de **Estado de cuentas** en Home móvil.
- Las cuatro cuentas siguen apiladas una por fila para conservar legibilidad, pero cada tarjeta pasa a una composición horizontal compacta:
  - identidad + disponible bancario a la izquierda;
  - barra segmentada en el centro;
  - saldo total / libre interno / retenido / pendiente de cubrir a la derecha.
- La barra móvil baja de 118 px a 92 px de alto; las tarjetas eliminan el gran vacío lateral/vertical sin perder ninguna métrica.
- En pantallas ≤380 px se aplica una variante aún más estrecha.
- El modelo financiero y los cálculos no cambian; es únicamente una corrección responsive.
- Asset CSS: `v0.38.2`; JS permanece `v0.38.1`.


## Finanzas · 2 cuentas por fila en móvil v0.38.3

- **Estado de cuentas** en Home pasa a una rejilla de **2 columnas** en móviles de hasta 520 px.
- Cada tarjeta se adapta a media anchura:
  - cuenta + disponible bancario arriba;
  - barra segmentada compacta;
  - saldo total, libre interno, retenido y pendiente de cubrir al lado.
- Solo por debajo de 340 px se vuelve a 1 cuenta por fila.
- El cambio es exclusivamente CSS/responsive; no toca `app.js`, contratos financieros ni la estructura del menú que puede evolucionar en paralelo.
- Asset CSS: `v0.38.3`; JS permanece sin cambios.


## UI · legibilidad tipográfica v0.38.4

- Aplicado un pase transversal de legibilidad sin alterar estructura, datos ni navegación.
- Se mantienen los titulares grandes actuales; se aumentan principalmente textos secundarios que habían quedado demasiado pequeños:
  - acciones y microcopy;
  - métricas auxiliares de Finanzas;
  - nombres/importes de cuentas y leyendas de Patrimonio;
  - calendario y próximos movimientos;
  - Salud, Gimnasio y vistas de detalle;
  - menú semanal y resumen del menú en Home.
- En escritorio, muchas etiquetas que estaban en 6–9 px pasan al rango aproximado 8.5–12 px según jerarquía.
- En móvil se conserva la rejilla 2×2 de cuentas, pero se suben las fuentes internas hasta el máximo compatible con media anchura.
- El cambio se implementa como override CSS final para minimizar conflictos con cambios concurrentes en la estructura del menú.
- No se modifica `app.js` ni el HTML estructural.
- Asset CSS: `v0.38.4`; JS permanece `v0.38.1`.


## Despensa · acceso directo a ListaCompra v0.38.5

- **Despensa** incorpora en la parte superior un selector visible de vistas:
  - `Inventario`
  - `🛒 Lista de la compra`
- `openPantryDetail("shopping")` abre directamente la vista de `ListaCompra`; no obliga a renderizar primero el inventario como paso de navegación.
- En Home, la tarjeta de Despensa deja de ser un único botón y expone dos acciones independientes:
  - `🛒 Lista de la compra` → abre directamente ListaCompra;
  - `Ver despensa →` → abre Inventario.
- El buscador rápido también entiende `lista de la compra` / `lista compra` y abre esa vista directamente.
- La fuente mostrada en esa vista es **ListaCompra de Segundo Cerebro**.
- El puente Apple Reminders ↔ Segundo Cerebro existe en código, pero la UI no afirma «Sincronizado» hasta que el agente real esté configurado y su estado sea verificable.
- Assets: `styles.css?v=0.38.5`, `app.js?v=0.38.5`, `pantry.js?v=0.38.5`.


## Salud · Home weekly menu resilience v0.38.7

- Corregida la desaparición silenciosa de **Menú de la semana** en Home.
- Confirmado en la fuente privada que `MenuSemanal` sigue conteniendo la semana 2026-09-28 → 2026-10-04; el problema era de presentación/carga, no pérdida de datos.
- La Home ya no depende exclusivamente del endpoint completo `/api/nutrition` para pintar el menú.
- Añadido `GET /api/nutrition/menu?date=YYYY-MM-DD`, lectura ligera que consulta únicamente:
  - `MenuSemanal`;
  - `Objetivos`.
- Si `/api/nutrition` falla o no entrega `weeklyMenu`, Home usa automáticamente ese endpoint ligero.
- Si incluso la lectura ligera falla, la sección **permanece visible** con un estado de error; no vuelve a desaparecer dejando el calendario pegado al footer.
- En modo demo/no privado sí se oculta, porque no hay fuente real que mostrar.
- Este fallback evita que futuras ampliaciones de Nutrición (recetas, ingredientes, salud, energía, D1, etc.) puedan tumbar el menú semanal de Home.
- Assets frontend: `v0.38.7`.


## Finanzas · diario de patrimonio v0.39.0

- El antiguo hábito **Diario mercados** deja de ser una tarea de HabitQuest y pasa a **Finanzas → Patrimonio**.
- La fuente privada derivada incorpora `PatrimonioDiario`, con cierres por fecha, patrimonio total cuando existe, moneda, variación diaria, P/L del día, clasificación y trazabilidad.
- Se migró el histórico disponible desde `DIARIO MERCADOS` de la fuente financiera sin modificar el maestro; los campos que el histórico no contenía permanecen nulos y no se reconstruyen.
- Las nuevas capturas nocturnas de Delta se registran en `PatrimonioDiario` conservando exactamente la moneda y cifras mostradas.
- El detalle de Patrimonio muestra tres KPI del último cierre, los últimos registros y un histórico desplegable.
- `PatrimonioDetalle` sigue siendo la distribución actual por plataforma; `Patrimonio` conserva la referencia mensual. El diario no sustituye ninguna de esas fuentes.
- Assets frontend: `v0.39.0`.


## MIDAS · tesis + CAGR 2031 v0.39.1

- MIDAS incorpora una segunda fuente privada, independiente del diario de estrategias: el Sheet **MIDAS - TESIS Y WATCHLIST**.
- El Worker la resuelve por nombre exacto con el OAuth Google ya configurado; opcionalmente admite `MIDAS_RESEARCH_SHEET_ID`. El identificador real no entra en Git.
- `GET /api/midas` entrega `research.theses` y `research.cagr2031` además del dashboard público de estrategias.
- La interfaz MIDAS muestra **Tesis y CAGR 2031** con todas las ideas registradas, escenarios bear/base/bull, última fecha de estudio y estado.
- Regla canónica: toda tesis nueva debe tener una fila en `TESIS` y otra en `CAGR2031`. Si todavía no se ha calculado un CAGR exacto a 2031, queda explícitamente pendiente; no se extrapola un CAGR de otro horizonte.
- Los estudios históricos conservan su horizonte original y sus CAGR originales para no perder contexto.
- La tabla es watchlist/memoria de investigación, no señal automática de compra. Antes de usar una tesis se actualizan precio, filings/resultados, valoración y riesgos.
- Assets frontend: `v0.39.1`.


## Salud · citas médicas iCloud en directo v0.39.2

- Corregido el desacople entre **Agenda** y **Salud → Médicos**.
- Antes, Médicos calculaba las próximas citas desde el snapshot cliente `state.events`; podía mostrar 0 aunque el calendario semanal ya tuviera eventos médicos.
- Añadido `GET /api/health/appointments`, que consulta la integración CalDAV/iCloud privada y filtra citas médicas por título/ubicación.
- Al abrir Salud, la pestaña Médicos carga ese endpoint de forma independiente.
- Si iCloud falla temporalmente, la UI cae a la copia local de Agenda y lo indica explícitamente en vez de mostrar un 0 engañoso.
- La cita de Dermatología visible en Agenda debe volver a aparecer en Médicos tras el despliegue.
- Asset JS: `v0.39.2`.


## Salud · citas médicas iCloud + Agenda v0.39.3

- Corregido un fallo introducido al separar `Salud → Médicos` en una consulta directa a iCloud.
- Problema: si `/api/health/appointments` respondía correctamente pero con `0` citas, la UI reemplazaba por vacío las citas médicas que ya estaban cargadas en `state.events` y visibles en Agenda.
- Nuevo comportamiento:
  - Salud renderiza inmediatamente las citas médicas ya presentes en Agenda;
  - lanza después el refresco directo de iCloud/CalDAV;
  - fusiona ambos conjuntos por `id` (o por título+fecha como fallback);
  - una respuesta transitoria vacía de CalDAV nunca borra una cita ya cargada;
  - si el refresco falla, se mantiene la copia de Agenda y se indica explícitamente.
- Esto preserva una sola fuente real (iCloud); Agenda actúa como copia ya cargada del mismo origen, no como fuente paralela.
- Asset JS: `v0.39.3`.


## Eventos · clasificación coherente de planes concretos v0.39.4

- Corregida la divergencia entre la clasificación de eventos en backend y en Home.
- `Puy du Fou` ya era reconocido por el backend de Eventos, pero la función de Home `inferImportantKind()` no lo reconocía y descartaba el evento si no existía una regla explícita.
- Home ahora alinea la inferencia de viajes con backend e incluye `puy du fou`, `hotel` y `airbnb`.
- Se amplían además planes sociales concretos con palabras como concierto, teatro, festival, espectáculo y parque temático.
- Se mantiene la regla existente de cumpleaños: un cumpleaños-recordatorio no aparece en Eventos salvo que el propio evento contenga un plan concreto.
- Se ha añadido también una regla canónica `puy-du-fou` en `EventosImportantes` de la hoja financiera privada para que el evento actual no dependa únicamente de heurísticas.
- Asset JS: `v0.39.4`.


## Salud · endurecimiento de calendarios médicos v0.39.5

- `Salud → Médicos` vuelve a consultar las citas cada vez que se abre la pestaña, evitando quedarse con un resultado antiguo.
- La detección médica usa `title`, `location`, `locationRef` y `calendarName`; `locationRef` es el campo real que entrega la integración iCloud actual.
- La nota de fuente muestra cuántos calendarios configurados han sido realmente encontrados y enumera los nombres no encontrados cuando existan.
- Se mantiene la regla de v0.39.3: una respuesta CalDAV vacía nunca borra citas médicas que ya estén visibles en Agenda.
- Asset JS: `v0.39.5`.

## Apple Reminders · activación real y cierre por eliminación

- Activación real completada el 2026-09-29 con permiso EventKit, lista exacta `Lista De La Compra`, backend, Sheet y agente `launchd` operativos.
- Primera reconciliación: 1 elemento Apple → Segundo Cerebro; verificación posterior: 1 coincidencia, 0 elementos sueltos y 0 conflictos.
- Se verificó un ciclo autónomo del agente con 1 coincidencia, 0 conflictos, 0 acciones pendientes y 0 fallos definitivos.
- Si una fila previamente enlazada se elimina físicamente de `ListaCompra`, ya no se reconstruye desde Apple: se encola una acción idempotente para completar el recordatorio y retirarlo de la lista activa.
- La regla no afecta recordatorios manuales que nunca hayan estado enlazados con Segundo Cerebro.

Assets actuales: `styles.css?v=0.39.1`, `app.js?v=0.39.5`, `pantry.js?v=0.38.7`.
