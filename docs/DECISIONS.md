# Decisiones arquitectónicas

Este documento registra decisiones duraderas. El detalle histórico adicional permanece en Git.

## D-001 — Estado global compartido

- **Estado:** aceptada
- **Fecha:** 2026-09-22
- **Decisión:** todos los módulos consultan un estado común coordinado y no crean memorias independientes.
- **Motivo:** preservar coherencia entre áreas.

## D-002 — Fuentes externas propietarias

- **Estado:** aceptada
- **Fecha:** 2026-09-22
- **Decisión:** cada fuente externa conserva la autoridad de sus datos salvo decisión explícita en contrario.
- **Motivo:** minimizar duplicación y divergencia.

## D-003 — Git sin datos reales ni secretos

- **Estado:** aceptada
- **Fecha:** 2026-09-22
- **Decisión:** Git contiene únicamente código, documentación técnica, licencias y mocks inequívocos.
- **Motivo:** el repositorio no es un almacén de información personal.

## D-004 — v0.1 estática y sin framework

- **Estado:** aceptada como decisión histórica
- **Fecha:** 2026-09-22
- **Decisión:** validar inicialmente el dashboard con HTML, CSS y JavaScript nativos.
- **Situación actual:** se mantiene el frontend nativo, pero la aplicación privada ya dispone de backend e integraciones.
- **Motivo:** conservar una base pequeña y auditable.

## D-005 — Responsive y evolución a PWA

- **Estado:** aceptada
- **Fecha:** 2026-09-22
- **Decisión:** diseñar para Mac, iPhone e iPad y mantener compatibilidad conceptual con una futura PWA.

## D-006 — Árbol operativo como transparencia

- **Estado:** aceptada
- **Fecha:** 2026-09-22
- **Decisión:** la vista Sistema explica Coordinador, estado común, módulos, capacidades y fuentes; no representa memorias autónomas.

## D-007 — Demo pública en GitHub Pages

- **Estado:** aceptada
- **Fecha:** 2026-09-22
- **Decisión:** GitHub Pages publica exclusivamente una demo estática con mocks.
- **Motivo:** validar interfaz sin exponer información personal.

## D-008 — Superposición privada local

- **Estado:** aceptada como mecanismo auxiliar histórico
- **Fecha:** 2026-09-22
- **Decisión:** permitir pruebas locales mediante `.private/`, siempre fuera de Git.
- **Situación actual:** la aplicación privada remota sustituye a esta capa como vía principal de uso.

## D-009 — Relevo entre ChatGPT normal y Work/Codex

- **Estado:** aceptada
- **Fecha:** 2026-09-22
- **Decisión:** `docs/HANDOFF.md` describe el presente; el historial de chats no es la memoria canónica.
- **Motivo:** permitir relevos sin reconstrucción manual del proyecto.

## D-010 — Cloudflare Worker + Access + D1

- **Estado:** aceptada y operativa
- **Fecha:** 2026-09-22
- **Decisión:** la aplicación privada usa Cloudflare Worker protegido por Access y D1 como persistencia privada cuando corresponde.
- **Evolución:** el diseño comenzó como lectura y posteriormente adoptó escritura selectiva por dominio.

## D-011 — Gestor financiero como intermediario

- **Estado:** aceptada
- **Fecha:** 2026-09-22
- **Decisión:** la fuente financiera externa continúa siendo oficial; una hoja privada derivada normaliza el estado para el dashboard.
- **Conciliación:** distinguir `PROVISIONAL_CHAT`, `RECONCILIADO_SHEET` y valores derivados.
- **Motivo:** evitar contabilidad paralela.

## D-012 — Separación entre flujo mensual e inversiones

- **Estado:** aceptada
- **Fecha:** 2026-09-23
- **Decisión:** Finance separa gestión mensual del dinero e inversiones/ahorro, aunque ambos compartan estado global.
- **Motivo:** no mezclar liquidez operativa con patrimonio invertido.

## D-013 — iCloud Calendar mediante CalDAV de solo lectura

- **Estado:** aceptada y operativa
- **Fecha:** 2026-09-23
- **Decisión:** el calendario privado se consulta mediante CalDAV y no implementa operaciones de escritura.
- **Motivo:** la web necesita contexto de agenda, no sustituir a la aplicación Calendario.

## D-014 — HabitQuest conserva su Sheet como fuente de verdad

- **Estado:** aceptada y operativa
- **Fecha:** 2026-09-23
- **Decisión:** Segundo Cerebro integra HabitQuest de forma nativa pero no duplica su histórico como una nueva fuente. Las mutaciones se escriben en el Sheet original y respetan su reconciliación.
- **Motivo:** evitar dos aplicaciones divergentes sobre los mismos hábitos.

## D-015 — Salud como dominio compartido con persistencias explícitas

- **Estado:** aceptada y operativa
- **Fecha:** 2026-09-23
- **Decisión:** Salud agrupa Médicos, Gimnasio y Nutrición. Médicos deriva de iCloud; el plan y la base nutricional viven en fuentes privadas; las sesiones de gimnasio y la energía automática pueden persistirse en D1.
- **Motivo:** integrar actividad, alimentación y contexto médico sin forzar una única fuente de datos.

## D-016 — Escritura privada selectiva, no global

