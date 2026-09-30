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
