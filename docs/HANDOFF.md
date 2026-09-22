# Handoff — Segundo Cerebro

## Última actualización

- **Fecha:** 2026-09-22
- **Última herramienta:** ChatGPT normal
- **Rama:** `main`
- **Remoto:** `https://github.com/mamg97/segundo-cerebro.git`

## Estado actual

Validación end-to-end completada el 2026-09-22: la URL privada `https://segundo-cerebro.mamg97.workers.dev/app/` carga correctamente tras Cloudflare Access, el Worker lee la instantánea D1 y la interfaz entra en `Modo privado remoto`. La demo pública de GitHub Pages sigue separada y usando mocks.


La demo pública v0.1.1 sigue siendo un frontend estático con datos exclusivamente ficticios. Localmente existe además una primera superposición privada experimental, ignorada por Git, que carga un estado real minimizado solo en loopback y con activación explícita. Incluye referencias y contexto derivado de conversaciones leídas en modo solo lectura; no conecta ni modifica ninguna fuente. El código y la demo mock continúan en `mamg97/segundo-cerebro` y `https://mamg97.github.io/segundo-cerebro/`.

## Objetivo activo

Preparar una primera versión remota privada y de solo lectura, accesible desde Mac, iPhone e iPad, usando Cloudflare Worker + Access + D1 sin mover datos reales a GitHub.

## Trabajo realizado

- Resumen de Eventos importantes limitado a 3 tarjetas completas y del mismo ancho; se elimina el carrusel que dejaba tarjetas cortadas a mitad.
- Añadido `Ver todos` para abrir el listado completo en un diálogo con tarjetas uniformes y fecha completa.
- La información no desaparece: la home muestra solo los tres próximos y el detalle conserva todos los eventos detectados.

- Eventos importantes cruza por título normalizado entre iCloud y compromisos financieros: si un mismo evento aparece en ambas fuentes, se conserva la fecha de iCloud y se adjuntan presupuesto/reserva, evitando duplicados como `Viaje nov`.
- Las reglas privadas de búsqueda se han hecho más tolerantes en la hoja `EventosImportantes` para localizar los eventos personales aunque el título de iCloud no incluya palabras genéricas como `boda` o `master`.
- Sigue sin copiarse ningún nombre personal de estas reglas a Git; solo la lógica de cruce está versionada.

- Corregido el desbordamiento de los KPI compactos del bloque Dinero en escritorio: Ingresos, Neto personal y Ahorro objetivo pasan a filas horizontales etiqueta/valor dentro de la tarjeta, evitando cortes y solapes en anchos estrechos.

- Eventos médicos salen de `Eventos importantes` y permanecen dentro de `Salud` (Médicos). También se evita clasificar `Comprar medicinas` como cita médica.
- `Eventos importantes` pasa a una banda horizontal de una sola fila con scroll, para no ocupar varias pantallas verticales.
- Reducido el tamaño del patrimonio, deuda y presupuesto en el bloque financiero de tres columnas; el valor principal de Dinero deja de solaparse con `Ejecutado`.
- Corregido el hueco inferior de `Áreas de tu vida`: en escritorio, cuando hay 10 tarjetas, la última ocupa el ancho de la fila en lugar de dejar dos celdas vacías.

- Reordenada la home financiera: `Dinero`, `Deudas` y `Patrimonio` forman ahora el bloque de resumen; `Eventos importantes` ocupa una fila completa independiente.
- Creada la pestaña privada `EventosImportantes` en el bridge. Contiene las reglas personales comunicadas por Miguel Ángel y el alias privado del viaje sorpresa; ningún nombre privado se ha introducido en Git.
- El Worker lee esas reglas y el frontend cruza automáticamente los eventos iCloud con ellas. Así pueden añadirse más eventos importantes en el futuro sin convertir el repositorio público en una base de datos personal.
- Ampliado el horizonte iCloud de 90 a 550 días para encontrar bodas, viajes y otras fechas importantes de 2027 sin alterar la vista semanal actual.
- Las citas médicas se consideran también eventos importantes mediante clasificación genérica por título/ubicación.
- Creada el área derivada `Salud`, con tres apartados: Médicos, Gimnasio y Nutrición. Lee solo iCloud y sigue siendo read-only.
- El calendario visible aplica el alias seguro `Viaje nov` si el título real contiene el destino sorpresa.