- **Estado:** aceptada
- **Fecha:** 2026-09-23
- **Decisión:** la aplicación privada puede escribir únicamente en dominios con fuente de verdad y semántica bien definidas. La existencia de endpoints de escritura no convierte todas las integraciones en bidireccionales.
- **Motivo:** mantener mínimo privilegio y reconciliación fiable.

## D-017 — Apple Health entra mediante un Worker de ingesta dedicado

- **Estado:** aceptada y operativa
- **Fecha:** 2026-09-23
- **Decisión:** Apple Health no se consulta desde la web. Un Atajo del iPhone enviará únicamente energía activa/reposo/total a un Worker dedicado protegido por token, que reenvía internamente al Worker principal y persiste en D1.
- **Motivo:** Apple Health es local al dispositivo y el sistema solo necesita un resumen energético minimizado.


## D-018 — Una única muestra energética por fecha

- **Estado:** aceptada y operativa
- **Fecha:** 2026-09-23
- **Decisión:** `health_energy_daily` conserva una única fila por `energy_date`. Las sincronizaciones repetidas del mismo día actualizan esa fila mediante UPSERT.
- **Migración:** al inicializar la tabla se conservan únicamente las filas históricas más recientes de cada fecha antes de crear el índice único.
- **Motivo:** Apple Health entrega un acumulado diario; conservar múltiples snapshots intermedios no aporta valor operativo y genera redundancia.

## D-019 — Segundo Cerebro absorbe la experiencia operativa de HabitQuest

- **Estado:** aceptada; implementación inicial completada, validación de dispositivos pendiente
- **Fecha:** 2026-09-23
- **Decisión:** Segundo Cerebro replica las capacidades útiles de HabitQuest sobre el mismo Google Sheet: gestión, vistas lista/compacta, ordenación, progreso, estadísticas, logros y feedback de gamificación.
- **Límite:** no se duplican login/sync manual de Google, onboarding, tema independiente, perfil ni XLSX porque son infraestructura de la app separada, no del dominio Hábitos.
- **Streak freezes:** no se exponen todavía porque la app original no tiene una regla de consumo/concesión suficientemente formalizada en la lógica compartida.
- **Motivo:** converger hacia un único Segundo Cerebro sin crear otra fuente de verdad ni mantener dos experiencias funcionales divergentes.


## D-020 — Deploy automático de la app privada

- **Estado:** aceptada y operativa; despliegue real validado end-to-end
- **Fecha:** 2026-09-23
- **Decisión:** los cambios relevantes en `main` deben validar, construir y desplegar automáticamente el Worker privado mediante GitHub Actions.
- **Secretos requeridos:** `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.
- **Seguridad:** los secretos solo viven en GitHub Actions/Cloudflare; nunca se versionan ni se comparten por chat.
- **Motivo:** eliminar el ciclo manual `git pull` + `npm run deploy` y convertir GitHub en la interfaz canónica de entrega.


## D-021 — Sistema visual oscuro azul noche + naranja

- **Estado:** aceptada e implementada
- **Fecha:** 2026-09-24
- **Decisión:** el modo oscuro adopta una paleta restringida azul noche + azul eléctrico + naranja, con una sola familia tipográfica sans para toda la jerarquía.
- **Paleta:** fondo `#07101D`, superficie `#0B1728`, superficie secundaria `#10213A`, azul `#2F6BFF / #5FA8FF`, naranja `#FF7A1A / #FFB347`, texto `#F8FAFC`, muted `#A8B3C7`, borde `#1E3350`.
- **Regla de uso:** azul = navegación/acción/estructura; naranja = énfasis/progreso/estado destacado; otros colores quedan limitados a semántica funcional excepcional.
- **Motivo:** eliminar la apariencia multicolor y la mezcla tipográfica del tema oscuro anterior y reforzar una identidad visual propia.


## D-022 — Portada sin titular gigante ni Pulso general

- **Estado:** aceptada e implementada
- **Fecha:** 2026-09-24
- **Decisión:** mantener la barra superior con saludo/fecha y control de tema; eliminar de ella el badge de estado privado y el avatar `SC`, además del gran titular de portada y del indicador circular `Pulso general`.
- **Motivo:** reducir ruido visual, evitar una métrica agregada poco interpretable y hacer que el contenido operativo gane jerarquía.
- **Consecuencia:** el estado de cada dominio se consulta en sus propios módulos y no mediante una puntuación global.

## D-023 — Portada uniforme con resumen diario de hábitos y nutrición

- **Estado:** aceptada e implementada
- **Fecha:** 2026-09-24
- **Decisión:** las tarjetas principales de portada comparten superficie, borde, radio y sombra; el color se reserva a acentos y estados.
- **Primer nivel operativo:** dos tarjetas preceden al resto de resúmenes: Hábitos muestra completados/total y abre HabitQuest; Nutrición muestra kcal consumidas, gasto total y objetivo diario y abre directamente Salud → Nutrición.
- **Datos:** Hábitos deriva del resumen de HabitQuest; Nutrición consulta el endpoint privado del día actual. Si el objetivo no está definido se muestra `Pendiente`, sin inferir una cifra.
- **Motivo:** priorizar información diaria accionable y eliminar el mosaico de tarjetas con fondos de colores distintos.


## D-024 — Epígrafes naranjas y tipografía única en portada

