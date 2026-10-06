
## GESTOR OBJETOS - ROPA 2 · referencias visuales resueltas en LookItems · 2026-10-02

- Para evitar que las imágenes de looks se generen a partir de descripciones genéricas, `GET /api/objects` resuelve ahora cada fila de `LookItems` contra la prenda canónica de `Armario`.
- Cada item de look expone dinámicamente `photoUrl`, `processedPhotoUrl`, `thumbnailUrl`, `originalPhotoUrl` y `visualReferenceUrl`, además de marca, subcategoría, color, patrón, vista y capa.
- No se añaden URLs duplicadas al Sheet: `LookItems` sigue conteniendo solo `look_id + objeto_id + rol`; las referencias siempre se obtienen de `Armario`, por lo que un overwrite de una prenda no deja referencias antiguas.
- Regla operativa nueva: antes de generar con IA una imagen de un look, cargar las referencias visuales reales de todos sus `LookItems`; los nombres y colores son solo apoyo y no deben sustituir a las imágenes canónicas cuando existen.

## MIDAS · laboratorio en tabla compacta · 2026-10-05

- El bloque «Comportamiento de los algoritmos» deja las tarjetas 3×N y pasa a un registro compacto por algoritmo.
- Cada grupo mantiene su cabecera y usa una tabla con columnas: Algoritmo, Actividad actual, Activos, Rentabilidad acumulada, Sesiones, Último cierre, DD y Evolución.
- La última columna contiene siempre una sparkline miniatura del NAV.
- En móvil no se reconvierte a tarjetas: la tabla conserva su estructura y permite scroll horizontal.

## MIDAS · actividad actual separada de rentabilidad · 2026-10-05

- El laboratorio visual muestra por algoritmo dos bloques distintos: **Actividad actual** y **Rentabilidad acumulada**.
- Actividad proviene del ledger canónico público de MIDAS y distingue posiciones abiertas, compras/órdenes pendientes, efectivo sin señal y espera de primera sesión; incluye hasta seis tickers visibles por tarjeta.
- La rentabilidad acumulada sigue viniendo exclusivamente del NAV/diario forward; una señal pendiente puede convivir correctamente con 0,00 % acumulado.
- Esto evita interpretar los primeros forecasts Weekly ML/TFM como algoritmos inactivos solo porque aún no existe P&L realizado.

# Handoff — Segundo Cerebro

## Gym · primera entrega visible de GIF · 2026-10-05

- PR #281 integrado: press de banca observado en producción con `v0.42.22`, botón `Ver GIF`, asset cargado 360×480, sin errores de consola y revisión de viewport móvil 390×844. No requiere buscarlo en wger.
- Segunda entrega: press militar con barra, mismo estilo y 16 fases transparentes. Prueba binaria de GIF verifica cada frame y póster de todos los assets publicados; los originales/contactos quedan en `design/gym-animations`, fuera del bundle servido. Los borradores rechazados se conservan localmente.
- Corrección de la captura del usuario: la biblioteca wger llama al ejercicio plano con barra `Press de Banca`, no como el nombre completo del plan. Se añade ese alias exacto revisado y regresión de la tarjeta real: debe mostrar GIF/Animación en vez del vídeo. Mancuernas, declinado e inclinado permanecen separados.
- PR #282 integrado y comprobado en producción: tarjeta y ficha `Press de Banca` cargan el GIF real, sin vídeo; `Press Militar → Ver GIF` carga el segundo asset. La miniatura 3:4 se contiene dentro del marco 4:3 mediante inset absoluto y object-fit, evitando recortar los pies. CSS `v0.42.24`.

- El press de banca plano con barra dispone de GIF anatómico propio de 16 fases, con póster para movimiento reducido. El resto se incorpora ejercicio a ejercicio tras revisión; no declarar todo el catálogo terminado.
- `Mi plan → Ver GIF` abre la animación local sin depender de búsqueda, enlaces ni disponibilidad de wger. Cerrar devuelve el foco al ejercicio. La biblioteca técnica sigue disponible por separado.
- La asociación visual exige nombre/ID exacto normalizado. Una ficha externa candidata no hereda el GIF de otro ejercicio por estar abierta desde ese plan.
- Los assets son ilustraciones orientativas, no una validación profesional de técnica. No se modifica `GimnasioPlan`, la pausa de entrenamiento ni sesiones/datos privados.
- Se incorporó `origin/main` hasta `a1ad6c7`, conservando los cambios concurrentes de Nutri, Despensa, MIDAS y Objetos. Assets de interfaz `v0.42.22`; 163 pruebas locales y build correctos antes de publicación.

## Última actualización

- **Fecha:** 2026-10-04
- **Herramienta:** ChatGPT
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

**Invariante operativo vigente:** Segundo Cerebro es data-driven. Los cambios rutinarios de datos/estado se hacen en la fuente canónica del dominio y deben reflejarse sin despliegue. Frontend/Worker solo se modifican por nueva capacidad, contrato/esquema, integración, validación/seguridad, bug, resiliencia/rendimiento o cambio deliberado de UI/arquitectura. Antes de tocar Git, todo gestor debe comprobar si la petición puede resolverse en la fuente canónica; si no es propietario de ella, enruta la intención al gestor correspondiente.

## Funcionalidad vigente

### Interfaz

- Dashboard responsive para Mac, iPhone e iPad.
- Modo claro/oscuro.
- Logo cerebral común en navegación y favicon.
- Thinking Orb vendorizado con estados de actividad.
- Vista semanal de agenda y eventos importantes; las decisiones se presentan dentro de su área propietaria, no como bloque independiente.
- Diseño móvil corregido para evitar overflow y apariencia de escritorio comprimido.
- La Home ya no muestra el bloque `Próximos movimientos`; los asuntos accionables siguen perteneciendo a sus dominios y no se eliminan de las fuentes.
- El menú semanal de Home usa una matriz día×momento a ancho completo: conserva todas las comidas reconciliadas en su celda, tipografía legible, altura automática por fila y scroll horizontal interno solo cuando el viewport no permite mostrar las siete columnas sin comprimirlas.
- La matriz usa únicamente tomas canónicas: los postres se integran en `Comida` o `Cena`, los snacks en `Media mañana` o `Merienda`, y cualquier `Cierre` se integra en `Cena`. El Sheet actual ya fue normalizado y el reconciliador pliega etiquetas legacy para impedir que reaparezcan filas `Postre`/`Snack`/`Cierre`.
- Escala tipográfica compartida aumentada para Home, navegación, calendarios, Salud y diálogos; los cambios de contenido siguen siendo exclusivamente data-driven desde las fuentes canónicas.

### Finanzas

### Finanzas · benchmark préstamo frente a inversión

- La fuente financiera privada incorpora la pestaña `PrestamoVsInversion` como contrato genérico para comparar dinero mantenido invertido con el coste efectivo de una deuda durante exactamente el mismo periodo.
- El Worker lee esta pestaña de forma opcional y la proyecta como `financeSummary.wealth.loanInvestmentBenchmarks`.
- Patrimonio muestra un resumen compacto con estado, rentabilidad de cartera, coste equivalente del banco, spread bruto y ventaja/desventaja neta tras costes.
- Al pulsar el resumen se abre un detalle con capital trazado, periodo, TAE, rentabilidad anualizada, costes iniciales, resultados monetarios, metodología, fuentes y limitaciones.
- Los datos concretos permanecen en el Sheet privado. El frontend y el Worker son genéricos: nuevos benchmarks compatibles se añaden o actualizan desde la fuente sin hardcodear cifras en Git.
- Un benchmark incompleto debe conservar `data_status=provisional` y explicar qué capital, fechas o valoraciones siguen pendientes.


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
- Fuente operativa canónica: `SEGUNDO CEREBRO - EVENTOS` (`Eventos`, `EventoHechos`, `EventoRefs`, `EventosImportantes`).
- Calendar/iCloud conserva autoridad sobre sus fechas y horarios; tickets, reservas, emails y documentos permanecen en sus fuentes propietarias.
- Finanzas conserva presupuesto, provisiones y dinero libre.
- Estados operativos del gestor: `CONFIRMADO`, `PROPUESTO`, `PENDIENTE`, `CERRADO`.
- La web/API de Eventos actúa como frontal del Sheet; D1 queda como fallback técnico/caché de transición.
- **Regla de consulta vigente:** toda pregunta sobre próximos eventos/agenda requiere leer el Sheet canónico y reconciliar todos los calendarios y fuentes autorizadas disponibles. No responder desde Google `primary`/Gmail ni desde un único proveedor. Consultar todos los calendarios iCloud/CalDAV, todos los calendarios Google accesibles y fuentes de confirmación (email/reservas/entradas/documentos) cuando existan. Si una fuente no se puede comprobar, marcar la respuesta como provisional.

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
- El contenido semanal se modifica exclusivamente en el Sheet privado. Cambiar una comida, moverla de día, sustituir un ingrediente o recalcular una ración no debe requerir tocar código; frontend y Worker permanecen genéricos.
- `MenuSemanal` es ahora autorreconciliable en runtime: la versión más reciente de una comida lógica gana, estados `omitido/retirado/cancelado` suprimen versiones antiguas, y componentes distintos del mismo momento se agrupan visualmente en una sola **toma**.
- Si faltan macros, el backend los completa desde `Recetas` solo cuando la receta tiene valores por ración utilizables. Si la receta o la nota indican que falta confirmar cantidades, el dato permanece pendiente y la UI muestra subtotal conocido sin inventar macros ni reutilizar ingredientes obsoletos.
- Esta regla está cubierta por tests y forma parte de `agents/HEALTH.md`; no volver a corregir a mano el mismo día para resolver duplicados visuales.
- No se inventan objetivos nutricionales ni gasto ausente.
- Las pausas temporales de fuerza se controlan desde `ObjetivosActividad`: `strength_sessions_week=0` suspende la exigencia, Adherencia la trata como dimensión ignorada y Gimnasio conserva el plan base pero deja de proponer/registrar sesiones hasta una fila efectiva posterior que reactive el objetivo.
- Salud incorpora `Recetas` como pestaña privada: lee `Recetas + IngredientesReceta + PasosReceta` y presenta foto, ingredientes y preparación sin inventar pasos.
- `Recetas` admite referencia privada de foto; el original vive en `DOCUMENTOS/SEGUNDO CEREBRO/AUXILIARES/RECETAS - FOTOS`.
- Producción detectó que el OAuth actual de Google responde 403 al descargar media Drive aunque sí lee Sheets. Para no hacer públicas las fotos ni exigir reautorización inmediata, la preview web privada vive en pestaña técnica oculta `RecipeMedia`; el Worker la sirve primero y usa Drive solo como fallback.
- Regla canónica de momentos del menú: `Postre` se guarda dentro de `Comida` o `Cena`; `Snack` dentro de `Media mañana` o `Merienda`; `Cierre` y `Cena · complemento` dentro de `Cena`. El Sheet actual fue normalizado y el runtime mantiene compatibilidad con escritores legacy.
- El alta futura de una receta es una mutación de datos: foto privada + filas canónicas en Salud. No requiere tocar frontend/Worker salvo cambio de capacidad o esquema.
- Contrato vigente: `agents/HEALTH.md`.
- Al abrir una nueva conversación `GESTOR GYM Y NUTRI`, reconstruir primero el estado vivo leyendo `Objetivos`, `ObjetivosActividad`, `ObjetivosProgreso`, `MenuSemanal` de la semana actual, `Registro` reciente y las tablas de recetas; cruzar productos/stock con `SEGUNDO CEREBRO - DESPENSA`. No trasladar valores personales actuales a Git ni depender del chat anterior.

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
- Implementado en código el espejo Apple Reminders ⇄ `ListaCompra` mediante un agente macOS Swift/EventKit, endpoints privados, enlaces/cola/auditoría D1 y campos de sincronización en el Sheet.
- `REVISAR` permanece interno; `COMPRAR` es recordatorio activo; `COMPRADO` es completado; `CANCELADO` se completa sin borrado destructivo. Completar nunca incrementa inventario.
- La portada muestra compra confirmada, primeros cinco artículos, coste conocido con prefijo `≥` si faltan precios y contador sin precio. Despensa ofrece acceso superior directo a la lista.
- El agente escucha cambios EventKit y reconcilia cada 90 segundos mediante `launchd`. Token en Keychain/Cloudflare Secret; el Mac no recibe OAuth Google.
- La activación real ya está operativa: `ListaCompra` contiene enlaces EventKit y sincronizaciones reales recientes. El procedimiento de instalación/diagnóstico sigue en `docs/APPLE_REMINDERS_SYNC.md`. Si Apple elimina un recordatorio ya conciliado como compra real, el estado `COMPRADO` prevalece y no se degrada a `CANCELADO`.

### Apple Health

- Salud dispone de dos superficies privadas derivadas desde D1 al consultar `/api/health/history`: `HistoricoResumen` (agregados por rango 30/90/180/365/all) y `ActividadDiaria` (detalle por día: kcal activa/reposo/total, pasos, ejercicio, workouts, cobertura y metadatos). Permiten que GESTOR GYM Y NUTRI analice tanto tendencias como un día exacto mediante el Sheet autorizado; D1 sigue siendo la fuente canónica y la ausencia de fila debe mostrarse como “sin sincronizar”, nunca como 0.

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
- `EnergiaDiaria` conserva el fallback manual y se amplió con pasos, minutos de ejercicio, entrenamientos y metadatos de muestreo; las filas explícitas de recuperación desde una exportación de Apple Salud se reconcilian idempotentemente hacia D1 y pueden sustituir un snapshot parcial del mismo día;
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
- El ámbito `Familiar / patrimonial común` incorpora una vista privada de patrimonio con activos conocidos, inversiones, deudas, neto conocido y partidas pendientes de valorar.
- La vista patrimonial privada añade gráficos de composición de inversiones, comparación visual activos/deuda y un bloque explícito de activos pendientes de valorar; no presenta el neto incompleto como patrimonio total definitivo.
- El detalle patrimonial se alimenta de la pestaña privada `PatrimonioPadres` de la fuente financiera y se fusiona con `family_wealth_items` de D1 para altas manuales; ningún importe real se versiona en Git ni entra en la demo pública.
- Inmueble del negocio y valor operativo del negocio se modelan como partidas distintas para evitar doble conteo; LITOS puede actuar como referencia, no como contabilidad duplicada.
- Para trámites con terceros, un acuse de recepción de documentación debe registrarse como evidencia de recepción y dejar el caso en `WAITING_EXTERNAL`; no debe interpretarse como aprobación ni como cambio ya efectivo. La resolución, subsanación o primer efecto verificable se registra como hito posterior en la fuente privada.


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


### Auditoría automática de producción

- Contrato operativo detallado: `docs/WEB_AUDIT.md`.
- Workflow único: `.github/workflows/web-audit.yml`; navegador: `private-cloudflare/scripts/web-audit.mjs`.
- Cadencia normal: auditoría completa al minuto 17 de cada hora. El mismo workflow tiene una oportunidad de respaldo al minuto 42 que solo ejecuta Chromium cuando GitHub no creó la primaria; no existe un segundo workflow horario.
- También se ejecuta una auditoría completa después de cada `Deploy private Cloudflare app` correcto y admite `workflow_dispatch`.
- La vigilancia se considera degradada si no existe un **Navigate and audit production = success** en los últimos 90 minutos y tampoco hay una auditoría completa en curso. Un heartbeat de respaldo con Chromium `skipped` no cuenta como auditoría completa.
- El auditor usa Chromium + Playwright contra `segundo-cerebro-web-audit` con OIDC GitHub temporal y Service Binding read-only.
- Comprueba estado privado, áreas y subpestañas, Calendar/eventos, MenuSemanal, deduplicación/estados, agrupación de tomas, subtotales, ausencia ≠ cero, barras kcal/proteína, APIs clave de otros dominios, JavaScript/CSP, red y 5xx.
- Añade QA visual estructural sobre producción: overflow, clipping, solapes, proporciones, deformación de imágenes, paleta/contraste light-dark y responsive en escritorio/tablet/móvil. No persiste screenshots privados. Una regresión visual reproducible puede ser autocorregida por el watchdog solo si la causa es presentacional inequívoca, con rama aislada + CI + deploy + rerun verde; si no, alerta.
- Finanzas queda cubierto también a nivel de texto interno en leyendas de liquidez: el auditor detecta colisiones entre líneas de filas adyacentes, no solo solapes de cajas. Las leyendas densas (>6 filas) usan altura natural y renuncian a líneas guía si hace falta para preservar legibilidad.
- `net::ERR_ABORTED` secundario por cambio de vista se clasifica como cancelación esperable; abortos críticos de `/api/state`, `/api/health` o `/api/nutrition` siguen siendo fallo.
- Un 5xx de fuente/backend debe diagnosticarse como tal antes de culpar a una pestaña que no llegó a renderizarse.
- No modificar datos privados ni lógica funcional para forzar un verde. Reproducir, clasificar y corregir la causa propietaria.
- Evidencia: GitHub Actions → `Audit production web` → job `audit` → step `Navigate and audit production`; buscar `[FAIL]`, `[SUMMARY]`, `[AUDIT_FAILED]` o `[AUDIT_OK]`.
- Incidente 2026-10-01: tras el `schedule` #20 dejaron de aparecer varios disparos horarios pese a que el workflow seguía válido/activo; se mitigó con cron primario `:17`, respaldo `:42` en el mismo workflow y watchdog externo `:45`. Ver `docs/WEB_AUDIT.md`.
- Incidente 2026-10-01 de fuentes: 502 persistentes en Objetos/Proyectos/Delta se corrigieron reduciendo llamadas a Google Sheets con `batchGet` y retry/backoff solo para lecturas idempotentes. El auditor también quedó alineado con la regla de barras de MenuSemanal: hoy/pasado con consumo muestra consumido; futuro muestra plan. Cierre: audit #46, 540/540 checks verdes.

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

## Objetos y armario

- Dominio principal: `OBJETOS`; propietario funcional `GESTOR OBJETOS Y ARMARIO`; contrato en `agents/OBJECTS.md`.
- Fuente canónica única: `SEGUNDO CEREBRO - OBJETOS`, registrada privadamente como `OBJECTS_SHEET_ID`; contrato vigente **v0.2**.
- `Armario` sigue siendo extensión por `objeto_id` y ahora admite foto original, procesada, miniatura, estado de procesado, vista, color/patrón visual, categoría, capa y actualización visual.
- Estados de procesado: `pendiente | procesada | revisar`. Capas: `superior | exterior | inferior | calzado | accesorio`.
- `GET /api/objects` devuelve inventario + armario visual + looks/kits/listas + facetas. `/api/state` mantiene solo `objectsSummary`.
- La UI privada incorpora **Armario visual**, filtros por categoría/marca/color/formalidad/temporada/oficina/frecuencia, ficha visual de prenda y **Combinador**.
- El filtro principal `Categoría` del Armario visual se alimenta de `Armario.categoria_visual`; `tipo_prenda`/`subcategoria` conserva el subtipo detallado para tarjetas, ficha y lógica específica.
- El combinador guarda exclusivamente en `Looks + LookItems` mediante `POST /api/objects/look`, validando IDs y roles contra el armario vigente.
- El procesado automático de imágenes todavía no existe: la arquitectura ya acepta `foto_original_url` y `foto_procesada_url`; una prenda sin recorte muestra placeholder y permanece `pendiente`.
- GESTOR EVENTOS y futuros flujos de viaje/oficina/clima deben referenciar los mismos `objeto_id/look_id/lista_id`; no copiar inventario.
- Modo claro/oscuro y responsive reutilizan los tokens actuales.
- Armario visual móvil: 2 columnas en teléfonos <430 px y 3 columnas en teléfonos anchos (≥430 px hasta tablet); en móvil se ocultan metadatos secundarios de la tarjeta para priorizar foto + nombre + categoría/marca-color, manteniendo el detalle completo al abrir.
- Assets del armario visual: `v0.40.0`.

## Navegación y Home v0.27.0