- Añadido resumen de Patrimonio a la home: muestra el total del último snapshot del día 1 disponible y un acceso `Ver evolución`.
- La hoja privada derivada incorpora una pestaña `Patrimonio` con histórico mensual desde abril de 2024 hasta septiembre de 2026: salarios de Miguel/Andrea y patrimonio total. El dato actual es 39.114 € a 1 sep 2026.
- El área `Patrimonio` abre un detalle específico con dos gráficas SVG responsive: evolución de salarios (dos series) y evolución del patrimonio.
- El enlace lateral `Patrimonio` abre directamente este detalle en vez de limitarse a desplazar la página hasta la tarjeta.
- El Worker selecciona como actual el último snapshot con fecha <= hoy, evitando tomar como actuales valores futuros/proyectados.

- Corregido un fallo de bootstrap del modo privado remoto: `build.mjs` solo inyectaba `private-config.js` si `app.js` llevaba exactamente la versión `?v=0.2.0`. Al pasar a `?v=0.2.1`, Cloudflare servía la app con datos mock aunque `/api/health` siguiera sano.
- La inyección ahora usa un patrón independiente de versión y la CI verifica no solo que exista `dist/private-config.js`, sino que `dist/app/index.html` lo cargue realmente.
- Este fallo explicaba el calendario ficticio pese a `calendarSync: ok`: la interfaz estaba en `Modo demo` y nunca llamaba a `/api/state`.

- Añadido un bloque específico de Deudas a la portada financiera: resumen compacto visible y detalle completo bajo `Ver detalle`.
- La hoja privada `SEGUNDO CEREBRO - ESTADO FINANCIERO` incorpora una pestaña `Deudas`; el Worker la lee junto con Resumen/Categorias/Compromisos.
- Se han inicializado tres obligaciones ya presentes en el presupuesto (El Corte Inglés, IKEA y préstamo coche) con sus cuotas mensuales conocidas. Los saldos pendientes y tipos de interés permanecen nulos hasta que la fuente financiera los confirme.
- El resumen de deuda no infiere saldo total cuando faltan saldos: muestra `Por completar`, la cuota mensual agregada y el número de obligaciones activas.

- Rediseñada la portada móvil como layout single-column real: hero, buscador, dinero, eventos, movimientos y agenda ocupan el ancho disponible completo.
- Se corrige la sensación de “desktop encogido”: topbar, hero y buscador reducen altura y peso visual; los bloques operativos ganan continuidad vertical.
- `money-horizon` y `workbench` se fuerzan a bloque único en <=520 px para evitar repartos anómalos de ancho.
- Se compactan tipografías, paddings y métricas en móvil sin alterar escritorio.

- Ajustada la densidad móvil de la portada: menos espacio vertical en hero, buscador y secciones principales.
- El resumen financiero móvil mantiene previsto y ejecutado en la misma fila y conserva las tres métricas clave en una fila compacta en vez de apilarlas.
- `Eventos y presupuesto` pasa en móvil a carrusel horizontal de tarjetas compactas para evitar una portada excesivamente larga.
- Reducido padding y tamaño tipográfico de bloques operativos en pantallas pequeñas sin tocar la vista de escritorio.

- La portada deja de esconder las decisiones detrás del botón `Verlas`: las decisiones abiertas se muestran directamente bajo la agenda semanal, con pregunta y opciones visibles.
- El bloque `Dinero · Este mes` se ha compactado para mostrar solo el resumen ejecutivo (previsto, ejecutado, ingresos, neto personal y ahorro objetivo). El detalle de las 19 partidas pasa a un diálogo accesible mediante `Ver presupuesto`.
- El detalle financiero sigue leyendo la misma capa privada derivada y mantiene estados de conciliación y barras de progreso por partida.
- El repositorio `main` queda como fuente operativa de cambios; el proyecto Cloudflare ya está conectado al repositorio. Los siguientes cambios se harán y fusionarán desde Git, dejando el despliegue a la integración Git de Cloudflare; si una actualización no se publica automáticamente, revisar una única vez la configuración de Production branch/autodeploy en Cloudflare en lugar de volver al despliegue manual habitual.

