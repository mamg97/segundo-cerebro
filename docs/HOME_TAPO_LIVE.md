# HOME — cámaras Tapo: vídeo en directo (diseño, NO OPERATIVO)

**Estado:** modelo **Tapo C520WS** confirmado por referencia comercial; versión de hardware V1/V2 aún desconocida. RTSP y ONVIF constan explícitamente para ambas revisiones en la documentación oficial. Router identificado como **Movistar HGU Askey RTF3505VW**; gateway remoto sigue sin verificarse. **NO OPERATIVO**.

## Intención y propiedad
- Incorporar al dashboard privado una ficha de cámara doméstica/de establecimiento autorizado en **Hogar → Cámaras**, con visualización en directo **solo bajo demanda**.
- La cámara Tapo es la autoridad del flujo de vídeo y de su estado. No guardar vídeo, audio, fotogramas, IP privada, números de serie, contraseñas ni imagen del inmueble en GitHub o D1.
- No mostrar el vídeo en la home general por defecto. A efectos de diseño, tratar imágenes de espacios privados como **confidencial**; si contienen personas o terceros identificables, exigir minimización y autorización de acceso.
- Este dominio debe coordinarse con ORGANIZADOR para la interfaz. No interferir en LITOS, Salud, Finanzas, MIDAS, ni otras automatizaciones.

## Información pendiente de confirmar sin secretos
1. **Confirmado:** familia Tapo C520WS; cámara fija alimentada con adaptador, Wi-Fi o RJ45, PTZ 360°/130°, flujo 2K QHD. Especificaciones oficiales V1 y V2 señalan RTSP=Sí y ONVIF=Sí. No se ha probado el flujo de esta unidad todavía.
2. **Pendiente y opcional:** versión de hardware V1 o V2 y firmware, desde Tapo → cámara → ajustes → información del dispositivo. No solicitar ni registrar MAC, UID, IP pública, número de serie o credenciales.
3. **Identificado:** router existente Movistar HGU Askey RTF3505VW, con firmware de operador. No consta ninguna función estándar del firmware para ejecutar procesos arbitrarios, `cloudflared` ni un gateway RTSP→WebRTC/HLS; no tratarlo como servidor de streaming. Una VPN, aunque existiera, no convierte RTSP en vídeo HTML5 reproducible en Safari.
4. **Pendiente:** confirmar condiciones de uso de grabación SD/Tapo Care y número de flujos simultáneos antes de abrir un RTSP de terceros; el fabricante documenta límites concurrentes.
5. **Pendiente:** prueba local únicamente, si fuese necesaria, desde software confiable en la misma LAN y con cuenta de cámara independiente. No compartir cuenta, dirección IP o URL RTSP que contenga credenciales.

## Hechos contrastados (manuales oficiales TP-Link, 2026)
- Tapo ofrece visualización remota dentro de su aplicación móvil, pero no proporciona de manera documentada un reproductor web insertable universal de la cuenta personal.
- En cámaras cableadas compatibles, RTSP publica una señal en la red local por defecto en puerto 554. ONVIF Profile S permite software de terceros y a veces PTZ, pero no audio bidireccional.
- La cuenta de cámara necesaria para RTSP/ONVIF es distinta del ID TP-Link y sus claves no deben copiarse a este repositorio, a conversaciones ni al navegador.
- RTSP no es una fuente HTML5 que se pueda colocar directamente en una etiqueta `<video>`. Para Safari/iPhone y el dashboard remoto hace falta un reproductor/gateway adaptado (por ejemplo WebRTC/HLS) y un camino autenticado hasta la red del dispositivo.
- No se debe exponer RTSP/ONVIF al Internet público mediante port forwarding. TP-Link recomienda VPN.
- Cloudflare Access en el dashboard **no convierte** una IP local remota en accesible, ni Worker/D1 es un transcodificador de RTSP en directo; un túnel seguro requiere software/función de salida o red privada que realmente pueda llegar a la cámara.
- Una API abierta para partners de TP-Link se anunció en documentación comercial histórica, pero no implica que un usuario consumidor tenga API pública para ver la señal de cámaras por web.

Fuentes:
- https://www.tp-link.com/es/support/faq/2680/
- https://www.tp-link.com/es/support/faq/4465/
- https://www.tp-link.com/es/home-networking/cloud-camera/tapo-c520ws/v1/
- https://www.tp-link.com/es/home-networking/cloud-camera/tapo-c520ws/
- https://www.tp-link.com/es/support/download/tapo-c520ws/

