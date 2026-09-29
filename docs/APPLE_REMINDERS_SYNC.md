# Sincronización Apple Reminders ⇄ ListaCompra

## Propósito y límite

La lista compartida de Apple Reminders y `SEGUNDO CEREBRO - DESPENSA / ListaCompra` representan una única lista de compra. Apple es la interfaz cotidiana compartida; Segundo Cerebro conserva identidad de producto, formato, procedencia, precio y motivo.

La sincronización usa EventKit. No usa AppleScript, automatización de interfaz ni acceso directo del Mac a Google Sheets.

```text
Apple Reminders / iCloud
        ⇅ EventKit
SegundoCerebroReminders.app (Mac)
        ⇅ HTTPS + Bearer token privado
Worker mínimo shopping-sync
        ⇅ Service Binding
Cloudflare Worker privado
        ├── Google Sheets / ListaCompra (fuente enriquecida)
        └── D1 (enlaces, cola idempotente, auditoría)
```

iCloud propaga los cambios de la lista compartida entre los iPhone de Miguel y Andrea y el Mac. Si el Mac está apagado, no hay tiempo real: el agente reconcilia al volver a arrancar.

## Estados

| Segundo Cerebro | Apple |
|---|---|
| `REVISAR` | No crea recordatorio. Es una recomendación interna. |
| `COMPRAR` | Debe existir activo. |
| `COMPRADO` | Debe estar completado. |
| `CANCELADO` | Se completa si aún existe; no se borra de forma destructiva. |

Si un recordatorio activo enlazado desaparece de una instantánea completa de Apple, `ListaCompra` pasa a `CANCELADO`. Completar un recordatorio nunca aumenta inventario: ticket, confirmación o reconciliación posterior siguen siendo necesarios.

Si una fila previamente enlazada se elimina físicamente de `ListaCompra`, Segundo Cerebro no la reconstruye desde la instantánea de Apple: encola una única acción idempotente para completar el recordatorio enlazado. Solo se aplica a vínculos persistidos en D1; un recordatorio manual que nunca estuvo enlazado no se toca. Apple lo oculta de la lista activa, pero lo conserva en el histórico de completados.

## Identidad y deduplicación

`ListaCompra` conserva sus once columnas operativas y añade:

- `external_id`: identidad de sincronización generada por Segundo Cerebro;
- `apple_reminder_id`: `calendarItemIdentifier` de EventKit;
- `normalized_name`;
- `apple_completed`;
- `apple_modified_at`;
- `segundo_cerebro_modified_at`;
- `last_synced_at`;
- `sync_status`;
- `sync_error`.

El primer enlace prioriza el ID persistente. Solo cuando todavía no existe usa igualdad exacta del nombre normalizado. Normalizar corrige mayúsculas, espacios y diacríticos; no reduce palabras ni hace matching semántico. Por tanto `café` y `café descafeinado` siguen siendo productos distintos.

Antes de crear en Apple, el Worker comprueba la instantánea recibida y los enlaces existentes. Las acciones se identifican con una clave derivada de operación + elemento + versión deseada; repetir una petición no crea duplicados.

## Conflictos

No se aplica un `last write wins` ciego.

- Se guardan `apple_modified_at`, `segundo_cerebro_modified_at` y `last_synced_at`.
- Si ambos lados cambiaron después de `last_synced_at` y difieren en estado o nombre, la fila queda `sync_status=conflict`, se registra el motivo y no se sobrescribe ninguno de los dos lados.
- Una acción Apple contiene la versión EventKit esperada. Si Apple cambió antes de aplicarla, el agente no escribe y marca la acción como superada; la siguiente instantánea vuelve a planificar con datos actuales.
- Las escrituras propias se confirman mediante `ack` y la instantánea posterior se absorbe de forma idempotente.
- Los errores transitorios se reintentan hasta cinco veces. Los conflictos no se reintentan a ciegas.

## Protocolo privado

El Mac llama al Worker mínimo `segundo-cerebro-shopping-sync`, que valida `Authorization: Bearer <SHOPPING_SYNC_TOKEN>` y reenvía por Service Binding. El dashboard principal sigue completamente detrás de Cloudflare Access; no se crea una excepción ni se requiere una cookie de navegador para `launchd`.

Todos los endpoints usan `Cache-Control: no-store`:

- `GET /v1/shopping-list/sync`: estado técnico;
- `POST /v1/shopping-list/sync`: alias de envío de instantánea;
- `POST /v1/shopping-list/apple-events`: instantánea EventKit; admite `dryRun: true`;
- `GET /v1/shopping-list/pending-apple-actions`: cola idempotente para Apple;
- `POST /v1/shopping-list/apple-actions/:id/ack`: confirmación o fallo;
- `GET /v1/shopping-list/status`: diagnóstico.

