# HOME — cámaras Tapo: vídeo en directo (diseño, NO OPERATIVO)

**Estado:** modelo **Tapo C520WS** confirmado por referencia comercial; versión de hardware V1/V2 aún desconocida. RTSP y ONVIF constan explícitamente para ambas revisiones en la documentación oficial. Red/gateway remoto sin confirmar. **NO OPERATIVO**.

## Intención y propiedad
- Incorporar al dashboard privado una ficha de cámara doméstica/de establecimiento autorizado en **Hogar → Cámaras**, con visualización en directo **solo bajo demanda**.
- La cámara Tapo es la autoridad del flujo de vídeo y de su estado. No guardar vídeo, audio, fotogramas, IP privada, números de serie, contraseñas ni imagen del inmueble en GitHub o D1.
- No mostrar el vídeo en la home general por defecto. A efectos de diseño, tratar imágenes de espacios privados como **confidencial**; si contienen personas o terceros identificables, exigir minimización y autorización de acceso.
- Este dominio debe coordinarse con ORGANIZADOR para la interfaz. No interferir en LITOS, Salud, Finanzas, MIDAS, ni otras automatizaciones.

## Información pendiente de confirmar sin secretos
1. **Confirmado:** familia Tapo C520WS; cámara fija alimentada con adaptador, Wi-Fi o RJ45, PTZ 360°/130°, flujo 2K QHD. Especificaciones oficiales V1 y V2 señalan RTSP=Sí y ONVIF=Sí. No se ha probado el flujo de esta unidad todavía.
2. **Pendiente y opcional:** versión de hardware V1 o V2 y firmware, desde Tapo → cámara → ajustes → información del dispositivo. No solicitar ni registrar MAC, UID, IP pública, número de serie o credenciales.
3. **Pendiente esencial:** modelo exacto del router ya encendido en la red donde está la cámara, y si puede ejecutar VPN/servicio seguro de salida **y** un gateway de vídeo (RTSP→WebRTC/HLS). Una VPN en el router, por sí sola, no convierte RTSP en vídeo HTML5 reproducible en Safari.
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

**Bloqueo actual:** modelo ya verificado, pero faltan capacidades concretas del router y un método de gateway remoto autenticado reproducible dentro de las cuotas gratuitas. No se ha modificado la cámara, creado cuenta RTSP, capturado vídeo ni desplegado una nueva interfaz.

## Plan de decisión para C520WS
1. Identificar el router y evaluar sus funciones reales: no basta con decir que soporta VPN; para reproducción web remota hace falta solución para conversión/entrega de RTSP compatible con Safari (p. ej. gateway WebRTC/HLS) alojada en un host existente y de confianza.
2. Si el router no puede alojarlo y no hay endpoint autorizado en el servicio Tapo, declarar **vídeo embebido continuo sin equipo 24/7 adicional: no viable con la infraestructura verificada**, sin abrir puertos ni inventar URL cloud. La app Tapo sigue siendo la opción disponible.
3. Si la red sí ofrece capacidad, construir integración privada bajo demanda, con flujo de vídeo nunca almacenado y costes medidos, y validar primero conexión desde fuera en un dispositivo propio. No introducir Tapo Care ni pagar servidores de streaming.
4. Documentar consumo de subida del establecimiento, vida de sesión, desconexión, latencia, errores y riesgos de observación de terceros antes del despliegue.