## Opciones, condicionadas por prueba
**A) Proveedor oficial con salida HTTPS/WebRTC autenticada compatible con inserción.** Preferible si modelo/servicio permite acceso autorizado y documentación comprobable. No asumir disponibilidad.
**B) Bridge seguro ya disponible en red del lugar.** Un router compatible (si se verifica capacidad técnica) o un equipo existente siempre encendido podría conectar RTSP local a un gateway WebRTC/HLS, publicar únicamente a través de un canal cifrado/Access y con autorización granular. No comprar ni encender equipo adicional por defecto. Validar carga, tráfico, límites gratuitos, latencia y caducidad de sesiones.
**C) Sin A/B: acceso a la aplicación Tapo** desde el dashboard mediante navegación explícita, si se verifica un mecanismo de apertura; no presentar ese enlace como vídeo integrado. No inventar URL scheme privado Tapo.

## Contrato de UI esperado cuando sea viable
- Tarjeta compacta de cámara con icono, alias proveniente de fuente privada, estado `no-configurada/desconocida/lista/error`.
- Acción manual «Ver directo» carga un reproductor autenticado bajo demanda; «Cerrar» termina la sesión y libera recursos.
- No activar audio/micrófono automáticamente. El usuario debe permitir audio explícitamente si se implementa.
- No guardar frames en logs, telemetría, auditorías, miniaturas del dominio ni caché HTTP; `Cache-Control: no-store`, sin URLs ni credenciales en cliente.
- Ante pérdida de enlace, indicar «señal no disponible», **nunca sustituir por la última imagen fingiendo tiempo real**.
- En demo pública no debe aparecer cámara real, plano, capturas personales ni URLs de transmisión. El dominio Home nunca debe emitir datos reales en `/api/state` sin revisión de privacidad.
- Separa `stream configured`, `stream connected`, `frame received`, `stream live`: un endpoint 200 o una sesión autenticada no garantizan imágenes actuales.

## Gates para activar
1. Modelo/hardware confirmado y soporte RTSP/ONVIF o streaming remoto oficial demostrado.
2. Transporte remota cifrado y autenticado verificado hasta la fuente, nunca puertos RTSP/ONVIF abiertos a Internet.
3. Validación funcional de vídeo real en iPhone fuera de la Wi-Fi del establecimiento, con inicio/cierre de sesión y errores visibles.
4. Medición del tráfico/capacidad para preservar coste operativo incremental cero.
5. QA de autorización del establecimiento y privacidad; datos sensibles solo en superficies privadas.

**Bloqueo actual:** cámara C520WS y router Askey RTF3505VW identificados; no se ha encontrado capacidad estándar del router para ejecutar un gateway remoto autenticado y compatible con Safari dentro de las cuotas gratuitas. No se ha modificado la cámara, creado cuenta RTSP, capturado vídeo ni desplegado una nueva interfaz.

## Plan de decisión para C520WS
1. Router identificado: Movistar HGU Askey RTF3505VW. No consta función estándar para alojar servidor de vídeo ni `cloudflared`; no intentar firmware no oficial ni abrir puertos. Para reproducción web remota se necesita una solución de conversión/entrega de RTSP compatible con Safari (p. ej. gateway WebRTC/HLS) en un host existente y de confianza.
2. Si el router no puede alojarlo y no hay endpoint autorizado en el servicio Tapo, declarar **vídeo embebido continuo sin equipo 24/7 adicional: no viable con la infraestructura verificada**, sin abrir puertos ni inventar URL cloud. La app Tapo sigue siendo la opción disponible.
3. Si la red sí ofrece capacidad, construir integración privada bajo demanda, con flujo de vídeo nunca almacenado y costes medidos, y validar primero conexión desde fuera en un dispositivo propio. No introducir Tapo Care ni pagar servidores de streaming.
4. Documentar consumo de subida del establecimiento, vida de sesión, desconexión, latencia, errores y riesgos de observación de terceros antes del despliegue.

## Comprobación desde Tapo iOS (11/10/2026)
- La pantalla del usuario muestra «Sobre la cuenta de la cámara» y la acción «Crear ahora». Tapo confirma explícitamente que puede crearse una cuenta de cámara separada para clientes RTSP/NVR/NAS.
- **No consta que se haya pulsado «Crear ahora» ni que exista una cuenta RTSP configurada.** No suponer credenciales, emisión accesible, router identificado ni streaming remoto funcional.
- Crear esta cuenta no proporciona acceso remoto público: TP-Link exige que el cliente esté en la misma red local salvo VPN/puente privado; no pedir ni registrar contraseñas, IP, URL RTSP o capturas del entorno.
- Modelo C520WS + pantalla compatible confirman capacidad conceptual de transmisión local, pero el siguiente requisito bloqueante sigue siendo determinar una salida cifrada y autenticada desde la red del taller sin dispositivos adicionales.

