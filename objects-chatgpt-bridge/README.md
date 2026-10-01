# Objects ChatGPT Bridge

Small server-side bridge between ChatGPT GPT Actions and the canonical Segundo Cerebro Objects image ingest endpoint.

It receives the special GPT Actions `openaiFileIdRefs` file-reference array, downloads exactly one short-lived OpenAI-hosted file, and forwards the binary as `multipart/form-data` to Segundo Cerebro.

## Security

- `CHATGPT_ACTION_API_KEY`: bearer key used only by the GPT Action.
- `OBJECTS_UPSTREAM_SECRET`: independent bearer secret used only bridge → Segundo Cerebro.
- Segundo Cerebro stores only the SHA-256 hash of `OBJECTS_UPSTREAM_SECRET`.
- Only HTTPS OpenAI file hosts from `OPENAI_FILE_HOST_SUFFIXES` are accepted.
- No file is persisted in Railway.
- No Cloudflare Access credential is stored in ChatGPT.
- The canonical storage/write logic remains `POST /api/objects/:objeto_id/image`; the internal route only provides server-to-server authentication.

## Endpoints

- `GET /health`
- `POST /ingest-object-image`

The POST contract is documented in `docs/objects-chatgpt-action.openapi.yaml`.


## Runtime actual

El bridge se despliega como servicio `objects-chatgpt-bridge` y reenvía la escritura al gateway Cloudflare `segundo-cerebro-objects-ingest`. El gateway usa Service Binding hacia el Worker principal, por lo que el bridge no necesita atravesar la pantalla interactiva de Cloudflare Access.

El almacenamiento final no está en Railway ni en Drive: `uploadObjectsImage` persiste los bytes visuales en D1 y actualiza `SEGUNDO CEREBRO - OBJETOS / Armario`.

## Bootstrap operativo desde una conversación ChatGPT

Cuando la sesión no puede invocar directamente `POST /ingest-object-image`, existe `seed.mjs` como bootstrap temporal. No es una segunda implementación: llama localmente a `handleRequest` de `server.mjs`.

Procedimiento:

1. Obtener una referencia temporal válida de la imagen (`openaiFileIdRefs`).
2. Cargar temporalmente `OBJECTS_SEED_JOBS` con un array JSON de entre 1 y 8 jobs.
3. Usar temporalmente el start command `node seed.mjs && npm start`.
4. Redeplegar y exigir en logs `stage=done` y respuesta `ok=true` para cada item.
5. Verificar en `Armario` que existen `foto_procesada_url`, `miniatura_url` y `estado_procesado=procesada`.
6. Vaciar `OBJECTS_SEED_JOBS`, restaurar `npm start` y volver a desplegar.
7. Eliminar cualquier copia temporal usada para materializar la referencia.

Los secretos nunca se escriben en Git ni se imprimen en documentación/logs de aplicación.

El runbook completo está en `docs/OBJECTS_IMAGE_INGEST.md`.
