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

### FINANCE_SUMMARY

Resumen financiero operativo para la portada. No sustituye a la fuente de verdad financiera.

`monthlyBudget` admite:

| Campo | Uso |
|---|---|
| `periodLabel` | Ciclo visible, por ejemplo 20 sep – 20 oct |
| `currency` | Moneda ISO |
| `income` | Ingresos del ciclo si están verificados |
| `plannedOutflows` | Gastos + ahorro presupuestados |
| `personalNet` | Neto personal modelado por la fuente financiera |
| `savingsTarget` | Ahorro objetivo del ciclo |
| `spent` | Gasto real consolidado, solo cuando exista fuente reconciliada |
| `committed` | Importe comprometido todavía no cargado |
| `categories` | Seguimiento parcial por categoría |

`upcomingCommitments` resume próximos eventos o pagos relevantes con `date`, `totalBudget`, `reserved`, `needed`, `currency` y `note`. Si no se conoce `reserved` o `needed`, se deja nulo: la interfaz debe mostrar «Por conciliar» y no inferir deuda.

`debts` resume obligaciones financieras activas. El resumen admite `count`, `totalBalance`, `monthlyPayment`, `currency` y una lista `debts`. Cada deuda puede incluir `title`, `balance`, `monthlyPayment`, `paymentDay`, `interestRate`, `status`, `owner`, `sourceStatus`, `updatedAt` y `note`. Un saldo desconocido permanece `null`: la interfaz debe mostrar «Por completar» y no estimarlo a partir de cuotas.

`wealth` resume patrimonio y evolución salarial. Incluye `currentPatrimony`, `currentDate`, `currentSalaryMiguel`, `currentSalaryAndrea`, `currency` y `history`. Cada punto histórico contiene fecha, período, salarios individuales y patrimonio. La portada enseña solo el patrimonio del último día 1 disponible; el detalle de Patrimonio dibuja las series temporales sin proyectar valores futuros.


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


### Progreso presupuestario por partida

La barra visible de una categoría representa gasto ejecutado: `spent / budgeted`. Los compromisos futuros (`committed`) se muestran por separado. Las partidas con presupuesto positivo deben aparecer aunque su gasto sea 0, para que la portada refleje el presupuesto completo del ciclo.


## Eventos importantes y salud derivados del calendario

El estado remoto puede incluir `importantEventRules`, una lista privada procedente del bridge de Google Sheets. Cada regla contiene `matchTerms[]`, `displayTitle`, `kind` y `enabled`. Los términos se aplican únicamente en runtime sobre los eventos iCloud ya normalizados; nombres privados y alias no deben escribirse en Git.

La vista `Eventos importantes` combina:
- eventos iCloud que coinciden con reglas privadas;
- citas médicas detectadas por clasificación genérica;
- compromisos financieros próximos.

El área `Salud` es derivada y no crea una segunda fuente de verdad. Clasifica eventos iCloud en `medical`, `gym` y `nutrition` a partir de título/ubicación. La fuente sigue siendo iCloud.


## Gimnasio

El plan de entrenamiento vive en la pestaña privada `GimnasioPlan`. Cada fila define un ejercicio y contiene día, foco, descanso, orden, series/repeticiones objetivo, carga de referencia, unidad y notas. El repositorio público solo contiene la lógica genérica para leer y representar este modelo.

Los entrenamientos realizados se guardan en D1:
- `gym_sessions`: una fila por sesión (fecha, día del plan, título, notas).
- `gym_entries`: una fila por ejercicio realizado (series, reps, carga, unidad, notas).

El endpoint privado `GET /api/gym` combina plan + histórico + series de progreso. `POST /api/gym/session` registra una sesión completa.

## Nutrición

La nutrición operativa vive en una fuente privada separada `SEGUNDO CEREBRO - SALUD`, no en Git ni en el Sheet financiero.

### Comidas
Base reutilizable de alimentos/platos: `id`, `nombre`, `racion`, `unidad`, `kcal_racion`, `proteinas_g`, `carbohidratos_g`, `grasas_g`, `fuente`, `nota`, `updated_at`.

