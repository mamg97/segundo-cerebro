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

Ámbito estable de la vida o dominio principal. Campos adicionales: `slug`, `summary`, `tone`, `module` y, cuando exista una semántica definida, indicadores derivados.

`AREA` alimenta la navegación lateral. No deben modelarse como áreas las entidades transversales `OPEN_LOOP`, `GOAL` o `DECISION`.

El campo histórico `health` puede seguir existiendo en snapshots antiguos por compatibilidad, pero no se presenta como puntuación 0–100 si no existe una definición homogénea entre dominios.

### PROJECT

Resultado acotado con varias acciones. Campos: `areaId`, `goalIds`, `progress`, `nextAction`.

### OPEN_LOOP

Asunto que requiere atención o seguimiento. Es una entidad transversal propiedad de su área/gestor; no constituye un área de navegación ni requiere un bloque global en Home.

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

Un objetivo se presenta dentro de su área responsable. Los objetivos transversales del Coordinador se presentan únicamente donde aporten contexto; no crean un dominio `Objetivos` por sí mismos.

### DECISION

Elección abierta o cerrada. Campos: `areaId`, `question`, `options`, `decision`, `decidedAt`.

### EVENT

Compromiso temporal. Campos: `areaId`, `startsAt`, `endsAt`, `locationRef`.

### RECIPE

Receta reutilizable de Salud. La autoridad vive en el Sheet privado `SEGUNDO CEREBRO - SALUD`.

Campos/relaciones principales:
- `recipe_id`: identidad estable;
- datos de receta/raciones/macros en `Recetas`;
- ingredientes 1:N en `IngredientesReceta`;
- `IngredientesReceta.producto_id` opcional: FK al catálogo canónico de Despensa. Se proyecta como `ingredient.productId`; las cantidades y macros de la receta se conservan separados de los macros del producto por 100 g.
- pasos ordenados 1:N en `PasosReceta`;
- `foto_drive_file_id`, `foto_mime_type`, `foto_updated_at`: referencia técnica opcional a una foto privada.

La foto no define la identidad de la receta y sus bytes no se duplican en el Sheet ni en Git. El API público de la aplicación privada expone una URL same-origin, no el identificador bruto de Drive.

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

`wealth` resume patrimonio y evolución salarial. Incluye `currentPatrimony`, `currentDate`, `currentSalaryMiguel`, `currentSalaryAndrea`, `currency`, `history`, `allocation` y `dailyDiary`. Cada punto de `history` contiene fecha, período, salarios individuales y patrimonio mensual. `allocation` describe la distribución actual por custodio/plataforma. `dailyDiary` representa cierres diarios derivados de la fuente privada `PatrimonioDiario`: `date`, `patrimony` nullable, `currency`, `changePct`, `pnlDay`, `movement`, contexto opcional y trazabilidad de fuente. Un patrimonio diario ausente no se reconstruye a partir del P/L o del porcentaje; permanece `null`. La portada mantiene el resumen patrimonial vigente y el detalle de Patrimonio combina distribución, diario y series históricas sin proyectar valores futuros.


### Benchmark privado de deuda frente a inversión

`financeSummary.wealth.loanInvestmentBenchmarks` es una proyección de solo lectura de la pestaña privada `PrestamoVsInversion`. Cada elemento puede contener:

- `id`, `label`, `loanLabel`, `investmentLabel`;
- `startDate`, `throughDate`, `currency`;
- `tracedCapital`, `initialCosts`;
- `portfolioReturnPct`, `portfolioAnnualizedPct`;
- `loanTae`, `loanEquivalentReturnPct`, `grossSpreadPct`;
- `grossInvestmentGain`, `netInvestmentGain`, `loanCostEquivalent`, `netAdvantage`;
- `winner`, `dataStatus`, `methodology`, `sourceBasis`, `updatedAt`, `note`.

La interfaz no recalcula ni hardcodea datos personales: representa los valores ya derivados en la fuente privada. `netAdvantage > 0` significa que la inversión lleva ventaja monetaria después de costes frente a la referencia de amortización; `netAdvantage < 0` significa lo contrario. Un benchmark provisional conserva visibles sus limitaciones.

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

