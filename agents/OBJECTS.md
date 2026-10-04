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

### Detalle interactivo de looks

- En la pestaña `Looks`, cada tarjeta es interactiva.
- Al abrir un look, la UI amplía `Looks.foto_url` como imagen principal.
- En escritorio, las prendas de `LookItems` se muestran al lado; en móvil, debajo.
- Cada prenda del detalle se resuelve desde `Armario` usando la prioridad visual canónica y permite abrir su ficha individual.
- Esta vista no crea ni copia datos: deriva íntegramente de `Looks + LookItems + Armario`.
- La pestaña `Looks` expone un acceso `Historial de uso` con dos vistas: `Looks` y `Prendas`. La vista `Looks` usa `Looks.historico_usos`, `ultimo_uso` y `veces_usado`. La vista `Prendas` deriva fechas desde los usos de los looks que contienen cada `objeto_id` y añade `Armario.ultimo_uso`; para el total global, `Armario.veces_usado` tiene prioridad cuando existe. Ambas vistas muestran una miniatura canónica a la izquierda de cada fila, usos globales, usos con fecha en los últimos 30 días y fechas registradas, y permiten ordenar por uso más reciente, más antiguo, total o últimos 30 días. Por defecto se ordena por uso más reciente y cualquier look/prenda sin fecha válida queda al final. `historico_usos` solo aporta fechas cuando el valor puede normalizarse realmente como fecha; notas como “uso confirmado” no cuentan como fecha. En móvil la tabla se compacta en una tarjeta densa por fila con métricas agrupadas y fechas en una única banda horizontal. No se inventan fechas para cubrir usos sin fecha y no se crea una fuente paralela.

### `Looks` + `LookItems`

`LookItems` conserva solo la relación canónica `look_id + objeto_id + rol`. Para consumo, `GET /api/objects` resuelve cada `objeto_id` contra `Armario` y adjunta dinámicamente las referencias visuales vigentes de la prenda (`photoUrl`, `processedPhotoUrl`, `thumbnailUrl`, `originalPhotoUrl`, `visualReferenceUrl`) y sus metadatos visuales básicos. No se copian esas URLs al Sheet, evitando que queden obsoletas tras un overwrite.

**Regla para generar imágenes de looks con IA:** si los `LookItems` disponen de referencias visuales canónicas, el gestor debe cargar/usar esas imágenes reales como referencias antes de generar. No basta con describir la prenda por nombre, marca o color. La descripción textual es apoyo, no sustituto de la referencia visual. Si una referencia visual no puede recuperarse, se debe identificar esa carencia antes de generar para no inventar una variante genérica.

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
- `POST /api/objects/look/:look_id/image` asocia una imagen compuesta al look existente; los bytes viven en D1 privado y `Looks.foto_url` conserva la URL same-origin activa.
- `GET /api/objects/look/:look_id/image?v=<version>` sirve esa imagen privada. La imagen no crea objetos ni duplica `LookItems`.
- `POST /api/internal/objects/look/:look_id/render` genera server-to-server un derivado visual a partir de las imágenes canónicas de sus `LookItems`, lo persiste en D1 y actualiza `Looks.foto_url`. No inventa prendas ni crea relaciones.
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

## Regla de ejecución de subidas visuales

Ante una petición de subir o ingerir una imagen al Armario, GESTOR OBJETOS debe leer primero `docs/OBJECTS_IMAGE_INGEST.md` y comprobar Drive + Railway. La ausencia de un POST directo no bloquea la operación: debe usarse el fallback `seed.mjs + OBJECTS_SEED_JOBS` cuando esas herramientas estén disponibles. No se declara éxito sin `ok=true` y verificación posterior en `Armario`. Al terminar o abortar, Railway debe quedar con `OBJECTS_SEED_JOBS` vacío y con su arranque normal `npm start` (script que ejecuta `node server.mjs`).

### Invariante visual: el asset procesado no lleva fondo

Para el Armario, `foto_procesada_url` debe apuntar a una imagen aislada de la prenda/objeto con **transparencia real**. El color que se vea detrás debe proceder siempre de la tarjeta/web, nunca estar pintado dentro del PNG/WebP.