- La barra lateral es la navegación canónica de dominios.
- Se elimina de Home la parrilla duplicada `Áreas de tu vida` y la vista técnica `Sistema`.
- `Open Loops` deja de ser un área: sus asuntos viven en `Próximos movimientos`.
- `Objetivos` deja de ser un área: los objetivos se muestran dentro del dominio responsable; los objetivos transversales aparecen de forma compacta junto al foco operativo.
- Se dejan de mostrar puntuaciones 0–100 de área sin semántica homogénea.
- Finanzas abre directamente el presupuesto; Agenda lleva a la semana; Patrimonio/Salud/Hábitos/Despensa/Objetos/Padres abren sus vistas especializadas.
- Carrera, Pareja/Familia y Proyectos muestran en su detalle proyectos, pendientes y objetivos relacionados.
- Los indicadores del menú lateral se normalizan al sistema visual azul/naranja; se elimina la dependencia del mosaico multicolor.
- El icono visual de OBJETOS pasa a `◈` para no duplicar el de Pareja.
- Se elimina del frontend el código muerto de `renderAreas`, `renderSystemMap` y `setView`.
- Assets frontend: `v0.27.0`.

## Consulta rápida móvil v0.28.0

- Corregido el solape del orbe en móvil: el componente real `thinking-orb#system-orb` se oculta por debajo de 760 px.
- La tarjeta pasa de “¿Qué necesitas?” a `Consulta rápida`, explicando que sirve para consultar estado o abrir módulos.
- Añadidos chips ejecutables: `Qué tengo hoy`, `Abrir despensa`, `Nutrición hoy`, `Ver presupuesto`, `Abrir objetos`.
- Las órdenes rápidas abren directamente Despensa, Objetos, Nutrición, Hábitos, Presupuesto, Patrimonio, Padres o Agenda.
- `Qué tengo hoy` resume eventos del día y progreso de hábitos cuando están disponibles.
- La búsqueda genérica permanece como fallback para coincidencias simples.
- Las tareas complejas siguen correspondiendo a los gestores especializados; esta barra no pretende ser un chat multiagente.
- Light/dark comparten estilos y los chips son scrollables horizontalmente en móvil.
- Assets frontend: `v0.28.0`.

## Registro de Proyectos v0.29.0

- Nueva fuente privada canónica: `SEGUNDO CEREBRO - PROYECTOS`.
- Pestañas: `Proyectos`, `Documentacion`, `Relaciones`, `README`.
- El catálogo real queda fuera de Git público.
- Nuevo contrato: `agents/PROJECTS.md`.
- Nuevo endpoint privado: `GET /api/projects`.
- `/api/state` recibe únicamente `projectsSummary`; `/api/health` solo contadores técnicos.
- El área `Proyectos` del menú abre una vista propia con `Resumen · Todos · Relaciones`.
- Cada proyecto puede mostrar estado, prioridad, área, tipo, resumen, siguiente acción, repositorio, documentación, web, responsable, subproyectos y documentación estructurada.
- La búsqueda permite filtrar por texto, estado y área.
- Los enlaces privados se leen desde la fuente privada, no desde código.
- El registro inicial incluye los proyectos que el usuario ha identificado y documentación marcada como parcial/pendiente cuando no existe evidencia suficiente.
- Las relaciones permiten conectar proyectos con dominios sin duplicar datos; por ejemplo, sistemas de inversión pueden relacionarse con Finanzas/Patrimonio sin copiar contabilidad.
- Assets frontend: `v0.29.0`.

## Tipografía móvil Home v0.29.1

- Ajuste exclusivamente tipográfico; no cambia estructura, orden, grids ni tamaño de las tarjetas.
- En móvil se aumentan claramente títulos, cifras principales, etiquetas KPI, textos secundarios y CTA de Home.
- Afecta a Hábitos, Nutrición, Despensa, Objetos, Finanzas, Patrimonio, Deudas, Próximos movimientos y Agenda.
- Se mantiene paridad visual light/dark mediante los mismos componentes y tokens.
- Asset CSS: `v0.29.1`.

## Salud · Adherencia mensual v0.30.0

- Nueva pestaña privada `AdherenciaManual` en `SEGUNDO CEREBRO - SALUD`.
- Nueva vista `Salud → Adherencia`.
- Nuevo endpoint `GET /api/health/adherence?month=YYYY-MM`.
- Motor centralizado en `private-cloudflare/src/adherence.js`.
- Fuentes combinadas: Registro/Objetivos/ObjetivosActividad/MenuSemanal, Apple Health/D1, gym D1 y HabitQuest.
- Estados diarios: `CUMPLIDO`, `PARCIAL`, `NO_CUMPLIDO`, `SIN_DATOS`; días futuros quedan fuera del cálculo.
- Una fila válida de `AdherenciaManual` prevalece sobre la heurística.
- Resumen: cumplidos, parciales, no cumplidos, sin datos, adherencia %, cobertura, racha actual/mejor y comparación laborables/fin de semana.
- El detalle diario explica kcal, proteína, pasos, gym, hábitos y motivos.
- Mobile: semanas presentadas como tarjetas legibles manteniendo visión mensual; desktop usa calendario + panel de detalle.
- Light/dark comparten la misma semántica visual.
- Assets frontend: `v0.30.0`.

## Anillos de progreso compartidos v0.31.0

- Nuevo componente común `app/progress-ring.js`.
- Home:
  - Hábitos sustituye la barra horizontal por anillo diario.
  - Nutrición sustituye la barra horizontal por anillo kcal; si se supera el objetivo de forma real, el anillo cambia a tono de aviso.
- Hábitos:
  - la vista diaria reutiliza el mismo anillo común, eliminando una implementación visual aislada.
- Nutrición:
  - los objetivos kcal/proteína/hidratos/grasas se muestran como tarjetas compactas con anillos en vez de cuatro barras largas.
- Salud:
  - Nutrición, Actividad y Fuerza usan anillos compactos en el resumen.
  - Recomposición sigue como texto porque no existe un porcentaje único honesto.
- Adherencia:
  - el porcentaje mensual usa el mismo componente.
- No se aplican anillos a Despensa, Objetos, deuda o cifras financieras por el mero hecho de ser números.
- Modo demo neutraliza también el arco de progreso para que no revele porcentajes aproximados.
- Assets frontend: `v0.31.0`.

## Orbe móvil seguro v0.32.0

- Se corrige la regresión introducida en v0.28 que ocultaba el Thinking Orb en pantallas móviles con `display: none !important`.
- El orbe vuelve a mostrarse en móvil:
  - tamaño interno real de 64 px;
  - situado en la esquina superior derecha del bloque de consulta rápida;
  - `pointer-events: none` para no capturar toques;
  - el bloque de texto reserva espacio específico para que nunca se solape;
  - input, botón y sugerencias siguen ocupando el ancho completo debajo.
- Desktop conserva el tamaño de 96 px.
- El cambio de tamaño se sincroniza con `matchMedia("(max-width: 760px)")`, por lo que también funciona al rotar/cambiar viewport.
- Light y dark comparten exactamente el mismo layout.
- Assets frontend: `v0.32.0`.

## Compatibilidad iOS de anillos v0.32.1

- Los anillos estaban implementados y presentes en `main`, pero el arco dependía de `calc(var(--ring-progress) * 3.6deg)` dentro de `conic-gradient`.
- Se sustituye por `--ring-fill: NN%`, compatible de forma más robusta con Safari/iOS.
- Se mantiene `--ring-progress` por compatibilidad interna, pero el render visual usa porcentaje directo.
- Se sube ligeramente el contraste del track.
- Se fuerzan nuevos asset versions para evitar que Safari reutilice JS/CSS previos.
- Assets frontend: `v0.32.1`.

## Decisiones contextuales v0.33.0

- Eliminado de Home el bloque independiente `3 decisiones abiertas` que aparecía debajo de la agenda.
- `DECISION` se conserva en el estado global y en la búsqueda rápida.
- Carrera, Pareja/Familia y otras áreas genéricas muestran sus decisiones abiertas junto a pendientes, proyectos y objetivos.
- Proyectos recibe las decisiones abiertas de `area-projects` y las muestra en su workspace; cuando el nombre/alias del proyecto coincide de forma inequívoca, también aparecen en el detalle del proyecto.
- Una decisión solo se eleva a `Próximos movimientos` cuando tiene `nextAction`, `dueDate` o `dueAt`.
- El contador de `Próximos movimientos` pasa a reflejar elementos accionables, no todas las decisiones existentes.
- Se elimina CSS y código muerto del antiguo bloque standalone.
- Assets frontend: `v0.33.0`.

## Evolución a Cerebro Global

- Se formaliza `CEREBRO GLOBAL` como interfaz principal futura.
- Nuevo contrato: `agents/COORDINATOR.md`.
- Nueva hoja de ruta: `docs/EVOLUTION_GLOBAL_BRAIN.md`.
- Objetivo: el usuario habla con un único coordinador; este enruta a Finanzas, Eventos, Salud, Hábitos, Despensa, Objetos, Padres, Proyectos y futuros módulos.
- Los gestores especializados conservan propiedad semántica y fuentes de verdad, pero dejan de requerir una conversación elegida manualmente.
- La transición no borra los chats actuales: quedan como mantenimiento/fallback hasta cubrir lectura, mutaciones y recuperación de errores.
- Prioridad siguiente:
  1. registro estructurado de capacidades de gestores;
  2. Context Planner;
  3. composición multi-dominio de solo lectura;
  4. después mutaciones coordinadas con confirmación.
- Motivación adicional: evitar conversaciones monolíticas muy largas y lentas; la continuidad debe depender del sistema/documentación, no del historial completo del chat.

## Botón Actualizar en cabecera v0.34.1

- Nuevo control global `Actualizar` en la cabecera.
- Desktop: botón textual `↻ Actualizar`.
- Móvil: botón circular con icono `↻` para conservar espacio.
- Al pulsarlo se recarga la aplicación y, durante el nuevo arranque, se vuelven a consultar el estado privado y sus fuentes conectadas.
- El control queda visible también en modo Demo (`data-demo-unmasked`).
- Mientras se inicia la recarga, el botón se deshabilita y el icono gira como feedback.
- No modifica navegación ni estructura de Home.
- Assets frontend: CSS `v0.34.1`, JS `v0.34.5`.

## Próxima acción exacta

Validar en producción la navegación simplificada y los dominios privados:

1. Confirmar que ya no aparece `Áreas de tu vida / Sistema` al final de Home.
2. Confirmar que `Open Loops` y `Objetivos` ya no aparecen en el menú lateral.
3. Probar navegación: Finanzas → presupuesto, Agenda → semana, Patrimonio/Salud/Hábitos/Despensa/Objetos/Padres → detalle.
4. Verificar que Carrera, Pareja/Familia y Proyectos muestran sus pendientes/proyectos/objetivos asociados.
5. Continuar después con validaciones funcionales pendientes de Despensa, Luz, Apple Health y HabitQuest.

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


## Eventos + Histórico v0.34.0

Implementado un dominio persistente de Eventos:

- nueva entrada `Eventos` en la navegación privada;
- botón `Ver histórico` en el bloque de Eventos importantes de Home;
- tarjetas de eventos pulsables;
- workspace con activos/en curso e histórico;
- ficha agregada con Finanzas, Nutrición/actividad por fechas, lista de OBJETOS, crónica, referencias y balance final;
- Home deja de tratar compromisos puramente financieros como eventos;
- eventos finalizados salen automáticamente de Home cuando termina su fecha y permanecen en el histórico;
- API privada `/api/events` y subrutas de detalle/hechos/referencias;
- desde 04/10/2026 la fuente canónica es `SEGUNDO CEREBRO - EVENTOS`; el Worker resuelve su ID mediante `EVENTS_SHEET_ID` en `IntegracionesPrivadas`;
- sincronización iCloud → Sheet de solo lectura durante `/api/state`; no se escribe en iCloud;
- las tablas D1 `event_records`, `event_facts`, `event_refs` permanecen como fallback/espejo técnico de transición;
- `eventsSummary` minimizado en el estado general.

No se ha hardcodeado ningún viaje real en Git. Los eventos reales aparecen por reglas privadas + iCloud y sus gestores pueden enriquecer la crónica mediante la API.

Assets frontend: `v0.34.0`.

### Validación pendiente

1. CI: sintaxis, build y dry-run del Worker.
2. Producción: comprobar que `Eventos` aparece en barra lateral.
3. Abrir una tarjeta activa desde Home y revisar ficha agregada.
4. Verificar que una lista de OBJETOS con `evento_ref` se resuelve en la ficha.
5. Tras finalizar un evento, confirmar que desaparece de Home y figura en Histórico sin perder hechos.


## Hotfix de carga privada v0.34.1

- La captura posterior a v0.34.0 mostró el dashboard detenido en el esqueleto inicial: `/api/state` podía bloquear toda la inicialización mientras esperaba integraciones externas.
- `/api/state` ahora consulta Finanzas, HabitQuest, Nutrición, Despensa, Objetos, Proyectos, iCloud y resumen familiar en paralelo con límites de latencia.
- Una fuente lenta degrada su propio estado a `timeout/error` sin impedir que el resto del estado privado llegue al navegador.
- La persistencia y el resumen de Eventos son best-effort y tienen límites propios; nunca deben bloquear Home.
- El cliente aborta la carga inicial del estado privado a los 9 s como última salvaguarda y continúa renderizando en vez de quedar eternamente en `Cargando…`.
- Si esa salvaguarda entra, el lateral muestra `Modo privado · Conexión temporalmente no disponible` en lugar de aparentar una carga infinita.
- Assets frontend: `v0.34.1`.


## Hotfix de arranque iPad v0.34.2

- La segunda captura de iPad mostró que el problema no era solo latencia de `/api/state`: a las 20:04 el encabezado seguía mostrando `Buenos días`, prueba de que `app.js` no había llegado a ejecutar `init()`.
- El único módulo estático nuevo introducido por v0.34.0 era `events.js`. Un fallo de carga/parseo de cualquier import estático impide arrancar todo el grafo ES modules.
- `events.js` deja de ser dependencia estática del bootstrap. Se carga con `import()` únicamente al abrir Eventos/Histórico o una ficha.
- El área Eventos se puede construir desde `eventsSummary` sin importar el módulo de detalle.
- Si Eventos fallara en un navegador concreto, el dashboard principal continúa operativo y solo se degrada ese módulo.
- Se fuerza URL nueva para `app.js` y para el import dinámico de Eventos.
- Assets frontend: `v0.34.2`.


## Hotfix Eventos iPad v0.34.3

- Confirmado por captura: el dashboard ya arranca en iPad, pero la carga bajo demanda de `events.js` falla y activa el fallback "Módulo temporalmente no disponible".
- Para eliminar por completo esa dependencia de Safari/asset-loading, la UI de Eventos se integra ahora en `app.js`.
- `events.js` deja de ser necesario para el flujo de usuario en producción; la API privada y D1 no cambian.
- Se mantienen activos/histórico, ficha de evento, Finanzas, Nutrición, OBJETOS, crónica, referencias y balance final.
- El objetivo de este hotfix es evitar cualquier fallo por carga de un segundo módulo ES en iPad.
- Assets frontend: `v0.34.3`.


## Hotfix ciclo de vida Eventos v0.34.4

- La UI de Eventos ya cargaba correctamente en iPhone, pero el contador mostraba `En curso = 0` durante un viaje activo.
- La causa era de datos, no de render: D1 solo persistía eventos de iCloud que coincidían con una regla explícita. Un viaje real podía aparecer en Home por Finanzas y no existir todavía en el ledger histórico.
- El Worker ahora reconoce también eventos inequívocos de calendario por semántica de viaje/cumpleaños/celebración, sin convertir recordatorios financieros ordinarios en eventos.
- La vista Eventos mezcla los registros persistidos con el calendario iCloud vivo antes de calcular `Activos / En curso / Histórico`, por lo que el evento actual se refleja inmediatamente aunque el upsert de D1 sea best-effort.
- Histórico vacío ya explica que todavía no existen eventos cerrados guardados desde la activación del ledger; no implica un error de carga.
- Assets frontend: `v0.34.4`.


## Finanzas · Liquidez por cuenta + composición patrimonial v0.35.0

- Nueva visualización en Finanzas para separar, por cuenta, saldo actual, dinero ya reservado y dinero libre.
- Contrato privado opcional:
  - `Cuentas`
  - `ReservasCuenta`
- Cada cuenta se representa mediante una barra horizontal segmentada. La parte libre se deriva como saldo menos reservas cuando no existe `free_amount` explícito.
- Si reservas + libre superan el saldo, la UI marca una discrepancia de conciliación.
- Patrimonio incorpora una composición vertical segmentada tipo vault/cilindro por custodio o plataforma.
- Contrato privado opcional: `PatrimonioDetalle`.
- La vista patrimonial agregada mantiene las curvas históricas existentes y añade la distribución actual sin sustituir las apps de inversión.
- Ningún saldo, nombre de cuenta real ni cifra patrimonial queda hardcodeado en Git.
- El Gestor de Finanzas es responsable de mantener estas asignaciones cuando cambien saldos, provisiones o ubicaciones patrimoniales.
- Assets frontend: `v0.35.0`.


## Finanzas · Liquidez por cuenta — barras apiladas v0.35.1

- Sustituida la representación horizontal por una gráfica dinámica de barras apiladas verticales.
- Se muestra una barra por cuenta, alimentada exclusivamente por `Cuentas` + `ReservasCuenta`.
- Encima de cada barra aparece el saldo actual; cada franja representa una reserva/compromiso y el remanente se muestra como `Libre`.
- La leyenda lateral muestra destino, importe y porcentaje sobre el saldo.
- Cuando los compromisos superan el saldo, la barra conserva todos los compromisos y dibuja una línea de saldo real para visualizar el déficit sin falsear cifras.
- Las reservas con estado terminal (`executed`, `paid`, `released`, `closed`, `completed`, `cancelled`) dejan de entrar en la visualización.
- Responsive: 4 barras en escritorio ancho, 2 en viewport intermedio y 1 por fila en móvil.
- No se hardcodean saldos ni destinos en frontend; la visualización se recalcula al refrescar datos privados.
- Assets frontend: `v0.35.1`.



## Hotfix Finanzas · SVG CSP-safe v0.35.4

- Causa raíz de las barras verticales vacías: la app privada aplica CSP `style-src 'self'`; los porcentajes se estaban escribiendo mediante atributos `style=""` inline y el navegador los bloqueaba.
- Se elimina por completo la geometría basada en estilos inline.
- La barra de liquidez se renderiza ahora como SVG dinámico: cada reserva es un `rect` con `y` y `height` numéricos calculados en JavaScript; la línea de saldo en casos de overflow es un `line` SVG.
- Los colores siguen viniendo de CSS externo permitido por CSP.
- Verificación previa al cierre: render headless en Chromium con los importes reales conocidos de Openbank Miguel (191,42 €) y Openbank Andrea (150,95 €); ambas barras aparecen completamente rellenas y segmentadas, y Andrea muestra la línea de saldo real en el punto correcto.
- Despliegue privado de Cloudflare completado correctamente.
- Assets frontend: `v0.35.4`.


## Navegación + visualización financiera v0.36.0

- La navegación deja de ser plana:
  - Agenda → Eventos.
  - Familia → Padres.
  - Salud → Hábitos.
  - Objetos → Despensa.
- Los cumpleaños simples permanecen en Agenda/calendario y no se incorporan a Eventos. Solo aparecen en Eventos cuando el propio registro describe un plan concreto (comida, cena, fiesta, quedada, etc.).
- ORGANIZADOR no mantiene estado financiero paralelo: consume `Cuentas`, `ReservasCuenta` y `PatrimonioDetalle` preparados por GESTOR FINANZAS.
- Liquidez usa barras verticales rectangulares 2D de altura fija. Las retenciones existentes con `kind=card_hold` se separan visualmente de otros compromisos sin duplicar datos.
- El 100% de cada barra es el saldo actual. El exceso de compromisos se muestra como alerta y no se dibuja fuera del saldo.
- Patrimonio usa una barra horizontal apilada 2D y tarjetas por plataforma. `PatrimonioDetalle` es el total/distribución actual mostrado; el histórico de `Patrimonio` conserva su función temporal.
- Paleta de segmentos: estilo Activity/Fitness con colores vivos.
- Assets frontend: `v0.36.0`.


## Liquidez · líneas guía y paleta única v0.36.1

