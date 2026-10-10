# Hogar / robot Conga 5090 — investigación y handoff (10/10/2026)

**Estado:** análisis de seguridad y validador puro con pruebas. **NO OPERATIVO**. Sin conexiones a robots, sin datos reales y sin cambios de producción.

## Objetivo y arquitectura
Controlar un aspirador desde el dashboard privado de Segundo Cerebro y ChatGPT sin comprar equipo 24/7, sin costes adicionales y preservando el mapa de la vivienda. Reutilizar Cloudflare Access + Worker + D1. GitHub Pages sigue siendo solo mock.

## Evidencia técnica
1. El usuario ha confirmado que la aplicación oficial controla remotamente el robot por datos móviles. **Esto no demuestra que exista una API pública o autorizada para terceros.**
2. El proyecto comunitario antiguo https://github.com/adrigzr/badconga soportaba explícitamente Conga 5090. En su implementación los archivos custom_components/badconga/app/const.py, client.py y socket.py identifican un servidor propio y usan TCP socket simple; transmiten email y contraseña sin TLS explícito. **No reutilizar para conectar cuentas reales.** El funcionamiento actual tampoco ha sido comprobado.
3. La API connect() de Cloudflare admite TCP saliente y opciones de TLS. Sin embargo, si el servidor del fabricante no acepta TLS/autenticación moderna, Cloudflare no puede proporcionarla unilateralmente. Referencia: https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/
4. https://github.com/congatudo/Congatudo lista Conga 5090 entre sus modelos compatibles y permite instalación standalone en el robot, sin equipo permanente adicional. Pero requiere root y redirección de dominios; puede sustituir el funcionamiento de la app oficial. Procedimientos y advertencias: https://congatudo.cloud/installation/standalone-installation/ y https://congatudo.cloud/installation/robot-setup/
5. No se ha verificado todavía ningún método cloud de terceros **cifrado, documentado y seguro** para enviar comandos remotos a la 5090. No se puede declarar un enlace funcional solo porque el móvil controle el robot por Internet.

## Decisión de vías
| Ruta | Equipo doméstico 24/7 extra | Estado |
| --- | --- | --- |
| API cifrada y autorizada por Cecotec | No | Preferida, disponibilidad sin verificar |
| Protocolo heredado BadConga sin TLS explícito | No | **Bloqueada por seguridad** |
| Congatudo standalone en propio robot | No | Contingencia: cambios invasivos y acceso remoto pendiente |
| Bridge en Mac u otro equipo | Sí | No satisface requisito sin equipo permanente |

## Gates de implementación
**0. Investigación read-only (hecho).** No credenciales, no seriales, no mapa ni probing autenticado.

**1. Contrato seguro (propuesto y probado).** Módulo sin efectos private-cloudflare/src/home-command-contract.js, pruebas bajo el glob privado src/*.test.mjs. Cinco acciones allowlisted, dispositivos/habitaciones autorizados, caducidad de 120 s, bloqueo completo por defecto.

**2. Transporte real (pendiente y bloqueante).** Exigir identidad certificada del servidor, cifrado hasta destino, protocolo actual comprobado y autorización de la integración. Si no existe, no crear adaptador hacia el servidor antiguo.

**3. Backend y dashboard simulados (pendiente).** Solo en rama separada: D1 privada con UNIQUE command_id y estados diferenciados: pending, dispatched, acknowledged, failed, expired y unknown. Endpoints autenticados con control de acceso por dispositivo, CSRF, limitación de frecuencia y respuesta sin información del mapa. No confundir un comando guardado con limpieza realizada. Sin datos reales en fixtures ni logs.

**4. Control desde ChatGPT (pendiente).** Considerar el Sheet privado como entrada de intenciones, usando el conector de Google Drive ya autorizado. El Worker no debe confiar en flags o textos de autorización de las filas. Estudiar permisos, ingesta, cuotas y sincronización antes de automatizar. Un TTL de 120 s exige ingesta suficientemente frecuente; con polling más espaciado habrá que revisar el TTL.

**5. Prueba real (pendiente).** Solo después de un proveedor seguro o de una instalación local experimental autorizada con plan de rollback. Conservar el control de la app original cuando sea posible. Verificar inicio/pausa/retorno, confirmaciones y estados reales, nunca afirmar éxito por una mera cola o simulación.

## Coste y seguridad
- El Worker HTTP no funciona como un socket TCP abierto permanentemente; usar conexiones cortas y presupuestos de ejecución controlados si se valida un protocolo remoto seguro.
- Cloudflare Access protege al usuario frente al Worker; no cifra por sí solo la comunicación Worker → nube del fabricante.
- No añadir cron continuo de polling sin contabilizar límites gratuitos de Cloudflare y Google Sheets.
- No activar comandos, no pedir contraseñas en ChatGPT, no publicar archivos de configuración ni datos de vivienda en Git.

## Resultado verificable
- agents/HOME.md: contrato de dominio.
- private-cloudflare/src/home-command-contract.js: validación pura, no integrada.
- private-cloudflare/src/home-command-contract.test.mjs: seis pruebas con fixtures sintéticos.
- Esta documentación contiene el próximo paso y los riesgos. No se ha modificado main, no se han desplegado rutas, no se ha contactado al robot.

**Siguiente decisión técnica:** solicitar/verificar un método remoto cifrado y autorizado para el modelo 5090. Si no se acredita, evaluar Congatudo standalone en el propio robot con consentimiento específico y diseñar acceso remoto sin exponer la LAN.
