# LOOKS · ingesta visual privada sin Railway

## Objetivo

Aplicar a las imágenes de looks el mismo procedimiento que a las recetas:
**original privado en Google Drive → derivada técnica compacta en Sheet privado → Worker autenticado → web**.
La entidad canónica continúa siendo `Looks.look_id`, con sus relaciones en `LookItems`.

## Almacenamiento

- Original: `DOCUMENTOS/SEGUNDO CEREBRO/AUXILIARES/LOOKS - FOTOS` (Drive privado, sin permisos públicos).
- Derivada: pestaña técnica oculta `LookMedia` en `SEGUNDO CEREBRO - OBJETOS`.
- Columnas `LookMedia`: `look_id`, `mime_type`, `base64_preview`, `width`, `height`, `sha256`, `source_drive_file_id`, `updated_at`.
- `Looks.foto_url` conserva solo la URL privada **same-origin** `/api/objects/look/<look_id>/image?v=sheet-<sha256-prefix>`.
- No hay archivos binarios ni registros privados en Git. No se crea otro objeto, look ni repositorio público.

## Vista web y compatibilidad

`GET /api/objects/look/:look_id/image` utiliza dos rutas:

1. `v=sheet-<hash>`: lee `LookMedia` mediante Google Sheets OAuth privado, valida MIME, tamaño, firma y SHA-256 y devuelve `image/*` con `X-Look-Image-Source: sheet-preview`.
2. `v=<version-D1>`: mantiene la lectura D1 actual sin alterar las imágenes existentes.

La elección de ruta es explícita por prefijo. Nunca se intenta leer un preview privado desde el frontend sin pasar por Worker y Cloudflare Access.

## Proceso de ingesta

1. Confirmar el `look_id` existente y resolver prendas contra `Armario`. No duplicar looks ni cambiar su histórico.
2. Conservar el PNG original en la carpeta privada `LOOKS - FOTOS` y obtener su ID real.
3. Preparar WebP 3:4 o el ratio del look, **con transparencia real**, sin recortes destructivos. Por defecto 480 × 640, calidad 75; tamaño codificado menor de 49 000 caracteres por el límite de celda de Sheets.
4. Calcular SHA-256 del binario *WebP*, codificarlo en base64 y escribir la misma fila técnica `LookMedia`, referenciando el Drive original. Preferir una actualización atómica de fila; no duplicarla.
5. Cuando el Worker con soporte `LookMedia` esté desplegado, actualizar `Looks.foto_url` a `/api/objects/look/<look_id>/image?v=sheet-<sha256-prefix>`.
6. Verificar HTTP 200 privado, MIME válido, firma, bytes decodificables, alpha, visualización y que `Looks.foto_url` coincide exactamente con la versión almacenada.
7. Borrar cualquier staging técnico temporal. El original canónico de Drive y la derivada del Sheet deben permanecer.

## Fallos

- Imagen almacenada en Drive pero no visible: revisar `LookMedia`, `Looks.foto_url` y despliegue del Worker; **no hacer público Drive**.
- HTTP 404 `OBJECTS_LOOK_MEDIA_NOT_FOUND`: no hay derivada para el `look_id` o el hash no coincide. No sobrescribir D1 ni crear otro look.
- Error de integridad: regenerar la derivada y su SHA-256 desde el original, no desactivar la validación.
- Fallo de deploy/CI: conservar el original y la preview en estado preparado, **no establecer una URL rota** en `Looks`.

**La ruta anterior D1 sigue vigente para imágenes antiguas**; no migrarlas automáticamente.
