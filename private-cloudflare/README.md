# Segundo Cerebro privado — Cloudflare Worker

Esta carpeta prepara la evolución de la demo pública hacia una aplicación privada remota sin almacenar datos reales en GitHub.

## Arquitectura

```text
iPhone / iPad / Mac
        │
        │ Cloudflare Access
        ▼
Worker + Static Assets
        │
        ├── /app/       interfaz privada
        └── /api/state  lectura del estado actual
        │
        ▼
       D1
```

El Worker permanece deshabilitado por defecto mediante `PRIVATE_APP_ENABLED=false`. No debe activarse hasta haber protegido el Worker completo con Cloudflare Access.

## 1. Preparar el proyecto local

Desde `private-cloudflare/`:

```sh
npm install
cp wrangler.example.jsonc wrangler.jsonc
```

`wrangler.jsonc` está ignorado por Git.

## 2. Autenticar Wrangler y crear D1

```sh
npx wrangler login
npx wrangler d1 create segundo-cerebro-private
```

Copia el `database_id` devuelto en `wrangler.jsonc`.

Aplica el esquema:

```sh
npx wrangler d1 execute segundo-cerebro-private --remote --file migrations/0001_init.sql
```

## 3. Primer despliegue bloqueado

Con `PRIVATE_APP_ENABLED=false`:

```sh
npm run deploy
```

El Worker debe responder 503 mientras siga bloqueado.

## 4. Proteger el Worker con Cloudflare Access

En Cloudflare:

1. Workers & Pages → `segundo-cerebro-private`.
2. Access → **Protect this Worker behind Access**.
3. Elegir **All traffic**.
4. Crear una política Allow limitada a la cuenta o email autorizado.
5. Verificar en una ventana privada que el Worker exige autenticación.

No continuar si el Worker puede abrirse sin autenticación.

## 5. Migrar la síntesis local

El generador solo lee `.private/state.js` y escribe el SQL resultante dentro de `.private/`, que Git ignora:

```sh
node scripts/make-import-sql.mjs
npx wrangler d1 execute segundo-cerebro-private --remote --file ../.private/cloudflare/import-current.sql
```

La base de datos conserva instantáneas. El importador marca la nueva como actual y deja las anteriores disponibles para recuperación.

## 6. Activar la aplicación

Después de validar Access y cargar la primera instantánea, cambia solo en la configuración local:

```json
"vars": {
  "PRIVATE_APP_ENABLED": "true"
}
```

y despliega de nuevo:

```sh
npm run deploy
```

La URL `workers.dev` será la primera URL privada utilizable desde móvil.

## 7. Comprobaciones obligatorias

- Abrir la URL sin sesión: debe aparecer Cloudflare Access.
- Abrir con la cuenta autorizada: debe cargar el dashboard.
- `/api/health`: debe indicar `snapshotAvailable: true`.
- `/api/state`: debe responder solo tras autenticación y con `Cache-Control: no-store`.
- Git no debe mostrar `.private/`, `dist/` ni `wrangler.jsonc`.
- La demo de GitHub Pages debe seguir mostrando únicamente mocks.

## Límites de esta fase

- Solo lectura desde la web.
- Sin sincronización automática de conversaciones ni cuentas externas.
- Sin escritura remota desde el navegador.
- Sin IA remota.
- Cloudflare Access es la barrera de autenticación; no retirar esa protección mientras `PRIVATE_APP_ENABLED=true`.


## Sincronización financiera derivada desde Google Sheets

La conversación `GESTOR FINANZAS PERSONALES` mantiene una hoja privada derivada llamada `SEGUNDO CEREBRO - ESTADO FINANCIERO`. Esa hoja no sustituye a `ASUNTOS v3.xlsx`: el Excel sigue siendo la fuente oficial y permanece solo lectura para el asistente.

El Worker puede combinar en cada lectura:

```text
D1 (estado general)
        +
Google Sheet privado (estado financiero derivado)
        ↓
/api/state
        ↓
dashboard
```

No se escriben importes reales en Git ni en el bundle estático.

### Credenciales

Se usan cuatro secretos del Worker:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `FINANCE_SHEET_ID`

Si ya existe un JSON OAuth `authorized_user` con acceso de lectura a Drive/Sheets, se puede configurar desde el Mac sin copiar los secretos al chat ni al repositorio:

```sh
cd private-cloudflare
node scripts/configure-google-finance-sync.mjs /ruta/al/authorized_user.json <FINANCE_SHEET_ID>
```

El script envía cada valor a `wrangler secret put`.

### Comportamiento

- `/api/state` parte de la instantánea privada D1.
- Si los secretos están configurados, lee `Resumen`, `Categorias` y `Compromisos` de la hoja derivada.
- `financeSummary` se sustituye en memoria por la versión de Google Sheets.
- La caché financiera del Worker dura 30 segundos.
- Si Google falla, el resto del Segundo Cerebro sigue funcionando y se conserva el resumen financiero que ya exista en D1.
- `/api/health` expone solo el estado técnico `financeSync`, nunca importes.

### Semántica de conciliación

Las filas de categorías usan `source_status`:

- `PROVISIONAL_CHAT`: Miguel registró el movimiento en la conversación, pero todavía no está reconciliado contra `ASUNTOS v3.xlsx`.
- `RECONCILIADO_SHEET`: confirmado contra el Excel.
- `DERIVADO`: cálculo derivado de datos ya verificados.

La web puede mostrar un porcentaje provisional, pero nunca debe presentarlo como conciliado mientras la fuente oficial no lo confirme.