### Producto canónico y disponibilidad

La identidad de productos envasados no pertenece a Salud. Vive en la fuente privada canónica `SEGUNDO CEREBRO - DESPENSA`:
- `Productos`: `producto_id`, nombre canónico, marca/comercio/categoría, formato, EAN, URL de producto, nutrición disponible, fuentes/verificación y notas.
- `Inventario`: `inventario_id`, `producto_id`, nombre, ubicación, cantidad/unidad aproximada, nivel de stock, abierto/caducidad, confianza, origen, última revisión y notas.
- `ListaCompra`: `producto_id`, nombre, estado/prioridad, cantidad objetivo, motivo y estimaciones de precio/coste.

Los dominios consumidores deben reconciliar por `producto_id` y no crear un catálogo paralelo. La nutrición fiable descubierta para un producto existente enriquece `Productos`.

### Comidas
Base reutilizable de platos/comidas personales y compatibilidad histórica: `id`, `nombre`, `racion`, `unidad`, `kcal_racion`, `proteinas_g`, `carbohidratos_g`, `grasas_g`, `fuente`, `nota`, `updated_at`. No es el maestro de productos envasados.

### Registro
Plan diario/semanal y consumo real: `fecha`, `momento`, `item_id`, `item_nombre`, `cantidad`, `unidad`, kcal/macros, `estado` (`planificado` o `consumido`), fuente, nota y timestamp.

Si una fila referencia `item_id` y deja kcal/macros vacíos, el Worker los deriva de la base Comidas. Cuando hay cantidad y ración conocidas, escala proporcionalmente.

### Objetivos
Objetivos con fecha efectiva: kcal, proteína, carbohidratos y grasas. Permanecen vacíos hasta que el usuario defina uno; no se infieren objetivos dietéticos.

### Actividad diaria
Las importaciones automáticas de Apple Health se almacenan en D1 `health_energy_daily`: una única fila por fecha con energía activa, energía en reposo, total, pasos, minutos de ejercicio, contador/metadatos opcionales de entrenamientos, fuente, timestamp de muestreo y timestamp de importación. `energy_date` es clave lógica única y cada nueva sincronización del mismo día reemplaza la anterior mediante UPSERT. El tab `EnergiaDiaria` del Sheet se conserva como entrada manual/fallback y admite los mismos campos ampliados.

Para cada fecha, la fila D1 tiene prioridad sobre el fallback del Sheet. El gasto total usa `total_kcal` cuando Apple Health lo aporta; si no, se deriva como activa + reposo cuando ambas existen. El balance se calcula como `kcal consumidas - gasto total`. La ausencia de gasto se representa como `null`, nunca como 0, y no se infiere a partir de sesiones de gimnasio.

### Composición corporal

El histórico/manual vive en `MedicionesCorporales`. El baseline existente se conserva intacto. Columnas opcionales añadidas: `body_mass_index`, `lean_body_mass_kg`, `measured_at` e `imported_at`.

Las importaciones automáticas de Apple Health se almacenan normalizadas en D1 `health_body_samples`, una fila por métrica:
- `bodyMass`;
- `bodyFatPercentage`;
- `bodyMassIndex`;
- `leanBodyMass`.

Cada muestra conserva valor, unidad, fecha local, timestamp original, fuente e importación. La clave lógica de idempotencia es `metric_type + measured_at + source`.

La vista combinada fusiona Sheet + D1. Para peso:
- se conservan todas las muestras del día;
- se calcula una media diaria si hay varias;
- la media móvil de 7 días usa esas medias diarias;
- el cambio semanal compara los últimos 7 días con los 7 anteriores.

Grasa corporal, IMC y masa magra procedentes de bioimpedancia doméstica se presentan como tendencias, no como mediciones exactas.

### Objetivos de actividad

`ObjetivosActividad` define objetivos efectivos por fecha. Segundo Cerebro usa, entre otros, `steps_target`, `moderate_activity_min_week` y la regla `apple_watch_energy_rule`.