- **Estado:** aceptada e implementada
- **Fecha:** 2026-09-24
- **Decisión:** los epígrafes/categorías de las tarjetas principales usan naranja en modo oscuro; títulos e importes comparten la misma familia sans.
- **Motivo:** reforzar la jerarquía visual azul noche + naranja y eliminar la mezcla de serif/sans entre Dinero, Deudas, Patrimonio, Hábitos y Nutrición.


## D-025 — Un único puente Apple Health para actividad y composición

- **Estado:** aceptada; backend implementado, auditoría de fuentes del iPhone pendiente
- **Fecha:** 2026-09-24
- **Decisión:** ampliar el Worker existente `segundo-cerebro-health-ingest` y no crear una segunda integración HealthKit.
- **Endpoint:** `/v1/sync` recibe actividad diaria y muestras corporales; `/v1/energy` se mantiene por compatibilidad.
- **Persistencia automática:** D1 privado. Actividad usa UPSERT por fecha; cuerpo usa clave lógica tipo + timestamp original + fuente.
- **Sheet privado:** `EnergiaDiaria` y `MedicionesCorporales` permanecen como baseline/manual/fallback y se amplían para soportar los nuevos campos sin duplicar el histórico.
- **Tendencias:** peso = media móvil de 7 días y cambio frente a los 7 anteriores; grasa/IMC/masa magra de bioimpedancia doméstica se tratan como tendencia.
- **Nutrición:** las kcal del Apple Watch son informativas; no se ajusta ingesta 1:1. El gestor debe evaluar 7–14 días junto con peso, adherencia y entrenamiento.
- **Fuente corporal:** no se asume que Zepp/Zepp Life escriba todas las métricas. Antes de configurar el Atajo se verifica cada tipo en Apple Salud → Fuentes de datos y acceso.


## D-026 — Gestor Padres usa D1 privado como estado operativo

- **Estado:** aceptada e implementada
- **Fecha:** 2026-09-24
- **Decisión:** Gestor Padres persiste casos, acciones y referencias mínimas en D1 privado y se instancia únicamente en la aplicación `private-remote`.
- **Fuentes externas:** Calendario, Finanzas, LITOS, email y repositorios documentales conservan la autoridad de sus datos; D1 guarda solo el estado operativo y referencias necesarias.
- **Privacidad:** el dominio se trata por defecto como `muy_confidencial`; la home general recibe únicamente un resumen minimizado de atención.
- **Motivo:** permitir seguimiento transversal de asuntos familiares sin duplicar fuentes de verdad ni exponer datos reales en GitHub Pages.


## D-027 — OBJETOS conserva una única fuente canónica privada

- **Estado:** aceptada e implementada; fuente canónica creada y conectada.
- **Fecha:** 2026-09-24
- **Decisión:** el inventario personal, armario, looks, kits y listas contextuales pertenecerán a `SEGUNDO CEREBRO - OBJETOS`, mantenido funcionalmente por GESTOR OBJETOS Y ARMARIO.
- **Integración:** otros gestores referencian `objeto_id`, `look_id`, `kit_id` o `lista_id`; no copian inventario.
- **Degradación:** si la fuente deja de resolverse, la aplicación muestra `source-pending` y no crea D1 ni otra hoja como sustituto.
- **Motivo:** evitar divergencias entre equipaje, armario, eventos, hogar y futuros agentes.


## D-028 — La barra lateral es la navegación canónica

- **Estado:** aceptada e implementada.
- **Fecha:** 2026-09-24
- **Decisión:** eliminar de Home la parrilla duplicada `Áreas de tu vida` y la vista técnica `Sistema`. La barra lateral es el único índice de dominios.
- **Metacapas:** `Open Loops` y `Objetivos` dejan de presentarse como áreas. Los pendientes se integran en `Próximos movimientos`; los objetivos se muestran en el dominio al que pertenecen y los transversales junto al foco operativo.
- **Métricas:** se dejan de exponer puntuaciones 0–100 de área sin una semántica común. Las métricas reales permanecen dentro de cada módulo.
- **Navegación:** Finanzas abre presupuesto, Agenda desplaza a la semana real y los dominios especializados abren sus vistas propias.
- **Motivo:** evitar duplicidad de navegación, huecos visuales, tarjetas que no aportan acción y puntuaciones engañosamente comparables.


## D-029 — PROYECTOS usa un registro privado canónico

- **Estado:** aceptada e implementada.
- **Fecha:** 2026-09-24.
- **Decisión:** el catálogo transversal de proyectos vive en el Sheet privado `SEGUNDO CEREBRO - PROYECTOS`.
- **Contenido:** identidad, estado, resumen, propietario funcional, enlaces, documentación estructurada, siguiente acción y relaciones.
- **Privacidad:** el catálogo real no se hardcodea en el repositorio público.
- **Propiedad:** el registro indexa proyectos; no sustituye el repositorio/documentación propietaria de cada uno.
- **Solo seguimiento:** un proyecto puede marcarse `read_only` para impedir que Segundo Cerebro lo trate como modificable desde este dominio.
- **Motivo:** disponer de una vista completa y reutilizable por gestores sin depender de memoria conversacional ni crear listas divergentes.


## D-030 — Adherencia es una proyección derivada con override manual

