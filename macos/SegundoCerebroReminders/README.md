# Segundo Cerebro Reminders Agent

Agente local privado para macOS. Usa EventKit y la lista compartida configurada; no automatiza clics ni expone Google Sheets.

Comandos:

```sh
swift build -c release
swift test
./scripts/install.sh
cd ../../private-cloudflare && npm run reminders:configure -- https://URL-PRIVADA
./scripts/request-permission-and-dry-run.sh
./scripts/enable.sh
```

El aprovisionador genera un token aleatorio, lo configura como secreto de Cloudflare y guarda la misma credencial en Keychain sin imprimirla. La URL y el nombre de lista viven en `~/Library/Application Support/SegundoCerebroReminders/config.json`; el agente vive en `~/Library/LaunchAgents`. Ningún secreto entra en Git.

Mientras está activo escucha `EKEventStoreChanged` y además reconcilia cada 90 segundos. Si el Mac está apagado, los cambios quedan en iCloud y se reconcilian al volver a iniciarse.