Reglas:
- no aceptar fondos blancos, grises, negros, degradados, sombras de estudio ni escenarios;
- preferir PNG o WebP con canal alpha para `image_type=processed`;
- antes de la ingesta, comprobar que existe una proporción no trivial de píxeles con alpha 0; una esquina blanca no cuenta como transparencia;
- si una iteración anterior quedó aplanada sobre blanco, generar/corregir un nuevo derivado y subirlo sobre el **mismo `objeto_id`** con `overwrite=true`;
- no crear un objeto nuevo ni modificar manualmente las URLs del Sheet;
- tras sustituir, verificar versión nueva en `foto_procesada_url` y `miniatura_url`.

Este guardrail es obligatorio porque ya hubo una regresión real en la que una tanda reciente quedó con fondo blanco mientras las prendas anteriores eran transparentes.

### Fallo recurrente conocido: falsa incapacidad tras procesar la imagen

Este gestor ha mostrado repetidamente un patrón incorrecto: genera o procesa bien una imagen y, en el turno siguiente, actúa como si la capacidad de ingesta al Armario no existiera. Esa conclusión es un **fallo de continuidad/capacidad**, no evidencia de que el pipeline haya desaparecido.

Protocolo obligatorio de autocorrección antes de responder con cualquier negativa de capacidad:

1. detener la respuesta de «no puedo subirla» antes de enviarla;
2. releer esta sección y `docs/OBJECTS_IMAGE_INGEST.md`;
3. comprobar las capacidades reales de la sesión, no las asumidas: archivo procesado actual, Google Drive, Railway y lectura/escritura de la fuente canónica;
4. si existe Drive + Railway, usar el fallback probado `seed.mjs + OBJECTS_SEED_JOBS` aunque no exista una acción HTTP arbitraria;
5. si la imagen ya fue generada en la conversación/runtime, reutilizarla; no pedir al usuario que la vuelva a subir salvo que el archivo haya desaparecido o expirado de forma comprobada;
6. si el usuario indica que «ya se ha hecho antes», tomarlo como señal fuerte de que debe revisarse el runbook y el estado de herramientas antes de afirmar lo contrario;
7. solo declarar un bloqueo cuando se haya identificado una dependencia concreta realmente ausente o un error reproducible. La respuesta debe nombrar esa dependencia/error exacto, no decir genéricamente «no puedo subir imágenes».

La autocorrección debe ocurrir **antes de la respuesta visible al usuario**: un borrador interno de incapacidad no debe convertirse en la respuesta final si el runbook demuestra una ruta operativa.

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
5. arrancar temporalmente Railway con `node seed.mjs && node server.mjs`;
6. exigir `stage=done` + `ok=true` por cada job;
7. verificar `foto_procesada_url`, `miniatura_url` y `estado_procesado=procesada` en Armario;
8. vaciar `OBJECTS_SEED_JOBS`, restaurar `npm start` (→ `node server.mjs`) y limpiar el staging.

La antigua cola `ImageIngestQueue` y su cron de Drive quedan como legado/fallback histórico; no son el procedimiento operativo normal. Las filas antiguas con `OBJECTS_STAGING_META_403` no deben reintentarse ni duplicarse.

El procedimiento completo y checklist de cierre están en `docs/OBJECTS_IMAGE_INGEST.md`.

### Render canónico de looks existentes

Cuando un look ya existe en `Looks + LookItems` y sus prendas tienen miniaturas/recortes canónicos, el procedimiento preferido para completar `Looks.foto_url` es el render server-to-server, no regenerar manualmente el outfit.

```text
look_id + LookItems
        ↓
Armario.miniatura_url / foto_procesada_url
        ↓
POST /api/internal/objects/look/:look_id/render
        ↓
composición privada autocontenida
        ↓
D1 visual
        ↓
Looks.foto_url versionada
```

Reglas:
- solo usa imágenes ya canónicas de las prendas referenciadas;
- exige `superior + inferior + calzado`;
- no crea `objeto_id`, `look_id` ni `LookItems`;
- `overwrite=false` en la primera materialización y `overwrite=true` solo para una sustitución deliberada;
- el bridge expone `/render-look-image` y el seed admite jobs `{ look_id, render: true, overwrite }`;
- el render actual es una composición editorial tipo *ghost mannequin* sin persona visible, con fondo neutro y prendas alineadas por rol;
- la fuente canónica sigue siendo el Sheet; D1 contiene exclusivamente el binario derivado.
