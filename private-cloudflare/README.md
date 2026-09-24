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
- Si los secretos están configurados, lee `Resumen`, `Categorias`, `Compromisos`, `Deudas`, `Patrimonio` y `EventosImportantes` de la hoja derivada.
- `financeSummary` se sustituye en memoria por la versión de Google Sheets.
- La caché financiera del Worker dura 30 segundos.
- Si Google falla, el resto del Segundo Cerebro sigue funcionando y se conserva el resumen financiero que ya exista en D1.
- `/api/health` expone solo el estado técnico `financeSync`, nunca importes.

### Patrimonio

La pestaña `Patrimonio` contiene una serie histórica derivada con fecha de snapshot, período, nómina de Miguel, nómina de Andrea, suma salarial y patrimonio total. El Worker toma como valor actual el último snapshot con fecha menor o igual a hoy. La portada muestra ese patrimonio y su fecha; el detalle de Patrimonio representa dos gráficas: salarios y patrimonio. No se usan filas futuras como valor actual.

### Deudas

La pestaña `Deudas` mantiene un inventario derivado y minimizado de obligaciones activas. Puede almacenar saldo pendiente, cuota mensual, día de pago, tipo de interés y estado. Los campos desconocidos se dejan vacíos: no se estiman saldos a partir de una cuota mensual. La portada muestra solo el resumen y el detalle se abre bajo demanda.

### Semántica de conciliación

Las filas de categorías usan `source_status`:

- `PROVISIONAL_CHAT`: Miguel registró el movimiento en la conversación, pero todavía no está reconciliado contra `ASUNTOS v3.xlsx`.
- `RECONCILIADO_SHEET`: confirmado contra el Excel.
- `DERIVADO`: cálculo derivado de datos ya verificados.

La web puede mostrar un porcentaje provisional, pero nunca debe presentarlo como conciliado mientras la fuente oficial no lo confirme.


## iCloud Calendar

El calendario principal puede integrarse por CalDAV en modo lectura desde el Worker privado.

### Secretos

- `ICLOUD_APPLE_ID`
- `ICLOUD_APP_PASSWORD`
- `ICLOUD_CALENDAR_CONFIG`

Los nombres concretos de calendarios también se guardan como secreto y no aparecen en Git.

Configuración local:

```sh
cd private-cloudflare
node scripts/configure-icloud-calendar-sync.mjs
```

El script pide el Apple ID y la contraseña específica de app mediante `wrangler secret put`, y después solicita los nombres exactos de cuatro calendarios: personal, trabajo, pareja y familia.

### Privacidad

El Worker solo realiza operaciones CalDAV de lectura (`PROPFIND` y `REPORT`). El estado remoto conserva únicamente título, inicio, fin, ubicación, calendario de origen y área del Segundo Cerebro. No copia asistentes, notas, descripciones ni enlaces de reunión.

El horizonte inicial es de 90 días y la caché del Worker dura 60 segundos.

`/api/health` expone `calendarSync` sin mostrar eventos ni credenciales.


### Eventos importantes y Salud

La pestaña privada `EventosImportantes` almacena reglas y alias personales que nunca deben entrar en Git. El Worker entrega esas reglas al cliente autenticado, que las aplica sobre los eventos de iCloud.

El horizonte de lectura CalDAV es de 550 días para poder detectar con antelación bodas, viajes y citas médicas relevantes. La semana visible continúa filtrándose al lunes-domingo actual.

`Salud` es una vista derivada de iCloud: agrupa próximas citas médicas, gimnasio y nutrición. No escribe ni modifica el calendario.


### Gimnasio

El Worker lee el plan de `GimnasioPlan` dentro del Sheet privado y lo expone como parte de Salud. El histórico no se escribe en Google Sheets: se guarda en la D1 privada mediante tablas creadas de forma idempotente por el Worker.

Endpoints:
- `GET /api/gym`: plan, últimas sesiones y progreso por ejercicio.
- `POST /api/gym/session`: guarda una sesión con sus ejercicios.

La aplicación sigue protegida por Cloudflare Access y no incorpora el plan personal ni pesos concretos al repositorio público.

### Nutrición

La pestaña `Nutricion` está preparada como fuente privada de objetivos/pautas. Si está vacía, la UI muestra un estado pendiente de definir.


### Presupuesto personal