- Corregida la ventana de lectura CalDAV: el Worker pedía solo desde `now - 24h`, por lo que al abrir la semana un martes faltaban los eventos del lunes por la mañana/tarde anteriores a esa hora. Ahora solicita 8 días hacia atrás para garantizar que la semana actual esté completa antes de que la UI filtre lunes–domingo.

- Sustituida la lista vertical `En el horizonte` por una visión semanal horizontal (lunes–domingo) inspirada en la vista Semana de iCloud Calendar.
- La semana se limita deliberadamente a la semana actual: el objetivo es contexto operativo, no replicar el calendario completo de iCloud.
- Los eventos se deduplican por calendario+título+inicio+fin y se ordenan dentro de cada día con eventos de día completo primero y después por hora.
- Se mantienen los colores de origen: Personal Miguel amarillo, Trabajo azul, Andrea y Miguel naranja y Calendario familiar verde.
- La vista semanal ocupa el ancho completo del bloque de trabajo para no comprimir siete columnas; en móvil permite desplazamiento horizontal.

- Ajustada la sección `En el horizonte` para mostrar todos los eventos de los próximos 8 días en orden cronológico, en lugar de limitarse a 8 eventos balanceados que podían ocultar citas del calendario `Andrea y Miguel`.
- Añadidos colores visuales por calendario, alineados con la app Calendario de macOS: personal amarillo, trabajo azul, pareja naranja y familiar verde.
- Cada evento muestra ahora una banda lateral, fecha y punto de origen con el color de su calendario iCloud.

- Corregida la sección `En el horizonte`: antes hacía `slice(0, 8)` sobre todos los eventos y un recurrente diario de Trabajo podía ocupar las ocho posiciones.
- La portada usa ahora un reparto equilibrado de eventos por calendario iCloud, garantizando representación de los distintos calendarios con eventos próximos antes de rellenar huecos adicionales.
- La etiqueta mostrada bajo cada evento usa el nombre real del calendario iCloud cuando está disponible.
- `/api/health` añade contadores seguros `calendarMatchedCount`, `calendarSelectedCount` y `calendarEventCount` para distinguir problemas de lectura de problemas de presentación sin exponer nombres ni eventos.

- Añadida integración privada de iCloud Calendar por CalDAV en rama `icloud-calendar-sync-v0.4`.
- La integración es operativamente de solo lectura: únicamente usa `PROPFIND` y `REPORT`; no implementa escritura.
- Los secretos `ICLOUD_APPLE_ID`, `ICLOUD_APP_PASSWORD` e `ICLOUD_CALENDAR_CONFIG` se configuran localmente con Wrangler y nunca se escriben en Git.
- El Worker consulta los calendarios seleccionados, normaliza solo título/fecha/hora/ubicación/origen y sustituye `state.events` por la agenda iCloud cuando la sincronización funciona.
- Horizonte inicial: próximos 90 días; caché: 60 s; `/api/health` añade `calendarSync`.
- La portada limita la agenda a los 8 próximos eventos y reconoce eventos de día completo.

- Corregido el dashboard financiero para mostrar las 19 partidas con presupuesto positivo del ciclo 20/09–20/10, no solo las tres partidas con gasto ya registrado.
- Corregida la barra de progreso: el CSP bloqueaba el `style="width:..."` inline, por eso el relleno no reflejaba el porcentaje. Se sustituye por `<progress>` nativo, compatible con el CSP.
- La barra ahora representa exclusivamente gasto ejecutado (`spent / budgeted`). Los importes comprometidos se muestran aparte y no avanzan la barra hasta ejecutarse.

- Creada en Drive la hoja privada derivada `SEGUNDO CEREBRO - ESTADO FINANCIERO` con pestañas `Resumen`, `Categorias` y `Compromisos`; no sustituye a `ASUNTOS v3.xlsx`.
- Actualizado `CONTROL ASISTENTE - MEMORIA FINANCIERA` con el protocolo de integración: Gestor Financiero actúa como intermediario, Excel solo lectura, estados `PROVISIONAL_CHAT` / `RECONCILIADO_SHEET` / `DERIVADO`.
- Añadida en rama `finance-live-sheet-sync-v0.3.2` lectura privada en vivo desde Google Sheets al Worker: `/api/state` superpone `financeSummary` sobre D1, con caché de 30 s y fallback seguro.
- Añadido script local para configurar credenciales OAuth de lectura como secretos de Wrangler sin escribirlas en Git.
- La UI diferencia partidas provisionales pendientes de conciliación de partidas confirmadas.