El token se genera localmente, se guarda como secreto Cloudflare y en Keychain. No aparece en el repositorio, config JSON ni argumentos de `launchd`.

## Instalación segura

Requisitos: macOS 14 o posterior, Xcode instalado, Worker privado ya configurado y acceso de escritura del OAuth de Google al Sheet de Despensa.

Desde `private-cloudflare/`:

```sh
npm run reminders:install
npm run reminders:configure -- https://URL-DEL-WORKER-SHOPPING-SYNC
```

El primer comando compila una app agente, la firma localmente y prepara `~/Library/LaunchAgents/com.mamg97.segundo-cerebro.reminders.plist`, pero no la arranca. El segundo genera un token aleatorio, lo configura como `SHOPPING_SYNC_TOKEN` tanto en el Worker de ingesta como en el Worker privado y guarda la copia local en Keychain sin imprimirlo.

El nombre de lista solo vive en configuración local. Para usar otro nombre:

```sh
npm run reminders:configure -- https://URL-DEL-WORKER-SHOPPING-SYNC "Otro nombre exacto"
```

El valor predeterminado del aprovisionador es `Lista De La Compra`; no se persiste ningún ID privado de lista.

## Primer permiso y dry-run obligatorio

Ejecutar:

```sh
npm run reminders:sync -- --dry-run
```

macOS mostrará la petición de Recordatorios. Pulsar **Permitir acceso completo**. Si no aparece o se denegó:

1. Abrir **Ajustes del Sistema**.
2. Entrar en **Privacidad y seguridad**.
3. Abrir **Recordatorios**.
4. Activar **Segundo Cerebro Reminders**.
5. Volver a ejecutar el dry-run.

El dry-run lee EventKit y el Sheet, pero no modifica Apple, Sheets ni D1. Informa:

```text
Apple only: N
Segundo Cerebro only: N
Matched: N
Potential conflicts: N
```

Revisar el informe antes de cualquier sincronización real. Si hay conflictos, resolver las filas ambiguas o sus nombres antes de continuar.

## Primera sincronización real

Solo después de aprobar el dry-run:

```sh
npm run reminders:sync
npm run reminders:status
npm run reminders:install -- --start
```

La primera ejecución real:

1. enlaza por ID o nombre normalizado inequívoco;
2. incorpora a `ListaCompra` los recordatorios activos solo presentes en Apple;
3. identifica `producto_id` cuando hay una coincidencia canónica exacta;
4. deja precio y producto vacíos cuando no existe evidencia;
5. encola en Apple solo filas `COMPRAR` sin equivalente;
6. aplica y confirma acciones una a una;
7. registra un resumen de reconciliación en D1.

`launchd` inicia el agente con la sesión, lo reinicia si falla, escucha `EKEventStoreChanged` y reconcilia además cada 90 segundos.

## Diagnóstico

```sh
npm run reminders:status
launchctl print "gui/$(id -u)/com.mamg97.segundo-cerebro.reminders"
tail -n 100 "$HOME/Library/Logs/SegundoCerebroReminders/agent.log"
tail -n 100 "$HOME/Library/Logs/SegundoCerebroReminders/agent.error.log"
```

El estado muestra permiso EventKit, lista localizada, Sheet, última sincronización, acciones pendientes y último error. Para detener sin borrar configuración ni Keychain:

```sh
../macos/SegundoCerebroReminders/scripts/disable.sh
```

## Precio y tickets

Apple conserva solo el título. Segundo Cerebro enlaza `producto_id` con `Productos` y `Precios`, priorizando observaciones procedentes de ticket, después referencias públicas conocidas y finalmente vacío. Nunca inventa un precio.

La portada muestra número de compras confirmadas, primeros cinco nombres, coste conocido y número sin precio. Si faltan precios usa `≥ 24,70 €`, nunca `24,70 € +`. Un ticket posterior puede completar `producto_id` y precio sin modificar el título Apple.

## Verificación desde iPhone

1. Con el agente activo, añadir un artículo nuevo en la lista compartida desde el iPhone de Miguel o Andrea.
2. Esperar el evento inmediato o, como máximo, el fallback de 90 segundos con el Mac encendido.
3. Refrescar Segundo Cerebro y comprobar `ListaCompra`.
4. Cambiar una fila de Segundo Cerebro a `COMPRAR`; comprobar que aparece en esa misma lista de Apple, no en otra.
5. Completarla en el iPhone; comprobar que pasa a `COMPRADO` sin aumentar inventario.

Si el Mac estaba apagado, encenderlo e iniciar sesión: `launchd` ejecutará una reconciliación completa.
