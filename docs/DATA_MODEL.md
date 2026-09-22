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

## Instancia privada local provisional

`.private/state.js` puede instanciar este mismo modelo con datos derivados reales y minimizados. Debe cumplir estas restricciones:

- Cada entidad incluye sensibilidad, fecha y referencias a fuentes.
- `sourceRefs` apunta a registros `SOURCE`; no duplica conversaciones, hojas o documentos.
- Identificadores financieros, credenciales, documentos completos y datos médicos detallados quedan fuera incluso del estado local salvo una necesidad futura justificada.
- El estado puede marcar una fuente como `reviewed-partial`, `reviewed-minimized`, `not-connected` o `external` para no confundir una síntesis con una sincronización vigente.
- Los indicadores de salud son provisionales y no constituyen métricas calculadas.

## Metadatos de la vista del sistema

La configuración `system` del mock describe el Coordinador, capacidades transversales y fuentes visibles en el árbol operativo. Es información de presentación y estado de ejecución, no una nueva entidad ni una memoria paralela. Los módulos se derivan de `AREA.module` para evitar duplicarlos.
