# Objects — Gestor Objetos y Armario

## Rol

GESTOR OBJETOS Y ARMARIO es el propietario funcional del inventario personal de Segundo Cerebro.

Su dominio cubre:

- inventario general;
- armario y calzado;
- looks/outfits;
- kits reutilizables;
- listas contextuales para viajes, eventos, oficina, deporte, limpieza, mudanzas y otros usos.

No mantiene una memoria paralela dentro de la web. ORGANIZADOR / WEB GENERAL presenta el estado y otros gestores lo consultan.

## Fuente de verdad

Fuente privada canónica:

`SEGUNDO CEREBRO - OBJETOS`

Estado actual: **creada y registrada en la capa privada**.

El Sheet contiene el contrato v0.3. Git nunca contiene inventario ni imágenes reales. El Worker la resuelve por:
1. `OBJECTS_SHEET_ID` privado, si está configurado;
2. registro privado `IntegracionesPrivadas`;
3. búsqueda exacta por título en Drive.

## Contrato v0.3

El esquema puede ampliarse sin romper IDs existentes. Las pestañas previstas son:

### `Objetos`

Maestro de todos los objetos.

Campos principales:
- `objeto_id`
- `nombre`
- `categoria`
- `subcategoria`
- `marca`
- `modelo`
- `cantidad`
- `ubicacion`
- `estado`
- `condicion`
- `fecha_compra`
- `precio_compra`
- `valor_aprox`
- `moneda`
- `numero_serie`
- `garantia_hasta`
- `factura_ref`
- `foto_url` o referencia equivalente
- `enlace`
- `etiquetas`
- `contextos`
- `salida_sugerida`
- `notas`
- `created_at`
- `updated_at`

Estados normalizados:
`DISPONIBLE | EN_USO | PRESTADO | REPARACIÓN | VENDIDO | DONADO | DESCARTADO | PERDIDO`.

### `Armario`

Extensión 1:1 o 1:0 de `Objetos` mediante `objeto_id`.

Campos específicos:
- `objeto_id`
- `tipo_prenda`
- `color`
- `talla`
- `temporada`
- `formalidad`
- `contextos`
- `oficina`
- `ultimo_uso`
- `veces_usado` / `frecuencia_uso`
- `compatible_con`
- `notas`
- `foto_original_url`
- `foto_procesada_url`
- `miniatura_url`
- `estado_procesado`: `pendiente | procesada | revisar`
- `vista_prenda`
- `color_principal`
- `patron`
- `categoria_visual`
- `capa`: `superior | exterior | inferior | calzado | accesorio`
- `ultima_actualizacion_visual`

Una prenda no debe existir solo en Armario: primero debe existir como objeto. `Objetos.foto_url` se conserva como referencia/fallback histórico; las imágenes específicas de armario viven en la extensión `Armario`.

### Regla visual

- La UI prioriza `miniatura_url → foto_procesada_url → foto_original_url → Objetos.foto_url`.
- En móvil, `Armario visual` usa una cuadrícula compacta responsive: 2 prendas por fila por debajo de 430 px y 3 prendas por fila desde 430 px hasta tablet; la tarjeta reduce metadatos visibles y conserva el detalle completo al abrir la prenda.
- Una URL ausente no se sustituye por una imagen inventada: se muestra placeholder.
- `estado_procesado` vacío se interpreta como `procesada` si existe recorte, y como `pendiente` en otro caso.
- La `capa` puede inferirse temporalmente desde `tipo_prenda` para registros históricos; el campo explícito del Sheet tiene prioridad.
- El pipeline automático de eliminación de fondo no es fuente de verdad: solo produce derivados visuales que vuelven a referenciar el mismo `objeto_id`.

### `Looks` + `LookItems`

`Looks`:
- `look_id`
- `nombre`
- `foto_url`
- `contexto`
- `formalidad`
- `temporada`
- `clima`
- `oficina`
- `ultimo_uso`
- `veces_usado`
- `historico_usos`
- `notas`

`LookItems`:
- `look_id`
- `objeto_id`
- `rol`

Cada `objeto_id` debe existir en el inventario y ser una prenda válida.

