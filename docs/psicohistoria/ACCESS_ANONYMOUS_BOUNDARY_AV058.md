# PSICOHISTORIA · AV-058 — Auditoría anónima de frontera Cloudflare Access

**20/10/2026 · El propietario ha decidido mantener el laboratorio exclusivamente en Segundo Cerebro.**

## Riesgo

El Worker contiene API de laboratorio `/api/research-lab` (referencias y metadatos privados de Sheets) y API nueva `/api/research-shadow2027` (196 países × 6 modelos). En AV-057, esta última requiere JWT criptográficamente verificado contra `PSICO_ACCESS_TEAM_DOMAIN` y `PSICO_ACCESS_APP_AUD`, todavía no configurados/acreditados desde el chat. El código del Worker usa Google OAuth propio y **no se puede dar por hecho que Cloudflare Access cubra todos los hosts**: las rutas `workers.dev` pueden admitir peticiones directas si la aplicación Access protege solamente otro dominio. La existencia de un workflow de despliegue en verde no prueba seguridad de acceso.

## Test continuo read-only sin secretos

- `private-cloudflare/scripts/audit-psychohistory-anonymous.mjs`: tres solicitudes **sin cookies, credenciales ni tokens** desde un runner GitHub externo al Worker de producción, con `redirect=manual` y sin consumir cuerpos de respuesta.
- Comprueba `/api/research-lab`, `/api/research-shadow2027`, `/app/research-lab.html?view=shadow2027`.
- Clasificación `BLOCKED`: HTTP 401/403 o redirección HTTPS hacia equipo Cloudflare Access o ruta local `/cdn-cgi/access/`.
- Clasificación `EXPOSED`: HTTP 200/204/206 en **cualquier ruta** para una petición anónima. Es motivo de **fallo y prioridad de remediación**; nunca se imprimen cuerpos privados.
- `INCONCLUSIVE`: errores de red, HTTP 404/5xx, redirecciones ajenas a Access. Se rechaza afirmar una protección no demostrada.
- `private-cloudflare/scripts/audit-psychohistory-anonymous.test.mjs`: fixtures completamente sintéticos; cero datos o emails personales en Git.
- `.github/workflows/psychohistory-access-boundary-audit.yml`: prueba unitaria y prueba real en cada PR que modifica el auditor, además de opción manual. **No se introducen secretos de Cloudflare en este workflow**.

## Limitación y siguiente barrera

Incluso si las tres rutas devuelven denegación anónima, ello solo establece una condición **necesaria**, no prueba identidad correcta de los usuarios permitidos. El siguiente paso sería comparar acceso autorizado real y acceso denegado, y confirmar que la app Zero Trust aplicada al hostname directo del Worker coincide con la esperada. Cloudflare expone la API oficial `GET /accounts/{account_id}/access/apps`, con permiso de lectura `Access: Apps and Policies Read`, que devuelve etiquetas `aud`/dominios. **No usar el token general de despliegue sin comprobar sus permisos; jamás imprimir AUD, identidad de políticas ni tokens en logs.**

Si la ruta sin credenciales resulta expuesta, corregir el perímetro antes de activar la presentación inline. La tabla del AV-057 permanece en `fail-closed` ante JWT/config incorrectos; el enlace a Drive sigue privado en origen, aunque no exime de investigar la exposición de metadatos.

**Estado científico:** MAD-02 PARCIAL, 196×6 cohort sombra no emitida y PsicoPredicciones vacío. Este avance es seguridad de producto, no prueba de valor predictivo.

## Primera observación externa real

El job `production-anonymous-boundary` de GitHub Actions [39423024862](https://github.com/mamg97/segundo-cerebro/actions/runs/39423024862) ha consultado por HTTPS el Worker de producción, **sin Access JWT/cookies, sin leer bodies**, y obtenido:

| Ruta | Estado sin credenciales | Clasificación |
|---|---:|---|
| `/api/research-lab` | **302** a autenticación Cloudflare Access | `BLOCKED` |
| `/api/research-shadow2027` | **302** a autenticación Cloudflare Access | `BLOCKED` |
| `/app/research-lab.html?view=shadow2027` | **302** a autenticación Cloudflare Access | `BLOCKED` |

El auditor ha comprobado el destino de redirección con lista restringida (equipo Cloudflare Access o `/cdn-cgi/access/` del mismo host). **`anonymous_access_denied_everywhere=true`**. El riesgo de que ese host entregue directamente datos de estas tres rutas a un cliente sin credenciales no se observa en esa medición.

Se ha integrado el paso de prueba anónima **antes de instalar navegador y crear credenciales OIDC** en `.github/workflows/web-audit.yml`, un workflow ya existente con auditorías automáticas aproximadamente horarias. Si una de las rutas deja de estar protegida o hay un error de red que impide determinarlo, la auditoría debe fallar e informarlo, nunca continuar como prueba de acceso seguro. No se añaden infraestructuras o costes de terceros.

**Límite importante:** el 302 mide acceso **no autenticado** únicamente. No demuestra que la ruta con sesión legítima devuelva 200, que `PSICO_ACCESS_APP_AUD` esté configurado en el Worker ni que el usuario pueda ver los 196 países en la tabla integrada. Mantener ese gate pendiente; no se han tocado credenciales, políticas Zero Trust, cohortes ni el estado de emisión.
