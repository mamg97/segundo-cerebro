# OBJETOS · ingesta privada de imágenes

## Objetivo

Cerrar el flujo de una prenda existente desde una imagen recibida/procesada hasta el Armario visual sin editar Google Sheets manualmente.

La identidad sigue siendo siempre `objeto_id` en `SEGUNDO CEREBRO - OBJETOS`. R2 conserva bytes; no contiene un catálogo alternativo.

## Endpoints

### Subida

`POST /api/objects/:objeto_id/image`

Requiere Cloudflare Access y `multipart/form-data`.

Campos:

- `image`: archivo PNG, JPEG o WebP, máximo 8 MiB.
- `image_type`: `original | processed | thumbnail`.
- `objeto_id`: opcional en el formulario; si se envía debe coincidir con la ruta.
- `overwrite`: `true` para sustituir explícitamente la referencia canónica actual.
- `estado_procesado`: solo para `processed`; `procesada` por defecto o `revisar`.
- opcionales: `vista_prenda`, `color_principal`, `patron`, `categoria_visual`, `capa`.

Una subida `processed` genera además una miniatura WebP con lado largo máximo de 512 px.

### Lectura

`GET /api/objects/:objeto_id/image/:image_type?v=<version>`

La URL se guarda en `Armario` y es estable para esa versión. El bucket R2 no tiene URL pública; la lectura pasa por el Worker privado y Cloudflare Access.

## Flujo

```text
GESTOR OBJETOS / herramienta autorizada
        ↓
archivo + objeto_id existente
        ↓
Cloudflare Access
        ↓
POST image
        ↓
validar objeto + Armario + MIME/firma + tamaño + overwrite
        ↓
R2 privado (clave versionada)
        ↓
si processed → WebP 512 px → R2 privado
        ↓
actualizar fila Armario
        ↓
invalidar caché de OBJETOS
        ↓
web lee GET privado
```

## Consistencia y compensación

No existe transacción distribuida entre R2 y Google Sheets. Se usa este orden:

1. validar la fuente canónica y la fila de Armario;
2. escribir nuevos assets bajo claves versionadas;
3. actualizar las referencias de la misma fila en Sheets;
4. si el paso 3 falla, borrar los assets creados en el paso 2;
5. si un overwrite termina bien, limpiar después las versiones anteriores reconocidas como propias.

Nunca se sobreescribe in-place una clave R2 canónica. Así una referencia existente continúa siendo válida hasta que la nueva versión queda registrada.

## Seguridad

- Cloudflare Access protege lectura y escritura.
- R2 no expone dominio público.
- El Worker exige contexto de Access antes de procesar upload o lectura.
- No se aceptan URLs externas como sustituto de `image`.
- Se validan MIME declarado y firma binaria.
- `objeto_id` permite solo caracteres seguros y nunca se usa un nombre de archivo para construir identidad.
- El filename del cliente se sanea y solo queda como metadata técnica privada.
- No se registran bytes, cookies, tokens OAuth ni credenciales.

## Invocación programática

Un bridge autorizado puede usar una identidad de servicio de Cloudflare Access. Las credenciales viven fuera de Git y se entregan a Access, que inyecta el contexto autenticado que exige el Worker.

Ejemplo conceptual:

```bash
curl --fail-with-body \
  -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" \
  -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET" \
  -F "image_type=processed" \
  -F "image=@/ruta/privada/prenda.webp;type=image/webp" \
  -F "estado_procesado=procesada" \
  "https://<host-privado>/api/objects/obj-example-001/image"
```

Respuesta:

```json
{
  "ok": true,
  "objeto_id": "obj-example-001",
  "image_type": "processed",
  "url": "/api/objects/obj-example-001/image/processed?v=<version>",
  "thumbnail_url": "/api/objects/obj-example-001/image/thumbnail?v=<version>",
  "estado_procesado": "procesada",
  "updated_at": "<ISO-8601>"
}
```

## GESTOR OBJETOS

El gestor debe:

1. resolver una prenda contra un `objeto_id` ya existente;
2. generar/obtener el recorte fuera del inventario canónico;
3. enviar el archivo al endpoint con `image_type=processed`;
4. considerar válida la operación solo si recibe `ok=true`;
5. volver a consultar `GET /api/objects` para verificar el estado final.

No debe escribir manualmente las tres URLs del Sheet, crear otro objeto ni subir la imagen a Git.
