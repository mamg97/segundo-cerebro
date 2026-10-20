# PSICOHISTORIA — AV-059 · Descubrimiento de Cloudflare Access sin divulgar metadatos

**20/10/2026.** El observatorio de 2027 debe permanecer exclusivamente dentro de Segundo Cerebro. No se amplían las políticas Access ni se publican las probabilidades.

## Problema

AV-058 certificó HTTP 302 hacia el login Access en las tres rutas privadas desde una sesión sin credenciales. AV-057 introdujo un segundo control de firma JWT con `PSICO_ACCESS_TEAM_DOMAIN` y `PSICO_ACCESS_APP_AUD` que se mantiene bloqueado si faltan. No se debe confundir el ID de cuenta con el Audience de la aplicación, ni configurar estos valores a partir de ejemplos de documentación.

## API oficiales, scopes y ejecución

La [API de aplicaciones Access](https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/applications/methods/list/) usa `GET /accounts/{account_id}/access/apps` y requiere **Access: Apps and Policies Read** (u otro permiso declarado por Cloudflare). Devuelve el identificador `aud` asociado a la aplicación. La [API de organización Zero Trust](https://developers.cloudflare.com/api/resources/zero_trust/subresources/organizations/methods/list/) usa `GET /accounts/{account_id}/access/organizations`, requiere **Access: Organizations, Identity Providers, and Groups Read** y devuelve `auth_domain`. Estos permisos son distintos de administrar Workers.

`private-cloudflare/scripts/audit-psychohistory-access-metadata.mjs` realiza solamente GET a estos dos destinos oficiales, mediante el token existente de despliegue o `CLOUDFLARE_ACCESS_READ_TOKEN` **si este último ya existe como secreto**. Limita a cinco páginas; selecciona una aplicación `self_hosted` que cubra las tres rutas exactas del dominio privado; valida solo la *forma* del `aud` y del dominio de equipo. **Nunca imprime** nombres de apps, audiencias, dominios, respuestas API, políticas, tokens, identidades ni IDs de cuenta. Los resultados se limitan a etiquetas `OK`, `READ_SCOPE_DENIED`, `NONE`, `AMBIGUOUS`, `VALID_SHAPE_NOT_EXPORTED` y similares.

`test/audit-psychohistory-access-metadata.test.mjs` (implementado junto al módulo como `.test.mjs`) prueba únicamente datos ficticios: acceso permitido, 403 por falta de scope, dos apps candidatas, app que protege solo una ruta, token ausente, API caída y ausencia de permisos de organización.

`.github/workflows/psychohistory-access-metadata-readonly.yml` ejecuta pruebas sin secretos en PR. **Solo tras fusión en main** consulta la cuenta con secretos ya establecidos. El workflow **no escribe vars de Worker ni configura Access**. Nunca clasifica como `safeToEnablePrivate2027=true`, ni crea modelos, scores o nuevas emisiones.

## Puertas pendientes

1. Obtener del proveedor, por lectura autorizada, la audiencia real unívoca y el dominio de equipo.
2. Comprobar que los metadatos coinciden con el dominio y las rutas del Worker, sin solapamientos Access de otra app.
3. Configurar sin exponer los valores del Worker; comprobar **403 sin JWT** y **200 con JWT legítimo** desde sesión autorizada y, de ser posible, una sesión sin permiso.
4. Verificar el render móvil del ranking experimental sin exponer filas en los logs.

**No es aceptable** ampliar el alcance del token de despliegue a permisos globales para sortear un 403. Si la lectura está denegada, crear un token separado **solo de lectura para Access apps y organización** dentro de Cloudflare y guardarlo como secreto en GitHub; jamás pegarlo en una conversación ni en código.

El bloqueo de seguridad del visor inline continúa hasta superar todas las verificaciones. El registro privado `PsicoPredicciones` continúa vacío, las 1.176 probabilidades 2027 permanecen sombra, `MAD-02=PARCIAL`, coste incremental previsto cero.