- Añadida en rama `budget-item-progress-v0.3.1` una barra de progreso por categoría presupuestada del mes. Calcula `% consumido = (gastado + comprometido) / presupuestado`, muestra gastado, comprometido y saldo libre, y marca en coral los excesos >100%.

- Añadida en rama `dashboard-budget-events-v0.3` una nueva zona de portada para presupuesto mensual y próximos compromisos con presupuesto.
- El modelo admite `financeSummary.monthlyBudget` y `financeSummary.upcomingCommitments`, distinguiendo modelo presupuestario, gasto real y datos por conciliar.
- Añadido un generador local `make-finance-patch-sql.mjs` que lee `.private/finance-summary.json` y genera un patch D1 dentro de `.private/`, sin versionar importes reales.

- La aplicación privada remota se ha abierto correctamente en navegador tras autenticación.
- Confirmada la lectura de la instantánea D1 desde la UI: 11 open loops visibles y estado personal remoto activo.
- Confirmado que la barrera de Access protege el Worker y que el frontend privado no depende del archivo local `.private/` para funcionar.

- D1 `segundo-cerebro-private` creada en jurisdicción UE, esquema aplicado y primera instantánea privada importada correctamente (`schema_version 0.2`, `is_current=1`).
- Cloudflare Access verificado en incógnito: el Worker exige autenticación antes de responder.
- El Worker bootstrap se ha alineado con el nombre protegido `segundo-cerebro`, vinculado a D1 mediante `DB` y activado con `PRIVATE_APP_ENABLED=true` tras completar las barreras de seguridad.

- Establecidas reglas permanentes en `AGENTS.md`.
- Documentadas arquitectura, modelo de datos, privacidad y decisiones.
- Creado un estado global común mock con las entidades iniciales.
- Construido el dashboard para Mac, iPhone e iPad con navegación lateral adaptable.
- Incluidas las diez áreas: estado general, carrera, finanzas, agenda, pareja/boda, familia, patrimonio familiar, proyectos, open loops y objetivos.
- Implementadas caja “¿Qué necesitas?”, búsqueda local sobre mocks, prioridades, agenda, decisiones y detalle por área.
- Evolucionada la vista Sistema a un árbol operativo responsive con estados, permisos y acceso a los detalles de cada módulo.
- Añadidas capacidades transversales mock: revisión semanal, priorizador, detector de conflictos y control de privacidad.
- Mejorada la legibilidad móvil de textos funcionales y el contraste de los acentos.
- Añadidos límites explícitos para módulos e integraciones futuras.
- Publicado el repositorio en la cuenta personal `mamg97` y añadido un workflow de GitHub Pages para la demo estática.
- Revisadas en modo solo lectura conversaciones existentes sobre finanzas personales, inversión/ahorro, MIDAS, LITOS, HabitQuest y carrera. Se identificaron dominios y fuentes futuras, pero no se copiaron datos reales al repositorio.
- Añadido un cargador privado que solo se activa en loopback con `?private=1`; fuera de ese caso mantiene el mock.
- Creada una primera síntesis local ignorada por Git con proyectos, objetivos, decisiones, open loops, personas mínimas, activos conceptuales y fuentes referenciadas.
- Ampliada la revisión a planificación de viajes, cuaderno de ideas, asuntos familiares sensibles y pendientes domésticos; los detalles innecesarios, documentos e identificadores se excluyeron.
- Creada la rama `private-cloudflare-v0.2`.
- Añadido `private-cloudflare/` con Worker, Static Assets, D1, build aislado, importador local y documentación de despliegue.
- `app/app.js` ya admite un modo `private-remote` activado únicamente en el bundle privado.
- Añadido seguro `PRIVATE_APP_ENABLED=false` para impedir exposición antes de configurar Cloudflare Access.
- Añadido workflow de CI para comprobar sintaxis y que el bundle privado no contenga `.private/`.

