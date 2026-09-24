# Handoff — Segundo Cerebro

## Última actualización

- **Fecha:** 2026-09-24
- **Herramienta:** ChatGPT normal
- **Rama operativa:** `main`
- **Repositorio:** `mamg97/segundo-cerebro`

## Propósito de este documento

Este archivo describe únicamente el estado vigente y el siguiente paso. El historial de implementación permanece en Git y las decisiones duraderas en `docs/DECISIONS.md`.

## Estado actual

Segundo Cerebro dispone de dos superficies separadas:

- **GitHub Pages:** demo pública con mocks, sin datos ni conexiones privadas.
- **Cloudflare:** aplicación privada protegida por Access, con Worker, D1 e integraciones autorizadas.

La aplicación privada ya no es un prototipo de solo lectura. Hay escritura selectiva en los dominios que la necesitan y lectura estricta en los que no.

## Arquitectura operativa

```text
Usuario
  ↓
ORGANIZADOR / WEB GENERAL
  ↓
Estado global común
  ↓
Finance · Calendar · Habits · Health · resto de áreas
  ↓
Fuentes propietarias / D1
```

Las conversaciones especializadas gestionan su dominio, pero no crean fuentes de verdad paralelas. Este repositorio y los contratos de `agents/` permiten relevo entre ChatGPT normal y Work/Codex.

## Funcionalidad vigente

### Interfaz

- Dashboard responsive para Mac, iPhone e iPad.
- Modo claro/oscuro.
- Logo cerebral común en navegación y favicon.
- Thinking Orb vendorizado con estados de actividad.
- Vista semanal de agenda, eventos importantes, decisiones y módulos.
- Diseño móvil corregido para evitar overflow y apariencia de escritorio comprimido.

### Finanzas

- Fuente oficial externa + memoria de reglas + hoja privada derivada.
- Resumen mensual, presupuesto, próximos movimientos y conciliación.
- Separación entre partidas comunes e individuales.
- Deudas con resumen y detalle.
- Patrimonio con evolución histórica.
- Flujo mensual separado conceptualmente de inversiones/ahorro.
- La categoría Luz abre un drilldown privado alimentado por `LuzHistorico`: importe/consumo mensual, métricas por día, comparativa interanual, última factura, cobro previsto, presupuesto/gasto/comprometido/saldo y alertas derivadas.
- El drilldown de Luz se reconstruye desde la capa privada y no lee PDFs ni expone datos contractuales.
- Contrato vigente: `agents/FINANCE.md`.

### Calendario

- Integración iCloud por CalDAV.
- Lectura únicamente.
- Vista semanal y eventos importantes.
- Reglas privadas de alias y clasificación viven fuera de Git.
- El horizonte ampliado permite detectar eventos relevantes futuros sin convertir la home en un calendario completo.

### Gestor Eventos

- Contrato vigente: `agents/EVENTS.md`.
- Coordina logística de viajes, celebraciones y compromisos sin crear calendario ni contabilidad paralelos.
- Calendar/iCloud conserva fechas y horarios; tickets, reservas, emails y documentos permanecen en sus fuentes propietarias.
- Finanzas conserva presupuesto, provisiones y dinero libre.
- Estados operativos del gestor: `CONFIRMADO`, `PROPUESTO`, `PENDIENTE`, `CERRADO`.

### Hábitos

- HabitQuest está integrado de forma nativa.
- El Sheet original sigue siendo fuente de verdad.
- Lectura de hábitos, histórico y progreso.
- Marcar/desmarcar respetando Last-Write-Wins.
- Crear, editar, archivar/restaurar, eliminar y reordenar hábitos.
- Paridad funcional ampliada: vista lista/compacta, ordenación, separación pendientes/completados y activos/archivados, progreso diario, estadísticas 60/90 días, semana actual, heatmap de cinco semanas, logros y feedback de gamificación. La vista de gestión usa tarjetas densas con metadatos/chips, estadísticas y acciones secundarias discretas para evitar el aspecto administrativo inicial.
- La aplicación independiente HabitQuest se mantiene como fallback durante la validación; no se duplican su login Google, onboarding, tema independiente ni import/export XLSX.

### Salud — Gimnasio

- Salud contiene Médicos, Gimnasio y Nutrición.
- Médicos deriva de iCloud y es solo lectura.
- El plan de gimnasio vive en la fuente privada.
- Las sesiones y ejercicios registrados se persisten en D1.
- La UI recuerda la última carga real por ejercicio, permite borrar sesiones y muestra progreso.

### Salud — Nutrición

