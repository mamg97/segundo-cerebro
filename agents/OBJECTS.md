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

Fuente privada prevista:

`SEGUNDO CEREBRO - OBJETOS`

Estado actual: **pendiente de creación**.

Hasta que exista:
- la UI puede estar implementada;
- `GET /api/objects` devuelve `source-pending`;
- no se inventan objetos;
- no se crea D1 ni otra hoja como fuente alternativa;
- no se versiona ningún identificador privado.

Cuando exista, el Worker la resolverá por:
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

## API privada

- `/api/state` puede transportar únicamente `objectsSummary`.
- `GET /api/objects` entrega el detalle estructurado bajo demanda.
- Mientras la fuente no exista, el endpoint responde correctamente con `status=source-pending`, arrays vacíos y `source.available=false`.

## Privacidad

Este dominio puede contener números de serie, facturas, fotos, ubicaciones domésticas y valor económico. Se trata como `confidencial`.

Git solo contiene código, contrato y estilos. Nunca contiene inventario real, fotos, números de serie, facturas, ubicaciones precisas ni identificadores privados de la fuente.