- Cada franja de la barra vertical de liquidez queda conectada con su etiqueta mediante una línea guía minimalista.
- La leyenda se ordena de arriba abajo igual que la barra, evitando cruces visuales.
- Las líneas solo conectan segmentos realmente dibujados dentro del saldo; los compromisos fuera de saldo se mantienen en texto sin fingir una franja.
- Los compromisos reciben colores por índice con una paleta de 12 tonos vivos y no repiten color dentro del mismo bloque mientras haya colores disponibles.
- `Retenciones bancarias` y `Libre` conservan colores dedicados y distintos de los compromisos.
- En móvil se ocultan las líneas guía para evitar saturación, manteniendo la leyenda normal.
- Assets frontend: `v0.36.1`.


## Liquidez · fecha de cobro en ítems v0.36.2

- Los compromisos muestran la fecha de cobro dentro del propio ítem cuando Finanzas ya dispone de ella.
- La UI prioriza campos estructurados opcionales (`charge_date`, `due_date`, `billing_date`, `charge_day`) y, mientras no existan, interpreta expresiones canónicas ya presentes en `note`: `cobro previsto DD/MM/YYYY`, `próximo cargo esperado DD/MM/YYYY`, `día N` o `alrededor del día N`.
- No se inventa una fecha cuando no existe información suficiente.
- La fecha aparece compacta bajo el importe, por ejemplo `Cobro: 30 sept`, `Cobro: día 4` o `Cobro: aprox. día 29`.
- ORGANIZADOR sigue siendo de solo lectura respecto al estado financiero.
- Assets frontend: `v0.36.2`.


## Apple Health nativo · HealthKit bridge

Estado 2026-09-28:

- Implementada `ios/SegundoCerebroHealthBridge`, app SwiftUI mínima para reemplazar la lógica manual de Atajos.
- Mantiene una única canalización: HealthKit → ingest Worker existente → Service Binding → Worker privado → D1.
- Reutiliza `HEALTH_INGEST_TOKEN`; el valor no está en Git y la app lo guarda en Keychain.
- Sincroniza hoy + ayer de forma idempotente.
- HealthKit:
  - actividad: energía activa/basal, pasos, ejercicio y workouts;
  - cuerpo: peso, grasa, IMC y masa magra;
  - recuperación: FC reposo, FC caminando, HRV SDNN, respiración, SpO₂, VO₂ máx., temperatura de muñeca;
  - sueño: asleep/in-bed/awake/Core/Deep/REM cuando existen.
- Añadida tabla privada `health_recovery_daily`; ausencia de señal = `null`, nunca cero inventado.
- `GET /api/health/history` expone también `recovery` para consumo privado posterior.
- El Worker de ingesta pasa a desplegarse automáticamente con el workflow privado.
- CI del backend valida sintaxis/build/Wrangler; CI iOS compila el proyecto con Xcode y sin firma.
- El Atajo actual permanece activo como fallback. No retirarlo todavía.

### Punto de intervención humana

No es necesario que el usuario edite código ni construya Atajos. El código y backend ya pueden prepararse sin intervención.

Antes de considerar el bridge una sustitución permanente hay que comprobar el Team de Xcode: un `Personal Team` gratuito expira a los 7 días y solo sirve para la prueba inicial. No desactivar el Atajo por ese motivo hasta decidir una vía de firma sostenible.

La primera intervención irreductible es:

1. abrir `ios/SegundoCerebroHealthBridge/SegundoCerebroHealthBridge.xcodeproj` en Xcode;
2. elegir su Apple Development Team y ejecutar la app en su iPhone;
3. introducir una vez el token existente `HEALTH_INGEST_TOKEN` recuperándolo localmente del Atajo actual, sin compartirlo;
4. conceder permisos de lectura de Salud;
5. pulsar `Sincronizar ahora` una vez y comunicar el resultado de Diagnóstico.

Después de esa primera sincronización se debe verificar D1/dashboard antes de retirar la automatización antigua.

## MIDAS en Segundo Cerebro · v0.37.5

- La aplicación privada abre el informe desde la ficha Proyectos → MIDAS → «Ver informe diario» y también desde la tarjeta Patrimonio → «Ver MIDAS» de la pantalla principal. Ambos accesos muestran las 31 líneas catalogadas: 9 carteras demo estadounidenses, 4 adaptaciones TFM EUR, el genético original con diario privado aún no enlazado y 17 ideas pendientes, incluida TimesFM como hipótesis de investigación.
- Por fila se ve estado, último cierre, variación del último día, acumulado y capital ficticio si existe. `—` significa dato ausente, no 0 %.
- `GET /api/midas` lee el informe público de `mamg97/midas-paper-lab` bajo Cloudflare Access y mantiene caché de cinco minutos. Pages no muestra datos MIDAS.
- Los workflows existentes de Madrid y EE. UU. actualizan el mismo informe. No se añade una Action periódica.
- En el primer día, antes de dos cierres, la variación diaria permanece vacía. El genético original conserva su diario privado fuera de este informe.
- El genético original S&P 500 aparece como primera sección del informe, con su diario privado marcado como no enlazado. La estrategia `genetic_frozen` de ocho acciones es una adaptación nueva y separada; sus resultados no se atribuyen al agente original.
- Cada fila muestra «Origen», derivado del catálogo público: TFG 2021, TFM, MIDAS Python, agente genético, experimentos históricos o campaña nueva de 2026. El origen no implica que una adaptación sea una réplica literal del código antiguo.
- Se ha preparado la conexión privada del diario genético original: el workflow propio envía solo su curva de capital ficticio a `segundo-cerebro-midas-ingest` con GitHub OIDC; D1 la sirve únicamente en el panel privado. Hay que verificar el primer envío y el valor mostrado. El diario bruto sigue fuera del repositorio público.
- La rentabilidad que aparecerá para ese agente procede del diario simulado original, que anotaba operaciones al cierre de la señal. La UI advierte de esa limitación; no se presenta como operación real ni como prueba de que el algoritmo sea rentable al ejecutarlo.


## Home · estado visual de cuentas y patrimonio v0.37.6

- El resumen principal de **Dinero** incorpora una versión compacta de la visualización de liquidez ya existente:
  - una mini barra vertical segmentada por cada cuenta;
  - saldo actual;
  - dinero libre;
  - retenciones cuando existen;
  - exceso/falta si los compromisos superan el saldo.
- La mini visualización consume exactamente `monthlyBudget.liquidityAccounts`; no mantiene una segunda lógica ni un segundo estado financiero.
- El modelo de segmentos se centraliza en `liquidityVisualModel()` y lo reutilizan tanto Home como el detalle de Liquidez.
- El resumen principal de **Patrimonio** muestra ahora:
  - patrimonio total;
  - barra horizontal 2D apilada por plataforma;
  - leyenda compacta con plataforma, porcentaje e importe.
- Patrimonio Home consume la misma colección `wealth.allocation` / `PatrimonioDetalle` que el detalle completo.
- Las visualizaciones son compactas y responsive: 4 cuentas en escritorio, 2×2 en anchuras menores.
- No se han añadido datos financieros ni nuevas fuentes; el cambio es exclusivamente de presentación.
- Assets frontend: `v0.37.6`.


## Home · jerarquía financiera v0.37.7

- **Dinero · Este mes** pasa a ocupar una fila completa del resumen financiero.
- Dentro de Dinero, el resumen presupuestario ocupa la zona izquierda y **Estado de cuentas** la derecha en escritorio, permitiendo leer las 4 cuentas con barras más grandes.
- Las mini barras de cuenta aumentan a 34×112 px en escritorio y conservan exactamente el mismo modelo canónico de liquidez.
- La segunda fila queda en dos columnas: **Patrimonio** a la izquierda y **Deudas** a la derecha.
- En móvil el orden es Dinero → Patrimonio → Deudas.
- Responsive:
  - >1180 px: Dinero en composición horizontal interna;
  - 901–1180 px: Dinero apila resumen + cuentas, manteniendo las 4 cuentas en una fila si caben;
  - ≤900 px: Patrimonio y Deudas pasan a una columna;
  - ≤520 px: las cuentas pasan a una columna.
- No cambia ningún dato ni contrato financiero; solo layout y escala de presentación.
- Assets frontend: `v0.37.7`.


## Finanzas · sincronía resumen/detalle v0.37.9

- El resumen financiero de Home y el detalle de liquidez siguen una única fuente: `monthly.liquidityAccounts`.
- Ambos proyectan las cuentas mediante `liquidityVisualModel()`; no existe un segundo estado financiero independiente para Home.
- La etiqueta del resumen pasa de **Falta** a **Pendiente de cubrir**, igual que en el detalle.
- Las reservas con estado terminal (`executed`, `paid`, `closed`, etc.) se excluyen en backend y desaparecen automáticamente tanto del resumen como del detalle al refrescar.
- Corrección de dato operativo: el seguro de moto de 183 € corresponde al ciclo anterior; el dinero repuesto ya forma parte del saldo BBVA actual y no debe contarse como compromiso del ciclo 20/09–20/10.
- Assets frontend: `v0.37.9`.


## Salud · menú semanal visual + Home v0.38.0

- Rediseñada la pestaña **Salud → Menú** como tablero semanal de tarjetas, sustituyendo la lista plana.
- Cada día muestra:
  - comidas planificadas;
  - kcal estimadas por comida;
  - proteína estimada por comida;
  - total diario planificado;
  - progreso de kcal frente al objetivo activo de `Objetivos`;
  - progreso de proteína frente al objetivo activo de `Objetivos`;
  - kcal/proteína que quedan por completar o exceso cuando proceda.
- No se hardcodean objetivos: la UI utiliza `data.objective.kcal` y `data.objective.protein` del contrato de Nutrición.
- El menú planificado sigue separado del registro real: ninguna comida del menú se trata como consumida.
- Añadido a **Home**, inmediatamente después del bloque de Agenda/Calendario, un resumen semanal con las mismas comidas, kcal, proteína y barras de cobertura.
- La Home reutiliza la llamada existente a `/api/nutrition`; no añade una segunda petición ni un nuevo estado.
- El CTA **Ver menú completo** abre Salud directamente en la pestaña Menú.
- En escritorio la semana se presenta como rejilla; en móvil pasa a carrusel horizontal con scroll-snap.
- Assets frontend: `v0.38.0`.


## Finanzas · compactación móvil de cuentas v0.38.2

- Corregido el desaprovechamiento de espacio de **Estado de cuentas** en Home móvil.
- Las cuatro cuentas siguen apiladas una por fila para conservar legibilidad, pero cada tarjeta pasa a una composición horizontal compacta:
  - identidad + disponible bancario a la izquierda;
  - barra segmentada en el centro;
  - saldo total / libre interno / retenido / pendiente de cubrir a la derecha.
- La barra móvil baja de 118 px a 92 px de alto; las tarjetas eliminan el gran vacío lateral/vertical sin perder ninguna métrica.
- En pantallas ≤380 px se aplica una variante aún más estrecha.
- El modelo financiero y los cálculos no cambian; es únicamente una corrección responsive.
- Asset CSS: `v0.38.2`; JS permanece `v0.38.1`.


## Finanzas · 2 cuentas por fila en móvil v0.38.3

- **Estado de cuentas** en Home pasa a una rejilla de **2 columnas** en móviles de hasta 520 px.
- Cada tarjeta se adapta a media anchura:
  - cuenta + disponible bancario arriba;
  - barra segmentada compacta;
  - saldo total, libre interno, retenido y pendiente de cubrir al lado.
- Solo por debajo de 340 px se vuelve a 1 cuenta por fila.
- El cambio es exclusivamente CSS/responsive; no toca `app.js`, contratos financieros ni la estructura del menú que puede evolucionar en paralelo.
- Asset CSS: `v0.38.3`; JS permanece sin cambios.


## UI · legibilidad tipográfica v0.38.4

- Aplicado un pase transversal de legibilidad sin alterar estructura, datos ni navegación.
- Se mantienen los titulares grandes actuales; se aumentan principalmente textos secundarios que habían quedado demasiado pequeños:
  - acciones y microcopy;
  - métricas auxiliares de Finanzas;
  - nombres/importes de cuentas y leyendas de Patrimonio;
  - calendario y próximos movimientos;
  - Salud, Gimnasio y vistas de detalle;
  - menú semanal y resumen del menú en Home.
- En escritorio, muchas etiquetas que estaban en 6–9 px pasan al rango aproximado 8.5–12 px según jerarquía.
- En móvil se conserva la rejilla 2×2 de cuentas, pero se suben las fuentes internas hasta el máximo compatible con media anchura.
- El cambio se implementa como override CSS final para minimizar conflictos con cambios concurrentes en la estructura del menú.
- No se modifica `app.js` ni el HTML estructural.
- Asset CSS: `v0.38.4`; JS permanece `v0.38.1`.


## Despensa · acceso directo a ListaCompra v0.38.5

- **Despensa** incorpora en la parte superior un selector visible de vistas:
  - `Inventario`
  - `🛒 Lista de la compra`
- `openPantryDetail("shopping")` abre directamente la vista de `ListaCompra`; no obliga a renderizar primero el inventario como paso de navegación.
- En Home, la tarjeta de Despensa deja de ser un único botón y expone dos acciones independientes:
  - `🛒 Lista de la compra` → abre directamente ListaCompra;
  - `Ver despensa →` → abre Inventario.
- El buscador rápido también entiende `lista de la compra` / `lista compra` y abre esa vista directamente.
- La fuente mostrada en esa vista es **ListaCompra de Segundo Cerebro**.
- El puente Apple Reminders ↔ Segundo Cerebro existe en código, pero la UI no afirma «Sincronizado» hasta que el agente real esté configurado y su estado sea verificable.
- Assets: `styles.css?v=0.38.5`, `app.js?v=0.38.5`, `pantry.js?v=0.38.5`.


## Salud · Home weekly menu resilience v0.38.7

- Corregida la desaparición silenciosa de **Menú de la semana** en Home.
- Confirmado en la fuente privada que `MenuSemanal` sigue conteniendo la semana 2026-09-28 → 2026-10-04; el problema era de presentación/carga, no pérdida de datos.
- La Home ya no depende exclusivamente del endpoint completo `/api/nutrition` para pintar el menú.
- Añadido `GET /api/nutrition/menu?date=YYYY-MM-DD`, lectura ligera que consulta únicamente:
  - `MenuSemanal`;
  - `Objetivos`.
- Si `/api/nutrition` falla o no entrega `weeklyMenu`, Home usa automáticamente ese endpoint ligero.
- Si incluso la lectura ligera falla, la sección **permanece visible** con un estado de error; no vuelve a desaparecer dejando el calendario pegado al footer.
- En modo demo/no privado sí se oculta, porque no hay fuente real que mostrar.
- Este fallback evita que futuras ampliaciones de Nutrición (recetas, ingredientes, salud, energía, D1, etc.) puedan tumbar el menú semanal de Home.
- Assets frontend: `v0.38.7`.


## Finanzas · diario de patrimonio v0.39.0

- El antiguo hábito **Diario mercados** deja de ser una tarea de HabitQuest y pasa a **Finanzas → Patrimonio**.
- La fuente privada derivada incorpora `PatrimonioDiario`, con cierres por fecha, patrimonio total cuando existe, moneda, variación diaria, P/L del día, clasificación y trazabilidad.
- Se migró el histórico disponible desde `DIARIO MERCADOS` de la fuente financiera sin modificar el maestro; los campos que el histórico no contenía permanecen nulos y no se reconstruyen.
- Las nuevas capturas nocturnas de Delta se registran en `PatrimonioDiario` conservando exactamente la moneda y cifras mostradas.
- El detalle de Patrimonio muestra tres KPI del último cierre, los últimos registros y un histórico desplegable.
- `PatrimonioDetalle` sigue siendo la distribución actual por plataforma; `Patrimonio` conserva la referencia mensual. El diario no sustituye ninguna de esas fuentes.
- Assets frontend: `v0.39.0`.


## MIDAS · tesis + CAGR 2031 v0.39.1

- MIDAS incorpora una segunda fuente privada, independiente del diario de estrategias: el Sheet **MIDAS - TESIS Y WATCHLIST**.
- El Worker la resuelve por nombre exacto con el OAuth Google ya configurado; opcionalmente admite `MIDAS_RESEARCH_SHEET_ID`. El identificador real no entra en Git.
- `GET /api/midas` entrega `research.theses` y `research.cagr2031` además del dashboard público de estrategias.
- La interfaz MIDAS muestra **Tesis y CAGR 2031** con todas las ideas registradas, escenarios bear/base/bull, última fecha de estudio y estado.
- Regla canónica: toda tesis nueva debe tener una fila en `TESIS` y otra en `CAGR2031`. Si todavía no se ha calculado un CAGR exacto a 2031, queda explícitamente pendiente; no se extrapola un CAGR de otro horizonte.
- Los estudios históricos conservan su horizonte original y sus CAGR originales para no perder contexto.
- La tabla es watchlist/memoria de investigación, no señal automática de compra. Antes de usar una tesis se actualizan precio, filings/resultados, valoración y riesgos.
- Assets frontend: `v0.39.1`.


## Salud · citas médicas iCloud en directo v0.39.2

- Corregido el desacople entre **Agenda** y **Salud → Médicos**.
- Antes, Médicos calculaba las próximas citas desde el snapshot cliente `state.events`; podía mostrar 0 aunque el calendario semanal ya tuviera eventos médicos.
- Añadido `GET /api/health/appointments`, que consulta la integración CalDAV/iCloud privada y filtra citas médicas por título/ubicación.
- Al abrir Salud, la pestaña Médicos carga ese endpoint de forma independiente.
- Si iCloud falla temporalmente, la UI cae a la copia local de Agenda y lo indica explícitamente en vez de mostrar un 0 engañoso.
- La cita de Dermatología visible en Agenda debe volver a aparecer en Médicos tras el despliegue.
- Asset JS: `v0.39.2`.


## Salud · citas médicas iCloud + Agenda v0.39.3

- Corregido un fallo introducido al separar `Salud → Médicos` en una consulta directa a iCloud.
- Problema: si `/api/health/appointments` respondía correctamente pero con `0` citas, la UI reemplazaba por vacío las citas médicas que ya estaban cargadas en `state.events` y visibles en Agenda.
- Nuevo comportamiento:
  - Salud renderiza inmediatamente las citas médicas ya presentes en Agenda;
  - lanza después el refresco directo de iCloud/CalDAV;
  - fusiona ambos conjuntos por `id` (o por título+fecha como fallback);
  - una respuesta transitoria vacía de CalDAV nunca borra una cita ya cargada;
  - si el refresco falla, se mantiene la copia de Agenda y se indica explícitamente.
- Esto preserva una sola fuente real (iCloud); Agenda actúa como copia ya cargada del mismo origen, no como fuente paralela.
- Asset JS: `v0.39.3`.


## Eventos · clasificación coherente de planes concretos v0.39.4

- Corregida la divergencia entre la clasificación de eventos en backend y en Home.
- `Puy du Fou` ya era reconocido por el backend de Eventos, pero la función de Home `inferImportantKind()` no lo reconocía y descartaba el evento si no existía una regla explícita.
- Home ahora alinea la inferencia de viajes con backend e incluye `puy du fou`, `hotel` y `airbnb`.
- Se amplían además planes sociales concretos con palabras como concierto, teatro, festival, espectáculo y parque temático.
- Se mantiene la regla existente de cumpleaños: un cumpleaños-recordatorio no aparece en Eventos salvo que el propio evento contenga un plan concreto.
- Se ha añadido también una regla canónica `puy-du-fou` en `EventosImportantes` de la hoja financiera privada para que el evento actual no dependa únicamente de heurísticas.
- Asset JS: `v0.39.4`.


## Salud · endurecimiento de calendarios médicos v0.39.5

- `Salud → Médicos` vuelve a consultar las citas cada vez que se abre la pestaña, evitando quedarse con un resultado antiguo.
- La detección médica usa `title`, `location`, `locationRef` y `calendarName`; `locationRef` es el campo real que entrega la integración iCloud actual.
- La nota de fuente muestra cuántos calendarios configurados han sido realmente encontrados y enumera los nombres no encontrados cuando existan.
- Se mantiene la regla de v0.39.3: una respuesta CalDAV vacía nunca borra citas médicas que ya estén visibles en Agenda.
- Asset JS: `v0.39.5`.