- **Estado:** aceptada e implementada.
- **Fecha:** 2026-09-25.
- **Decisión:** la adherencia mensual de Salud se calcula al leer las fuentes canónicas; no se crea un histórico calculado paralelo.
- **Fuentes:** Nutrición/Objetivos, Apple Health/D1, gym D1, HabitQuest y planificación explícita.
- **Override:** `AdherenciaManual` permite que una declaración explícita del usuario prevalezca sobre la heurística.
- **Datos insuficientes:** se representan como `SIN_DATOS` y no penalizan el porcentaje.
- **Gym:** no se considera incumplimiento diario si no existía entrenamiento programado explícitamente.
- **Motivo:** distinguir falta real de adherencia de falta de registro y evitar una métrica binaria/agresiva.


## D-031 — El anillo de progreso es un componente transversal

- **Estado:** aceptada e implementada.
- **Fecha:** 2026-09-25.
- **Decisión:** usar un único componente visual de anillo para representar progreso compacto hacia objetivos cuantificables.
- **Ámbitos iniciales:** Hábitos, Nutrición, resumen de Salud/Actividad/Fuerza y adherencia mensual.
- **Regla semántica:** el anillo solo se usa cuando existe una relación interpretable `valor actual / objetivo` o un porcentaje de cumplimiento. No se usa para simples cantidades, saldos o métricas donde “más” no significa “mejor”.
- **Privacidad:** en modo demo el progreso circular se neutraliza además de ocultar las cifras, para no filtrar valores aproximados visualmente.
- **Paridad:** light/dark y desktop/móvil comparten exactamente el mismo componente.


## D-032 — Las decisiones no tienen bloque independiente en Home

- **Estado:** aceptada e implementada.
- **Fecha:** 2026-09-25.
- **Decisión:** `DECISION` sigue siendo una entidad transversal, pero no dispone de un bloque aislado bajo el calendario.
- **Presentación:** cada decisión abierta se muestra dentro de su área propietaria; Proyectos puede recibir las decisiones de su área en su workspace privado.
- **Próximos movimientos:** una decisión solo se eleva allí cuando tiene `nextAction` o una fecha de vencimiento.
- **No duplicación:** una decisión sin acción concreta no se convierte artificialmente en tarea.
- **Motivo:** el antiguo bloque mezclaba cuestiones técnicas, profesionales y de proyectos sin contexto ni capacidad operativa, ocupando espacio de Home sin aportar una acción clara.


## D-032 — CEREBRO GLOBAL será la interfaz principal

- **Estado:** aceptada como arquitectura objetivo.
- **Fecha:** 2026-09-25.
- **Decisión:** el usuario debe poder interactuar con un único Cerebro Global sin tener que elegir manualmente entre conversaciones especializadas.
- **Gestores:** Finanzas, Eventos, Salud, Hábitos, Despensa, Objetos, Padres, Proyectos y futuros módulos pasan a considerarse especialistas internos coordinados.
- **Propiedad:** cada gestor conserva su fuente canónica y reglas de escritura.
- **Continuidad:** una conversación nueva debe reconstruir contexto desde Git + fuentes privadas, no desde un transcript histórico largo.
- **Transición:** las conversaciones especializadas se mantienen temporalmente como consolas de mantenimiento y fallback hasta que el Coordinador cubra sus operaciones principales.
- **Roadmap:** `docs/EVOLUTION_GLOBAL_BRAIN.md`.


## D-033 — Eventos conserva identidad y crónica mínima en D1

- **Estado:** aceptada e implementada.
- **Fecha:** 2026-09-26.
- **Decisión:** iCloud conserva la autoridad sobre fecha/horario; D1 conserva la identidad del evento, su ciclo de vida, referencias y una crónica mínima para disponer de histórico permanente.
- **No duplicación:** Finanzas, Salud/Nutrición, OBJETOS, email, reservas y documentos siguen siendo fuentes propietarias. La ficha de evento los compone bajo demanda.
- **Cierre:** `EN_CURSO` y `CERRADO` se derivan de `starts_at/ends_at`; no se requiere cron.
- **Home:** solo muestra eventos activos. `CERRADO` y `CANCELADO` se consultan desde Eventos → Histórico.
- **Alcance:** los compromisos puramente financieros no se convierten en eventos por el hecho de tener una fecha.
- **Motivo:** conservar memoria útil de viajes y celebraciones sin depender indefinidamente del calendario ni crear una segunda contabilidad.


## D-034 — HealthKit nativo sustituye al Atajo como colector principal

- **Estado:** aceptada; código y backend implementados, validación física del iPhone pendiente.
- **Fecha:** 2026-09-28.
- **Decisión:** mantener una única canalización Apple Health pero sustituir el Atajo como colector principal por `SegundoCerebroHealthBridge`, una app iOS nativa Swift/HealthKit.
- **Continuidad:** se conserva el mismo Worker `segundo-cerebro-health-ingest`, el mismo `HEALTH_INGEST_TOKEN`, el mismo `/v1/sync` y las tablas D1 existentes. El Atajo queda como fallback de transición.
- **Ampliación:** además de actividad y composición, el contrato admite señales diarias de recuperación/sueño en `health_recovery_daily`.
- **Automatización:** HealthKit Observer Query + Background Delivery son el mecanismo principal; BGAppRefresh aporta reconciliación best-effort. No se promete una hora exacta porque iOS controla la ejecución.
- **Seguridad:** el token se guarda en Keychain del iPhone. La app solicita solo lectura de HealthKit y Git nunca contiene datos reales ni secretos.
- **Despliegue:** el Worker de ingesta pasa a desplegarse automáticamente junto con el Worker privado cuando cambian sus fuentes.
- **Criterio de retirada del Atajo:** no deshabilitarlo hasta validar una sincronización nativa real, una posterior actualización automática y una vía de firma sostenible.
- **Provisioning:** un Xcode Personal Team gratuito sirve para validar el bridge, pero sus perfiles expiran a los 7 días; no se considera una sustitución operativa permanente mientras esa sea la única firma disponible.
- **Motivo:** eliminar la lógica frágil y difícil de mantener de Atajos, permitir pruebas/CI, ampliar señales y reducir la intervención manual sin introducir una reinstalación semanal como dependencia permanente.

