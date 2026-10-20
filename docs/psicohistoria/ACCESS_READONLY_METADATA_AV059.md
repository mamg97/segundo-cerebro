# PSICOHISTORIA — AV-059 · Descubrimiento privado de metadatos Cloudflare Access

**20/10/2026 · Investigación de configuración read-only.** El proyecto continuará exclusivamente dentro de Segundo Cerebro, como indicó expresamente el propietario. No se publica el observatorio y no se modifica el control de Access.

## Bloqueo específico heredado de AV-057/058

El Worker ya ha desplegado el endpoint `GET /api/research-shadow2027`, con una **segunda defensa criptográfica**: exige un JWT válido de Cloudflare Access con el emisor y la audiencia exactos. La función existente rechaza por defecto si faltan `PSICO_ACCESS_TEAM_DOMAIN` o `PSICO_ACCESS_APP_AUD`.

AV-058 observó por GitHub Actions **HTTP 302 a la autenticación Cloudflare Access en las tres rutas privadas**, incluida esta API, y dejó una auditoría anónima recurrente. **Eso no acredita que el JWT se esté validando para un usuario que sí inició sesión**. No se inventarán valores de configuración.

## Fuente externa y permisos

Documentación oficial de Cloudflare: [List Access applications](https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/applications/methods/list/) mediante `GET /accounts/{account_id}/access/apps` (requiere **Access: Apps and Policies Read**) y [Get your Zero Trust organization](https://developers.cloudflare.com/api/resources/zero_trust/subresources/organizations/methods/list/) mediante `GET /accounts/{account_id}/access/organizations` (requiere **Access: Organizations, Identity Providers, and Groups Read**). La aplicación contiene `aud`, la organización `auth_domain`.

En 2026, `destinations` es el campo vigente y sustituye `self_hosted_domains`. El auditor aplica esta precedencia, no mezcla destinos viejos y nuevos y no confunde una aplicación de una única subruta con la que protege todo el laboratorio. Nunca utiliza un ID de cuenta como etiqueta `aud`.

## Implementación

- `private-cloudflare/scripts/audit-psychohistory-access-metadata.mjs`: GET únicamente a los dos endpoints oficiales, con paginación limitada que falla cerrada si no se completó el catálogo. Identifica una única aplicación self-hosted que cubra las tres rutas esperadas de `segundo-cerebro.mamg97.workers.dev`, valida sólo la **forma** de `aud` y `auth_domain`, sin imprimir sus valores.
- `private-cloudflare/scripts/audit-psychohistory-access-metadata.test.mjs`: tests totalmente ficticios de acceso permitido por lectura, denegación 403, organización inaccesible, apps duplicadas o parciales, `destinations` prioritarios, red ausente y paginación incompleta. La prueba de un AUD bien formado no activa ninguna API.
- `.github/workflows/psychohistory-access-metadata-readonly.yml`: CI sin secretos sobre PR; en `main` usa sólo las credenciales Cloudflare que **ya existan**, sin crearlas ni solicitarlas en chat. Solo imprime estados `OK`, `READ_SCOPE_DENIED`, `NONE`, `UNIQUE`, `AMBIGUOUS`, `INCOMPLETE_PAGINATION`, `CREDENTIALS_UNAVAILABLE`, etc.; **nunca** valores `aud`, hostname de organización, identidades, contenido de respuesta, tokens o políticas.
- No actualiza Workers, reglas Access, Google Sheets ni datos de usuario. `safeToEnablePrivate2027=false` incondicionalmente hasta que se acredite prueba real autorizada y denegada. Un `OK` de la API no prueba ese funcionamiento por sí solo.

## Criterio de éxito y próximos bloqueos

**Éxito de este avance:** clasificar con evidencias reales si las credenciales existentes permiten localizar la app y los metadatos de organización; si falla, identificar con exactitud si faltan permisos de aplicaciones, de organización, conexión o coincidencia de dominios. Solo calificar como `VERIFICADO` la entrega técnica después de tests, merge y CI real (incluso si la respuesta de lectura es `READ_SCOPE_DENIED`).

**No es éxito:** publicar `aud`, activar variables sin verificar o afirmar que la tabla integrada ya muestra los 196 países. La verificación en una sesión real legítima y su contraste con una sesión anónima siguen independientes.

**Estado científico:** `MAD-02=PARCIAL`, `PsicoPredicciones=0`; la cohorte 2027 permanece con 196 países × seis modelos, `SHADOW_NO_EMITIDO`, sin nuevos pronósticos, scoring ni costes. El plan de emisión prospectiva con sello externo antes de enero de 2027 sigue siendo el principal bloqueo científico.

## Hallazgo de producción durante AV-059 y actualización metodológica

El primer workflow de lectura de metadatos ejecutado en `main`, [run 39427421926](https://github.com/mamg97/segundo-cerebro/actions/runs/39427421926), acreditó:
- `APPSAPI=OK`: las credenciales de despliegue existentes **sí pueden listar aplicaciones Access**.
- `ORGANIZATIONAPI=READ_SCOPE_DENIED`: **no** tienen el permiso específico de lectura de organización Zero Trust.
- `TARGETAPP=NONE`, `AUDIENCE=UNVERIFIED`, `TEAMDOMAIN=UNVERIFIED` utilizando el primer comparador **solo de hostnames**.

**Importante:** este `NONE` inicial **no significa que las rutas estén abiertas** (AV-058 obtuvo redirecciones Access en producción). Cloudflare permite [destinos `worker` y `all_workers`](https://developers.cloudflare.com/workers/configuration/cloudflare-access/), por lo que una app que protege directamente al Worker o todos los Workers puede no tener un `domain` del hostname consultado.

La revisión amplía el auditor para distinguir `WORKER_SCOPED_ACCESS_PRESENT_UNMATCHED` de `NO_WORKER_SCOPE_OBSERVED`, sin exponer los `worker_id`. **No determina la audiencia correcta ni certifica la cobertura de una aplicación sin cruzar el identificador real del Worker, la prioridad de destinos/overrides y su política**. Los permisos insuficientes siguen figurando en el resultado y `safeToEnablePrivate2027=false` es incondicional.

La ejecución periódica de diagnóstico ahora puede **completar con éxito técnico aunque una lectura esté denegada o no haya coincidencia**, pero su estado NO aprueba habilitar el visor. Solo una prueba posterior autenticada y una configuración del Worker auditable podrán cambiar la conclusión operativa. No se añaden permisos, claves o secretos nuevos y no se vuelcan configuraciones en logs.