Las kcal estimadas por Apple Watch son informativas: no se ajusta la ingesta 1:1. Las decisiones de nutrición se basan en tendencias de 7–14 días junto con peso/composición, adherencia y entrenamiento.



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

`habitsSummary` puede incluir `todayHabits`, `summary`, `progress` y metadatos mínimos. No se transporta la foto/base64 de `Meta`. El progreso por hábito mostrado en Segundo Cerebro se calcula sobre los últimos 60 días programados. La vista de Progreso añade una tasa global de 90 días, semana actual, mapa de consistencia de cinco semanas, completados acumulados, racha individual y logros derivados; todos son cálculos de lectura sobre `Habits` + `History` + `SyncState`, no nuevas fuentes de verdad.


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


## Gestor Padres

Los datos reales de este dominio solo existen en D1 privado o en fuentes externas propietarias. Git contiene únicamente el contrato y el esquema genérico.

### `family_cases`

Unidad operativa principal. Campos:

| Campo | Uso |
|---|---|
| `id` | Identificador estable local |
| `person_scope` | `mother`, `father`, `shared` |
| `domain` | salud, incapacidad, jubilación, inmueble, hipoteca, inversión, negocio, fiscalidad, administración, legal u otro |
| `title` | Título operativo privado |
| `summary` | Síntesis minimizada del estado |
| `status` | `ACTIVE`, `WAITING_EXTERNAL`, `WAITING_DOCUMENT`, `DECISION_OPEN`, `SCHEDULED`, `BLOCKED`, `DONE`, `ARCHIVED` |
| `priority` | `low`, `medium`, `high`, `critical` |
| `next_action` | Próxima acción concreta |
| `next_action_owner` | Responsable de la próxima acción |
| `due_at` | Fecha límite opcional |
| `waiting_on` | Tercero, documento o condición bloqueante |
| `sensitivity` | Fijado inicialmente a `muy_confidencial` |
| `created_at` / `updated_at` | Trazabilidad temporal |

### `family_case_actions`

Cronología breve y operativa por caso: `case_id`, `action_type`, `summary`, `owner`, `status`, `happened_at`, `due_at`.

### `family_case_refs`

Referencias mínimas a documentos o fuentes: `case_id`, `document_type`, `source_provider`, `source_ref`, `document_date`, `summary`, `review_status`.

Los proveedores admitidos incluyen referencias a Calendario, Finanzas, LITOS, email, Drive/documentos y otras fuentes autorizadas. Una referencia no convierte D1 en fuente propietaria del contenido original.

### `family_wealth_items`

Partidas patrimoniales privadas de los padres, independientes de `family_cases` y de las finanzas personales del usuario.

| Campo | Uso |
|---|---|
| `id` | Identificador estable |
| `owner_scope` | `mother`, `father` o `shared` |
| `category` | `investment`, `property`, `business`, `cash`, `debt` u `other` |
| `label` | Nombre privado de la partida |
| `amount_eur` | Valor conocido/estimado; puede ser nulo si está pendiente |
| `valuation_status` | `confirmed`, `estimated` o `pending` |
| `as_of_date` | Fecha de referencia del valor |
| `source_provider` / `source_ref` | Referencia mínima a Finanzas, LITOS, documento u otra fuente autorizada |
| `note` | Contexto breve de valoración |
| `sensitivity` | `muy_confidencial` |
| `created_at` / `updated_at` | Trazabilidad |

La API deriva `grossAssets`, `liabilities`, `netKnown`, `investments` y `pendingValuations`. Un valor pendiente nunca se sustituye por cero a efectos de valoración.

### Resumen para portada

`familySummary` contiene únicamente conteos de casos abiertos/atención/espera/decisión y el próximo vencimiento. No transporta títulos, diagnósticos, importes ni detalle patrimonial a la portada general.


### Fuente canónica de despensa

El detalle de compras domésticas (producto, precio, ticket, inventario y lista de compra) vive en una fuente privada separada: `SEGUNDO CEREBRO - DESPENSA`.

El dominio Finance referencia esa fuente para agregados y previsiones, pero no duplica observaciones de precio ni líneas de ticket. Esta separación evita inconsistencias entre presupuesto financiero, nutrición e inventario doméstico.


