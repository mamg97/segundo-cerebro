## PSICOHISTORIA — laboratorio v0.4.3: resultados históricos primero (17/10/2026)

- **Publicado en aplicación privada:** PR [#551](https://github.com/mamg97/segundo-cerebro/pull/551) fusionada, Actions de validación y despliegue privado [39007820256](https://github.com/mamg97/segundo-cerebro/actions/runs/39007820256) con resultado **success**. Confirmados en `main` HTML v0.4.3, panel de resultados y grafo de recorrido real. Queda pendiente inspección visual autenticada posterior a recarga.
- **UX inicial:** la pestaña predeterminada es Futuros; cuando está activa se oculta la portada decorativa (solo esa pestaña). Debajo de los selectores se muestra primero el caso país–año–horizonte, estado UCDP observado después, probabilidad que asignó el modelo, Brier/log-loss individuales; a continuación el grafo con recorrido ámbar y nodo final destacado (activado por defecto cuando el caso es evaluable), cronología de último año conocido, puente no observado al emitir y años objetivo, comparación de modelos y probabilidades alternativas. Layout responsive; las demás vistas conservan hero y métricas.
- **Semántica:** cada «evento real» de esta capa es el estado de umbral 25+ muertes estatales UCDP y sus transiciones 00/01/10/11, no un nombre o causa de guerra individual. No inventar eventos geopolíticos sin otro conjunto de datos trazable. Ausencias quedan no evaluables; los históricos son revisados retrospectivamente, **sin validación prospectiva**. Mantener apartados de vintages, sellado RFC3161 y cohortes 2027 no selladas intactos.
- **Próximo paso visual:** cargar [research-lab.html?v=0.4.3](https://segundo-cerebro.mamg97.workers.dev/app/research-lab.html?v=0.4.3) bajo Access y verificar estado completo/no evaluable, móvil y sobreimpresión del recorrido. **Próximo paso científico:** enriquecer narrativas de eventos exclusivamente con fuentes UCDP adicionales con fecha, país, identificador y taxonomía auditables; mantener separada esa capa de evidencia del cálculo probabilístico.

---

## PSICOHISTORIA — preparación de cohorte 2027 y vintages (17/10/2026)

- **PR #548 fusionada y CI satisfactoria:** auditor de ediciones archivadas UCDP OrganizedViolenceCY 24.1/25.1/26.1, comparador de revisiones país-año sin imputaciones y gate conservadora as-of; preparador privado reproducible de cohortes anuales futuras con origen posterior a los datos y puente temporal desconocido. Protocolo en [PSYCHOHISTORY_VINTAGES_AND_PROSPECTIVE.md](PSYCHOHISTORY_VINTAGES_AND_PROSPECTIVE.md).
- **PR #549 fusionada y CI satisfactoria:** solicitud opaca RFC3161 de lote completo con SHA-256 salado; verificación contra respuesta externa, raíz de confianza administrativamente fijada y sello anterior al objetivo. No hay TSA seleccionada ni contactada ni sello firmado recibido. El verificador mantiene el estado prospectivo no elegible hasta validar también el origen temporal del dataset y el registro de evaluación.
- **Ensayo privado efectuado:** se reconstruyó el archivo oficial UCDP 26.1 desde una copia de reproducción privada, se verificaron los checksums oficiales del ZIP y codebook y la auditoría de cobertura. Se generó una cohorte *no sellada* de candidatos para 2027 con los cinco modelos y horizontes 1/3/5/10, con datos hasta 2025 y 2026 integrado como puente desconocido. El bundle de probabilidades y la solicitud RFC3161 están archivados únicamente en la carpeta privada de experimentos, propiedad exclusiva del usuario; ni datos ni hashes de pronósticos se subieron a Git.
- **Siguiente bloqueo:** obtener comprobación independiente de disponibilidad as-of del archivo original y revisar una TSA sin coste nuevo. Transmitir solo la petición opaca, verificar respuesta y dejar evidencia privada e inmutable. Los pronósticos aún NO están emitidos/verificados. No escribir 'RESUELTA' en el registro prospectivo ni cambiar sus reglas de validación.
- **Operativa:** no hubo cambios de frontend ni nuevas APIs/cron; la versión de laboratorio privado v0.4.2 sigue siendo la vigente. Los nuevos scripts operan offline y no despliegan resultados reales en producción. La evaluación prospectiva de objetivos anuales 2027 solo será posible cuando exista el desenlace oficial íntegro, previsiblemente durante 2028.

---

## PSICOHISTORIA — v0.4.2 · primeros casos históricos evaluables (17/10/2026)

- **Disponibilidad:** los catálogos retrospectivos UCDP 26.1 privados ofrecen orígenes **2016** (195 países) y **2020** (196 países), con secuencias observadas y parámetros de cinco modelos. Casos concretos como Ucrania, Siria, Etiopía, Colombia y Myanmar están en la fuente; los valores no se hardcodean ni publican.
- **PR [#546](https://github.com/mamg97/segundo-cerebro/pull/546) fusionada:** `scoreHistoricalCases` calcula puntuaciones individuales por país/horizonte (P de estado real, Brier multicategoría y log-loss), comparando cinco modelos con el mismo desenlace, sin usar el desenlace en el ajuste. Exige secuencia anual completa, puente incluido; nunca imputa ausencias. UI permite revelar después el resultado histórico y muestra advertencias epistemológicas. Documentación: `docs/PSYCHOHISTORY_FUTURES.md` sección 9. Tests de invariancia y XSS en la suite Node.
- CI app [38982258006](https://github.com/mamg97/segundo-cerebro/actions/runs/38982258006): **success**; deploy privado [38982338952](https://github.com/mamg97/segundo-cerebro/actions/runs/38982338952): **success**. Repositorio main comprobado con HTML v0.4.2, parser y calculador presentes. **QA autenticada visual tras recarga no realizada**; no declarar cerrada hasta comprobar Safari/iPhone y Chrome.
- **Casos de diagnóstico, NO skill:** modelo Markov global, país/horizonte 2020/1 año, retrospectivo: Siria (persistencia observada, P=68,09 %, Brier=0,15136), Etiopía (persistencia observada, P=2,62 %, Brier=1,82808). Cifras calculadas a partir de los conteos privados existentes; fuente revisada, no pronósticos emitidos en 2020. No extrapolar del Brier de un caso.
- **Próximo hito científico:** reconstruir vintages disponibles as-of en cada origen y congelar la siguiente cohorte de evaluación temporal; establecer un procedimiento de emisión, sellado externo y evaluación prospectiva de 2027, **sin adjudicar éxito predictivo hasta observar resultados futuros**. En ningún caso mezclar episodios UCDP con categorías sociales inventadas.

---

## PSICOHISTORIA — Futures Engine v0.4.1 · relevo técnico (17/10/2026)

- **Código recuperado y fusionado** desde los ZIP locales de Work/Codex: PR [#543](https://github.com/mamg97/segundo-cerebro/pull/543), con 14 archivos de v0.4.0, integración incremental de API y oráculo matemático independiente. Se compararon SHA de Git de los archivos clave con los originales; exactos. Las 2 suites de CI de la PR fueron satisfactorias. El código de las fuentes permanece en Git; **no es necesario reconstruirlo de la preview local**.
- **Bloqueo de frontend resuelto:** la v0.4.0 importaba `parseRecoverySimulations` sin exportación disponible en `app/research-results.mjs`. La PR [#544](https://github.com/mamg97/segundo-cerebro/pull/544) implementó parser estricto del experimento V3 sintético y actualizó la versión estática a v0.4.1. CI privado [38981038096](https://github.com/mamg97/segundo-cerebro/actions/runs/38981038096) y despliegue privado [38981130583](https://github.com/mamg97/segundo-cerebro/actions/runs/38981130583) correctos.
- **Estado visual:** hay una pestaña existente que todavía mostraba el shell v0.4.0 anterior por no haberse recargado; **no declarar QA autenticada v0.4.1 finalizada sin recarga y revisión de datos, nodos, aristas, selección, móvil y consola**. Ruta privada: `/app/research-lab.html`; versión esperada v0.4.1. El laboratorio lee los sobres ya existentes `psychohistory.futures.catalog.v1` y `psychohistory.futures.metrics.v1` de `PsicoExperimentos`, sin inventar valores en frontend.
- **Matemáticas:** pares binarios de años 00/01/10/11, kernels estocásticos con ceros estructurales, puente temporal no observado, propagación de masa, bandas condicionales y ranking beam sin renormalización; `research/psychohistory/futures_audit.py` + tests verifican propiedades exactas y masa residual. Procedimiento: `docs/PSYCHOHISTORY_FUTURES.md` y `docs/PSYCHOHISTORY_FUTURES_AUDIT.md`.
- **Puerta científica pendiente:** benchmark UCDP 26.1 basado en release revisada, no vintages reproducidos `as-of`; resultados retrospectivos exploratorios, NO forecast prospectivo validado. V1 aún no dispone de covariables estructurales demográficas/económicas auditadas; V3 es ABM sintético no calibrado; V4 no declara pronósticos sellados. Próximo experimento: dataset vintage-correct, evaluación preregistrada en nuevas ventanas y verificación prospectiva independiente.
- **Arquitectura preservada:** mismo Sheet privado, Worker + Cloudflare Access y coste incremental cero; `private-cloudflare/src/projects.js` y `private-cloudflare/scripts/build.mjs` eran idénticos a `main` y no se sustituyeron. El despliegue de v0.4.1 fue confirmado por GitHub Actions, no sustituye QA visual tras recarga.

---

## ORGANIZADOR 21 — Corrección iPhone en detalles de recetas (16/10/2026)

- Incidencia: en Salud → Recetas y al abrir una receta desde el menú semanal, descripciones largas en la cantidad del ingrediente (con observaciones) expandían la columna CSS `auto`. En iPhone el nombre del ingrediente quedaba reducido a una letra por línea y la cantidad se salía de la tarjeta. Es **un defecto compartido de presentación, no un fallo de los ingredientes canónicos**.
- Solución en `app/styles.css`: columna de cantidades limitada a 44 % en escritorio; en anchos `<=760px` cada ingrediente usa **una sola columna**, botón/nombre completo seguido debajo de cantidad con ajuste normal. `recipe-precision` largo deja de estrechar el título de receta; sin cortes ni truncado, sin editar Sheets ni macros.
- Cobertura: `app/recipe-ingredients-responsive.test.mjs` inspecciona render común, semántica de CSS y versión de assets; `private-cloudflare/scripts/web-audit.mjs` verifica en Chromium sobre ficha real + fila sintética extrema a 320, 390 y 440 CSS px, sin registrar datos privados. Verificar PR CI/deploy/auditoría de producción; no afirmar prueba Safari real en iPhone.

---

## ORGANIZADOR · Recetas · desbordamiento de ingredientes en iPhone (16/10/2026)

- **Causa raíz:** la ficha compartida `renderRecipeDetail()` mostraba cada ingrediente en una rejilla `minmax(0,1fr) auto`; al combinar una cantidad estimada con explicación extensa y `white-space:nowrap`, la cantidad recibía ancho intrínseco casi ilimitado. El nombre quedaba reducido a uno o dos caracteres por línea (y el texto de cantidades podía sobresalir de la tarjeta).
- **Solución global:** sin cambiar fichas, ingredientes, raciones ni notas en Sheets, `app/styles.css` limita ambas columnas en escritorio y en ≤760px coloca nombre y cantidad completas una debajo de otra (sin recortes), con encabezado vertical para que la etiqueta de estimación no reduzca el título. Selector `.recipe-detail-card` común a fichas abiertas desde menú y recetario; fotos conservan `object-fit: contain`. Bump CSS/JS sincronizado para invalidar Safari. Pruebas de contrato `app/recipe-ingredients-responsive.test.mjs`.
- **Cierre:** verificar CI, despliegue privado y geometría móvil; auditoría global puede mantenerse roja por MIDAS preexistente, no confundir con error de recetas.

---

## PSICOHISTORIA — benchmark real y laboratorio v0.3.0 (16/10/2026)

- Fuente canónica: mismo Sheet privado de Proyectos. Registro de evaluaciones modelo–objetivo en `PsicoExperimentos`; sobres históricos en `notas`, escenarios ABM separados explícitamente de datos reales. Resultados y archivo íntegro de reproducción se enlazan solo desde fuentes privadas. No copiar scores ni IDs privados a Git.
- Implementado: descargas oficiales UCDP OrganizedViolenceCY 26.1 con checksums, auditoría del universo país-año, dos objetivos separados (presencia y aparición de episodio), seis comparadores, walk-forward con desfase de dos años, logística con control de convergencia, Brier/skill/log loss/AP/calibración/IC temporales y sensibilidad low/high. Manual canónico `docs/PSYCHOHISTORY_BENCHMARK.md`.
- **Límite científico vigente:** benchmark exploratorio de una release retrospectivamente revisada; disponibilidad as-of NO probada. El solver v2 corrige falta de convergencia del prototipo tras inspección preliminar. No interpretar un skill positivo como validación prospectiva ni ley histórica. V1 es índice de memoria, no cliodinámica estructural completa; no hay covariables socioeconómicas auditadas todavía.
- V3: rejilla reproducible de contagio irreversible; exclusivamente sintética, sin ajuste empírico. No atribuir predicción de países ni causalidad. Falta mecanismo de recuperación y selección previa de patrones empíricos.
- UI: comparación de cohortes/protocolos idénticos, leaderboard, series agregadas y calibración históricas, sensibilidad ABM sintética y registro prospectivo separado. Mantener fuentes vacías como Sin datos. Sin cron, polling, nueva infraestructura ni coste incremental.
- UI neuronal v0.3.0: Canvas2D de dos hemisferios, impulsos sobre conexiones y cuatro orbes seleccionables. La selección actualiza las fichas y el progreso canónico; la animación se declara conceptual, sin fingir actividad de modelos. Control de pausa persistente en RAM, teclado y foco conservado, reduced-motion, suspensión al ocultar pestaña/salir de viewport y limpieza al cambiar de vista. Sin librerías, telemetría, llamadas extra ni activos remotos; máximo 192 nodos, DPR 1.5 y 30 dibujos/s. QA local con fixtures sintéticos: escritorio, teléfono y tablet sin overflow, selección, pausa y enlace a evidencia correctos; 590 pruebas Node y build correctos. Cierre: PR [#541](https://github.com/mamg97/segundo-cerebro/pull/541) fusionada; CI [38972578208](https://github.com/mamg97/segundo-cerebro/actions/runs/38972578208) y deploy privado [38972668851](https://github.com/mamg97/segundo-cerebro/actions/runs/38972668851) correctos. QA Chrome autenticada de v0.3.0: cuatro orbes seleccionables con progreso canónico coincidente, activación con Enter, foco conservado, pausa/reanudación y pausa persistente entre vistas. Se observaron movimiento del grafo y pulsos; evidencia conserva seis modelos y tres gráficos. Anchos CSS efectivos 1732/732/341 px sin overflow horizontal; cero warnings/errores de consola observados. Safari en dispositivos físicos y medidas instrumentadas de CPU siguen sin verificar. La auditoría global ajena a este QA mantiene sus incidencias previas; no declarar verde global.
- Integridad prospectiva: fechas de Sheets ya no bastan. Evaluador falla cerrado sin verificador de recibos de servidor. `sealing.py` prepara compromisos privados salados y verifica RFC3161 localmente; autoridad independiente e integración con Worker PENDIENTES. No se han emitido pronósticos prospectivos.
- **Cierre verificado:** PR [#535](https://github.com/mamg97/segundo-cerebro/pull/535) y [#536](https://github.com/mamg97/segundo-cerebro/pull/536) fusionadas. CI de investigación [38956986929](https://github.com/mamg97/segundo-cerebro/actions/runs/38956986929), CI privado [38956986901](https://github.com/mamg97/segundo-cerebro/actions/runs/38956986901) y CI móvil [38957692619](https://github.com/mamg97/segundo-cerebro/actions/runs/38957692619) correctos; despliegues privados [38957174613](https://github.com/mamg97/segundo-cerebro/actions/runs/38957174613) y [38957876208](https://github.com/mamg97/segundo-cerebro/actions/runs/38957876208) correctos. Local: 14 tests Python y 581 Node; build privado y reproducción byte a byte de informe/predicciones en dos ejecuciones CPython 3.9.6.
- **QA autenticada de producción v0.2.1:** padre y cuatro hijos visibles en Proyectos con enlace correcto; API/Sheet/notas consistentes; cohortes y seis modelos seleccionables; tres gráficos, Operaciones y filtro de roadmap comprobados. Chrome de Mac: anchos CSS efectivos 1732, 732 y 341 px sin desbordamiento de página; corregido el overflow de KPIs móviles en #536. Tamaños equivalentes a escritorio/tablet/teléfono, **no** prueba de Safari físico. Sin warnings/errores de consola observados. Lectura sin autenticación de página/API devuelve 302 a Access. Fuente de evidencia Drive comprobada owner-only. La auditoría global completa inspeccionada [38957287915](https://github.com/mamg97/segundo-cerebro/actions/runs/38957287915) registró 1269 checks y 1 fallo, exactamente `MIDAS CHECK-00029`, ya preexistente. Logs comprobados mediante el conector de jobs; no declarar AUDIT_OK global. La verificación manual del laboratorio se documenta separadamente.
- Próximo experimento prioritario: reconstruir releases históricas disponibles en cada origen, auditar crosswalk y vintages socioeconómicos, congelar especificación y evaluar un periodo nuevo. Mantener validación científica y shadow pendientes hasta superar esas puertas.

---

## ORGANIZADOR 21 — Gimnasio · Progreso físico fotográfico privado (16/10/2026)

- Nueva pestaña **Progreso físico** dentro de `Salud → Gimnasio`. Galería de series por fecha, tres vistas (frente / diagonal / perfil), comparador de dos fechas, subida multipart de tres fotos y eliminación confirmada. Carga solo bajo demanda, `object-fit: contain` en móvil y escritorio.
- Fuente canónica `SEGUNDO CEREBRO - SALUD / GymFotos` **oculta y privada**, índice A:G y vista visual fragmentada H:AA (20 × 30k caracteres para no superar 50k/celda). Los originales de archivo permanecen en Drive privado. Las primeras tres vistas fechadas constan **solo en fuentes privadas**, sin valores personales en repositorio ni API de resumen. URLs por Worker same-origin con no-store y MIME validado; uploads WebP canvas limpian metadatos. En escritura del mismo día, fallo seguro de duplicado; eliminación vacía la serie en Sheet sin destruir los originales Drive. No D1 ni R2 nuevos.
- Código `private-cloudflare/src/gym-photos.js`, `app/gym-progress-photos.mjs`, CSS aislado, API `/api/gym/photos` y pruebas sintéticas. Verificar CI verde, despliegue privado, auditoría visual y acceso real a las tres imágenes antes de cerrar.
- NOTA: el archivo de originales en Drive no se borra cuando se elimina la serie de la galería (acción explícita diferente).

---

## ORGANIZADOR 21 — Mini calendario mensual de Gimnasio (16/10/2026)

- Petición visual: pequeño calendario del **mes local presente justo después de «Guardar entrenamiento»**, antes de «Progreso por ejercicio», con días de entrenamiento coloreados y grupo muscular pequeño dentro de cada celda. En pausa aparece después del plan de referencia, porque no hay formulario de guardado; no se muestra en la biblioteca.  las sesiones proceden exclusivamente del histórico real privado `gym_sessions` + `gym_entries` ya incluido en `GET /api/gym`, **no** del plan previsto.
- Implementación: módulo puro `app/gym-month-calendar.mjs`, estilo responsive acotado `app/gym-month-calendar.css`, plantilla `app/app.js` y stylesheet cargado desde `app/index.html`. Semana empieza en lunes, fecha en hora local, varias sesiones en mismo día comparten celda con etiquetas únicas, contador de días entrenados; `session.dayTitle` registrado prima sobre `GimnasioPlan.focus` (solo fallback si el título es genérico). Historial no disponible se ve sin días marcados: no crear eventos ni interpolar actividad. Re-render desde `renderGymPanel` tras altas/bajas canónicas. Sin llamadas, tablas ni coste adicionales.
- Tests sintéticos `app/gym-month-calendar.test.mjs`: inicio de semana, mes/bisiesto, exclusión de sesiones no realizadas, grupos múltiples, XSS, orden en DOM (formulario → calendario → progreso) y responsive. Esperar CI, despliegue privado y auditoría Chromium antes de considerar cerrada la publicación.

---

## ORGANIZADOR 21 — Reutilización inmediata de paneles Objetos/Despensa (16/10/2026)

- Reabrir los modales `Objetos` y `Despensa` reutiliza la última respuesta privada **solo en RAM de la pestaña** y pinta sin spinner. Caducidad de 5 minutos; al caducar, GET bajo demanda y compartido; si la respuesta no cambia, no reconstruir el modal, y si falla, mantener contenido anterior con aviso. No se guarda contenido personal en GitHub, disco, almacenamiento web o logs.
- La revalidación comprueba que el usuario sigue en el mismo diálogo y no edita la ficha o combinador; evitar una actualización asíncrona que deshaga entradas sin guardar. La creación de un look actualiza el snapshot tras releer el backend; generaciones evitan que una respuesta anterior pise la escritura nueva. Actualizar desde Home invalida la frescura de cada modal sin eliminar su última vista.
- Código en `app/view-memory.mjs`, `app/objects.js`, `app/pantry.js`, `app/app.js`; pruebas sintéticas en `app/view-memory.test.mjs`. Validar CI, desplegar y leer el informe Chromium posterior. Otros módulos conservan sus políticas independientes; no afirmar que toda la SPA está cacheada.

---

## ORGANIZADOR 21 — Vistas conservadas en memoria y Agenda bajo demanda (16/10/2026)

- Causa: el enlace Agenda hacía solo scroll; si la lectura inicial iCloud/Google quedaba incompleta, no se consultaba de nuevo hasta pulsar Actualizar. Además el calendario semanal se reconstruía aunque eventos y semana fuesen idénticos.
- Fix acotado en `app/app.js` + `app/view-memory.mjs`: conservar instantánea/DOM de Agenda **solo en RAM** durante la pestaña, revalidación no bloqueante únicamente al entrar si faltan datos fiables o transcurren 5 min, una llamada concurrente, contención 45 s ante error, refresco explícito forzado y reintento inicial si la fuente es parcial. **Nunca** borrar eventos existentes por respuesta parcial; mostrar el estado degradado, y no repintar DOM si semana y contenido no cambian. No polling, localStorage, cambios D1/Sheets ni nueva API.
- Pruebas sintéticas de frescura, fallo, fuente parcial, concurrencia y wiring; la auditoría existente sigue exigiendo cobertura real iCloud/Google. Comprobar CI, despliegue y Chromium antes de dar cierre final. Extender este patrón a fichas modales de otros dominios en tareas independientes, protegiendo invalidación tras escrituras canónicas.

---

## EVENTOS — Reconciliación de citas iCloud retiradas · 16/10/2026

- La Agenda semanal obtiene los eventos iCloud/Google en cada carga/refresco, con caché iCloud de 60 s cuando la lectura fue sana (fallback 15 s); no hay polling continuo mientras la pestaña queda abierta.
- Incidencia: una instancia futura de una serie iCloud dejó de actualizarse en el Sheet canónico aunque otras instancias seguían vigentes. El persistidor `syncCalendarEventsToEventsSheet` solo hacía UPSERT, dejando `CONFIRMADO` indefinidamente tras una eliminación en el proveedor.
- Fix genérico: el mantenimiento de `/api/state` comprueba ausencias solo con `icloudSource.status=ok|ok-cache`, `freshness=live`, todos los calendarios coincidentes y timestamp reciente (máx. 3 min). Marca `CANCELADO` solo las instancias futuras originalmente derivadas de iCloud que estén ausentes; nunca toca eventos manuales, históricos ni reservas externas.
- La baja es operativa del registro de Agenda, NO prueba cancelación de reserva/entrada. Conservar histórico y referencia a última actualización de fuente. Instancias auto-retiradas se reactivan si el evento vuelve a aparecer; no reactivar cancelaciones manuales.
- Comprobar CI, deploy y auditor de producción; el acceso directo autenticado a CalDAV no está disponible desde este gestor, por lo que no proclamar comprobación real de baja en el proveedor sin datos nuevos.

## OBJETOS — Recuperar fotos compuestas y reducir CPU de D1 (16/10/2026)

- Reproducido en Chrome autenticado: dos fotos compuestas no decodificaban y la recuperación de PR #519 las convertía en mosaicos. Sus BLOB canónicos conservan todos los fragmentos y tamaños esperados; no se han regenerado, sobrescrito ni cambiado relaciones/URLs en Sheets. Las métricas reales del Worker muestran agotamiento de CPU, aunque no permiten atribuir cada evento a una URL concreta.
- El binding D1 serializa BLOB como arrays JSON de números. La lectura ahora usa `HEX(SUBSTR(data, ...))` en ventanas de 512 KiB y decodificación nativa, con fallback validado para runtimes anteriores. Cada resultado queda por debajo del límite D1 de 2.000.000 bytes; los chunks almacenados de 1 MiB, checks de integridad, cancelación y stream bajo demanda se conservan. No hay migración, nueva fuente, servicio de pago ni cambio de bytes persistidos.
- Las fotos de looks usan una revisión de entrega `delivery=hex1` para evitar reutilizar respuestas antiguas incompletas que hayan quedado en caché. No hay polling ni bucle de reintentos. Si una foto existente falla, se muestra un aviso acotado; el mosaico de prendas solo corresponde a looks sin foto compuesta. La auditoría conserva el `src` de fallos reales y comprueba HTTP/decodificación aunque el navegador muestre un placeholder; un estado degradado no acredita una foto sana.
- Verificado: PR #521 fusionada, CI #726 y despliegue privado #559 correctos. Chrome autenticado posterior decodifica **50/50 fotos compuestas**, cero rotas, cero pendientes y cero mosaicos de sustitución tras recorrer la galería completa; también se inspeccionaron visualmente la parte inicial y la final. Validación local: 544 pruebas Node correctas, build y round trip exacto de más de 2 MiB con Workerd + D1 local real. Módulo `objects.js` 0.44.25.
- PR #523 fusionada, CI #728 y despliegue privado #561 correctos. La política de medios del auditor admite únicamente la revisión fija `delivery=hex1` en fotos de looks, conservando lecturas frías seriales y reutilización privada en memoria. Parámetros desconocidos, revisiones distintas y tokens continúan rechazados para caché; no se amplía autenticación ni acceso. La auditoría global anterior solo fallaba en MIDAS; verificar la posterior sin atribuirle un resultado verde global.
---

## GESTOR NUTRI 5 — Auditoría binaria y continuidad de fotos (16/10/2026)

- Reconciliación independiente: **24 originales enlazados/24 filas únicas en `RecipeMedia`**; **24/24 SHA-256 recalculados sobre JPEG decodificados y coincidentes**, dimensiones internas 480×270, máximo 46.220 caracteres por celda, origen y versión de caché alineados. Las cinco previews antes pendientes ya estaban completas: no duplicarlas.
- PR #516 **fusionada**, CI #38883070574 **success**; el DOM de la web autenticada presenta **13 recetas distintas «Sin foto»** y ningún «No disponible» en la vista semanal inspeccionada. Los anteriores recuentos de 10 no reflejan el menú actual.
- **QA visual de píxeles/recortes y respuesta HTTP individual de imágenes siguen pendientes**: el acceso disponible fue lectura del DOM, sin control visual de Chromium. No atribuir verificación visual completa al recuento de imágenes, hash o DOM.
- Sin escrituras en Sheets, sin cambios de macros/consumos/ingredientes/estados/inventario y sin originales privados en Git. Véase `docs/RECIPE_IMAGE_AUDIT_20261016.md`.

---

## ORGANIZADOR — Corrección visible de las metas en Home · 16/10/2026

- Una captura posterior a PR #513 mostró que **las marcas de objetivos no eran visibles**, aunque la auditoría #464 pasó las comprobaciones de atributos `progress.value`; eso no verificaba los píxeles pintados. No declarar resuelto solo por la auditoría antigua.
- Fix UI: cada barra del menú en Home representa sus dos rellenos con rectángulos SVG (previsto y confirmado) y su objetivo diario con **línea SVG blanca de 3,5 px con contorno oscuro**, en coordenadas proporcionadas respecto al mismo máximo absoluto. La raya del 100 % se desplaza dentro del borde recortado para que nunca desaparezca. SVG sin scripts, estilos inline, datos privados ni fuentes nuevas. HTML `progress` conserva semántica accesible y los valores previos.
- Se añade test de geometría de SVG sobre ejemplos sintéticos, y auditoría Chromium read-only comprueba SVG visible, anchuras, x de la marca, trazo blanco y CSS computado, además del contrato de datos existente. Versiones coordinadas `app.js/styles.css 0.44.44`.
- Validar CI, fusionar y verificar nuevo deploy y auditoría postdeploy. No cambiar estado de `Registro`, `MenuSemanal`, `Objetivos` o fotos ni introducir coste operativo.

---

## GESTOR NUTRI 4 — Estado vigente de imágenes semanales (16/10/2026)

- Tras corregir las cinco previews históricas recortadas, se completaron tres derivadas ausentes que sí tenían original privado. **Cobertura actual: 24 recetas con foto original, 24 entradas RecipeMedia con binario, dimensiones, SHA-256, origen y versión comprobados; 0 ausentes y 0 incompletas.** Las cifras antiguas 19/5, que aparecen más abajo, son la fotografía temporal ANTERIOR a esta reparación.
- Las recetas sin fotografía original no pueden resolverse recreando una preview; la vista del menú semanal autenticado presenta 13 recetas distintas con «Sin foto» y sin original asociado. Distinguirlas de las imágenes que fallan al cargar. No inventar fotografías ni asociar fotos de otros platos.
- Cambio UX: texto "Sin foto" si falta original frente a "No disponible" si el recurso vinculado falla; prueba de regresión en `app/recipe-image-frame.test.mjs`. La fotografía existente sigue en horizontal 16:9 con contain.
- La reconciliación de las tres nuevas filas técnicas está verificada en Sheets (original, SHA, dimensiones, versión); **pendiente verificación visual autenticada posterior**. Detalles y excepciones: `docs/RECIPE_IMAGE_AUDIT_20261016.md`.

---

## GESTOR NUTRI 4 — Root cause adicional de fotos ya recortadas (16/10/2026)

- La PR #514 corrigió clipping del CSS y su despliegue privado terminó correctamente, pero **no recuperaba los píxeles ya recortados dentro de algunas previews de RecipeMedia**.
- Se compararon originales privados y vistas previas: 5 JPEG antiguas con zoom/crop destructivo; regeneradas conservadoramente a 480×270 con original completo y márgenes. Escritura y reread 5/5 con SHA-256, origen y versión de caché correctos. No se cambian recetas ni consumos.
- Auditoría de medios: 24 originales enlazados, 19 registros técnicos, cinco ausentes y cinco con metadatos incompletos. La auditoría posterior a la PR (1.260 checks, 1 fallo MIDAS) fue anterior a la reparación de bytes y **no acredita QA visual posterior**.
- Evidencias, hashes y criterio reproducible: `docs/RECIPE_IMAGE_AUDIT_20261016.md`.

---

## GESTOR NUTRI 4 — Encuadre horizontal completo de fotos de recetas (16/10/2026)

- Causa raíz reproducida localmente en Chromium: con `display:grid` y tracks automáticos, una foto vertical fuerza altura intrínseca del `img` (1470 px con marco de 553 px en desktop, 555 px con marco de 210 px móvil), y el `overflow:hidden` recorta el plato aun con `object-fit:contain`. Las pistas de mínimo cero y `img { min-width:0; min-height:0; max-width:100%; max-height:100%; }` evitan el problema sin tocar ni publicar originales.
- Norma permanente en `docs/RECIPES_IMAGE_INGEST.md`; test en `app/recipe-image-frame.test.mjs`. Todas las fichas y miniaturas son horizontales 16:9 mostrando el original completo, con márgenes según orientación, tanto si hay preview como si el Worker hace fallback al original.
- Auditoría privada de catálogo: 24 recetas con foto; 19 entradas en `RecipeMedia`; 5 sin preview y 5 con dimensiones/hash incompletos o no normalizados. Ninguna discrepancia entre `source_drive_file_id` de previews presentes y foto canónica. Reparación de derivados técnicos sigue pendiente; no sustituir los originales ni afirmar cobertura total del pipeline.
- PR/CI/despliegue/auditoría final: revisar después de integrar esta rama. No proclamar producción verificada únicamente por la simulación local.

---

## ORGANIZADOR 20 — Referencias de objetivos en barras del menú Home (16/10/2026)

- Petición: mostrar dentro de cada barra del menú semanal una raya vertical en el objetivo diario canónico de kcal/proteínas, conservando la distinción entre plan previsto y consumo confirmado.
- UI en Home: tres elementos superpuestos sobre una **escala absoluta común** `max(1, previsto, consumido, objetivo)`: fondo tenue para el total previsto, relleno intenso para el confirmado y línea blanca en el objetivo. El objetivo no se convierte en denominador oculto de otra barra; puede quedar antes, al final o después de la previsión sin falsificar geometría. Leyenda única en cabecera; los valores «consumido / previsto» siguen dentro de cada barra. Objetivo ausente/inválido → ninguna línea inventada. Subtotales incompletos conservan «≥».
- Implementación sin estilos inline ni librerías: HTML `progress` con `value` y `max` compartidos y borde del valor del objetivo mediante CSS; versión coordinada `app.js` / `styles.css` `0.44.43`. PR con tests Node de extremos, objetivo nulo, redondeos, incompletos, cabecera y auditoría Chromium read-only de las tres escalas.
- **Pendiente de confirmar:** CI, fusión, Cloudflare privado y auditoría automática. La última auditoría confirmada sin este cambio seguía con fallo ajeno de MIDAS `CHECK-00029`; no atribuirle una resolución. No se han escrito `MenuSemanal`, `Registro` ni `Objetivos`.

---

## ORGANIZADOR 20 — Cierre verificable Salud: Chromium #453 (15/10/2026)

- **Estado confirmado:** PR #501 (fotos primero/filtro de ingrediente), #502 (auditoría), #503 (Cambiar en acompañantes planificados), #504/#505 (ficha de ingrediente con degradación segura y caché), #506 (bloquear segunda receta principal), #507/#508 (resiliencia de navegación), #509 (trazado anónimo), #510 (controlador delegado), #511 (auditoría limitada a filas reales), todas fusionadas con CI satisfactoria final.
- Último `main` auditado: `e51c9d5c0252556fb0d0b729eac31d8e45097451` (PR #511), CI #710 `success`, Cloudflare privado #552 `success`, auditoría Chromium [#453](https://github.com/mamg97/segundo-cerebro/actions/runs/38767566985) completa con **1.257 checks, 1.256 correctos y un fallo conocido de MIDAS `CHECK-00029`**. Ningún fallo funcional de Salud/Recetas/Home en esa ejecución. No declarar `AUDIT_OK` global.
- Diagnóstico histórico de selección: en la ficha examinada se contaron ocho filas canónicas y nueve coincidencias del selector genérico `[data-recipe-ingredient]`; el auditor anterior podía pulsar un control fuera de la lista. Al acotar el selector a botones de filas reales, Chromium verifica apertura de ingrediente, contexto/producto, navegación de vuelta, orden foto y filtro. Sigue registrándose **un control adicional fuera de filas**, sin fallo funcional en #453; no inferir que haya una receta o dato duplicado.
- **Alcance pendiente declarado:** el selector de Home sustituye una fila planificada `food_id` por **receta** con raciones explícitas, pero todavía no soporta sustitución directa **producto→producto** ni rectificación de una fila ya `consumido` reconciliando `MenuSemanal` y `Registro`. No equiparar ambas operaciones ni editar histórico sin contrato y confirmación expresa. También permanece MIDAS CHECK-00029.
- Sin costes nuevos, datos sensibles en Git, nuevos endpoints o escrituras reales durante auditorías. Para nuevas modificaciones seguir rama/CI/deploy/auditoría y actualizar handoff.

---

## ORGANIZADOR 20 — Auditoría de ingredientes: selector de filas exacto (15/10/2026)

- Auditoría Chromium #452 tras PR #510 / deploy #551: `1255 checks / 6 fallos` (MIDAS + recetario + vuelta). En Recetas, la búsqueda demasiado amplia `[data-recipe-ingredient]` devuelve **9 controles**, mientras las filas `.recipe-ingredients li` son **8**. La traza del clic muestra `clicked=1 changes=1 loading=0 detail=0`, y el navegador queda en vista incompleta `INGREDIENT_VIEW_INCOMPLETE`. El dato privado de Salud muestra ocho ingredientes en la primera receta canónica consultada. No registrar nombres ni IDs en Git/logs.
- Se corrige el selector de auditoría para elegir solo `.recipe-detail-card .recipe-ingredients li [data-recipe-ingredient]` y contrastar exclusivamente filas de ingredientes; reporta por separado el recuento anónimo de controles que estén fuera de esas filas. Clasifica `invalid-reference` como fallo, nunca como éxito. Así prueba una acción real de la UI en lugar de un control de otra zona.
- La anomalía de un control adicional sigue en investigación: no borrar ni modificar el dato canónico para hacer verde un test. Requiere CI y auditoría de producción con el selector correcto. Sin mutaciones nutricionales.

---

## ORGANIZADOR 20 — Diagnóstico concluyente de clic y refuerzo por delegación (15/10/2026)

- Auditoría #451 del despliegue #550: `1255 checks / 5 fallos`. Traza de solo lectura: `clicked=1 disabled=0 changes=0 loading=0 detail=0 catalogue=0`; el botón recibe el clic pero el DOM no cambia. Por tanto, no se trata de esperar a Despensa ni de una ficha que se cierra después: hay que corregir enlace/evento/índice de la acción.
- Rama `fix/recipe-ingredient-delegated-handler-20261015`: se elimina la dependencia de manejadores individuales de botones y se usa un único listener delegado en el panel estable, con fase capture y AbortController por render. Se aborta al volver al recetario para evitar handlers acumulados. Un índice inválido produce mensaje recuperable, no fallo silencioso. Se preservan la transición inmediata, el límite del módulo y los datos canónicos.
- La auditoría verifica el atributo técnico `recipeIngredientHandler=delegated`, cuenta de botones vs filas y clic real; logs solo métricas anónimas. CSS/JS ambos `0.44.42`. Requiere CI, merge, deploy, Chromium completo. MIDAS #00029 sigue fuera de este cambio.

---

## ORGANIZADOR 20 — Auditoría #450 y trazado del clic de ingredientes (15/10/2026)

- Producción #549 auditada en Chromium #450: `1255 checks / 5 fallos`; siguen cuatro de apertura/contexto de ingredientes y `MIDAS CHECK-00029`, con código `RECIPE_DETAIL_STILL_OPEN`, incluso tras el cambio de vista inmediato en #508. Las imágenes visuales superaron sus checks.
- Hipótesis no confirmadas: el evento `click` no llega al controlador o la vista se sustituye después. Antes de modificar de nuevo el flujo funcional, la auditoría read-only registra **exclusivamente** clic capturado (booleano), estado disabled, recuento limitado de mutaciones y si apareció alguna vez una pantalla de carga, ficha de ingrediente o catálogo. Solo se imprime la traza cuando falla, sin receta, usuario, identificador ni URL.
- PR de diagnóstico `fix/recipe-navigation-observability-20261015`: requiere CI, despliegue y lectura de la siguiente auditoría antes de formular una causa raíz. No toca nutrición, registros ni endpoints.

---

## ORGANIZADOR 20 — Navegación inmediata del ingrediente (15/10/2026)

- Auditoría #449 sobre #548: 1.255 controles, cinco fallos; cuatro de ingredientes y uno MIDAS. Nuevo diagnóstico anónimo `RECIPE_DETAIL_STILL_OPEN`: tras pulsar el alimento seguía visible el detalle de receta, sin entrar a la ficha. Esto demuestra un problema anterior a la representación de macros; la mera invalidez de caché y preservación de vistas no bastaron.
- `renderRecipeDetail` ahora cambia inmediatamente a una vista de carga cancelable **antes de importar el módulo**. El import dinámico tiene plazo máximo de 8,5 segundos y, si falla, muestra una ficha mínima con solo nombre y cantidad confirmados, los demás valores pendientes, botón Volver y reintento. Si el usuario vuelve mientras carga, la respuesta tardía no modifica la vista.
- Auditoría Chromium distingue `module-error` como degradación real, no falso positivo. Versión conjunta CSS/JS `0.44.41`. CI, despliegue y auditoría tras PR obligatorios; no dar por cerrado sin evidencia. Sin cambios de Sheets ni de `Registro`.

---

## ORGANIZADOR 20 — Vista de ingredientes: prevenir re-render durante fetch y clasificar errores (15/10/2026)

- Auditorías Chromium #446 y #447 siguen en rojo (1.255 controles / 5 fallos): un fallo MIDAS previo y cuatro del itinerario ficha ingrediente. El ajuste del módulo y su versión de caché no bastaron; las imágenes visuales ya no fallaron en esas ejecuciones, pero no hay garantía de ausencia de recurrencia.
- `loadNutritionPanel` respeta una vista de detalle de receta o ingrediente abierta por el usuario ante una respuesta de nutrición en segundo plano; el catálogo se reconstruye cuando no hay detalle activo. Además se señaliza una posible excepción de carga del módulo con código interno y la auditoría Chromium emite categorías cerradas sobre la pantalla fallida, sin nombres/IDs/fotos privadas.
- Incrementa versión conjunta del CSS/JS a `0.44.40`. Requiere CI, despliegue y auditoría; no declarar corregida la navegación sin evidencia posterior.

---

## ORGANIZADOR 20 — Integridad 0–1 receta principal por toma (15/10/2026)

- Validación adicional del editor de acompañantes: sustituir un `food_id` por una receta no puede crear una segunda receta principal en la misma fecha + momento, aunque la receta anterior tenga distinto ID. Se conserva la posibilidad de reemplazar si solo existen recetas secundarias `tipo_item=acompanante` o históricos `retirado`. La API responde `PRIMARY_RECIPE_ALREADY_IN_MEAL` (409), sin escritura parcial. No cambia macros, registros ni front; prueba sintética de colisión, consumo ya confirmado y excepciones legítimas.
- Auditar tras CI/merge/deploy; los consumos confirmados siguen requiriendo una futura reconciliación explícita con `Registro`, nunca edición ciega de plan.

---

## ORGANIZADOR 20 — Invalidez de caché del módulo lazy de ingredientes (15/10/2026)

- Tras #504 se invalida explícitamente el import dinámico de `recipe-products.js` (`v0.42.2`) y la entrada privada `app.js` (`v0.44.39`): así Chromium fresco y sesiones que recargan no conservan el JS previo en cachés estáticas. No cambia CSS ni datos privados. Verificar CI/despliegue y auditoría tras esta entrega; no confundir deploy con auditoría superada.

---

## ORGANIZADOR 20 — Cierre comprobado de recetario y edición de acompañantes; regresiones de auditoría (15/10/2026)

- Estado real verificado: PR #501, #502 y #503 fusionadas en `main` (`79c80c4d61169f5c657cb24d00f8545c7abda1e8`); CI #698, #699, #701 correctas; despliegue privado #544 correcto. La ordenación por fotografía y el filtro real por ingrediente ya están en producción. Las filas planificadas de producto/acompañante ya ofrecen Cambiar y Consumida; el selector sustituye por **receta** con nuevas raciones expresas. La edición producto→producto y la rectificación de consumos confirmados siguen fuera de este contrato y requieren trabajo independiente con Registro.
- Auditorías Chromium #444 (1248/6) y #445 (1248/11) en rojo: MIDAS CHECK-00029 conocido; cuatro fallos consecutivos de ficha de ingrediente en Salud; seis controles visuales de imágenes en #445. La auditoría prueba correctamente el nuevo filtro y los botones de Home, pero el conjunto NO está verde.
- Corrección de resiliencia en rama `fix/recipe-ingredient-fallback-20261015`: consulta de Despensa y ficha comercial con espera acotada; si falla el detalle, muestra datos canónicos básicos; si falla la fuente, conserva contexto de ingrediente con precio y nutrición desconocidos, aviso explícito y reintento manual. Auditoría distingue tarjeta degradada mediante código cerrado, sin revelar datos. No toca Registro, MenuSemanal ni infraestructura. Validar CI y comprobar Chromium postdeploy; no dar por cerrados los errores de imágenes o MIDAS.
 
---

## ORGANIZADOR 19 — Home · Cambiar alimentos planificados de media mañana y merienda (15/10/2026)

- Diagnóstico confirmado en `MenuSemanal`: varios alimentos de media mañana/merienda son filas `food_id` con `tipo_item=acompanante` y estado `planificado`; el botón «Cambiar» y el backend antiguo exigían `recipe_id` y `tipo_item=receta`. También ocultaban la edición de recetas acompañantes. No depende del momento.
- Se habilitan «Consumida» y «Cambiar» para cualquier fila canónica planificada/pendiente de tipo receta o acompañante que tenga un único `recipe_id` o `food_id`, conservando fecha, momento, identidad de fila y control de obsolescencia. El selector permite sustituir un alimento individual por una receta con raciones **explícitas**, nunca convertir automáticamente gramos/unidades del producto a raciones; recalcula cuatro macros antes de guardar, transforma la fila a `recipe_id` sin duplicar plan y retira duplicados históricos. La alternativa del editor sigue siendo una receta del maestro `Recetas` (no se afirma que sustituya alimento por otro producto).
- Consumos ya confirmados siguen bloqueados a la mutación del plan: corregir lo comido requiere conciliación independiente con `Registro`, no sobrescribir el histórico. Tests de IDs, cantidad explícita, caso consumido, duplicados, colisiones y macros; auditoría Chromium es exclusivamente read-only.
- Mantener coste cero, privacidad y resultados anteriores del catálogo Recetas. Validar CI/despliegue/auditoría posterior.

---

## ORGANIZADOR 19 — Auditoría de Recetas: no asumir primera tarjeta igual a primera fila (15/10/2026)

- PR #501 publicó orden por foto y filtro canónico. La auditoría #441 y la programada #442 reproducen 4 fallos en la navegación/carga de ficha de ingrediente, además de MIDAS CHECK-00029. El test de apertura de detalle heredado hacía `catalogCards.first().click()`, supuesto obsoleto ahora que las imágenes aparecen primero: debe resolver `recipes[0].id` desde la API y buscar esa misma tarjeta después del orden visual. Verificar además el orden foto y filtro por separado.
- Se corrige la auditoría read-only para abrir la identidad canónica original (sin hardcodear IDs), y se añaden códigos limitados de diagnóstico de foto/filtro sin nombres ni referencias privadas. No se altera ningún dato ni interfaz de producción. CI y nueva auditoría deberán demostrar reducción a incidencias preexistentes.

---

## ORGANIZADOR 19 — Recetas: fotos primero y selector de ingrediente (15/10/2026)

- Salud → Nutrición → Recetas: ordenar fotos existentes primero, conservando el orden de origen dentro de los grupos con/sin imagen.
- Selector nativo y accesible encima del catálogo: opciones derivadas únicamente de los `ingredients[].name` recibidos del maestro `IngredientesReceta` en la API privada ya existente, sin nueva consulta, polling ni tablas. Agrupa variantes de mayúsculas/acentos para evitar duplicados y muestra cuántas recetas tienen cada ingrediente; elegir uno filtra por ingrediente real, no por parecido con el título de receta. La opción «Todos los ingredientes» restaura el catálogo completo.
- El filtro se conserva al entrar a una ficha y regresar, y se limpia si desaparece del catálogo en una carga posterior. Compatible con pantallas móviles, cambio de tema, CSP y demo; tests Node cubren orden estable, filtrado estricto y normalización. Auditoría de Chromium, solo lectura, valida el orden y selecciona/restaura un ingrediente auténtico sin registrar su nombre. Sin cambios de fotos, macros, ingredientes o datos privados.
- Cierre condicionado a CI, despliegue Cloudflare y auditoría postdeploy. Fallo MIDAS CHECK-00029 conocido y ajeno.

---

## ORGANIZADOR 19 — Botones de Home fijos y fotos privadas completas (15/10/2026)

- El bloque superior `topbar` pasa a `position: sticky` inmediatamente bajo la barra de navegación principal. El desplazamiento se fija **solo mediante CSS** (55px escritorio, 83px móvil), sin estilos inline ni JavaScript, en cumplimiento de la CSP. En móvil el antiguo botón flotante independiente se desactiva; Actualizar permanece junto a Demo y Tema, sin solaparse con el menú fijo.
- Tres fotografías verticales originales revisadas en Drive: pan de cristal con guacamole/pavo/huevos; vaso fresa-plátano +Proteínas 343 g; fajitas de lomo de pavo. `RecipeMedia` no contenía derivadas para estas tres identidades. Se prepararon tres derivados JPEG 480×270 completos con relleno lateral desenfocado (sin recorte del original), se conservaron las referencias originales en `Recetas` y se actualizaron únicamente `RecipeMedia` y las tres versiones `foto_updated_at`; no se cambian ingredientes, macros ni consumos. Los originales siguen en Drive y los bytes reales no entran en Git.
- Tests JS/CSS de colocación, adaptación, posición estable y auditoría Chromium de posición tras scroll. Mantener el runbook `docs/RECIPES_IMAGE_INGEST.md`, privacidad y coste cero; validar CI, deploy, audit; MIDAS CHECK-00029 sigue independiente.

---

## ORGANIZADOR 22 — Menú Home segundo cuadro y fotos sobre título (15/10/2026)

- Solicitud tras captura real: miniaturas 42×42 colocadas a la izquierda y macros en columna lateral estrechaban nombres hasta dividir palabras o letras. Corrección semántica y responsive: cada receta muestra imagen privada 16:9 de hasta 156×88 arriba, debajo nombre legible a ancho de columna y macros en una fila propia, seguidos por Consume/Cambiar. Los acompañantes sin receta mantienen su renderizado; no se toca lógica de dieta, fotos ni APIs.
- El menú semanal pasa a ser el **segundo bloque completo** dentro de `daily-overview-grid`, inmediatamente después del resumen Salud/consumos y antes de Despensa, Objetos y Finanzas. Conserva el mismo `id`, estados, carga desde Sheets, scroll horizontal y enlaces.
- Tests sintéticos de orden DOM, foto/título/macros/acciones y CSS; auditoría read-only Chromium verifica orden de bloques y geometría en escritorio/móvil. Sin mutación de datos privados ni costes añadidos. PR, CI, despliegue y auditoría postdeploy para cierre.

---

## ORGANIZADOR 21 — Sesiones antiguas tras despliegues (15/10/2026)

- Captura posterior al despliegue #538 muestra Home sin miniaturas ni controles de consumir/cambiar; el código visible es anterior a #493/#497. Chromium fresco #437 comprobó la UI moderna y las fotos (1.238 checks, fallo conocido solo MIDAS CHECK-00029). Diagnóstico: pestaña SPA ya abierta conserva sus módulos/DOM en memoria; ni HTML `no-store` ni hashes fuerzan una recarga activa.
- Corrección: el frontend privado incorpora un guard **sin polling**: al volver a una pestaña o restaurarla desde back-forward cache, a lo sumo una lectura de HTML autenticado por cada 120 s compara el hash real de `app.js`. Si ha cambiado, recarga automáticamente cuando no hay edición; si hay diálogo, foco de formulario o entrada modificada, avisa con botón explícito y conserva la sesión. Respuestas de SSO, sin red o inválidas nunca fuerzan recargas. Coste recurrente cero.
- La pestaña ya abierta **antes de este fix** no tiene instalado el guard: para ella es imprescindible una única recarga manual (`⌘+Mayús+R`). Tests Node y Chromium read-only verifican guard, activación y formato de versión. No se muta la fuente nutricional.
- Cierre requiere CI, despliegue y auditoría posterior; persistencia de MIDAS independiente.

---

## ORGANIZADOR 20 — Home · miniaturas privadas de recetas (15/10/2026)

- El menú ligero añade `Recetas!A1:O1000` al batchGet **existente** y enlaza por `recipe_id` solo referencias `photoUrl` del endpoint autenticado `/api/health/recipes/{id}/image?v={version}`. No se transfieren a Home ni a GitHub IDs privados de Drive o bytes de imágenes.
- Home muestra miniatura 42×42 px, `object-fit: contain`, `loading=lazy`, mismo botón de acceso a la ficha, marcador sin foto, fallback de error, y CSS adaptado a columnas compactas. No modifica estados, barras, macros ni acciones de consumo/sustitución.
- Tests sintéticos de identidad, versión, ausencia y seguridad; Chromium read-only comprueba DOM frente al menú vivo y decodifica una foto existente sin escribir consumos. PR/CI/despliegue/auditoría postdeploy necesarios para cierre. Riesgo MIDAS CHECK-00029 ajeno.

---

## ORGANIZADOR 19 — Conciliación Registro por momento de consumo (15/10/2026)

- Corrección genérica posterior a #495: al obtener consumos desde MenuSemanal para completar Registro, comparar por fecha + momento canónico + ID de receta/producto, no solamente por ID diario. Un alimento repetido en otra toma no debe quedar omitido del total de consumo por compartir ID con un registro anterior. Se mantiene exclusión de coincidencias exactas para evitar doble cómputo.
- Tests sintéticos de comidas distintas, otras recetas, cambios de fecha y normalización de momentos legados (postre/snack). Sin escrituras en Sheets, D1 o Registro real. Ningún dato privado en Git.
- Limitación: si un registro antiguo carece de ID canónico, no es posible inferir identidad exacta sin crear coincidencias espurias; se conserva el fallback explícito.

---

## ORGANIZADOR 19 — Validación de raciones desconocidas en Home (15/10/2026)

- PR #493/#494 ya estaban fusionadas en main; CI #688 y despliegue privado #535 correctos. Auditoría cron #434: 1232 controles, único fallo conocido MIDAS CHECK-00029; Home/Nutrición sin fallo y paridad ligero/completo 0/0.
- Corrección posterior: la vista previa de sustitución y su endpoint no pueden interpretar una cantidad vacía como 1 ración. Ambas capas bloquean esa sustitución; pruebas unitarias con porción ausente, vacía y cero. No se modifica MenuSemanal ni Registro de producción.
- La serialización distribuida entre gestores de Google Sheets no equivale a una transacción CAS: el control de versión evita escrituras obsoletas secuenciales, pero no demuestra aislamiento bajo carreras simultáneas. Mantener este límite explícito.

---

## ORGANIZADOR 18 — Home · consumo y sustitución de recetas (15/10/2026)

- Capacidad nueva en Home: cada receta **planificada** tiene acciones independientes «✓ Consumida», «Cambiar» y su enlace anterior para ver la ficha. El estado consumido proviene exclusivamente de `MenuSemanal.estado`; las barras consumido/previsto se recalculan al instante y se verifican después de guardar. Los acompañantes conservan su identidad y el flujo de recetas no marca consumos por navegación.
- Editor: modal responsive con búsqueda diferida de `Recetas`, vista previa de kcal/proteínas/HC/grasas y nuevos totales previstos del día; no se puede guardar sin macros y ración interpretables. Conserva fecha, momento, cantidad, unidad y componentes del plan. No modifica recetas canónicas ni usa sustituciones aproximadas.
- API privada: GET `/api/nutrition/menu/recipes` (lista reducida) y POST `/api/nutrition/menu/edit` (escritura validada por identidad, fila original, timestamp y estado; rechazo `409` de datos obsoletos). `MenuSemanal` es la fuente única del plan; `Registro` permanece independiente, y la conciliación de consumo no considera un simple `planificado` como consumo ya registrado. Una sustitución retira versiones antiguas de la misma receta para evitar reapariciones.
- **Cierre técnico verificado:** [PR #493](https://github.com/mamg97/segundo-cerebro/pull/493) fusionada en `fb9aa35a3e1621a82c30471edba88fc9caa29939`, [CI #688](https://github.com/mamg97/segundo-cerebro/actions/runs/38693486508) `success`, [deploy privado #535](https://github.com/mamg97/segundo-cerebro/actions/runs/38693628772) `success`, demo #787 `success`. [Auditoría Chromium #433](https://github.com/mamg97/segundo-cerebro/actions/runs/38693729777): **1232 checks / 1 fallo**, exclusivamente MIDAS CHECK-00029. Verificaciones de botones de recetas, búsqueda, previsualización y cierre del selector pasaron sin escrituras reales. Tests sintéticos `weekly-menu-actions.test.mjs` y `home-weekly-menu-actions.test.mjs` verdes. Con lectura de Sheets autorizada se verificó que las columnas A:R están presentes y el recetario permite opciones nutricionalmente verificadas; no se modificaron datos personales. **Riesgo conocido:** la UI solo permite editar recetas planificadas; cambiar consumos confirmados requeriría reconciliar también `Registro` sin alterar el histórico. Estado integral de auditoría sigue rojo por MIDAS, independiente.

---

## ORGANIZADOR 19 · Mitigación BLOB de Objetos y límite de recursos (14/10/2026)

- Incidente #426: Chromium 1227 controles / 8 fallos. Seis fallos visuales y uno infra derivan de 37 HTTP 502 de imágenes de Objetos; diagnósticos 31 `AUDIT_GATEWAY_WORKER_RESOURCE_LIMIT` y 6 respuestas 5xx sin clasificar. MIDAS `CHECK-00029` independiente. Los logs permiten afirmar límite de recursos al atravesar el Service Binding, pero no identificar CPU frente a memoria/otras cuotas sin telemetría adicional.
- En `private-cloudflare/src/objects-media-d1.js` el antiguo `get(stream:true)` leía **todos** los BLOBs D1 secuencialmente y los encolaba antes de devolver una respuesta. Ahora precalcula y verifica **solo longitudes/índices** con una consulta ligera y devuelve un ReadableStream que solicita cada BLOB exclusivamente cuando el consumidor lo lee (máximo un fragmento de 1 MiB retenido por la capa D1), con cancelación real y propagación de errores; los consumidores que requieren bytes completos no cambian de contrato. Imágenes existentes, SHA/ETag, URL, permisos, D1 y Sheets **sin mutaciones**.
- **Evidencia de recuperación funcional:** PR [#491](https://github.com/mamg97/segundo-cerebro/pull/491) fusionada en `a3eafbd77956ce3cd11a386bb2701c99693d1c10`. CI [#687](https://github.com/mamg97/segundo-cerebro/actions/runs/38641755799) `success`; despliegue privado [#534](https://github.com/mamg97/segundo-cerebro/actions/runs/38641906569) `success`; Pages #785 `success`. Chromium [#427](https://github.com/mamg97/segundo-cerebro/actions/runs/38642043195) **dos ejecuciones completas** (intentos 1 y 2, jobs independientes), **1227 checks/1 fallo en ambas**, exclusivamente `MIDAS CHECK-00029`. En ambos intentos: **0 HTTP 502, 0 WORKER_RESOURCE_LIMIT, 0 fallos visuales de Objetos**, caché efímera `hits=585 shared=66 entries=83 peak_image_reads=1`, `NUTRITION_PARITY lightOnly=0 fullOnly=0`. La auditoría global sigue roja por MIDAS. La recuperación de imágenes tiene doble evidencia Chromium, pero falta una ejecución cron natural posterior y telemetría del límite exacto para cerrar la causa de raíz. Sin cambios de Sheets/D1 ni resultados ficticios.

---

## ORGANIZADOR 18 · Frontend antiguo retenido tras cambios de Home (14/10/2026)

- Nueva captura del usuario aún muestra subtítulo y barras antiguos, pese a que Chromium fresco #425 comprobó el nuevo menú en el Worker privado. Causa de entrega que se evita: `app/index.html` mantenía la misma query `?v=0.44.32` para `app.js` y `styles.css` entre commits y el HTML podía revalidarse con caché; también una pestaña SPA abierta antes del despliegue mantiene su DOM antiguo hasta recarga.
- Corrección: `private-cloudflare/scripts/build.mjs` genera queries SHA-256 truncadas a 16 hex según bytes actuales del frontend para el HTML privado; `private-cloudflare/src/index.js` entrega HTML estático con `Cache-Control: no-store`, preservando la política de datos/API y el cache-control del resto de assets; `app/index.html` incrementa `v` para la demo pública. Sin limpiar autenticación, ni servicios de pago, ni tráfico periódico adicional.
- **Verificado:** PR [#489](https://github.com/mamg97/segundo-cerebro/pull/489) fusionada en `fb383083ef4b97314a67d41c457d4994fc3209ce`; CI [#686](https://github.com/mamg97/segundo-cerebro/actions/runs/38630605285), Cloudflare privado [#533](https://github.com/mamg97/segundo-cerebro/actions/runs/38630774920) y Pages [#783](https://github.com/mamg97/segundo-cerebro/actions/runs/38630774987) en `success`. Auditoría Chromium [#426](https://github.com/mamg97/segundo-cerebro/actions/runs/38630915395): **1.227 controles, 8 fallos no atribuibles a Home/cache**. Versiones del frontend y controles del menú `PASS`; `NUTRITION_PARITY lightOnly=0 fullOnly=0`. Queda **MIDAS CHECK-00029** y **7 fallos** de imágenes de Objetos (31 `AUDIT_GATEWAY_WORKER_RESOURCE_LIMIT`, 6 respuestas 5xx no clasificadas, 37 HTTP 502 de imágenes agregadas). No interpretar estos errores como causa D1 sin telemetría. El usuario debe **recargar la pestaña ya abierta** para sustituir el DOM antiguo; si persiste, comprobar URL exacta y ruta de origen antes de más cambios.

---

## ORGANIZADOR 18 · Cierre verificable del menú semanal de Home (14/10/2026)

- **PR [#486](https://github.com/mamg97/segundo-cerebro/pull/486)** fusionada; objetivos diarios de kcal/proteína una sola vez antes de la matriz, sin repetición en las columnas. Cada día muestra valores `consumido / previsto` dentro de las dos barras; consumido incluye solo registros confirmados y el plan mantiene las filas de `MenuSemanal`, incluso si el consumo es cero. No se alteró la fuente privada.
- Auditoría postdeploy [#424](https://github.com/mamg97/segundo-cerebro/actions/runs/38626553859) identificó un fallo reproducible `OTHER CHECK-00081`: el ancho se calculaba a partir de fracciones internas, aunque se mostraban enteros redondeados. **PR [#487](https://github.com/mamg97/segundo-cerebro/pull/487)** corrige el denominador y numerador visuales sin modificar cifras fuente; test específico de `1.49/2.49 → 1/2 → 50%`.
- **Validación final:** CI [#684](https://github.com/mamg97/segundo-cerebro/actions/runs/38627564790) `success`; despliegue privado Cloudflare [#532](https://github.com/mamg97/segundo-cerebro/actions/runs/38627694775) `success`; demo Pages [#781](https://github.com/mamg97/segundo-cerebro/actions/runs/38627694650) `success`. Commit productivo `a3097d3e00447007e9534ee5dc1cfb24a8631f11`. Auditoría Chromium [#425](https://github.com/mamg97/segundo-cerebro/actions/runs/38627849881): **1.226 controles / 1 fallo**, `OTHER CHECK-00081 PASS`, controles nuevos de objetivos y datos de barras PASS, `NUTRITION_PARITY lightOnly=0 fullOnly=0`. Único fallo `MIDAS CHECK-00029`, independiente. No declarar verde global mientras persista MIDAS.
- Coste operativo añadido cero; ninguna modificación de Sheets, D1, saldos, objetivos reales, registros de consumo ni credenciales.

---

## ORGANIZADOR 18 · Ajuste de paridad exacta de las barras de Home (14/10/2026)

- Auditoría Chromium productiva [#424](https://github.com/mamg97/segundo-cerebro/actions/runs/38626553859): 1226 checks / 2 fallos; MIDAS conocido y `OTHER CHECK-00081` de relleno de barras. Objetivos únicos y textos consumo/plan pasan sus controles. Diagnóstico: el progreso calculaba proporción desde fracciones internas, pero los números visibles estaban redondeados; podía surgir una diferencia porcentual. Se corrige en UI comparando **los enteros visibles** y se añade test sintético de redondeo; no se modifica fuente nutricional ni se relaja el gate de auditoría. Cierre condicionado a CI, Cloudflare y nueva auditoría completa.

---

## ORGANIZADOR 18 · Home, cabecera compacta del menú semanal (14/10/2026)

- Petición: objetivos kcal/proteína una sola vez a la izquierda antes de la tabla y barras con `consumido / previsto` dentro de cada día, sin repetir objetivos ni porcentajes en las cabeceras.
- Fuente canónica intacta: `MenuSemanal` contiene plan y estados de consumo; `Objetivos` fija metas diarias. `app/app.js` pinta los objetivos solo arriba, calcula el progreso frente al plan conocido, y conserva estados parciales y la navegación de recetas; `app/styles.css` contiene el diseño responsive, `app/index.html` simplifica la introducción. No confundir progreso respecto del plan con calidad nutricional frente al objetivo; Salud → Nutrición conserva su lógica de objetivos existente.
- QA: `app/home-weekly-menu-comparison.test.mjs` prueba progreso normal, cero, exceso, planificación no existente, macros parciales y objetivos únicos; `private-cloudflare/scripts/web-audit.mjs` valida en Chromium la paridad real consumo/plan y objetivos frente a la API privada en vivo sin datos privados en logs. Requiere CI verde, despliegue Cloudflare y auditoría completa; fallos históricos MIDAS y 502 se mantienen independientes.

---

## ORGANIZADOR 18 · Despensa con miniaturas canónicas (14/10/2026)

- Incidencia: las tarjetas del inventario omitían imágenes aunque `/api/pantry.items[].imageUrl` ya contiene `Productos.imagen_url`. Verificado el Sheet privado canónico: **160 filas de inventario y 104 con imagen HTTPS asociada**, 56 sin imagen a esta revisión; estas cifras son una instantánea, no deben hardcodearse.
- Solución en `app/pantry.js` y `app/styles.css`: miniatura por ID canónico junto al nombre, lazy + no-referrer + `object-fit:contain`, marcador `Sin foto` cuando no exista URL o falle la carga, contención responsive; se mantienen intactos precio, stock, filtros, navegación y detalle.
- Nuevo test unitario `app/pantry-thumbnails.test.mjs` y gate de Chromium en `private-cloudflare/scripts/web-audit.mjs` con recuentos entre API y DOM y comprobación de carga de una foto visible. No exponer datos privados ni meter fotografía de usuario en Git; completar las 56 imágenes restantes exclusivamente en `Productos.imagen_url` tras verificar correspondencia exacta, nunca por fuzzy match.
- **Publicación verificada:** PR [#483](https://github.com/mamg97/segundo-cerebro/pull/483) fusionada en `ec2b8432086dc6d9de5cded8a8312941dad03c4f`; CI [#676](https://github.com/mamg97/segundo-cerebro/actions/runs/38618329898) `success` y deploy privado [#529](https://github.com/mamg97/segundo-cerebro/actions/runs/38618484605) `success`. Auditoría postdeploy [#422](https://github.com/mamg97/segundo-cerebro/actions/runs/38618977087) **1221 checks / 1 fallo ajeno (MIDAS CHECK-00029)**: miniaturas de Despensa y muestra con carga real pasan; sin 502/overflow de miniaturas. Anterior #421 = 1220/3, por MIDAS, fallo visual derivado de 502 de Objetos y seis excepciones `AUDIT_GATEWAY_WORKER_RESOURCE_LIMIT`; el diagnóstico intermitente de Objetos no queda cerrado causalmente.
- **Demo pública independiente:** `Deploy mock demo to GitHub Pages #777` falló al resolver metadatos del artefacto tras upload correcto; un intento de repetir el job encontró dos artefactos con el mismo nombre. No relanzar ese job repetidamente; la app privada #529 está publicada. Continuar con nuevo run independiente del workflow público solo si realmente fuera necesario (demo sin datos reales). MIDAS y 502 siguen siendo gates globales independientes, sin rebajar tests.

---

## ORGANIZADOR 18 · Auditoría #412 y estado productivo #419 (14/10/2026)

- **Verificado en GitHub:** `main=ec21566dfc5d01b8e5b5dc3fbf12dc3afff58b9d` tras PR #481, desplegado en Cloudflare [#528](https://github.com/mamg97/segundo-cerebro/actions/runs/38602161758) (`success`). La #472 está cerrada sin merge porque fue sustituida por #476; **no reabrir ni duplicar** la caché JWKS.
- **Auditoría Chromium #412** [run](https://github.com/mamg97/segundo-cerebro/actions/runs/38518572776): `1216 checks / 1 fallo`, geometría de Patrimonio móvil en el commit #475. La #476 [PR](https://github.com/mamg97/segundo-cerebro/pull/476) integró contención adicional del diario/Delta y caché limitada de **claves públicas** JWKS, manteniendo verificación independiente de firma y claims por petición, rotación y `fail closed`. CI #671 y deploy privado #526 correctos.
- **Auditorías completas recientes de producción:** [#417](https://github.com/mamg97/segundo-cerebro/actions/runs/38575012297) `1218/1`, [#418](https://github.com/mamg97/segundo-cerebro/actions/runs/38576939471) `1218/1`, [#419](https://github.com/mamg97/segundo-cerebro/actions/runs/38602319504) `1216/1`. Único fallo de las tres: `MIDAS CHECK-00029`. Chromium ejecutó de verdad la verificación de Patrimonio a 320/390/440 px sin nuevos fallos de overflow; `NUTRITION_PARITY lightOnly=0 fullOnly=0`; `HABITQUEST_SMOKE PASS`; sin `FINANCE_WORKSPACE_REMOVED`, `AUDIT_NETWORK_DIAG`, `AUDIT_BACKEND_DIAG` ni nuevos 502 detectados en esos runs. No equivale a validación en un iPhone físico.
- **MIDAS Classic es el bloqueo real:** workflows `schedule` #6 y [#7](https://github.com/mamg97/midas-paper-lab/actions/runs/38530462089) fallaron por barras OHLC de sesión obligatorias ausentes tras errores Yahoo. [midas-paper-lab PR #49](https://github.com/mamg97/midas-paper-lab/pull/49) fusionada en `14a187996897dea9157c464e5303d15ebdcda04c` recupera individualmente solo las cotizaciones obligatorias, sin inventar precios/forward-fill ni modificar ledger; CI #8 verde, pero **no ejecutó escritura de diario** (paso `skipped`). Aún no existe `schedule` de Classic posterior al merge. Conservar el fallo MIDAS hasta que esa ejecución genuina produzca evidencia válida.
- **Scheduler:** cron principal `:17` y respaldo `:42` presentes, con ejecuciones `schedule` #417/#418, pero con retrasos/huecos: GitHub Actions no garantiza emisión horaria estricta. Supervisor externo horario `AUDITOR - SEGUNDO CEREBRO` habilitado a `:45`; no duplicarlo. Última auditoría globalmente verde observada: #411. Requerir de nuevo dos auditorías **completas e independientes** `0 fallos / 0 5xx` sobre Worker vigente, tras la siguiente ejecución MIDAS Classic realmente programada y correcta.
- **Service Binding 502:** histórico #413 (16 imágenes) y #415 (2 imágenes) con `AUDIT_GATEWAY_BINDING_FETCH_FAILED`; no ha reaparecido en #417–#419, pero **no está demostrada su causa raíz**. La caché JWKS y la contención de carga no constituyen prueba de reparación del Worker. Si reaparece, obtener métricas Cloudflare Worker/D1 reales antes de modificar backend.
- **Decisión operativa:** no se detecta una nueva regresión de interfaz/backend que justifique otro cambio de código ahora. No modificar el gate de MIDAS ni usar ejecución manual o CI como sustituto de `schedule`. Sin cambios en Sheets, D1, credenciales ni datos reales; coste recurrente añadido cero.

---

## GESTOR GYM · Hiperextensiones en banco a 45° · GIF 16/17 (2026-10-14)

- Nueva ilustración `hiperextensiones-banco-45-v2-white.gif`: 360×480, 16 fotogramas completos a 7 cs, fondo blanco y póster reducido-movimiento. Fuente, prompt, contacto de revisión y parámetros en `design/gym-animations/`. La interpolación directa sobre blanco evita el borde oscuro de alpha observado en la prueba inicial.
- La etiqueta existente `Hip thrust 45°` se confirmó como bajar/levantar el tronco en banco de hiperextensiones inclinado. Se conserva el nombre canónico y se aclara la variante en el detalle; no se asigna a fichas públicas wger de hip thrust. El mismo GIF sirve a Mi plan, referencia de plan pausado, Biblioteca y detalles. Sin cambios en cargas, sesiones, Sheets o D1.
- Queda **curl femoral sentado**, variante ya confirmada: no volver a preguntar ni generar curl tumbado. Los 16 GIF solo se consideran publicados tras CI, despliegue y comprobación de la versión servida; el estado global de auditoría mantiene sus incidencias independientes.

## ORGANIZADOR · Seguimiento #417–#418 y cierre visual de Patrimonio móvil (14/10/2026)

- **Estado comprobado:** código productivo de Cloudflare en [deploy #527](https://github.com/mamg97/segundo-cerebro/actions/runs/38549491665) `success`, SHA `192ec2f72de08bbe7c0931af9d7d114c19786beb`. El `main` posterior solo añadió documentación en #479; no confundir su SHA con un nuevo deploy privado.
- **Auditorías reales e independientes sobre versión vigente:** [#417](https://github.com/mamg97/segundo-cerebro/actions/runs/38575012297) = **1.218 checks / 1 fallo**, [#418](https://github.com/mamg97/segundo-cerebro/actions/runs/38576939471) = **1.218 checks / 1 fallo**. Chromium ejecutó el recorrido íntegro; en ambas el único fallo fue `MIDAS CHECK-00029`. Sin `AUDIT_NETWORK_DIAG` o `AUDIT_BACKEND_DIAG` de 502, con `peak_image_reads=1` y sin fallos visuales de Patrimonio. Las pruebas reales a 320/390/440px de «Ver evolución» añadidas en #475, y ampliadas en #476 para diario y tablas Delta, quedaron verdes: **incidencia concreta de clipping móvil cerrada para esa versión**. No afirmar que el usuario haya confirmado todavía en su dispositivo físico.
- **Causa única del rojo actual:** `MIDAS classic S&P500 503 paper` tuvo dos ejecuciones `schedule` erróneas, [#6](https://github.com/mamg97/midas-paper-lab/actions/runs/38499710511) y [#7](https://github.com/mamg97/midas-paper-lab/actions/runs/38530462089), al faltar una barra OHLC fechada para una posición/orden obligatoria tras errores de Yahoo en descarga masiva. La PR [midas-paper-lab#49](https://github.com/mamg97/midas-paper-lab/pull/49) corrigió el código con descarga individual limitada a cotizaciones obligatorias, sin inventar precios y manteniendo validación de misma sesión; CI Classic [#8](https://github.com/mamg97/midas-paper-lab/actions/runs/38542128230) `success`. **Todavía no hay `schedule` posterior ejecutado en la rama `main=14a187996897dea9157c464e5303d15ebdcda04c`.** No falsear el gate, retirar `CHECK-00029` ni tomar una CI / `workflow_dispatch` como sustituto.
- **Pendiente externo a interfaz:** observar el siguiente ciclo programado genuino de MIDAS Classic. Si vuelve a fallar, investigar `classic_sp500/run.py`, señales de Yahoo y cotizaciones de posiciones obligatorias, sin relajar la invariante de sesión ni modificar ledgers manualmente. Si da éxito, obtener dos auditorías Chromium completas con 0 fallos/0 HTTP 5xx. El histórico de 502 intermitentes no se puede declarar imposible solo porque #417 y #418 hayan tenido cero.
- Privacidad estricta: sin cifras financieras, datos personales ni registros de posiciones en Git; cero costes recurrentes nuevos.

---

## ORGANIZADOR · Postdeploy #527, auditoría #416 (14/10/2026)

- **Publicado:** PR #478 fusionada como `192ec2f72de08bbe7c0931af9d7d114c19786beb`; CI [#674](https://github.com/mamg97/segundo-cerebro/actions/runs/38549366342) `success`; despliegue privado [#527](https://github.com/mamg97/segundo-cerebro/actions/runs/38549491665) `success`.
- **Auditoría real [#416](https://github.com/mamg97/segundo-cerebro/actions/runs/38549609000):** 1.217 controles, **1 fallo** (`MIDAS CHECK-00029`). `[AUDIT_MEDIA_CACHE] ... peak_image_reads=1`, **sin** `[AUDIT_NETWORK_DIAG]` ni `[AUDIT_BACKEND_DIAG]` ni 502 en esta ejecución. Comparación #415: 1.217/2, 2 imágenes 502 y MIDAS. El 502 intermitente **NO** se declara resuelto con un único cero; mantener el gate 5xx estricto.
- **MIDAS pendiente:** `MIDAS classic S&P500 503 paper` schedule #7 (14/10 07:45 UTC) terminó en error de barras obligatorias ausentes. PR `mamg97/midas-paper-lab#49` fusionada y CI Classic #8 verde con test de reintento por ticker, pero el workflow todavía no tiene una ejecución **schedule posterior** con corrección. No alteramos su calendario, diario, cifras ni la política de verificación; mantener rojo hasta ejecución real verde.
- **Siguientes pruebas exigidas:** siguiente cron MIDAS exitoso y dos auditorías Chromium completas independientes con cero fallos/cero 502 sobre Worker vigente. Si regresan errores de Service Binding, consultar el nuevo código seguro clasificado `AUDIT_GATEWAY_WORKER_RESOURCE_LIMIT`, `AUDIT_GATEWAY_SUBREQUEST_LIMIT`, `AUDIT_GATEWAY_BINDING_TIMEOUT` o `AUDIT_GATEWAY_BINDING_FETCH_FAILED` y métricas reales Cloudflare antes de modificar D1.
- Sin escrituras en Sheets, D1, imágenes, secretos ni posiciones; coste recurrente cero.

---

## ORGANIZADOR · Auditorías 412–415: contención experimental de carga y diagnóstico 502 (14/10/2026)

- Auditorías Chromium #412 (1216/1), #413 (1216/2), #414 (1217/2) y #415 (1217/2) siguen rojas. El overflow móvil de Patrimonio dejó de fallar en #415 tras PR #476 y despliegue #526; no editar más CSS sin nueva prueba.
- MIDAS CHECK-00029 en #414/#415: corresponde al workflow **MIDAS classic S&P500 503 paper** cuyo schedule #7 (38530462089, 14/10 07:45 UTC) terminó en error de barras fechadas obligatorias. En `mamg97/midas-paper-lab` PR #49 (commit `14a1879`) reparó la lectura individual de barras faltantes; la CI de PR #8 fue verde, pero aún **no** hay ejecución real de schedule con el nuevo código. Conservar FAIL hasta que el próximo ciclo programado sea realmente correcto; no sustituirlo por pruebas.
- Imágenes: en #413 16 HTTP 502 y en #415 2 HTTP 502, todos `AUDIT_GATEWAY_BINDING_FETCH_FAILED`, producidos al lanzar `env.SEGUNDO_CEREBRO.fetch` y no al encapsular el Response. No se demuestra la causa interna del Worker ni D1 sin métricas Cloudflare.
- Experimento en PR de auditoría: pasar a **una única lectura fría simultánea** de imagen inmutable durante Chromium, manteniendo la lectura de cada URL distinta, el límite individual de 25 s, el fail estricto de cualquier HTTP 5xx y el cache inmutable solo tras HTTP 200. Esto reduce carga artificial del auditor, pero no altera navegador real ni prueba resuelta la avería productiva.
- Gateway: clasificación allowlist de excepciones Service Binding por error compatible con límites de recursos, subrequests o timeout; en los demás casos conservar `AUDIT_GATEWAY_BINDING_FETCH_FAILED`. Ningún error bruto ni identificador sale al log. Si vuelve a fallar sin pista adicional, consultar Worker/D1 Analytics antes de tocar ruta privada o integridad de fotos.
- Cierre: requieren CI, deploy y **dos auditorías independientes completas sin fallo ni 5xx**; si MIDAS mantiene ventana programada roja, mantener estado global rojo.

---

## ORGANIZADOR · Postdeploy #526 / Chromium #415 (14/10/2026)

- Fixes productivos sobre `d13be57e2286fcd7aa8872ffe89dc753407c7c49`: PR #476 CI #671 `success`, Cloudflare #526 `success`. Cache JWKS públicas con verificación criptográfica JWT por petición, más contención de tablas Delta y diario dentro de modal Patrimonio en iPhone.
- Auditoría #415 (run 38543015918) real Chromium `1217` controles / `2` fallos, **roja**: `MIDAS CHECK-00029` y `INFRA CHECK-01216`. La prueba móvil que falló en #412–414 ya no falla en #415 (sin `[AUDIT_WEALTH_GEOMETRY]`, con comprobaciones visuales en verde).
- Infraestructura: 2 imágenes privadas siguieron devolviendo 502 `OBJECTS_IMAGE_AUDIT_GATEWAY_BINDING_FETCH_FAILED`, comparado con 16 en #413. El origen aguas arriba del Service Binding sigue **abierto**, y una bajada de frecuencia no demuestra solución. No es correcto desactivar el gate ni reintentar para pintar verde; se requieren métricas de Worker/D1 para causa raíz.
- MIDAS: `mamg97/midas-paper-lab` PR #49 fusionada a `14a187996897dea9157c464e5303d15ebdcda04c`, y la CI de Classic #8 pasó. Solo reintenta cotización exacta de posiciones/órdenes pendientes tras descarga masiva parcial sin ffill ni operaciones ficticias. El último cron Classic #7 todavía fue rojo; el control MIDAS del auditor debe permanecer rojo hasta ejecución real de la siguiente ventana correctamente resuelta.
- PR #472 cerrada por quedar superada por #476. No hay otras modificaciones pendientes de código relacionadas con este incidente en esa rama.

---

## ORGANIZADOR · Auditorías 412–414 + MIDAS Classic (14/10/2026)

- Producción `d8eaf299`: audit #412 `1216/1` por control de Patrimonio móvil; audit #413 `1216/2`, de los que 16 imágenes devuelven HTTP 502 con `AUDIT_GATEWAY_BINDING_FETCH_FAILED`; audit #414 `1217/2`, con control de MIDAS fallido y otro de la geometría financiera. El auditor sigue estricto, no se marcan verdes los 5xx ni las ausencias de precio.
- MIDAS `mamg97/midas-paper-lab`: schedule Classic #6 y #7 falla al faltar OHLC del mismo día en posiciones/órdenes; PR #49 del laboratorio recupera mediante una lectura individual solo esos tickers, manteniendo la obligación de barra exacta. Weekly ML #18 tuvo fallo puntual en precio ADI; #19 verde. La política del gate MIDAS refleja la última ventana realmente ejecutada; no falsificar su estado por una PR aprobada.
- En esta rama Segundo Cerebro se recupera el refactor OIDC que permanecía sin fusionar en PR #472: claves **públicas** JWKS en caché corta por isolate, sin cachear JWT, claims ni respuestas privadas. Verificación de firma RSA por cada petición, refresh al rotar claves, fail-closed. La reducción de subrequests no prueba la causa de Service Binding 502: para ello siguen siendo necesarias las métricas del Worker.
- Patrimonio móvil: se contienen grids internos y scrollers de Delta/diario. Audit Chromium agrega diagnóstico de geometría `FIT/OVERFLOW` por 320/390/440 px solo si falla, sin imprimir datos privados.
- Validación pendiente al abrir PR: CI, merge, deploy Cloudflare y 2 auditorías Chromium completas sobre el commit desplegado. El fallo original de 502 se considera intermitente y **abierto** si vuelve a aparecer; no relajar el control infra.

---

## ORGANIZADOR · Patrimonio móvil, «Ver evolución» (14/10/2026)

- Captura iPhone: el modal de `Patrimonio financiero` crece fuera del viewport y corta las tarjetas, notas y conciliación. Los datos de Finanzas permanecen en sus fuentes privadas; no modificar importes.
- Causa de maquetación: `.wealth-detail` y la sección de distribución usan CSS Grid con ancho mínimo implícito; textos de notas y gráficos pueden imponer el min-content de escritorio. La media query de una columna a 720px no limita esos tamaños intrínsecos.
- Cambio en `app/styles.css`: `min-width:0`/ `max-width:100%` en la cadena de contenedores y tarjetas, columnas `minmax(0,1fr)`, notas con `overflow-wrap:anywhere`, modal `100vw - 16px`, tipografía legible, con scroll horizontal interno exclusivo de gráficas.
- Auditoría preventiva añadida en `private-cloudflare/scripts/web-audit.mjs`: abre el modal real desde Home y comprueba anchuras, rectángulos de texto, barra y conciliación a 320/390/440px; snapshot completo a 390px. Los logs solo publican booleanos y contadores, nunca saldos ni contenido privado.
- Pendiente de certificar: CI verde, merge, deploy privado Cloudflare y Chromium postdeploy `AUDIT_OK`. Evitar afirmar reparación publicada hasta comprobarlo.

---

## NUTRI · Enlaces canónicos del menú semanal (13/10/2026)

- **Incidencia:** filas con plato seleccionado pero sin `recipe_id` no podían abrir su ficha. En lectura ligera, filas con ID ocultaban el enlace si el objeto de receta no se había hidratado; el clic sobre una ficha ausente terminaba silenciosamente.
- **Fuente corregida:** normalizar únicamente el Sheet privado de Salud (`MenuSemanal`, `Recetas`, `IngredientesReceta`). Se añadieron 14 recetas documentadas como planificadas/provisionales salvo el consumo ya confirmado; acompañantes legados tipados y dos meriendas fruta+yogur separadas. **Kcal, proteína, HC y grasas idénticas por fecha antes/después**; sin inventar consumos ni comidas externas pendientes.
- **Frontend:** en Salud→Menú, el ID habilita título y acción de detalle aun en fallback ligero; al pulsar se reutiliza receta en memoria o se carga bajo demanda solo la semana seleccionada. Se ofrece error visible, reintento y vuelta a la misma semana. Home conserva apertura on-demand y restaura control tras completar clic.
- **Auditoría:** cotejar IDs enlazados con API (no solo contar botones), probar navegación exacta y retorno. No registrar alimentos ni datos privados en CI. Ausencia legítima de receta cuando falta elegir una comida no equivale a enlace roto.
- **Resultado en producción (commit `5781dbde`):** PR #473 fusionada y [despliegue Cloudflare](https://github.com/mamg97/segundo-cerebro/actions/runs/38467765851) completado. En [auditoría Chromium #38468158824, intento 2](https://github.com/mamg97/segundo-cerebro/actions/runs/38468158824), todas las comprobaciones funcionales de Menú/Recetas (enlaces por ID, navegación exacta y vuelta) pasaron; las API ligera/completa devolvieron 52 filas y `lightOnly=0`, `fullOnly=0`. **La auditoría global NO fue verde:** 1193 controles, 1 fallo ajeno a Nutrición (`OBJECTS_IMAGE_AUDIT_GATEWAY_BINDING_FETCH_FAILED`, 35 errores de Service Binding). El intento 1 había fallado al iniciar Chromium por `EXEC_NETWORK`. Solo verificada semana 12–18; la del 19 se debe auditar separadamente. Las 14 fichas nuevas contienen ingredientes provisionales, sin inventar preparación.

---

## GESTOR NUTRI 4 · Conciliación de menú hasta producción (13/10/2026)

- **Fuente y alcance:** lectura en vivo de `SEGUNDO CEREBRO - SALUD / MenuSemanal`, columnas A:R y valores efectivos de celdas. Para la semana vigente se verificó que los macros poblados son números reales, que un día completo tiene todas sus filas tipadas y que las comidas fuera por decidir mantienen los cuatro macros nulos. No se escribió ninguna ingesta ni se modificaron planes para cerrar cifras.
- **Versiones y evidencia:** `main` `a9a595a9`, [deploy de Cloudflare](https://github.com/mamg97/segundo-cerebro/actions/runs/38454858446) satisfactorio; [auditoría autenticada 1](https://github.com/mamg97/segundo-cerebro/actions/runs/38454988710) = 1190/0 y [auditoría autenticada 2](https://github.com/mamg97/segundo-cerebro/actions/runs/38455601959) = 1191/0. Ambas ejecutaron Chromium real, lectura de `/api/nutrition/menu` (ligera), `/api/nutrition?refresh=1` (completa) y comparación de 50 filas: `lightOnly=0`, `fullOnly=0`. La segunda validó títulos por fila y totales redondeados de kcal/proteína en el DOM frente a la API directa de Sheets. No es mera comprobación de CI.
- **Incidente previo:** la diferencia histórica de una fila de acompañante coincidía exactamente con sus macros. Actualmente su celda tiene `numberValue` numérico y aparece en la semana auditada. La evidencia de reparación combina tipado del Sheet con los cambios de frontend contra snapshots obsoletos (`29f256fc`, `f0adfb44`); **no existe snapshot HTTP/celda previo que permita atribuir en exclusiva cuál de ambos mecanismos eliminó aquella fila**. No duplicar acompañantes ni alterar consumos.
- **Deuda de datos separada:** parte del plan prospectivo continúa en filas legadas sin Q `tipo_item`, R `tipo_acompanante` y/o `recipe_id`. El contrato deja esas tomas como `legacy`; no equivale a validación estructural. Reconciliar solo con recetas y cantidades documentadas en el recetario privado; no inventar recetas ni forzar marca `consumido`. La fecha inmediatamente posterior al domingo de la semana auditada abre **otra semana**, por lo que no quedó verificada por esas dos ejecuciones.
- **Verificación POST-MERGE completa (13/10/2026):** la ampliación de diagnóstico quedó fusionada mediante [PR #469](https://github.com/mamg97/segundo-cerebro/pull/469) en `main=1094928f`. [Despliegue privado #38460685923](https://github.com/mamg97/segundo-cerebro/actions/runs/38460685923) correcto; [auditoría Chromium autenticada #38460818421](https://github.com/mamg97/segundo-cerebro/actions/runs/38460818421) finalizada con `1190 checks / 0 failures / AUDIT_OK`. Las respuestas ligera y completa contaron 50 filas, con `lightOnly=0` y `fullOnly=0` tras comparar cuatro macros, estado y Q/R. Chromium verificó la igualdad entre los títulos diarios visibles y la API del menú. Estos resultados acreditan la cadena de la semana 12–18, no migran recetas legadas ni cubren el 19/10.
- **Siguiente paso:** completar vinculación canónica de filas legadas de planificación sin alterar platos del usuario; para cualquier futura discrepancia, verificar Sheets (tipos, filas, estados) → API ligera/completa → DOM autenticado y registrar únicamente recuentos/diferencias anónimos en GitHub.

---

## ORGANIZADOR 17 · Dos Chromium verdes y diagnóstico acotado de 502 (13/10/2026)

- **Última versión comprobada sin cambios de gateway:** `main=a9a595a9`, deploy privado [#521](https://github.com/mamg97/segundo-cerebro/actions/runs/38454858446) completado. Auditoría Chromium post-deploy [#403](https://github.com/mamg97/segundo-cerebro/actions/runs/38454988710): **1.190 checks / 0 fallos**, [#404](https://github.com/mamg97/segundo-cerebro/actions/runs/38455601959) disparada por `schedule` sobre el mismo SHA: **1.191 checks / 0 fallos**. Ambas ejecutaron `Navigate and audit production`, emitieron `AUDIT_OK` y `peak_image_reads=2`; no eran heartbeat con navegador omitido. Estas dos pasadas validan la versión `a9a595a9`; no prueban ausencia permanente de 502 intermitentes.
- **Incidencias previas:** [#401](https://github.com/mamg97/segundo-cerebro/actions/runs/38450063571) = 1.191/1 (dos respuestas de imagen HTTP 502 tipificadas `OBJECTS_IMAGE_AUDIT_GATEWAY_UPSTREAM_FAILED`); [#402](https://github.com/mamg97/segundo-cerebro/actions/runs/38453676236) = 1.157/4 (cuatro controles `OBJECTS CHECK-00393..396`), sin prueba de causa raíz; controles de Objetos pasan en #403/#404. No confundir fallo intermitente de binding con cuota D1 ni declarar su resolución causal.
- **Defecto diagnosticado, PR [#467](https://github.com/mamg97/segundo-cerebro/pull/467):** `web-audit-gateway.js` capturaba tanto una excepción en `env.SEGUNDO_CEREBRO.fetch` como una al construir `secureProxyResponse` en un `catch` indiferenciado. El cambio separa las fases en `AUDIT_GATEWAY_BINDING_FETCH_FAILED` y `AUDIT_GATEWAY_RESPONSE_FAILED` mediante campo `diagnostic` de vocabulario cerrado; mantiene `code=AUDIT_GATEWAY_UPSTREAM_FAILED` y HTTP 502, sin reintentar, ocultar errores, incluir URLs, activos, datos privados o excepciones. El agregador Chromium permite únicamente ambos códigos; tests cubren 200/404/502 de upstream, throws, `no-store` y privacidad.
- **Estado post-merge #467:** PR #467 fusionada como `e6f50a7c`; CI [#658](https://github.com/mamg97/segundo-cerebro/actions/runs/38459716772) y [#659](https://github.com/mamg97/segundo-cerebro/actions/runs/38459846644) verdes. [Deploy privado #522](https://github.com/mamg97/segundo-cerebro/actions/runs/38459989298) correcto, incluida publicación del gateway. [Auditoría #405](https://github.com/mamg97/segundo-cerebro/actions/runs/38460128609): **1.190 checks / 1 fallo INFRA**. Los diagnósticos distinguen **31 `OBJECTS_IMAGE_AUDIT_GATEWAY_BINDING_FETCH_FAILED`**, más **5 `FINANCE_API_HTTP_502`** y **1 `HEALTH_HISTORY_HTTP_502`**; no se atribuye causalidad concreta a CPU, memoria, conexiones, D1 ni cuota sin métricas Cloudflare. El resultado prueba que la incidencia NO está definitivamente corregida.
- **Comprobación siguiente:** una PR independiente de Nutrición integró la ampliación del auditor y se desplegó en [#523](https://github.com/mamg97/segundo-cerebro/actions/runs/38460685923), sobre `main=1094928f`. La auditoría [#406](https://github.com/mamg97/segundo-cerebro/actions/runs/38460818421) = **1.190 checks / 0 fallos / AUDIT_OK**, Chromium real, MIDAS 00024/00027 verdes y sin diagnósticos 5xx. El posterior commit `6477926e` de #470 cambia solo documentación, no Worker. Sigue faltando **otra auditoría completa independiente, verde, sobre la versión vigente**, y telemetría de invocaciones Cloudflare (`exceededCpu`, `exceededMemory`, errores de binding y consumo D1) para cerrar causalidad. No ocultar fallos ni degradar controles para conseguir verde.

---

## ORGANIZADOR 17 · Lecturas D1 Salud y auditorías #394–#397 (2026-10-13)

- **Versión de código más reciente al documentar:** `main` = `12cab63d` (PR #462 Finanzas) e incluye `22ff949e` (PR #460) y `0a738427` (PR #458). [Deploy privado #517](https://github.com/mamg97/segundo-cerebro/actions/runs/38446246026) **completado correctamente**, incluido gateway; despliegue anterior #516 **cancelado por concurrencia** y no válido como gate de publicación. [PR #460](https://github.com/mamg97/segundo-cerebro/pull/460) fusionada; CI [#647](https://github.com/mamg97/segundo-cerebro/actions/runs/38444695582) verde. [Deploy privado #515](https://github.com/mamg97/segundo-cerebro/actions/runs/38445004105) terminó con éxito: migración D1 `0010_health_readonly_schema.sql` y publicación de Worker principal y auxiliares. [Auditoría #397](https://github.com/mamg97/segundo-cerebro/actions/runs/38445125399) postdeploy completada con **1.189 checks / 1 fallo**: siete imágenes HTTP 502 con diagnóstico upstream del gateway. El despliegue D1 fue válido, pero la auditoría de red NO.
- **D1/Salud:** `fetchHealthEnergyRows()` ejecutaba `ensureHealthEnergyTable()` en un GET: seis `PRAGMA table_info`, DDL y `DELETE FROM health_energy_daily WHERE EXISTS(...)` de deduplicación en cada lectura. Los GET de body y recovery también emitían DDL. #460 retira las llamadas `ensure...` **solo de esos tres lectores**, manteniendo SELECT acotado por fecha. Nueva migración non-destructiva para body/energy; si hubiera duplicados preexistentes, la creación del índice único falla sin eliminarlos. Las rutas de sincronización/escritura existentes siguen vigentes: no afirmar que todo `/api/health` sea globalmente read-only.
- **Auditorías:** [#394](https://github.com/mamg97/segundo-cerebro/actions/runs/38442273843) = 1.189 checks / 1 fallo (44 respuestas HTTP 502 de imágenes privadas `AUDIT_GATEWAY_UPSTREAM_FAILED`); [#395](https://github.com/mamg97/segundo-cerebro/actions/runs/38443308090) = 1.189 / 0 sobre deploy #513; [#396](https://github.com/mamg97/segundo-cerebro/actions/runs/38444261748) = 1.189 / 0 sobre deploy #514. #395/#396 son dos Chromium completos independientes con 0 HTTP 5xx y `MIDAS CHECK-00024/00027` verdes. Tras esos éxitos, #397 volvió a registrar siete 502 con pico 3. Intermitencia y origen exacto aún sin cerrar.
- **CSS/diagnóstico:** [PR #456](https://github.com/mamg97/segundo-cerebro/pull/456) y [PR #457](https://github.com/mamg97/segundo-cerebro/pull/457) publicadas; clasificador de solapes reconoce las clases con tag `div.<clase>` emitidas por Chromium, sin información privada ni suavizar controles. [PR #458](https://github.com/mamg97/segundo-cerebro/pull/458), inicialmente cerrada tras #395/#396, se reabrió al reproducirse 502 en #397. Fusionada en `main` como `0a738427`, CI #650 correcto; limita a **2 lecturas frías simultáneas únicamente en Chromium auditor**, sin alterar navegador real ni ocultar 5xx. [Deploy #516](https://github.com/mamg97/segundo-cerebro/actions/runs/38446133529) quedó cancelado al integrarse otra PR; [deploy #517](https://github.com/mamg97/segundo-cerebro/actions/runs/38446246026) completó todos los pasos. [Auditoría #398](https://github.com/mamg97/segundo-cerebro/actions/runs/38446271054) **skipped** por la cancelación, nunca verde; [#399](https://github.com/mamg97/segundo-cerebro/actions/runs/38446399673) post-deploy inició/encoló auditoría real y es el primer gate útil para medir el nuevo límite.
- **D1 quota:** el aviso comunicado de ~3,75 millones / 5 millones de filas examinadas requiere validar `meta.rows_read` o métricas D1. #453 acota `gym_entries`; #460 evita una deduplicación posiblemente costosa en cada lectura de Salud, pero **su contribución real a la cuota no está cuantificada**. No confundir fallo Service Binding HTTP 502 con exceso de D1 sin telemetría.
- **Scheduler:** [#392](https://github.com/mamg97/segundo-cerebro/actions/runs/38440333178) fue `schedule` real, aunque Chromium falló; supervisor ChatGPT horario :45 Europe/Madrid ya existe, sin duplicarlo. Último criterio de cierre: tras #517 con #458 y #462, confirmar dos auditorías Chromium completas e independientes con 0 fallos, 0 HTTP 5xx, datos y privacidad correctos. No contar #395/#396 (límite antiguo), #398 (skipped) ni #516 (cancelado) como validación de la nueva versión.

---

## ORGANIZADOR 17 · Fallos visuales/Salud posteriores a #510 (2026-10-13)

- [Auditoría #390](https://github.com/mamg97/segundo-cerebro/actions/runs/38439160960): Chromium completo, **1187 checks / 7 fallos** `VISUAL_OVERLAPS` reproducidos en la navegación de Finanzas. MIDAS `CHECK-00027` correcto. El ensayo empezó con versión #509 y coincidió con el despliegue posterior #510; no atribuir a ese despliegue el defecto.
- [Auditoría #391](https://github.com/mamg97/segundo-cerebro/actions/runs/38439621024): Chromium completo sobre código desplegado en [#510](https://github.com/mamg97/segundo-cerebro/actions/runs/38439487758) (D1 migración 0009 aplicada, despliegue completo): **1187 checks / 4 fallos**, uno `VISUAL_OVERLAPS` en Finanzas y tres comprobaciones funcionales de Salud (`HEALTH CHECK-00589/00638/00671`). MIDAS `CHECK-00027` correcto. No hubo evidencia HTTP 5xx en ese recorrido.
- `VISUAL_OVERLAPS` se repite en dos auditorías; el runner anonimiza correctamente el nombre del elemento que colisiona. [PR #456](https://github.com/mamg97/segundo-cerebro/pull/456) añade diagnóstico **solo por categorías CSS permitidas** y códigos contados, sin revelar nodos, texto, cuentas ni URLs; los solapes seguirán provocando FAIL. No inventar causa ni modificar CSS de Finanzas/Salud hasta reproducir el elemento exacto.
- La publicación de #453 reduce SQL de lectura Gym: el historial muestra 40 sesiones y ahora limita las entradas devueltas a esas sesiones, sin DDL en GET. El esquema e índice D1 migraron correctamente durante #510. Efecto cuantitativo sobre la cuota diaria **no medido**.
- **Cierre integral NO autorizado:** #390 y #391 han fallado. Exigir dos auditorías posteriores, completas e independientes sobre los despliegues vigentes con **0 funcionales y 0 HTTP 5xx** y validación de datos/privacidad. Financieros sin `FINANCE_WORKSPACE_REMOVED`, aunque su geometría aún presenta un solape intermitente.

---

## ORGANIZADOR 17 · Eficiencia D1 de Gym (PR #453, 2026-10-13)

- Defecto confirmado en `private-cloudflare/src/index.js::fetchGymHistory`: el GET utilizaba `LIMIT 40` para sesiones, pero leía **todas** las filas de `gym_entries` mediante `ORDER BY id ASC`, descartando después entradas que no pertenecían a las 40 sesiones recuperadas. También ejecutaba cuatro operaciones de preparación de esquema D1 desde cada GET.
- Corrección técnica en [PR #453](https://github.com/mamg97/segundo-cerebro/pull/453): obtener `sessionIds` de esas 40 sesiones, usar `WHERE session_id IN (...)` con parámetros enlazados, no leer ninguna entrada si no hay sesiones; la progresión seguirá derivándose únicamente de las sesiones devueltas como antes. Migración idempotente `0009_gym_history_read.sql` para las tablas existentes e índice nuevo `gym_entries(session_id,id)`; la lectura ya no crea tablas/índices. Las escrituras conservan la ruta antigua hasta una revisión separada.
- Tests sintéticos comprueban preservación de orden, progresión, exclusión de filas antiguas, caso vacío y ausencia de DDL en GET. **CI, aplicación efectiva de la migración, despliegue y auditoría posterior son requisitos para declarar el cambio productivo**.
- La optimización reduce trabajo D1 **por consulta Gym**, pero no demuestra causalidad respecto a la alerta global de 3,75 M/5 M filas diarias ni al transporte `502`. No cambia registros privados, cargas, saldos ni contratos del Gym.

---

## Nutrición · contrato de receta principal + acompañantes (13/10/2026)

- Cambio **estructural**, no sustitución de platos por código: `MenuSemanal` columnas Q `tipo_item` y R `tipo_acompanante` para todas las nuevas entradas. Cada toma tiene **0–1 receta principal**, referenciada por `recipe_id`; los acompañantes son solo `yogur | fruta | batido` y usan `food_id` (o receta secundaria cuando es batido casero tipado).
- **Desayuno/comida/cena requieren exactamente una receta**. **Media mañana/merienda pueden contener únicamente acompañantes y ninguna receta**; no fabricar recetas de relleno. Como máximo un yogur de postre después de comida o cena; yogures entre horas se llaman yogures.
- Validador puro y pruebas en `private-cloudflare/src/menu-selection-contract.*`; Worker lee Q:R y proyecta `mealStructureStatus/Issues`. La web solo advierte de tomas tipadas inválidas; el legado sin Q:R y todo consumo histórico se preservan.
- El gestor planificador debe validar cada nuevo día completo y la suma de macros desde el Sheet, y mantener incógnitas de restaurantes como pendientes. No publicar en Git nombres reales ni valores privados.
- Validación pendiente de CI/despliegue durante desarrollo; consultar el último run y la PR antes de considerar cerrada la implantación.

## ORGANIZADOR 17 · MIDAS, Finanzas y cobertura de auditoría (2026-10-13)

**Estado canónico de relevo:** `main` integró el cambio visual MIDAS de [PR #441](https://github.com/mamg97/segundo-cerebro/pull/441) (`933e4c38`): `.midas-workspace-tabs` ya no es sticky. El CI #616 fue correcto; la corrección llegó a producción. [PR #451](https://github.com/mamg97/segundo-cerebro/pull/451) (`2aab520c`, CI #634, despliegue privado [#508](https://github.com/mamg97/segundo-cerebro/actions/runs/38436433518) correcto) añadió **medición real en Chromium** de desplazamiento del diálogo MIDAS en escritorio 1440×1100 y móvil 390×844; no alteró estrategias ni retornos.

**Evidencia de auditorías:** [#377](https://github.com/mamg97/segundo-cerebro/actions/runs/38410726347) = 1179 controles/1 fallo, `MIDAS CHECK-00027`; `CHECK-00024` correcto. [#385](https://github.com/mamg97/segundo-cerebro/actions/runs/38432889797) = 1179/0 y [#386](https://github.com/mamg97/segundo-cerebro/actions/runs/38433827917) = 1186/0: ambos Chromium completos, ambos checks MIDAS correctos. Posteriormente [#387](https://github.com/mamg97/segundo-cerebro/actions/runs/38434931453) = 1186/1 por tres `LOOK_IMAGE_ERR_FAILED` de transporte, sin 502; [#388](https://github.com/mamg97/segundo-cerebro/actions/runs/38435384512) = 1173/3 con 43 `LOOK_IMAGE_HTTP_502` y otros 502 en Salud/Gym, 43 diagnósticos `OBJECTS_IMAGE_AUDIT_GATEWAY_UPSTREAM_FAILED`. [#389](https://github.com/mamg97/segundo-cerebro/actions/runs/38436601478) = **1187/0**, navegador completo tras deploy #508; control visual MIDAS, MIDAS #00024/#00027, HabitQuest y geometría Looks pasan, sin fallos de red.

**Cierre integral NO certificado:** la serie limpia #385/#386 quedó interrumpida por #387/#388, y #389 es la primera verde con la instrumentación actual. Exigir una segunda auditoría Chromium completa, independiente, de producción al commit desplegado vigente con cero fallos funcionales y HTTP 5xx, y verificar que el despliegue no ha sido sustituido por uno obsoleto. No reclasificar un `workflow_run` omitido o un heartbeat como prueba completa.

**MIDAS:** [PR #443](https://github.com/mamg97/segundo-cerebro/pull/443) corrigió el falso check de referencia SPY histórica y [PR #450](https://github.com/mamg97/segundo-cerebro/pull/450) precisó TimesFM/publicación del genético. La UI separa competición, tesis y archivo. Evaluar fuente y corrida real, no alterar rentabilidades, diario prospectivo ni universo congelado para obtener verde.

**Finanzas y Objetos:** tras #437 el histórico bancario permanece en los checks de Chromium recientes; no se ha demostrado nueva remoción `FINANCE_WORKSPACE_REMOVED`. Los registros de Sheets siguen siendo fuente oficial; ni cachés adicionales ni escrituras de saldos. La geometría Looks `flags=11111` pasa en perfiles escritorio ancho/escritorio/tablet. El fallo intermitente de imágenes **no** prueba fotografías canónicas dañadas ni un defecto CSS.

**Transporte y D1:** [PR #446](https://github.com/mamg97/segundo-cerebro/pull/446) limita a tres lecturas simultáneas de imágenes inmutables en Chromium. #451 añade diagnósticos estrictamente por códigos `QUEUE/FETCH/BODY/FULFILL × TIMEOUT/CLOSED/OTHER`, sin rutas, payloads, tokens o datos privados; mantiene FAIL ante error. #388 mostró fallos upstream del Service Binding, pero **NO existe evidencia suficiente para atribuirlos a D1**. El aviso de consumo D1 comunicado (aprox. 3,75 M / 5 M filas diarias) exige contrastar las métricas Cloudflare y consultas reales antes de cambiar código, límites o mecanismos de caché. Restricción de coste incremental 0 €.

**Scheduler:** workflow único `.github/workflows/web-audit.yml`: cron primario minuto :17, respaldo :42, post-deploy y manual. Último `schedule` observado al analizar: #375, creado 12:10 UTC; post-deploy cubrió algunas ejecuciones posteriores, **pero ello no valida el emisor horario GitHub**. Existe un solo supervisor externo activo `AUDITOR - SEGUNDO CEREBRO`, exacto a :45 Europe/Madrid; no crear duplicados. Criterio de vigilancia: últimos 90 min con Chromium real exitoso y ausencia de auditoría completa en curso; fallos no equivalen a ausencia de scheduler. Investigar retrasos de cron separadamente de regresiones funcionales.

**Próximos pasos:** (1) segunda ejecución completa independiente posterior a #508 y comprobación del scroll y banco; (2) si reaparecen fallos de imagen, inspeccionar el nuevo diagnóstico anonimizado junto con métricas de Worker/Service Binding, sin relajar controles; (3) verificar consumo D1 en consola con métricas reales y optimizar la consulta causante solo si se identifica; (4) supervisar emisión real de cron y cobertura externa. **Sin cambios en Sheets, D1, posiciones, sesiones, GIF, saldos, imágenes ni secretos.**

---

## GESTOR GYM · Prensa de piernas inclinada a 45° · GIF 15/17 (2026-10-13)

- El usuario confirmó la variante inclinada a 45°, no la prensa horizontal. El GIF anatómico blanco con cuádriceps y glúteos resaltados conserva máquina y encuadre fijos: ocho poses originales y ocho intermedias, 16 fotogramas completos de 360×480 a 7 cs. Fuente final, contacto visual y metadatos de construcción están en `design/gym-animations/`; recurso y póster en `app/assets/gym-animations/`.
- El nombre del plan `Prensa de piernas` se vincula a esta variante confirmada. Una ficha wger genérica no hereda el GIF; solo una ficha explícitamente de 45° puede compartirlo. Mi plan, Biblioteca y los detalles reutilizan el mismo recurso; los vídeos wger verificados permanecen únicamente en el detalle. No se alteran ejercicios, cargas, sesiones, Sheets ni D1.
- Estado superado por la entrada de hiperextensiones 16/17: ambas variantes ya confirmadas (banco de hiperextensiones a 45° y curl femoral sentado). No declarar un recurso publicado hasta CI, despliegue privado y comprobación real en la web.

## ORGANIZADOR 16 · Protección del histórico bancario ante redibujos del diálogo (13/10/2026)

- PR #433 fue fusionada y protege la lectura bancaria canónica frente al scope financiero, pero las auditorías completas #370–#372 siguieron detectando eliminación del workspace. La #372 (979 checks/4 fallos, dos Finance y dos MIDAS independientes) comprobó `FINANCE_WORKSPACE_REMOVED`, dos lecturas HTTP 200 con registros y, gracias a #436, `WORKSPACE_REMOVED_AFTER_RENDER caught=NO`. Un render posterior elimina la sección sin fallo del endpoint; por sí solo no determina el autor del redibujo.
- Esta rama añade un guard DOM **mínimo** sobre reemplazos directos del contenido de `#dialog-body`, únicamente si el diálogo de Finanzas continúa abierto **y** existe un snapshot de banco verificado por el endpoint canónico en la misma pestaña. Restaura idempotentemente el bloque existente, sin recargar Sheets ni persistir registros en cachés, almacenamiento o logs. Evita presentar datos bancarios procedentes de rangos presupuestarios opcionales no verificados. Tests con DOM ficticio cubren remoción tras render, duplicaciones y diálogo cerrado/otra área.
- Todavía NO cerrar incidencia sin CI, deploy completo y dos auditorías Chromium completas consecutivas con 0 fallos / 0 HTTP 5xx. MIDAS mantiene auditor propio. Scheduler GitHub no ofrece garantía de ejecución; vigilancia externa existente está en modo exacto :45 Madrid, sin nuevos workflows ni reintentos descontrolados. Ninguna escritura canónica ni coste adicional.

## ORGANIZADOR 16 · Finance scope vs banco verificado + auditor horario (13/10/2026)

- Evidencia: auditoría programada #368 de Chromium `1003 checks / 7 fallos`: 6 `FINANCE_WORKSPACE_REMOVED` y un `MIDAS CHECK-00024` ajeno. Se comprobaron dos respuestas HTTP 200 con registros del lector bancario, sin prueba aún de corrección persistente del DOM. El Worker aporta registros; no inferir pérdida de datos canónicos ni corregir Sheets.
- Causa de software reproducible en código: `applyStateScope("finance")` sobrescribía `state.financeSummary` completo con el snapshot de presupuesto, que no es la autoridad del banco, pudiendo borrar la recuperación `/api/finance/accounts`. Rama `fix/finance-verified-snapshot-scope-20261013`: snapshot bancario **solo en RAM de esta pestaña**, confirmado exclusivamente tras lectura canónica correcta y reconciliado en la recepción del scope y en `openBudgetDetail`. No se persistirá ni copiará a GitHub. Un refresco explícito invalida el snapshot temporal para revalidar origen; el presupuesto actualizado sigue siendo autoridad en categorías e importes.
- Tests sintéticos: pérdida de cuenta/movimiento por respuesta tardía de presupuesto, orden de llegada, protección de fuentes no verificadas y auténtico vacío verificado. CI y prueba Chromium real obligatorios antes de cerrar Finance; no convertir respuestas API 200 en PASS sin DOM.
- Scheduler: primario GitHub `:17`, respaldo GitHub `:42`, ambos best-effort. La ausencia entre 05:52–08:30 es degradación de la **emisión de programación**, aunque la #368 sí completó Chrome. Se ajustó la tarea externa EXISTENTE `AUDITOR - SEGUNDO CEREBRO` al minuto **:45 exacto Europe/Madrid**, manteniendo su recuperación controlada de máximo una por incidencia y sin crear cron, tarea ni gasto. Separar emisión del scheduler de éxito funcional de Chromium.
- Auditoría integral permanece ROJA hasta dos pruebas completas 0 fallos/0 5xx y las verificaciones canónicas de alcance. No tocar MIDAS ajeno salvo integración; no actualizar Sheets, D1, saldos ni secretos.

## ORGANIZADOR 16 · Auditorías 357–359 y diagnóstico privado de Finanzas · 13/10/2026

- Estado integral **ROJO / NO CERRADO**: el criterio permanece dos auditorías Chromium completas independientes, cada una con 0 fallos y 0 HTTP 5xx. Ningún CI verde ni deploy correcto sustituye esa evidencia.
- PR #420 y #422 corrigieron recuperación del histórico bancario (lector privado aislado con caché 30 s, petición en apertura del diálogo aunque rangos opcionales aparezcan completos). Audit #357: 1023 controles/4 fallos, sin los dos fallos previos de Finanzas; sí detectó 37 respuestas 502 de imágenes y otros 5xx, y fallos Gym derivados de una carga no disponible. Referencia: https://github.com/mamg97/segundo-cerebro/actions/runs/38309500828
- PR #423 reparó incompatibilidad entre el gateway OIDC `no-store` y la caché RAM del auditor sin alterar la política HTTP no-store de ninguna respuesta. Deploy completo #483; Audit #358 comprobó 545 hits y 83 entradas RAM frente a 0 anteriores, 991 controles/8 fallos y **1** imagen 502. Es mejora observada de carga, **no** certificación de estabilidad de imágenes. Layout Looks permanece verificado `flags=11111` (desktop-wide/desktop/tablet). Referencias: https://github.com/mamg97/segundo-cerebro/pull/423 y https://github.com/mamg97/segundo-cerebro/actions/runs/38316018453
- Regresión específica de Finance en #358: el enlace al Sheet y las pestañas aparecen inicialmente, y hay **dos** peticiones a `/api/finance/accounts` con `HTTP_200` y `failed=0`; al clicar la primera pestaña, el workspace bancario desaparece (`FINANCE_WORKSPACE_REMOVED`) y fallan siete controles. No tocar saldos, no inventar datos, no dar por hecha la causa final.
- PR #427 (pendiente de fusionar a la fecha de este relevo) añade únicamente diagnóstico de forma de segunda respuesta **dentro de Chromium**: `RECORDS / EMPTY / INVALID / PARSE_FAILED / CLONE_FAILED`. A Actions solo llega un código fijo, no datos bancarios ni cuerpos. CI #595 verde. Próximo paso: fusionar solo con `main` estable, deploy íntegro y auditar para resolver si la UI pierde un estado válido o si el segundo origen devuelve vacío. Referencia: https://github.com/mamg97/segundo-cerebro/pull/427
- Cambios MIDAS TimesFM #424–#426 avanzaron `main` en paralelo. Deploy #484 falló en test del adaptador MIDAS y audit #359 quedó `skipped`; #426 está diseñado para corregir el fixture y forzar un deploy de entradas vigentes. Verificar efectivamente su despliegue y no atribuir #359 a una auditoría sana.
- Scheduler: última ejecución observada con evento `schedule` fue #354; las #357/#358 fueron `workflow_run` postdeploy. Existe vigilancia horaria externa ya creada, pero no equivale a confirmar que el `schedule` de GitHub funciona. Distinguir `Navigate and audit production=success` de heartbeat/skipped. Privacidad, coste operativo 0 €, sin escrituras canónicas ni reintentos indefinidos.

## ORGANIZADOR 15 · Historial Looks/Prendas: HTML mal cerrado · 12/10/2026

- Causa reproducida en el renderer real: faltaba la comilla final de `data-history-latest` en `<tr>` y en la tarjeta móvil `<article>`. El parser absorbía la primera celda/botón en el atributo y el navegador desplazaba las miniaturas fuera de sus filas. Los cambios CSS #416/#417 no podían reparar esa estructura.
- Corrección mínima: cerrar ambos atributos, conservar tabla nativa desktop/tablet y tarjetas móviles vigentes, versionar `objects.js` y el entrypoint como `0.44.23`. Sin nuevos estilos, fuentes, consultas o cambios canónicos.
- Regresión `app/look-history-markup.test.mjs`: ejecuta el renderer real con fixtures inequívocos y parsea el HTML con la biblioteca estándar de Python; cubre ambas vistas, cuatro ordenaciones, filas con/sin fecha, seis celdas, thumbnail dentro de la celda y botón dentro de la tarjeta, y vacío. Antes del fix fallaban los ocho casos con filas; después pasan 10/10 y 6/6 pruebas de detalle existentes.
- **Publicado y geometría verificada:** [PR #419](https://github.com/mamg97/segundo-cerebro/pull/419), CI [#585](https://github.com/mamg97/segundo-cerebro/actions/runs/38297456853) con 377/377 pruebas; [deploy privado #479](https://github.com/mamg97/segundo-cerebro/actions/runs/38297587471) completo. [Audit #353](https://github.com/mamg97/segundo-cerebro/actions/runs/38297689755) confirma `[AUDIT_LOOK_LAYOUT] PASS flags=11111` en `desktop-wide`, `desktop` y `tablet`: cabecera, miniaturas dentro de fila, tabla nativa, seis columnas alineadas y lista móvil oculta. La auditoría global termina 945 controles/26 fallos por carga de imágenes, Finanzas, Salud y red; **no es cierre integral**. No se guardan capturas ni inventario privado en Git.

## Estado auditoría · 12/10/2026 · Finance, imágenes D1, PR #409–#414

- Cierre integral PENDIENTE. Exige dos auditorías Chromium independientes y completas con 0 fallos y 0 HTTP 5xx, y trazabilidad privada canónica.
- Auditoría #343: 963 comprobaciones / 9 fallos, 51 errores D1_READ_FAILED y múltiples 502 de imágenes; https://github.com/mamg97/segundo-cerebro/actions/runs/38278986192
- Auditoría #344: 1020 / 5, dos problemas de Home de financiación/regalos y 56 fallos D1; Finance no falló; https://github.com/mamg97/segundo-cerebro/actions/runs/38279723447
- Auditoría #346: 963 / 2, cero 5xx; solo FINANCE_SHEET_LINK y FINANCE_ACCOUNT_TABS. Es una recuperación observada de imágenes, NO un cierre estable; https://github.com/mamg97/segundo-cerebro/actions/runs/38280339802
- PR #409: render de movimientos bancarios verificados aunque no haya presupuesto mensual (CI verde). https://github.com/mamg97/segundo-cerebro/pull/409
- PR #410: elimina la lectura secuencial del resumen completo antes de recuperar los bancos, evita ventana de espera >12 segundos (CI verde). https://github.com/mamg97/segundo-cerebro/pull/410
- PR #411: limita a 1,5 s la lectura de diagnóstico 502 de Chromium. La #342 quedó bloqueada tras los controles porque esperaba sin límite esas respuestas. No debilita controles 5xx (CI verde). https://github.com/mamg97/segundo-cerebro/pull/411
- PR #412: almacén de fotos D1 pasa de una lectura all de BLOBs multimib a lecturas indexadas de fragmentos de máximo 1 MiB, con validación de integridad previa a entrega. CI verde, deploy #472 verde; #346 posterior sin 502. https://github.com/mamg97/segundo-cerebro/pull/412
- PR #413: 13 lecturas individuales de pestañas financieras opcionales se consolidan en un batchGet con contrato estricto y fallback para pestañas faltantes. Todas las 13 pestañas existen en la fuente derivada conectada. CI y deploy #473 verdes. Auditoría #347 pendiente de resultados. https://github.com/mamg97/segundo-cerebro/pull/413
- PR #414: si falla el bootstrap remoto /api/state de 9 s, la navegación financiera puede recuperar la ruta bancaria autenticada y NO muestra importes del mock como reales. CI verde; despliegue #474 y auditoría posterior pendientes. https://github.com/mamg97/segundo-cerebro/pull/414
- El Sheet privado de Finance contiene Cuentas y MovimientosCuenta con registros y cabeceras esperadas, comprobado solo con lecturas de metadatos/muestras en conector privado; nunca volcar importes, cuentas o IDs a GitHub.
- Pendientes: verificar #347 y auditorías tras #474; comprobar persistencia banco, Home, D1 imágenes, periodicidad schedule y reconciliación Sheets-D1-UI. No relanzar manualmente workflows ni crear tareas/pagos.

---
## ESTADO OPERATIVO · 12/10/2026 · Investigación Finance y 502 (#406–#408)

- **Main de código:** `2f6b3237` tras [PR #406](https://github.com/mamg97/segundo-cerebro/pull/406), [PR #407](https://github.com/mamg97/segundo-cerebro/pull/407) y [PR #408](https://github.com/mamg97/segundo-cerebro/pull/408). **CI verde**: [#406](https://github.com/mamg97/segundo-cerebro/actions/runs/38275159327), [#407](https://github.com/mamg97/segundo-cerebro/actions/runs/38275847717), [#408](https://github.com/mamg97/segundo-cerebro/actions/runs/38277095093).
- **#406 Finance:** nuevo GET protegido `/api/finance/accounts` con un único batchGet de dos pestañas del Sheet derivado (`Cuentas` y `MovimientosCuenta`) sin recargar todos los rangos del presupuesto. Los errores de autenticación, contrato o upstream no se convierten en histórico vacío válido. Las cuentas sin saldo conocido no desaparecen del catálogo. UI usa esa fuente sólo para datos bancarios; no sobreescribe categorías ni dinero libre. [Despliegue #466](https://github.com/mamg97/segundo-cerebro/actions/runs/38275314450) **exitoso**. La [auditoría #340](https://github.com/mamg97/segundo-cerebro/actions/runs/38275425870) ejecutó 960 controles/2 fallos, ambos `FINANCE_SHEET_LINK` y pestañas bancarias; sin 5xx observados. **No cerrar Finance** por #406.
- **Contraste de origen autorizado read-only:** el Spreadsheet financiero privado conectado contiene realmente las pestañas canónicas `Cuentas` y `MovimientosCuenta`; las muestras inspeccionadas tienen registros y los encabezados documentados. No publicar ni copiar nombres de cuentas, importes, IDs, conceptos o celdas a GitHub. **No se ha acreditado que el Worker de producción apunte al mismo spreadsheet**: el secreto `FINANCE_SHEET_ID` es privado. Mantener diferencia entre fuente correcta y API/UI sin verificar.
- **#407 diagnósticos 5xx:** las respuestas internas 502 de Health overview e imágenes Objetos incluyen sólo `diagnostic` de vocabulario cerrado; Chromium agrega `AUDIT_BACKEND_DIAG` con códigos permitidos y categorías `NON_JSON_5XX` cuando proceda. No se emiten respuestas crudas, URLs ni IDs; se mantienen fallos 5xx como fallos. [Despliegue #467](https://github.com/mamg97/segundo-cerebro/actions/runs/38275964372) **exitoso**, pero [auditoría #341](https://github.com/mamg97/segundo-cerebro/actions/runs/38276115613) **abortó en 171 checks** (`MAIN_CHECKS`), así que no valida imágenes ni Salud en profundidad.
- **#408 diagnóstico de causa Finance y aborto prematuro:** Chromium evalúa dentro del navegador si `/api/finance/accounts` devuelve arrays reales con registros y retorna a GitHub sólo dos booleanos, sin datos privados. En caso de faltar el enlace o las pestañas, emite la clasificación DOM finita. Las excepciones del auditor se clasifican con `AUDIT_EXEC_DIAG` y nunca se publican como texto crudo. CI verde; [despliegue #468](https://github.com/mamg97/segundo-cerebro/actions/runs/38277198829) **pendiente de verificar** en el momento del relevo; auditoría postdeploy también pendiente. Prioridad: fuente API vs DOM, causa de los abortos y 502.
- **Scheduler:** la [#339](https://github.com/mamg97/segundo-cerebro/actions/runs/38275099171) sí fue evento `schedule` y ejecutó Chromium (960 checks/3 fallos), primer horario real tras pérdida de cadencia. Una ejecución programada no garantiza estabilidad de la cadencia; comprobar más horarios.
- **Cierre integral NO acreditado:** requiere **dos auditorías completas independientes con 0 fallos y 0 5xx**, más trazabilidad canónica. No hubo escrituras de datos reales, D1, secretos ni permisos. Sin compra de servicios, sin relanzamientos manuales extra. MIDAS/LITOS sólo integración.

## Estado operativo vigente · 2026-10-12 · Reparaciones de incidencias #403–#405

- **Repositorio y código actual:** `mamg97/segundo-cerebro`, `main` tras [PR #403](https://github.com/mamg97/segundo-cerebro/pull/403), [PR #404](https://github.com/mamg97/segundo-cerebro/pull/404) y [PR #405](https://github.com/mamg97/segundo-cerebro/pull/405), commit `2ba74d88`. PR #402 ya fusionada; #351 y #400 cerradas sin merge. Las tres nuevas PR tienen CI verde: [#403](https://github.com/mamg97/segundo-cerebro/actions/runs/38271111975), [#404](https://github.com/mamg97/segundo-cerebro/actions/runs/38272003000), [#405](https://github.com/mamg97/segundo-cerebro/actions/runs/38272338079).
- **Corrección de interfaz Finance #403:** `app/finance-workspace-readiness.js`, `app/app.js` y pruebas. Antes, si existían categorías presupuestarias pero las lecturas de cuentas y movimientos no llegaban, el diálogo nunca solicitaba recuperación bancaria. Ahora ejecuta **una** lectura acotada y de solo lectura `/api/state?scope=finance`, muestra estado desconocido si faltan datos y nunca inventa cuentas o movimientos. [Deploy #38271269323](https://github.com/mamg97/segundo-cerebro/actions/runs/38271269323) correcto, con todos los Workers ejecutados. **Auditoría posterior #336** ([run](https://github.com/mamg97/segundo-cerebro/actions/runs/38271396996)) completa con **960 checks y 3 fallos**: aún fallan enlace y pestañas de Finanzas; `OBJECTS_IMAGE_HTTP_502` ×32. No cerrar Finance por la corrección parcial.
- **Privacidad/diagnóstico #404:** `private-cloudflare/src/private-read-diagnostics.js` y pruebas; las rutas de imágenes de Objetos y overview de Salud dejan de registrar IDs y excepciones crudas en sus catches, usando categorías técnicas de vocabulario cerrado. [Deploy #38272140351](https://github.com/mamg97/segundo-cerebro/actions/runs/38272140351) correcto; [auditoría #337](https://github.com/mamg97/segundo-cerebro/actions/runs/38272265037) estaba en curso en esta revisión. No atribuir ni marcar reparados los 502 por la mera redacción.
- **Eficiencia Finance #405:** `private-cloudflare/src/single-flight.js` y pruebas; varias rutas que solicitan a la vez `fetchFinanceSummary` en el mismo isolate comparten una única lectura fría. Mantiene TTL y no cachea errores. [Deploy #38272509956](https://github.com/mamg97/segundo-cerebro/actions/runs/38272509956) correcto. [Auditoría #338](https://github.com/mamg97/segundo-cerebro/actions/runs/38272629378) pendiente en esta revisión, esperando a #337; no hay verificación aún de recuperación bancaria ni de 502.
- **Evidencia precedente:** [auditoría #334](https://github.com/mamg97/segundo-cerebro/actions/runs/38264454579) 960/3, cinco `FINANCE_API_HTTP_502` de Delta, uno `HEALTH_OVERVIEW_HTTP_502` y 25 `OBJECTS_IMAGE_HTTP_502`. [Auditoría #335](https://github.com/mamg97/segundo-cerebro/actions/runs/38269070403) ~955/7: cuatro controles Home Finance, dos Finance de cuenta y uno INFRA; un 502 Health Overview y ninguno de imágenes Objetos. Los controles Gym de #398 no reaparecieron como fallidos en #334–#336, sin que ello certifique integridad global.
- **Cadencia realmente programada:** último evento `schedule` comprobado [run #38229404846](https://github.com/mamg97/segundo-cerebro/actions/runs/38229404846), 12/10/2026 09:21 UTC; las auditorías #334–#338 son `workflow_run` postdeploy y **no** acreditan recuperación del scheduler. No crear cron adicional ni relanzar indefinidamente: la recuperación controlada anterior ya se utilizó. El workflow mantiene primario/respaldo, pero GitHub no ha emitido las ejecuciones esperadas.
- **Causas abiertas:** `/api/finance/delta` no es `/api/state?scope=finance` (no confundir). `fetchOptionalFinanceRows` puede convertir un error de pestaña opcional en `[]`, lo que requiere comprobación read-only de estado/causa antes de cambiar contratos. GET de imágenes de Objetos pasa por `objects-media-d1.js` y D1, pero HTTP 502 no determina por sí solo si el origen es D1, runtime Worker o Cloudflare. Faltan **logs de ejecución sanitizados del Worker/Cloudflare, con permiso read-only**, para atribución causal, así como comparación autorizada de D1 y Sheets; no extraer datos sensibles a GitHub.
- **Puerta de cierre:** **dos auditorías Chromium independientes, completas, 0 fallos y 0 HTTP 5xx**, más trazabilidad canónica por dominio. Hoy no existe ese cierre. Sin cambios en saldos, hojas, históricos ni D1; privacidad y coste operativo adicional **0 €**. Verificar resultados #337/#338 y la emisión real de `schedule` antes de más cambios. Mantener LITOS y MIDAS bajo sus auditores especializados.

## SALUD · Unificación de peso manual + HealthKit (2026-10-12)

- Motivo: el dashboard tenía la medición más reciente desde D1 mientras un gestor consultó solo `MedicionesCorporales` y comunicó un peso obsoleto. No es un problema de falta de importación: `MedicionesCorporalesApple` y `HistoricoResumen` ya ofrecen la proyección D1.
- Solución propuesta en `fix/health-latest-weight-unified-20261012`: API `body.weightLatest` desde unión normalizada D1 + mediciones manuales, métricas deduplicadas por instante, 7 días por media diaria. `HistoricoResumen` sigue derivado, `MedicionesCorporalesApple` sigue siendo SOLO proyección automática, `MedicionesCorporales` SOLO baseline/manual.
- Los agentes Nutri, Salud, Gym y Cerebro Global deben consultar `HistoricoResumen` (fila `all`) y comprobar `generated_at`; si es antiguo o existe una medición manual posterior, reconciliar `MedicionesCorporalesApple` y `MedicionesCorporales` por fecha real. Nunca tomar el último dato únicamente del Sheet manual ni duplicar filas.
- Pendiente hasta CI/merge/deploy: verificar que las pruebas de unión, idempotencia y proyección pasan; la integración de código no implica por sí sola revisión visual del dashboard privado.

## ORGANIZADOR 14 · Estado real tras PR #398 — 12/10/2026

- **Código y deploy reales:** PR #397 corrigió `success` falso de trabajos saltados y la tolerancia segura de `main` con solo cambios documentales. Deploy #38256572585 **success**, todos los Workers y D1 publicados. PR #398 corrigió ambos fallos Gym (fuente Home/Salud distinta y hero confundido con vídeo suplementario). CI success; deploy #38258590413 **success**, todos los Workers y D1 publicados. No alterados Sheets ni archivos personales.
- **Auditoría #38256740228 sobre #397:** 1022 checks / 2 fallos, códigos `HEALTH_OVERVIEW_PARITY_GYM` y `HEALTH_GYM_DETAIL_MEDIA`, sin respuestas 5xx; esos dos defectos fueron corregidos en #398.
- **Auditoría #38258732048 attempt 1 sobre #398:** 988 checks / 3 fallos: `VISUAL CHECK-00660` y `-00661` (**sin código diagnóstico de categoría**) y una petición a imagen de Look `LOOK_IMAGE_ERR_FAILED count=1`. **Sin HTTP 502 en esa ejecución.** Fallos Gym previos ausentes.
- **Auditoría #38258732048 attempt 2:** 168 checks / 1 fallo, **excepción temprana** en fase fija `MAIN_CHECKS`; sin conclusión sobre controles que quedaron sin ejecutar. No se reprodujeron códigos anteriores porque no se llegó a esa parte. No considerar esto una mejora de visual ni un verde.
- **Estado:** producción desplegada, pero **auditoría ROJA e intermitente**. No inventar causa para dos fallos Visual sin categoría ni para el fallo MAIN_CHECKS. Investigar con diagnósticos **allowlisted** y sin URLs/IDs/DOM privado; reproducir en una ejecución completa antes de modificar CSS, imágenes canónicas o protocolo D1. Rechazar como éxito un run incompleto o solo CI.
- **Siguiente puerta de cierre:** auditoría completa 0 fallos/0 errores 5xx, y segunda ejecución independiente completa y correcta. No aplicar reintentos ilimitados, no deshabilitar controles, no regenerar fotos ni tocar fuentes canónicas.

## ORGANIZADOR 14 · Cierre de los dos fallos Gym tras recuperación de deploy · 12/10/2026

- [Run completo 38256572585](https://github.com/mamg97/segundo-cerebro/actions/runs/38256572585): migración D1 + Worker principal + cinco Workers auxiliares correctos tras PR #397; ya no hay falso verde por skipped.
- [Auditoría postdeploy 38256740228](https://github.com/mamg97/segundo-cerebro/actions/runs/38256740228): **1022 checks / 2 fail**, `HEALTH_OVERVIEW_PARITY_GYM` y `HEALTH_GYM_DETAIL_MEDIA`; **sin 502 registrados en esta ejecución**. Una auditoría no prueba estabilidad histórica; repetir con flujos completos y no modificar ninguna fuente canónica.
- Causa 1 confirmada en frontend: Home construía Gym con `/api/gym`, pero `loadHealthOverview` pasaba siempre `{}` a `renderHealthOverview`, forzando discrepancia. Salud ahora reutiliza el último snapshot privado exitoso que Home o el panel Gym ya cargaron y, al mostrar **hoy**, refresca el indicador de Home desde ese mismo snapshot. Fechas históricas no pisan Home. **No añade lecturas de Gym ni quita lazy loading**. Test garantiza la correspondencia.
- Causa 2 confirmada en auditor: contaba todos los selectores `.gym-exercise-hero-media` de la ficha, incluyendo el vídeo verificado de wger que se muestra deliberadamente como suplemento a un GIF principal. Ahora limita el conteo de **hero principal** a hijos directos del contenedor de medios y conserva la exigencia de exactamente uno; el vídeo wger y la atribución se siguen verificando por separado.
- Criterio de cierre: CI y despliegue completos + audit Chromium con **0 fallos y 0 errores 5xx**, seguido de una segunda ejecución independiente sin intermitencias. Mantener diagnóstico rojo ante nuevos 502 aunque un deploy haya sido correcto.

## ORGANIZADOR 14 · Bug de falso verde de despliegue · 12/10/2026

- Detectado en [run 38254317985, attempt 2](https://github.com/mamg97/segundo-cerebro/actions/runs/38254317985): el job aparece `success`, pero todos los pasos de deploy privado fueron `skipped` tras un commit **solo documental** en `main`. Eso no acredita publicación alguna; auditores posteriores pueden suponer un despliegue sano.
- **Corrección:** verificar equivalencia del árbol de entradas del despliegue (`app/`, `core/`, `private-cloudflare/`, bridge y workflows críticos) entre el commit del job y la punta de `main` mediante `git diff --quiet`. Un commit documental no invalida un artefacto con las mismas entradas; cualquier divergencia del código/configuración sigue bloqueando por seguridad.
- **Fail closed:** credenciales ausentes o ramas con diferencias de código **fallan explícitamente** el job, en vez de terminar en falso verde. Se conservan el orden de migración D1, validaciones, reintentos acotados y protección de secretos. Tests de contrato actualizados.
- **Incidencia externa aún abierta:** el deploy de `c9efa3c8` falló dos veces con `CF_HTTP_504` de Cloudflare API; el bug de falso verde es independiente y no arregla los 504. La auditoría de producción completa sobre los cambios recientes sigue pendiente.
- Gate: CI verde → PR aislada → despliegue realmente ejecutado y completo sobre entradas vigentes → auditoría Chromium completa con fallos = 0 → segunda ejecución sin intermitencias antes de declarar verde.

## ORGANIZADOR 14 · Despliegue bloqueado por Cloudflare API 504 · 12/10/2026

- **Código validado y fusionado:** [PR #395](https://github.com/mamg97/segundo-cerebro/pull/395), commit `c9efa3c8fc4a95c4ea6b08d74264a9ff08e71448`. Conserva #393 (single-flight de fotos de Recetas), #392 (caché efímera del auditor), #391 (Finance readiness), #390 (14 GIF), #389 (migración D1). La PR conflictiva #394 se cerró sin fusionarla.
- **Bloqueo externo verificable:** [despliegue #38254317985](https://github.com/mamg97/segundo-cerebro/actions/runs/38254317985) completó tests, build y migraciones D1, pero `Deploy production Worker` falló **dos veces** con `CF_HTTP_504` (`DEPLOY_RETRY` y después `DEPLOY_FAILED`). Los Workers auxiliares no se desplegaron en ese run por fail-closed; la auditoría de producción posterior no quedó habilitada. No presentar como publicado el paquete nuevo.
- **Comparación de tamaño:** último deploy completo exitoso #38246876864: `Total Upload: 2158.29 KiB / gzip: 743.74 KiB`. Deploy fallido posterior a #393 #38249931219: `2159.23 KiB / gzip: 743.87 KiB` y `POST .../workers/scripts/segundo-cerebro/versions -> 504`. No hay aumento material de paquete que explique por sí mismo el fallo. Diferencia entre error de API de publicación y errores 502 de endpoints de la app; no inferir equivalencia ni causa raíz cerrada.
- **Norma operativa:** el wrapper de #395 está probado; **no** insistir con reintentos automáticos indefinidos, relajar errores del CI, exponer respuestas completas, subir tokens, borrar D1 o saltarse Workers auxiliares para fingir estado verde. Próxima acción válida: comprobar recuperación real del proveedor antes de **un** deploy íntegro de main; exigir éxito en los seis Workers y auditoría Chromium completa sobre el commit desplegado. Si persiste 504, conservar Ray ID solo por canal privado de soporte, no en logs públicos.
- **Última auditoría completada conocida:** [#38247014384](https://github.com/mamg97/segundo-cerebro/actions/runs/38247014384), 927 controles/13 fallos, 27 HTTP 502 (19 Looks). Es anterior a #393/#395; no usarla para validar cambios posteriores.

## ORGANIZADOR 14 · Recuperación acotada de despliegues Cloudflare · 12/10/2026

- La PR #393 de recetas ya está integrada en `main`. El deploy de dicho commit ([run 38249931219](https://github.com/mamg97/segundo-cerebro/actions/runs/38249931219)) falló también en el Worker **principal**: `POST .../versions -> 504 Gateway Timeout`. Los dos intentos terminaron fallidos y las auditorías siguientes fueron omitidas. No inferir que todo el commit #393 esté desplegado ni que las fotos estén sanadas.
- La propuesta previa #394 entró en conflicto al moverse `main`. Esta rama recupera **únicamente** el cambio del wrapper y del workflow sobre el nuevo `main`, conservando el single-flight de Recetas y el historial de cambios existente. Evitar merge forzado de la rama antigua.
- `scripts/deploy-wrangler-retry.mjs` se limita a seis rutas de configuración conocidas y concede **dos intentos como máximo**, con 5 s entre ellos, solo para errores transitorios Cloudflare HTTP 502/503/504/520/522/524, errores temporales de red o respuesta malformada de `deployments` con HTTP 200. Cualquier 401, 403, error de configuración, subproceso fallido por otra razón o segundo fallo devuelve CI rojo. Logs contienen solo códigos fijos; no volcar respuestas crudas.
- Orden intacto: validaciones → migración D1 remota → Worker principal → Health → Objetos → MIDAS → Shopping → gateway de auditoría. No toca secretos, persistencia, fuentes, fotos, criterios de auditoría ni plataformas de pago.
- Cierre solo con CI verde, despliegue íntegro y posterior auditoría Chromium de producción realmente ejecutada; no confundir CI o deploy verde con eliminación de los HTTP 502 intermitentes.

## ORGANIZADOR 14 · Contención de peticiones simultáneas de imágenes de recetas · 12/10/2026

- Estado precedente comprobado: audit #321, 950 checks/29 fallos y 20 HTTP 502 en Salud clasificados `HEALTH_OTHER`; no autoriza a afirmar que los 20 procedían de fotos. Audit #323: 946 checks/8 fallos, 0 HTTP 502. Audit #324: 927 checks/13 fallos, 27 HTTP 502 de varias familias (19 de Looks, 2 de overview Salud, otras de Nutri y Gym). Indica inestabilidad intermitente, no datos borrados ni causalidad Drive demostrada.
- La PR #388 ya categorizó rutas 5xx; #389 retiró DDL de lecturas D1 con migración no destructiva; #390 alineó 14 GIF; #391 ajustó la espera financiera; #392 añadió caché privada efímera **solo al auditor**. No reimplementar ni solapar dichos cambios.
- Hallazgo autónomo verificable del Worker: `fetchHealthRecipePreview` y `fetchHealthRecipePhotoMeta` compartían un Map TTL de 60 s pero **no compartían la petición en curso** al caducar; 20 imágenes paralelas podían disparar 20 lecturas de la misma pestaña en el mismo isolate. Si la pestaña opcional `RecipeMedia` respondía HTTP 400/404, el código devolvía `null` sin renovar TTL, repitiendo ese intento para cada imagen. Son defectos reproducibles de concurrencia/carga, aunque no se demuestra que expliquen todos los 502 observados.
- Rama `organizador14/recipe-preview-singleflight-20261012`: `inFlight` por cada una de las dos caches, con una lectura compartida en la ráfaga; al terminar, limpia la promesa sin ocultar errores. HTTP 400/404 de pestaña técnica opcional: caché de ausencia de 60 s y fallback a Drive existente. HTTP 5xx: **no** se cachea el error ni se convierte ausencia en éxito; el siguiente acceso vuelve a intentar. Para `Recetas` utiliza el helper de lectura con reintentos acotados ya aprobado `googleReadFetch`. No cambia cachés de nutrición, nombres/columnas canónicas, Drive binarios ni fuente de verdad.
- Seguridad: warning de preview corrupta deja de imprimir `recipeId`; salida de error mantiene solo código, sin identificadores privados. Ningún dato real en pruebas: 25 peticiones sintéticas concurrentes por pestaña, 400/404, 503 y recuperación sin cache poison.
- **Gate:** CI del Worker, PR aislada, desplegar solo con éxito y observar al menos varias auditorías completas posteriores para medir si persisten errores (no lanzar bucles). No declarar recetas verdes por un CI o un único run limpio. Si los 5xx persisten, contrastar clase de endpoint permitida y respuesta del Worker sin registrar contenido personal.

## ORGANIZADOR 14 · Auditoría visual: caché efímera de imágenes inmutables · 12/10/2026

- La auditoría posterior a PR #390, [run 38247014384](https://github.com/mamg97/segundo-cerebro/actions/runs/38247014384), tuvo 927 checks/13 fallos y **27 respuestas HTTP 502** (19 de imágenes de Looks, además de varias rutas de Salud/Gimnasio). Contrasta con run 38246614256 (946 checks/8 fallos y ningún 502): la estabilidad **no está resuelta**.
- Hallazgo del auditor: toda petición pasa por `page.route` para renovar el OIDC. Playwright desactiva la caché HTTP cuando hay routing; por ello se solicitan repetidamente imágenes privadas que el Worker marca como `private, max-age=31536000, immutable`. Es una carga artificial, especialmente sobre D1/Workers Free, aunque no se ha probado que explique todos los 502.
- Corrección propuesta: caché **solo en RAM del job**, acotada a 4 MiB por imagen/24 MiB total. Solo considera rutas GET same-origin de imágenes `processed`, `thumbnail` y Looks con versión canónica, respuesta HTTP 200, Content-Type imagen y `Cache-Control: private, immutable`. **Primera lectura siempre real**, fallos HTTP/aborts nunca cacheados. El auditor sigue validando imágenes decodificadas y detectando errores 5xx. No se guardan bytes/URLs/IDs en GitHub, artifacts, disco ni logs.
- CI prueba aislamiento, control de tamaño y que no se cachean errores ni fuentes externas. El primer éxito no se considera prueba de solución: exigir deploy y varias auditorías consecutivas sin 502 antes de cierre. Sin modificaciones de fotos, D1 ni Google Sheets.

## ORGANIZADOR 14 · Auditoría: readiness financiera y diagnósticos Salud · 12/10/2026

- Después de la migración D1 #389, [run 38246614256](https://github.com/mamg97/segundo-cerebro/actions/runs/38246614256) completó 946 checks con **8 fallos**, frente a 30 fallos/928 checks anteriormente. **No registró respuestas 502**, ni `HEALTH_OVERVIEW_HTTP_502` ni `LOOK_IMAGE_HTTP_502` en esa ejecución. Es mejora verificable, no garantía de desaparición permanente.
- Siguen fallando dos controles en Finanzas: enlace al Sheet del histórico bancario y disponibilidad de pestañas. El frontend dispone de un cargador privado on-demand de Finanzas de hasta 12 s; el auditor solo esperó 350 ms antes de comprobar el enlace y hasta 6 s para las pestañas. **Hipótesis reproducible de asincronía, no causa cerrada**. Se amplía la espera de presencia del workspace a 16 s para verificar la UI terminada; los fallos reales siguen fallando al agotar el plazo. No crear saldos ni movimientos ficticios.
- El auditor público solo exponía ordinales en Salud y Visual; se añaden códigos explícitos de un catálogo fijo para fallos de Resumen, histórico energético, Gimnasio y geometría visual. La función recibe nombres internos, devuelve **exclusivamente códigos constantes**; no registra DOM, IDs, nombres personales ni contenido canónico.
- Persisten otras comprobaciones funcionales/visuales pendientes. La solución requiere CI, despliegue y nueva auditoría con el patrón diagnóstico, no basta el resultado anterior.
- Comprobación del Sheet de Salud (solo lectura): están presentes pestañas canónicas para Comidas, Registro, Objetivos, EnergiaDiaria, MenuSemanal, Recetas e IngredientesReceta, con filas reales. No se ha realizado modificación de origen.

## ORGANIZADOR 14 · Contrato auditor Gym: 14 GIF reales · 12/10/2026

- El frontend `GYM_CUSTOM_ANIMATIONS` y la matriz de Biblioteca contienen **14** ilustraciones específicas, pero `private-cloudflare/scripts/web-audit.mjs` seguía exigiendo **12** URLs de GIF, filas y estados. Es un desfase verificable de contrato que genera falsos fallos incluso con las 14 ilustraciones presentes.
- Rama de corrección aislada: auditor exige 14 en los tres checks, mediante una sola constante `EXPECTED_CURATED_GYM_GIFS`. Nueva prueba compara el inventario real de `app/app.js` con esa constante, impide claves y GIF duplicados y verifica los tres usos. Añadida al CI de la app privada.
- Esta corrección **no** afirma que los vídeos wger se reproduzcan, ni oculta imágenes rotas o fallos del Worker. Se requiere CI verde, despliegue, auditoría postdespliegue y prueba funcional antes de clasificar Gym como verde. Ninguna modificación de gimnasio canónico, assets, Plan, D1 o Sheets.

## ORGANIZADOR 14 · Imágenes privadas: retirar DDL de lecturas · 12/10/2026

- Auditoría privada post-PR #388 [run 38244056714](https://github.com/mamg97/segundo-cerebro/actions/runs/38244056714): 928 checks, 30 fallos, con `HEALTH_OVERVIEW_HTTP_502 count=1` y `LOOK_IMAGE_HTTP_502 count=3`. La causa exacta de estos fallos no está demostrada; no equiparar mejoras de infraestructura a reparación verificada.
- Se detectó una violación reproducible de la arquitectura: el adaptador `objects-media-d1.js` ejecutaba `CREATE TABLE IF NOT EXISTS` y `CREATE INDEX IF NOT EXISTS` durante cada inicialización de Worker, incluida la lectura GET de imágenes, por medio de `ensureSchema`. `docs/DECISIONS.md` establece que el esquema se aplica exclusivamente mediante migraciones remotas antes del despliegue.
- Corrección aislada: `migrations/0008_objects_media.sql` con las dos tablas y el índice **idénticos a la definición vigente**, todos con `IF NOT EXISTS`. Preserva intactos los registros y assets previos. El adaptador deja de ejecutar DDL al leer, subir o borrar medios. Se añade prueba que prohíbe DDL de ejecución y comprueba la migración; las pruebas preexistentes conservan round-trip de los chunks. Sin nueva infraestructura ni coste.
- La pipeline de despliegue aplica migraciones D1 antes de publicar el Worker. **No fusionar ni declarar solucionadas imágenes** sin CI verde, migración remota confirmada, despliegue y auditoría postdespliegue. Si persiste `LOOK_IMAGE_HTTP_502`, inspeccionar errores no sensibles del acceso a chunks D1 y tamaño de assets sin borrar ni regenerar imágenes canónicas.
- Fuentes Google Sheets, look IDs, fotos, prendas, movimientos y secretos: sin modificaciones.

## ORGANIZADOR 14 · Estado contrastado y diagnóstico de Salud · 12/10/2026

- HEAD de partida `ab98024c` (PR #387 ya fusionada). Último audit de producción: [run 38241186542](https://github.com/mamg97/segundo-cerebro/actions/runs/38241186542), 950 checks / 29 fallos. La ejecución completa llega al resumen, pero quedan 20 respuestas HTTP 502 registradas como `HEALTH_OTHER`, junto a fallos de interfaz en Salud y enlace financiero. CI/deploy verdes no prueban salud funcional.
- **HabitQuest:** auditoría privada emitió `[HABITQUEST_SMOKE] PASS`; el Sheet canónico existente contiene las pestañas `Habits`, `History`, `Meta`, `SyncState` y el registro `IntegracionesPrivadas` tiene una única referencia concordante. No se crean datos ni se cambian secretos. La vieja pantalla del iPhone no equivale a un fallo reproducible actual; verificar cache y operación de escritura por separado.
- **Gimnasio:** el [auditor público wger](https://github.com/mamg97/segundo-cerebro/actions/runs/38159736773) confirma 3 vídeos enlazables entre 12 variantes examinadas, no la reproducción de proxy privado. Los nuevos GIF del plan no autorizan a extrapolar este inventario.
- **Diagnóstico propuesto:** separar los HTTP 502 por familias fijas de rutas Salud (lectura, recetas/imagen, visión, adherencia, citas). Los códigos no contienen IDs, URL, contenido de salud ni datos privados; no se alteran umbrales, fuentes, API ni controles. Al ejecutar el siguiente audit, identificar familia exacta y resolver el backend de esa ruta; no declarar cerrado mientras haya fallos.
- **Límites de verificación:** desde GitHub no se pueden leer los secretos activos de Cloudflare ni reproducir la sesión móvil; no asumir que su presencia se ha comprobado. No se han escrito datos privados ni migraciones.

## Estado actual · Auditoría de producción: contrato Salud · 12/10/2026

- **Objetivo:** cerrar la auditoría Chromium sin ocultar errores ni reducir controles. Último run real previo a esta corrección: [#320](https://github.com/mamg97/segundo-cerebro/actions/runs/38239281241), 396 controles correctos y fallo final por espera de Salud; CI/merge/deploy de la PR #386 no resolvieron ese contrato.
- **Causa reproducida en `main` `7a61f973`:** `openHealthDetail()` crea exactamente **7** pestañas (Resumen, Médicos, Visión, Gimnasio, Nutrición, Recetas, Menú), pero `private-cloudflare/scripts/web-audit.mjs` esperaba 6 y recorría las 6 antiguas, sin `vision`. La espera jamás podía concluir; **la hipótesis de fallo por cerrar Proyectos está descartada** para #320.
- **Corrección preparada:** rama aislada `organizador13/audit-health-seven-tabs-contract-20261012`, con espera 7, visita a `vision`, prueba `private-cloudflare/scripts/audit-health-tabs-contract.test.mjs` que compara botones, paneles, orden, longitud y la lista real del auditor y falla si se reintroduce la configuración antigua. Integrada en `private-cloudflare-ci.yml`. No se desactivan pestañas ni se rebajan umbrales o auditorías.
- **Preservación del trabajo:** el worktree local del Mac `codex/audit-health-seven-tabs` y sus dos líneas sin commit no son accesibles desde esta sesión; la rama tampoco está publicada en GitHub. **No se han alterado ni borrado esos cambios locales.** Se rehizo únicamente el parche verificado sobre una rama remota separada.
- **Siguiente paso:** abrir PR, pasar CI completo; fusionar únicamente con checks verdes, confirmar despliegue privado y observar auditoría postdespliegue. Cualquier siguiente fallo requiere identificar fase y control sin imprimir contenido privado; solo auditoría verde con cobertura completa autoriza el cierre operativo.
- **Privacidad y coste:** ninguna fuente canónica, tabla D1, credencial, dato personal, Worker funcional ni producto ajeno modificado. Sin coste adicional.
## ORGANIZADOR 13 · Recuperación de Menú semanal ante lectura completa fallida · 12/10/2026

- Evidencia de captura: Salud → Menú muestra `12 oct – 18 oct 2026`, cinco tomas del día 12 y error «No se ha podido recuperar esa semana». **No indica pérdida de datos**: lectura directa, solo consulta, del Sheet `SEGUNDO CEREBRO - SALUD` → `MenuSemanal` encontró **5 filas con fecha 2026-10-12** y **70 filas en la semana 05–11** (134 filas válidas desde 2026-09-28).
- Causa operativa probable (no demostrada por traza HTTP de la petición concreta): el navegador de semanas siempre dependía de `GET /api/nutrition?date=`, una lectura Google Sheets de doce rangos, más enriquecimiento de Despensa; el Worker puede devolver `NUTRITION_READ_FAILED` (502) o payload inesperado y no existía fallback. El frontend mantenía la semana anterior en pantalla.
- Cambio seguro `organizador13/menu-week-fallback-light-20261012`: reutiliza el resumen completo en memoria al volver a la semana vigente; para otras semanas prueba lectura completa y, en caso de error, `GET /api/nutrition/menu?date=...` (endpoint canónico de dos rangos, solo lectura). Exige respuesta `ok`, `weekStart` exacto y filas en `weeklyMenu` antes de aceptarla.
- Vista recuperada de forma parcial **identificada como tal**. La consulta ligera no incluye enriquecimiento de Despensa ni ingredientes derivados; conserva solo macros realmente presentes y relaciones de receta comprobadas contra el maestro ya cargado, nunca inventa datos ni crea filas. Aviso con «Reintentar vista completa».
- Si ambas lecturas fallan, retiene la vista previa, comunica **qué semana solicitada falló** y permite reintentar, sin alterar `MenuSemanal`. Respuestas asíncronas viejas se descartan mediante `healthMenuRequestId`.
- Validar por CI específico, despliegue privado y prueba real; no equiparar CI verde a disponibilidad en producción. Sin coste adicional, cambios de esquema, escritura canónica ni exposición de Sheet IDs.

## MIDAS genético: pausa irreversible del libro 08/10 y nueva campaña (12/10/2026)

- Fuente `mamg97/personal_mamg`: el original `diario_portfolio_forward.json` se congela definitivamente en 07/10 tras el fallo de publicación `non-fast-forward` del 09/10 (job 37899091787). No se publicaron las órdenes de 08/10 y no hay registros prospectivos auténticos del 08–09/10; jamás reconstruirlos como fills.
- El nuevo `diario_portfolio_forward_2026-10-12.json` es una **campaña independiente con capital inicial de 100.000 USD**, cuya primera señal debe corresponder al cierre del lunes 12/10, antes de la siguiente apertura. No hereda posiciones, retornos ni pendientes de la original; si pierde esta primera sesión, rechaza un arranque tardío.
- `private-cloudflare/src/midas-ingest.js` acepta el ID adicional `genetic_sp500_forward_archive` exclusivamente con NAV observado entre 29/09 y 07/10 y la misma OIDC segura; `midas.js` presenta ese snapshot como `diario_heredado` (solo Catálogo / histórico) y el nuevo bajo el ID existente `genetic_sp500_forward` (competición). Antes de la primera nueva señal, un snapshot antiguo del ID principal se reconoce como archivo temporal, no como ranking vigente. El frontend excluye el archivo de la competición.
- No se mezclan curvas, CAGR, posiciones ni tickers en la UI. OIDC transporta solo patrimonio diario, fechas y SHA del ledger; ninguna información de posiciones privadas sale del repositorio genético.
- No se han modificado otros gestores ni jobs; despliegue por PR aislada con validación y auditoría. El Worker receptor debe estar desplegado **antes** de habilitar el nuevo publicador privado. Verificar el primer job natural posterior al cierre del 12/10; no generar un backfill del hueco.

## ORGANIZADOR 13 · Menú semanal histórico compacto (2026-10-12)

- El usuario pidió poder consultar semanas anteriores desde **Salud → Menú** en interfaz muy compacta sin perder objetivos, consumo confirmado, ingredientes, recetas ni accesos a Despensa.
- **Evidencia real** de la fuente `SEGUNDO CEREBRO - SALUD` → `MenuSemanal`: fechas entre 2026-09-28 y 2026-10-12, distribuidas en tres semanas naturales. No se añadieron filas ni registros canónicos.
- Causa: `GET /api/nutrition?date=...` devuelve solo los siete días de esa semana; `renderMenuPanel` carecía de controles históricos y mostraba todos los días/ingredientes desplegados. El backend ya soportaba cualquier fecha pasada; no se necesita backend nuevo.
- Solución rama `organizador13/weekly-menu-history-compact-20261012`: navegador por semana anterior/siguiente, fecha arbitraria, «Esta semana»; resumen compacto por día con fecha, kcal/proteína confirmadas y tomas, expandible en `details` sin pérdida del progreso, comidas agrupadas, ingredientes, notas y vínculos a Recetas/Despensa.
- Se investigó la API ligera `/api/nutrition/menu` pero **no contiene todas las referencias a Recetas/Productos**; para el histórico se emplea el endpoint completo ya disponible `/api/nutrition?date=<lunes>`, de solo lectura. Así se mantiene el enlace `recipe_id`, `food_id` y el objetivo efectivo de la fecha correcta. Se hacen consultas solo cuando el usuario cambia de semana, no en bucle.
- Aislamiento de estado: una actualización de Nutrición no debe sustituir la semana histórica elegida; llamadas asíncronas antiguas se ignoran, fallos mantienen la vista anterior con aviso, semanas sin registros muestran un vacío explícito y conservan el navegador. No se interpretan faltantes como consumo cero ni se inventan comidas.
- Pruebas nuevas `app/weekly-menu-history.test.mjs` para lunes, cruces mes/año y fechas inválidas, protección del origen canónico, UX accesible, funcionalidades preservadas y ausencia de escrituras. Se añadieron verificaciones en auditoría read-only (semana anterior y vuelta a actual). Validar CI y despliegue privado antes de dar por cerrado.
- Infraestructura y datos: sin cambios a D1, Sheets, permisos, servicios externos, objetivos canónicos ni otras ramas. Coste adicional 0 €.

## GESTOR GYM · Extensiones de cuádriceps en máquina · GIF 14/17 (2026-10-11)

- Se creó la animación de extensión de rodilla sentado en máquina, con cuádriceps resaltados, sin confundirla con prensa de piernas ni curl femoral. El recurso blanco `extension-cuadriceps-maquina-v3-white.gif` y su póster se enlazan por variante exacta al plan, Biblioteca y detalles; los vídeos wger verificados siguen solo en el detalle.
- Ocho poses originales se normalizaron antes de interpolar: el contenido visible ocupa 327–328 px de alto en las ocho fases, con igual lienzo de 360×480, sin saltos de escala entre apertura y cierre. Se sustituyeron tres intermedios con artefactos del rodillo por interpolaciones a 0,25 del recorrido, visualmente revisadas. El GIF final tiene 16 fotogramas completos a 7 cs; fuente alineada, contacto de los 16 y metadatos se conservan en `design/gym-animations/`.
- Restan tres ejercicios del plan sin GIF: Prensa de piernas (aclarar inclinada u horizontal), Hip thrust 45º (aclarar máquina/movimiento exacto) y Curl de pierna tumbado o sentado (aclarar variante). La ilustración no modifica el plan, registros, datos privados ni wger.
- Antes de declarar publicado: ejecutar pruebas y build, fusionar solo con CI verde, verificar deploy privado y comprobar en la web real Mi plan, Biblioteca y detalle. El GIF es una ayuda visual, no una certificación técnica.

## GESTOR GYM · GIF visible en todas las vistas (2026-10-11)

- Después de publicar el GIF 13/17 de «Aperturas plano» se comprobó en producción la tarjeta y el detalle de Biblioteca y el botón «Ver GIF» desde Mi plan. La ficha de Mi plan aún no mostraba el GIF directamente: era un incumplimiento de la petición de tenerlo en todas las vistas.
- Corrección común para los 13 ejercicios mapeados: miniatura GIF blanca, fija en tamaño y sin recorte en cada fila del plan activo y en la referencia del plan pausado. Biblioteca y ambos detalles ya usaban el mismo archivo. Con preferencia de movimiento reducido se muestra el póster. El botón pasa a «Ver detalle»; los vídeos reales compatibles siguen exclusivos del detalle y nunca sustituyen el GIF principal.
- No se cambian ejercicios, cargas, series, sesiones, datos privados ni búsquedas wger. Verificar pruebas, despliegue privado y visualmente Mi plan y Biblioteca; no dar por visible en producción antes de ello.

## GESTOR GYM · Aperturas plano en máquina mariposa · GIF 13/17 (2026-10-11)

- El usuario confirmó que «Aperturas plano» de su plan corresponde a máquina mariposa/pec deck, no a mancuernas ni poleas. Se generó una lámina 4×2 del estilo anatómico blanco/rojo ya aprobado y se interpoló localmente a GIF blanco de 16 fotogramas, 360×480 y 7 cs, con póster correspondiente.
- Se revisó visualmente el contacto de ocho fases: mismo cuerpo/máquina/encuadre, sin recortes. La ilustración sigue siendo orientativa y no certifica técnica. Fuente, contacto y metadatos están en `design/gym-animations/`; GIF y póster en `app/assets/gym-animations/`.
- El enlace exacto cubre Mi plan, Biblioteca y detalles sin asociar el GIF a aperturas con mancuernas o poleas. Los vídeos wger compatibles continúan mostrándose en el detalle cuando se verifican; no se afirma que haya uno para esta variante sin observarlo.
- Después de este ejercicio quedan cuatro del plan pendientes de GIF: Prensa de piernas, Hip thrust 45º, Extensiones de cuádriceps en máquina y Curl de pierna tumbado o sentado. No alterar el plan ni las series/pesos al añadir material ilustrativo.
- Validación pendiente al integrar: pruebas, CI, deploy privado y comprobación real de Mi plan y Biblioteca. No declarar visible en producción antes de completar ese recorrido.

## ORGANIZADOR 13 · HabitQuest: registro privado y smoke test autenticado (2026-10-11)

- El documento único `HabitQuest Data` y sus pestañas `Habits`, `History`, `Meta`, `SyncState` fueron comprobados con el conector autorizado de Google Drive. Existe backup con nombre diferente; no se modificó ni se tomó como fuente.
- Se insertó únicamente la clave `HABITQUEST_SHEET_ID` en la **fila vacía 8** de `IntegracionesPrivadas`, hoja privada del Sheet financiero canónico. Previamente se verificó que no había ninguna clave duplicada ni contenido en esa fila; después se comprobó por lectura que la clave apunta al ID de `HabitQuest Data`. **No incluir el valor del identificador en Git, comentarios, logs o APIs públicas.**
- Ventaja: cuando el Worker dispone de credenciales Google Sheets, puede recuperar el ID desde `IntegracionesPrivadas` sin depender del permiso Drive de listado de archivos; la ruta de descubrimiento por título exacto permanece como reserva. No se ha alterado ninguna pestaña de hábitos, XP, históricos ni sincronización.
- La PR #372 ya estaba desplegada (CI #515 correcto, deploy privado #438 correcto). Auditoría #302 posterior: 411 comprobaciones, 3 fallos de Finanzas/Infraestructura; fuente `habitSync` no falló, pero el resultado no demuestra por sí solo lectura completa de `GET /api/habits`.
- Esta intervención introduce al comienzo del auditor `GET /api/habits` de solo lectura y verifica HTTP 2xx, `ok`, título exacto de fuente y existencia de arrays `habits` y `todayHabits`. Emite exclusivamente `[HABITQUEST_SMOKE] PASS` o `FAIL_HTTP_N`: nunca nombres, IDs ni detalles personales. Se conserva además la comprobación visual de HabitQuest más adelante.
- **Producción verificada:** PR #373 fusionada, CI #516 verde, despliegue privado #439 correcto. La auditoría autenticada **#303** emitió `[HABITQUEST_SMOKE] PASS`: `GET /api/habits` devolvió `ok`, origen `HabitQuest Data` y arrays `habits` y `todayHabits` desde el Worker real. La auditoría global #303 terminó con 3 fallos ajenos a HabitQuest (Finanzas 2, Infraestructura 1). Pendiente únicamente comprobar el modal y la operativa de marcado en iPhone; no ejecutar escrituras de prueba sobre datos canónicos. 0 € adicionales.

## ORGANIZADOR 13 · Recuperación de HabitQuest tras modal de configuración (2026-10-11)

- Incidencia reproducida visualmente en iPhone: modal de Hábitos muestra `HabitQuest todavía no está conectado aquí / Falta configurar el identificador privado del Sheet en el Worker`.
- **Causa de mensaje erróneo confirmada en código**: `openHabitsDetail` presentaba ese texto fijo para cualquier fallo (503, 502, sesión o red). El backend exigía a la vez credenciales OAuth y `HABITQUEST_SHEET_ID`, sin recurrir al descubrimiento privado ya empleado por Despensa y Proyectos. **No se ha podido leer directamente la configuración de secretos de Cloudflare**, por lo que no afirmar ausencia real de esa variable.
- Google Drive autenticado: existe un único documento de nombre exacto `HabitQuest Data` con pestañas `Habits`, `History`, `Meta`, `SyncState`. Existe una copia de seguridad con otro nombre; nunca utilizarla como fuente activa. El registro privado `IntegracionesPrivadas` aún no contiene `HABITQUEST_SHEET_ID`.
- Recuperación en Worker: resolver ID mediante variable de Worker → registro privado → Drive con coincidencia de título y MIME exactos, rechazando duplicados, paginación ambigua o documentos ausentes; cachear 10 minutos en memoria. El ID no se registra ni se publica en frontend/logs/PR. Un único resolutor se utiliza en consultas diarias, toggles, gestión, batchClear y batchUpdate, sin cambiar las reglas canónicas del histórico.
- UI ahora informa errores según respuesta real: credenciales no configuradas, fallo de lectura/permiso, fallo de red. Reintentar no recrea ni duplica el diálogo. Versión app y estilos v0.44.8 para invalidación de caché.
- Pruebas sintéticas de resolución con y sin variable, título exacto excluyendo backup, registro privado, ambigüedad, Drive denegado y no escritura; pruebas de interfaz con estado real. No modificar el Sheet ni crear segunda base de datos. 0 € adicionales.
- Pendiente: validación CI, despliegue privado, lectura autenticada `GET /api/habits` con estado real y comprobación visual iPhone. GitHub CI verde no prueba acceso OAuth/Drive del Worker desplegado.

## ORGANIZADOR 13 · Comprobación en wger real de los 12 GIF · 2026-10-11

- Consulta efectuada desde GitHub Actions al **catálogo público en vivo**, sin claves ni datos privados. Workflow `Verify public wger Gym videos`; los resultados no se dedujeron de fixtures sintéticos ni de screenshots.
- Con GIF y vídeo **enlazado en metadatos wger** de la variante exacta: `press-banca-plano-barra` → exerciseinfo 73, vídeos 21/22/23; `press-inclinado-barra` → exerciseinfo 538, vídeo 16; `fondos-paralelas` → exerciseinfo 194, vídeos 64/65/66. Se verificaron coincidencias exactas de nombre/equipo y URLs de media normalizadas por el backend.
- Otras nueve variantes: en las dos búsquedas públicas por variante no apareció **vídeo de esa misma variante**. No equivale a afirmar que no exista en otras bases; deben conservar `No · vídeo no localizado` o `Sin verificar` según respuesta en vivo. Rechazar videos de mancuernas, máquinas, gemelos sin máquina, dominadas normales en vez de explosivas, etc.
- Se añadieron tres ID **como pistas de lectura en el frontend**: recuperar `GET /api/gym/exercises/{id}` y exigir de nuevo `provider === wger`, coincidencia exacta de variante, licencia y proxy de vídeo antes de mostrarlo; si falla, continuar la búsqueda normal. No escribir estos IDs a Sheets/D1 ni alterar el plan. Este cambio corrige la búsqueda por etiquetas cortas españolas, que impedía encontrar incluso los vídeos de banca plano/inclinado.
- La captura del usuario de banca plano no muestra ni la matriz ni `Vídeo en Segundo Cerebro` pese a existir en código v0.44.6. Evidencia de versión anterior en navegador o un problema de entrega: v0.44.7 añade identificador discreto `Ficha multimedia · v0.44.7`. Verificar cuál carga el navegador antes de afirmar que la vista está corregida. No inspeccionamos sesión autenticada del usuario.
- La disponibilidad en **el proxy privado** no se ha comprobado solo por existencia en wger. El estado UI permanece `Sí · enlazado (wger)` hasta que el evento `loadedmetadata` confirme reproducción; `error` muestra error. No se deben inventar los resultados de esa comprobación.
- Script de comprobación pública bajo `app/gym-wger-live-audit.mjs`, workflow bajo `.github/workflows/gym-wger-media-audit.yml` sin programación recurrente. 0 € adicional, sin acceso a datos privados y sin acciones sobre otras ramas. Validar CI, deploy y auditoría.

## ORGANIZADOR 13 · Tabla de disponibilidad GIF y vídeo en Gym · 2026-10-11

- Petición: mostrar tabla de los 12 movimientos GIF con columna GIF subido y vídeo disponible; añadir estado de vídeo dentro del detalle en Mi plan y Biblioteca.
- El sistema **no tiene inventario canónico de vídeos en Segundo Cerebro**: vídeo de wger se enlaza al proxy privado, no se sube como archivo propio. No afirmar que una URL del catálogo implique reproducción. Se distingue `Sí · enlazado (wger)`, `Sí · reproducción comprobada`, `No · vídeo no localizado`, `Error · vídeo no reproducible`, y `Sin verificar` cuando el proveedor no está accesible.
- Tabla `Disponibilidad multimedia · 12 ejercicios con GIF`, de solo lectura, dentro de Biblioteca. Todos los GIF propios ya estaban verificados y desplegados; sus estados son independientes de Mi plan. 2 consultas wger concurrentes, gratuitas y sin datos privados, cacheadas en sesión; permite volver a comprobar. Pulsar el nombre abre el detalle de la variante ilustrada.
- Detalle: el estado de vídeo siempre visible. El vídeo enlazado requiere vídeo de misma variante, licencia declarada y URL local `/api/gym/exercises/<id>/media/video/<id>`. Al recibir evento `loadedmetadata` se confirma reproducción; error del elemento de vídeo marca incidencia, no lo convierte en vídeo ausente. No se asocian máquinas/mancuernas a barra.
- No hay alteración de planes, series, pesos, sesiones, objetos, Sheets o D1. No servicios de pago, no claves en repositorio. Los estados calculados solo viven en memoria del navegador; no inventar existencia o ausencia permanente de vídeos. Mantener CI y comprobación funcional real postdespliegue antes de cerrar.
  
## ORGANIZADOR 13 · Vídeo de Press inclinado y estado explicito · 2026-10-11

- Captura de Salud → Gimnasio → Biblioteca mostraba ficha **Press inclinado (barra)** con solo GIF y sin explicación visible. El código esperado en `main` v0.44.4 ya incluía `gymTechniqueInstructionsMarkup`, pero no apareció en la captura: no atribuirlo categóricamente a un fallo de datos. Considerar JS antiguo en navegador hasta verificar bundle efectivo; aumentar versión a v0.44.5.
- Causa técnica adicional verificada en código: `gymLoadVerifiedWgerTechnique` buscaba solo la etiqueta más corta, en español, mediante `name__search`, por lo que no encontraba una ficha wger denominada en inglés `Incline Bench Press`. Se añadió búsqueda `incline` y respaldo `press inclinado`; `Incline Bench Press` solo se vincula si wger informa equipo `Barbell`. Nunca utilizar vídeos de mancuernas ni confiar en nombres ambiguos sin equipamiento.
- El detalle coloca el vídeo real en la zona visible de la derecha, separado del GIF principal de la izquierda, en ambas vistas (Mi plan y Biblioteca). Siempre muestra instrucciones; durante búsqueda indica `Buscando vídeo real compatible…`, y si no se verifica ninguno indica `No se ha encontrado un vídeo real verificado de esta variante en wger.` Sin vídeo se conserva GIF e instrucciones. No se afirma que wger posea un vídeo para Press inclinado sin observarlo en sus datos.
- Ficheros afectados: `app/app.js`, `app/styles.css`, `app/index.html`, pruebas de detalle y auditoría de producción. El vídeo sigue siendo same-origin por el proxy ya existente, con atribución, sin autoplay y con carga diferida.
- No se modificaron plan, series, pesos, sesiones, D1, Sheets, archivos GIF o recursos externos. Sin aumento de coste. Verificar CI, deploy y auditoría real antes de declarar resolución.

## ORGANIZADOR 13 · Detalle Gym: GIF + vídeo real cuando existe (2026-10-11)

- Petición: miniatura principal del ejercicio mantiene el GIF; al abrir su detalle muestra **GIF, vídeo real de wger cuando exista y explicación**. Aplica a ejercicios de Mi plan y Biblioteca.
- Causa: el frontend elegía `customAnimation ? GIF : video`, ocultando vídeos válidos incluso en las fichas wger. Mi plan presentaba solo el GIF e invitaba a ir a Biblioteca.
- Corrección solo de presentación: añade vídeo wger bajo el GIF, con controles manuales y carga diferida. Recupera descripción wger cuando la variante coincide; incluye guía técnica breve de la variante GIF y conserva notas de variantes limitadas. La ficha que solo tiene ilustración intenta consulta read-only de vídeo equivalente, sin asumir que exista.
- Contrato de identidad: únicamente `source.provider === 'wger'`, vídeo de URL proxy same-origin `/api/gym/exercises/<id>/media/video/<id>` y coincidencia exacta de variante con `gymCustomAnimationFor`. Nunca reutilizar vídeos de mancuernas/máquinas/agarres diferentes ni pasar IDs ilustrados a la API wger. La fuente/autoría se identifica al mostrar el vídeo; sin licencia confirmada no se inventa una.
- Privacidad/coste: cero cambios a D1, Sheets, ejercicios del plan, registros, recursos GIF o backend; no hay servicios pagados. Buscador usa nombres genéricos de ejercicios, nunca observaciones privadas.
- Verificar pruebas automatizadas, CI, despliegue y QA real antes de dar por cerrado. Auditoría general roja por dominios no Gym no debe atribuirse a la funcionalidad sin evidencia.

## ORGANIZADOR 13 · Gym: GIF asociado al ejercicio, no a la vista (2026-10-11)

- Causa verificada: la UI ya utilizaba `gymCustomAnimationFor(exercise)` tanto en plan como en wger, pero Biblioteca se alimentaba solo de una página de 24 resultados de wger; salvo nombres exactamente coincidentes, los 12 GIF locales no tenían ficha accesible. No era una pérdida de los archivos.
- Esta rama añade las fichas ilustradas locales que no existen entre los resultados wger de la página; cuando wger trae exactamente la misma variante, utiliza su ficha original con la ilustración, sin duplicar entradas. Buscador y filtros de músculo/equipo también filtran fichas locales. La vista `Con vídeos y GIFs` mantiene ambos formatos.
- El identificador local `illustration:<key>` es **solo de presentación**; abrirlo nunca consulta `/api/gym/exercises/:id` de wger y nunca ofrece botones para vincularlo o crear entradas en `GimnasioPlan` (esos POST requieren ID numérico wger). No se modifica plan, sesiones, wger, licencias o Sheets. Los créditos wger y las ilustraciones propias se identifican separadamente.
- 12 recursos revisados, solo correspondencias exactas de variante; press con mancuernas, máquinas y alternativas no heredan erróneamente el GIF de barra. Para remo mixto, pájaros y gemelos se mantiene la nota explícita de variante.
- Nuevos tests: 12 fichas sin plan, deduplicación cuando wger coincide, búsqueda/filtros, protección contra ID wger ficticio, ficha local accesible y sin POST.
- Validar CI; abrir PR, fusionar solo con pruebas verdes, comprobar deploy privado y verificar en web real. Auditoría general puede seguir roja por fallos ajenos a Gym; no confundirla con fallo de los GIF. Documentar decisiones sin datos privados. Coste adicional 0 €.

## Gym · GIFs listos para publicación (2026-10-11)

- PR #366 contiene 12 animaciones ilustradas con versión de presentación blanca, 16 fotogramas y póster de movimiento reducido. La UI las enlaza por nombre exacto en el plan y en las fichas coincidentes de biblioteca; los cinco ejercicios sin asset siguen con el fallback existente.
- Remo combinado, pájaros y gemelos muestran solo una de sus variantes; la ficha indica expresamente cuál. No se ha cambiado `GimnasioPlan`, el historial ni wger.
- La tarjeta de biblioteca contiene el GIF 3:4 dentro del marco 4:3; comprobación local en 440 px y 390 px sin recorte. Pasaron 270 pruebas y el build privado copió los 12 GIFs byte a byte.
- Falta fusionar el PR, observar el despliegue privado y verificar en la web autenticada las tarjetas y `Mi plan → Ver GIF`. No considerar publicado por una prueba local.

## Salud · reconciliación y auditoría vigente (2026-10-11)

- La última auditoría de producción consultada (`Audit production web` #287) no falló en controles HEALTH; sus fallos fueron FINANCE/INFRA y deben diagnosticarse aparte, sin modificar datos de Salud para volverla verde.
- La app privada ya elige una conciliación manual completa del Sheet frente a una observación parcial de D1, pero eso no repara por sí mismo la fila canónica antigua. La corrección de datos D1 requiere una operación privada trazable y verificación posterior; no versionar cifras ni ejecutar otra importación ZIP como sustituto.
- Esta rama protege la recuperación histórica de energía **y recuperación** contra sobrescrituras, normaliza instantes corporales antes del UPSERT y deduplica identidades equivalentes al leer D1. No borra filas históricas. Un día `live` sin energía completa ya no cuenta como comparable para promedios/balance.
- El bridge iOS amplía su ventana automática a hoy + dos días anteriores para dar margen a muestras tardías; solo será operativo después de compilar, firmar e instalar la versión nueva en el iPhone real. La compilación de simulador y el CI no prueban entrega en segundo plano.
- Antes de cerrar: ejecutar la suite completa, confirmar deploy privado tras merge, revisar otra auditoría completa, renovar la app firmada por Wi-Fi si el iPhone está disponible y confirmar en la proyección privada que el día discrepante quedó conciliado sin doble conteo de muestras. El acceso D1 remoto desde este Mac debe revalidarse; no asumirlo.

## Salud · Integridad del balance energético · revisión (2026-10-10)

- Incidencia genérica: una observación de Apple Health recuperada a media jornada puede conservar `coverage=partial` mientras la fuente se etiqueta como `export_recovery`; no se debe interpretar como cierre completo ni calcular un superávit.
- La protección se implementa de forma genérica: leer `coverage` explícito de `source_details`, reconciliar D1/Sheet por calidad antes de recencia y dejar `balanceKcal=null` cuando no haya cobertura comparable.
- La recuperación histórica en `reconcileHealthRecoveryRows` solo inserta energía en días D1 vacíos (`ON CONFLICT(energy_date) DO NOTHING`): nunca reescribe snapshots posteriores de HealthKit. Una importación nueva que mejore un registro previo exige conciliación explícita; la protección no recupera automáticamente datos ya sobrescritos. La tarjeta de Nutrición comunica la falta de cierre sin publicar valores personales.
- El fallback de Sheet admite conciliación manual trazable solo con evidencia autorizada, sin duplicar filas. La app requiere QA autenticada con `GET /api/nutrition?date=...` y `GET /api/health/overview?date=...` tras CI, merge y despliegue autorizados; esta rama no demuestra despliegue en producción.
- Verificar el cierre de *ayer* del puente Apple Health del iPhone: el propio atajo/bridge debe sincronizar al día siguiente sin intervención manual y no sustituir un día completo por una lectura parcial obsoleta.

## ORGANIZADOR 13 · Salud: recuperar consulta diaria visible · 2026-10-10

- Incidencia visible: Resumen iniciaba siempre en Hoy sin selector de fecha; el balance de 30 días existía, pero quedaba debajo de Composición, Nutrición, Actividad y Rendimiento; la pestaña Nutrición sí conservaba selector y KPIs de gasto/ingesta. No hay evidencia de borrado de datos.
- Rama `organizador13/health-day-navigation-20261010`: nuevo resumen compacto arriba con fecha, anterior/siguiente/Hoy, consumidas confirmadas, gasto total con desglose de energía activa/reposo y balance = ingesta − gasto. Barras del histórico permiten navegar por ratón/teclado; la fecha elegida se conserva al entrar en Nutrición.
- Solo se consulta `GET /api/health/overview?date=...`; no cambia modelos de datos, objetivos, registros, importación ni cálculos canónicos. La tarjeta de balance solo computa para días con ingesta confirmada y cobertura `full`/`live`, preservando `NULL` en días incompletos; Hoy es provisional. Hábitos y Gym permanecen como indicadores actuales para no fingir histórico de esos dominios.
- Se añadieron pruebas sintéticas de déficits, superávits, días sin ingesta y cobertura Watch incompleta; auditoría de producción read-only comprueba que el selector realmente cambia a un día anterior y puede volver a Hoy. Los selectores de rango de histórico se conservan y las lecturas asíncronas tardías no sustituyen otra fecha seleccionada.
- PR, CI, deploy y auditoría real: verificar estados tras el push y no declararlos completos antes de observar resultados. Sin archivos personales, secretos ni gasto adicional.

## Agenda · visibilidad por calendario · 2026-10-10

- Causa de eventos ajenos en la Agenda: Google Calendar se conecta a todas las fuentes compartidas accesibles; la enumeración 5/5 era correcta, pero la Agenda necesita una preferencia de visibilidad separada.
- Fuente canónica de presentación: pestaña privada `CalendariosAgenda` del Sheet `SEGUNDO CEREBRO - EVENTOS`, con `provider, calendar_id, calendar_name, visible, updated_at`. El calendario institucional no relevante se marcó `visible=false` en la fuente privada sin borrar ni cambiar eventos en Google.
- El Worker aplica esas reglas a `/api/state?scope=calendar` y `/api/state` antes de entregar los eventos. El filtro también respeta snapshots Google previos que carecen de `calendarId`.
- Google sigue informando el número completo de calendarios leídos; la UI muestra el número de calendarios ocultos. No se interfiere con iCloud, calendario personal ni otros calendarios.
- Validar en producción después del deploy que el evento institucional no se muestra, Google continúa sincronizando y los cursos del calendario principal permanecen.

## ORGANIZADOR 13 · Apple Health backfill defensivo · 2026-10-10

- Repo revisado con `main` en `6688d3ff`. El rediseño MIDAS de tabla unificada está ya en `main` por PR #334; no reimplantar ni modificar estrategias.
- El archivo de usuario `exportación(4).zip` **no se recuperó** en los archivos accesibles de la conversación/Library ni se encontró en Drive con búsqueda de ZIP por nombre; no se importó esta exportación, no se realizaron escrituras a Sheets ni D1.
- Inspección read-only del Sheet privado de Salud confirma histórico `ActividadDiaria` hasta 2026-10-09 y `RecuperacionDiariaApple` hasta 2026-10-09; no permite atribuir esos datos al ZIP ausente. La importación queda pendiente del archivo original y reconciliación fila a fila.
- Riesgo confirmado por código del importador: `ON CONFLICT(energy_date) DO UPDATE` reemplazaba sin comparar el estado D1 anterior con una exportación parcial; un día posterior al inicio del Watch que solo tenía registros de iPhone se serializaba con energía Watch cero en vez de desconocida. Además se inventaba `23:59:59+02:00` como timestamp incluso en horario de invierno.
- Esta rama de seguridad cambia el backfill masivo a `ON CONFLICT DO NOTHING` para días/muestras ya existentes; conserva valores desconocidos como `NULL`, usa un timestamp real de muestra con offset original y añade pruebas sintéticas SQLite/ZIP a CI. **No es una reconciliación de mejoras**: las fechas preexistentes necesitarán comparación privada de cobertura/procedencia antes de cualquier actualización.
- Auditoría real más reciente al relevo: `Audit production web` #276 (`38066440473`), 393 checks y 3 fallos INFRA; Chromium corrió y falló. CI #464 y deploy privado #422 fueron correctos, lo que no certifica producción. #275 tuvo tres fallos (HEALTH, OTHER, INFRA), #274 cinco (FINANCE x2, HEALTH, OTHER, INFRA).
- PR #351 de respaldo horario sigue abierta en borrador; no tocar su rama. PR #347 de cierre documental también permanece abierta. Logs históricos previos a redacción requieren autorización específica antes de cualquier borrado.
- No exportar datos privados a Git, no ejecutar importación `--apply` sin ZIP/reconciliación, no confundir PR/CI verdes con despliegue/QA real. Coste adicional 0 €.

## Salud · Visión y lentillas · trabajo aislado (2026-10-10)

- Rama `feat/health-vision-contact-lenses` añade pestaña `Salud → Visión`, lectura/edición privada de SPH por ojo, marca/modelo, calendario mensual y registro explícito de sustituciones.
- Persistencia exclusiva en D1 privada (`health_vision_profile`, `health_vision_changes`), endpoint bajo Access, sin gastos recurrentes ni reflejo en `/api/state` o GitHub Pages; datos reales no se versionan.
- Datos de graduación dictados por voz pendientes de confirmar con signo y decimales; la aplicación **no precarga valores personales**. La fecha del último cambio tampoco se presume.
- CI #38066201044 correcta, con tests y compilación; revisión/merge, despliegue privado y comprobación autenticada de lectura/escritura siguen pendientes. El diseño no constituye recordatorio automático.

## Integridad · Facturas y tickets · 2026-10-09

- Revisión read-only de `SEGUNDO CEREBRO - DESPENSA`: el ticket de Mercadona del día está una sola vez en `Tickets`; tiene exactamente cuatro `TicketLineas` distintas que suman el total en céntimos y cuatro observaciones `Precios` enlazadas por `ticket_id` y `producto_id`. Los tres IDs históricos se reutilizan y el único producto nuevo carece de EAN, nutrición o stock inventados.
- `SEGUNDO CEREBRO - ESTADO FINANCIERO`: la categoría de alimentación registra el gasto ejecutado una vez y una conciliación bancaria pendiente. No hay movimiento bancario con ese identificador ni transferencia artificial del mismo importe y fecha en la muestra revisada. El futuro cargo de tarjeta NO debe incrementar una segunda vez el gastado al conciliarse.
- `PEDIDOS LITOS / Gastos`: la factura de transporte está una sola vez como gasto general de pago no verificado y sin asignación artificial a pedido. Conserva referencia al correo y adjunto original; las celdas de documento/carpeta Drive están vacías, pendientes de enlace tras guardar/verificar el PDF privado. Remitir esta tarea al auditor LITOS, sin asumir que se ha guardado en Drive.
- Limitación detectada: `/api/pantry` leía `Tickets` y `Precios` pero la UI solo presentaba inventario y lista de compra; los productos sin stock no resultaban visibles en esas tarjetas. Se añade proyección ligera `recentTickets` sin consultas adicionales ni datos públicos, pestaña privada Tickets y navegación a ficha de producto canónico con stock desconocido. No se crean duplicados.
- El auditor web verifica que el último ticket y sus precios coinciden con la API y que la cabecera y los precios vinculados no están incompletos. Son controles de fuente proyectada: la conciliación completa con `TicketLineas` sigue siendo responsabilidad del gestor documental, y las observaciones de precio unitario no sustituyen el importe de línea.
- La verificación automática vigente NO lee correo original, PDF, cargo bancario ni `TicketLineas`; no declarar integridad total sin esas verificaciones externas. La última lectura manual sí contrastó las cuatro líneas de la compra de hoy.
- No alterar `ASUNTOS v3.xlsx`, correo, PDFs ni datos canónicos; privacidad estricta, 0 € adicionales. Pendiente CI, deploy y auditoría posterior del último commit.

## MIDAS: dos libros Weekly ML, sin sustituir resultados (09/10/2026)

- Origen: `mamg97/midas-paper-lab`, PR #41, `strategy_comparison/report.py`. A partir de ahora hay nueve pistas `weekly_ml_demo` exclusivamente para el nuevo diario `weekly_ml_daily_state/ledger.json`, y nueve archivos `weekly_ml_legacy` con ID `weekly_legacy_weekly_ml_*`, exclusivamente del ledger de liquidación diferida `weekly_ml_state/ledger.json`.
- El motor diario prospectivo se presenta en Competición, incluso antes de recibir la primera señal: estado sin diario, NAV/retorno sin rellenar, sin bootstrap retrospectivo. Después del viernes 09/10, su primera compra paper es a la siguiente apertura bursátil y el patrimonio se valora al cierre; no reconstruye operaciones del 05/10.
- Los nueve archivos semanales están en Catálogo / histórico, sin competir ni sumarse a los retornos diarios. El rendimiento histórico semanal se presenta solo cuando el ledger contiene al menos dos observaciones de NAV semanal; la columna Última semana expresa el cambio entre esos puntos. Se conserva el ledger semanal antiguo tal como fue.
- En el Worker `private-cloudflare/src/midas.js` se acepta el nuevo grupo `weekly_ml_legacy` sin alterar la API de privacidad del genético; la UI de Competición excluye esas filas archivadas. Los tests del Worker/frontend y el auditor de producción comprueban el contrato.
- Despliegue de la UI: PR #348 en `mamg97/segundo-cerebro`. Dependencia obligatoria: fusionar PR #41 y generar primero el nuevo `strategy_state/dashboard.json` por el publicador canónico; no insertar NAV manuales ni crear ejecuciones de bróker. GitHub Actions publica el informe de forma natural durante los próximos ciclos tras el cierre, y el auditor verifica el resultado. Sin cambios en otros gestores.

## Auditoría #262 tras PR #343 · diagnóstico Finance DOM (2026-10-09)

- Despliegue privado #416 y CI #449 terminaron correctos; auditoría completa #262 corrió en producción y terminó **1.069 checks / 7 fallos**, no verde.
- Nuevo detalle con PR #343: dos fallos pertenecen a una pestaña de movimientos bancarios no seleccionada y su panel oculto; cuatro fallos adicionales FINANCE son pestañas que desaparecen del DOM durante la auditoría. El enlace privado al Sheet y los demás checks de Finanzas pasan en esa ejecución.
- El fallo final INFRA/5xx de #260 y #261 **no se reprodujo** en #262; los cuatro fallos iniciales de Home de #261 tampoco. No atribuir endpoint/CPU/OIDC sin una próxima incidencia acompañada de la clasificación segura introducida en #343.
- Se mantiene **un** fallo OTHER al final del bloque de comparaciones de datos; probable referencia de menú con catálogo Despensa, pero la categoría anonimizada por sí sola no permite certificar qué check fue. La incompatibilidad histórica `food_id` ↔ `Productos.producto_id` permanece documentada, sin fabricar fichas ni retocar consumo.
- Hipótesis para pestañas: redibujado asíncrono / falta parcial del resumen financiero; sin trazas suficiente para atribuir. Una ampliación de la espera a 3,5 s **no resolvió** la interacción. Próxima modificación es solo diagnóstico DOM de banderas: diálogo cerrado, cambiado a otro módulo, workspace ausente, catálogo de pestañas reducido, tab no seleccionada, panel oculto. Nunca se imprimen IDs, importes, cuentas ni URLs privadas.
- Prohibido corregir quitando tests o escribiendo el Sheet. Pendiente: siguiente auditoría real tras CI/deploy de instrumentación, investigar código con la bandera resultante, luego corregir en rama aislada. No lanzar bucles de auditoría.
- Contención de logs históricos: PR #340 sigue vigente; muestras de logs pre-#257 muestran datos no redactados. No se han borrado. Requiere `actions:write` y autorización explícita, preservando metadata de runs cuando sea posible.
- Integridad canónica: existen referencias de movimientos a cuentas válidas y fuente financiera vigente; persiste 1 `movement_id` duplicado en la fuente histórica (no borrar registros ni corregir sin procedencia).

## Auditorías de producción #259–#261 · Diagnóstico seguro (2026-10-09)

- Revisión de `main`, PR #340/#341/#342, CI y deploy #415. No hay un PR abierto que solucione las incidencias actuales de Finanzas/red. Dos PR antiguos (docs, UI) siguen abiertos, sin solapamiento directo.
- #259: 1.105 checks / 1 fallo. #260: 1.043 checks / 4 fallos (2 FINANCE, 1 OTHER, 1 INFRA). #261: 1.038 checks / 8 fallos (2 FINANCE, 5 OTHER, 1 INFRA). Las cuatro comprobaciones OTHER nuevas de #261 ocurren al principio de Home; su causa queda por atribuir.
- La auditoría comprueba estado activo de cada pestaña bancaria y panel correspondiente. PR #342 conserva selección en memoria, pero dos controles consecutivos aún fallan en #260/#261. Se sustituye solo la espera fija de 120 ms por una espera de estado DOM activo/visible con límite estricto de 3,5 s y se comprueban después, sin omitir ninguno de los dos controles. Es una mitigación del riesgo de lectura prematura del DOM, **no prueba de que la navegación esté sana**.
- El error INFRA es el control final de `networkFailures`, que agrupa HTTP >=500 y fallos de red. Los logs sanitizados actuales no permiten localizar el endpoint: no adjudicar causa a OIDC, Cloudflare CPU o Health sin evidencia. Se añade diagnóstico exclusivamente de **familias de rutas enumeradas y status/clase técnica**, sin URL completa, ID, contenido, cookies ni tokens. Los fallos de Home reciben códigos de allowlist para distinguir visualización/estructura real.
- **Seguridad:** PR #340 sigue en `main`; `safeAuditLog` publica solo códigos fijos. Se añadieron pruebas que intentan introducir datos privados ficticios en nombres/rutas y comprueban que las salidas son constantes seguras. PR #341 renueva OIDC antes de caducidad, sin relajar autenticación.
- **Histórico:** anteriores a PR #340, los runs #235, #237 y especialmente #256 contienen líneas FAIL sin anonimizar y algunas referencias potencialmente identificativas. No reproducir texto. La conexión GitHub actual permite GET pero no expone DELETE /actions/runs/{id}/logs; **no se ha retirado contenido**. Valorar borrado de logs históricos desde la UI/API con `actions:write`, con autorización para destruir evidencias técnicas y un inventario de los run IDs a depurar. No borrar ahora.
- **Integridad financiera read-only:** fuente `SEGUNDO CEREBRO - ESTADO FINANCIERO`, `Cuentas` y `MovimientosCuenta` presentes; cuentas con IDs únicos, transacciones con un `movement_id` duplicado (incidencia histórica previa, no tocar ni desduplicar por suposición), referencias de cuentas válidas y fecha de actividad de hoy. La UI no crea registros ni redefine cifras; discrepancia referencial sigue ÁMBAR hasta resolverla con trazabilidad.
- Seguimiento: CI, PR, deploy y siguiente auditoría horaria **pendientes** al registrar este diagnóstico. No declarar VERDE Finanzas/red sin observar sus tests operativos. MIDAS y LITOS quedan bajo gestores especializados. Privacidad y coste operativo incremental 0 € innegociables.

## Finanzas · persistencia visual de pestañas por cuenta · 2026-10-09

- Auditoría completa #257 después de contener el riesgo de logs: 1.043 controles, 4 fallos con códigos no identificativos; dos pertenecen a las pestañas de Finanzas, sin volcar datos reales a GitHub.
- Diagnóstico técnico: `renderAccountTransactionsWorkspace` elige siempre la primera cuenta con histórico al reconstruir el diálogo; `initializeAccountTransactionTabs` toma esa selección inicial y puede revertir la pestaña elegida durante un refresco asíncrono. No es una pérdida ni alteración de `MovimientosCuenta`.
- Mitigación reversible: guardar en memoria de la interfaz únicamente el ID de pestaña seleccionada y restaurarlo después del rerender si aún existe. No se modifican importes, movimientos, fuentes o navegador persistente. Si esa cuenta ya no está disponible, vuelve a la selección inicial válida.
- Test de regresión: verifica selección actualizada en el click, selección preservada después de reconstruir DOM, y fallback seguro. Verificar en navegador de producción tras CI/deploy, sin desactivar auditoría ni inventar datos.
- Continúan separados: posible 502 transitorio en Health/Objects y referencias canónicas Nutri/Despensa, cuyo arreglo no corresponde a este PR.

## Auditoría de producción · privacidad de logs y renovación OIDC · 2026-10-09

- **Privacidad P1:** el auditor anterior escribía nombres y detalles derivados de DOM/API privados en los logs de GitHub Actions. Auditoría #256 mostró al menos una referencia potencialmente identificativa en fallos de imágenes; no reproducirla en documentación ni issues. PR #340 cambió el logging a códigos correlativos y categorías de una lista cerrada, preservando todas las comprobaciones; CI #446 y despliegue privado #413 correctos. Los logs anteriores a #257 no se borran por esta modificación y requieren limpieza separada de run logs mediante GitHub Actions API con permiso `actions:write` o por UI, sin eliminar datos canónicos. La conexión Github de esta conversación no expone la acción DELETE de logs; evitar reclamar limpieza sin evidencia.
- **401 en auditoría #256:** 11 fallos HTTP 401 de imágenes se produjeron agrupados unos 374 segundos después de emitir el único token OIDC temporal de la ejecución. Esto es compatible con caducidad de sesión del *auditor*, no con corrupción de once archivos. La auditoría #255 terminó en menos de cuatro minutos y no mostró esta cascada.
- **Corrección aislada:** `private-cloudflare/scripts/audit-oidc-renewal.mjs` renueva proactivamente el token usando el endpoint OIDC temporal de GitHub Actions dentro del proceso, con margen de expiración y deduplicación de solicitudes concurrentes. El navegador añade solo el token vigente en la petición al gateway. Fallos de renovación producen código fijo, nunca valores de tokens o mensajes upstream. Los permisos existentes `id-token: write` se mantienen.
- **Pruebas:** renovación antes de expirar, ausencia de renovación innecesaria, concurrencia, fallo seguro sin mensajes privados y enlace de las rutas del navegador con proveedor de token. CI obligatorio. No cambiar el control de autenticación del gateway ni conceder acceso público al Worker.
- **Pendiente:** verificar auditoría completa tras el merge, especialmente ausencia de nuevos 401 a partir del minuto 5. Los HTTP 502 de Health/Objetos ocurridos antes de la expiración requieren diagnóstico independiente, no afirmar que están resueltos. Verificar cadencia real antes de crear o relanzar ejecuciones completas.

## MIDAS · Verificación conjunta de tesis y etiquetas metodológicas · 2026-10-09

- Fuente privada única: `MIDAS - TESIS Y WATCHLIST`, pestañas `TESIS`, `CAGR2031`, `SEGUIMIENTO`, consultadas por `private-cloudflare/src/midas.js`. Se comprobaron las cuatro referencias de seguimiento activas: ADBE v1.2/régimen IA, META V6/estadística histórica, MSFT v1.2/estadística histórica y PLTR v1.2/FCF operativo. PLTR conserva v1.1 en `PLTR_V12_REVIEW`. No colocar datos reales de hojas en fixtures ni código público.
- Incidencia detectada: la tabla describía de forma genérica `V6 · media histórica` a todas las empresas, cuando existen regímenes de múltiplo diferenciados. Se actualiza únicamente la UI mediante `midasThesisMethodLabel`, derivado de la columna `CAGR2031.estado`; se muestra una etiqueta por método y se corrige la leyenda global. Ordenación y cifras mantienen el contrato vigente.
- Pruebas `app/midas-thesis-table.test.mjs` incluyen status v1.2-IA, FCF operativo, media histórica y V6 con etiquetas correctas; método sin clasificar no obtiene etiqueta engañosa. Cache bust para JS sin cambiar estilos, secretos o Worker. No se alteran portfolios, algoritmos o fuentes.
- Limitaciones: esta prueba reproduce la composición de datos de una API privada a partir de su contrato, no constituye QA visual de Cloudflare Access. Validar en despliegue privado y auditoría de producción posterior; si fallan CI/deploy, no etiquetar el trabajo como entregado en producción. Los gates económicos/peers/insiders de las tesis siguen abiertos y separados de esta corrección de presentación.

## MIDAS · integridad de competición y telemetría · 2026-10-09

- Repo `mamg97/segundo-cerebro`: PR #336 fusionada (commit `614a3c2f28b4d67901560ae85f94a7b9fa8200af`). En competición se excluye el genético heredado no ejecutable (se conserva en Catálogo/histórico); su rentabilidad histórica sigue accesible pero nunca lidera ranking prospectivo. El genético corregido mantiene su NAV privado pero la actividad figura explícitamente no disponible: no se infiere efectivo/ausencia de compras. Weekly ML anterior al motor diario no muestra rentabilidad diaria ficticiamente realizada; se conserva la señal. La clasificación acumulada declara los diferentes inicios, y el encabezado ya no confunde diario/señales con resultados.
- Contratos: `private-cloudflare/src/midas.js` preserva `daily_mode` y consulta `strategy_runtime/weekly_ml_daily.json`; `midas-health.js` audita por separado la cadencia diaria y la semanal. La UI nunca trata un snapshot de NAV genético como prueba de éxito de GitHub Actions; muestra cobertura parcial hasta disponer de atestación real del workflow privado. No publicar tickers privados en el repo ni conectar brokers.
- Repo `mamg97/midas-paper-lab`: PR #40 fusionada (commit `713b7b4af86a8cfef728746fe1d639c22d79d3db`), configura identidad de Git persistente para el commit/rebase de las revisiones de Buy The Dip y corrige singular/plural para órdenes, señales y posiciones. La ejecución semántica anterior generó un resultado, pero el rebase falló y ese episodio aún no figura en el estado canónico; no contabilizarlo sin observar un nuevo fichero review + contador.
- Despliegue de #336 detenido por gate `private-cloudflare/tests/midas.test.mjs` que exigía seis probes cuando ahora son siete. PR #337 actualiza dicha prueba, valida el séptimo workflow y renueva la versión de caché de frontend; requiere CI, despliegue Cloudflare privado y auditoría de producción real antes de marcar la entrega visual como cerrada.
- La salud de workflows no acredita por sí sola la fecha más reciente del ledger ni los fills. Mantener `missing_decision_sessions` históricos intactos y no reconstruir sesiones, posiciones o rentabilidades. LITOS, fuentes de finanzas/salud y demás gestores fuera de alcance.

## MIDAS · competición unificada y ordenable · 2026-10-09

- Solicitud: sustituir siete tablas por bloques por **una única tabla de algoritmos** con columna `Bloque`, ordenación asc/desc por cada cabecera al estilo de Seguimiento de tesis y diseño compacto sin scroll horizontal innecesario.
- Implementación frontend `app/midas-lab.js`: ocho columnas (Algoritmo, Bloque, Actividad actual, Activos, Rent. acum., Sesiones, Último cierre, DD). Arranque por rentabilidad acumulada descendente; valores desconocidos/pendientes quedan al final. Se reutiliza el comparador común de tesis y se conservan todas las filas y sus fichas internas, señales pendientes, etiquetas de bootstrap y curvas completas.
- Responsive: tabla de escritorio con ancho flexible; en móvil las mismas filas se adaptan a tarjetas de dos columnas y se dispone de selector de columna/sentido sin scroll horizontal forzado. Sin reducir la tipografía de los datos.
- Auditoría de producción ampliada (read-only): exige una sola tabla, ocho cabeceras, ordenación real de retorno y bloques, ausencia de overflow escritorio y apertura del detalle. Las pruebas unitarias cubren valores negativos, pendientes, empates y fechas.
- No se modifica ningún dato, algoritmo, ledger, cálculo, endpoint ni ejecución de MIDAS, ni se introduce infraestructura de pago.
- **Cerrado/verificado 09/10:** PR #334 fusionado (commit `6dd3afdf97a2830d2defa620d0bca9b41f38f4ef`); CI #436 `success`; despliegue privado #408 `success`; auditoría de producción #252 (1037 checks, 3 fallos globales ajenos a MIDAS) confirmó una única tabla para 7 bloques, 8 columnas ordenables, orden asc/desc real, pendientes al final, 27 filas clicables y detalle completo. En escritorio el contenedor midió `clientWidth=1014` y `scrollWidth=1014` (sin desplazamiento lateral). Móvil usa CSS responsive y selector probados en tests, pero no se ha realizado una validación visual browser específica de MIDAS móvil. Los 3 fallos globales son 2 checks de Finanzas (sheet/pestañas) y 1 referencia de food_id en Despensa; sin relación con este cambio.

## Auditor web · evitar cancelación de auditorías completas · 2026-10-08

- Auditorías #238, #240 y #242 quedaron canceladas por el grupo de concurrencia de GitHub Actions cuando otra auditoría (horaria o postdeploy) fue puesta en cola. `cancel-in-progress: true` impedía obtener evidencia completa incluso con navegador correctamente iniciado.
- Corrección segura: el grupo de concurrencia se mantiene único, pero pasa a `cancel-in-progress: false`, encolando la ejecución nueva en lugar de interrumpir la iniciada. La comprobación backup de cadencia sigue siendo ligera cuando existe una primaria reciente; no se crean workflows ni servicios.
- Test automatizado evita volver a activar cancelación de runs completos y preserva horarios primary/backup y step `Navigate and audit production`.
- En términos de integridad y coste, un paso `Navigate and audit production` realmente completado (success o failure con checks) es superior a un slot cancelado/no ejecutado. Registrar explícitamente que una auditoría cancelada no cuenta como validación. Evitar relanzamientos manuales en bucle.

## Cierre parcial de producción · auditoría completa #241 · 2026-10-08

- Despliegues privados #402, #403, #404 y sus pruebas CI respectivos confirmados exitosos. Auditoría completa #239 registró siete fallos; la #241 (commit tras streaming D1) terminó con cinco de 1055 checks, sin 5xx de Health/Objetos y con Finanzas, Gym, barras nutricionales, enlaces y mobile-history correctos. Un pase sin 502 no demuestra ausencia permanente de fallos intermitentes.
- Los fallos de #241 se reparten en dos cadencias de MIDAS (fuera del ámbito de Organizador), una relación incompleta de food_id a Pantry (requiere decisión canónica), y dos checks de carga asíncrona de Armario/Looks en mobile-wide 440px; ese mismo Armario pasó en desktop, tablet y mobile 390px.
- Se refuerza el auditor mobile-wide para esperar la rejilla realmente renderizada (no una espera fija) y permitir **un único reintento read-only** si /api/objects responde bien. No omitir pruebas: si el grid o la pestaña Looks no aparecen tras ese intento se conserva FAIL, y siguen obligatorios el número de columnas, las imágenes y el historial.
- Verificar CI, despliegue y nueva auditoría completa tras esta última modificación. No regenerar originales ni alterar datos canónicos.

## Integridad referencial privada · muestras read-only · 2026-10-08

- Comprobación limitada a las fuentes privadas existentes, sin añadir ni corregir ninguna fila. El auditor de producción por sí solo no demuestra integridad de fuentes.
- Finanzas: seis identidades de cuenta únicas y relaciones de los movimientos muestreados contra cuentas existentes, pero un identificador de movimiento está repetido en dos filas con campos de negocio coincidentes y metadatos de importación diferentes. **INCIDENCIA ABIERTA**: requiere reconciliar el lote/registro con el gestor financiero antes de considerar cualquier deduplicación. No calcular un saldo nuevo ni borrar filas.
- Nutrición: el catálogo `Recetas` no presenta claves duplicadas en el rango leído, pero `MenuSemanal` contiene una referencia a `recipe_id` que no existe en el catálogo y una referencia de `food_id` que no corresponde a `Productos` de Despensa. En el último caso existe una entrada personal heredada en `Comidas`; su identidad comercial o no comercial debe resolverla el gestor de Salud/Despensa. **INCIDENCIAS ABIERTAS**: no completar ni inventar recetas/productos/IDs por coincidencia difusa.
- Despensa: ningún `producto_id` duplicado en la muestra de Productos; solo indica unicidad en la muestra inspeccionada, no integridad histórica garantizada.
- Privacidad: el repositorio principal tiene visibilidad pública; registrar únicamente defectos agregados/contratos en este handoff, nunca identificadores privados de movimientos, cuentas, salarios, consumos, datos médicos, contenidos de correo ni valores reales de fuentes canónicas.
- Estado: **DESCONOCIDO** para integridad general completa (requeriría validación de todas las fuentes). **ROJO** para los defectos de referencias confirmados. No modificar fuentes canónicas desde el auditor técnico.

## Objetos · mitigación CPU/memoria en imágenes D1 · 2026-10-08

- Auditores #236–#237 registraron HTTP 502 intermitentes al servir imágenes privadas de Looks, alguna miniatura y errores de red; #237 también encontró un 502 en Health Overview. La causa de cada 502 NO quedó probada por los logs del navegador: no afirmar resuelto solo por CI.
- Hipótesis técnica verificada en código: al servir assets de varios chunks, `objects-media-d1.get()` hacía una nueva concatenación y copia completa del recurso (además de la respuesta), contribuyendo a CPU y memoria de Workers Free.
- Mitigación reversible: lecturas autenticadas de imágenes Objetos y Looks solicitan `{stream:true}` al almacén D1 y responden con chunks ordenados sin volver a concatenarlos. La API interna por defecto mantiene Uint8Array para procesamiento. Se verifica orden, conteo y suma exacta de bytes antes de servir; corrupción sigue fallando de forma segura.
- Tests: paridad exacta de bytes stream-vs-lectura original, lectura regular sin cambios, detección de truncamiento, almacenamiento inalterado. Los originales y derivados válidos no se regeneran ni modifican.
- Pendiente: comparar 502/errores HTTP y uso CPU real después de CI, deploy y auditoría completa. Los errores ajenos a procesamiento D1 (QUIC/Workers 1102/conectividad) pueden persistir.

## Finanzas · recuperación del workspace bancario · 2026-10-08

- Auditoría #237 no detectó enlace al Sheet financiero ni pestañas de cuentas, aunque ambos componentes siguen definidos en el frontend.
- Comprobación read-only de la fuente privada: `Cuentas` y `MovimientosCuenta` están presentes y contienen registros. No se copiaron saldos, movimientos ni identificadores personales al repositorio.
- Causa de presentación a comprobar en producción: el diálogo de presupuesto ocultaba por completo el workspace si su estado inicial estaba ausente/vacío, y no ofrecía recuperación por dominio. Se añade recuperación de lectura on-demand usando el endpoint privado `/api/state?scope=finance` solamente si faltan datos en UI, con resultado explícito si la fuente sigue inaccesible; se muestra el workspace aunque solo existan transacciones sin categorías/filas de liquidez.
- Sin escrituras a fuentes canónicas, sin suposiciones de saldos y sin exponer datos en Pages. Tests estáticos + CI y despliegue obligatorios; mantener incidencia ámbar hasta verificar las pestañas/enlace en navegador privado.
- `MenuSemanal` contiene el `food_id` privado sin correspondencia con `Productos`, que no aparece en la pestaña canónica `Productos` de Despensa. Es una discrepancia referencial real; no crear alias/producto artificial sin intervención del gestor Despensa.

## ORGANIZADOR · auditorías de producción #235–#237 · 2026-10-08

- Se inspeccionaron auditorías completas #235, #236 y #237 (25, 22 y 25 fallos); CI/deploy verdes no equivalen a producción verde.
- Contratos revisados: AGENTS, ARCHITECTURE, DATA_MODEL, DECISIONS, PRIVACY, WEB_AUDIT y agentes FINANCE/HEALTH/PANTRY/OBJECTS.
- Correcciones de frontend/auditor sin tocar Sheets ni D1 canónicos: esperar terminación de carga asíncrona Gym antes de verificar controles; validar barras kcal/proteína contra consumo confirmado exclusivamente (el plan no equivale a comida consumida); comprobar también enlaces Home de recetas con recipeId aunque el objeto receta tenga carga diferida; ofrecer enlaces separados a receta y producto cuando una fila posee ambos IDs; ajustar espaciados del historial móvil sin reducir tipografía.
- Auditoría no debilitada: los controles de Gym siguen siendo obligatorios; los metros siguen requiriendo anchura y color correctos para el consumo confirmado; la navegación a Despensa sigue obligatoria para cada producto enlazado; se añaden tests de contrato.
- Pendientes de validación real: fallos 502 intermitentes de imágenes Objetos y /api/health/overview, ausencia de workspace financiero en #237, food_id no enlazado a Despensa (no modificar canónicos sin evidencia), ritmo de auditorías programadas y discrepancias de snapshot entre API/UI. Investigar sin regenerar imágenes ni inventar consumos.
- Los fallos MIDAS de cadencia weekly ML/TFG corresponden a su auditor especializado; evitar trabajo concurrente o simulación de fills.
- Verificar CI, deploy, y nueva auditoría completa antes de reclasificar como VERDE; si la fuente privada no es verificable, mantener DESCONOCIDO.

## MIDAS · Referencia V6 activa por decisión del usuario · 2026-10-08\n\n- Cambió la fuente canónica: columnas `CAGR2031!F:H` y `SEGUIMIENTO!G:J` muestran ahora el escenario estadístico V6 de media histórica EV/FCF IDC como referencia principal; V5 queda archivada en `CAGR2031!Y:AG`. \n- Segundo Cerebro debe tomar los objetivos V6 desde las columnas principales, etiquetándolos “V6 · media histórica”; el contraste económico IDC/DCF continúa pendiente sin invalidar el uso de la referencia estadística elegida. \n- El Worker lee `CAGR2031!A:AG`, entrega `historical` opcional y el frontend muestra el Base V5 solo como nota histórica. No se hardcodean cifras de empresa en el código de producción. \n- No afirmar que V6 tiene todos los gates económicos superados ni que el source pack original está archivado.\n\n## MIDAS · Valuación estadística provisional separada de la tesis publicada · 2026-10-08

- Fuente: `MIDAS - TESIS Y WATCHLIST`, pestaña `CAGR2031`; los campos históricos F:N mantienen la tesis publicada y los nuevos campos O:X aportan estadísticas v1.2 y el estado `PROVISIONAL`.
- `private-cloudflare/src/midas.js` consulta ahora `CAGR2031!A1:X500` y expone un objeto opcional `statistical`. Si no hay estadística completa etiquetada como provisional, no reemplaza valores de la tesis histórica.
- `app/midas-thesis-table.js` elige solo para la vista los escenarios provisionales completos, sin mutar los datos publicados. `app/app.js` usa esa vista para ranking y columnas de precio/CAGR, señala “Estadístico provisional” y presenta el Base V5 anterior como comparación. Sin cifras reales ni información privada hardcodeada.
- Cambios limitados a MIDAS: no alterar algoritmos, otras empresas, finanzas personales ni contratos de origen. Verificar CI y deploy automático del PR, y no declarar verificación visual de Cloudflare Access hasta tener evidencia de producción. Si aparece una discrepancia, comprobar que `/api/midas` sirva `statistical` y que la vista use esos campos tras actualizar caché.
- La ratificación económica y el Source Pack SEC/IR pertenecen al proyecto de tesis; mostrar una sensibilidad provisional NO supera el Publication Gate V6.

## MIDAS · Corrección de doble inicialización y META V5 · 2026-10-08

- Fuente MIDAS confirmada: Google Sheet privado `MIDAS - TESIS Y WATCHLIST` contiene el estado y enlace canónicos de META V5. No copiar cotizaciones, targets ni CAGRs reales a Git; al abrir MIDAS, el endpoint privado debe proyectar el Sheet.
- Frontend: se retira una segunda llamada duplicada a `bindMidasResearchSorting(root)` en `bindMidasWorkspace()`; se mantiene una única inicialización que ordena por CAGR Base descendente y permite cabeceras/búsqueda. Prueba específica evita la regresión y `app.js?v=0.43.5` fuerza carga de nueva versión.
- QA pendiente hasta ejecutarse en la instancia privada tras deploy: META aparece con V5, MSFT y PLTR con CAGR negativo ordenable, pendientes al final, búsqueda/toggle sin doble listener y responsive. CI/deploy no equivalen a certificación visual en Cloudflare Access; inspeccionar el auditor `Audit production web`.
- Documentación oficial META: indexada pero carpetas de raw `01_FILINGS`, `02_EARNINGS_RELEASES`, `03_TRANSCRIPTS` y `04_PRESENTATIONS` aún vacías a 08/10. No declarar Source Pack físicamente archivado hasta que lo esté; no afecta los escenarios vigentes.

## MIDAS · Seguimiento de tesis — ordenación por CAGR y MSFT · 2026-10-08

- Petición: la tabla privada `MIDAS > Seguimiento de tesis` debe iniciar con **CAGR Base descendente** y permitir ordenar ascendente/descendente al pulsar cada cabecera; búsqueda rápida por ticker o empresa.
- Diagnóstico confirmado contra el Sheet canónico `MIDAS - TESIS Y WATCHLIST`: MSFT aparece en `TESIS` (estado COMPLETA), `CAGR2031` (Base `−1,22%`) y `SEGUIMIENTO` (Base FY2031 495,06 USD, P15 246,13). La interfaz `app/app.js` parseaba negativos con guion `-` pero no U+2212 `−`; trataba MSFT como CAGR no numérico y lo relegaba al final. **No falta la empresa ni se debe duplicar en el Sheet.**
- Implementación preparada en `fix/midas-thesis-sort-20261008`: `app/midas-thesis-table.js` parsea Unicode, compara valores y da ordenación accesible por cabecera; `app/app.js` utiliza estos cálculos y muestra tabla ordenable + búsqueda; `app/styles.css` añade estilos compactos; `app/index.html` renueva versiones de assets; `app/midas-thesis-sort.test.mjs` prueba `−1,22%`, orden relativo MSFT/PLTR y casos sin dato. Se conserva el endpoint `GET /api/midas` y el origen Sheets, sin hardcodear empresas ni modificar valores.
- **Entrega técnica 08/10:** PR #325 fusionada en `main` (commit `074d7f7fd8b6c29bbc11a866d624c7d7f87b73c4`); CI `Validate private Cloudflare app` PASS (workflow run `37757407036`); despliegue privado Cloudflare PASS (workflow run `37757522114`). **Aún falta QA visual funcional dentro de Cloudflare Access:** recargar la web, comprobar que MSFT aparece inmediatamente antes de PLTR al ordenar Base desc, pulsar las cabeceras dos veces, filtrar por `MSFT`, comprobar valores faltantes/móvil y pasar la auditoría de producción cuando proceda. No confundir el deploy PASS con verificación visual de la pantalla.
- **Contexto del chat:** `MIDAS — ORGANIZADOR DE TESIS` pasa a continuación `SEGUIMIENTOS TESIS 2`. Este repositorio documenta el lado web/Segundo Cerebro. El método y estado de las tesis vive en el privado `mamg97/personal_mamg/MIDAS_GIT/` y las cifras oficiales exclusivamente en Google Sheet `MIDAS - TESIS Y WATCHLIST`.

## HabitQuest · toggle inmediato sin doble clic · 2026-10-07

- Incidencia observada: al pulsar un hábito pendiente, Google Sheets sí registraba el cambio, pero la UI podía seguir mostrando el valor anterior durante unos segundos.
- Evidencia real: `1 h formación` (`kx8yj8fj`) escribió `count=1` a las 18:57:10Z y, tras un segundo clic porque la pantalla seguía en `0/1`, escribió `count=0` a las 18:57:26Z.
- Causa: tras el append a `SyncState`, el Worker hacía una lectura inmediata de Sheets; esa lectura puede devolver brevemente el snapshot anterior. El frontal confiaba en ese resumen stale y no en `count`, que sí era la transición autoritativa confirmada por el POST.
- Corrección: el frontal reconcilia siempre el resumen devuelto con el `count` autoritativo antes de renderizar. Así un segundo clic ya no es necesario ni puede deshacer accidentalmente el primer cambio.
- Los errores de escritura dejan de fallar en silencio: se muestra un aviso visible y el Worker conserva códigos sanitizados de permisos/limitación.
- No cambia la fuente canónica: `HabitQuest Data` / `SyncState` sigue siendo la verdad; no se crea estado paralelo.

## Infraestructura · refresh incremental por dominio · 2026-10-07

- El botón global `Actualizar` deja de ejecutar `window.location.reload()`: ya no vuelve a cargar toda la aplicación, assets y estado compuesto por una actualización ordinaria.
- `GET /api/state?scope=<dominio>` permite refrescar de forma independiente `finance`, `habits`, `pantry`, `objects` y `calendar`.
- El frontal aplica cada respuesta únicamente al bloque correspondiente y lo vuelve a renderizar; Proyectos/Carrera y otros detalles siguen cargándose bajo demanda al abrirse.
- Salud y Menú conservan sus endpoints dedicados y se refrescan aparte; no se mezclan con el presupuesto de CPU de Finanzas/Calendario.
- El refresh manual se ejecuta en pequeños lotes para evitar una ráfaga única contra Google y, sobre todo, para que un dominio lento no invalide el resto.
- La carga inicial `GET /api/state` se conserva por ahora porque tras PR #316 volvió a cargar Home correctamente; esta mejora reduce trabajo repetido sin sustituir una ruta que ya está estable.
- Objetivo: respetar Workers Free, privacidad y coste 0 €, aislando CPU y fallos por dominio.

## Infraestructura · límite CPU Free y eliminación de polling legacy · 2026-10-07

- Cloudflare notificó que Workers Free había superado el límite de CPU por ejecución 100+ veces en 24 h.
- Restricción permanente: privacidad + coste operativo incremental 0 €; no se usa Workers Paid como solución.
- Se identificó un polling heredado de OBJETOS en el Worker principal: `wrangler.bootstrap.jsonc` ejecutaba `* * * * *` y `scheduled()` leía `ImageIngestQueue` cada minuto aunque el flujo canónico actual usa el bridge directo.
- Se retira ese cron y el handler legacy, eliminando hasta 1.440 invocaciones/día que no aportaban funcionalidad vigente.
- Las lecturas D1 de imágenes de un único chunk usan fast-path sin reconstruir/copiar el asset completo; beneficia especialmente miniaturas y looks pequeños.
- `/api/state` deja de esperar la migración/persistencia derivada de Eventos en cada GET: responde con el estado compuesto y agenda ese mantenimiento mediante `waitUntil`, limitado a una vez cada 5 minutos por isolate.
- La lectura redundante de `eventsSummary` al final de `/api/state` se elimina; se reutiliza el resumen ya obtenido de la fuente de Eventos.
- Los presupuestos de espera de calendarios dentro de `/api/state` bajan a 7 s y el timeout live de iCloud a 5,5 s para conservar margen respecto al timeout de 9 s del navegador y permitir degradación/fallback en vez de abortar todo Home.
- No cambia ninguna fuente canónica, privacidad ni contrato de imágenes.
- Validación inmediata cerrada: PR #315 fusionada; CI y deploy privados pasaron. PR #318 añadió refresco incremental por dominio, con CI #406 y deploy privado #394 correctos. Audit production web #222 cargó el estado privado, Google Calendar y los módulos principales sin registrar respuestas 5xx, `1102`, `requestfailed` ni fallos de CPU. El auditor global quedó rojo por 23 comprobaciones funcionales/visuales ajenas a esta incidencia (Gym, barras Nutrición, un enlace de alimento sin correspondencia canónica y compactación móvil de historial). La confirmación de largo plazo requiere observar si Cloudflare repite el aviso de CPU durante las siguientes 24 h.

## Agenda · federación iCloud + Google Calendar · 2026-10-07

- La agenda semanal deja de depender únicamente de iCloud/CalDAV: `/api/state` fusiona iCloud y Google Calendar antes de entregar `state.events`.
- Google Calendar se lee con el OAuth privado existente y requiere `calendar.readonly`; se enumeran todos los calendarios legibles y se expanden recurrencias en horizonte de 550 días.
- La fusión deduplica copias equivalentes por título normalizado + inicio + fin y mantiene prioridad iCloud cuando el mismo evento existe en ambos proveedores.
- Google dispone de last-known-good privado en D1, igual que iCloud, y `/api/health` separa `icloudCalendarSync` / `googleCalendarSync`.
- La UI de Agenda muestra ambos proveedores y marca sincronización parcial si uno falla.
- Los cursos, clases y otros compromisos ordinarios aparecen en Agenda sin convertirse por ello en filas de `SEGUNDO CEREBRO - EVENTOS`; el Sheet sigue reservado a estado/crónica operativa e importantes.
- El auditor de producción exige Google Calendar operativo y visible en el indicador de fuente.
- OAuth Google Calendar resuelto: se habilitó Google Calendar API en el proyecto OAuth, se reautorizó la credencial con `calendar.readonly` y el helper validó la lectura real antes de sustituir `GOOGLE_REFRESH_TOKEN` en Cloudflare.
- `npm run google:reauthorize-calendar -- /ruta/authorized_user.json` queda como procedimiento seguro de recuperación futura; no imprime ni versiona secretos.
- Estado operativo esperado: Agenda federada iCloud + Google activa; el siguiente auditor debe confirmar `googleCalendarSync != error` y mantener visible Google en el indicador de fuente.

## MIDAS · workspace por bloques y tablas compactas · 2026-10-07

- Seguimiento MIDAS se organiza en tres pestañas superiores: `Competición de algoritmos`, `Seguimiento de tesis` y `Catálogo / histórico`.
- Competición elimina la columna mini-gráfica `Evolución`; conserva Algoritmo, Actividad actual, Activos, Rentabilidad acumulada, Sesiones, Último cierre y DD.
- Cada fila de algoritmo es clicable/accesible y abre una ficha dentro de MIDAS con rentabilidad acumulada/diaria, volatilidad, drawdown, Sharpe, sesiones, último cierre, capital demo, actividad, posiciones y curva completa. `Volver a la competición` restaura la tabla.
- Seguimiento de tesis conserva las 11 variables de decisión pero usa encabezados abreviados y reparto porcentual de columnas; elimina el ancho mínimo artificial de 1600 px para evitar scroll horizontal en escritorio.
- En móvil las tablas pueden conservar scroll horizontal cuando sea necesario; no se eliminan variables para forzar el encaje.
- No cambia ninguna fuente, cálculo ni endpoint MIDAS; es una reorganización de navegación y presentación sobre el mismo `GET /api/midas`.
- PR #310 fusionada y desplegada. CI `Validate private Cloudflare app` #393 pasó completa y el deploy privado #387 finalizó correctamente.
- Audit production web #215 validó específicamente: 3 pestañas, 27 algoritmos clicables, tabla de competición sin `Evolución`, apertura de ficha completa, métricas + curva, pestañas Tesis/Catálogo y tabla de tesis sin scroll horizontal en escritorio (`clientWidth=1020`, `scrollWidth=1020`).
- El auditor global #215 quedó rojo por incidencias separadas —502 en Carrera/Objetos/Health y fallos derivados de esas fuentes—; los checks específicos del rediseño MIDAS pasaron.

## MIDAS · seguimiento de empresas orientado a decisión · 2026-10-07

- La vista de tesis pasa de una tabla de CAGR aislada a una tabla de seguimiento por empresa.
- Fuente privada: `MIDAS - TESIS Y WATCHLIST`; `TESIS` mantiene identidad/tesis/documento, `CAGR2031` conserva los escenarios y la nueva pestaña `SEGUIMIENTO` guarda mercado, divisa, precio de referencia, precio actual, objetivos a 5 años, precio de entrada para 15% anual y próximos resultados.
- Columnas visibles: Ticker, Nombre empresa, Mercado, Precio actual, Bull 5a, Bear 5a, Caso central 5a, Precio para generar 15% anual, Precio objetivo 5a, Fecha próximos resultados y enlace al Google Doc de la tesis.
- Los objetivos a 5 años pertenecen a la revisión vigente y no se recalculan al moverse la cotización. Si faltan precios objetivo explícitos, el backend puede derivarlos una vez desde el precio de referencia del estudio y su CAGR; nunca desde el precio actual cambiante.
- `Precio para generar 15% anual` usa el objetivo central: `objetivo_base_5a / 1.15^5`.
- Cada fila enlaza al documento canónico individual de Drive mediante `TESIS.artefacto_drive`.
- Los datos no reconstruidos permanecen vacíos/pendientes; no se inventan para rellenar la tabla.

## Carrera profesional · fuente privada y vista dedicada · 2026-10-07

- Carrera deja de depender del fallback genérico del área y pasa a tener una vista propia orientada a decisiones.
- Fuente canónica privada: `SEGUNDO CEREBRO - CARRERA`, con Perfil, Oportunidades, Organigrama, Compensacion, Activos, Objetivos y Decisiones.
- Los datos profesionales reales permanecen fuera de Git; la demo usa fixtures sintéticos.
- El Worker resuelve la fuente por OAuth/título exacto (o `CAREER_SHEET_ID` opcional), expone `GET /api/career` y añade a `/api/state` solo un resumen de estado.
- La vista prioriza posición actual, rutas profesionales, compensación con separación hecho/estimación, contexto organizativo, readiness de activos, decisiones y objetivos.
- Finanzas sigue siendo autoridad de ingresos contabilizados; Carrera usa compensación únicamente como contexto de negociación y elección.
- PR #305 fusionada en `main`; CI `Validate private Cloudflare app` #389 pasó completa.
- Deploy privado #384 y Pages #604 finalizaron correctamente tras el merge.
- La fuente privada fue creada y verificada mediante lectura directa del Sheet; la vista ya está desplegada con separación estricta entre datos reales privados y fixtures públicos.

## Salud · Balance calórico ampliado a 30 días · 2026-10-07

- PR #303 fusionada y desplegada: Salud → Resumen amplía la gráfica divergente de balance calórico de 7 a 30 días.
- `GET /api/health/overview` expone 30 registros diarios de `nutritionHistory`; no cambia ninguna fuente canónica ni la fórmula `ingesta - gasto`.
- La gráfica conserva eje 0, déficit negativo verde, superávit positivo rojo y días incompletos sin barra.
- Para evitar saturación visual, solo algunos días de referencia muestran etiqueta/valor de forma persistente; cualquier barra expone el detalle exacto mediante hover/foco.
- En viewports estrechos la gráfica mantiene las 30 barras y usa scroll horizontal contenido en vez de comprimirlas hasta hacerlas ilegibles.
- Audit production web #207 validó específicamente: API con 30 días, UI con 30 barras, correspondencia UI/API de los 30 registros más recientes y `overflow-x: auto`.
- El auditor global #207 sigue rojo por incidencias separadas —MIDAS, solapes de Finanzas, imágenes de Objetos y un 500 transitorio de `/api/health/overview`—; los checks específicos de esta ampliación pasaron.

## Salud · Adherencia integrada en Resumen · 2026-10-07

- PR #301 fusionada y desplegada: Adherencia deja de ocupar una pestaña superior propia en Salud.
- `Salud → Resumen` incorpora un bloque mensual compacto con porcentaje de adherencia, cobertura, cumplidos, parciales, no cumplidos, racha actual y estado/motivos de hoy.
- `Ver mes completo` despliega dentro del mismo Resumen el calendario mensual y el detalle diario existentes.
- La carga es secuencial para preservar la resiliencia: primero `/api/health/overview`, después `/api/health/adherence` y después el histórico; no se reintroduce la ráfaga simultánea corregida previamente.
- Compacto y detalle reutilizan el mismo payload mensual; abrir el calendario no vuelve a consultar la fuente si ese mes ya está cargado.
- Audit production web #206 validó en producción: ausencia de la pestaña superior, bloque compacto, métricas clave, acción de detalle, calendario mensual y detalle diario.
- El auditor global #206 sigue rojo por incidencias separadas —MIDAS, solapes de Finanzas, imágenes de Objetos y un 500 transitorio de `/api/health/overview`—; los checks específicos de Adherencia pasaron.
- No cambia la fuente canónica ni la fórmula de adherencia.

## Salud · balance calórico gráfico · 2026-10-07

- Integración funcional cerrada: PR #295 añadió el balance diario, PR #296 estabilizó la carga del workspace y PR #299 sustituyó la tabla por una gráfica divergente.
- Producción validada por Audit production web #205 sobre el código desplegado:
  - `/api/health/overview` responde y expone 14 días de `nutritionHistory`;
  - Salud → Resumen muestra la gráfica `Balance calórico`;
  - aparecen exactamente 7 días alrededor de un eje 0;
  - cualquier balance negativo se clasifica como déficit verde;
  - cualquier balance positivo se clasifica como superávit rojo;
  - los días incompletos permanecen sin barra y el día actual sigue marcado como provisional.
- Los checks específicos de esta capacidad pasan en producción; la integración se considera publicada y operativa.
- El auditor global #205 quedó rojo por incidencias ajenas a esta gráfica —entre ellas un aborto transitorio de `/api/state` y workflows MIDAS fallidos—. No deben reinterpretarse como fallo del balance calórico.

## Salud · resiliencia de lectura tras balance calórico · 2026-10-06

- Incidente detectado tras PR #295: el primer `/api/health/overview` respondía 200 y exponía `nutritionHistory`, pero al abrir Salud la UI lanzaba simultáneamente `overview`, `nutrition`, `gym` y `appointments`; durante esa ráfaga aparecían 5xx transitorios y el Resumen podía quedar vacío.
- Corrección:
  - Salud abre solo con `/api/health/overview`;
  - Médicos y Gimnasio cargan al entrar en su pestaña;
  - Nutrición/Recetas/Menú comparten una única carga diferida de `/api/nutrition`;
  - el Resumen deja de pedir `/api/gym` en paralelo porque `/api/health/overview` ya lleva el resumen de gimnasio;
  - `fetchHealthHistory` reutiliza el snapshot nutricional y ya no fuerza una segunda lectura completa de Google;
  - caché Health ampliada a 60 s y fallback de último snapshot válido durante un máximo adicional de 5 min ante fallo transitorio de `overview` o `nutrition`.
- No cambia la fuente canónica ni el cálculo del balance. El objetivo es eliminar ráfagas redundantes y evitar que un tropiezo temporal de backend borre una vista que ya tenía datos válidos.
- Rama de corrección: `organizador11/health-read-resilience`.

## Salud · balance calórico diario en Resumen · 2026-10-06

- Salud → Resumen incorpora un bloque `Balance calórico` a ancho completo con una gráfica divergente de los últimos 7 días.
- La diferencia usa `ingesta - gasto`: cualquier valor negativo = déficit verde, cualquier valor positivo = superávit rojo y 0 exacto = equilibrio.
- El histórico ya existía en la lógica Nutri; `GET /api/health/overview` lo expone ahora como `nutritionHistory`, incluyendo `consumedEntryCount` y `coverageQuality`.
- Solo se clasifica un día con ingesta consumida registrada y cobertura Health comparable (`full`/`live`). No se convierte ausencia o cobertura incompleta en 0.
- El día actual se marca provisional. La tarjeta resume balance medio y recuento de días en déficit/superávit.
- No se crea fuente canónica nueva: ingesta sigue en `SEGUNDO CEREBRO - SALUD` y gasto en Health/D1.
- Cierre operativo: la integración corresponde a PR #295; no declararla publicada hasta que validación y auditoría de producción estén verdes.


## GESTOR OBJETOS - ROPA 2 · referencias visuales resueltas en LookItems · 2026-10-02

- Para evitar que las imágenes de looks se generen a partir de descripciones genéricas, `GET /api/objects` resuelve ahora cada fila de `LookItems` contra la prenda canónica de `Armario`.
- Cada item de look expone dinámicamente `photoUrl`, `processedPhotoUrl`, `thumbnailUrl`, `originalPhotoUrl` y `visualReferenceUrl`, además de marca, subcategoría, color, patrón, vista y capa.
- No se añaden URLs duplicadas al Sheet: `LookItems` sigue conteniendo solo `look_id + objeto_id + rol`; las referencias siempre se obtienen de `Armario`, por lo que un overwrite de una prenda no deja referencias antiguas.
- Regla operativa nueva: antes de generar con IA una imagen de un look, cargar las referencias visuales reales de todos sus `LookItems`; los nombres y colores son solo apoyo y no deben sustituir a las imágenes canónicas cuando existen.

## MIDAS · laboratorio en tabla compacta · 2026-10-05

- El bloque «Comportamiento de los algoritmos» deja las tarjetas 3×N y pasa a un registro compacto por algoritmo.
- Cada grupo mantiene su cabecera y usa una tabla con columnas: Algoritmo, Actividad actual, Activos, Rentabilidad acumulada, Sesiones, Último cierre y DD.
- La evolución deja de ocupar una columna: se consulta en la ficha completa que abre cada fila.
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


### ORGANIZADOR 10 · Regalos: densidad legible en Home · 2026-10-06

- `Regalos · Bodas y Reyes` permanece dentro de `finance-right-stack`, debajo de `Obligaciones activas`, aprovechando el hueco vertical frente a Patrimonio.
- La tipografía interna se aumenta sin volver a expandir el panel: se reducen paddings/gaps y se elevan tamaños de títulos, histórico mensual, bodas y KPIs.
- El auditor exige mínimos de legibilidad para título del sobre, filas mensuales y nombres de bodas, además de mantener el check de ausencia de overflow.
- Los importes, personas, fechas y estados siguen viviendo exclusivamente en la pestaña privada `Regalos`; no se hardcodean en Git.


### SALUD · backfill Apple Health completo desde ZIP · 06/10/2026
- El mecanismo de recuperación por export de Apple Health cubre actividad/energía, composición corporal y ahora también recuperación/sueño.
- Las filas de `RecuperacionDiariaApple` con `source=apple_health_export_recovery` se reconcilian idempotentemente hacia D1 `health_recovery_daily` durante la lectura de Salud.
- La pestaña sigue siendo superficie derivada; solo las filas marcadas explícitamente como recovery de export se usan como staging. Las filas `apple_health` normales no se reingestan.
- Esto permite sustituir snapshots live parciales cuando el bridge iOS falla, sin crear una segunda fuente de verdad ni subir datos privados a Git.


### SALUD · hardening lectura tras backfill ZIP · 06/10/2026
- El backfill `apple_health_export_recovery` ya no provoca UPSERTs repetidos en cada GET de Salud.
- D1 guarda una firma de importación en `health_import_state`; si el staging no ha cambiado, la reconciliación se omite.
- La importación nueva se ejecuta en un único `DB.batch` para reducir contención.
- Un fallo de reconciliación ya no tumba `/api/health/overview`: se registra warning y la lectura continúa.
- Para energía diaria, una fila más reciente `apple_health_export_recovery` del Sheet prevalece sobre un snapshot D1 live antiguo.
- Las lecturas batch de Google Sheets para Salud reintentan 429/5xx antes de fallar.


### NUTRI · coherencia MenuSemanal ↔ Registro · 07/10/2026
- `Registro` sigue siendo la fuente principal para kcal/macros realmente consumidos.
- La Home puede usar como fallback de solo lectura una fila `MenuSemanal.estado=consumido` cuando tenga `recipe_id` o `food_id` exacto y esa identidad no exista en `Registro`.
- El fallback no escribe durante GET, no sustituye la obligación de registrar el consumo y no se aplica a filas sin identidad exacta.
- Motivo: el 06/10/2026 el salmón con ñoquis estaba consumido en MenuSemanal pero faltaba en Registro; la Home mostraba 1296 kcal / 92 g en vez de 2062 kcal / 133 g.

