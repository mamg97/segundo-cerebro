# Handoff — Segundo Cerebro

## Última actualización

- **Fecha:** 2026-09-22
- **Última herramienta:** Codex
- **Rama:** `main`
- **Remoto:** `https://github.com/mamg97/segundo-cerebro.git`

## Estado actual

La demo pública v0.1.1 sigue siendo un frontend estático con datos exclusivamente ficticios. Localmente existe además una primera superposición privada experimental, ignorada por Git, que carga un estado real minimizado solo en loopback y con activación explícita. Incluye referencias y contexto derivado de conversaciones leídas en modo solo lectura; no conecta ni modifica ninguna fuente. El código y la demo mock continúan en `mamg97/segundo-cerebro` y `https://mamg97.github.io/segundo-cerebro/`.

## Objetivo activo

Validar si un único estado privado local, construido con referencias mínimas, representa correctamente proyectos, decisiones y open loops reales antes de decidir cifrado, sincronización, integraciones o infraestructura.

## Trabajo realizado

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

1. Validar con el usuario la exactitud y prioridad de la primera síntesis privada.
2. Completar de forma incremental las fuentes marcadas `reviewed-partial`, sin copiar historiales completos.
3. Definir el flujo de revisión semanal y la regla de frescura de cada fuente.
4. Diseñar cifrado y respaldo antes de considerar este archivo una persistencia real.
5. Convertir el flujo en criterios de aceptación y tests automatizados mínimos.

## Próxima acción recomendada

Recorrer el modo privado local con el usuario y corregir primero hechos, relaciones, prioridades o fuentes desactualizadas. No añadir nuevas conexiones ni publicar el estado.

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
