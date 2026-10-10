# HOME — contrato de automatización doméstica (propuesta, NO OPERATIVA)

## Propósito
- El Coordinador enruta solicitudes de robots y domótica a HOME. ORGANIZADOR conserva la propiedad de la interfaz.
- El estado observado del dispositivo y su proveedor autorizado son la autoridad sobre limpieza, batería y errores. D1 privada podrá conservar solo el catálogo mínimo, la cola y las confirmaciones.
- Distinguir siempre: intención solicitada, validación, despacho, aceptación del proveedor y observación física. Ninguna etapa certifica la siguiente.

## Restricciones de privacidad y costes
1. Coste operativo incremental 0 €; reutilizar Cloudflare Worker, Access y D1 existentes, sin planes adicionales.
2. GitHub solo contiene código, documentación y fixtures falsos; nunca planos domésticos, mapas, habitaciones reales, IDs de dispositivos, seriales, tokens, contraseñas o URLs de acceso.
3. No modificar firmware, DNS, cuentas ni servicios configurados en el robot sin evaluación de reversibilidad y aprobación informada.
4. Prohibido exponer puertos domésticos o una interfaz local sin autenticación a Internet.
5. Si un protocolo requiere enviar credenciales o tokens sin cifrado de extremo a extremo hacia el proveedor, se descarta. HTTPS hasta Cloudflare no protege un tramo posterior no cifrado.
6. Todas las acciones de robot deben estar bloqueadas por defecto mientras no exista un transporte cifrado, autenticado y verificable.

## Contrato de comandos
- Acciones admitidas sintácticamente: start_cleaning, pause, stop, return_home y clean_rooms.
- Campos mínimos: command_id UUID, device_id opaco, action, created_at y expires_at. room_ids solo para clean_rooms y solo IDs autorizados server-side.
- La función pura de private-cloudflare/src/home-command-contract.js aplica allowlists, TTL máximo de 120 s y gates de actor, transporte y configuración. No abre conexiones ni autentica clientes.
- El backend futuro debe derivar esos gates de verificación real de autenticación y configuración privada; jamás admitir flags que provengan de comandos JSON o Google Sheets.
- Para despachar, la futura cola D1 debe tener command_id UNIQUE y transición atómica pending → dispatched. Prohibido duplicar órdenes por reintentos.
- Cuando se pierda una confirmación, no repetir start_cleaning sin comprobar el estado real; registrar resultado incierto como tal.
- Los logs solo contendrán códigos de error de lista cerrada. No guardar payloads rechazados.

## Superficies de integración previstas
- Dashboard: sección Hogar y endpoints privados bajo Access, con control CSRF, autorización por dispositivo y auditoría. No disponibles actualmente.
- ChatGPT: un Sheet privado puede actuar como bandeja de entrada mediante el conector Google Drive, pero una fila no es autorización por sí misma. La futura ingesta debe comprobar identidades, idempotencia y caducidad. Para TTL de 120 s, revisar frecuencia de polling y cuotas antes de habilitarlo.
- Proveedor: solo un adaptador de conexión cifrada cuyo servidor, protocolo y credenciales puedan verificarse; no utilizar el cliente legado inseguro.

## Estado y relevo
**Solo existe contrato y test sintáctico; no hay adaptador de proveedor, endpoint, D1, UI desplegada, credencial configurada ni robot controlado.** El bloqueo y plan de validación se documentan en docs/HOME_ROBOT_INTEGRATION.md.
