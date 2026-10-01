# Auditoría automática de producción

## Propósito

`Audit production web` es el control read-only que valida que la aplicación privada de Segundo Cerebro sigue funcionando después de cambios en cualquier dominio.

Archivos canónicos:

- workflow: `.github/workflows/web-audit.yml`;
- navegador/auditor: `private-cloudflare/scripts/web-audit.mjs`;
- invariantes reutilizables: `private-cloudflare/src/web-audit-utils.js`;
- gateway read-only: `private-cloudflare/src/web-audit-gateway.js`.

No modifica fuentes privadas ni corrige datos para conseguir un test verde.

## Periodicidad y disparadores

El mismo workflow tiene cuatro vías de entrada:

1. **horaria primaria:** minuto 17 de cada hora;
2. **respaldo de scheduler:** minuto 42 de cada hora; ejecuta Chromium solo si GitHub no creó la ejecución primaria durante los 40 minutos anteriores;
3. **post-deploy:** después de `Deploy private Cloudflare app` cuando ese deploy termina en `success`;
4. **manual:** `workflow_dispatch`.

El respaldo no es un segundo workflow. Es una segunda oportunidad del mismo `Audit production web` para reducir el riesgo de eventos `schedule` retrasados o descartados por GitHub Actions.

Un run de respaldo puede terminar correctamente sin ejecutar Chromium cuando detecta que la ejecución primaria ya existe. Para saber si hubo una auditoría completa hay que comprobar que el step **Navigate and audit production** terminó en `success`, no basta con mirar solo la conclusión global del workflow.

## Umbral de vigilancia

La vigilancia se considera degradada cuando:

- no existe una auditoría **completa** correcta en los últimos **90 minutos**;
- y no hay una auditoría completa actualmente `queued` o `in_progress`.

El watcher externo de ChatGPT debe usar este criterio y no contar como auditoría completa un heartbeat de respaldo cuyo step de Chromium haya quedado `skipped`.

### Watchdog externo de recuperación

Existe además una tarea horaria externa de ChatGPT como defensa frente a una caída del emisor `schedule` de GitHub:

- se ejecuta cada hora al **minuto 45**; si han pasado al menos **75 minutos** sin auditoría completa correcta y no hay otra completa en curso, relanza manualmente el job de auditoría completa más reciente del **mismo** workflow `Audit production web`;
- no crea ni mantiene un segundo workflow horario;
- si la recuperación termina verde antes de los 90 minutos, no notifica;
- al alcanzar 90 minutos sin auditoría completa correcta, o si el relanzamiento falla, genera alerta con la causa clasificada;
- nunca modifica datos privados ni producción: solo relanza el control read-only y diagnostica.

Esta tarea externa complementa el cron primario/respaldo porque ambos cron siguen dependiendo del mismo scheduler de GitHub.

## Qué se audita

Como mínimo:

- HTTP de entrada y carga del estado privado remoto;
- salud de fuentes derivadas;
- navegación de todas las áreas canónicas;
- subpestañas de dominios con navegación interna;
- Agenda/Calendario: fuente, calendarios seleccionados/enlazados y conservación de eventos en el horizonte;
- `MenuSemanal` y API de Nutrición;
- pestaña `Salud → Recetas`: número de tarjetas frente a la API, ausencia de errores visibles y calidad visual de foto/ingredientes/pasos;
- ausencia de versiones lógicas duplicadas;
- estados `omitido | retirado | cancelado` no reaparecen;
- componentes de una misma toma se agrupan;
- totales/subtotales nutricionales;
- dato ausente permanece ausente, nunca se transforma en 0;
- barras de kcal/proteína: existencia, porcentaje/anchura y estado visual lógico;
- APIs privadas clave de Despensa, Proyectos y Delta/Finanzas;
- **MIDAS Competition Health**:
  - `/api/midas` responde y conserva los diarios esperados;
  - las nueve estrategias diarias mantienen sesión registrada;
  - el genético prospectivo privado está enlazado y fechado;
  - workflows públicos `paper`, `TFM`, `Capital Cycle`, `Weekly ML` y `TFG` se contrastan contra su cadencia real;
  - una ejecución debida ausente o cuyo último `schedule` termine en fallo deja la auditoría roja;
  - tras un workflow verde, el auditor exige que aparezcan los diarios correspondientes y no acepta “esperando primera sesión” como sustituto de una ejecución fallida;
  - la vista MIDAS expone el mismo estado operativo en un bloque `Salud operativa`; el auditor comprueba que las incidencias detectadas también sean visibles para el usuario;
  - la UI obtiene ese estado desde artefactos versionados `strategy_runtime/*.json`, no desde una llamada en vivo a GitHub Actions; el auditor sí consulta Actions directamente como control independiente;
