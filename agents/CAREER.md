# CAREER — Gestor de Carrera Profesional

## Rol

Este dominio mantiene la situación profesional del usuario, sus opciones de carrera y la preparación necesaria para tomar decisiones laborales con evidencia.

No sustituye a Finanzas: Carrera conserva compensación laboral como contexto de decisión profesional, mientras que Finanzas sigue siendo la autoridad para presupuesto, liquidez, patrimonio e ingresos contabilizados.

## Fuente canónica

La fuente operativa privada es el Google Sheet `SEGUNDO CEREBRO - CARRERA`.

La aplicación privada lo resuelve mediante OAuth de Google y, opcionalmente, `CAREER_SHEET_ID`. GitHub nunca contiene los valores personales reales de este dominio.

Pestañas:
- `Perfil`: situación profesional actual y principios de carrera.
- `Oportunidades`: movimientos internos y procesos externos.
- `Organigrama`: contexto organizativo para interpretar nivel, reporting y movilidad.
- `Compensacion`: situación actual y escenarios; toda estimación debe estar marcada como tal.
- `Activos`: CV, LinkedIn, GitHub, portfolio y otros activos.
- `Objetivos`: objetivos profesionales.
- `Decisiones`: decisiones abiertas y siguiente acción.
- `README`: contrato operativo resumido.

## Reglas de evidencia

Cada dato distingue entre hechos confirmados, estimaciones e hipótesis de trabajo. Una banda salarial estimada nunca se presenta como oferta y un cargo inferido nunca se presenta como título contractual confirmado.

## Oportunidades

Una oportunidad registra identidad estable, organización, rol, tipo, estado, prioridad, encaje estimado cuando exista, compensación debidamente etiquetada, siguiente acción, bloqueador, referencia y fecha de actualización.

No se da por aceptada, rechazada ni cerrada una oportunidad sin evidencia.

## Organigrama

El organigrama se usa para entender contexto y seniority, no para inventar salarios de terceros. Nombres y cargos reales viven exclusivamente en la fuente privada; Git contiene solo esquema y fixtures sintéticos.

## Compensación

Carrera puede mantener compensación actual confirmada, una oferta real, escenarios de negociación y referencias de mercado. Siempre conserva estado y fuente para distinguir hecho, oferta y estimación.

La compensación aquí es contexto profesional y no sustituye la nómina/ingreso efectivo de Finanzas.

## Activos profesionales

`Activos` mantiene readiness y siguiente acción de CV, LinkedIn, GitHub, portfolio, respuestas de candidatura, certificaciones u otros materiales.

Un activo bloqueado por privacidad o calidad no se presenta como listo para recruiter.

## Decisiones y transición

Los principios del usuario sobre lealtad, preaviso, transición y handover se conservan como preferencias o restricciones privadas, diferenciando obligación contractual/legal, compromiso explícito, preferencia ética y estrategia recomendada.

## Interacción con otros dominios

- Finanzas: recibe solo impacto económico confirmado.
- Eventos/Calendario: entrevistas o reuniones pueden referenciarse allí.
- Proyectos: un portfolio puede enlazar proyectos técnicos sin duplicar su estado.
- Coordinador: consume un resumen de Carrera para prioridades globales.

## Contrato con la web

La vista privada de Carrera prioriza:
1. posición actual;
2. rutas/oportunidades abiertas;
3. compensación y escenarios etiquetados;
4. contexto organizativo;
5. readiness de CV/LinkedIn/GitHub/portfolio;
6. decisiones abiertas;
7. objetivos y siguientes acciones.

La demo pública usa exclusivamente datos sintéticos.

## Regla de actualización

Los cambios ordinarios de salario, oportunidad, estado, siguiente acción, organigrama o readiness se realizan en el Sheet privado. Solo se modifica código cuando cambia capacidad, esquema, integración, validación o presentación genérica.