## Electricidad derivada

`financeSummary.electricity` representa una vista privada derivada de `LuzHistorico`, no una nueva fuente financiera.

Campos principales:

- `history[]`: periodo, fecha de factura/cobro, importe, consumo kWh, días, €/día, kWh/día, precio efectivo por kWh, tarifa y actualización;
- `yearOverYear`: variación de importe y consumo contra el mismo mes del año anterior cuando existe;
- `budget`: referencia a la categoría Luz del presupuesto oficial (`budgeted`, `spent`, `committed`, `remaining`);
- `summary`: media de 12 periodos, máximo histórico, última factura y variaciones interanuales;
- `alerts[]`: avisos derivados de cambios de tarifa, precio efectivo o picos de consumo.

No se incluyen dirección, contrato, titularidad ni contenido de PDFs.

## Despensa

Fuente canónica privada: `SEGUNDO CEREBRO - DESPENSA`.

Entidades lógicas:
- `Producto`: `producto_id`, identidad, marca, formato, EAN/URL, `imagen_url` HTTPS opcional, categoría y nutrición de producto disponible.
- `Inventario`: observación física con ubicación, cantidad aproximada, unidad, nivel de stock, apertura, confianza y fecha de revisión.
- `Precio`: observación fechada con importe, base, tienda, fuente, ticket/referencia y URL cuando exista.
- `Ticket`: resumen de una compra; no sustituye el detalle de precio por producto.
- `ListaCompra`: candidato/confirmado con `REVISAR | COMPRAR | COMPRADO`, prioridad, cantidad objetivo, motivo y coste estimado.

Para el espejo Apple Reminders, `ListaCompra` añade `external_id`, `apple_reminder_id`, `normalized_name`, `apple_completed`, `apple_modified_at`, `segundo_cerebro_modified_at`, `last_synced_at`, `sync_status` y `sync_error`. `CANCELADO` se admite como estado terminal de sincronización. `REVISAR` no sale a Apple; `COMPRAR` es activo; `COMPRADO` es completado. La desaparición física de una fila previamente enlazada equivale a cancelación: D1 conserva el vínculo y encola `setCompleted=true` para Apple, sin recrear la fila ni borrar destructivamente el recordatorio.

D1 no sustituye al Sheet. Sus tablas `shopping_sync_links`, `shopping_apple_actions`, `shopping_sync_events` y `shopping_sync_runs` guardan identidad, cola, auditoría y resúmenes técnicos. Las claves de idempotencia impiden duplicados en reintentos.

Proyección de Home (`pantrySummary`):
- `availableProductCount`
- `lowStockCount`
- `pendingPurchaseCount`
- `confirmedPurchaseCount`
- `reviewCount`
- `estimatedBasketTotal`
- `estimatedBasketPartial`
- `missingPriceCount`
- `knownPriceCount`
- `previewItems` (máximo cinco nombres confirmados, solo en la aplicación privada)
- `lastInventoryReview`
- `homeMessage`

`GET /api/pantry` entrega el detalle enriquecido bajo demanda: inventario unido al maestro de producto, último precio, último precio procedente de ticket, histórico reciente, nutrición disponible, lista de compra y agregados por ubicación/categoría. Los valores desconocidos siguen siendo `null`, nunca cero inventado.

`products` conserva también precios fechados para productos sin stock. `GET /api/pantry/products/:producto_id` entrega su ficha read-only, con stock cuando exista y una referencia pública opcional de imagen/precio online Mercadona. No crea un segundo catálogo ni altera los datos canónicos.


## Objetos y armario

Fuente canónica: `SEGUNDO CEREBRO - OBJETOS`, creada el 2026-09-24 y ampliada al contrato v0.2. Si deja de estar disponible, el estado se representa como desconocido/pendiente y no como inventario vacío confirmado.