## Apple Reminders · activación real y cierre por eliminación

- Activación real completada el 2026-09-29 con permiso EventKit, lista exacta `Lista De La Compra`, backend, Sheet y agente `launchd` operativos.
- Primera reconciliación: 1 elemento Apple → Segundo Cerebro; verificación posterior: 1 coincidencia, 0 elementos sueltos y 0 conflictos.
- Se verificó un ciclo autónomo del agente con 1 coincidencia, 0 conflictos, 0 acciones pendientes y 0 fallos definitivos.
- Si una fila previamente enlazada se elimina físicamente de `ListaCompra`, ya no se reconstruye desde Apple: se encola una acción idempotente para completar el recordatorio y retirarlo de la lista activa.
- La regla no afecta recordatorios manuales que nunca hayan estado enlazados con Segundo Cerebro.

Assets actuales: `styles.css?v=0.39.1`, `app.js?v=0.39.5`, `pantry.js?v=0.38.7`.


## Calendario · resiliencia CalDAV v0.39.6

- iCloud sigue siendo de solo lectura y fuente de verdad temporal.
- Se añade una copia derivada `last-known-good` en D1 (`calendar_snapshots`) que solo se actualiza con lecturas completas y no vacías.
- Un timeout, una lectura vacía o un descubrimiento parcial ya no puede hacer desaparecer Agenda/Eventos: se usa la última copia estable; en parciales se conservan solo los calendarios ausentes desde esa copia.
- El matching de nombres de calendario tolera mayúsculas, acentos y espacios sin aceptar coincidencias ambiguas.
- `/api/state` concede a iCloud 9 s y el adaptador corta la lectura en vivo a 7 s para poder devolver el fallback antes del timeout exterior.
- Si aún no existe copia D1, puede sembrarse con los eventos iCloud ya presentes en el snapshot privado.
- Agenda muestra el estado de la fuente: directo, parcial o copia estable.
- Asset JS: `v0.39.6`.


## Menú semanal · detalle de comidas consumidas v0.39.7

- Las comidas de `MenuSemanal` con `estado=consumido` muestran el título en `var(--mint)`, manteniendo paridad light/dark.
- El color se deriva del estado canónico; no se infiere por hora ni por fecha.
- `Ver ingredientes y cantidades` ya no desaparece cuando una comida real/ad hoc no tiene `recipe_id`: si faltan ingredientes estructurados, la UI muestra cantidad, kcal, proteína y la nota registrada como fallback.
- Caso que motivó el cambio: comida real del 29/09/2026 `Brochetas + arroz basmati + pechuga + 20 picos`, guardada como consumida sin receta estructurada pero con desglose exacto en la nota.
- Las recetas siguen mostrando su tabla completa de ingredientes como antes.
- Assets: `app.js?v=0.39.7`, `styles.css?v=0.39.2`.


## Home · separación visual entre Agenda y Menú v0.39.8

- `home-weekly-menu-panel` deja de quedar visualmente pegado al bloque anterior.
- Separación vertical: 24 px en escritorio y 16 px en móvil.
- No cambia la estructura, datos ni altura interna de Agenda o Menú; solo la jerarquía visual entre módulos.
- Asset CSS: `styles.css?v=0.39.3`.


## Home · tarjetas de resumen diario compactas v0.39.9

- Hábitos, Nutrición, Despensa y Objetos dejan de estirarse a la altura de la tarjeta más alta de la fila.
- En escritorio cada tarjeta usa altura natural y alinea su contenido al inicio.
- Se reducen moderadamente padding y gaps internos, pero no el tamaño de letra.
- Despensa y Objetos compactan también sus mini-KPI sin eliminar información.
- La versión móvil conserva la escala tipográfica y espaciado específicos ya definidos.
- Asset CSS: `styles.css?v=0.39.4`.


## MIDAS · laboratorio visual animado v0.39.8

- El informe MIDAS privado incorpora un bloque **Laboratorio vivo** antes de las tablas tradicionales.
- Cada algoritmo activo se presenta como tarjeta con estado, rentabilidad, última fecha y una curva SVG de su patrimonio ficticio.
- La curva se dibuja con animación al abrir MIDAS; el punto final pulsa suavemente y las tarjetas muestran un barrido visual discreto. `prefers-reduced-motion` desactiva todas las animaciones.
- La animación es puramente de presentación: nunca interpola ni inventa resultados. Con una sola sesión se muestra una línea de espera.
- El backend acepta `equity_history` compacto desde `midas-paper-lab/strategy_state/dashboard.json` y conserva el genético privado desde D1.
- Mientras Weekly ML aún no tenga un diario forward, se muestra su bootstrap técnico 25/09→28/09 como preview claramente marcado **no prospectivo**. Cuando exista Weekly ML forward, el bootstrap deja de sustituir las tarjetas reales.
- La vista agrupa Weekly ML, estrategias diarias, TFM y genético original; las ideas históricas pendientes permanecen en la tabla y no reciben curvas ficticias.
- Assets: `styles.css?v=0.39.8`, `app.js?v=0.39.8`, nuevo `midas-lab.js?v=0.39.8`.


## Home · densidad interna de tarjetas v0.39.10

- No se reduce la tipografía.
- El gap entre tarjetas del resumen diario baja a 10 px en escritorio.
- Padding de tarjeta y separación entre título, cifras y estado se reducen para eliminar espacio muerto.
- Los mini-KPI mantienen tamaño de texto pero usan menos padding vertical.
- Despensa pasa a 3 columnas de KPI en escritorio para reducir una fila completa.
- Móvil conserva sus reglas específicas de tamaño y espaciado.
- Asset CSS: `styles.css?v=0.39.10`.


## Home · resumen diario horizontal 2×2 v0.39.12

- En escritorio ancho (>=1180 px), Hábitos, Nutrición, Despensa y Objetos pasan de 4 tarjetas verticales a una rejilla 2×2.
- Cada tarjeta reutiliza el ancho disponible para colocar título, cifras y progreso en horizontal, reduciendo espacio muerto sin reducir tipografía.
- Hábitos: cabecera + progreso en paralelo.
- Nutrición: cabecera + 3 KPI + estado/anillo en una sola franja.
- Despensa: cabecera + 5 KPI en una fila; estado y preview debajo.
- Objetos: cabecera + 4 KPI en una fila; estado/footer debajo.
- Tablet mantiene el layout previo y móvil sigue a una columna.
- Asset CSS: `styles.css?v=0.39.12`.


## Home · tarjetas resumen simétricas v0.39.13

- En escritorio ancho, Hábitos, Nutrición, Despensa y Objetos comparten exactamente el mismo patrón visual: cabecera + 4 KPI + pie.
- Se eliminan del Home los anillos grandes de Hábitos/Nutrición y se sustituyen por KPI textuales; los anillos siguen disponibles en las vistas detalladas.
- Hábitos: Completados, Pendientes, Progreso y Racha.
- Nutrición: Consumidas, Gasto total, Objetivo y Progreso.
- Despensa: En casa, Stock bajo, Lista compra y Sin precio; el coste conocido pasa al pie junto a la revisión.
- Objetos conserva sus cuatro KPI actuales.
- En escritorio se ocultan textos secundarios redundantes de Despensa/Objetos para que las cuatro tarjetas mantengan tres franjas y altura visual comparable.
- Móvil conserva la presentación anterior de progreso.
- Assets: `app.js?v=0.39.13`, `styles.css?v=0.39.13`.


## OBJETOS · endurecimiento de roles visuales

- `LookItems.rol` queda normalizado a `superior | exterior | inferior | calzado | accesorio`.
- Los alias históricos como `capa exterior` se leen como `exterior` para mantener compatibilidad.
- El endpoint de creación de looks valida además que el rol solicitado coincida con la `capa` de la prenda; una camisa no puede guardarse como calzado mediante una llamada manual.
- La hoja canónica ya tiene validación de lista en `LookItems.rol` y las dos filas históricas `capa exterior` fueron normalizadas sin crear ninguna fuente paralela.


## OBJETOS · ingesta privada de imágenes v0.3

- La fuente canónica sigue siendo exclusivamente `SEGUNDO CEREBRO - OBJETOS`; R2 almacena bytes privados, no entidades ni inventario.
- Nuevo upload privado: `POST /api/objects/:objeto_id/image` con multipart, Cloudflare Access, PNG/JPEG/WebP y máximo 8 MiB.
- Nuevo read privado: `GET /api/objects/:objeto_id/image/:image_type?v=<version>`. Las URLs guardadas en Armario son rutas same-origin estables y el bucket no es público.
- `processed` genera automáticamente una miniatura WebP de hasta 512 px y actualiza `foto_procesada_url`, `miniatura_url`, `estado_procesado` y timestamp.
- El flujo usa claves R2 versionadas y rollback compensatorio si falla Google Sheets; overwrite es explícito y la versión anterior no se elimina hasta haber escrito la nueva referencia canónica.
- Validaciones: objeto + fila Armario existentes, objeto no retirado, MIME + magic bytes, tamaño, ID seguro, filename saneado, metadata limitada y rechazo de URL remota como sustituto del archivo.
- Se añade binding `OBJECTS_MEDIA` → bucket privado `segundo-cerebro-private-assets`; el workflow de producción provisiona el bucket antes del deploy.
- Tests cubren inexistencia, MIME, R2, actualización de Sheet, rollback, overwrite, miniatura WebP, formato de IDs y autenticación.
- Runbook operativo: `docs/OBJECTS_IMAGE_INGEST.md`.
- Contrato backend de OBJETOS: `0.3`. La UI de Armario no cambia: ya consume estas URLs y las reutiliza en tarjeta, ficha, combinador y mosaicos.


## OBJETOS · provisionado R2

- El bucket `segundo-cerebro-private-assets` se trata como infraestructura one-shot, no como recurso administrado en cada deploy.
- El token normal de GitHub Actions conserva privilegios mínimos de deploy de Workers; no se amplía solo para listar/crear buckets.
- El workflow ordinario ya no ejecuta `wrangler r2 bucket list/create`; despliega el Worker contra el binding declarado y fallará claramente si el bucket todavía no existe.


## OBJETOS · degradación segura mientras R2 no esté provisionado

- Si Cloudflare devuelve explícitamente que `segundo-cerebro-private-assets` no existe, CI despliega el Worker sin el binding `OBJECTS_MEDIA` para no bloquear el resto de Segundo Cerebro.
- En ese estado, las rutas de imágenes existen en código pero responden `OBJECTS_MEDIA_NOT_CONFIGURED`/503; no se simula que el pipeline esté operativo.
- Cualquier otro error de deploy sigue fallando normalmente. El fallback solo se activa para el error literal de bucket ausente.
- En cuanto el bucket exista, el mismo workflow usará automáticamente el binding R2 y dejará de entrar en fallback.


## OBJETOS · bridge operativo ChatGPT mediante staging transitorio

- La limitación actual del plan personal impide usar un MCP personalizado de escritura directamente desde GESTOR OBJETOS.
- Se implementa fallback sin pasos humanos por foto: ChatGPT copia la imagen de Library a `/Google Drive/SEGUNDO CEREBRO - OBJETOS STAGING` y añade una fila `pending` en `ImageIngestQueue` del mismo spreadsheet canónico.
- El Worker `segundo-cerebro` procesa hasta 4 solicitudes por minuto mediante Cron Trigger.
- El procesador reutiliza `uploadObjectsImage` con confianza interna; no expone un endpoint bypass.
- Éxito: R2 + thumbnail + actualización Armario + staging a papelera + cola `done`.
- Fallo de ingesta: cola `error`, staging conservado, Armario no se marca procesado.
- Fallo solo de cleanup: `cleanup_pending`; el siguiente ciclo reintenta únicamente la papelera.
- Pestaña técnica creada: `ImageIngestQueue`.
- Carpeta staging privada creada: `SEGUNDO CEREBRO - OBJETOS STAGING`.
- El flujo final sigue bloqueado únicamente hasta provisionar el bucket R2 `segundo-cerebro-private-assets`.


## OBJETOS visual · estado exacto para relevo (ChatGPT bridge + D1, coste 0)

- **Cerrado el 2026-09-30.** La fuente canónica de identidad y referencias sigue siendo exclusivamente `SEGUNDO CEREBRO - OBJETOS`.
- Se descartó R2 porque su activación exigía habilitar una suscripción pay-as-you-go, incompatible con la regla operativa de no asumir posibilidad de cobro.
- Los bytes visuales se persisten en el D1 privado ya existente mediante `objects_media_assets` + `objects_media_chunks`; el adaptador conserva el contrato tipo-object-store y las rutas same-origin existentes.
- El pipeline OBJETOS v0.3 no cambia de cara al consumidor: `POST /api/objects/:objeto_id/image` y `GET /api/objects/:objeto_id/image/:image_type?v=<version>`.
- Límite funcional por imagen: 8 MiB. Salvaguarda interna del almacén visual D1: 200 MiB totales; no se contrata almacenamiento adicional automáticamente.
- Para server-to-server se desplegó `segundo-cerebro-objects-ingest`, un Worker mínimo público sin lectura de datos que reenvía el multipart mediante Service Binding a `segundo-cerebro`. La autorización real sigue siendo el Bearer upstream verificado por SHA-256 en el Worker principal.
- Railway `objects-chatgpt-bridge` usa ese gateway; `/health` queda operativo. Los secretos permanecen fuera de Git.
- El procedimiento exacto usado para subidas desde una conversación (incluido el fallback `seed.mjs` + `OBJECTS_SEED_JOBS`, verificación y cleanup) queda fijado en `docs/OBJECTS_IMAGE_INGEST.md`; futuros relevos deben consultarlo antes de concluir que una subida no puede ejecutarse desde ChatGPT.
- Las cuatro imágenes reales del armario se ingirieron end-to-end con estado `procesada`, URL procesada y miniatura versionadas:
  - `obj-shirt-scalpers-skyblue-001`
  - `obj-sweater-poloclub-quarterzip-grey-001`
  - `obj-chino-zara-navy-001`
  - `obj-sneakers-adidas-samba-blue-001`
- `Armario` quedó actualizado para las cuatro. El runner temporal de Railway se desactivó y `OBJECTS_SEED_JOBS` quedó vacío después de la validación.
- El staging de Drive queda únicamente como mecanismo transitorio/fallback. Las cuatro filas históricas de `ImageIngestQueue` registran el intento fallido previo `OBJECTS_STAGING_META_403`; no deben duplicarse ni interpretarse como fallo del estado visual actual.
- No activar R2 ni introducir un proveedor de pago para OBJETOS sin una decisión arquitectónica nueva y aprobación explícita del usuario.

## MIDAS · TFG corregido 2026

- `midas-paper-lab` incorpora la línea `tfg_corrected_2026`, grupo `tfg_demo_adaptado`.
- Segundo Cerebro acepta ese grupo desde el adaptador privado de MIDAS y lo muestra tanto en la tabla general como en **Laboratorio vivo** bajo un bloque TFG propio.
- La tarjeta usa exclusivamente `equity_history` publicado por el ledger paper; hasta que exista la primera señal/valoración forward mostrará estado programado, sin inventar curva.
- Es la variante corregida del TFG 2021: técnico → multicriterio/AHP-style → retorno-MAD, con next-open, costes, fracciones y stop causal.
- El original global de 20 mercados no se sustituye ni se presenta como ejecutado.
- Asset app: `v0.40.1`; módulo MIDAS lab: `v0.40.1`.


## Finanzas · cuentas de crédito y Financiera ECI v0.40.2

- La capa privada financiera incorpora `CuentasCredito` para modelar tarjetas/financieras con saldo propio sin tratarlas como liquidez bancaria.
- Para Financiera El Corte Inglés se añaden `ECIProductos` y `ECIHistorico`: separan revolving, aplazamientos, responsable económico, reembolsos de terceros y conciliación mensual.
- `CorteIngles` es una vista privada de control dentro del Sheet financiero, alimentada por esas tablas; no crea una fuente de verdad nueva.
- El Worker lee estas pestañas de forma opcional y expone `creditAccounts` + `creditHistory` dentro del estado financiero privado.
- Home incorpora un panel **Crédito · El Corte Inglés** y un detalle con saldos, productos activos/cerrados e histórico de recibos.
- Regla canónica: un recibo de una financiera nunca se clasifica como un único gasto sin separar revolving, aplazamientos y reembolsos.
- Ningún saldo, extracto ni importe real se versiona en Git; toda cifra sigue residiendo exclusivamente en la fuente privada.
- Assets: `app.js?v=0.40.2`, `styles.css?v=0.40.2`.


## Finanzas · auditoría Santander + ECI · 30/09/2026

- `ASUNTOS v3.xlsx` sigue siendo **solo lectura** y actúa como maestro presupuestario/histórico.
- Se añadió `MovimientosCuenta` a `SEGUNDO CEREBRO - ESTADO FINANCIERO`; contiene el histórico Santander importado (02/01/2025→30/09/2026) con trazabilidad por movimiento.
- El error de liquidez de Santander estaba causado principalmente por no reservar el alquiler de octubre de **1.350 €**, pese a estar en el maestro y existir como pago mensual recurrente en el histórico bancario.
- Estado Santander auditado a 30/09:
  - saldo contable: **2.029,60 €**
  - disponible bancario: **2.027,60 €**
  - compromisos internos pendientes: **1.915,34 €**
  - libre interno prudente: **112,26 €**
- Compromisos pendientes Santander modelados: alquiler 1.350 €, gimnasio 60 €, Netflix 8,99 €, comida 194,36 €, transporte 231,99 €, salir 53 €, reembolso Bazar Andrea 16 € y ajuste Airbnb 1 €. La retención Uber de 2 € se trata aparte.
- DIGI 29 € y Canal de Isabel II 21,79 € ya se cobraron el 29/09; no volver a reservarlos.
- Netflix se corrigió de BBVA a Santander usando el histórico real de cargos.
- La UI financiera debe distinguir `saldo contable`, `disponible bancario`, `comprometido` y `libre interno`. El saldo restante de una categoría presupuestaria no se etiqueta como dinero libre.
- El detalle de Finanzas incorpora un histórico reciente de movimientos Santander desde `MovimientosCuenta`.
- Financiera ECI sigue como cuenta de crédito separada. El revolving queda reconstruido con sus compras, intereses y pagos; saldo tras septiembre **183,64 €** y horizonte aproximado **abril de 2027** si no hay nuevas compras y se mantienen 30 €/mes.


## Finanzas · histórico Openbank Miguel · 30/09/2026

- Importado el extracto `Movimientos de Cuenta.xls` de Openbank Miguel a `MovimientosCuenta` con `account_id=openbank-miguel`.
- Rango importado: 30/09/2024→30/09/2026; **997 movimientos** RAW con fecha operación/valor, concepto, importe, saldo posterior y trazabilidad del fichero.
- Saldo exacto Openbank Miguel a 30/09/2026 23:35: **253,52 €**.
- Antiguos holds Marbella ya contabilizados: De Juan 42 €, Auto Res 21,60 €, Gate Gourmet 3,80 €, Avanza 16 € y La Siesta 44 €; ya no deben figurar como retenciones activas.
- OneNote 2 € ejecutado el 25/09 y YouTube Music 6 € ejecutado el 21/09. Único compromiso operativo pendiente conocido del ciclo en Openbank Miguel: Apple Watch 16 €; libre interno auditado **237,52 €**.
- La UI privada de Finanzas muestra ahora movimientos recientes tanto de Santander como de Openbank Miguel; el histórico completo permanece en `MovimientosCuenta`.
- Futuras importaciones bancarias pueden solapar fechas; deben deduplicarse por `movement_id` determinista y conservar `source_system`, `source_row` e `import_batch`.
- El histórico permite detectar recurrencias, pero no reasigna automáticamente la cuenta futura de una suscripción si existe una ruta operativa más reciente documentada.


## Finanzas · viaje noviembre + detalle ECI · 30/09/2026 noche

