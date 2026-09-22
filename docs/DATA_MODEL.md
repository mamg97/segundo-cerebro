# Modelo de datos

## Principios

- Una identidad estable por entidad.
- Relaciones por identificador, no por duplicación.
- Referencias mínimas a fuentes externas.
- Sensibilidad explícita en todas las entidades.
- Campos pequeños y útiles; ampliar solo ante casos reales.

## Campos comunes

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador local estable |
| `type` | enum | Tipo de entidad |
| `title` | string | Nombre legible |
| `status` | string | Estado operativo |
| `sensitivity` | enum | Nivel de sensibilidad |
| `sourceRefs` | string[] | Referencias mínimas, nunca contenido original completo |
| `updatedAt` | fecha ISO | Última actualización conocida |

Sensibilidades admitidas: `normal`, `personal`, `confidencial`, `muy_confidencial`.

## Entidades v0.1

### AREA

Ámbito estable de la vida. Campos adicionales: `slug`, `summary`, `tone`, `health`, `module`.

### PROJECT

Resultado acotado con varias acciones. Campos: `areaId`, `goalIds`, `progress`, `nextAction`.

### OPEN_LOOP

Asunto que requiere atención o seguimiento.

| Campo | Uso |
|---|---|
| `areaId` | Área responsable |
| `projectId` | Proyecto opcional |
| `personId` | Persona relacionada opcional |
| `priority` | `low`, `medium`, `high` |
| `dueDate` | Fecha límite opcional |
| `cost` | Estimación opcional; moneda explícita |
| `nextAction` | Siguiente acción física y concreta |
| `blocker` | Bloqueo actual opcional |

Caso de referencia ficticio: “Recoger el anillo” en Pareja → Matrimonio.

### GOAL

Dirección deseada y medible. Campos: `areaId`, `horizon`, `metric`, `target`.

### DECISION

Elección abierta o cerrada. Campos: `areaId`, `question`, `options`, `decision`, `decidedAt`.

### EVENT

Compromiso temporal. Campos: `areaId`, `startsAt`, `endsAt`, `locationRef`.

### PERSON

Referencia mínima a una relación relevante. Evitar almacenar datos de contacto salvo necesidad y autorización futura.

### ASSET

Referencia conceptual a un activo. No incluir saldos, números de cuenta ni valores reales en Git.

### SOURCE

Puntero a la fuente propietaria. Campos previstos: `provider`, `externalRef`, `syncState`, `lastCheckedAt`. `externalRef` deberá ser opaco y seguro.

## Relaciones

```text
AREA 1 ── * PROJECT
AREA 1 ── * GOAL
AREA 1 ── * OPEN_LOOP
PROJECT 0..1 ── * OPEN_LOOP
PERSON 0..1 ── * OPEN_LOOP
SOURCE * ── * entidad
```

## Fuera del modelo en v0.1

No se fijan esquemas de autenticación, sincronización, auditoría persistente, embeddings, permisos por campo ni almacenamiento. Deben decidirse con requisitos reales y revisión de privacidad.