- Fuente privada `SEGUNDO CEREBRO - SALUD`.
- Pestañas lógicas: comidas reutilizables, registro planificado/consumido, objetivos, energía y menú semanal.
- La UI muestra consumido, gasto total, balance, objetivo, comidas e histórico cuando existen datos.
- Los macros se comparan explícitamente con sus objetivos vigentes.
- La web propone opciones de la base de comidas según los macros que faltan, identificándolas como sugerencias orientativas y sin sustituir el menú planificado.
- `MenuSemanal` está conectado como fuente propia; si no contiene filas, la UI lo indica sin inventar un menú.
- No se inventan objetivos nutricionales ni gasto ausente.
- Contrato vigente: `agents/HEALTH.md`.

### Despensa y suministros

- Gestor operativo: `GESTOR DESPENSA Y SUMINISTROS`.
- Contrato vigente: `agents/PANTRY.md`.
- Fuente privada canónica inicializada: `SEGUNDO CEREBRO - DESPENSA`.
- `Productos` es el catálogo maestro de identidad de producto, formato/EAN/URL y nutrición de producto disponible.
- `Inventario` es la fuente de disponibilidad física, cantidad aproximada, ubicación y confianza.
- `ListaCompra` contiene necesidades/candidatos de reposición.
- La web privada integra Despensa de forma nativa: Home recibe solo `pantrySummary` y el detalle se carga con `GET /api/pantry`.
- La vista Despensa incluye resumen humano, métricas, filtros por ubicación/categoría, búsqueda, tarjetas de inventario, lista `REVISAR → COMPRAR → COMPRADO`, coste estimado parcial/total y ficha de producto con precio, ticket, histórico, nutrición y enlace cuando exista.
- El Worker resuelve `SEGUNDO CEREBRO - DESPENSA` por título exacto mediante Drive y admite `PANTRY_SHEET_ID` como fallback privado; no se versiona el identificador.
- Salud no crea una base paralela de productos. `SEGUNDO CEREBRO - SALUD` mantiene ingesta, recetas, objetivos, menú y balance; puede referenciar `producto_id` de Despensa.
- Las recomendaciones de comida deben cruzar primero objetivo nutricional + inventario. Lo que falte o esté bajo se coordina con Despensa para `ListaCompra`.
- Nueva nutrición fiable de un producto existente se incorpora a `Productos` conservando el mismo `producto_id` cuando sea posible.

### Apple Health

- Salud dispone de una pestaña privada derivada `HistoricoResumen`: al consultar `/api/health/history`, el Worker vuelca únicamente agregados por rango (30/90/180/365/all) desde D1. Permite que GESTOR GYM Y NUTRI analice el histórico mediante el Sheet autorizado sin exponer ni duplicar las muestras crudas; D1 sigue siendo la fuente canónica.

Hay un único puente privado:

```text
Apple Watch / Apple Health / Zepp
→ Atajo único de iPhone
→ segundo-cerebro-health-ingest
→ Service Binding
→ segundo-cerebro
→ D1 privado
→ Salud / GESTOR GYM Y NUTRI
```

Estado:
- el puente energético original sigue operativo y compatible en `/v1/energy`;
- el flujo v2 de producción usa `/v1/sync` y está validado end-to-end con actividad + composición corporal;
- `health_energy_daily` se amplió con pasos, minutos de ejercicio, entrenamientos opcionales, timestamp de muestreo y detalle de fuentes;
- `health_body_samples` guarda muestras corporales normalizadas e idempotentes por tipo + timestamp original + fuente;
- `MedicionesCorporales` conserva el baseline histórico/manual y se amplió con IMC, masa magra, timestamp original e importación;
- `EnergiaDiaria` conserva el fallback manual y se amplió con pasos, minutos de ejercicio, entrenamientos y metadatos de muestreo;
- `ObjetivosActividad` ya contiene los objetivos operativos y la regla de no ajustar la comida 1:1 por kcal del reloj;
- Salud incorpora una pestaña `Resumen` convertida en cuadro de mando de recomposición con cuatro bloques: Composición corporal, Nutrición, Actividad y Rendimiento;
- el Resumen muestra peso de hoy, media 7 días, cambio semanal, grasa/IMC/masa magra, cintura cuando exista, kcal activa/reposo/total, pasos, actividad semanal, sesiones de fuerza y progreso frente a objetivos;
- `ObjetivosProgreso` alimenta objetivos de tendencia, cintura, nutrición, adherencia a fuerza, benchmarks de ejercicios y muscle-up;
- la UI no define un mínimo de kcal a quemar: el gasto del reloj se mantiene informativo;
- la media de peso usa promedios diarios y compara 7 días actuales frente a 7 anteriores;
- bioimpedancia se interpreta como tendencia;
- el gestor operativo es `GESTOR GYM Y NUTRI`;
- el Atajo del iPhone ya envía energía activa/reposo, pasos, minutos de ejercicio, peso, grasa corporal, IMC y masa magra;
- Zepp Life está confirmado como fuente de composición corporal;
- una referencia incorrecta heredada al duplicar bloques (`Body Fat Percentage` apuntando a `Weight`) fue detectada y corregida; el backend actualizó la misma muestra mediante UPSERT, sin dejar una muestra duplicada para ese timestamp;
- el refresh token de Google se renovó temporalmente usando el cliente OAuth existente de LITOS; queda pendiente crear un cliente OAuth dedicado de Segundo Cerebro.

