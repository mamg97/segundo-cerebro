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

El Sheet contiene el contrato v0.1 y todavía no contiene objetos personales inventados. El Worker la resuelve por:
1. `OBJECTS_SHEET_ID` privado, si está configurado;
2. registro privado `IntegracionesPrivadas`;
3. búsqueda exacta por título en Drive.

## Contrato inicial v0.1

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

Una prenda no debe existir solo en Armario: primero debe existir como objeto.

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
- `GET /api/objects` entrega el detalle estructurado bajo demanda.
- Si en el futuro la fuente no pudiera resolverse, el endpoint degrada a `status=source-pending`, arrays vacíos y `source.available=false`; con la fuente actual debe responder como conectada.

## Privacidad

Este dominio puede contener números de serie, facturas, fotos, ubicaciones domésticas y valor económico. Se trata como `confidencial`.

Git solo contiene código, contrato y estilos. Nunca contiene inventario real, fotos, números de serie, facturas, ubicaciones precisas ni identificadores privados de la fuente.
