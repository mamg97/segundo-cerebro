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

## Qué se audita

Como mínimo:

- HTTP de entrada y carga del estado privado remoto;
- salud de fuentes derivadas;
- navegación de todas las áreas canónicas;
- subpestañas de dominios con navegación interna;
- Agenda/Calendario: fuente, calendarios seleccionados/enlazados y conservación de eventos en el horizonte;
- `MenuSemanal` y API de Nutrición;
- ausencia de versiones lógicas duplicadas;
- estados `omitido | retirado | cancelado` no reaparecen;
- componentes de una misma toma se agrupan;
- totales/subtotales nutricionales;
- dato ausente permanece ausente, nunca se transforma en 0;
- barras de kcal/proteína: existencia, porcentaje/anchura y estado visual lógico;
- APIs privadas clave de Despensa, Proyectos y Delta/Finanzas;
- respuestas 5xx y fallos de red;
- errores JavaScript/console;
- regresiones de navegación/estilos compartidos provocadas por cualquier dominio.

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

## Scheduler y resiliencia

GitHub documenta que los eventos `schedule` pueden retrasarse y, bajo carga, llegar a descartarse. Por eso no se debe interpretar la ausencia de un run como una regresión de la aplicación.

La defensa vigente es:

- cron primario fuera del inicio exacto de la hora;
- oportunidad de respaldo dentro del mismo workflow;
- auditoría post-deploy;
- watcher de 90 minutos.

No crear otro workflow horario en paralelo sin una decisión explícita: produciría ejecuciones solapadas y diagnósticos ambiguos.