## Estado funcional

- La interfaz se sirve desde `app/` con cualquier servidor HTTP estático.
- `core/mock-state.js` es la única fuente de estado de la v0.1.
- La consulta central realiza una búsqueda literal local; no usa IA ni red.
- Los detalles de área y decisiones se abren en diálogos locales.
- El selector Resumen/Sistema funciona y la navegación móvil se repliega.
- Los nodos de módulo del árbol abren el mismo detalle que las tarjetas de área.
- Las fuentes externas figuran bloqueadas y sin conectar; solo el mock local aparece activo.
- No hay persistencia: recargar restablece el estado ficticio.
- La publicación de Pages contiene únicamente `app/`, `core/`, el redirect raíz y `.nojekyll`.
- El modo privado se abre en `http://127.0.0.1:4173/app/?private=1` y muestra una etiqueta inequívoca de estado local no publicado.
- Las consultas siguen siendo búsquedas literales en el navegador; en modo privado buscan en la síntesis local sin usar red ni IA.

## Decisiones tomadas

- Estado global único; los módulos no tendrán memorias separadas.
- Las fuentes externas seguirán siendo propietarias de los datos originales.
- Git contiene solo código, documentación técnica y mocks inequívocos.
- v0.1 usa HTML, CSS y JavaScript nativos, sin dependencias.
- La interfaz nace responsive y preparada conceptualmente para PWA, pero no se activa aún caché offline.
- El árbol operativo es una capa de transparencia; sus nodos no son memorias ni agentes autónomos.
- GitHub Pages aloja solo la demo mock; hosting definitivo, base de datos, autenticación, proveedor de IA y sincronización siguen abiertos.
- La superposición `.private/state.js` es provisional, local, no cifrada y nunca se versiona.
- Para v0.2 se adopta Cloudflare Worker + Access + D1 como primera arquitectura remota privada.
- La primera versión remota será estrictamente de solo lectura; no hay endpoints de escritura desde el navegador.

Consulta `docs/DECISIONS.md` para el registro duradero.

## Problemas conocidos

- La búsqueda es literal y demostrativa; no interpreta lenguaje natural.
- Los indicadores de salud son mocks y todavía no tienen fórmula de cálculo.
- El árbol todavía no muestra relaciones entre entidades concretas como proyectos, personas o decisiones.
- No existen persistencia, autenticación, cifrado, PWA instalable ni tests automatizados de navegador.
- La demo y el repositorio son públicos, por lo que cualquier cambio futuro requiere mantener la revisión estricta de secretos, datos reales y metadatos sensibles antes de cada push.
- Las conversaciones revisadas son contexto de fuentes reales, no una integración: pueden cambiar y no existe sincronización automática con ellas.
- La síntesis privada no está cifrada en reposo y depende de este dispositivo; no debe servirse en la red local ni tratarse como respaldo.
- Varias conversaciones extensas solo están revisadas parcialmente y aparecen marcadas como tales en el registro privado de fuentes.
- Los indicadores de salud privados son estimaciones provisionales, no métricas calculadas.

## Pendientes inmediatos

1. Abrir PR de `private-cloudflare-v0.2` y dejar pasar la CI.
2. Crear D1 y el Worker en la cuenta Cloudflare del usuario.
3. Proteger todo el Worker con Cloudflare Access y verificar que no se abre sin autenticación.
4. Importar la síntesis existente desde `.private/state.js` a D1 usando el generador local.
5. Activar `PRIVATE_APP_ENABLED=true` y validar la URL privada desde iPhone, iPad y Mac.
6. Después, volver a la validación de exactitud, frescura y prioridades del estado.

## Próxima acción recomendada

Configurar una única vez los secretos iCloud desde el Mac con `node scripts/configure-icloud-calendar-sync.mjs`, desplegar el Worker y validar `calendarSync` en `/api/health`. Después revisar que los cuatro calendarios iCloud seleccionados aparecen correctamente y que no se copian descripciones, asistentes ni enlaces internos.

## Archivos relevantes

