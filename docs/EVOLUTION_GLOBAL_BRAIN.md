# Evolutivo — Cerebro Global

## Objetivo

Migrar Segundo Cerebro desde un conjunto de conversaciones especializadas visibles para el usuario a un sistema con **una única interfaz conversacional principal** y gestores especializados internos.

La transición debe conservar todo lo ya construido y evitar una reescritura innecesaria.

## Estado de partida

Segundo Cerebro ya dispone de:

- contratos por dominio en `agents/`;
- fuentes canónicas privadas;
- dashboard privado;
- APIs privadas por dominio;
- D1 para entidades operativas concretas;
- integraciones con Calendar, Finanzas, HabitQuest, Salud, Despensa, Objetos, Padres y Proyectos;
- documentación de arquitectura, datos, privacidad y decisiones.

La principal carencia no es de datos, sino de **orquestación conversacional**.

Hoy el usuario todavía necesita saber qué conversación/gestor utilizar.

## Arquitectura objetivo

```text
Usuario
  ↓
CEREBRO GLOBAL
  ↓
Intent Router
  ↓
Context Planner
  ↓
┌────────────┬────────────┬────────────┬────────────┐
│ Finanzas   │ Eventos    │ Salud      │ Hábitos    │
│ Despensa   │ Objetos    │ Padres     │ Proyectos  │
│ Web        │ futuros módulos...                  │
└────────────┴────────────┴────────────┴────────────┘
  ↓
Fuentes canónicas / APIs privadas / D1 / conectores
  ↓
Result Composer
  ↓
Respuesta única al usuario
```

## Qué cambia para el usuario

### Ahora

El usuario piensa:

> “Esto corresponde a Eventos, así que tengo que abrir GESTOR EVENTOS.”

### Objetivo

El usuario dice:

> “Este fin de semana me voy fuera, prepáramelo.”

El Cerebro Global:

1. identifica Eventos;
2. consulta Calendario;
3. obtiene reservas si están disponibles;
4. consulta Objetos/Kits;
5. identifica compras;
6. consulta Finanzas si hay costes;
7. devuelve una sola respuesta.

## Evolución por fases

### Fase 0 — Estabilización documental

**Objetivo:** que ninguna conversación sea imprescindible para reconstruir el sistema.

- completar contratos faltantes;
- mantener `HANDOFF` como estado vigente;
- documentar fuentes y reglas;
- separar estado real de historial conversacional;
- eliminar UI/entidades heredadas sin propietario claro.

**Resultado:** una conversación nueva puede reconstruir el sistema leyendo Git + fuentes privadas.

### Fase 1 — Coordinador formal

**Objetivo:** formalizar CEREBRO GLOBAL.

- crear `agents/COORDINATOR.md`;
- definir tabla de enrutamiento;
- definir operaciones `READ / DERIVE / PROPOSE / WRITE`;
- definir cuándo se necesita confirmación;
- definir contratos `COORDINATOR_REQUEST / DOMAIN_TASK / COORDINATOR_RESULT`.

**Resultado:** existe un protocolo común de delegación.

### Fase 2 — Registro de capacidades

**Objetivo:** que el Coordinador no tenga lógica de routing hardcodeada de forma dispersa.

Crear un registro estructurado de capacidades, inicialmente derivable de `agents/`:

- dominio;
- intenciones;
- endpoints;
- fuentes;
- permisos;
- operaciones soportadas;
- sensibilidad;
- dependencias;
- propietario funcional.

Ejemplo conceptual:

```text
EVENTS
reads: calendar, event docs
collaborates_with: objects, finance
writes: event operational state
requires_confirmation: bookings/payments
```

**Resultado:** añadir un gestor nuevo no obliga a reescribir el Coordinador.

### Fase 3 — Context Planner

**Objetivo:** cargar solo el contexto necesario.

El Coordinador genera un plan:

```text
intent: preparar viaje
domains: [events, objects, finance]
reads:
  - próximos eventos
  - lista vinculada de objetos
  - presupuesto/provisión del evento
writes: none
```

Debe evitar cargar todo Segundo Cerebro en cada turno.

**Resultado:** respuestas más rápidas, menos contexto y menor dependencia de conversaciones largas.

### Fase 4 — Composición multi-dominio

**Objetivo:** resolver consultas que requieren varios gestores.

Casos prioritarios:

1. viaje → Eventos + Objetos + Finanzas;
2. menú/comida → Salud + Despensa;
3. compra → Despensa + Finanzas;
4. inversión/proyecto MIDAS → Proyectos + Finanzas/Patrimonio;
5. asuntos de padres → Padres + Eventos/Finanzas;
6. proyecto → Proyectos + gestor propietario.

**Resultado:** el usuario recibe una respuesta única.

### Fase 5 — Acciones coordinadas

**Objetivo:** permitir que una sola petición produzca varias mutaciones seguras.

Ejemplo:

> “Añade lo que falta para el viaje y déjamelo preparado.”

Plan posible:

- Eventos actualiza contexto;
- Objetos crea/actualiza `ListaItems`;
- Despensa recibe necesidades consumibles;
- Finanzas recibe estimación/provisión si procede.

Cada escritura ocurre en la fuente propietaria.

**Resultado:** una sola orden, varias acciones coherentes.

### Fase 6 — Interfaz conversacional en la web

**Objetivo:** que la caja “Consulta rápida” evolucione a Cerebro Global.

Hoy:
- navegación;
- consultas simples.

Futuro:
- enviar petición al Coordinador;
- mostrar qué dominios ha consultado;
- responder con acciones y referencias;
- permitir confirmación de mutaciones;
- abrir el módulo relevante solo cuando el usuario quiera detalle.

La conversación principal puede vivir tanto en ChatGPT como en la propia web, usando los mismos contratos.

### Fase 7 — Retirada progresiva de conversaciones especializadas

No borrar de golpe.

Estados:

- `PRIMARY`: Cerebro Global.
- `MAINTENANCE`: gestor especializado todavía útil para desarrollo/depuración.
- `LEGACY`: conversación antigua conservada solo como referencia.
- `RETIRED`: ya no necesaria.

Solo retirar un gestor visible cuando el Coordinador cubra:
- lectura;
- explicación;
- mutaciones principales;
- continuidad documental;
- recuperación de errores.

## Prioridad recomendada

### P0

- Coordinador formal.
- Registro de capacidades.
- Routing multi-dominio.
- Lectura unificada.

### P1

- Eventos + Objetos + Finanzas.
- Salud + Despensa + Hábitos.
- Proyectos + Finanzas/Patrimonio.
- Padres + Calendar/Finanzas.

### P2

- Mutaciones coordinadas.
- Confirmaciones.
- Auditoría de acciones.
- UI conversacional completa.

### P3

- Reducir dependencia de chats especializados.
- Optimización de latencia/contexto.
- Automatizaciones proactivas.

## Latencia y conversaciones largas

Una conversación no debe convertirse en la base de datos del sistema.

Para evitar chats lentos:

- mantener chats más cortos;
- persistir decisiones y estado en fuentes/documentación;
- abrir una nueva conversación de Cerebro Global cuando una se vuelva pesada;
- reconstruir contexto desde el sistema;
- cargar contratos y datos bajo demanda;
- no arrastrar transcript histórico completo para responder a una operación actual.

## Criterio de éxito

Segundo Cerebro habrá completado esta evolución cuando el usuario pueda usarlo de esta forma:

> “Tengo libre este fin de semana. Mira qué planes tengo, qué compromisos económicos hay, si tengo que comprar algo y qué debería llevarme.”

sin saber qué gestor existe por debajo, y el sistema pueda resolverlo correctamente respetando fuentes, permisos y privacidad.
