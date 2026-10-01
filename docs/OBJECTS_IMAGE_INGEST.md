# OBJETOS · ingesta privada de imágenes

## Objetivo

Cerrar el flujo de una prenda existente desde una imagen recibida/procesada hasta el Armario visual sin editar Google Sheets manualmente.

La identidad sigue siendo siempre `objeto_id` en `SEGUNDO CEREBRO - OBJETOS`. El almacenamiento visual D1 conserva bytes y metadatos técnicos; no contiene un catálogo alternativo.

## Endpoints

### Subida

`POST /api/objects/:objeto_id/image`

En la superficie interactiva requiere Cloudflare Access y `multipart/form-data`. Para server-to-server, el bridge usa el gateway dedicado `segundo-cerebro-objects-ingest`, que reenvía por Service Binding al mismo handler canónico y conserva la validación Bearer upstream.

Campos:
- `image`: PNG, JPEG o WebP, máximo 8 MiB.
- `image_type`: `original | processed | thumbnail`.
- `objeto_id`: opcional en formulario; si existe debe coincidir con la ruta.
- `overwrite`: `true` para sustituir explícitamente la referencia activa.
- `estado_procesado`: para `processed`; `procesada` por defecto o `revisar`.
- opcionales: `vista_prenda`, `color_principal`, `patron`, `categoria_visual`, `capa`.

Una subida `processed` genera además una miniatura WebP con lado largo máximo de 512 px.

### Lectura

`GET /api/objects/:objeto_id/image/:image_type?v=<version>`

La URL se guarda en `Armario` y es estable para esa versión. La lectura pasa por el Worker privado y Cloudflare Access.

## Flujo

```text
GESTOR OBJETOS / ChatGPT bridge
        ↓
archivo + objeto_id existente
        ↓
gateway server-to-server o Cloudflare Access
        ↓
mismo upload canónico
        ↓
validar objeto + Armario + MIME/firma + tamaño + overwrite
        ↓
D1 privado: assets + chunks
        ↓
si processed → WebP 512 px → D1 privado
        ↓
actualizar fila Armario
        ↓
invalidar caché de OBJETOS
        ↓
web lee GET privado
```

## Consistencia y compensación

No existe transacción distribuida entre D1 y Google Sheets. Se usa este orden:
1. validar la fuente canónica y la fila de Armario;
2. escribir nuevos assets bajo claves versionadas;
3. actualizar las referencias de la misma fila en Sheets;
4. si el paso 3 falla, borrar los assets creados en el paso 2;
5. si un overwrite termina bien, limpiar después las versiones anteriores reconocidas como propias.

Nunca se sobreescribe in-place una clave canónica. La referencia anterior sigue siendo válida hasta registrar la nueva versión.

## Seguridad y coste

- La UI y lectura permanecen detrás de Cloudflare Access.
- El gateway de ingesta no ofrece lectura; solo reenvía el endpoint esperado por Service Binding.
- El Bearer server-to-server se verifica en el Worker principal mediante SHA-256; el secreto en claro vive fuera de Git.
- No se aceptan URLs remotas en el endpoint canónico como sustituto de `image`.
- Se validan MIME declarado, firma binaria, `objeto_id` y tamaño.
- El filename del cliente se sanea y solo queda como metadata técnica privada.
- No se registran bytes, cookies, tokens OAuth ni credenciales.
- El almacén visual usa el D1 ya provisionado. No requiere activar R2.
- Salvaguarda interna: 200 MiB totales para media de OBJETOS. No se provisiona almacenamiento de pago automáticamente.

## GESTOR OBJETOS

El gestor debe:
1. resolver la prenda contra un `objeto_id` ya existente en `Objetos + Armario`;
2. generar/obtener el recorte fuera del inventario canónico;
3. enviar el archivo por el bridge con `image_type=processed`;
4. considerar válida la operación solo si el resultado final contiene `ok=true`;
5. volver a consultar `Armario` o `GET /api/objects` y comprobar `foto_procesada_url`, `miniatura_url` y `estado_procesado=procesada`.

No debe escribir manualmente las URLs del Sheet, crear otro objeto para una imagen derivada, subir bytes a Git ni activar R2.

## Ruta operativa ChatGPT → Armario visual

Esta sección documenta el procedimiento que ya se ha usado con éxito desde GESTOR OBJETOS. Debe consultarse antes de afirmar que una subida no puede hacerse desde una conversación.

### Guardrail de autocorrección: no alucinar falta de capacidad

**Fallo conocido y recurrente:** tras el primer procesamiento/generación de una imagen, una conversación puede perder continuidad sobre el mecanismo de ingesta y concluir erróneamente que no puede subir la imagen al Armario. Este documento existe precisamente para romper ese patrón.