## D-035 — MIDAS se consulta como laboratorio demo separado

- **Estado:** implementada; la excepción del genético privado fue ampliada por D-036.
- **Fecha:** 2026-09-28.
- **Decisión:** la aplicación privada muestra una tabla diaria de todas las líneas MIDAS desde el `dashboard.json` público generado por los workflows existentes. El Worker lo valida y sirve sin credenciales GitHub. El genético sigue la excepción privada de D-036.
- **Límite:** las carteras son ficticias y no forman parte del patrimonio personal; las ideas sin diario conservan estado sin rentabilidad. El genético histórico se muestra sin cifras hasta que su extracto privado quede enlazado y verificado.
- **Coste:** se reutilizan los dos workflows de mercado; no se crea una Action diaria adicional.

## D-036 — El genético original se enlaza mediante un resumen privado firmado

- **Estado:** implementado en código; verificar primer envío remoto y lectura en el panel.
- **Fecha:** 2026-09-28.
- **Decisión:** el workflow existente del repositorio privado envía únicamente su curva de patrimonio ficticio a un Worker de ingesta. La autenticación usa GitHub OIDC con firma y restricciones de repositorio, rama, workflow y audiencia. El resumen permanece en D1 privado; la tabla calcula desde él último día y acumulado.
- **Límite:** el diario original contabiliza operaciones al cierre tras observar ese cierre. Su +/− histórico es un registro de simulación, no rentabilidad ejecutable ni evidencia de superioridad. Un motor causal corregido necesita una serie prospectiva distinta, sin reescribir la antigua.
- **Coste:** no se crea workflow periódico adicional ni credencial GitHub persistente; el envío es un paso del workflow existente.

## D-037 — Diario mercados pasa a Patrimonio

- **Estado:** aceptada e implementada.
- **Fecha:** 2026-09-28.
- **Decisión:** el registro nocturno de valor de cartera, variación diaria y P/L deja de ser un hábito de HabitQuest y pasa a ser un subapartado de Finanzas → Patrimonio.
- **Fuente privada:** `PatrimonioDiario` conserva cierres diarios y trazabilidad. Las capturas de Delta comunicadas por el usuario alimentan esta tabla privada derivada.
- **Migración:** el histórico de `DIARIO MERCADOS` se consume en lectura y se migra sin modificar el maestro. Los valores que el histórico no contenía permanecen desconocidos; no se estiman retroactivamente.
- **Separación:** `PatrimonioDetalle` sigue describiendo la distribución patrimonial actual y `Patrimonio` el histórico mensual. El diario aporta granularidad diaria, no otra fuente de verdad paralela.
- **Hábitos:** `Diario mercados` queda archivado en HabitQuest para que deje de afectar adherencia y recordatorios de hábitos.


## D-038 — Toda tesis MIDAS conserva CAGR a 2031

- **Estado:** aceptada e implementada.
- **Fecha:** 2026-09-28.
- **Decisión:** cada análisis de empresa solicitado para MIDAS se registra en la fuente privada `MIDAS - TESIS Y WATCHLIST`.
- **Estructura:** `TESIS` conserva la tesis cualitativa y `CAGR2031` normaliza escenarios bear/base/bull con objetivo 2031.
- **Integridad:** si un estudio previo usó 2030 u otro horizonte, sus cifras se conservan como históricas pero las columnas 2031 permanecen pendientes hasta recalcular; no se extrapolan de forma automática.
- **UI:** Segundo Cerebro → MIDAS consume esta fuente en vivo y muestra la tabla junto al diario de estrategias.
- **Uso:** la watchlist sirve para recuperar ideas cuando exista liquidez; exige refresco de datos antes de una decisión de inversión.


## D-039 — Apple Reminders es la interfaz compartida de ListaCompra

- **Estado:** implementada, desplegada y activa.
- **Fecha:** 2026-09-28.
- **Decisión:** usar un agente macOS Swift/EventKit para mantener una relación 1:1 entre la lista compartida de Apple y `SEGUNDO CEREBRO - DESPENSA / ListaCompra`.
- **Fuente enriquecida:** el Sheet conserva producto, precio, cantidad y motivo. Apple conserva el título y el estado cotidiano compartido.
- **Persistencia auxiliar:** D1 guarda enlaces, cola idempotente y auditoría; no crea una segunda lista canónica.
- **Seguridad:** token dedicado en Cloudflare Secrets + Keychain; sin OAuth Google en el Mac y sin IDs privados en Git.
- **Conflictos:** timestamps de ambos lados, detección de cambios concurrentes y rechazo de escrituras EventKit contra una versión inesperada.
- **Cancelación:** una desaparición activa en Apple pasa a `CANCELADO`; desde Segundo Cerebro, tanto `CANCELADO`/`COMPRADO` como la eliminación física de una fila previamente enlazada completan el recordatorio. No se borra destructivamente ni se toca un recordatorio manual nunca enlazado.
- **Disponibilidad:** eventos EventKit + fallback de 90 segundos mientras el Mac está encendido y con sesión iniciada.