- Openbank Miguel: del ingreso en efectivo de **90 €** del 28/09, **75 €** quedan reservados para `Viaje nov`; solo 15 € de ese ingreso quedan sin asignar.
- Se añade `efectivo-miguel` con **100 €** fuera de banco, regalo de la madre de Miguel por su santo, totalmente reservados para la siguiente cuota/pago de vuelo Ryanair del viaje de noviembre.
- Openbank Miguel pasa a **162,52 € libres internos**: 253,52 € de saldo - 16 € Apple Watch - 75 € Viaje nov.
- `Compromisos/viaje-nov` conserva presupuesto/reserva históricos; los 175 € anteriores se documentan como **fuentes de financiación**, no como aumento automático del presupuesto del viaje.
- ECI incorpora `ECIMovimientos` a la API/UI para mostrar las compras/devoluciones que han alimentado el revolving y `ECIFuturo` para el calendario futuro.
- Compras netas identificadas que han alimentado el revolving: **454,81 €**; los movimientos individuales deben mostrarse con comercio/departamento, fecha e importe, incluida la devolución de 119 €.
- `ECIFuturo` proyecta revolving desde 183,64 € suponiendo TIN 18 %, sin compras nuevas: 30 €/mes de octubre a marzo y último pago estimado 14,12 € en abril de 2027. Las cuotas contractuales TV Samsung y TV padres Andrea se muestran por separado; los 45 €/mes esperados de Encarna se reflejan como reembolso de tercero.
- La vista `Crédito · El Corte Inglés` debe mostrar productos activos, próximos cargos, compras que alimentaron el revolving, histórico de recibos y financiaciones cerradas.


## Finanzas · corrección dinero libre Santander · 01/10/2026

- Se corrige la interpretación de `free_amount` de Santander común. El saldo contable sigue siendo **2.029,60 €** y el disponible bancario **2.027,60 €** tras la retención conocida de 2 €.
- Compromisos nominales pendientes del ciclo: **1.915,34 €**.
- La diferencia **112,26 €** deja de mostrarse como dinero libre y pasa a `ReservasCuenta` como `cycle_surplus_buffer` hasta el cierre del ciclo 20/09→20/10.
- Descomposición conocida del buffer: **80,18 €** de márgenes de partidas fijas ya ejecutadas por debajo del presupuesto (Luz 47,39; Agua 18,21; IKEA 14,46; TV Samsung 0,07; Medicinas 0,05) + **32,08 €** de remanente general/carryover todavía no asignado a una partida concreta.
- Regla permanente: en una cuenta común por sobres, un sobrante provisional no se considera libre mientras el ciclo esté abierto. En el cierre se decide explícitamente si se destina a ahorro, arrastre o ajuste.
- Resultado operativo: **Santander free_amount = 0 €** durante el ciclo abierto; la suma de retención 2 € + compromisos 1.915,34 € + buffer 112,26 € explica exactamente los 2.029,60 € contables.


### Aclaración origen margen Santander · 01/10/2026

- El maestro demuestra que Santander común está diseñado para quedar aproximadamente a **0 €** al cierre si se ejecuta todo el presupuesto: `13,52 + 1.350,90 + 1.717,00 = 3.081,42`, igual a `3.345,40 - 250 - 8,99 - 4,99 = 3.081,42`.
- Se detectó una omisión: **50 €** de `Dinero regalos Navidad / Reyes` (I&G AJ38) estaban financiados dentro de Santander pero no figuraban en `ReservasCuenta`. Ya se añadieron como provisión activa.
- Por tanto, de los antiguos 112,26 € de aparente margen, **50 € estaban ya asignados** y solo **62,26 €** quedan como `cycle_surplus_buffer` provisional.
- Ese buffer no es dinero nuevo ni libre: surge de desviaciones plan-real (recibos inferiores al presupuesto, transferencias reales frente a la versión actual del maestro, nómina real frente a modelada y otros ajustes de ruta/conciliación). Permanece bloqueado hasta cierre.
- `free_amount` Santander continúa en **0 €** mientras el ciclo esté abierto.


## Finanzas · histórico completo de Delta v0.40.7

- Importado en fuente privada el export completo de Delta recibido el 01/10/2026 y archivado también como CSV privado.
- La referencia canónica queda en `IntegracionesPrivadas.DELTA_OPERATIONS_SHEET_ID`; Git no contiene datos patrimoniales reales.
- Nuevo adaptador `private-cloudflare/src/delta.js` y endpoint privado `GET /api/finance/delta`.
- Finanzas → Patrimonio muestra un bloque **Histórico de operaciones Delta** con KPI de actividad, distribución anual, activos más operados, turnover por divisa y compraventas paginadas.
- Las filas automáticas/sync se conservan pero no cuentan como operativa real.
- La carga es lazy al abrir Patrimonio para no penalizar el Home.
- Assets app/styles: `v0.40.7`.


## MIDAS · primario + backup y salud por ciclo · 04/10/2026

- La revisión del primer fin de semana completo confirmó que los automatismos sí se ejecutaron: paper diario, TFM, Capital Cycle, Buy The Dip, Weekly ML, TFG y genético prospectivo tienen ejecuciones schedule reales.
- TFM registró correctamente la sesión 02/10 en el run primario; el backup posterior devolvió `already_recorded` y el workflow acabó rojo solo por una carrera de `git push`.
- Weekly ML registró correctamente su primer forecast/ledger forward del 02/10 en el primario; el backup posterior volvió a descargar datos revisados y activó el guard de inmutabilidad.
- La salud MIDAS se evalúa desde ahora por **ventana/ciclo**: si al menos un intento schedule del ciclo termina correctamente, un backup posterior fallido no convierte el algoritmo en caído.
- En `midas-paper-lab` los backups TFM/Weekly pasan a no-op sobre estado ya congelado y los workflows que escriben `strategy_state/strategy_runtime` se serializan para eliminar carreras de push.
- El domingo no se espera ejecución de las campañas diarias; el siguiente ciclo diario corresponde al cierre del lunes.

## MIDAS · incidente TFM detectado por auditor · 02/10/2026

- El auditor funcionó correctamente: el único fallo operativo MIDAS observado en el corte era `MIDAS TFM shadow forecasts`; campañas diarias, Capital Cycle y Buy The Dip estaban verdes.
- Causa raíz: Yahoo entregó las barras diarias `.MC` del 01/10 con `Close=NaN` para todo el universo, aunque el intradía regular estaba completo.
- `midas-paper-lab` corrigió TFM en `8bb6c174d6e207592b69d6adf5c6986ddfc66cad` usando un fallback restringido al cierre de la sesión objetivo desde barras horarias validadas.
- El backup cron TFM se adelantó a 23:23 UTC del mismo día porque GitHub estaba retrasando schedules 3–4 horas.
- La sesión 01/10 no se backfillea después de la apertura del 02/10; se considera perdida prospectivamente.
- El panel y `Audit production web` deben seguir mostrando TFM en rojo hasta que un nuevo schedule termine correctamente y materialice el diario. No rebajar ese rojo manualmente.
- Fallos visuales del Armario detectados en el mismo audit son independientes de MIDAS y deben tratarse en OBJETOS.

## MIDAS · fuente robusta de salud operativa · 01/10/2026

- Cada workflow programado de la competición escribe un artefacto mínimo en `mamg97/midas-paper-lab/strategy_runtime/*.json` mediante un step `always()`; por tanto registra también el fallo del motor antes del commit.
- La vista privada MIDAS lee esos artefactos públicos versionados. Ya no depende de que Cloudflare pueda consultar la API de GitHub Actions en vivo.
- El auditor mantiene una comprobación independiente y más fuerte: consulta Actions directamente y contrasta que la UI exponga las mismas incidencias.
- Cobertura actual: estrategias diarias, TFM, Capital Cycle, Buy The Dip, Weekly ML, TFG corregido y el genético prospectivo privado.
- Un artefacto ausente antes de la primera ventana debida se muestra como «Aún no toca»; después de vencer la ventana/gracia se convierte en ejecución ausente.
- Esto no altera señales, carteras, retornos ni diarios: solo telemetría operativa.

## MIDAS · salud operativa de la competición · 01/10/2026

- `Audit production web` incorpora un bloque **MIDAS Competition Health**.
- El auditor ya no deduce salud únicamente del dashboard: contrasta `/api/midas`, diarios publicados y los workflows reales de `mamg97/midas-paper-lab`.
- Vigila diariamente `MIDAS paper comparison`, `MIDAS TFM shadow forecasts` y `MIDAS capital cycle paper`; semanalmente `MIDAS weekly ML paper` y `MIDAS TFG corrected paper`.
- Un run debido ausente/fallido hace fallar la auditoría. Si un workflow termina verde, se exige que sus diarios aparezcan en MIDAS.
- El genético S&P 500 prospectivo se controla desde el snapshot privado ya ingerido en D1, sin dar acceso del auditor al repositorio privado.
- El auditor sigue siendo read-only: detecta y clasifica, no reescribe resultados paper ni modifica reglas de inversión.

## MIDAS · Capital Cycle Inflection · v0.40.3

- `mamg97/midas-paper-lab` incorpora la campaña prospectiva `capital_cycle_inflection_2026`, derivada del marco **capital cycle**: infrainversión multianual + supervivencia financiera + valoración normalizada + confirmación de giro.
- La investigación y los horizontes quedan congelados en `research/CAPITAL_CYCLE_STRATEGY.md`; no se crea un backtest fundamental retrospectivo con datos actuales porque introduciría look-ahead/restatements y survivorship bias.
- La campaña usa 100.000 USD ficticios, máximo 12 posiciones, 10 % por nombre, 95 % invertido, comisión 0,10 % y slippage 0,05 %. Señal inicial de lanzamiento y después ranking al cierre de mes; fills siempre next-open.
- Segundo Cerebro acepta el grupo `capital_cycle_demo` desde `GET /api/midas` y lo muestra como bloque propio en la tabla general y en Laboratorio vivo. No interviene en `BROKERS` ni en patrimonio real.
- La comparación frente al resto de estrategias sigue siendo prospectiva: no se ordenan rentabilidades de campañas con fechas/reglas distintas. La evaluación justa debe usar ventanas comunes y, cuando haya muestra suficiente, CAGR/anualización, drawdown, Sharpe/Sortino, turnover y retorno relativo a SPY desde la misma fecha.
- El workflow de Capital Cycle corre tras cierre XNYS; solo recalcula fundamentales cuando toca señal y registra diariamente el NAV paper. Cambiar parámetros que afecten resultados exige una campaña nueva, no reescribir el diario.


## Finanzas · histórico BBVA común · 01/10/2026

- Importado a `MovimientosCuenta` el fichero BBVA recibido el 01/10/2026 con `account_id=bbva-comun` y `source_system=BBVA_EXPORT`.
- **Limitación de fuente:** aunque se esperaba histórico desde 01/01/2024, el archivo solo contiene **40 movimientos** y cubre operaciones **13/08/2026→30/09/2026** (fecha valor mínima 11/08/2026). El histórico BBVA anterior queda pendiente; no inferirlo.
- Saldo BBVA común exacto a 30/09: **470,83 €**.
- Conciliación del snapshot anterior 841,24 €: `+0,31 dividendo META -4,99 Prime -365,73 Audi = 470,83`.
- Audi: cuota mensual observada **365,73 €** (31/08 y 30/09); la reserva del ciclo pasa a ejecutada y `Deudas` usa ese importe observado.
- Prime 4,99 € pasa a ejecutado. Seguro moto: AXA 183,68 € fue cargo del ciclo anterior; la reposición de 183 € ya entró en la transferencia +320 € del 18/09.
- Compromisos pendientes dentro de BBVA: Las Flores 240,20 € + Renta Andrea 104 € + Clicars 33,42 € + iPad 28,50 € + MacBook 40 € + ChatGPT 23 € = **469,12 €**.
- Resto **1,71 €** bloqueado como `cycle_surplus_buffer`; `free_amount` BBVA común = **0 €** mientras el ciclo siga abierto.
- La UI de Finanzas deja de hardcodear Santander/Openbank para el histórico: recorre todas las cuentas de liquidez conectadas. BBVA aparece con sus movimientos recientes automáticamente; lo mismo ocurrirá con futuras cuentas cuando tengan movimientos importados.
- `Movimientos bancarios` se unifica en un solo bloque con pestañas por cuenta. Cada pestaña muestra la tabla reciente de esa cuenta y las cuentas conectadas sin histórico permanecen visibles con un estado vacío; no se crean tablas largas separadas ni una lista hardcodeada de bancos.
- A la derecha del encabezado de `Movimientos bancarios` existe `Abrir Sheet ↗`, que redirige desde el Worker privado al spreadsheet canónico mediante `FINANCE_SHEET_ID`; el identificador real no vive en frontend ni en Git.


## Finanzas · snapshot patrimonial 01/10/2026

- Snapshot mensual de día 1 actualizado desde capturas directas del usuario.
- Total consolidado de inversiones más reciente del 01/10/2026: **42.292,97 €**.
- Desglose: BBVA Fondos **7.169,48 €**; BBVA Acciones **1.818,49 €**; eToro **28.293,46 €**; Interactive Brokers **≈4.474,00 €** (captura 11:02, NLV con short put incluida mark-to-market); Coinbase **537,54 €**.
- `PatrimonioDetalle` contiene el último valor por plataforma con `updated_at=2026-10-01`; `Patrimonio` incorpora la fila mensual 01/10/2026; `PatrimonioDiario` incorpora un snapshot CAPTURED para la misma fecha.
- La UI de patrimonio no necesita hardcode adicional: consume `PatrimonioDetalle` y `Patrimonio` de forma dinámica.
- No interpretar la diferencia entre snapshots como rentabilidad pura cuando haya aportaciones/retiradas/transferencias entre plataformas.


## Finanzas · eToro con dinero reservado · 01/10/2026

- Se crea `EtoroAsignaciones` para separar dentro del valor actual de eToro el dinero económicamente comprometido de la inversión no asignada.
- Valor eToro canónico 01/10/2026: **28.293,46 €**.
- Bloques activos reconciliados contra `ASUNTOS v3` y el apunte de retirada del 20/09:
  - Bono anual Miguel: **789,67 €** restantes; **197,42 €/mes**; tabla fechada hasta 26/01/2027 (el comentario lo resume como «hasta febrero 2027»).
  - Dinero BMW → cuota Audi: **4.408,00 €** restantes; **116 €/mes**; el maestro marca 580 € ya consumidos a 01/09 y «Fin del dinero del BMW» en 01/11/2029 con 4.988 € acumulados.
  - Extra doble julio Miguel: **210,20 €**; **105,10 €/mes**; últimas salidas 20/10 y 20/11 de 2026.
  - Extra doble julio Andrea: **210,20 €**; **105,10 €/mes**; últimas salidas 20/10 y 20/11 de 2026.
  - Reserva Audi Q3 / Clicars: **100,26 €**; **33,42 €/mes**; últimas salidas 20/10, 20/11 y 20/12 de 2026.
- Total nominal comprometido dentro de eToro: **5.718,33 €**.
- `Resto inversión eToro`: **22.575,13 €** al snapshot actual; se calcula como eToro total menos reservas nominales y absorbe la variación de mercado.
- Salida mensual vigente para el próximo 20/10: **557,04 €** = 197,42 + 116 + 105,10 + 105,10 + 33,42.
- La UI de Patrimonio muestra una barra específica de eToro, con bloques por destino, importe reservado, salida mensual y fecha final. Se muestra tanto en el resumen de patrimonio como en su detalle.
- No restar estos bloques del patrimonio total: siguen formando parte del valor de eToro hasta que la retirada se ejecute. La barra es una clasificación económica interna, no una deuda adicional.


## MIDAS · Buy The Dip corpus v0 · 01/10/2026

- Nueva campaña prospectiva separada en `mamg97/midas-paper-lab`: `buy_the_dip_corpus_2026_v0`.
- La metodología v0 se deriva del corpus primario Buy The Dip ya disponible y automatiza deep value / special situations mediante cinco capas: valoración, calidad/supervivencia, asignación de capital, dislocación y catalizadores.
- Los pesos y umbrales numéricos son decisiones de ingeniería congeladas antes del primer fill; no se presentan como porcentajes declarados por los hosts.
- Universo v0: S&P-derived ya congelado en MIDAS para evitar selección retrospectiva. La futura v1 global/internacional deberá arrancar un diario nuevo.
- Capital demo: 100.000 USD; máximo 10 posiciones; 15 % por nombre; 30 % por sector; exposición dinámica 0–95 % según oportunidades; señal fundamental mensual; NAV diario; fills next-open; comisión 0,10 % + slippage 0,05 %.
- Segundo Cerebro incorpora el grupo `buy_the_dip_demo` en la tabla MIDAS y Laboratorio vivo sin mezclarlo con BROKERS ni patrimonio real.
- El contrato de comparación MIDAS se amplía para todas las campañas con riesgo observado: volatilidad anualizada según cadencia, máximo drawdown, Sharpe descriptivo con rf=0 y número de observaciones, además de rentabilidad acumulada.
- Las estrategias conservan sus horizontes propios. No se declara una clasificación común cuando las fechas de inicio o supuestos de ejecución difieren; la comparación justa usa ventanas solapadas cuando exista suficiente historial.
- La salud operativa de Segundo Cerebro también vigila el workflow `MIDAS Buy The Dip paper`.
- Assets MIDAS: `app.js?v=0.40.17`, `midas-lab.js?v=0.40.17`.


## MIDAS · Buy The Dip corpus v0 · 01/10/2026

- `mamg97/midas-paper-lab` incorpora la campaña prospectiva separada `buy_the_dip_corpus_2026_v0`, derivada únicamente del corpus primario disponible de Buy The Dip.
- La v0 automatiza un proceso deep-value/situaciones especiales: valoración, supervivencia/calidad, asignación de capital, dislocación y catalizadores; permite caja cuando faltan ideas y rota por coste de oportunidad.
- Parámetros congelados antes del primer fill: 100.000 USD ficticios, máximo 10 posiciones, 15 % por nombre, 30 % por sector, decisión mensual, NAV diario, comisión 0,10 %, slippage 0,05 % y fills next-open.
- La v0 usa el universo S&P-derived ya congelado para evitar seleccionar retrospectivamente small/mid caps internacionales. Una futura v1 global requerirá universo propio congelado y diario nuevo.
- Segundo Cerebro acepta el grupo `buy_the_dip_demo` y lo muestra como bloque propio en tabla y Laboratorio vivo.
- El dashboard MIDAS amplía la comparación para todas las estrategias con **rentabilidad acumulada + riesgo observado**: volatilidad anualizada adaptada a la cadencia, máximo drawdown y Sharpe 0rf. No se proclama clasificación común mientras las ventanas de observación sean distintas.
- La campaña no altera Capital Cycle ni ninguna línea MIDAS existente y nunca escribe en BROKERS/patrimonio real.
- Assets de la integración: `app.js?v=0.40.18`, `midas-lab.js?v=0.40.18`.


## 2026-10-01 · Salud: recetas con pasos + histórico Apple Health visible completo

- La fuente privada `SEGUNDO CEREBRO - SALUD` incorpora `PasosReceta` como tabla canónica de instrucciones ordenadas por `recipe_id`. Solo se guardan pasos explícitamente aportados por el usuario/fuente; no se inventan huecos culinarios.
- Recuperados del histórico conversacional y persistidos los pasos explícitos de `Puré de verduras de Andrea` y `Tortilla de patatas casera`.
- El histórico bruto de Apple Health sigue siendo canónico en D1, pero el Sheet privado pasa a conservar una superficie derivada completa y estable:
  - `ActividadDiaria`: histórico diario completo de actividad/energía/pasos/entrenos.
  - `MedicionesCorporalesApple`: todas las muestras corporales D1.
  - `RecuperacionDiariaApple`: señales de recuperación/sueño D1 cuando existen.
  - `HistoricoResumen`: agregados 30/90/180/365/all.
- Una lectura de `/api/health/history?range=30|90|180|365` ya no debe truncar el Sheet al rango solicitado: el API responde al rango pedido, pero la sincronización derivada del Sheet se refresca con `range=all`.
- `MedicionesCorporales` se mantiene para medidas manuales/recuperaciones históricas compatibles; no se convierte en un volcado masivo para evitar mezclar fuente manual con espejo D1.


## Relevo ORGANIZADOR 7 → ORGANIZADOR 8 · 2026-10-02

Estado que debe preservarse al continuar:

