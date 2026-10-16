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

## Continuación técnica: máquina de estados pura (10/10/2026)
- `private-cloudflare/src/home-command-lifecycle.js` modela: `pending → dispatched → accepted → observed`, más `failed`, `expired` y `unknown`. Los nombres no implican que haya conexión real.
- **Aceptada ≠ ejecutada:** solo telemetría contrastada permite `observed`. La caducidad solo anula órdenes `pending`; una ya enviada no se reenvía porque puede estar ejecutándose aunque su confirmación se haya perdido.
- El módulo no persiste, escucha, despacha ni abre sockets. La idempotencia definitiva exige una clave única en D1 y transición atómica al incorporarlo a la aplicación privada.
- `private-cloudflare/src/home-command-lifecycle.test.mjs` añade seis pruebas de transición, duplicados, retrasos, resultados desconocidos y entradas inválidas. **12 pruebas locales del dominio pasan**; comprobar además CI del commit en GitHub.
- Compatibilidad root: la guía comunitaria `congatudo/stuff/docs/rooting-conga.md` enumera varias Conga pero **no enumera explícitamente la 5090**; soporte Congatudo ≠ acceso SSH documentado o método de reversión probado para esta unidad. No hacer pruebas de root remotas.
- La instalación standalone de Congatudo sustituye el acceso cloud normal por redirección local y publica un servidor HTTP doméstico; sin puente saliente autenticado no resuelve automáticamente el control desde Cloudflare. No exponer ese HTTP a Internet.
- Google Play de la app Conga 5000 (s5090) publica una declaración del desarrollador de falta de cifrado de datos: https://play.google.com/store/apps/details?id=es.cecotec.s5090. Es una declaración de privacidad de la app, no una prueba exhaustiva de cada flujo. El usuario confirma que la app oficial funciona por 5G.
- Canal oficial para solicitar API/documentación y posibilidades de integración: ficha pública de la aplicación o https://support.storececotec.com/es/ayuda/robots-aspiradores/app-robot-aspirador. No enviar datos privados ni contraseña en solicitudes iniciales.

## Próximo paso bloqueante
1. Obtener confirmación oficial o evidencia técnica de un endpoint HTTPS/TLS mutuamente validable para este modelo. Sin ello, no habilitar control real.
2. Prototipar cola D1 y UI **únicamente simuladas**, en cambios independientes, con autenticación, CSRF, TTL y validación de la fuente de comandos. Evitar cambios en `main` hasta PR review.
3. Si no existe API remota segura, evaluar el acceso local físico al robot exclusivamente bajo consentimiento informado y respaldo comprobable, sin prometer recuperación ni conservación de mapas.