## Fuentes de verdad

- Finanzas: fuente financiera externa; hoja derivada solo transporta estado normalizado.
- Calendario y citas: iCloud.
- HabitQuest: Google Sheet original.
- Ingesta, recetas, objetivos, menú y balance de Salud/Nutrición: Sheet privado de Salud.
- Identidad de productos, nutrición de producto, inventario y lista de compra: Sheet privado canónico de Despensa.
- Sesiones de gimnasio: D1.
- Actividad automática de Apple Health: D1 `health_energy_daily`.
- Composición corporal automática de Apple Health: D1 `health_body_samples`; baseline/manual en `MedicionesCorporales`.
- Código, arquitectura y contratos: Git.
- Secretos: configuración privada de Cloudflare/local, nunca Git.

## Privacidad

- No versionar cifras personales, eventos reales, históricos médicos, nombres privados de reglas, credenciales ni tokens.
- GitHub Pages debe seguir siendo mock.
- iCloud permanece de solo lectura.
- Las mutaciones privadas deben escribir exclusivamente en la fuente documentada para ese dominio.


## Gestor Padres

- Contrato vigente: `agents/PARENTS.md`.
- El módulo se instancia únicamente en la aplicación `private-remote`; GitHub Pages no crea el área Padres.
- D1 privado es la fuente operativa de `family_cases`, `family_case_actions` y `family_case_refs`.
- La UI separa Padre, Madre y Familiar/Patrimonial común y prioriza estado, prioridad, próxima acción, responsable, vencimiento, espera/bloqueo y última actualización.
- El detalle de caso muestra cronología breve y referencias mínimas a fuentes/documentos.
- Calendario, Finanzas y LITOS conservan sus fuentes de verdad; Gestor Padres no duplica esos datos.
- La home general recibe solo `familySummary`: conteos de atención/espera/decisión y próximo vencimiento, sin detalle sensible.
- Endpoints privados disponibles: listado/creación de casos, lectura/actualización por id, alta de acciones y alta de referencias.
- La sensibilidad de los casos se fija a `muy_confidencial` en esta fase.
- La estructura está preparada para cargar datos reales únicamente en runtime/D1 después del despliegue; ningún caso real vive en Git.


## Problemas o límites conocidos

- La caja de consulta sigue siendo principalmente una experiencia local del frontend; todavía no existe un asistente general con lenguaje natural conectado a todos los datos del sistema.
- La aplicación todavía no es una PWA offline.
- No todos los dominios previstos tienen contrato propio en `agents/`.
- La calidad del estado depende de que las fuentes privadas estén sincronizadas y reconciliadas.
- Apple Health v2 está validado end-to-end y la automatización diaria del Atajo está configurada a las 23:55; queda verificar una ejecución automática real y separar el OAuth de Google del proyecto LITOS.
- `MenuSemanal` está conectado pero actualmente no contiene filas de planificación; la pestaña Menú mostrará ese estado vacío hasta que el gestor de Salud escriba propuestas.

## Sistema visual

- En la portada oscura, los epígrafes/categorías de tarjeta usan naranja y todos los títulos e importes principales comparten la misma familia sans.

- La portada comienza su información operativa con dos tarjetas uniformes: Hábitos de hoy (clic → HabitQuest) y balance nutricional (consumidas, gastadas y objetivo; clic → Salud/Nutrición). El objetivo nunca se inventa: si no existe muestra `Pendiente`.

- La cabecera superior conserva saludo/fecha y control de tema. Se eliminaron el badge de estado privado, el avatar `SC`, el gran titular de portada y el indicador `Pulso general`; el primer bloque de contenido mantiene separación visual respecto a la línea inferior de la cabecera.

- El modo oscuro usa un sistema visual único azul noche + azul eléctrico + naranja.
- Tokens principales: fondo `#07101D`, superficie `#0B1728`, superficie secundaria `#10213A`, azul `#2F6BFF / #5FA8FF`, naranja `#FF7A1A / #FFB347`, texto `#F8FAFC`, muted `#A8B3C7`, borde `#1E3350`.
- En oscuro se unifica la tipografía en Avenir Next / Segoe UI / system sans; se elimina la mezcla de serif en títulos.
- El naranja queda reservado para énfasis, progreso, estados destacados y microinteracciones; el azul para navegación, acciones y estructura.
- Las áreas y módulos se restringen visualmente a la familia azul/naranja para evitar el mosaico multicolor anterior.