- respuestas 5xx y fallos de red;
- errores JavaScript/console;
- regresiones de navegación/estilos compartidos provocadas por cualquier dominio;
- calidad visual estructural sobre producción real, sin screenshots persistentes:
  - overflow horizontal global;
  - elementos principales fuera del viewport;
  - texto recortado sin scroll/ellipsis explícito;
  - solapes entre controles, cabeceras, pestañas y bloques de texto;
- invasión de texto entre filas adyacentes de leyendas densas, incluida la visualización de liquidez de Finanzas;
  - deformación accidental de imágenes;
  - proporciones anómalas de diálogos y tarjetas principales;
  - consistencia de tarjetas resumen en escritorio;
  - responsive en 1440×1100, 900×1000 y 390×844;
- Armario visual: valida explícitamente 4 columnas en escritorio, 3 en tablet, 3 en móvil ancho de 440 px y 2 en móvil de 390 px, además de overflow/clipping/solapes de las tarjetas.
- Home semanal de Nutrición: debe mantener la matriz día×momento, representar cada comida visible en la celda exacta de su fecha/momento, usar filas de altura automática y tipografía legible. Cuando el ancho no alcance, el scroll debe quedar confinado al contenedor de la tabla; nunca se permite solape, clipping ni overflow global.
- La matriz semanal no debe exponer filas top-level `Postre`, `Snack` ni `Cierre`: esos componentes deben aparecer dentro de `Comida/Cena`, `Media mañana/Merienda` o `Cena` respectivamente. Etiquetas legacy deben reconciliarse antes del render.
- Home general: el bloque retirado `Próximos movimientos` no forma parte de la superficie visual canónica; su ausencia no debe tratarse como regresión.
  - paleta canónica light/dark y contraste mínimo de texto/acento.


## Auditoría visual

La auditoría funcional no sustituye a la visual. Chromium ejecuta además una pasada estructural sobre la interfaz renderizada.

Principios:

- se audita el DOM/computed style real de producción, no una maqueta;
- no se guardan ni publican screenshots con datos privados;
- no se usa diff pixel-a-pixel porque cambios legítimos de datos, textos o eventos producirían falsos positivos;
- las comprobaciones visuales se expresan como geometría y estilos medibles.

Cobertura:

- Home en escritorio, tablet y móvil;
- todas las áreas principales en escritorio y móvil;
- áreas pesadas representativas también en tablet;
- subpestañas de Salud, Despensa, Objetos, Proyectos, Hábitos, Eventos y Padres mientras el auditor ya las recorre;
- temas light y dark.

Una regresión visual genera checks con prefijo `Visual` y deja la auditoría roja igual que una regresión funcional.

### Qué cuenta como fallo visual

Entre otros:

- scroll horizontal global no previsto;
- contenido principal que sale del viewport sin estar dentro de un contenedor horizontal explícitamente desplazable;
- texto real recortado sin `ellipsis`/line-clamp/scroll intencional;
- dos hijos de un mismo layout flex/grid que se pisan;
- botón de cierre que tapa el título de un diálogo;
- imagen deformada respecto de su proporción natural cuando no usa `cover/contain/scale-down`;
- diálogo que excede el ancho útil de la pantalla;
- tarjetas resumen que pierden de forma material la simetría documentada en escritorio;
- modificación accidental de los tokens visuales canónicos light/dark;
- contraste insuficiente de texto principal/muted o pérdida de diferenciación entre azul y naranja.