### `Kits` + `KitItems`

`Kits`:
- `kit_id`
- `nombre`
- `descripcion`
- `contexto`
- `etiquetas`
- `updated_at`

`KitItems`:
- `kit_id`
- `objeto_id` opcional
- `nombre` / necesidad
- `cantidad`
- `importancia`
- `notas`

Un kit es una plantilla de necesidades, no necesariamente una bolsa física.

### `Listas` + `ListaItems`

`Listas`:
- `lista_id`
- `nombre`
- `contexto`
- `evento_ref`
- `destino`
- `fecha_inicio`
- `fecha_fin`
- `clima`
- `actividades`
- `estado`
- `updated_at`
- `notas`

`ListaItems`:
- `lista_id`
- `objeto_id` opcional
- `nombre` / necesidad
- `cantidad`
- `importancia`: `NECESARIO | RECOMENDADO | OPCIONAL`
- `estado`: `FALTA_COMPRAR | SELECCIONADO | PREPARADO | DESCARTADO`
- `kit_id` opcional
- `notas`

`FALTA_COMPRAR` permite representar una necesidad que todavía no existe en el inventario sin crear un objeto ficticio.

## Integración entre gestores

### Eventos

GESTOR EVENTOS aporta contexto:
- destino;
- fechas;
- duración;
- actividades;
- restricciones;
- clima cuando proceda.

GESTOR OBJETOS Y ARMARIO cruza ese contexto con inventario + kits y mantiene la lista resultante.

EVENTOS solo debe conservar una referencia a `lista_id` o al resultado derivado; nunca copiar el inventario.

### Gym / Nutrición

Puede consultar disponibilidad de objetos deportivos, ropa, recipientes u otros elementos prácticos, pero no mantener inventario propio.

### Organizador

Integra navegación, resumen y presentación. No es propietario del inventario.

## Participación de otros gestores

La participación es compartida, pero la propiedad funcional no.

| Gestor | Puede consultar | Puede proponer | Puede escribir directamente |
| --- | --- | --- | --- |
| GESTOR OBJETOS Y ARMARIO | Todo | Todo | Sí: todas las pestañas del dominio |
| GESTOR EVENTOS | Objetos, Armario, Looks, Kits, Listas | contexto de viaje/evento, necesidades, restricciones | No en inventario; la lista material la mantiene OBJETOS |
| GESTOR GYM / NUTRICIÓN | objetos deportivos, ropa, recipientes, kits | necesidades de deporte/gimnasio | No |
| GESTOR PADRES | objetos/listas cuando un asunto familiar lo requiera | necesidades concretas | No |
| ORGANIZADOR / WEB GENERAL | resumen y detalle para presentación | cambios de UI/contrato | No sobre datos reales |
| Gestor del hogar / futuros agentes | objetos y kits pertinentes | necesidades/contextos | No salvo decisión futura documentada |

### Regla de escritura

- `GESTOR OBJETOS Y ARMARIO` es el escritor funcional por defecto.
- Los demás gestores entregan **contexto o intención**, no duplican registros.
- Para un viaje, EVENTOS aporta destino/fechas/actividades; OBJETOS genera o actualiza `Listas` y `ListaItems`.
- Para una necesidad inexistente se usa `FALTA_COMPRAR`; no se crea un objeto poseído hasta que realmente lo sea.
- Cualquier futura excepción de escritura directa debe documentarse en `docs/DECISIONS.md`.

### Cómo debe consumirlo otro gestor

1. Leer `AGENTS.md`.
2. Leer `agents/OBJECTS.md`.
3. Consultar la fuente privada canónica o `GET /api/objects`, según el entorno.
4. Referenciar entidades por `objeto_id`, `look_id`, `kit_id` o `lista_id`.
5. No copiar inventario a su propio dominio.
6. Si necesita una modificación, pasar la intención a GESTOR OBJETOS Y ARMARIO.

## API privada

