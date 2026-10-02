# RECETAS · ingesta privada de imágenes

## Objetivo

Cerrar de forma reproducible el circuito visual de una receta desde una fotografía recibida en una conversación autorizada hasta su representación en la web privada de Segundo Cerebro.

La identidad y los datos de la receta siguen viviendo exclusivamente en la fuente canónica `SEGUNDO CEREBRO - SALUD`. Este pipeline no crea catálogos, JSON, tablas D1 ni inventarios alternativos de recetas.

Flujo obligatorio:

```text
CHAT / fotografía recibida
        ↓
resolver recipe_id canónico
        ↓
ORIGINAL PRIVADO en Drive
        ↓
derivada web 16:9 conservadora
        ↓
RecipeMedia
        ↓
Recetas: referencia original + MIME + foto_updated_at
        ↓
GET /api/health/recipes/<recipe_id>/image?v=<version>
        ↓
Salud → Recetas
        ↓
QA funcional + visual
```

Una ingesta no está terminada hasta cerrar todo el circuito.

## Fuentes y responsabilidades

### Fuente estructurada canónica

Spreadsheet privado exacto: `SEGUNDO CEREBRO - SALUD`.

Pestañas de dominio:

- `Recetas`: identidad, nombre, raciones, macros/notas y referencia a la fotografía original.
- `IngredientesReceta`: ingredientes de la receta.
- `PasosReceta`: preparación ordenada.
- `RecipeMedia`: tabla técnica y oculta con la derivada web privada.

No crear otra Sheet, JSON, tabla D1 ni fichero de inventario para representar recetas o asociaciones receta↔imagen.

### Original fotográfico

Ubicación privada canónica:

`DOCUMENTOS/SEGUNDO CEREBRO/AUXILIARES/RECETAS - FOTOS`

El original:

- se conserva sin modificaciones destructivas;
- no se hace público;
- no se introduce en Git;
- no se sustituye por la derivada web;
- puede conservar orientación/metadatos originales siempre que la referencia canónica sea válida.

### Derivada web

`RecipeMedia` almacena exclusivamente la representación técnica privada que consume la web.

**ORIGINAL PRIVADO ≠ DERIVADA WEB**

La derivada no sustituye al archivo de Drive y no cambia la identidad de la receta.

## Esquema vigente

### `Recetas`

Columnas vigentes relevantes para fotografía:

- `recipe_id`
- `foto_drive_file_id`
- `foto_mime_type`
- `foto_updated_at`

La fila conserva además el resto del contrato de receta ya existente. No reordenar ni redefinir el esquema para una ingesta ordinaria.

### `RecipeMedia`

Contrato técnico vigente:

1. `recipe_id`
2. `mime_type`
3. `base64_preview`
4. `width`
5. `height`
6. `sha256`
7. `source_drive_file_id`
8. `updated_at`

La fila se identifica lógicamente por `recipe_id`. Una sustitución de foto o preview actualiza la misma identidad; no se crea otro `recipe_id` para corregir una imagen.

## Contrato actual del Worker

Endpoint privado de lectura:

`GET /api/health/recipes/<recipe_id>/image?v=<version>`

Comportamiento vigente:

1. intenta leer `RecipeMedia`;
2. si existe una preview válida, la decodifica y responde con `HTTP 200`, `Content-Type: image/*` y `X-Recipe-Image-Source: sheet-preview`;
3. si no existe preview utilizable, intenta descargar el original privado de Drive como fallback;
4. la UI genera `photoUrl` únicamente para recetas con referencia original y usa `foto_updated_at` —o el timestamp de receta como fallback— como versión de caché.

Límites actuales de la preview en backend:

- MIME admitido: JPEG, PNG o WebP;
- base64 máximo aproximado: 1,5 MB codificado;
- binario decodificado: máximo 1 MB.

Por tanto, la derivada debe ser compacta y quedar claramente por debajo de esos límites.

## Resolución de identidad

Antes de tocar ningún archivo:

1. leer `Recetas`;
2. resolver el `recipe_id` correcto;
3. si el vínculo es inequívoco por el contexto, usarlo;
4. si hay dos o más candidatos reales, preguntar al usuario;
5. nunca asociar una fotografía por similitud visual solamente cuando la identidad sea ambigua.