La lectura de `Categorias` incluye la columna privada `owner` (rango `A:K`). El Worker no contiene importes personales: solo transporta los valores de la hoja derivada privada y expone `owner`, junto a los netos separados de Miguel y Andrea.


## HabitQuest

HabitQuest se integra como módulo nativo del dashboard sin mover su fuente de verdad. La hoja original de HabitQuest continúa siendo propietaria de `Habits`, `History`, `Meta` y `SyncState`.

### Configuración privada

El identificador de la hoja se guarda como secreto del Worker:

```sh
cd private-cloudflare
node scripts/configure-habitquest-sync.mjs <HABITQUEST_SHEET_ID>
```

El valor no se incorpora al bundle ni al repositorio. La integración reutiliza las credenciales Google ya configuradas en el Worker. Para marcar/desmarcar hábitos, esas credenciales deben disponer de permiso de escritura sobre la hoja; si el token actual fuera solo lectura, la lectura funcionará pero habrá que autorizar una credencial con alcance de escritura antes de activar las acciones.

### Endpoints

- `GET /api/habits?date=YYYY-MM-DD`: hábitos programados del día, XP, nivel, racha, listado y progreso.
- `POST /api/habits/toggle`: añade una acción LWW a `SyncState`.
- `GET /api/state`: añade un resumen HabitQuest al estado privado cuando está configurado.
- `GET /api/health`: expone solo estado técnico y contadores, nunca nombres de hábitos.

La escritura sigue el mismo criterio de HabitQuest: `SyncState` es append-only y `count=0` representa un desmarcado explícito. La aplicación HabitQuest independiente permanece disponible como fallback durante la validación.


### Gestión de hábitos

Además de marcar/desmarcar el día, el Worker permite administrar HabitQuest desde Segundo Cerebro:

- `POST /api/habits/manage` con acciones `create`, `update`, `archive`, `restore`, `delete` y `reorder`.
- Las escrituras se realizan sobre la misma hoja original `HabitQuest Data`.
- `Meta!B3` se actualiza con un timestamp ISO tras cada cambio para que los clientes HabitQuest detecten la nueva versión remota.
- `delete` es destructivo y reescribe `Habits`, `History` y `SyncState` excluyendo el hábito. `archive` solo cambia su estado y conserva histórico.

La credencial Google del Worker necesita permiso de escritura sobre esa hoja. Si el token actual solo tiene alcance de lectura, la vista cargará correctamente pero las mutaciones devolverán error hasta renovar la autorización con scope de escritura.


## Thinking Orbs

El frontend incluye una copia vendorizada de `@schoolees/thinking-orbs` en `app/vendor/thinking-orbs/`. No requiere servicios externos ni dependencias runtime. Se conserva la licencia MIT y el archivo de atribución del proyecto original.


## Salud / Nutrición

Nutrición usa un Google Sheet privado independiente. Configura su identificador como secreto:

```sh
cd private-cloudflare
node scripts/configure-health-sync.mjs <HEALTH_SHEET_ID>
```

Endpoints:
- `GET /api/nutrition?date=YYYY-MM-DD`: resumen diario, comidas, objetivo, energía e histórico.
- `POST /api/nutrition/entry`: añade una comida planificada o consumida.
- `POST /api/nutrition/food`: añade una ficha a la base reutilizable.
- `POST /api/nutrition/energy`: guarda calorías activas/reposo/total. Este endpoint es el destino previsto para el futuro puente de Apple Health.

La fuente contiene las pestañas `Comidas`, `Registro`, `Objetivos` y `EnergiaDiaria`. El identificador del Sheet no se versiona en Git.


## Apple Health bridge

Apple Health no se consulta desde la web. El iPhone obtiene sus muestras locales con Shortcuts/Health y envía únicamente el resumen energético diario a un Worker de ingesta separado.

Arquitectura:

```text
Apple Watch → Apple Health → Shortcut iPhone
  → segundo-cerebro-health-ingest (Bearer token)
  → Service Binding interno
  → segundo-cerebro
  → D1 health_energy_daily
  → Salud / Nutrición
```

El Worker público de ingesta no conoce Google OAuth ni D1. Solo valida un token y reenvía el resumen al Worker principal mediante Service Binding.

Configuración única:

```sh
cd private-cloudflare
npm run setup:health-ingest
```

El script despliega `segundo-cerebro-health-ingest`, valida el endpoint `/health`, genera `HEALTH_INGEST_TOKEN`, comprueba que `/v1/energy` rechaza peticiones sin Bearer y muestra una única vez la URL y el token que deben guardarse en el Shortcut del iPhone.