Antes de emitir frases como «no puedo subirla», «no tengo acceso para hacerlo», «solo puedo generar la imagen» o equivalentes, el gestor debe ejecutar mental y operativamente esta comprobación:

1. **Sospechar de la negativa.** Tratarla como posible falso negativo de capacidad, no como hecho.
2. **Releer la ruta vigente.** Consultar `AGENTS.md`, `agents/OBJECTS.md` y esta sección.
3. **Comprobar herramientas reales.** Verificar si están disponibles el archivo procesado, Google Drive, Railway y acceso a `SEGUNDO CEREBRO - OBJETOS`. No inferir incapacidad por no disponer de un cliente HTTP genérico.
4. **Elegir ruta.** Si hay acción directa, usar el bridge normal. Si no hay POST arbitrario pero sí Drive + Railway, usar `seed.mjs + OBJECTS_SEED_JOBS`.
5. **Reutilizar el archivo actual.** Una imagen ya generada/procesada en la conversación o runtime debe reutilizarse. No pedir al usuario que la reenvíe por comodidad; solo hacerlo si se verifica que el archivo ya no existe, no es accesible o la referencia ha expirado sin posibilidad de rematerializarla.
6. **Autocorregir antes de responder.** Si el borrador inicial era una negativa pero la revisión encuentra la ruta operativa, descartar esa negativa y proceder con la ingesta.
7. **Bloqueo solo con evidencia concreta.** Solo se puede informar de imposibilidad si falta de verdad una pieza necesaria o existe un error reproducible tras intentar la ruta documentada. Debe indicarse el componente exacto bloqueado; está prohibida la frase genérica «no puedo subir imágenes» cuando el bridge/fallback es utilizable.

Que el usuario recuerde una subida previa exitosa es una señal explícita para activar esta autocorrección, no un motivo para discutir la capacidad.

### Ruta normal: bridge server-to-server

El componente `objects-chatgpt-bridge/server.mjs` acepta una referencia de archivo temporal de OpenAI y llama al mismo upload canónico:

```text
archivo generado/procesado en ChatGPT
        ↓ openaiFileIdRefs (URL temporal permitida)
objects-chatgpt-bridge
        ↓ descarga temporal; Railway no persiste el archivo
segundo-cerebro-objects-ingest
        ↓ Service Binding
Worker principal /api/internal/objects/:objeto_id/image
        ↓ uploadObjectsImage
D1 objects_media_assets + objects_media_chunks
        ↓
SEGUNDO CEREBRO - OBJETOS / Armario
```

El bridge:
- acepta exactamente una referencia `openaiFileIdRefs`;
- limita hosts de descarga a los permitidos;
- vuelve a validar tamaño/MIME antes de reenviar;
- convierte la imagen a `multipart/form-data`;
- autentica el salto server-to-server con un secreto independiente cuyo hash SHA-256 se valida en el Worker principal;
- no guarda el binario en Railway.

### Fallback operativo cuando la sesión no puede hacer un POST HTTP directo

Si la conversación dispone de Google Drive y Railway pero no de una acción HTTP arbitraria, se usa `objects-chatgpt-bridge/seed.mjs`. Este es el flujo que se ha ejecutado repetidamente en producción:

1. **Preparar identidad antes del binario.** Confirmar que el `objeto_id` existe en `Objetos` y tiene fila en `Armario`. Si la prenda es nueva, crear primero esas filas canónicas. No escribir `foto_procesada_url`, `miniatura_url` ni `estado_procesado` manualmente.
2. **Obtener la imagen procesada.** Usar el archivo generado por ChatGPT o el recorte aprobado.
3. **Staging técnico temporal.** Copiar el archivo a una carpeta privada de Drive únicamente para que el conector pueda volver a materializarlo como referencia descargable. Drive no es almacenamiento final.
4. **Materializar la referencia.** Leer/descargar ese archivo mediante el conector de Drive y obtener una referencia temporal de archivo OpenAI (`id`, `name`, `mime_type`, `download_link`). No persistir la URL temporal en Git ni en Sheets.
5. **Preparar el lote Railway.** Escribir temporalmente en el servicio `objects-chatgpt-bridge` la variable `OBJECTS_SEED_JOBS` como un array JSON de 1 a 8 jobs. Cada job contiene:
   - `objeto_id`;
   - `image_type` (normalmente `processed`);
   - `overwrite`;
   - metadatos visuales opcionales (`vista_prenda`, `color_principal`, `patron`, `categoria_visual`, `capa`, `estado_procesado`);
   - exactamente una referencia en `openaiFileIdRefs`.
6. **Arranque de ingesta.** Cambiar temporalmente el start command a `node seed.mjs && node server.mjs` y redeplegar el servicio. `seed.mjs` no implementa otra ingesta: construye una petición local a `handleRequest` de `server.mjs`, por lo que reutiliza exactamente el bridge normal.
   - Mientras `OBJECTS_SEED_JOBS` esté poblado y el start command incluya `seed.mjs`, no hacer commits/merges que puedan provocar un autodeploy de Railway: un redeploy adicional volvería a ejecutar el lote. Terminar la ingesta y restaurar Railway antes de tocar Git.