Los scrolls internos de tablas/tabs diseñados con `overflow-x: auto|scroll`, ellipsis explícitos y recortes deliberados documentados no se consideran error.

### Corrección automática de regresiones visuales

El workflow de GitHub sigue siendo estrictamente **read-only**. La reparación, cuando proceda, corresponde al watchdog/ORGANIZADOR.

El watchdog puede autocorregir una regresión visual solo si:

1. el fallo se reproduce en una segunda auditoría completa o rerun;
2. la causa es inequívocamente presentacional y está localizada en código frontend/estilos;
3. no requiere tocar datos privados, fuentes canónicas, backend de dominio ni semántica funcional;
4. el cambio se hace sobre el `main` más reciente en una rama aislada;
5. CI pasa;
6. tras merge/deploy se ejecuta de nuevo `Audit production web` completo y termina en `[AUDIT_OK]`.

Si la causa es ambigua, implica una decisión de diseño/producto, o necesita alterar datos/backend, el watchdog debe **avisar y no autocorregir**.

### Incidente visual Finanzas · leyenda de liquidez

El 2026-10-01 una tarjeta de liquidez con muchos compromisos mostró líneas secundarias y fechas de cobro invadiendo filas contiguas. El auditor no lo detectaba porque solo comprobaba solapes entre cajas hijas de contenedores genéricos; en este caso las cajas de fila no se superponían, pero el **texto con overflow visible sí**.

Corrección:
- las leyendas con más de 6 filas pasan a altura natural y ocultan las líneas guía, evitando comprimir contenido dentro de 258 px;
- el auditor compara los rectángulos reales de texto (`Range.getClientRects()`) entre filas adyacentes de `.liquidity-account-legend`;
- esta comprobación se ejecuta en las pasadas visuales de Finanzas en desktop/tablet/mobile.

## Criterio de éxito

Una auditoría completa es correcta cuando:

- Chromium termina el recorrido;
- todos los invariantes obligatorios pasan;
- no existe una regresión de producción sin clasificar;
- el step **Navigate and audit production** termina en `success`;
- el log termina con `[AUDIT_OK]`.

El número exacto de checks puede crecer; no es un contrato fijo.

## Clasificación de fallos

Antes de modificar producción, clasificar el fallo.

### Regresión real de producción

Ejemplos:

- una API canónica responde 5xx de forma reproducible;
- el estado privado remoto no carga;
- desaparece un área o una pestaña con su backend saludable;
- MenuSemanal pierde días/filas vigentes;
- una barra muestra porcentaje o estado distinto del cálculo documentado;
- hay un error JavaScript real.

Corregir la causa funcional en el dominio propietario, no el test.

### Problema de fuente/backend

Ejemplos:

- `/api/pantry`, `/api/projects`, `/api/objects`, `/api/health/adherence` o una fuente privada devuelve 502/503;
- Calendar está configurado pero pierde los calendarios/eventos esperados.

El auditor debe identificar la API/fuente. La ausencia posterior de pestañas es consecuencia y no debe presentarse como un bug independiente si el backend ya explica el fallo.

Para fuentes privadas secundarias, un 5xx aislado se reintenta con espera corta. Si la API se recupera, el auditor vuelve a abrir la vista afectada: solo se considera **transitorio recuperado** cuando API + UI vuelven a responder dentro de la misma ejecución. Se registra como `[INFO]` y no genera alerta. Si persiste el 5xx o la UI no se recupera, la auditoría falla. Los fallos de bootstrap crítico (`/api/state`, `/api/health`, `/api/nutrition`) no se rebajan por este mecanismo.

### Fallo del auditor

Ejemplos:

- selector obsoleto;
- espera fija demasiado corta mientras la UI termina un render asíncrono;
- fórmula del auditor distinta de la función vigente de la UI.

Corregir el auditor y añadir test cuando sea posible. No modificar datos privados para hacerlo pasar.

### Abort normal por navegación

`net::ERR_ABORTED` puede producirse cuando una vista deja de necesitar una petición al cambiar de pantalla.