La construcción exacta del Atajo y su automatización están en [`../docs/APPLE_HEALTH_SHORTCUT.md`](../docs/APPLE_HEALTH_SHORTCUT.md).

Payload esperado por `POST /v1/energy`:

```json
{
  "date": "YYYY-MM-DD",
  "activeKcal": 600,
  "restingKcal": 1700
}
```

`date` puede omitirse y el puente usa la fecha local de Madrid. `totalKcal` es opcional; si falta y existen activa + reposo, se suma automáticamente. D1 conserva una sola fila por fecha y las sincronizaciones posteriores del mismo día sustituyen la anterior mediante UPSERT. No se envían pasos, frecuencia cardiaca, entrenamientos ni otros datos de salud.

## CI/CD desde GitHub

### Activación inicial del deploy automático

Antes del primer deploy automático desde GitHub, configura una sola vez:

1. Cloudflare API Token:
   - abre `https://dash.cloudflare.com/profile/api-tokens`;
   - crea un token con permisos para desplegar Workers;
   - guarda el valor únicamente como secret de GitHub.
2. Cloudflare Account ID:
   - usa el identificador de la cuenta asociada al Worker;
   - guárdalo como secret de GitHub.
3. En GitHub:
   - repositorio `mamg97/segundo-cerebro`;
   - `Settings → Secrets and variables → Actions`;
   - crea `CLOUDFLARE_API_TOKEN`;
   - crea `CLOUDFLARE_ACCOUNT_ID`.

Nunca escribir estos valores en Git, documentación, issues, logs ni chats.


La app privada puede desplegarse automáticamente con GitHub Actions mediante:

- `.github/workflows/deploy-private-cloudflare.yml`
- secret `CLOUDFLARE_API_TOKEN`
- secret `CLOUDFLARE_ACCOUNT_ID`

El workflow se activa en cambios relevantes de `main`, valida el JavaScript, ejecuta `npm run build`, verifica que el bundle no incluya `.private` y despliega con:

```bash
npx wrangler deploy --config wrangler.bootstrap.jsonc
```

No guardar nunca el token de Cloudflare en Git. Si faltan los secretos, el workflow valida y construye pero omite el despliegue.


## Despensa

La aplicación privada integra `SEGUNDO CEREBRO - DESPENSA` sin copiar su contenido a Git.

Lectura:
- `GET /api/state` añade únicamente `pantrySummary`.
- `GET /api/pantry` devuelve detalle de inventario/productos/precios/lista de compra bajo demanda.
- Caché de lectura: 30 segundos.

Por defecto, el Worker intenta localizar el Sheet por el título exacto `SEGUNDO CEREBRO - DESPENSA` usando el OAuth Google ya configurado. Si el token no dispone de alcance Drive o se quiere fijar explícitamente la fuente, puede configurarse el secreto `PANTRY_SHEET_ID` con `npm run pantry:configure -- <SHEET_ID>`; su valor nunca debe versionarse.

La UI pública de GitHub Pages no contiene ni simula los datos privados de Despensa.


## Objetos

El Worker incluye `GET /api/objects` como adaptador privado del futuro Sheet `SEGUNDO CEREBRO - OBJETOS`.

Resolución de fuente:
1. `OBJECTS_SHEET_ID` si existe como secreto/variable privada;
2. clave `OBJECTS_SHEET_ID` en `IntegracionesPrivadas`;
3. búsqueda exacta por título en Drive.

Mientras la fuente no exista, el endpoint devuelve `status: "source-pending"`, `source.available=false` y colecciones vacías. Esto es un estado esperado y no un error de backend.

La UI pública no instancia el módulo y Git no contiene inventario real.


## Proyectos

El Worker expone `GET /api/projects` para el registro privado `SEGUNDO CEREBRO - PROYECTOS`.

Resolución de fuente:
1. `PROJECTS_SHEET_ID` si existe como variable/secreto privado;
2. clave `PROJECTS_SHEET_ID` en `IntegracionesPrivadas`;
3. búsqueda exacta por título en Drive.

Pestañas: `Proyectos`, `Documentacion`, `Relaciones` y `README`.

`/api/state` recibe solo `projectsSummary`. El catálogo, nombres, enlaces y documentación se cargan exclusivamente bajo demanda. GitHub Pages no recibe esos datos.