Una corrección visual de una receta existente conserva el mismo `recipe_id`.

## Tratamiento visual

### Regla principal

**La comida completa debe ser visible.**

No se acepta una derivada que elimine parte relevante del plato para llenar el marco.

Está prohibido usar como estrategia de adaptación un recorte destructivo equivalente a `object-fit: cover`.

### Derivada 16:9

La UI de Recetas usa un hero 16:9. La derivada debe prepararse para ese marco:

- orientación corregida;
- imagen completa;
- contenido principal centrado;
- sin deformación;
- relación final 16:9;
- relleno lateral o superior/inferior cuando sea necesario;
- relleno neutro o desenfocado derivado de la propia imagen;
- `object-fit: contain` y `object-position: center` en presentación.

La referencia validada actual usa 480×270. Ese tamaño es un buen objetivo por defecto porque cumple 16:9 y mantiene la preview compacta. Puede usarse otra resolución 16:9 cuando exista una razón técnica, siempre que la imagen sea decodificable y quede bajo los límites del Worker.

### Transformaciones permitidas

Preferir transformaciones deterministas de imagen —orientar, redimensionar, crear lienzo, padding/fondo, compresión y ajustes moderados— sobre una regeneración semántica.

Se permite:

- corregir orientación;
- adaptar lienzo;
- centrar;
- añadir padding;
- usar fondo neutro o desenfocado;
- ajustar moderadamente luz, contraste o color;
- reducir resolución/compresión para la preview.

No se permite:

- añadir ingredientes;
- eliminar ingredientes;
- sustituir alimentos;
- inventar guarniciones;
- modificar cantidades de forma engañosa;
- cambiar el plato hasta que parezca otra preparación;
- recortar partes relevantes de la comida.

Si se usa una herramienta generativa/edición asistida, el resultado debe conservar fielmente el contenido real. Si no puede garantizarse, usar procesamiento determinista.

## Procedimiento operativo de ingesta

### 1. Inspeccionar el estado canónico

Leer:

- la fila de `Recetas`;
- la fila existente de `RecipeMedia`, si la hay;
- ingredientes/pasos solo cuando la operación también afecte a contenido culinario.

No inferir ingredientes, cantidades, pasos, macros, raciones, tiempos ni temperaturas a partir de la foto.

### 2. Conservar el original

Subir o enlazar la fotografía recibida en la carpeta privada canónica.

Recomendación de nombre técnico:

`<recipe_id>_<timestamp>.<ext>`

El nombre es auxiliar; la identidad sigue siendo `recipe_id` en el Sheet.

Registrar el identificador real del archivo de Drive y su MIME. No persistir URL pública ni enlace de compartición abierto.

### 3. Crear la derivada

Antes de procesar, inspeccionar:

- orientación;
- dimensiones;
- relación de aspecto;
- plato completo;
- zonas importantes;
- resolución;
- necesidad de márgenes.

Crear una derivada 16:9 que preserve todo el contenido útil.

Calcular:

- MIME final;
- ancho;
- alto;
- SHA-256 del binario final;
- base64 de la derivada.

### 4. Escribir `RecipeMedia`

Upsert por `recipe_id`:

- `mime_type`
- `base64_preview`
- `width`
- `height`
- `sha256`
- `source_drive_file_id`
- `updated_at`

Para una sustitución deliberada, reemplazar la fila técnica de ese mismo `recipe_id`. No acumular versiones activas paralelas.

### 5. Activar la referencia canónica en `Recetas`

Solo después de tener original y preview preparados:

- `foto_drive_file_id` = original privado;
- `foto_mime_type` = MIME del original;
- `foto_updated_at` = timestamp nuevo.

`foto_updated_at` debe cambiar siempre que cambie la imagen visible o su derivada para romper la caché de `photoUrl`.

En una corrección únicamente de la derivada, conservar el mismo `foto_drive_file_id` original y actualizar `foto_updated_at`.

### 6. Compensación ante fallo parcial

No hay una transacción distribuida entre Drive y Sheets.

Orden recomendado:

1. preservar/subir original;
2. preparar y validar derivada localmente;
3. escribir `RecipeMedia`;
4. actualizar `Recetas` y su versión;
5. verificar lectura privada.