## D-040 — Calendario usa last-known-good derivado para tolerar fallos de CalDAV

- **Estado:** aceptada e implementada.
- **Fecha:** 2026-09-29.
- **Autoridad:** iCloud continúa siendo la única fuente de verdad de fechas y horarios; D1 no adquiere autoridad sobre el calendario.
- **Decisión:** una lectura CalDAV completa y no vacía actualiza una copia derivada `last-known-good` en D1. Timeouts, respuestas vacías sospechosas o descubrimientos parciales nunca sustituyen esa copia.
- **Degradación:** si falta un calendario configurado, se usan eventos frescos de los calendarios encontrados y se conservan temporalmente los últimos eventos conocidos del calendario ausente. Si la lectura completa devuelve cero eventos pero existe una copia no vacía, se mantiene la copia anterior.
- **Matching:** los nombres de calendario se comparan primero de forma exacta y después normalizados por mayúsculas, acentos y espacios; una coincidencia normalizada ambigua no se acepta.
- **Arranque:** si D1 todavía no contiene copia estable, puede sembrarse desde eventos iCloud ya presentes en el snapshot privado del Segundo Cerebro hasta conseguir la siguiente lectura válida.
- **UI:** Agenda informa si está mostrando datos en directo, sincronización parcial o copia estable.
- **Motivo:** una dependencia de red de Apple no debe hacer desaparecer visualmente bodas, citas o agenda ya conocidas.


## MIDAS: animación derivada, no fuente de verdad

- **Fecha:** 2026-09-29.
- **Decisión:** las animaciones de algoritmos en Segundo Cerebro son una proyección visual de diarios/curvas de patrimonio ficticio existentes. No crean puntos, no interpolan resultados y no constituyen una fuente de verdad adicional.
- **Fuente:** paper público de `midas-paper-lab` y, para el genético original, el resumen privado saneado en D1.
- **Bootstrap:** una prueba retrospectiva puede mostrarse solo si está etiquetada explícitamente como no prospectiva y queda fuera del track record forward.
- **Privacidad:** ninguna posición patrimonial real ni dato de broker entra en esta visualización.


## D-041 — Armario visual conserva OBJETOS como única fuente de verdad

- **Estado:** aceptada e implementada en contrato/UI; procesado automático de imágenes pendiente.
- **Fecha:** 2026-09-30.
- **Decisión:** ampliar `Armario` dentro de `SEGUNDO CEREBRO - OBJETOS` con referencias a foto original/procesada/miniatura y metadatos visuales, sin crear un catálogo de prendas paralelo.
- **Derivados:** las imágenes procesadas son representaciones del mismo `objeto_id`; pueden regenerarse y no tienen identidad propia.
- **Combinador:** el constructor visual solo selecciona prendas ya existentes y guarda el resultado en `Looks + LookItems`; nunca crea objetos implícitos.
- **Validación:** un look nuevo debe contener `superior + inferior + calzado`; `exterior` y `accesorio` son opcionales. Roles duplicados, objetos inexistentes o retirados se rechazan.
- **Procesado:** el pipeline automático de fondo/centrado no forma parte aún de la arquitectura operativa. El sistema soporta el estado `pendiente | procesada | revisar` y el almacenamiento de ambas URLs para incorporarlo después.
- **Motivo:** habilitar armario visual, outfits y futuras recomendaciones de oficina/viaje/clima sin romper IDs, historial ni propiedad funcional del dominio.


## D-042 — Assets visuales de Armario usan D1 privado con coste operativo cero

- **Estado:** aceptada e implementada; sustituye la variante inicial basada en R2.
- **Fecha:** 2026-09-30.
- **Decisión:** almacenar original, procesada y miniatura en el D1 privado ya existente mediante tablas técnicas de assets/chunks, manteniendo `SEGUNDO CEREBRO - OBJETOS / Armario` como única fuente canónica de identidad, pertenencia, estado y referencia visual activa.
- **Motivo:** R2 exige activar una suscripción pay-as-you-go. La regla operativa del sistema es no introducir servicios con posibilidad de cobro cuando existe una alternativa ya provisionada y suficiente.
- **Contrato:** se mantienen las rutas versionadas `/api/objects/:objeto_id/image/:tipo?v=<version>`; el cambio de almacenamiento no altera OBJETOS v0.3 ni obliga a la UI a conocer D1.
- **Escritura:** `POST /api/objects/:objeto_id/image` conserva validación de objeto, MIME/firma, tamaño, overwrite, miniatura WebP y compensación si falla Sheets.
- **Server-to-server:** `segundo-cerebro-objects-ingest` usa Service Binding al Worker principal para evitar la pantalla de Cloudflare Access; el Bearer upstream continúa verificándose dentro del Worker principal mediante hash SHA-256.
- **Límites:** máximo funcional de 8 MiB por archivo y salvaguarda interna de 200 MiB para el almacén visual D1.
- **No duplicación:** D1 guarda bytes y metadatos técnicos de almacenamiento, no un catálogo de prendas. El Sheet sigue siendo la autoridad de `objeto_id` y referencias activas.
- **Prohibición vigente:** no activar R2 ni migrar a almacenamiento de pago sin una nueva decisión explícita.