## Despliegue automático

- El Worker privado tiene workflow de producción en `.github/workflows/deploy-private-cloudflare.yml`.
- Un cambio relevante en `main` valida JavaScript, construye el bundle privado, comprueba que no entren archivos privados y ejecuta `wrangler deploy`.
- Los secretos de despliegue de Cloudflare ya están configurados en GitHub Actions.
- El 2026-09-23 se validó una ejecución real completa hasta producción.
- El flujo normal es ChatGPT/GitHub → commit a `main` → GitHub Actions → Cloudflare, sin `git pull` ni `npm run deploy` manuales.

### Configuración CI/CD completada

El deploy automático completo está activado con los *repository secrets* documentados:

- `CLOUDFLARE_API_TOKEN`: token de API de Cloudflare con permisos para editar/deployar Workers.
- `CLOUDFLARE_ACCOUNT_ID`: identificador de cuenta de Cloudflare.

Rutas oficiales:
- API Tokens: `https://dash.cloudflare.com/profile/api-tokens`
- GitHub: repositorio → Settings → Secrets and variables → Actions.

Reglas:
- nunca versionar ninguno de estos valores;
- nunca pegarlos en una conversación;
- los cambios relevantes en `main` se despliegan sin intervención local.

## Correcciones UX v0.24.0

- El contenido de escritorio vuelve a ocupar todo el ancho disponible a la derecha de la barra lateral; se elimina el tope visual de 1460 px.
- Modo claro y oscuro comparten la misma jerarquía tipográfica, tratamiento de tarjetas, controles, diálogos, navegación y acentos; cambia la paleta, no el nivel de acabado.
- La barra superior incorpora `Modo demo`: oculta visualmente cifras con `** **` sin modificar el estado ni las fuentes reales. Se mantiene solo durante la sesión del navegador.
- Despensa deja de depender de una lectura correcta del Sheet para existir en navegación/Home. Si la fuente privada falla, el módulo permanece visible con estado de conexión y reintento.
- Assets frontend versionados como `v0.24.0` para evitar caché obsoleta en cambios de navegación/estilo.

## Próxima acción exacta

Validar los dominios privados recién ampliados sin mover sus fuentes de verdad:

1. Verificar en producción la nueva vista Despensa: Home, filtros, ficha de producto, lista de compra y actualización automática desde el Sheet.
2. Verificar en producción el drilldown de Luz contra `LuzHistorico`, incluidos gráficos, comparativa interanual y presupuesto de la categoría.
3. Confirmar que una nueva fila futura de `LuzHistorico` aparece sin despliegue manual.
4. Confirmar en producción que Gestor Padres y su resumen minimizado de home siguen operativos.
5. Verificar la automatización diaria de Apple Health y completar el cliente OAuth propio de Segundo Cerebro.
6. Después retomar la validación de HabitQuest y poblar `MenuSemanal` cuando corresponda.

## Archivos que debe leer el siguiente relevo

- `AGENTS.md`
- `docs/HANDOFF.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PRIVACY.md`
- `docs/DECISIONS.md`
- `agents/FINANCE.md`
- `agents/EVENTS.md`
- `agents/HEALTH.md`
- `agents/HABITS.md`
- `private-cloudflare/README.md`
- `docs/APPLE_HEALTH_SHORTCUT.md`

No reconstruir el proyecto desde conversaciones antiguas salvo que se investigue una decisión histórica concreta.

- Despensa: si no existe `PANTRY_SHEET_ID` como secret, el Worker consulta primero el registro privado `IntegracionesPrivadas` y solo después intenta Drive search. La pestaña es oculta y contiene únicamente referencias de infraestructura; los datos reales siguen en el Sheet canónico de Despensa.


### Nutrición v0.25.0

- Corregido un bug del Modo demo: anteriormente instrumentaba todos los números con `<span>` incluso desactivado, interfiriendo con selectores visuales de Nutrición y provocando saltos de línea, badges falsos y tarjetas desproporcionadas.
- El Modo demo ahora enmascara texto únicamente cuando está activo y restaura el contenido original al desactivarlo, sin alterar la estructura DOM.
- Nutrición mantiene el Health dialog amplio, pero usa un ancho interno de lectura de hasta 1180 px.
- KPIs, objetivos, planes sugeridos, fuentes, comidas, formulario rápido e histórico tienen nueva escala tipográfica y espaciado responsive.
- Assets frontend: `v0.25.0`.