- Un aborto de una petición secundaria durante navegación se registra como información y no falla por sí solo.
- Un aborto de bootstrap crítico, especialmente `/api/state`, `/api/health` o `/api/nutrition`, sí es fallo: esas peticiones no deben desaparecer durante la inicialización.
- Un 5xx nunca se degrada a aborto esperado.

## Diagnóstico

1. Abrir GitHub → Actions → **Audit production web**.
2. Elegir la última ejecución completa, no un heartbeat de respaldo.
3. Abrir job `audit`.
4. Revisar primero el step **Navigate and audit production**.
5. Buscar `[FAIL]`, `[SUMMARY]` y `[AUDIT_FAILED]`.
6. Separar la primera causa raíz de fallos en cascada.
7. Contrastar el dominio con `AGENTS.md`, `docs/HANDOFF.md` y su contrato `agents/*.md`.
8. Reproducir antes de tocar lógica funcional.
9. Tras la corrección, ejecutar una auditoría completa y exigir `[AUDIT_OK]`.

Los logs no deben volcar cifras privadas, tokens, cookies ni screenshots con datos personales.

## Incidente de scheduler · 2026-10-01

- Último `schedule` observado antes del incidente: run **#20**, creado a las 01:19 UTC (03:19 CEST).
- Después dejaron de materializarse varios disparos horarios aunque `.github/workflows/web-audit.yml` seguía en `main`, el repositorio tenía actividad reciente y el mismo workflow continuaba funcionando por `workflow_run` y rerun manual.
- No se encontró una causa deshabilitante dentro del repositorio. La causa operativa es la dependencia de un único emisor `schedule` de GitHub, que GitHub documenta como susceptible de retraso o descarte bajo carga.
- Mitigación: cron primario `:17`, oportunidad de respaldo `:42` dentro del mismo workflow y watchdog externo al `:45`, sin crear un segundo workflow horario.
- Un run verde del slot de respaldo con `Navigate and audit production` omitido es solo heartbeat y no cuenta como auditoría completa.

## Incidente de fuentes Google y barras · 2026-10-01

- Las auditorías #38 y #43 detectaron 502 reproducibles en fuentes privadas respaldadas por Google Sheets, especialmente `/api/objects`, `/api/projects` y `/api/finance/delta`.
- No se relajó el auditor. La causa técnica era fragilidad del backend ante ráfagas/transitorios: OBJETOS y Proyectos hacían varias lecturas de pestañas en paralelo y las lecturas idempotentes no tenían retry/backoff.
- Mitigación aplicada en backend:
  - helper común `private-cloudflare/src/google-read.js`;
  - reintento solo de GET/HEAD ante 429/500/502/503/504 y errores de red;
  - respeto de `Retry-After` con límite;
  - `batchGet` para reducir las lecturas de OBJETOS, Proyectos y Delta;
  - las escrituras no se reintentan automáticamente.
- Tras desplegarlo, `objectsSync` y `projectsSync` volvieron a `ok-live` y desaparecieron los 502 persistentes de esas rutas.
- Después apareció un falso positivo distinto en las barras de MenuSemanal. La UI estaba correcta: para hoy y días pasados, cuando existe al menos una fila consumida, las barras muestran **totales consumidos**; para días futuros muestran el **plan completo**.
- El auditor ahora captura el snapshot de `/api/nutrition` usado por la propia UI al abrir Salud y aplica la misma regla consumido-vs-plan antes de validar anchura y estado/color.
- Cierre certificado por Audit production web **#46**: `540 checks / 0 failures / [AUDIT_OK]`.

## Scheduler y resiliencia

GitHub documenta que los eventos `schedule` pueden retrasarse y, bajo carga, llegar a descartarse. Por eso no se debe interpretar la ausencia de un run como una regresión de la aplicación.

La defensa vigente es:

- cron primario fuera del inicio exacto de la hora;
- oportunidad de respaldo dentro del mismo workflow;
- auditoría post-deploy;
- watcher de 90 minutos.

No crear otro workflow horario en paralelo sin una decisión explícita: produciría ejecuciones solapadas y diagnósticos ambiguos.
