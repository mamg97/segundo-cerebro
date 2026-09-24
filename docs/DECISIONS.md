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
