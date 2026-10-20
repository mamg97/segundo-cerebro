# Hobbies — fotos de vino y enlaces comerciales (2026-10-20)

## Estado del dominio
La fuente canónica privada de Vinos es el Google Sheet `SEGUNDO CEREBRO - HOBBIES - VINOS`, pestaña `Catalogo`. Se conservan las primeras 13 columnas A:M y se añaden al final:
- N `tienda`: `Amazon` o `El Corte Inglés` (o vacío).
- O `tienda_url`: dirección HTTPS a la ficha exacta del producto dentro de `amazon.es` o `elcorteingles.es` (o vacío).
- P `imagen_url`: dirección HTTPS pública de una foto de la botella (o vacío).

No duplicar imágenes en GitHub ni guardar datos de catálogo reales en código. `revision`, `fila_origen`, `incidencia_migracion` y `archivado` conservan posición y significado.

## Presentación
La tabla de Vinos muestra `Foto | Título | Denominación | Tipo | Precio | Tienda | Acciones`. Las miniaturas, cuando existen, abren un `dialog` modal con imagen grande (se puede cerrar con botón, clic fuera o Escape). Se cargan bajo demanda. Las imágenes inexistentes o que fallan muestran un placeholder.

Los enlaces exactos verificados abren la tienda en pestaña nueva. Las fichas incompletas muestran **Buscar en Amazon**, que abre solo resultados de búsqueda; nunca debe etiquetarse como vínculo verificado de una botella. El editor permite introducir y corregir tienda, URL e imagen.

## Integridad y precauciones
- No inferir imagen, añada ni variedad a partir de la marca sola. Una ficha como `Muga` no identifica una referencia única.
- `tienda_url` y `imagen_url` deben ser HTTPS. `tienda` debe coincidir con el dominio de la URL, no con el texto introducido por el usuario.
- Las imágenes del comercio son referencias externas y pueden dejar de estar disponibles; se muestran con `referrerpolicy=no-referrer`. No se promete persistencia de medios ajenos.
- Los enlaces comerciales no son la fuente canónica de `precio`: no sobrescribir precios privados de la lista con los precios de tiendas públicas.
- Esta mejora no cambia Películas, Series ni Libros, ni requiere APIs pagadas.

## Despliegue y QA
Cambios: `app/hobbies.js`, `app/hobbies.css`, `private-cloudflare/src/hobbies-sheet.js` y sus tests; versionado de assets. Verificar CI, ejecución del Worker en producción y carga autenticada de al menos dos fotos canónicas. Pruebas: links https/allowlist, compatibilidad de esquema, XSS, edición + revisión, foto ampliable, fallback y móvil.