Entidades lógicas:
- `Object`: objeto maestro con identidad estable, categoría, ubicación, estado, condición, compra, valor, garantía, referencias y metadatos.
- `WardrobeItem`: extensión 1:1/1:0 de un `Object` para color, talla, temporada, formalidad, oficina, uso, compatibilidad y presentación visual.
- `Look`: conjunto de prendas referenciadas por `objeto_id`; nunca duplica las prendas.
- `Kit`: plantilla reutilizable de necesidades; puede referenciar objetos concretos o necesidades genéricas.
- `ContextList`: lista ligada a viaje/evento/contexto, con `evento_ref`, destino, fechas, clima y actividades.
- `ContextListItem`: referencia opcional a `objeto_id`, importancia y estado de preparación.

Estados de objeto:
`DISPONIBLE | EN_USO | PRESTADO | REPARACIÓN | VENDIDO | DONADO | DESCARTADO | PERDIDO`.

Importancia de lista:
`NECESARIO | RECOMENDADO | OPCIONAL`.

Estado de lista:
`FALTA_COMPRAR | SELECCIONADO | PREPARADO | DESCARTADO`.

Proyección de Home (`objectsSummary`):
- `totalObjects`
- `wardrobeCount`
- `electronicsCount`
- `repairCount`
- `loanedCount`
- `dispositionReviewCount`
- `activeListCount`
- `lookCount`
- `kitCount`
- `latestAdditions[]`
- `locations[]`
- `upcomingContexts[]`

`GET /api/objects` devuelve `objects`, `wardrobe`, `looks`, `kits`, `lists` y facetas de filtro. Las relaciones entre looks/kits/listas y el inventario usan IDs estables; no copian objetos.

### WARDROBE_VISUAL

Campos añadidos a `Armario`:
- `foto_original_url`
- `foto_procesada_url`
- `miniatura_url`
- `estado_procesado`: `pendiente | procesada | revisar`
- `vista_prenda`
- `color_principal`
- `patron`
- `categoria_visual`
- `capa`: `superior | exterior | inferior | calzado | accesorio`
- `ultima_actualizacion_visual`

Las imágenes son derivados/referencias del mismo `objeto_id`; no crean otra entidad de inventario. La presentación usa `miniatura_url → foto_procesada_url → foto_original_url → Object.foto_url`.


Persistencia binaria:
- D1 privado almacena los bytes y metadatos técnicos en `objects_media_assets` + `objects_media_chunks`, bajo claves versionadas derivadas de `objeto_id + image_type + version`.
- `Armario` conserva la referencia canónica activa mediante URL privada same-origin del Worker.
- Las claves/chunks de D1 no son identidad de dominio ni se consultan para reconstruir inventario.
- `processed` genera una miniatura WebP (lado largo máximo 512 px) y ambas referencias se actualizan juntas en la fila de Armario.
- El timestamp `ultima_actualizacion_visual` conserva fecha/hora ISO de la última mutación visual.
- Salvaguarda interna del almacén visual: 200 MiB. R2 no está activo para OBJETOS.

### LOOK_BUILDER

El combinador visual genera un `Look` y sus `LookItems` directamente en la fuente canónica. Cada item contiene:
- `look_id`
- `objeto_id` existente en `Armario`
- `rol`: `superior | exterior | inferior | calzado | accesorio`

El MVP exige `superior + inferior + calzado`; `exterior` es opcional. Una petición con un `objeto_id` inexistente o retirado se rechaza y nunca crea una prenda implícita.


## Proyectos

Fuente canónica privada: `SEGUNDO CEREBRO - PROYECTOS`.

Entidades:

### PROJECT_REGISTRY_ITEM

- `project_id`: ID estable.
- `parent_id`: subproyecto opcional.
- `nombre`, `alias`, `area`, `tipo`.
- `estado`: `ACTIVO | MANTENIMIENTO | PAUSADO | PENDIENTE | CERRADO`.
- `prioridad`: `ALTA | MEDIA | BAJA`.
- `resumen`, `owner_funcional`, `next_action`.
- referencias externas: `repo_url`, `docs_url`, `web_url`.
- `docs_status`: `COMPLETA | PARCIAL | PENDIENTE`.
- `related_domains`, `read_only`, `sensitivity`, `updated_at`.