- `/api/state` puede transportar únicamente `objectsSummary`.
- `GET /api/objects` entrega el detalle estructurado bajo demanda, incluidos metadatos visuales y facetas de armario.
- `POST /api/objects/look` guarda un look nuevo en la fuente canónica `Looks + LookItems`.
- `POST /api/objects/:objeto_id/image` recibe `multipart/form-data` autenticado por Cloudflare Access con `image_type=original|processed|thumbnail` y un archivo `image`.
- `POST /api/internal/objects/:objeto_id/image` es la variante server-to-server; exige Bearer upstream y reutiliza exactamente `uploadObjectsImage`.
- `GET /api/objects/:objeto_id/image/:image_type?v=<version>` sirve el asset privado mediante el Worker.
- Los bytes se guardan en el D1 privado existente, en `objects_media_assets` + `objects_media_chunks`; el Sheet conserva únicamente la URL privada estable del mismo `objeto_id`.
- Una subida `processed` genera además una miniatura WebP de hasta 512 px y actualiza `foto_procesada_url`, `miniatura_url`, `estado_procesado` y `ultima_actualizacion_visual`.
- El upload acepta PNG/JPEG/WebP hasta 8 MiB, valida firma binaria además de MIME, exige objeto y fila de Armario existentes, bloquea objetos retirados y requiere `overwrite=true` para sustituir una referencia ya canónica.
- La escritura usa claves versionadas. Primero sube el nuevo asset a D1 y después actualiza el Sheet; si la escritura canónica falla, elimina los nuevos assets. Tras un overwrite correcto, la versión anterior se limpia best-effort.
- El almacén visual D1 tiene una salvaguarda interna de 200 MiB. No activar R2 ni almacenamiento de pago sin una decisión explícita nueva.
- El escritor valida que cada `objeto_id` exista en `Armario`, que los roles no se repitan y que el look tenga al menos `superior + inferior + calzado`; `exterior` y `accesorio` son opcionales.
- Si la fuente no pudiera resolverse, el endpoint degrada a `status=source-pending`, arrays vacíos y `source.available=false`; con la fuente actual debe responder como conectada.

## Privacidad

Este dominio puede contener números de serie, facturas, fotos, ubicaciones domésticas y valor económico. Se trata como `confidencial`.

Git solo contiene código, contrato y estilos. Nunca contiene inventario real, fotos, números de serie, facturas, ubicaciones precisas ni identificadores privados de la fuente.

D1 actúa como persistencia binaria privada de los derivados visuales, no como segunda fuente de identidad. Las rutas físicas se derivan del `objeto_id` y de una versión técnica; pertenencia, metadatos y referencia activa siguen gobernados por `Armario`.

## Puente operativo ChatGPT → Armario visual

La ruta vigente para imágenes desde ChatGPT es:

```text
imagen generada/procesada
        ↓ referencia temporal OpenAI
objects-chatgpt-bridge
        ↓
segundo-cerebro-objects-ingest
        ↓ Service Binding
/api/internal/objects/:objeto_id/image
        ↓ uploadObjectsImage
D1 visual + actualización Armario
```

Si la sesión no dispone de una acción HTTP arbitraria pero sí de Drive + Railway, se usa el runner temporal `objects-chatgpt-bridge/seed.mjs`:

1. confirmar `objeto_id` existente en `Objetos + Armario`;
2. usar Drive únicamente como staging técnico temporal del archivo;
3. materializar una referencia temporal OpenAI del archivo;
4. cargar hasta 8 jobs en `OBJECTS_SEED_JOBS`;
5. arrancar temporalmente Railway con `node seed.mjs && npm start`;
6. exigir `stage=done` + `ok=true` por cada job;
7. verificar `foto_procesada_url`, `miniatura_url` y `estado_procesado=procesada` en Armario;
8. vaciar `OBJECTS_SEED_JOBS`, restaurar `npm start` y limpiar el staging.

La antigua cola `ImageIngestQueue` y su cron de Drive quedan como legado/fallback histórico; no son el procedimiento operativo normal. Las filas antiguas con `OBJECTS_STAGING_META_403` no deben reintentarse ni duplicarse.

El procedimiento completo y checklist de cierre están en `docs/OBJECTS_IMAGE_INGEST.md`.
