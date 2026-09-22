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

Configurar una única vez los secretos OAuth del Worker usando el JSON `authorized_user` local con permisos de Drive/Sheets. Después validar que un cambio en la hoja derivada aparece en la web al recargar sin regenerar D1. A partir de ahí, `GESTOR FINANZAS PERSONALES` debe mantener la hoja derivada tras cada movimiento confirmado por Miguel.

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
