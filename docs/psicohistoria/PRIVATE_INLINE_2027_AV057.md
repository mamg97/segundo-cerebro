# PSICOHISTORIA — AV-057 · Observatorio 2027 dentro de Segundo Cerebro

**Decisión del propietario (20/10/2026):** los resultados de PSICOHISTORIA permanecerán **dentro de Segundo Cerebro**. No se publica un observatorio independiente ni sus 1.176 probabilidades en GitHub Pages, en repositorios públicos o en un dominio de acceso libre.

## Objetivo de esta entrega

Mostrar en `2027 · Experimental` el ranking privado de los **196 países**, con seis modelos, búsqueda y comparación, sin obligar a salir a Google Sheets. Mantener un enlace alternativo a la hoja privada del AV-055 si una capa no supera su validación. Las cifras continúan siendo **SHADOW_NO_EMITIDO**; se compara presencia de ≥25 muertes anuales por violencia estatal durante todo 2027, NO comienzo de nueva guerra.

## Arquitectura sin exposición de datos

1. **Fuente canónica:** `PsicoExperimentos` en la hoja privada del laboratorio registra un único experimento `ucdp261-2027-mobile-private-ranking-20261020`, con URL de Google Sheets. La nueva función `fetchPrivate2027Ranking` recupera **la referencia exacta** desde la caché autenticada del laboratorio, valida ID de experimento, edición `UCDP OrganizedViolenceCY 26.1`, estado `SHADOW_NO_EMITIDO`, métrica `paises_ranqueados_sin_emision`, 196 países y HTTPS Google Sheets. No hay ID de hoja ni cifras en el código fuente público.
2. **Control reforzado de sesión:** la ruta `GET /api/research-shadow2027` comprueba **antes de consultar Drive** la firma RS256, `iss`, `aud`, `exp`, `iat` y `nbf` del header `Cf-Access-Jwt-Assertion` emitido por Cloudflare Access. Obtiene las claves públicas JWKS exclusivamente del `https://<equipo>.cloudflareaccess.com/cdn-cgi/access/certs` previsto y rechaza firmas, app AUD o configuración desconocidas. Se devuelve `403` ante fallo, incluso si un cliente llega al Worker por una ruta que eluda Access. Respuesta de éxito `Cache-Control: no-store` y headers `noindex`/CSP existentes.
3. **Cierre por defecto:** la ruta permanece **bloqueada** hasta que estén presentes las variables seguras `PSICO_ACCESS_TEAM_DOMAIN` (ej. `mi-equipo.cloudflareaccess.com`) y `PSICO_ACCESS_APP_AUD` (**audience tag real** de la aplicación Access que protege este Worker). No inventar valores ni reutilizar un UUID de cuenta como audiencia. Estas variables deben introducirse como secretos o vars operativas en la configuración del Worker autorizada y verificar su efecto; nunca publicar la audiencia ni detalles de la política en GitHub. No aceptar solo emails o headers manipulables como prueba de identidad.
4. **Datos:** API de Sheets autenticada con la cuenta de servicio OAuth ya conectada al Worker, rango limitado `'Ranking 2027'!A1:J197`. Se verifica cabecera exacta, 196 filas, rangos [0,1], unicidad, rankings descendentes, diferencias pp y ausencia de filas faltantes; rechazo de cambios silenciosos. Se devuelve solo en respuesta a sesión Access verificada, sin almacenar copias o hacer logs de países.
5. **UI:** el usuario puede pulsar `Ver países y modelos aquí` en la pestaña del laboratorio; una tabla construida desde esa ruta protegida permite buscar, ordenar y escoger modelos. Todo contenido de país se escapa en el HTML. Se evita el fetch automático y se dispone de enlace privado a Google Sheets anterior cuando la autenticación o fuente no están listas. Ninguna credencial OAuth pasa al navegador.

## Criterios de aceptación

- Tests adversariales: JWT ausente, emisor equivocado, audiencia errónea, vencimiento, firma manipulada y `alg=none`; tests de columna de datos, fuente errónea, país duplicado, pérdida de filas y fórmulas modificadas; tabla con HTML malicioso escapado.
- CI de validación específica, privada de Worker y guard de privacidad deben pasar antes del merge.
- El merge/despliegue de Cloudflare no prueba automáticamente que `PSICO_ACCESS_APP_AUD` esté configurado ni que el usuario pueda ver datos dentro del navegador. **No declarar "visor inline funcional" sin ejecutar autenticación Access real.** La ruta tiene bloqueo 403 por defecto y la hoja privada sigue funcionando.
- No cambiar `PsicoPredicciones`, probabilidades, rankings ni cohorte sombra original. `MAD-02=PARCIAL`, entrenamiento y habilidad prospectiva no demostrados.
- La **publicación al público general queda descartada por decisión del propietario**. Cualquier propuesta futura requiere nueva autorización explícita.

**Próximo paso operativo:** configurar las dos variables de Access con los valores reales de la aplicación Zero Trust, validar JWT real de sesión autorizada, comprobar que una petición sin token da 403 incluso en workers.dev y revisar acceso Google Sheets desde navegador del usuario. No incorporar credenciales ni audiencia inventada al repositorio.