### Registro
Plan diario/semanal y consumo real: `fecha`, `momento`, `item_id`, `item_nombre`, `cantidad`, `unidad`, kcal/macros, `estado` (`planificado` o `consumido`), fuente, nota y timestamp.

Si una fila referencia `item_id` y deja kcal/macros vacíos, el Worker los deriva de la base Comidas. Cuando hay cantidad y ración conocidas, escala proporcionalmente.

### Objetivos
Objetivos con fecha efectiva: kcal, proteína, carbohidratos y grasas. Permanecen vacíos hasta que el usuario defina uno; no se infieren objetivos dietéticos.

### Energía diaria
`EnergiaDiaria` guarda `active_kcal`, `resting_kcal`, `total_kcal`, fuente y timestamp. El balance se calcula como `kcal consumidas - gasto total`. La importación automática de Apple Health requiere un puente autorizado desde iPhone; la ausencia de datos se representa como `null`, no como 0.



### Estados operativos del gestor financiero

El módulo Finance distingue semánticamente el estado de un movimiento o partida:

| Estado | Uso |
|---|---|
| `PREVISTO` | Está en el modelo presupuestario, pero aún no existe obligación concreta ejecutada |
| `COMPROMETIDO` | Existe una obligación o reserva conocida, aunque todavía no se haya cargado |
| `EJECUTADO` | El movimiento real ya ocurrió |
| `PROVISIONAL_CHAT` | Movimiento comunicado en conversación y todavía pendiente de contraste con la fuente oficial |
| `RECONCILIADO_SHEET` | Movimiento o partida confirmado contra la hoja financiera |
| `DERIVADO` | Valor calculado a partir de fuentes reconciliadas |

El estado financiero mensual y el patrimonio invertido son dimensiones distintas. El primero describe flujo de caja y margen disponible; el segundo describe ahorro acumulado y valor de activos. La interfaz no debe sumar ambos como si fueran liquidez disponible.


### Propietario de partida

`monthlyBudget.categories[]` admite `owner` con valores `Común`, `Miguel` o `Andrea`. La UI agrupa por ese campo. Las partidas comunes y personales comparten el mismo modelo: `budgeted`, `spent`, `committed`, `remaining`, `sourceStatus`, `updatedAt` y `note`.

`monthlyBudget` expone además `miguelNet`, `andreaNet` y `jointNet`. Estos netos se presentan como métricas separadas y no deben derivarse sumando/restando otra vez las partidas personales visibles.


## Hábitos / HabitQuest

HabitQuest conserva su Google Sheet como fuente propietaria del dato. Segundo Cerebro no replica permanentemente el histórico en D1: genera una vista privada derivada bajo demanda.

### Habit

Campos consumidos: `id`, `name`, `icon`, `category`, `frequency`, `days`, `reminder`, `difficulty`, `xpReward`, `timesPerDay`, `active`, `archivedAt`, `createdAt`.

### Estado diario

`SyncState` usa `habitId + date` como clave lógica y resuelve conflictos por el `updatedAt` más reciente. `count=0` es un tombstone explícito de desmarcado. Segundo Cerebro añade acciones a este log y nunca lo limpia.

### Vista derivada

`habitsSummary` puede incluir `todayHabits`, `summary`, `progress` y metadatos mínimos. No se transporta la foto/base64 de `Meta`. El progreso mostrado en Segundo Cerebro se calcula sobre los últimos 30 días programados.


### Gestión de hábitos desde Segundo Cerebro

Segundo Cerebro puede gestionar el mismo registro `Habit` de HabitQuest mediante el endpoint privado `POST /api/habits/manage`. Acciones admitidas:

- `create`
- `update`
- `archive`
- `restore`
- `delete`
- `reorder`

El modelo conserva los campos originales de HabitQuest y recalcula `xpReward` según dificultad: easy=10, medium=20, hard=30.

Las operaciones no crean una segunda fuente de verdad. La hoja `HabitQuest Data` sigue siendo propietaria. Tras cada mutación se actualiza `Meta.updatedAt`; al eliminar, se eliminan también las filas del hábito en `History` y `SyncState`. Archivar nunca borra histórico.