- Leer primero `AGENTS.md`, este `docs/HANDOFF.md`, los contratos `agents/*` relevantes y `docs/WEB_AUDIT.md`. Continuar siempre desde el `main` vivo; no reconstruir trabajo ya cerrado.
- Regla arquitectónica prioritaria: **datos dinámicos en Sheets/almacenes privados; frontend y lógica genérica estables**. Antes de tocar Git, comprobar si el cambio solicitado se resuelve modificando la fuente canónica. Cambios ordinarios de menú, recetas, saldos, prendas, proyectos, etc. no deben provocar despliegues.
- Home ya no muestra `Próximos movimientos`. El menú semanal usa matriz día×momento a ancho completo y el auditor exige que cada comida aparezca en su celda exacta sin clipping/solapes.
- Momentos canónicos del menú: `Postre` se integra en `Comida` o `Cena`; `Snack` en `Media mañana` o `Merienda`; `Cierre` y `Cena · complemento` en `Cena`. El Sheet actual fue normalizado y el runtime mantiene compatibilidad con etiquetas legacy.
- Salud → Recetas reutiliza exclusivamente `Recetas`, `IngredientesReceta`, `PasosReceta` y la pestaña técnica oculta `RecipeMedia`.
- Foto de receta: el original privado vive en `DOCUMENTOS/SEGUNDO CEREBRO/AUXILIARES/RECETAS - FOTOS`; `Recetas` guarda la referencia Drive/MIME/timestamp. Como el OAuth actual de Google puede leer Sheets pero responde 403 al descargar media de Drive, la preview web privada se materializa en `RecipeMedia`. El Worker sirve primero esa preview y usa Drive solo como fallback. No hacer públicas las fotos.
- Caso verificado: `rec-fajitas-tiras-pollo-v1` tiene foto original privada y preview en `RecipeMedia`. Audit production web #87 verificó el 02/10/2026 que el endpoint de imagen devuelve `HTTP 200 · image/jpeg` y que la foto aparece visible en Salud → Recetas.
- Último deploy del HEAD de este relevo: `14b22d5f1a8e...`, Deploy private Cloudflare app #306 = success.
- Audit production web #87: 790 checks / 7 failures. Ninguno corresponde a menú ni recetario. Quedan: una ejecución schedule fallida de `MIDAS TFM shadow forecasts` y seis fallos de carga de imágenes de OBJETOS/Armario/Looks. No silenciar estos fallos: diagnosticarlos por separado.
- La corrección de fotos de recetas y la normalización de `Postre/ Snack/ Cierre` están documentadas también en `agents/HEALTH.md` y `docs/WEB_AUDIT.md`.
- Si el usuario muestra una captura antigua con la foto de fajitas rota, comprobar primero caché/versión desplegada: el backend actual ya está certificado como imagen válida por la auditoría. No rehacer el pipeline salvo que una comprobación nueva reproduzca el fallo.


## ORGANIZADOR 8 · cierre diagnóstico Audit production web #88 · 2026-10-02

- PR #199 / `74d94a44` corrige un falso positivo genérico del auditor visual: un `<img loading="lazy">` aún incompleto ya no se trata automáticamente como recurso roto. El auditor contrasta el mismo `src` mediante fetch autenticado y exige respuesta correcta, `Content-Type: image/*` y decodificación real por Chromium.
- Deploy private Cloudflare app #307 terminó correctamente y disparó Audit production web #88 sobre `74d94a44`.
- Audit #88: **790 checks / 1 failure**. Los seis fallos heredados de OBJETOS/Armario/Looks desaparecen: el auditor validó por contenido las 60 imágenes del Armario en desktop/tablet/mobile y las imágenes de Looks. No reingerir esas prendas ni modificar `SEGUNDO CEREBRO - OBJETOS`/D1 por este incidente.
- También pasan las comprobaciones globales de red y consola: sin 5xx/fallos de red y sin errores JavaScript/console.
- El único fallo restante es `MIDAS TFM shadow forecasts`, porque la última ejecución schedule sigue siendo el run #5 fallido del 01/10. Mantenerlo rojo hasta que un nuevo schedule termine correctamente; no rebajar ni silenciar el control.
- `mamg97/midas-paper-lab/main` ya contiene la corrección upstream `8bb6c174` (fallback de cierre Madrid desde barras horarias validadas + backup adelantado). La sesión perdida del 01/10 no se backfillea prospectivamente.


## ORGANIZADOR 8 · Recetas muestran foto completa · 2026-10-02

- PR #201 / `84db246c` corrige la presentación de Salud → Recetas: la foto principal deja de usar `object-fit: cover` y pasa a `object-fit: contain` + `object-position: center`.
- Se mantiene el marco 16:9 y el fondo neutro del contenedor; la prioridad visual es mostrar la imagen completa sin recorte, aunque queden bandas libres.
- `styles.css` usa cache-bust `v0.40.17`; los tests globales de assets quedaron alineados con esa versión.
- Deploy private Cloudflare app #308 y Pages #499 terminaron correctamente.
- Audit production web #89: **790 checks / 1 failure**. Salud → Recetas pasa: fuente completa, foto de `rec-fajitas-tiras-pollo-v1` visible, sin overflow, clipping, solapes, deformación ni problemas de carga/proporciones.
- El único rojo de #89 sigue siendo `MIDAS TFM shadow forecasts`; es independiente de Recetas.


## Relevo GESTOR OBJETOS - ROPA → GESTOR OBJETOS - ROPA 2 · 2026-10-02

Este relevo es continuación directa del gestor anterior. No reconstruir el armario desde conversaciones antiguas ni crear fuentes paralelas.

### Fuente y contratos que mandan

- Leer primero `AGENTS.md`, este `docs/HANDOFF.md`, `agents/OBJECTS.md`, `docs/OBJECTS_IMAGE_INGEST.md` y `docs/OBJECTS_VISUAL_PIPELINE.md`.
- Continuar exclusivamente desde el `main` vivo y comprobar HEAD antes de cualquier cambio.
- La única fuente canónica del dominio sigue siendo `SEGUNDO CEREBRO - OBJETOS`.
- Inventario/prendas viven en `Objetos + Armario`; los conjuntos viven en `Looks + LookItems`. No duplicar prendas, looks ni relaciones en Git, D1 o una hoja auxiliar.
- D1 es almacenamiento técnico privado de binarios visuales; Sheets conserva identidad, relaciones y referencias activas.

### Imágenes de prendas y de looks

- Para prendas, la UI prioriza `miniatura_url → foto_procesada_url → foto_original_url → Objetos.foto_url`.
- Para looks, `Looks.foto_url` es la imagen compuesta principal. Si está vacío, el frontend cae al mosaico de las prendas de `LookItems`.
- El commit `15a2a80a` añadió soporte canónico para imágenes compuestas de looks:
  - `POST /api/objects/look/:look_id/image`;
  - `GET /api/objects/look/:look_id/image?v=<version>`;
  - bridge `POST /ingest-look-image`;
  - fallback `OBJECTS_SEED_JOBS` con `look_id`.
- Una imagen de look es un derivado visual del `look_id`: no crear un `objeto_id` ficticio, no duplicar `LookItems` y no escribir manualmente una URL provisional en `Looks.foto_url`.
- Primera imagen de un look: `overwrite=false`. Sustitución deliberada: `overwrite=true`.
- Una ingesta solo se considera terminada tras `ok=true`, `Looks.foto_url` same-origin versionada y verificación en la web.

### Estado concreto tras cierre ROPA 2

- Los cuatro looks compuestos recientes siguen siendo las filas canónicas existentes; no se creó ningún look ni relación adicional.
- Verificación 2026-10-02: `Looks.foto_url` contiene una ruta privada same-origin versionada para los cuatro `look-render-*` recientes.
- Railway `objects-chatgpt-bridge` ejecutó el commit `15a2a80a`, que contiene `POST /ingest-look-image` y soporte de `look_id` en `seed.mjs`.
- El deploy de ingesta registró para los cuatro jobs `stage=done` y `ok=true`; los cuatro `foto_url` resultantes coinciden con los valores leídos posteriormente en `Looks`.
- El servicio quedó restaurado a `npm start`. El deploy de restauración terminó en `SUCCESS` y los logs muestran `OBJECTS_SEED_JOBS_EMPTY`; no volver a ejecutar el lote.
- Las copias temporales específicas de estas cuatro composiciones ya no están en la carpeta de staging de Drive. Permanecen allí otros ficheros históricos de prendas de septiembre; no eliminarlos como si pertenecieran a esta operación.
- `Audit production web` sobre `e9d8e125` verificó después de la ingesta la pestaña `Objetos → Looks`: imágenes cargadas/decodificadas, sin deformación, overflow, clipping ni solapes. El único fallo del audit fue MIDAS TFM y es ajeno a OBJETOS.
- Esta tarea queda cerrada. No reingerir estas cuatro imágenes ni escribir manualmente `Looks.foto_url` salvo sustitución futura deliberada con `overwrite=true`.

### Invariantes de UI que ya están cerrados

- Armario visual móvil: 2 columnas por debajo de 430 px; 3 columnas desde 430 px hasta tablet; 4 en escritorio según el contrato vigente.
- Las fotos procesadas de prendas deben conservar transparencia real; un fondo blanco aplanado no supera QA.
- El auditor web comprueba carga/decodificación real de imágenes y QA responsive; no tratar un `loading=lazy` incompleto como imagen rota sin verificar el recurso.
- Los cambios ordinarios del armario o los looks se resuelven en la fuente canónica; tocar frontend solo ante un defecto genérico de contrato/renderizado.


## ORGANIZADOR 8 · foto completa de Recetas + accesos Menú/Recetas · 2026-10-02

- La foto original de `rec-fajitas-tiras-pollo-v1` en Drive estaba correcta y completa; el problema visible no era pérdida del original.
- Se reparó la derivada privada `RecipeMedia` de esa receta a **480×270 (16:9)** preservando la foto vertical completa y usando relleno lateral, sin recortar el plato. Se mantuvo el mismo `foto_drive_file_id` original y se actualizó `foto_updated_at` a `2026-10-02T10:31:00+02:00` para romper caché.
- El contrato `agents/HEALTH.md` establece que las previews de recetas deben preservar la imagen completa; para fuentes verticales/cuadradas se admite encajarlas en un derivado 16:9 con padding neutro o desenfocado, nunca crop destructivo.
- PR #206 / `f9cabedd` añade al bloque inicial de Nutrición en Home accesos directos **Menú** y **Recetas**, conservando la acción principal de Nutrición y el layout responsive.
- El auditor valida desde ahora el `object-fit` computado de las fotos de Recetas y la presencia de ambos accesos directos.
- Deploy private Cloudflare app #310 terminó correctamente.
- Audit production web #92: **793 checks / 1 failure**. Pasan:
  - `Home · acceso directo Menú`;
  - `Home · acceso directo Recetas`;
  - foto `rec-fajitas-tiras-pollo-v1`: HTTP 200 image/jpeg;
  - carga visible;
  - foto completa: `object-fit=contain`, natural `480×270`, render `514×289`;
  - sin 5xx/fallos de red;
  - sin errores JavaScript/console.
- El único fallo de #92 sigue siendo `MIDAS TFM shadow forecasts` por el último schedule rojo heredado; es independiente de Salud/Recetas.


## ORGANIZADOR 8 · cierre overflow Home Nutrición · 2026-10-02

- Tras añadir los accesos directos Menú/Recetas, la tarjeta Home de Nutrición reintrodujo una rejilla interna horizontal con mínimos `150 + 300 + 170 px`. Como Home usa dos tarjetas por fila en escritorio, ese mínimo podía superar el ancho real de media fila y hacer que estado + `Ver nutrición →` salieran de la tarjeta.
- PR #208 / `335f13fa` corrige el layout sin reducir tipografía ni ocultar información: Nutrición vuelve a una composición interna de una columna, las métricas conservan su grid compartido, el estado puede envolver texto y Menú/Recetas permanecen como pie independiente.
- `styles.css` usa cache-bust `v0.40.19`.
- El auditor incorpora un control de **overflow local de componentes dentro de `#home-nutrition-card`**, además del overflow global de viewport, para detectar exactamente esta clase de regresión.
- Deploy private Cloudflare app #311 terminó correctamente.
- Audit production web #93: **868 checks / 1 failure**. Pasa `Visual desktop · Home · componentes dentro de su tarjeta`, además de tablet, mobile-wide y mobile; pasan también Menú/Recetas, foto completa de Recetas, red y consola.
- El único fallo restante continúa siendo `MIDAS TFM shadow forecasts`, independiente de Home/Nutrición.


## ORGANIZADOR 8 · Home v0.41 · navegación superior + Salud unificada · 2026-10-02

- PR #213 / `fbec1d57` elimina la barra de Consulta rápida del Home y conserva el Thinking Orb en el encabezado.
- La navegación lateral pasa a navegación superior `sticky`, horizontal y desplazable cuando no cabe. El menú móvil ya no depende de un drawer lateral.
- Hábitos + Salud/Nutrición se fusionan en una única `#home-health-card` de ancho completo.
- La tarjeta resume cuatro estados canónicos:
  - Hábitos de hoy: completados/total, porcentaje y racha;
  - Macros: proteína como dato prioritario + carbohidratos, grasa y kcal;
  - Actividad: cumplimiento de objetivos + pasos, kcal activas y minutos semanales;
  - Peso: peso del día o media disponible + media 7 d y delta semanal.
- Pie de tarjeta: Resumen, Hábitos, Médicos, Gimnasio, Nutrición, Recetas y Menú.
- El resumen de Salud consume `/api/health/overview`; no crea fuente de verdad paralela. El menú semanal Home mantiene su endpoint existente.
- PR #215 / `248f9129` elimina del auditor la dependencia legacy de `#home-kcal-ring` y valida el nuevo bloque Macros.
- Audit production web #98: **900 checks / 2 failures**. Todo el contrato nuevo del Home pasa en:
  - desktop-wide 1760×1000;
  - desktop 1440×1100;
  - tablet 900×1000;
  - mobile-wide 440×956;
  - mobile 390×844.
- En esos perfiles Home pasa sin overflow global, contenido fuera de viewport, clipping, solapes, overflow local, deformaciones ni problemas de proporción. Paletas light/dark también pasan donde aplica.
- #98 confirma carga real de la tarjeta: hábitos, macros/calorías, actividad y peso dejan de estar en estado `Cargando`.
- Los 2 fallos restantes de #98 son independientes:
  - `MIDAS TFM shadow forecasts`;
  - imágenes de Looks de OBJETOS.


## ORGANIZADOR 8 · Home v0.41.1 · anillos de Salud + Gym hoy + navegación principal · 2026-10-02

- PR #218 / `948fef12` refina la tarjeta unificada de Salud del Home.
- Los accesos inferiores de Salud quedan alineados **abajo a la izquierda**: Resumen, Hábitos, Médicos, Gimnasio, Nutrición, Recetas y Menú.
- La cabecera de Salud contiene ahora exactamente **cinco resúmenes circulares** usando el componente común `progress-ring`:
  1. Hábitos: completados/total, porcentaje de hoy y racha.
  2. Kcal hoy: consumidas/objetivo, porcentaje y margen/exceso.
  3. Proteína hoy: gramos/objetivo, porcentaje y gramos pendientes.
  4. Gym hoy: sustituye al resumen de pasos/Actividad.
  5. Peso: dato actual/media disponible + media 7 d y delta semanal.
- Gym hoy consume fuentes canónicas existentes (`/api/health/overview` + `/api/gym`) y no inventa calendario:
  - `Pausado` si el estado de fuerza está pausado, mostrando el motivo;
  - `Hecho` si existe sesión registrada en la fecha actual;
  - `Descanso` si el objetivo semanal ya está cubierto;
  - `Sugerido` en otro caso, usando la siguiente sesión del plan según la misma lógica del panel Gimnasio.
- El Home ya no usa pasos como KPI principal de Salud.
- La navegación superior muestra únicamente las **10 áreas principales canónicas**. No se renderizan `.nav-subnav` ni `.nav-link-child`.
- Assets Home: `app.js?v=0.41.1` y `styles.css?v=0.41.1`.
- PR #219 / `27549eed` corrige un falso positivo del auditor: la palabra “pasos” puede aparecer en texto libre (por ejemplo un motivo de pausa); el control valida estructuralmente la desaparición del antiguo bloque Actividad y la existencia de Gym hoy.
- Audit production web #101, reintento final: **729 checks / 2 failures**.
- Pasan explícitamente:
  - cinco resúmenes circulares;
  - accesos de Salud abajo a la izquierda;
  - navegación 10/10 solo con áreas principales y sin subapartados;
  - sustitución Actividad/pasos → Gym hoy;
  - progreso diario de kcal;
  - progreso diario de proteína;
  - estado Gym hoy;
  - Home responsive sin overflow/clipping/solapes en desktop-wide, desktop, tablet, mobile-wide y mobile;
  - sin 5xx/fallos de red;
  - sin errores JavaScript/console.
- Los dos fallos restantes son independientes:
  - `MIDAS TFM shadow forecasts`;
  - carga de imágenes de Looks de OBJETOS.


## ORGANIZADOR 8 · Home freshness + tarjetas compactas + obligaciones · 2026-10-02

- PR #221 integra el ajuste solicitado sobre Home:
  - Salud muestra timestamp/fuente debajo de Hábitos, Kcal, Proteína, Gym y Peso;
  - el motivo de pausa de Gym se resume en Home y el detalle largo permanece en Salud/Gimnasio;
  - Peso deja de sustituirse por la media de 7 días cuando no hay muestra del día: usa la última medición real de `bodyMass`, con fuente y fecha/hora; media 7 d y delta quedan solo como contexto;
  - Despensa y Objetos incorporan accesos directos a sus apartados existentes;
  - Patrimonio incorpora accesos Detalle / Evolución / MIDAS;
  - Obligaciones activas integra resumen de principales deudas y Financiera El Corte Inglés;
  - la tarjeta independiente de El Corte Inglés desaparece para evitar duplicación visual;
  - no se modificaron Sheets ni se creó ninguna fuente paralela.
- PR #222 corrige el último detalle de layout: las tarjetas compactas usan altura natural y ya no se estiran artificialmente por la altura de tarjetas vecinas.
- Estado validado en producción por Audit production web #103:
  - 750 checks;
  - Home pasa en desktop-wide, desktop, tablet, mobile-wide y mobile sin overflow, clipping ni solapes;
  - cinco timestamps de Salud resueltos;
  - Gym con motivo breve;
  - Peso de Home coincide con la última muestra real de la API y muestra fuente/fecha;
  - Despensa/Objetos y bloques financieros usan altura natural;
  - accesos de Despensa, Objetos, Patrimonio y Deudas disponibles;
  - ECI integrado en Obligaciones activas.
- En la validación #103, la última muestra real de peso era 79,1 kg desde Zepp Life, 30 sept 07:43. Este valor es un ejemplo observado de producción y no debe hardcodearse.
- Fallos restantes de #103, independientes de este cambio:
  - `MIDAS TFM shadow forecasts`: último schedule fallido;
  - validación visual de imágenes de `Objetos · looks`.


## Relevo ORGANIZADOR 8 → ORGANIZADOR 9 · 2026-10-02

Este relevo es continuación directa de ORGANIZADOR 8. No reconstruir el Home, Salud, Recetas, Objetos ni Finanzas desde conversaciones antiguas. Continuar exclusivamente desde el `main` vivo y aplicar PRE-GIT GATE antes de cualquier cambio.

### HEAD de referencia al relevo

- `main`: `131c2adf2976a12bf3edb8eae7aa515cdeaa8e2d`
- Último bloque funcional cerrado:
  - PR #221 · `ca7b812e` · Home freshness, tarjetas compactas y obligaciones enriquecidas.
  - PR #222 · `ff34a700` · alturas naturales en tarjetas compactas.
  - PR #223 · `131c2adf` · documentación del contrato anterior.
- Deploy privado de referencia: **#321 success**.
- Audit production web de referencia: **#103 · 750 checks / 2 failures**.

### Contrato vigente del Home