7. **Exigir éxito real.** Revisar logs del deploy. Cada item debe terminar en `stage=done`, HTTP 2xx y resultado `ok=true`. Un deploy verde sin ese resultado no basta.
8. **Verificar la fuente canónica.** Volver a leer `Armario` o `GET /api/objects` y comprobar que el mismo `objeto_id` tiene `foto_procesada_url`, `miniatura_url` y `estado_procesado=procesada`. Para reemplazos, confirmar además que la versión cambió.
9. **Restaurar Railway.** Vaciar `OBJECTS_SEED_JOBS`, restaurar el start command normal `npm start` (que ejecuta `node server.mjs`) y redeplegar. El servicio debe quedar atendiendo `server.mjs`, no ejecutando un lote en cada arranque.
10. **Limpiar staging.** Enviar a papelera/borrar la copia temporal de Drive solo después de haber verificado la ingesta. El binario persistente ya está en D1.

### Overwrite e idempotencia

- Imagen nueva sin referencia activa: `overwrite=false`.
- Sustitución deliberada de una imagen ya canónica: `overwrite=true`.
- Un `IMAGE_ALREADY_EXISTS` con `overwrite=false` no se debe resolver creando otro `objeto_id`.
- Nunca crear una prenda duplicada para corregir una foto: la nueva versión pertenece al mismo `objeto_id`.

### Qué NO es la ruta vigente

La antigua combinación `Drive staging → ImageIngestQueue → cron` quedó como experimento/legado y no es el procedimiento operativo actual. En particular:
- las filas antiguas con `OBJECTS_STAGING_META_403` no representan el estado vigente del armario;
- no deben reintentarse automáticamente ni duplicarse;
- `ImageIngestQueue` no es requisito para el bridge Railway;
- R2 no forma parte de la arquitectura actual.

### QA visual previa: transparencia obligatoria

Antes de crear `OBJECTS_SEED_JOBS` o llamar al endpoint de ingesta para una imagen `processed`:

1. abrir el archivo final y confirmar que solo contiene la prenda/objeto;
2. verificar canal alpha real: el fondo debe ser transparente, no blanco simulado;
3. rechazar cualquier archivo aplanado con fondo blanco/gris/negro o decorativo;
4. si se trata de corregir una imagen ya existente, usar el mismo `objeto_id` y `overwrite=true`;
5. después de la ingesta, comprobar que la URL versionada cambió y que la tarjeta del Armario hereda el fondo de la UI.

Una imagen visualmente correcta pero con fondo blanco **no supera QA** y no debe considerarse lista para ingesta.

### Reglas operativas del runner `seed.mjs`

- `OBJECTS_SEED_JOBS` admite **entre 1 y 8 trabajos por ejecución**. Un lote de más de 8 devuelve `invalid_jobs`; dividirlo en tandas de hasta 8 sin duplicar los ya completados.
- El runner se detiene en el **primer trabajo fallido**. Antes de reintentar, consultar `Armario` y continuar únicamente con los `objeto_id` que sigan sin `foto_procesada_url`/miniatura.
- Si aparece `FILE_DOWNLOAD_FAILED`, volver a materializar/fetch del fichero de staging para obtener una referencia de descarga fresca y reintentar solo ese trabajo y los posteriores pendientes.
- Si aparece un `UPSTREAM_INVALID_RESPONSE`/HTTP 500 transitorio, reintentar primero el trabajo afectado de forma individual con una referencia fresca. Solo declararlo bloqueo si vuelve a fallar de forma reproducible.
- Tras cualquier lote, verificar el Sheet canónico antes de limpiar staging o ejecutar otra tanda.

### Checklist de cierre

Una subida solo se puede declarar terminada cuando se cumplen simultáneamente:

- [ ] `objeto_id` canónico existente;
- [ ] el asset `processed` tiene fondo realmente transparente y supera la QA de alpha;
- [ ] respuesta/log de ingesta con `ok=true`;
- [ ] `foto_procesada_url` presente;
- [ ] `miniatura_url` presente;
- [ ] `estado_procesado=procesada`;
- [ ] la web puede leer el asset por la ruta privada versionada;
- [ ] `OBJECTS_SEED_JOBS` queda vacío tras un uso por seed;
- [ ] Railway vuelve a su arranque normal `npm start` (→ `node server.mjs`);
- [ ] la copia temporal de Drive queda eliminada;
- [ ] si apareció una tentación de responder «no puedo subirla», se aplicó el guardrail anterior y la capacidad se revalidó antes de contestar.