Si el paso 4 falla:

- no crear otro `recipe_id`;
- restaurar o eliminar la fila técnica recién escrita si ha quedado incoherente;
- conservar el original privado para no perder datos;
- no declarar la ingesta terminada.

## Verificación técnica

La URL privada resultante debe:

- responder `HTTP 200`;
- declarar `Content-Type: image/*`;
- devolver bytes decodificables;
- cuando `RecipeMedia` es la fuente, poder exponer `X-Recipe-Image-Source: sheet-preview`.

Un 403 de Drive no es aceptable como resultado final si existe una preview válida en `RecipeMedia`: el Worker debe poder servir la derivada sin depender de Drive.

Si la respuesta sigue mostrando la versión anterior, comprobar primero `foto_updated_at` y la URL versionada antes de reingerir.

## QA de producción

Abrir `Salud → Recetas` y verificar:

- foto visible;
- foto completa;
- sin deformación;
- sin clipping;
- sin overflow;
- sin solapes;
- relación visual coherente;
- responsive correcto en escritorio y móvil;
- orden canónico:
  - FOTO
  - nombre / raciones / macros
  - ingredientes
  - preparación
  - notas.

Una imagen con HTTP 200 pero con plato recortado **falla QA**.

La auditoría automática de producción ya comprueba:

- existencia de tarjetas respecto de la API;
- errores visibles;
- `photoUrl` HTTP 200;
- `Content-Type: image/*`;
- decodificación real;
- `object-fit`/proporciones;
- overflow, clipping, solapes y deformación.

Para una mutación ordinaria de foto usando el pipeline existente no hace falta modificar Git. Basta con verificar el circuito privado y la web. Si se cambia código/capacidad/UI, aplicar el flujo de rama + tests + PR + CI + deploy + `Audit production web`.

## Fallos frecuentes

### Foto recortada aunque cargue

Causa: derivada o CSS con estrategia tipo `cover`.

Corrección: rehacer la derivada conservando la foto completa en 16:9 y comprobar `contain`.

### Foto antigua tras una sustitución

Causa probable: `foto_updated_at` no cambió o la URL no incorporó la nueva versión.

Corrección: actualizar el timestamp canónico y volver a verificar la URL versionada.

### Drive responde 403

El original sigue siendo válido como archivo privado. Si `RecipeMedia` existe y está correcta, el Worker debe servirla primero. No hacer pública la foto para resolver el 403.

### Preview inválida

Comprobar MIME, base64, tamaño decodificado, dimensiones y hash. No degradar el control de backend.

### Identidad ambigua

No adivinar. Resolver contra `Recetas` y preguntar al usuario si persisten varias posibilidades reales.

## Privacidad

- No subir originales ni previews a Git.
- No almacenar blobs privados en el repositorio.
- No publicar enlaces de Drive.
- No copiar identificadores privados a documentación pública.
- No exponer base64 de `RecipeMedia` en logs, PRs o issues.
- Los datos reales permanecen en Sheet/Drive privados.

## Caso validado

`rec-fajitas-tiras-pollo-v1` es un ejemplo ya cerrado del pipeline:

- original privado conservado;
- derivada 16:9;
- imagen completa;
- preview servida por la ruta privada;
- `object-fit=contain`;
- QA de producción correcto.

No reingerir ni rehacer esa imagen salvo nueva foto o petición expresa.

## Checklist de cierre

Una fotografía solo se declara incorporada cuando se cumplen simultáneamente:

- [ ] `recipe_id` resuelto sin ambigüedad;
- [ ] original privado preservado;
- [ ] referencia original + MIME correctos en `Recetas`;
- [ ] derivada 16:9 conserva la comida completa;
- [ ] derivada bajo límites del Worker;
- [ ] `RecipeMedia` actualizada con MIME/base64/dimensiones/hash/origen/timestamp;
- [ ] `foto_updated_at` actualizado;
- [ ] endpoint privado devuelve HTTP 200 + `image/*`;
- [ ] imagen decodificable;
- [ ] web muestra la fotografía completa;
- [ ] sin deformación/clipping/overflow/solapes;
- [ ] responsive correcto;
- [ ] no se ha creado ninguna fuente de verdad paralela;
- [ ] no se han publicado fotografías privadas.
