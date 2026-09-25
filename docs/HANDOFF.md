# Handoff — Segundo Cerebro

## Última actualización

- **Fecha:** 2026-09-24
- **Herramienta:** ChatGPT normal
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

### Apple Health

- Salud dispone de una pestaña privada derivada `HistoricoResumen`: al consultar `/api/health/history`, el Worker vuelca únicamente agregados por rango (30/90/180/365/all) desde D1. Permite que GESTOR GYM Y NUTRI analice el histórico mediante el Sheet autorizado sin exponer ni duplicar las muestras crudas; D1 sigue siendo la fuente canónica.

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
- `EnergiaDiaria` conserva el fallback manual y se amplió con pasos, minutos de ejercicio, entrenamientos y metadatos de muestreo;
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