## Histórico supersedido — staging efímero de imágenes ChatGPT

- **Estado:** supersedido por la ruta server-to-server documentada en D-042 y `docs/OBJECTS_IMAGE_INGEST.md`.
- **Fecha original:** 2026-09-30.
- **Qué se probó:** `Drive staging → ImageIngestQueue → cron` como transporte temporal desde ChatGPT.
- **Resultado:** el mecanismo produjo errores `OBJECTS_STAGING_META_403` y dejó de ser el camino operativo normal.
- **Ruta vigente:** `objects-chatgpt-bridge → segundo-cerebro-objects-ingest → Service Binding → uploadObjectsImage → D1 + Armario`.
- **Fallback vigente para conversaciones sin POST directo:** `objects-chatgpt-bridge/seed.mjs` + `OBJECTS_SEED_JOBS`, usando Drive solo para materializar una referencia temporal y limpiándolo después.
- **No duplicación:** `ImageIngestQueue` no debe reintentarse ni usarse para crear nuevas filas cuando la ingesta ya se completó por el bridge.
- **Almacenamiento final:** D1 privado. R2 no forma parte de la arquitectura actual.


## Delta histórico: conservar bruto, analizar derivado

- **Fecha:** 2026-10-01.
- **Decisión:** conservar el export bruto de Delta en almacenamiento privado y mostrar en Segundo Cerebro una vista derivada de operativa histórica.
- Los ajustes de sincronización no se borran: se marcan y quedan fuera de métricas de trading.
- Delta sigue siendo agregador auxiliar; las plataformas/brokers siguen siendo fuente primaria de valor actual.
- No calcular ni presentar rentabilidad histórica total desde este CSV sin una reconstrucción específica de coste, corporate actions, divisas y flujos externos.
## D-043 — MenuSemanal separa contenido de presentación

- **Estado:** aceptada.
- **Fecha:** 2026-10-01.
- **Decisión:** el contenido real del menú semanal vive exclusivamente en el Sheet privado `SEGUNDO CEREBRO - SALUD / MenuSemanal`. El frontend y el Worker son una capa estable y genérica de lectura, reconciliación y presentación.
- **Mutaciones operativas:** mover una comida de día, cambiar plato/ingrediente/ración, marcar planificado/consumido/omitido o ajustar macros se resuelve en el Sheet; no requiere modificar código.
- **Código:** solo se cambia para defectos genéricos de contrato, reconciliación o renderizado que afecten a cualquier menú, nunca para acomodar una comida o fecha concreta.
- **Privacidad:** ningún menú real, nombre de plato doméstico, fecha o cantidad personal se hardcodea o versiona en Git.
- **Motivo:** evitar regresiones visuales por cambios cotidianos del plan y mantener una sola fuente canónica de estado nutricional.
## D-044 — Las pausas temporales de fuerza son estado de objetivos, no incumplimiento

- **Estado:** aceptada e implementada.
- **Fecha:** 2026-10-01.
- **Decisión:** una pausa temporal de entrenamiento se modela con una nueva fila efectiva en `ObjetivosActividad`; `strength_sessions_week=0` significa que la fuerza no es exigible durante ese estado.
- **Adherencia:** una fuerza no exigible queda `ignored`, no `fail`; nutrición y otras dimensiones siguen evaluándose de forma independiente.
- **UI:** Gimnasio conserva el PPL base y su histórico, pero mientras la pausa esté activa no propone ni presenta el formulario de una sesión nueva.
- **Reactivación:** no es automática por fecha; requiere una fila efectiva posterior, evitando reanudar entrenamientos si la causa de la pausa aún persiste.
- **Privacidad:** la razón clínica concreta vive solo en la fuente privada; Git contiene únicamente la semántica genérica de pausa.

## D-045 — Código estable y estado operativo en fuentes canónicas

- **Estado:** aceptada
- **Fecha:** 2026-10-01
- **Decisión:** Segundo Cerebro adopta como regla transversal una arquitectura data-driven: los cambios ordinarios de estado y datos se realizan en la fuente canónica autorizada del dominio y deben reflejarse en la web mediante contratos genéricos, sin modificar frontend o Worker para cada caso concreto.
- **Excepciones justificadas:** nueva capacidad funcional, cambio de contrato/esquema, nueva integración o transporte, validación/seguridad/reconciliación, corrección de bugs, rendimiento/resiliencia o cambio deliberado de UI/UX/arquitectura.
- **Regla para gestores:** antes de tocar Git por una petición operativa deben comprobar si el modelo vigente ya puede representarla. Si puede, escriben en la fuente canónica según permisos o enrutan la intención al gestor propietario. No crean hardcodes ni fuentes paralelas.
- **Criterio de calidad:** si un dato nuevo compatible con el esquema requiere un despliegue para aparecer correctamente, se considera señal de acoplamiento indebido y debe corregirse el diseño reutilizable en lugar de añadir otro caso especial.
- **Motivo:** mantener la web estable, reducir regresiones, evitar lógica específica por dato y permitir que los gestores mantengan el sistema actualizando información, no código.



## D-046 — Recetario: Sheet canónico + foto privada en Drive

