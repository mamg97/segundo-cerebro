# Hogar / Tapo: prueba WebRTC entre Mac e iPhone

**Estado:** CÓDIGO EXPERIMENTAL EN RAMA AISLADA. No integrado en navegación, no desplegado, no habilitado en producción ni probado entre dos dispositivos reales.

## Evidencia previa
El usuario confirmó que la app Tapo iPad funciona en su Mac Apple Silicon y que el navegador Chrome captura correctamente la ventana de Tapo con `getDisplayMedia` (ensayo local con vídeo real). Eso **no valida** conectividad WebRTC remota, permisos, acceso ni compatibilidad Safari iPhone.

## Qué se ha implementado
- `private-cloudflare/src/tapo-rtc-signaling.js`: señalización efímera en D1 privada con dos capacidades de 256 bits distintas por sesión: emisor y receptor.
- `private-cloudflare/tapo-lab/`: web para emitir desde Mac y ver desde iPhone, agregada exclusivamente al build del Worker privado; no se copia a GitHub Pages.
- `private-cloudflare/src/index.js`: rutas bajo `/api/home/tapo/rtc`, bloqueadas por defecto por `TAPO_RTC_EXPERIMENTAL != "true"`; también bloquea la página `/app/tapo-lab/`.
- 15 minutos de plazo lógico para negociar conexión y máximo 3 salas simultáneas; no poll global ni cron. **La eliminación física de D1 no es una TTL automática:** ocurre cuando el presentador pulsa Detener (DELETE) o, si se interrumpió abruptamente, de manera oportunista en la próxima petición posterior al vencimiento. Un registro abandonado puede permanecer en D1 hasta entonces; no prometer retención máxima física de 15 minutos.
- Offer/answer SDP **sin imágenes** en D1, claves almacenadas solo como SHA-256, autorización por rol, controles de origen en escrituras y formato SDP. D1 puede ver metadatos de IP local/ICE dentro de SDP: confidencial y con caducidad, NO vídeo.
- Sesiones ya conectadas pueden seguir funcionando tras los 15 minutos: la caducidad limita *señalización*, no interrumpe por sí sola una llamada WebRTC. Botón detener cierra captura y peer.
- Usa STUN público `stun.cloudflare.com:3478` para intentar comunicación P2P. STUN revela IP públicas y metadatos de conexión a Cloudflare. No hay TURN ni SFU; el vídeo directo está cifrado por WebRTC DTLS-SRTP.
- No audio, no grabación, no logs de SDP/frames, sin contraseña Tapo, sin cuentas en terceros, sin URL pública de cámara.

## Configuración de prueba futura: gated y previa autorización
**NO ejecutar estos pasos sobre producción hasta auditar Cloudflare Access con una ventana privada y revisar privacidad de las personas que puedan aparecer en la cámara.**
1. Verificar Cloudflare Access **sobre todo el tráfico del Worker**, incluidos `/api/home/tapo/rtc` y `/app/tapo-lab/index.html`, desde sesión no autorizada. Un `workers.dev` alternativo sin Access supone STOP.
2. Evaluar los límites de D1/Workers y el número de usuarios/sesiones. No introducir créditos de Cloudflare TURN: fuera del SFU no es gratuito por defecto. Fuente: https://developers.cloudflare.com/realtime/turn/
3. Activar solo en entorno privado de prueba `TAPO_RTC_EXPERIMENTAL=true` en variables seguras y verificar que `PRIVATE_APP_ENABLED=true`; el flag no existe en `wrangler.bootstrap.jsonc` versionado y por defecto permanece desactivado.
4. Verificar acceso restringido a `/app/tapo-lab/index.html` antes de transmitir imágenes. Si se usa entorno preview, debe estar igual de protegido y aislado de la D1 real.
5. Mac (Chrome): mantener Tapo abierta en directo, pulsar «Compartir la ventana de Tapo» y seleccionar **solo la ventana**, no pantalla completa. Copiar invitación temporal mediante portapapeles personal.
6. iPhone (Safari) autenticado en el mismo dominio privado: abrir esa misma URL, pegar la invitación y pulsar «Conectar al directo». No introducir la invitación en URL, chats, registros ni terceros.
7. Comprobar recepción y ausencia de sonido/grabación en Wi-Fi, y luego volver a verificar con el iPhone usando datos móviles, si autoriza el usuario. Comprobar al menos pausa/stop, cambio de aplicación y suspensión del Mac.
8. Si ICE falla en 5G, marcar **BLOQUEADO POR NAT**; no habilitar un TURN de pago ni abrir puertos. No afirmar funcionamiento remoto sin prueba física.

## Límites importantes
- El Mac tiene que estar **encendido y capturando** durante la emisión. No resuelve el objetivo de vigilancia autónoma 24/7.
- Tapo puede detener la reproducción remota o pedir continuar; el frontend no debe fingir imágenes actuales si la ventana se congela.
- Toda persona visible en el taller mantiene sus derechos de privacidad; la transmisión a nuevas superficies debe quedar bajo control del propietario autorizado y no ampliarse a usuarios de la web sin su consentimiento.
- Cloudflare Access solo protege el servicio de señalización/preview. La clave de invitación, que da acceso temporal a una sesión, **debe tratarse como secreta**.
- La prueba no integra aún una tarjeta funcional en el dashboard principal; únicamente página aislada bajo Access.
- No almacenar frames, audios, capturas, correos, contraseñas, ID reales ni IP privadas en repositorio/fixtures.
- No es producción. Permanece en PR borrador hasta tests, revisión de seguridad, evaluación de coste, QA real y autorización específica.

## Resultado mínimo
1. CI completa correctamente en rama.
2. Apertura del HTML y rutas da 404 con flag desactivado.
3. Permisos de Access verificados por usuario autorizado y no autorizado, tanto frontend como backend.
4. Dos dispositivos negocian, se recibe vídeo real y variable, y el botón detener deja sin imagen.
5. Conexión falla de forma segura sin TURN si ICE no obtiene ruta.
