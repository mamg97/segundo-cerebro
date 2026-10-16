# Auditoría · fotografías de recetas recortadas (16/10/2026)

## Causa raíz: dos fallos diferentes

1. **Presentación**: CSS Grid de la ficha de receta conservaba altura mínima intrínseca de fotografías verticales y el contenedor ocultaba el sobrante. Reparado en PR #514 con tracks de mínimos cero y `object-fit:contain`. Despliegue privado [#38877156658](https://github.com/mamg97/segundo-cerebro/actions/runs/38877156658) correcto.
2. **Datos binarios ya recortados**: cinco `RecipeMedia.base64_preview` JPEG 16:9 anteriores a esa PR habían sido generadas recortando el original para rellenar todo el marco. El CSS no puede recuperar píxeles que ya faltan en el JPEG. Se identificó mediante comparación visual **original Drive vs. preview técnica real**.

El 16/10/2026 se regeneraron **desde los originales completos** las cinco previews de:
- `rec-fajitas-tiras-pollo-v1`
- `rec-lentejas-andrea-v1`
- `rec-carpaccio-rucula-parmesano-v1`
- `rec-mousse-pato-cebolla-jamon-v1`
- `rec-focaccia-tomate-queso-v1`

Se aplicó redimensionado determinista conservador `ImageOps.contain` dentro de un lienzo 480×270; fondo lateral derivado de la propia imagen, desenfocado y suavizado; original completo centrado. JPEG calidad 86. Sin cortes, distorsiones, regeneración creativa ni alteraciones culinarias. Cada `RecipeMedia!A:H` se actualizó **por el mismo recipe_id** (preview base64 + 480×270 + SHA-256 + source_drive_file_id + versión). También se incrementó `Recetas.foto_updated_at` para romper caché. Los cinco registros fueron releídos: coincidencia de dimensiones, SHA, origen canónico y timestamp, **5/5 correctos**.

Hash SHA-256 de las nuevas previews (prefijo, no datos privados):
- fajitas: `ef48a4fe3ba0`
- lentejas: `2b1b1835eab8`
- carpaccio: `5c366b299374`
- mousse: `f0491d41a84b`
- focaccia: `a51e0c689103`

## Estado de auditoría

- 24 recetas tenían original privado enlazado; 19 filas técnicas en `RecipeMedia` antes de la reparación.
- Las **5 sin fila técnica** y las **5 filas con hash/dimensiones incompletas** constituyen trabajo futuro de cobertura del pipeline, no evidencia automática de recorte. Con ausencia de preview, la ruta actual recurre al original privado; no eliminar estos enlaces.
- La prueba visual de las demás previews disponibles no reveló el mismo patrón de zoom destructivo. El renderizado debe verificarse frente al original, no deducirse solo de tamaño, MIME, hash o `object-fit`.
- La auditoría de producción [#38877259530](https://github.com/mamg97/segundo-cerebro/actions/runs/38877259530), ejecutada después de la PR CSS pero **antes** de la reparación de estas cinco previews, registró **1260 checks, 1 fallo de MIDAS**, no de imagen. Por tanto, NO equivale a una auditoría visual autenticada posterior a esta reparación de bytes.
- No se modificaron recetas, ingredientes, macros, consumos ni inventario. No se hicieron públicos los originales ni los previews; el manifest temporal privado de transferencia se eliminó tras la escritura.

## Norma de prevención

1. Recuperar original **sin recortar**. Respetar orientación EXIF.
2. Crear derivada 16:9 con **fit contain**, bandas neutras o desenfoque lateral; prohibido `ImageOps.fit` como imagen central, `object-fit:cover`, crop destructivo y deformación. El blur del fondo no sustituye al original: la capa frontal completa siempre debe permanecer visible.
3. Inspeccionar ambas imágenes **lado a lado**, original y preview, buscando plato entero, bordes y objetos significativos. La similitud de hashes es irrelevante.
4. Subir a la **misma fila** técnica por `recipe_id` y actualizar `foto_updated_at`; releer hash/origen/dimensiones y verificar endpoint y DOM autenticados tras refresco.
5. Falta de foto visible, thumbnail roto y fotografía recortada son incidentes distintos: registrar y probar por separado.

**Cierre**: datos técnicos de las cinco vistas previas reparados y verificados en Sheets. Confirmación visual final de esos nuevos bytes **en producción autenticada** pendiente; no declararla por hecho.


## Seguimiento de cobertura · menú semanal (16/10/2026)

- Segunda auditoría de las recetas visibles del 12 al 18/10: **10 recetas con recipe_id pero sin foto original enlazada**; no se deben inventar fotos ni interpretar su ausencia como un recorte. Otras entradas del menú (yogur, comida por elegir) carecen legítimamente de `recipe_id`.
- **Tres recetas sí tenían original pero no derivada técnica:** el batido de 330 g, los filetes de lomo con arroz y el desayuno de huevos con pavo. Se crearon tres previews 480×270 que muestran el original íntegro (`contain`, padding lateral) en `RecipeMedia`. Nuevas entradas verificadas en Sheets: SHA-256, archivo de origen y timestamp de versión coincidentes con `Recetas`. La ingesta histórica y todos los macros se han conservado.
- Cobertura actual tras completar las dos últimas derivadas: **24 recetas con original; 24 filas en `RecipeMedia`; 0 derivadas ausentes**. Cinco previews antiguas siguen requiriendo saneamiento de metadatos incompletos (hash/dimensiones), aunque se pueden visualizar. Estas deudas no deben presentarse como fotos inexistentes.
- UX: las miniaturas sin original muestran explícitamente `Sin foto`, y las peticiones de imagen fallidas `No disponible`; el enlace de receta permanece operativo y no se genera una fotografía ficticia.
- La corrección de datos se ha verificado por lectura posterior de ambas pestañas; **validación visual autenticada tras recargar sigue pendiente**. No declarar el catálogo reparado al 100 % hasta comprobar esas tarjetas y resolver las fotos legítimamente ausentes.


- Se completaron, también desde sus archivos originales y sin recortes, las dos previews pendientes de una receta de pasta con pollo y de una ensalada con pollo. Las referencias, hashes y dimensiones 480×270 quedaron verificadas tras la escritura. No se modificaron recetas, macros ni ingestas.
