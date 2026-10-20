# Hobbies — catálogo compacto y enlaces a terceros (20/10/2026)

## Contrato
`Hobbies` presenta pestañas `Películas`, `Series`, `Libros`, `Vinos` y `Rutas en moto`. La fuente canónica de medios sigue siendo un Google Sheet privado por categoría, con el esquema y los registros originales intactos.

La tabla de Películas, Series y Libros es más densa en escritorio (alto de fila ~32px), y conserva la navegación responsive en móvil, sin barras de desplazamiento internas.

## Enlaces derivados de título, no identificación exacta
- Películas y Series: buscar el título en **FilmAffinity**, usando `https://www.filmaffinity.com/es/search.php?stype=title&stext=...`.
- Libros: buscar el título en **Amazon.es Libros**, usando `https://www.amazon.es/s?k=...&i=stripbooks`.
- Se codifican caracteres especiales; en películas se omite el año final entre paréntesis para mejorar la consulta. Si hay varias obras o ediciones homónimas, el usuario elige dentro de los resultados.
- **Importante:** son enlaces a resultados, NO URLs de ficha verificada; no inventar IDs de FilmAffinity, ISBN ni ASIN. No crear enlaces comerciales de afiliados.
- Abren en pestaña nueva con `rel="noopener noreferrer nofollow"` y `referrerpolicy="no-referrer"`.
- Se derivan durante el render; no hay importaciones de títulos en Git ni cambios en Sheets, Worker, costes o scraping.
- Vinos mantiene enlaces de botella exacta cuando están verificados y búsqueda de Amazon en caso contrario; esta mejora no modifica su estructura visual.

## Validación
Comprobar pruebas `app/hobbies.test.mjs` (categorías, codificación, seguridad HTML, móvil), tests generales y guarda de privacidad. Después verificar CI, fusionar y confirmar despliegue de Cloudflare Worker. Sin datos canónicos privados en el repositorio.

## Ordenación interactiva (20/10/2026)
- Encabezados ordenables mediante botón accesible (teclado, `aria-sort`) y flechas ascendente/descendente.
- Columnas: título, género/denominación, estado/tipo, nota/precio, proveedor de enlace, y foto (vinos). `Acciones` no ordena porque solo contiene botones Editar.
- El orden se calcula sobre **toda** la colección filtrada antes de mostrar los primeros 48 registros y no persiste en la fuente canónica.
- Comparación española natural (`Intl.Collator` con `numeric:true`), valores numéricos reales en notas/precios, ausencia de dato siempre al final, empates estables según orden original.
- Conserva búsqueda, filtros, editor y miniaturas. Al cambiar de columna vuelve a la primera página; `Actualizar` conserva la selección, cambiar de pestaña la reinicia.
- En pantallas pequeñas, donde la cabecera está oculta, se ofrece un selector compacto de campo y botón para invertir la dirección.