### PROJECT_DOCUMENTATION

Descripción estructurada por `project_id`: visión, objetivo, alcance, estado actual, arquitectura/fuentes, documentos clave, hitos y reglas.

### PROJECT_RELATION

Relación dirigida entre un proyecto y otro proyecto/dominio:
`source_project_id + relation_type + target_type + target_id_or_name + description`.

### PROJECTS_SUMMARY

Proyección minimizada para `/api/state`:
- total;
- topLevel;
- active;
- paused;
- pendingDocs;
- updatedAt.

El detalle solo se entrega por `GET /api/projects`.


## Salud — DAILY_ADHERENCE

Entidad derivada por fecha:

- `date`
- `status`: `CUMPLIDO | PARCIAL | NO_CUMPLIDO | SIN_DATOS | FUTURO`
- `score` derivado cuando existe evaluación
- `manual`
- `reasons[]`
- `dimensions[]`
  - kcal
  - proteína
  - pasos
  - gym
  - hábitos
- `details`
- objetivos efectivos de la fecha
- indicador de fin de semana

Estados de dimensión:
- `pass`
- `partial`
- `fail`
- `unknown`
- `ignored`

`unknown` significa que falta información para evaluar esa dimensión. `ignored` significa que la dimensión no era exigible ese día.

### ADHERENCE_MONTH_SUMMARY

- días cumplidos;
- días parciales;
- días no cumplidos;
- días sin datos;
- porcentaje de adherencia;
- porcentaje de cobertura;
- racha actual;
- mejor racha;
- adherencia laborable;
- adherencia de fin de semana;
- días evaluados/transcurridos.

No se almacena como fuente independiente.


## Eventos persistentes e histórico

El calendario conserva la autoridad sobre fechas y horarios, pero su ventana de lectura no constituye un archivo histórico. D1 mantiene una capa mínima de identidad y crónica para que un evento siga siendo consultable después de desaparecer del horizonte de calendario.

### EVENT_RECORD

- `id`: ID estable; para eventos sincronizados se reutiliza el ID normalizado de iCloud.
- `title`, `kind`.
- `status`: `PROPUESTO | PENDIENTE | CONFIRMADO | EN_CURSO | CERRADO | CANCELADO`.
- `starts_at`, `ends_at`, `location`.
- `participants_json`: participantes explícitamente registrados; no se infieren.
- `calendar_ref`.
- `finance_ref`.
- `objects_list_ref`.
- `summary`, `final_summary`.
- `sensitivity`.
- `created_at`, `updated_at`.

El estado `EN_CURSO` y el paso a `CERRADO` se derivan de las fechas al leer. No hace falta una tarea programada para mover registros.

### EVENT_FACT

Hecho cronológico mínimo:

- `id`, `event_id`;
- `fact_type`;
- `summary`;
- `happened_at`;
- `source_provider`, `source_ref`;
- `created_at`.

Tipos v0.1: `PLAN`, `GASTO`, `COMIDA`, `NUTRICION`, `TRANSPORTE`, `LUGAR`, `INCIDENCIA`, `DECISION`, `NOTA`.

### EVENT_REF

Puntero a una fuente propietaria:

- `event_id`;
- `ref_type`;
- `source_provider`;
- `source_ref`;
- `label`.

No se copian tickets, reservas, movimientos financieros, registros de Nutrición ni inventario dentro de Eventos.

### Vista derivada

La ficha de evento compone bajo demanda:

`EVENT_RECORD + EVENT_FACT + Finanzas + Salud/Nutrición + OBJETOS + referencias`.

La Home solo recibe un resumen minimizado `eventsSummary` con conteos de activos, en curso e históricos.


## Apple Health — recuperación diaria privada

La persistencia fisiológica automática usa D1 privado y no forma parte del modelo público de entidades personales.

`health_recovery_daily` conserva como máximo una fila por fecha y puede contener:

| Campo lógico | Uso |
|---|---|
| `recovery_date` | fecha local del snapshot |
| `resting_hr_bpm` | frecuencia cardiaca en reposo |
| `walking_hr_bpm` | media de frecuencia cardiaca caminando |
| `hrv_sdnn_ms` | HRV SDNN en milisegundos |
| `respiratory_rate` | respiraciones por minuto |
| `oxygen_saturation_pct` | saturación en porcentaje |
| `vo2_max` | estimación HealthKit de VO₂ máx. |
| `wrist_temperature_c` | temperatura de muñeca durante sueño |
| `sleep_*_minutes` | resumen diario de sueño y fases |
| `source`, `sampled_at`, `source_details` | procedencia y trazabilidad mínima |

Reglas:
- UPSERT por fecha; un nuevo snapshot reemplaza el anterior del mismo día.
- `null` significa que Apple Health no aportó una muestra utilizable; no equivale a cero.
- no almacenar una copia de todas las muestras crudas cardiacas/sueño cuando el caso de uso solo necesita el resumen diario.
- los valores reales permanecen en D1 privado; Git solo define contrato/esquema.

## MIDAS · proyección externa de solo lectura

`GET /api/midas` devuelve el `dashboard.json` público normalizado: `generated_at_utc`, `stale` y `tracks[]` con `id`, `label`, `group`, `status`, `first_session`, `last_session`, `currency`, `last_equity`, `day_return_pct`, `return_pct` y `note`. El porcentaje diario compara los dos últimos valores de patrimonio ficticio del diario; es `null` si aún no hay dos cierres. Los porcentajes de campañas con fechas, mercados o divisas distintos no son directamente comparables. Segundo Cerebro no persiste esas filas en D1.


### ImageIngestQueue (legado)

Pestaña técnica y efímera del spreadsheet canónico `SEGUNDO CEREBRO - OBJETOS`. Formó parte del intento inicial `Drive staging → cola → cron`, pero **no es el transporte operativo vigente** y no representa prendas ni sustituye `Armario`.

Campos históricos:
- `request_id`: idempotencia/auditoría de la solicitud.
- `objeto_id`: FK lógica a `Objetos/Armario`.
- `image_type`: `original | processed | thumbnail`.
- `drive_file_id`: archivo privado temporal de staging.
- `overwrite`: reemplazo explícito.
- metadatos visuales: `vista_prenda, color_principal, patron, categoria_visual, capa, estado_procesado`.
- `status`: `pending | processing | done | error | cleanup_pending`.
- `created_at, processed_at, error_code, foto_url, miniatura_url`.

Las filas históricas con `OBJECTS_STAGING_META_403` no deben reintentarse ni duplicarse. La ruta vigente usa `objects-chatgpt-bridge` y, cuando hace falta desde una conversación sin POST directo, el bootstrap temporal `seed.mjs` con `OBJECTS_SEED_JOBS`. Solo `Armario` mantiene el estado visual canónico de la prenda.



## Gym visual exercise reference

### Canonical plan row

The existing private `GimnasioPlan` row remains the authority for:
- `day_id`, order, day title/focus and rest;
- canonical `exercise_id` / exercise name;
- target sets/reps/load and coaching notes.

An exercise added from the public library receives a stable canonical ID such as `wger-<provider_id>` and is appended through the same `GimnasioPlan` schema. It is not stored only in the external catalogue or in D1.

### `gym_exercise_links` (D1 technical mapping)

| Field | Meaning |
| --- | --- |
| `plan_exercise_id` | Canonical private plan exercise ID; primary key |
| `provider` | Public reference provider; currently `wger` |
| `provider_exercise_id` | Provider exercise identifier |
| `provider_exercise_uuid` | Optional stable provider UUID |
| `created_at` | Mapping creation timestamp |
| `updated_at` | Last mapping update timestamp |

This table contains no sets, loads, reps, health measurements or session history. Deleting/changing a mapping must not delete or change the canonical plan exercise.

### External exercise view model

The Worker derives an ephemeral exercise object containing:
- provider ID/UUID and translated display name;
- aliases/description;
- category, primary/secondary muscles and equipment;
- licensed image/video references proxied same-origin;
- source and per-asset license/attribution metadata.

This external object is reference data only and is not persisted as a second exercise catalogue inside the user's private canonical stores.