- `AGENTS.md`: reglas permanentes y límites.
- `app/index.html`: estructura semántica del dashboard.
- `app/styles.css`: diseño responsive y accesibilidad visual.
- `app/app.js`: renderizado e interacciones locales.
- `core/mock-state.js`: estado global ficticio.
- `docs/ARCHITECTURE.md`: capas y flujo del sistema.
- `docs/DATA_MODEL.md`: entidades y relaciones.
- `docs/PRIVACY.md`: datos prohibidos y reglas para integraciones.
- `docs/DECISIONS.md`: decisiones arquitectónicas duraderas.
- `.github/workflows/pages.yml`: publicación de la demo estática en GitHub Pages.
- `.private/state.js`: estado real minimizado, solo local e ignorado por Git.
- `.private/README.md`: instrucciones y límites del modo privado local.
- `CHATGPT_NORMAL/README.md`: coordinación del carril ChatGPT normal.
- `WORK_CODEX/README.md`: coordinación del carril Work/Codex.
- `docs/REMOTE_PRIVATE_PLAN.md`: plan para acceso web privado con datos reales fuera de GitHub.
- `private-cloudflare/README.md`: procedimiento de despliegue privado.
- `private-cloudflare/src/index.js`: Worker y API privada de solo lectura.
- `private-cloudflare/migrations/0001_init.sql`: esquema inicial D1.
- `private-cloudflare/scripts/make-import-sql.mjs`: generador local de importación desde `.private/state.js`.

## Pruebas realizadas

- `node --check app/app.js`: correcto.
- `node --check core/mock-state.js`: correcto.
- `git diff --check`: correcto.
- Búsqueda local de patrones habituales de secretos: sin hallazgos.
- Carga mediante servidor HTTP local: correcta, sin recursos externos.
- Revisión visual en escritorio: correcta.
- Revisión responsive a 390 × 844 px: correcta, incluida la jerarquía completa del árbol.
- Consulta local “anillo”: devuelve el open loop ficticio esperado.
- Cambio Resumen/Sistema: correcto tras corregir la visibilidad con `hidden`.
- Navegación “General”: corregida para apuntar a `#overview`.
- Árbol operativo: jerarquía, estados y fuentes visibles correctamente en escritorio y móvil.
- Interacción módulo → detalle: correcta desde la vista Sistema.
- Detector mecánico de diseño ejecutado; se corrigieron tamaños funcionales, contraste, brillo decorativo y borde de aviso señalados.
- Historial Git revisado antes de publicar: autor normalizado a `mamg97@users.noreply.github.com` y sin emails personales en los commits publicados.
- Revisión de conversaciones reales mediante lectura únicamente: no se modificaron los hilos ni sus fuentes y no se incorporaron cifras, identidades, documentos o secretos al repositorio.
- GitHub Actions `Deploy mock demo to GitHub Pages` run #2: correcto en 20 s.
- Carga pública de `https://mamg97.github.io/segundo-cerebro/`: correcta; redirige a `/app/` y muestra la v0.1.1.
- `node --check app/app.js`, `core/mock-state.js` y `.private/state.js`: correcto.
- `git check-ignore -v .private/state.js`: confirma exclusión mediante `.gitignore`.
- `git ls-files .private`: sin resultados; no hay estado privado versionado.
- Servidor local ligado a `127.0.0.1`: correcto.
- Carga de `?private=1`: etiqueta privada, 11 open loops, fuentes y eventos reales minimizados visibles.
- Consulta local “MIDAS”: devuelve coincidencias del estado privado sin red.


## Actualización 22/09/2026 — deudas + tema visual

- La vista privada de Finanzas ya contempla un bloque resumido de deudas con detalle bajo demanda.
- La fuente sigue siendo el Sheet financiero privado; los importes reales no se versionan en Git.
- El Worker acepta totales agregados de deuda desde la hoja intermedia para poder mostrar un resumen aunque alguna deuda individual tenga campos incompletos.
- Se añadió selector claro/oscuro en la cabecera. La preferencia queda guardada en el navegador y el tema oscuro cubre navegación, paneles, calendario, diálogos y tarjetas financieras.
- Los cambios de código están en `main`; el Worker privado necesita un nuevo despliegue de Cloudflare para reflejarlos en producción.
