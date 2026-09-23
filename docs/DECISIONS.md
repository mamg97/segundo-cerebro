# Decisiones arquitectónicas

Este documento registra decisiones duraderas. El histórico detallado permanece en Git.

## D-001 — Estado global compartido

- **Estado:** aceptada
- **Fecha:** 2026-09-22
- **Decisión:** todos los módulos consultan una fuente de estado común coordinada. No se crearán agentes con memorias independientes.
- **Motivo:** preservar coherencia entre áreas y permitir decisiones que crucen trabajo, familia, agenda y finanzas.

## D-002 — Fuentes externas propietarias

- **Estado:** aceptada
- **Fecha:** 2026-09-22
- **Decisión:** el sistema almacena referencias y contexto mínimo; Gmail, Calendar, Sheets, Drive y GitHub conservan los datos originales.
- **Motivo:** minimizar duplicación, exposición y divergencia.

## D-003 — Git sin datos reales ni secretos

- **Estado:** aceptada
- **Fecha:** 2026-09-22
- **Decisión:** el repositorio contiene exclusivamente código, documentación técnica y mocks inequívocos.
- **Motivo:** el repositorio no es un almacén seguro para datos personales.

## D-004 — v0.1 estática y sin dependencias

- **Estado:** aceptada
- **Fecha:** 2026-09-22
- **Decisión:** validar el dashboard con HTML, CSS y JavaScript nativos, sin APIs ni persistencia.
- **Motivo:** mantener la base auditable y aplazar decisiones de framework, hosting y base de datos hasta tener requisitos reales.

## D-005 — Responsive y evolución a PWA

- **Estado:** aceptada
- **Fecha:** 2026-09-22
- **Decisión:** diseñar desde v0.1 para Mac, iPhone e iPad, usando semántica y límites de módulos compatibles con una futura PWA. No se activa todavía service worker ni caché offline.
- **Motivo:** preparar la evolución sin introducir complejidad o políticas de caché prematuras.

## D-006 — Árbol operativo como transparencia, no como memoria

- **Estado:** aceptada
- **Fecha:** 2026-09-22
- **Decisión:** la vista Sistema representa Coordinador, estado común, módulos, capacidades y fuentes con sus estados y permisos. Los nodos no implican agentes autónomos ni memorias separadas.
- **Motivo:** hacer comprensible cómo trabaja el sistema sin contradecir la arquitectura de fuente de verdad única.

## D-007 — Demo pública estática en GitHub Pages

- **Estado:** aceptada
- **Fecha:** 2026-09-22
- **Decisión:** publicar en `mamg97/segundo-cerebro` una demo estática de la v0.1 mediante GitHub Pages, limitada a código, documentación técnica y datos mock inequívocos.
- **Motivo:** permitir la validación temprana desde Mac, iPhone e iPad sin desplegar backend, conectar cuentas ni exponer información personal.
- **Alcance:** GitHub Pages es solo el alojamiento de la demo actual. No decide el hosting, la persistencia ni la arquitectura de datos definitivos del producto privado.

## D-008 — Superposición privada local para validar datos reales

- **Estado:** aceptada como solución provisional
- **Fecha:** 2026-09-22
- **Decisión:** permitir que el dashboard cargue `.private/state.js` solo en loopback y bajo activación explícita, manteniendo mocks como comportamiento por defecto y único contenido publicado.
- **Motivo:** validar el estado global con contexto real sin copiarlo a GitHub, conectar APIs ni modificar las fuentes propietarias.
- **Límite:** el archivo local no está cifrado ni sincronizado. Esta decisión no selecciona la persistencia privada definitiva y exige minimización adicional para datos `muy_confidencial`.


## D-009 — Relevo entre ChatGPT normal y Work/Codex

- **Estado:** aceptada
- **Fecha:** 2026-09-22
- **Decisión:** `docs/HANDOFF.md` es el estado común presente; `CHATGPT_NORMAL/` y `WORK_CODEX/` solo documentan el carril de ejecución.
- **Motivo:** poder continuar el proyecto entre herramientas sin duplicar la fuente de verdad ni depender de conversaciones largas.

## D-010 — Cloudflare Worker + Access + D1 para la primera web privada

- **Estado:** aceptada para v0.2
- **Fecha:** 2026-09-22
- **Decisión:** la primera versión remota con datos reales se implementará como un Cloudflare Worker protegido íntegramente por Cloudflare Access y con D1 como persistencia privada. GitHub Pages seguirá siendo solo la demo mock.
- **Motivo:** permite acceso desde Mac, iPhone e iPad, mantiene los datos fuera de GitHub y encaja en el uso personal de bajo volumen sin añadir un servidor propio.
- **Límite:** la primera versión será de solo lectura; no se activará hasta verificar Access. El proveedor podrá reevaluarse si cambian requisitos de privacidad, coste o portabilidad.


## D-011 — Gestor financiero como intermediario y hoja derivada privada

- **Estado:** aceptada
- **Fecha:** 2026-09-22
- **Decisión:** `ASUNTOS v3.xlsx` continúa como fuente oficial financiera y permanece solo lectura para el asistente. La conversación `GESTOR FINANZAS PERSONALES` mantiene reglas/contexto en `CONTROL ASISTENTE - MEMORIA FINANCIERA` y una hoja privada derivada `SEGUNDO CEREBRO - ESTADO FINANCIERO` para transportar el estado normalizado al dashboard.
- **Conciliación:** un movimiento registrado en conversación entra como `PROVISIONAL_CHAT`; solo pasa a `RECONCILIADO_SHEET` cuando se confirma contra `ASUNTOS v3.xlsx`.
- **Sincronización:** el Worker privado puede leer la hoja derivada de Google Sheets en cada carga y superponer `financeSummary` sobre la instantánea D1, sin publicar importes en Git.
- **Motivo:** evita contabilidad paralela, conserva la trazabilidad entre conversación y fuente oficial, y permite que las barras de presupuesto se actualicen al registrar movimientos sin que el Segundo Cerebro modifique el Excel.


## D-012 — Separación operativa entre flujo mensual e inversiones

- **Estado:** aceptada
- **Fecha:** 2026-09-23
- **Decisión:** el módulo Finance separa dos carriles de trabajo: gestión mensual del dinero y gestión de inversiones/ahorro. Ambos comparten estado global y fuentes financieras, pero no mezclan flujo de caja con patrimonio invertido.
- **Gestión mensual:** ingresos, gastos, cuentas corrientes, cuotas, compromisos, liquidez, viajes y cierre del ciclo.
- **Inversiones/ahorro:** patrimonio financiero acumulado, movimientos de brokers, valoración de plataformas, asignación y reconciliación patrimonial.
- **Jerarquía:** la hoja financiera externa sigue siendo la fuente oficial; el documento privado de control conserva reglas; la hoja derivada y D1 transportan estado normalizado al dashboard.
- **Privacidad:** Git solo documenta lógica y contratos; nunca cifras, extractos o posiciones reales.
- **Motivo:** reducir errores de doble conteo, separar decisiones de consumo de decisiones patrimoniales y permitir relevo entre conversaciones sin perder coherencia.