## Comprobación del router mediante fotografías (11/10/2026)
- El equipo muestra marca Movistar y ASKEY, diseño HGU fibra. Modelo **Askey RTF3505VW** identificado con alta confianza por etiqueta y carcasa, coherente con SACE 2847 según información de Movistar: https://www.movistar.es/blog/router/router-movistar-modelo-tipo-router/ . La imagen de la etiqueta tiene resolución limitada, por lo que si se requiere una revisión de hardware exacta será necesaria lectura adicional.
- Este HGU con firmware habitual del operador no acredita capacidad para alojar procesos arbitrarios, `cloudflared` ni transcodificador o gateway RTSP→WebRTC/HLS. **No usar el router como puente de vídeo por defecto.** Las opciones de enrutamiento/port forwarding o pasar una VPN de terceros por NAT no equivalen a alojar ese software.
- La documentación oficial Cloudflare exige ejecutar `cloudflared` en un host con acceso local a la cámara: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/private-net/cloudflared/ ; la aplicación Tapo remota no satisface ese requisito.
- **Privacidad:** las fotos originales de la etiqueta incluyen parámetros de acceso a la Wi-Fi y la administración del router. NO subirlas ni copiarlas a Git, Issue, logs, PR o infraestructura privada innecesariamente; este documento solo conserva familia/modelo sin MAC, SSID, número de serie ni contraseña.
- **Resultado:** cámara RTSP compatible, pero ninguna ruta segura de vídeo incrustado remoto operativa sin endpoint oficial de streaming para terceros o host en LAN que funcione durante la visualización. No declarar entrega de vídeo implementada. Una opción inmediata es abrir la aplicación Tapo fuera del dashboard; cualquier botón de acceso directo deberá usar un enlace oficial verificado, nunca un esquema de URL inventado.

## Nueva vía: aplicación Tapo instalada en Mac Apple Silicon (11/10/2026)
- El usuario confirma con una captura que Tapo se ejecuta en macOS (Mac Apple Silicon) y que visualiza vídeo remoto de la cámara desde su ventana. La fecha visible en el vídeo coincide aproximadamente con la barra del sistema. No guardar la captura: contiene personas y ubicación privada.
- **Nueva arquitectura de prueba temporal**: Tapo nativo en Mac → captura voluntaria de esa ventana mediante API web `getDisplayMedia` (en Chrome u otro navegador compatible) → señal WebRTC cifrada con sesión autorizada → reproductor de Segundo Cerebro. NO requiere API de Tapo, acceso al router ni creación de cuenta RTSP.
- Primera prueba segura y desconectada de la nube: una página HTML local con `getDisplayMedia({video:true,audio:false})` y previsualización `<video autoplay muted playsinline>`. Comprobar que macOS permite capturar la ventana nativa y que el contenido es imagen real cambiante (no negra/estática). Autorización de grabación de pantalla de macOS solo al navegador que se elija. Sin enviar imágenes a servidor, persistirlas o mostrarlas a otros usuarios.
- **Restricción física**: el Mac debe permanecer encendido, con Tapo mostrando imagen y permiso de captura durante cada sesión; suspenderlo, cerrar Tapo o interrumpir la vista remota corta la emisión. No ofrecer servicio permanente 24/7 ni presentarlo como reemplazo de un gateway local siempre encendido.
- **Puerta pendiente**: la prueba local no es todavía retransmisión. WebRTC entre redes requiere señalización autenticada (posible Worker/D1 existente), negociación ICE y, si no hay conexión directa, un TURN; no presuponer una infraestructura TURN gratuita, fiable e ilimitada. El Worker no debe recibir ni retransmitir fotogramas como solución improvisada, por costes y privacidad. Implementar únicamente después de confirmar que `getDisplayMedia` captura realmente Tapo.
- Navegador y app pueden limitar captura de apps iPad; si devuelve pantalla negra, no presuponer que basta con cambiar permisos ni prometer que la emisión funcionará. Priorizar privacidad: vídeo solo bajo demanda, audio desactivado, sin grabación ni cacheo.
- Resultado actual: **app Mac verificada; captura de ventana NO probada; WebRTC remoto NO implementado; dashboard SIN directo**. No cambiar producción ni router.