- No existe la barra `Consulta rápida`.
- El Thinking Orb se conserva en el encabezado.
- La navegación principal está arriba, `sticky`, horizontal y muestra **solo las 10 áreas principales canónicas**; no renderiza subapartados secundarios.
- Salud es una única tarjeta de ancho completo con cinco resúmenes circulares:
  1. Hábitos.
  2. Kcal hoy.
  3. Proteína hoy.
  4. Gym hoy.
  5. Peso.
- Los accesos de Salud están abajo a la izquierda: Resumen, Hábitos, Médicos, Gimnasio, Nutrición, Recetas y Menú.
- Gym hoy no usa pasos como KPI. Estados posibles con fuentes canónicas: `Hecho`, `Pausado`, `Descanso`, `Sugerido`.
- El motivo de pausa mostrado en Home es breve; el detalle largo permanece en Salud/Gimnasio.
- Debajo de cada resumen de Salud existe timestamp/fuente:
  - Hábitos: freshness real de HabitQuest.
  - Kcal/Proteína: última actualización real de nutrición/objetivo.
  - Gym: timestamp del estado/pausa o de la sesión.
  - Peso: **última medición real de bodyMass**, no la media de 7 días usada como sustituto.
- La media 7 d y el delta semanal del peso son contexto, no el valor principal cuando falta muestra del día.
- Audit #103 observó como ejemplo de producción: `79,1 kg · Zepp Life · 30 sept 07:43`. Es un dato observado, no hardcodearlo.

### Tarjetas inferiores cerradas

- Despensa y Objetos usan altura natural; no reservar grandes huecos por igualación artificial de filas.
- Despensa tiene accesos rápidos existentes: Inventario y Lista compra.
- Objetos tiene accesos: Inventario, Armario, Looks y Kits.
- Patrimonio tiene accesos: Detalle, Evolución y MIDAS.
- Obligaciones activas integra:
  - saldo pendiente;
  - cuota mensual;
  - número de deudas;
  - breakdown breve de obligaciones principales;
  - resumen de Financiera El Corte Inglés.
- La tarjeta independiente de El Corte Inglés fue eliminada para evitar duplicidad visual y contable.
- ECI no debe sumarse dos veces; usar el resumen ya expuesto por las fuentes financieras existentes.
- No se modificaron Sheets para estos cambios: fueron capacidades/UI sobre datos canónicos ya disponibles.

### Recetas / Salud ya cerrados

- Recetas vive en `SEGUNDO CEREBRO - SALUD`: `Recetas`, `IngredientesReceta`, `PasosReceta`, `RecipeMedia`.
- La foto principal de Recetas usa `object-fit: contain`.
- `rec-fajitas-tiras-pollo-v1` tiene derivada `RecipeMedia` 480×270 que conserva la foto completa.
- No hacer públicas fotos privadas ni guardarlas en Git.
- El gestor especializado `GESTOR - RECETAS` debe encargarse de nuevas fotos/recetas siguiendo el pipeline documentado; ORGANIZADOR solo coordina o corrige capacidades genéricas.

### OBJETOS / Armario / Looks

- Armario y looks tienen su propio gestor y contratos; no reconstruirlos desde ORGANIZADOR.
- El pipeline visual canónico está documentado en `docs/OBJECTS_IMAGE_INGEST.md` y `docs/OBJECTS_VISUAL_PIPELINE.md`.
- Los looks recientes ya fueron ingeridos y no deben reingerirse salvo sustitución deliberada con `overwrite=true`.

### Auditoría y pendientes reales al relevo

Audit #103 cerró correctamente:
- Home responsive en desktop-wide, desktop, tablet, mobile-wide y mobile;
- cinco timestamps de Salud;
- motivo breve de pausa Gym;
- peso coincidente con la última muestra real + fuente/fecha;
- tarjetas inferiores con altura natural;
- accesos rápidos de Despensa, Objetos, Patrimonio y Deudas;
- ECI integrado en Obligaciones activas;
- sin 5xx/fallos de red;
- sin errores JavaScript/console.

Los **2 fallos restantes de #103** son independientes del Home:

1. `MIDAS TFM shadow forecasts`
   - último schedule conocido: run #5 del 01/10, failure;
   - no silenciar ni rebajar el control;
   - la corrección upstream de MIDAS ya existía; mantener rojo hasta un nuevo schedule válido.

2. `Visual desktop · Objetos · looks · imágenes cargadas`
   - cuatro URLs same-origin de looks terminan en `AbortError` durante el probe de auditoría;
   - no asumir automáticamente corrupción de D1 ni reingerir imágenes;
   - diagnosticar con el gestor OBJETOS/ROPA y separar timeout/probe del estado real del asset.

### Diagnóstico ORGANIZADOR 9 · 2026-10-02 14:55 CEST

