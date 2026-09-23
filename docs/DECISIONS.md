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
