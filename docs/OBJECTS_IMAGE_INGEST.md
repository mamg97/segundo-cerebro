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
1. resolver una prenda contra un `objeto_id` ya existente;
2. generar/obtener el recorte fuera del inventario canónico;
3. enviar el archivo al endpoint con `image_type=processed`;
4. considerar válida la operación solo si recibe `ok=true`;
5. volver a consultar `GET /api/objects` o `Armario` para verificar el estado final.

No debe escribir manualmente las URLs del Sheet, crear otro objeto, subir bytes a Git ni activar R2.