- MIDAS TFM: el fallo rojo heredado sigue siendo correcto por ahora. La corrección upstream está fusionada en `mamg97/midas-paper-lab` commit `8bb6c174` (PR #28, 2026-10-02 08:59 CEST), pero el workflow `MIDAS TFM shadow forecasts` solo considera ejecuciones `schedule`; el siguiente slot primario es hoy a las **21:23 CEST**. No forzar verde con `workflow_dispatch` ni relajar el auditor.
- Looks/OBJETOS: el probe visual tenía un timeout local de 6 s y reintentaba todas las imágenes pendientes en paralelo. Esto puede provocar `AbortError` por contención sin demostrar corrupción del asset. PR #225 cambia únicamente el auditor: probes secuenciales y un segundo intento de hasta 15 s solo cuando el primero termina en `AbortError`; 404/5xx, MIME no imagen y fallo de decodificación siguen siendo errores reales.
- PRE-GIT GATE aplicado: no se modifican `SEGUNDO CEREBRO - OBJETOS`, D1, URLs ni imágenes existentes; no reingerir looks por este incidente.
- PR #225 se fusionó y desplegó correctamente. Audit production web **#104** confirmó que los `AbortError` desaparecieron, pero dejó tres fallos: MIDAS TFM esperado; cuatro Looks HTTP 200 `image/svg+xml` que `createImageBitmap` no podía decodificar; y un falso positivo de MenuSemanal al comparar momentos legacy crudos contra grupos ya canonicalizados por la UI.
- PR #226 corrige solo el auditor: fallback de decodificación mediante `<img>` para formatos no soportados por `createImageBitmap`, y canonicalización compartida de momentos del menú con tests. No toca Sheets, D1, imágenes ni contenido nutricional.
- Audit production web **#106** mostró que el fallback de PR #226 todavía usaba `blob:`, bloqueado por la CSP (`img-src 'self' data: https:`), y que el check de menú seguía asociando las tarjetas por posición. Siguiente corrección: validar el SVG como `data:` y localizar cada tarjeta por su etiqueta canónica; MIDAS TFM continúa siendo el único fallo upstream esperado.
- PR #227 se fusionó y desplegó en `main` `2c0161a1`. Audit production web **#107**: **775 checks / 1 failure**. Looks pasa (SVG validado sin falsos positivos), MenuSemanal pasa incluida la comprobación de macros ausentes y no hay errores JS/CSP. El único fallo restante es `MIDAS TFM shadow forecasts`, que debe permanecer rojo hasta una nueva ejecución `schedule` correcta posterior al fix upstream `8bb6c174`.

### Regla operativa para ORGANIZADOR 9

Antes de cualquier cambio:
1. leer `AGENTS.md` completo;
2. leer `docs/HANDOFF.md` completo;
3. leer `docs/WEB_AUDIT.md`;
4. leer solo los contratos `agents/*` de los dominios realmente afectados;
5. comprobar HEAD actual de `main`;
6. aplicar PRE-GIT GATE;
7. preferir cambios de datos en fuentes canónicas frente a código;
8. para cambios de código: rama desde HEAD vivo → tests → PR → CI → merge → deploy → Audit production web;
9. no ocultar fallos independientes para poner verde un audit;
10. no rehacer capacidades ya documentadas como cerradas.


### ORGANIZADOR 9 · Home v0.41.4 + freshness de peso · 2026-10-02

- PR #230 / `a4f2eba3` cerró el ajuste visual solicitado en Home:
  - Peso ya no usa rueda de progreso; mantiene valor real, media 7 d, delta y fuente/hora.
  - Salud elimina la fila vacía heredada y reduce densidad sin reducir legibilidad.
  - Despensa/Objetos comparten fila 50/50 con misma altura y contenido compacto.
  - Patrimonio/Obligaciones comparten fila 50/50 con altura equilibrada.
  - Toda la aplicación usa la familia sans canónica Avenir Next/Avenir/Segoe UI/system-ui; se eliminó Iowan/Palatino.
- Deploy privado #326: success.
- Audit production web #109: **836 checks / 1 failure**.
  - Home pasa en desktop-wide, desktop, tablet, mobile-wide y mobile sin overflow, clipping ni solapes.
  - El único fallo sigue siendo `MIDAS TFM shadow forecasts`, independiente del Home.
- Diagnóstico del peso: el Home automático no depende de `MedicionesCorporalesApple`. El flujo vivo es HealthKit → bridge iOS → ingest Worker → D1 → Home; el Sheet corporal es derivado.
- PR #231 / `c6a30ec5` fusionó la mejora de freshness del bridge:
  - los tipos corporales HealthKit solicitan Background Delivery `.immediate`;
  - actividad/recuperación permanecen `.hourly`;
  - el bridge reconcilia hoy + ayer al volver a primer plano;
  - el BGAppRefresh fallback pasa de 3 h a una solicitud a partir de 1 h (iOS conserva la decisión final de ejecución).
- Validate iOS Health bridge #11: build success.
- Importante: al ser una app iOS de desarrollo instalada desde Xcode, el merge en Git no actualiza por sí solo el binario que ya está en el iPhone. Para que la nueva cadencia entre en vigor hay que recompilar/instalar la versión actual del proyecto en el dispositivo.
- Audit production web #109, ejecutado antes de actualizar el binario del iPhone, seguía viendo como última muestra corporal la misma medición antigua que ya existía en D1. Por tanto el frontend estaba leyendo correctamente D1; el punto pendiente real era dispositivo/HealthKit → bridge.
- No “arreglar” freshness editando manualmente el Sheet derivado. Si una pesada nueva está en Apple Health y no llega a D1, diagnosticar bridge/autorización/background delivery.


### ORGANIZADOR 9 · paridad Salud Resumen / Home · 2026-10-02

- Petición: el Resumen de Salud debe cuadrar con la tarjeta Salud del Home y no presentar `Nutrición 0/4` como si fuese progreso diario.
- Rama `organizador9/health-summary-home-parity`:
  - la fila superior de Salud pasa a Hábitos / Kcal hoy / Proteína hoy / Gym hoy / Peso, con las mismas reglas del Home;
  - Gym usa una derivación compartida para que estados y motivo sean idénticos;
  - Peso usa una derivación compartida y la última muestra real en ambas superficies;
  - la tendencia semanal de peso exige ≥5/7 días con dato tanto en la ventana actual como en la previa; si no, se muestra cobertura y no un delta semanal engañoso;
  - Composición corporal muestra fecha/fuente o cobertura para último peso, media 7 d, cambio, cintura, grasa y masa magra;
  - el auditor compara los cinco valores principales de Salud contra Home para impedir divergencias futuras.
- No se modifican datos del Sheet: es una corrección reutilizable de semántica/presentación.

- PR #233 fusionado en `f48d6ed7`: cambio funcional desplegado.
- PR #234 fusionado en `d4a4b9ae`: el auditor espera a que Resumen termine de cargar antes de contar KPIs/anillos; no cambia UI ni datos.
- Audit production web **#112**: **844 checks / 1 failure**.
  - Resumen Salud usa exactamente cinco KPIs y cuatro anillos.
  - Hábitos coincide con Home: `1 / 16`.
  - Kcal coincide con Home: `514 / 1950 kcal`.
  - Proteína coincide con Home: `32 / 175 g`.
  - Gym coincide con Home: `Pausado`.
  - Peso coincide con Home: `79,1 kg`.
  - Composición corporal muestra freshness/cobertura en sus seis métricas.
  - No hubo 5xx ni fallos de red.
  - Único fallo restante: `MIDAS TFM shadow forecasts`, independiente de Salud.

### GESTOR RECETAS · catálogo compacto + ficha ampliada · 2026-10-02

- Petición cerrada: `Salud → Recetas` usa una vista principal compacta tipo Armario.
  - cada tarjeta muestra únicamente foto + nombre;
  - densidad responsive: 4 columnas en escritorio, 3 en tablet/mobile-wide y 2 en móvil estrecho;
  - al pulsar una receta se abre una ficha grande dentro del mismo panel con foto, raciones/macros, ingredientes, preparación y notas;
  - la ficha incluye `← Volver al recetario` y restaura el catálogo completo.
- PR #236 fusionado en `deacb80b`.
- Deploy privado #329: **success**.
- Audit production web #113, intento 1:
  - Recetas pasó todos sus checks nuevos;
  - el recorrido global terminó con dos fallos no atribuibles al recetario: `MIDAS TFM shadow forecasts` y una ráfaga transitoria de 5xx en APIs/miniaturas.
- Audit production web #113, intento 2:
  - **849 checks / 1 failure**;
  - desaparecieron los 5xx transitorios;
  - único fallo restante: `MIDAS TFM shadow forecasts`, independiente de Recetas.
- Validación específica en producción:
  - fuente completa: **35/35 recetas**;
  - fotos servidas correctamente y con `object-fit: contain`;
  - catálogo compacto conserva toda la fuente;
  - abre ficha completa;
  - muestra ingredientes + preparación;
  - ofrece volver;
  - vuelve al catálogo completo **35/35**.
- No se cambiaron datos canónicos de Salud ni RecipeMedia para este trabajo; fue únicamente una capacidad genérica de presentación/auditoría.



### ORGANIZADOR 9 · Biblioteca visual gratuita de ejercicios · 2026-10-04

- Petición: incorporar en `Salud → Gimnasio` una biblioteca visual tipo Lyfta/RepDB, con demostraciones animadas, buscador, ficha técnica y posibilidad de asociar/añadir ejercicios, manteniendo coste incremental cero.
- Decisión D-047: wger es la fuente pública de referencia; `GimnasioPlan` sigue siendo la fuente canónica del plan y las sesiones/progreso siguen en D1.
- PR #240 / `8441a510` implementó:
  - subvista `Mi plan | Biblioteca de ejercicios`;
  - buscador + filtros por músculo/equipamiento y vista inicial `Con vídeo`;
  - tarjetas visuales con vídeo en loop o imagen/placeholder;
  - ficha grande con demostración, descripción, músculos principales/secundarios, equipamiento y atribución/licencia;
  - botón `Técnica` en ejercicios del plan, también visible durante pausas;
  - mapping técnico D1 `gym_exercise_links` entre `exercise_id` canónico y ficha wger;
  - acción explícita para vincular una ficha a un ejercicio existente sin renombrar/recrear el plan;
  - acción `Añadir al plan` que escribe una fila normal en `GimnasioPlan` con día/series/reps elegidos;
  - proxy same-origin para multimedia: el navegador no consume directamente una API premium;
  - solo se muestran assets con metadatos de licencia.
- Restricción permanente: **sin APIs/licencias de pago y sin scraping de Lyfta, RepDB Premium, ExerciseDB de pago o mirrors de procedencia ambigua**.
- Audit #134 detectó el único bug funcional inicial de Gym: 502 al usar una ruta antigua de vídeos wger.
- PR #241 / `7375af09` corrigió la ruta oficial a `/api/v2/video/` y añadió test anti-regresión.
- Deploy privado #333: success.
- Audit production web #135: **882 checks / 2 failures**.
  - Gym: Mi plan PASS.
  - Gym: Biblioteca PASS.
  - fuente libre + 0 € PASS.
  - biblioteca real PASS con **24 ejercicios** cargados.
  - recurso visual PASS.
  - ficha visual PASS.
  - demostración/referencia PASS.
  - atribución PASS.
  - control `Añadir al plan` presente PASS, sin ejecutar escrituras durante el audit.
  - sin respuestas 5xx ni fallos de red PASS.
  - QA visual general responsive de Salud pasa en tablet y móvil sin overflow, clipping ni solapes.
  - únicos rojos: `MIDAS TFM shadow forecasts` y `MIDAS weekly ML paper`, independientes de Gym.
- No se han vinculado automáticamente ejercicios privados del plan a resultados fuzzy: al pulsar `Técnica` se propone una ficha y el usuario confirma `Usar esta ficha para mi ejercicio`. Esto evita guardar asociaciones incorrectas.

### GESTOR GYM · GIF anatómico 2D propio · piloto v0.42.14 · 2026-10-04

- Preferencia confirmada: las demostraciones principales deben evolucionar desde vídeo real hacia bucles ilustrados tipo GIF, limpios y coherentes con la interfaz.
- No se usan packs de GIF comerciales, mirrors de ExerciseDB ni repositorios con derechos ambiguos. wger continúa como referencia técnica libre y como fallback multimedia.
- La rama `codex/gym-nutri-next`, actualizada sobre el `origin/main` vivo `10efa41`, incorpora el primer piloto para `Press de Banca Plano (Barra)`:
  - GIF real propio de 16 fases, 360×480 y fondo transparente;
  - ilustración anatómica 2D gris/blanca, con contorno fino y sombreado muscular discreto;
  - pectoral, tríceps y deltoide anterior marcados en rojo plano;
  - equipo gris carbón y encuadre fijo, sin persona real ni volumen 3D brillante;
  - poster PNG estático para `prefers-reduced-motion`, compatible con la CSP;
  - prioridad visual únicamente por nombre/ID canónico exacto;
  - fallback intacto a vídeo/imagen wger para el resto;
  - `prefers-reduced-motion` deja un fotograma estático.
- El piloto está en rama de revisión y todavía no se ha fusionado ni desplegado. Antes de producir el resto del plan, confirmar el estilo y revisar visualmente cada movimiento por lotes pequeños.
- El usuario rechazó el aspecto 3D de v0.42.3. `v0.42.4` adoptó el lenguaje de una enciclopedia anatómica de ejercicios; la captura facilitada se usó solo como referencia estilística, sin copiar marca, interfaz ni contenido.
- `v0.42.14` normaliza las ocho fases aprobadas a la misma anchura visible y línea de apoyo, y añade un intermedio neuronal local entre cada par —incluido el cierre del bucle—. El resultado duplica la cadencia a 16 fases sin redibujar ocho escenas independientes, sin fundidos fantasma y con lienzo, encuadre y escala bloqueados.
- Las versiones v0.42.1–v0.42.4 no deben desplegarse. Validación final de v0.42.14 sobre `origin/main` `10efa41`: 156/156 tests, build privado y copia byte a byte de GIF/póster al artefacto compilado correctos; revisión visual del bucle en tarjeta clara sin saltos de encuadre, fondos negros ni extremidades fantasma.


### RECETARIO · fichas de alimentos desde ingredientes · 2026-10-04

- Nueva capacidad: cada ingrediente de una receta abre la ficha compartida de producto dentro de Salud y permite volver a la misma receta.
- Contrato añadido: `IngredientesReceta.producto_id` opcional (L), referencia a `Productos.producto_id`; `Productos.imagen_url` opcional (R).
- Identidad/nutrición/imagen/precios siguen siendo autoridad de Despensa; recetas/cantidades/preparación siguen en Salud. No se crea una fuente paralela.
- Ficha: contexto/cantidad/macros del ingrediente, macros por 100 g con fuente, formato/EAN, stock cuando exista, precios fechados con base/fuente y enlace comercial. Datos ausentes permanecen pendientes.
- API privada read-only: `GET /api/pantry/products/:producto_id`, válida también para productos sin inventario actual.
- Mercadona: referencia pública opcional por SKU exacto de una URL canónica; imagen/precio online orientativo, timeout/cache y degradación sin bloquear la ficha ni sustituir macros. Sin dependencia de pago.
- No hay matching fuzzy; los IDs explícitos prevalecen y un ID roto no se reemplaza por nombre. Sin ID solo se admite coincidencia única exacta normalizada.
- Nuevos enlaces ordinarios se hacen solo en el Sheet. Las subrecetas o ingredientes genéricos pendientes siguen abriendo su contexto sin inventar un producto comercial.
- Auditor ampliado: apertura, contexto, macros por 100 g, retorno y QA responsive de la ficha de alimento.
- Entregado en PR #245 / `6dc3a8c5`; CI privado #279 y deploy privado #334: success, incluido `Deploy production Worker`.
- Pruebas locales dirigidas y suite completa de CI pasan; frontend/Worker/auditor sin errores de sintaxis.
- Audit production web #137: 918 checks / 3 failures. Recetario PASS: catálogo completo, ingredientes pulsables, apertura de ficha, contexto/cantidad, separación de macros por 100 g, retorno a la misma receta y al catálogo.
- QA responsive de la ficha PASS a 1440, 900 y 390 px: sin overflow, clipping, solapes ni deformación.
- Rojos globales ajenos al recorrido del Recetario: dos workflows MIDAS previos (`TFM shadow forecasts`, `weekly ML paper`) e HTTP 500 en rutas de imágenes de Looks. La auditoría completa NO se declara verde.
- Alcance de la comprobación: el auditor abre un ingrediente de la primera receta; no certifica cada vínculo comercial ni la disponibilidad de imagen/precio online de todos los SKU. La referencia Mercadona degrada a pendiente si falla.
- Siguiente paso de datos, sin despliegue: completar en las fuentes canónicas los productos comerciales pendientes, sus enlaces exactos, imagen y nutrición documentada; no asignar genéricos o subrecetas por similitud.
- La verificación manual en navegador de esta sesión quedó bloqueada por acceso denegado; no se intentó eludirla. El resultado manual no está certificado.


### GESTOR GYM Y NUTRI · reconciliación de recetas compartidas · 2026-10-04

- Diagnóstico cerrado: la hidratación genérica de `MenuSemanal` resolvía macros desde `Recetas` para unidades tipo `ración`, pero no para fracciones explícitas de una receta completa como `plato compartido` o `pieza compartida`. Una fila consumida podía existir correctamente y seguir mostrando nutrición incompleta aunque la receta maestra ya tuviera macros.
- PR #246 / `96810e78` amplía `prepareWeeklyMenuRows` para que las unidades compartidas escalen macros e ingredientes por la fracción indicada y por el número de raciones de la receta. Las recetas pendientes siguen sin inventar nutrición y el comportamiento de `ración` permanece sin cambios.
- Validación: CI `Validate private Cloudflare app` #280 success; deploy privado #335 success.
- Audit production web #138: 918 checks. Salud → Menú/Nutrición, agrupación de tomas y barras de kcal/proteína pasan para todos los días. Los dos únicos fallos son `MIDAS TFM shadow forecasts` y `MIDAS weekly ML paper`, independientes de Nutrición.
- Los backfills concretos de consumos se hicieron únicamente en la fuente privada canónica `SEGUNDO CEREBRO - SALUD`; no se guardaron valores personales en Git.


### Salud · separación GESTOR GYM / GESTOR NUTRI · 2026-10-04

- El antiguo rol operativo `GESTOR GYM Y NUTRI` queda dividido en dos gestores especializados que comparten las mismas fuentes canónicas de Salud y no crean estados paralelos.
- `GESTOR GYM` es propietario funcional de entrenamiento, plan de gimnasio, ejercicios, sesiones realizadas, progresión, técnica, programación, fatiga/recuperación deportiva y retorno progresivo tras pausas.
- `GESTOR NUTRI` es propietario funcional de ingesta, macros, comidas, menú semanal, recetas y planificación nutricional.
- `GESTOR GYM` debe leer antes de aconsejar: objetivos vivos de Salud, plan canónico, sesiones D1, benchmarks/progresión, pausa/restricciones y contexto Apple Health cuando sea relevante.
- `GESTOR NUTRI` puede consultar contexto de actividad/entrenamiento para interpretar necesidades, pero no modifica el plan de fuerza; `GESTOR GYM` puede consultar nutrición para recuperación/rendimiento, pero no duplica ni reescribe el registro nutricional.
- La biblioteca visual wger sigue siendo solo referencia pública; `GimnasioPlan` conserva el plan canónico y D1 conserva sesiones/progresión. No reconstruir esta capacidad.
- Los valores personales, marcas, métricas corporales, restricciones médicas y sesiones reales permanecen exclusivamente en fuentes privadas. Git documenta solo responsabilidades y contratos.


## Relevo · Menú → Recetas + alimentos canónicos de Despensa · 2026-10-04

- Se cerró la navegación desde `Salud → Menú`: al desplegar una comida con `recipe_id`, aparece **Abrir receta →** y se abre la ficha exacta del recetario. La vuelta desde esa ficha regresa al menú. En móvil, además, el título verde de cada comida enlazada es directamente pulsable (zona táctil amplia) para no depender del botón situado al final del desplegable. La misma navegación se extiende al **Menú de la semana de Home**: el nombre de una comida con receta abre directamente la receta canónica y `Volver al resumen` cierra la ficha y devuelve a portada.
- Las filas simples con `food_id` usan ese valor como identidad canónica de `SEGUNDO CEREBRO - DESPENSA / Productos`; cuando resuelve, el desplegable ofrece **Ver alimento en Despensa →** y reutiliza la misma ficha de producto.
- `prepareWeeklyMenuRows` acepta el maestro de productos de Pantry, expone estado de sincronización y solo completa macros ausentes desde nutrición por 100 g cuando la cantidad está expresada inequívocamente en gramos. Macros explícitos ya registrados no se sobrescriben.
- La lectura completa de Nutrición hidrata Pantry de forma fail-soft: un fallo temporal de Despensa no rompe Salud, pero tampoco crea una identidad alternativa.
- Auditoría canónica previa a la migración: 14 filas de `MenuSemanal` con `food_id`, todas resuelven contra Despensa; 77 ingredientes de receta con `producto_id`, sin referencias rotas. `Comidas` sigue siendo catálogo de platos personales/compatibilidad, no maestro de producto envasado.
- El auditor de producción valida enlaces Menú→Receta, retorno al menú, enlaces de alimentos a Despensa y ausencia de `food_id` desincronizados cuando Despensa responde correctamente.


### Corrección Home · recipe_id en payload ligero · 2026-10-04

- Incidencia reproducida en producción: el auditor detectó `UI=0 / API=17` enlaces de receta en el menú semanal de Home.
- Causa: Home podía ser re-renderizado por `/api/nutrition/menu` (payload ligero), que conserva `recipe_id` pero no adjunta el objeto `recipe`. El renderer exigía ambas cosas y degradaba el título a texto no interactivo.
- Regla corregida: en Home, la existencia de `recipe_id` basta para renderizar el nombre como enlace. Al pulsar, `openHomeWeeklyMenuRecipe` reutiliza la receta si ya está cargada o solicita `/api/nutrition` de forma perezosa para abrir la ficha canónica.
- Se sube versión de assets para evitar caché móvil y se añade regresión específica para payload ligero.


### ORGANIZADOR 10 · historial de uso de Looks y Prendas · 2026-10-04

- PR #270 amplía `Objetos → Looks → Historial de uso` sin crear nuevas fuentes.
- La vista tiene dos modos: `Looks` y `Prendas`.
- Ambos modos muestran tabla con último uso, usos totales, usos con fecha en los últimos 30 días y todas las fechas registradas; se puede ordenar por fecha más reciente, más antigua, total o últimos 30 días.
- `Looks` usa `Looks.historico_usos + ultimo_uso + veces_usado`.
- `Prendas` deriva fechas de los usos de los looks que contienen cada `objeto_id` y añade `Armario.ultimo_uso`; `Armario.veces_usado` conserva prioridad para el total global cuando existe.
- No se fabrican fechas para completar contadores sin detalle temporal. Por ello el total global puede ser superior al número de fechas visibles y el contador de últimos 30 días solo incluye fechas realmente disponibles.
- El historial muestra una miniatura compacta a la izquierda tanto en `Looks` como en `Prendas`, reutilizando la imagen canónica vigente (`look.photoUrl`/mosaico o prioridad visual de `Armario`) y sin duplicar assets.
- El auditor de producción comprueba acceso al historial, tabla, ordenación, miniaturas por fila y conmutación real a la vista `Prendas`.


### ORGANIZADOR 10 · compactación móvil del historial de armario · 2026-10-05

- El historial `Objetos → Looks → Historial de uso` se compacta específicamente en móvil: cabecera/KPIs más densos, selector Looks/Prendas y ordenación en una misma franja, y cada fila agrupa miniatura + nombre + tres métricas en una sola banda.
- Las fechas registradas permanecen disponibles, pero en móvil se muestran en una banda horizontal desplazable para evitar que cada tarjeta crezca verticalmente.
- Orden canónico por defecto: uso más reciente; las filas sin fecha válida quedan siempre al final, también como desempate en ordenaciones por total/últimos 30 días.
- Los valores de `historico_usos` que no sean fechas normalizables se ignoran como fecha (p. ej. notas textuales), sin alterar `veces_usado`.
- El auditor comprueba explícitamente orden por defecto, filas sin fecha al final y altura máxima compacta en móvil.


### ORGANIZADOR 10 · corrección Safari del historial móvil · 2026-10-05

- La captura real en iPhone mostró una regresión estructural: Safari separaba las celdas de la tabla convertida a CSS Grid, apilando miniaturas arriba y el resto de la fila debajo.
- Solución canónica: escritorio/tablet conservan `<table>`; en `<=560px` la tabla se oculta y se renderiza `look-history-mobile-list` con una tarjeta por fila a partir del mismo array `rows`. No hay fuente ni cálculo duplicado.
- Cada tarjeta móvil mantiene juntos miniatura, nombre/detalle, último uso, usos totales, usos 30 días y fechas registradas.
- El auditor exige en móvil tarjetas visibles, tabla desktop oculta, una miniatura por tarjeta, orden reciente por defecto y looks sin fecha al final.


## Nutrición · ownership del menú y semántica visual · 05/10/2026

- Regla operativa de GESTOR NUTRI: **Miguel aporta Comida y Cena; el gestor completa Desayuno, Media mañana y Merienda** para acercar cada día a los objetivos activos de kcal/proteína.
- Comida/Cena son restricciones del plan doméstico y no se sustituyen para cuadrar macros. El ajuste se hace con las tomas auxiliares, priorizando recetas/productos ya canónicos y stock de Despensa.
- En días de oficina se respetan las reglas activas de `Objetivos`; si no se lleva comida por la mañana, el ajuste nutricional se desplaza a las tomas permitidas.
- Si faltan macros de Comida/Cena, el cierre diario es provisional y debe recalcularse cuando esas cantidades se concreten.
- **Verde/mint en el menú significa exclusivamente `estado=consumido`.** Una receta o producto puede ser pulsable sin ponerse verde. La existencia de `recipe_id`/`food_id` no codifica estado de consumo.
- Los cambios de contenido del menú siguen siendo mutaciones de `MenuSemanal`/fuentes privadas; el frontend solo se toca para defectos genéricos de presentación o semántica como esta regla de color.


## GESTOR NUTRI · relevo de conversación · 05/10/2026

### Reglas operativas cerradas

- Miguel define **Comida** y **Cena** del menú doméstico. GESTOR NUTRI completa **Desayuno**, **Media mañana** y **Merienda** para aproximar cada día a los objetivos activos de energía/proteína, sin cambiar las comidas/cenas fijadas.
- Las tomas auxiliares se construyen con recetas/productos canónicos y stock real de Despensa; en días de oficina se respetan las reglas activas de `Objetivos`.
- Si una comida/cena todavía no tiene cantidades/macros suficientes, el cierre diario es provisional y debe reajustarse cuando esos datos existan.
- En la UI del menú, **verde/mint = `estado=consumido` exclusivamente**. Una receta o producto puede ser pulsable sin ponerse verde.
- Los cambios ordinarios del menú son Sheet-only. El frontend solo se toca por defectos genéricos; queda una corrección genérica preparada para que los enlaces planificados no hereden el color mint.

### Despensa / ListaCompra

- `SEGUNDO CEREBRO - DESPENSA / Productos` incorpora la columna **`nombres_familiares`** (S).
- Puede contener varios alias separados por ` | `; se usan para resolver vocabulario de Miguel/Andrea y títulos de Apple Reminders contra un único `producto_id`.
- Prioridad de identidad: `producto_id` explícito → nombre canónico exacto normalizado → alias familiar exacto normalizado → revisión manual. No usar fuzzy matching para sobreescribir una coincidencia exacta.
- Alias iniciales ya sembrados incluyen, entre otros: `enjuague bucal de miguel`→Listerine, `enjuague blanquete`→Deliplus blanqueador, `desodorante de miguel`→Rexona Invisible Ice Fresh, `huevos`→pack 12 L Mercadona 31504, `fajitas`→tortillas integrales, `pavo`→lomo de pavo, `ñoquis`, `quinoa`, `ensalada cesar`, `tomates`, `pechugas de pollo`, etc.
- Productos personales exactos confirmados por Miguel:
  - Desodorante: Mercadona **44400**, Rexona Men Invisible Ice Fresh.
  - Enjuague habitual: Mercadona **23067**, Listerine menta.
  - Enjuague blanqueador: Mercadona **52524**, Deliplus Bicarbonato zero alcohol.
  - Huevos: Mercadona **31504**, **siempre pack de 12 huevos grandes L**; el inventario puede tener menos unidades restantes, pero la reposición habitual es siempre el pack de 12.

### Estado del menú actual

- `MenuSemanal` contiene el plan de comidas/cenas aportado por Miguel para 05/10→12/10, con sábado explícitamente abierto (`Sin plan · posible salida`) para preservar la matriz de siete días sin inventar comida.
- El siguiente GESTOR NUTRI debe **leer el Sheet vivo antes de continuar** y completar las tomas auxiliares del resto de la semana; no reconstruirlas desde memoria de chat.
- Lunes 05/10 ya tiene consumo real registrado por la mañana/mediodía; no convertir automáticamente futuros `planificado` a `consumido`.
- La lista de la compra ya fue reconciliada con Recordatorios Apple, inventario, precios/tickets y productos canónicos, pero debe seguir enriqueciendo alias/productos exactos cuando Miguel/Andrea aclaren una referencia.

### Arranque recomendado del nuevo chat

1. Leer `AGENTS.md` completo.
2. Leer `docs/HANDOFF.md` completo, especialmente este bloque.
3. Leer `agents/HEALTH.md` y `agents/PANTRY.md`.
4. Leer en vivo `Objetivos`, `MenuSemanal`, `Registro`, `Recetas`/`IngredientesReceta` y en Despensa `Productos`, `Inventario`, `ListaCompra`.
5. Continuar como **GESTOR NUTRI**, sin depender de recuerdos parciales de esta conversación.


## GESTOR NUTRI · progreso confirmado + ListaCompra familiar · 05/10/2026

- Las barras de progreso de `MenuSemanal` representan exclusivamente ingesta confirmada: se calculan con filas visibles cuyo `estado` es `consumido`. Las comidas `planificado` permanecen visibles como referencia, pero no rellenan kcal/proteína hasta confirmación.
- El detalle semanal conserva simultáneamente **consumo confirmado** y **plan previsto**, de modo que una planificación futura no se confunde con adherencia real.
- Despensa lee ya `Productos.nombres_familiares` (columna S) y expone el primer alias doméstico en `ListaCompra`; el nombre canónico se mantiene como contexto secundario.
- Una fila `COMPRAR` enlazada a un producto con `url_producto` exacta de `tienda.mercadona.es/product/...` es pulsable y abre directamente esa ficha en Mercadona.
- Las filas con `Productos.url_producto` exacta abren directamente la ficha canónica. Si una fila todavía es genérica o no tiene URL exacta, sigue siendo pulsable pero abre `tienda.mercadona.es/search-results?query=...` con el nombre familiar/lista; así no se asigna un SKU falso y el usuario puede seleccionar el producto correcto.
- La Home de Despensa reutiliza también el alias familiar cuando existe; identidad, precio, URL y alias siguen perteneciendo al Sheet canónico, no al frontend.


### GESTOR NUTRI · cabecera del menú: plan previsto + progreso real · 05/10/2026
- En la matriz semanal de Home, los totales visibles de kcal y proteína representan el **plan completo previsto del día**.
- Las barras y el porcentaje continúan calculándose exclusivamente con filas confirmadas como `consumido`.
- Bajo cada barra se muestra el acumulado consumido (kcal/proteína + porcentaje), evitando confundir plan y ejecución.
- Si faltan macros en alguna fila planificada o consumida, la UI identifica el dato como subtotal conocido y no inventa valores.

## GESTOR EVENTOS · relevo de conversación · 06/10/2026

- La fuente operativa canónica sigue siendo el Sheet privado `SEGUNDO CEREBRO - EVENTOS`; los datos personales concretos, fechas, participantes y propuestas viven allí, no en Git.
- La web/API de Eventos actúa como frontal del Sheet. D1 es solo caché/espejo técnico y fallback de transición.
- iCloud/CalDAV y Google Calendar conservan autoridad sobre sus propias fechas/horarios; la integración los reconcilia con el Sheet sin convertir un único proveedor en agenda global.
- La regla de consulta federada sigue vigente: antes de afirmar «qué tengo» o «cuál es el próximo evento», leer el Sheet y contrastar todos los calendarios/fuentes accesibles; si falta alguna fuente esperable, responder como parcial/provisional.
- PR #253 introdujo el Sheet canónico y conectó la API/web; PR #254 migró el histórico D1 y filtró recordatorios financieros/operativos; PR #255 restauró la regla de que cumpleaños simples permanecen en Agenda y añadió deduplicación de viajes migrados.
- Los recordatorios puramente financieros/técnicos no son Eventos. Los cumpleaños simples tampoco; solo entran en Eventos cuando existe un plan concreto.
- Las propuestas abiertas también deben registrarse en el Sheet como `PROPUESTO` con hechos/notas privadas, de modo que el siguiente gestor pueda continuar sin depender del chat anterior.
- Al iniciar un nuevo GESTOR EVENTOS: leer `AGENTS.md`, `agents/EVENTS.md`, este HANDOFF y, después, el Sheet vivo completo (`Eventos`, `EventoHechos`, `EventoRefs`, `EventosImportantes`). No reconstruir el estado desde memoria parcial.



### ORGANIZADOR 10 · panel Regalos / Bodas y Reyes · 2026-10-06

- Se añade una tercera superficie financiera en Home: `Regalos · Bodas y Reyes`. En desktop comparte la columna derecha con `Obligaciones activas`, colocándose justo debajo para aprovechar el hueco vertical que antes quedaba vacío frente al panel más alto de Patrimonio. En tablet/móvil vuelve a apilarse de forma natural.
- Fuente: nueva pestaña privada derivada `Regalos` dentro de `SEGUNDO CEREBRO - ESTADO FINANCIERO`; el frontend no contiene importes, personas ni bodas hardcodeadas.
- Contrato: filas `fund_month` para aportación mensual/acumulado/objetivo y filas `wedding` para previsto/pagado conciliado.
- Columna izquierda: dinero almacenado mes a mes, objetivo anual, fondos por categoría y disponible tras pagos cuando aplica.
- Columna derecha: únicamente bodas con pago conciliado; las bodas previstas/no conciliadas permanecen identificadas como pendientes y no se cuentan como pagadas.
- Una aportación futura de Reyes no se cuenta como dinero almacenado hasta existir realmente. Esta regla evita volver a inflar el saldo por una previsión del ciclo.
- Responsive: dos columnas internas en escritorio y una columna en tablet/móvil; el histórico mensual puede desplazarse internamente si fuese necesario, sin overflow global. La tipografía interna se mantiene compacta pero legible: no debe reducirse por debajo de lo necesario para hacer caber el panel.
- El auditor de producción comprueba panel visible, ambas columnas y ausencia de overflow.


### ORGANIZADOR 10 · Regalos reconciliados y bodas futuras · 2026-10-06

- El panel `Regalos · Bodas y Reyes` distingue aportado acumulado, efectivo disponible y efectivo pendiente de recibir.
- Las filas `awaiting_cash` no se suman al efectivo actual hasta cobrarse.
- El Home muestra pagos de boda del año, bodas pendientes y bodas del año siguiente con fecha e importe previstos desde la tabla privada `Regalos`.
- Las bodas futuras no consumen el sobre actual sin una asignación explícita.
- La superficie permanece bajo `Obligaciones activas` y aumenta legibilidad sin volver a ocupar una fila completa.