- **Estado:** aceptada e implementada.
- **Fecha:** 2026-10-01.
- **Decisión:** las recetas siguen siendo autoridad de `SEGUNDO CEREBRO - SALUD` mediante `Recetas`, `IngredientesReceta` y `PasosReceta`; la foto es un asset binario privado almacenado en Drive y enlazado desde `Recetas` mediante una referencia mínima.
- **Presentación:** Salud incorpora una pestaña `Recetas` genérica que muestra foto, ingredientes y preparación. Añadir o editar una receta no requiere despliegue.
- **Privacidad:** el frontend recibe una URL same-origin; el identificador bruto de Drive no forma parte del contrato visible. Git no almacena fotos ni contenido real de recetas.
- **Integridad:** si faltan foto, ingredientes o pasos, la UI conserva el hueco como pendiente. Los pasos nunca se completan por inferencia.
- **Motivo:** mantener la arquitectura data-driven, evitar una fuente paralela y permitir que los gestores capturen recetas futuras únicamente mutando las fuentes privadas autorizadas.


## D-047 — Gimnasio usa una biblioteca visual libre sin cambiar la fuente canónica del plan

- **Estado:** aceptada.
- **Fecha:** 2026-10-04.
- **Decisión:** incorporar una biblioteca visual de ejercicios basada en wger como fuente pública de referencia para técnica, músculos, equipo y multimedia con licencia.
- **Fuente de verdad:** `GimnasioPlan` continúa siendo la autoridad del plan activo; las sesiones y progresión continúan en D1. wger no se convierte en una segunda rutina.
- **Vinculación:** D1 `gym_exercise_links` guarda únicamente la relación entre un `exercise_id` del plan y una ficha externa. No guarda cargas, objetivos ni histórico.
- **Altas:** añadir un ejercicio desde la biblioteca escribe una fila normal en `GimnasioPlan`; después se consume por el flujo existente.
- **Multimedia:** imágenes/vídeos se resuelven server-side y se sirven por proxy same-origin. Solo se muestran assets con metadatos de licencia y la ficha conserva atribución visible.
- **Coste:** la capacidad no puede introducir servicios, APIs o licencias de pago. Lyfta, RepDB Premium, ExerciseDB de pago y mirrors de procedencia dudosa no son fuentes válidas.
- **Degradación:** si falta multimedia libre o wger está temporalmente indisponible, el plan/histórico siguen funcionando y la UI informa de la limitación.
- **Motivo:** conseguir una experiencia visual tipo enciclopedia de ejercicios sin romper el diseño data-driven, la privacidad ni la regla de coste operativo cero.

## D-048 — Descubrimiento federado de eventos y calendarios

- **Estado:** aceptada.
- **Decisión:** cualquier consulta sobre agenda o eventos debe reconciliar todas las fuentes autorizadas accesibles antes de responder. La búsqueda parte del Sheet canónico `SEGUNDO CEREBRO - EVENTOS` e incluye todos los calendarios iCloud/CalDAV configurados, todos los calendarios accesibles de Google Calendar y, cuando aporten confirmación o detalle, email, reservas, entradas, billetes y documentos.
- **Completitud:** una cuenta, un proveedor o el calendario `primary` no representan por sí solos la agenda global. Si una fuente esperable no puede leerse o devuelve una lectura parcial, el resultado se etiqueta como provisional y no se afirma de forma absoluta cuál es el siguiente evento.
- **Autoridad:** `SEGUNDO CEREBRO - EVENTOS` es la fuente operativa de estado/crónica; iCloud mantiene la autoridad temporal cuando el evento existe allí; las demás fuentes conservan autoridad sobre sus propios datos. D1 es solo caché/espejo técnico.
- **Filtrado:** después de reunir y deduplicar candidatos se excluyen recordatorios puramente financieros/técnicos sin semántica de evento.
- **Motivo:** evitar falsos negativos al responder desde un único calendario y asegurar que bodas, cumpleaños, viajes, celebraciones y otros compromisos no desaparezcan de la planificación por estar repartidos entre calendarios o fuentes.
- **Privacidad:** Git solo documenta la regla; nombres, fechas y detalles reales permanecen en fuentes privadas.

## D-049 — Eventos usa Sheet canónico y la web es frontal

- **Estado:** aceptada.
- **Decisión:** crear el spreadsheet privado `SEGUNDO CEREBRO - EVENTOS` como fuente operativa canónica de GESTOR EVENTOS, con pestañas `Eventos`, `EventoHechos`, `EventoRefs` y `EventosImportantes`.
- **Calendarios:** iCloud/CalDAV y los demás calendarios siguen siendo fuentes propietarias de sus fechas; la integración es de lectura y reconcilia en el Sheet mediante `calendar_ref`.
- **Web/API:** `/api/events` y la UI privada leen/escriben el Sheet. Un cambio ordinario de estado, nota, participante, referencia o hecho no requiere despliegue.
- **D1:** `event_records`, `event_facts` y `event_refs` se conservan como fallback técnico/caché durante la transición; dejan de ser la fuente operativa primaria.
- **Motivo:** permitir que ChatGPT y los gestores accedan a la misma información que muestra la web, evitar memorias inaccesibles y mantener el patrón data-driven usado por otros dominios.
- **Privacidad:** el ID real del Sheet vive en el registro privado `IntegracionesPrivadas`; Git solo contiene el contrato y el adaptador genérico.

