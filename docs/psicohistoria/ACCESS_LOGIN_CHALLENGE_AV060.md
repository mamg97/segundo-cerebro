# PSICOHISTORIA — AV-060 · Relacionar el login real con Cloudflare Access

**20/10/2026. Proyecto exclusivo de Segundo Cerebro.** El observable 2027 (196 países × seis modelos) seguirá privado y `SHADOW_NO_EMITIDO`.

## Pregunta técnica preregistrada

El AV-058 demostró tres HTTP 302 de Access sin credenciales. El AV-059 comprobó `APPSAPI=OK`, `ORGANIZATIONAPI=READ_SCOPE_DENIED`, `TARGETAPP=NONE` con las rutas identificadas por el catálogo y `NO_WORKER_SCOPE_OBSERVED`. Ello impide conocer con certeza el `PSICO_ACCESS_APP_AUD` y el dominio emisor exigidos por el verificador JWT; **no prueba ausencia de Access**, y no autoriza desactivar el bloqueo.

**Hipótesis AV-060:** la ruta de autenticación a la que redirige públicamente Access puede contener una referencia de audiencia de 64 caracteres hexadecimales; si es así, contrastarla de forma segura con la aplicación de esa misma audiencia usando el endpoint oficial ya legible `GET /accounts/{account_id}/access/apps?aud=...`. Si el login contiene un dominio `*.cloudflareaccess.com`, solo puede considerarse una **pista pública de equipo**, no una confirmación del `auth_domain` que la API de organización sigue denegando. Si la redirección no trae el tag, la investigación debe declararse no concluyente y no inventarlo.

## Implementación

`private-cloudflare/scripts/audit-psychohistory-access-challenge.mjs` consulta las tres rutas del laboratorio de forma **anónima y sin cuerpos de respuesta**:
- `GET /api/research-lab`
- `GET /api/research-shadow2027`
- `GET /app/research-lab.html?view=shadow2027`

Se exige 302/303/307/308 con `Location` HTTPS limitado al host original o a un `*.cloudflareaccess.com` válido, y pathname `/cdn-cgi/access/`. Para tratar un identificador como *candidato*, las tres rutas deben contener el **mismo segmento hexadecimal de 64 caracteres** detrás de `/cdn-cgi/access/login/`. Un segmento distinto, un hostname no confiable, un fallo de red, o una redirección sin AUD válido producen `NOT_PRESENT`, `PARTIAL`, `CONFLICTING` o resultado no autorizado.

**Ningún valor de `Location`, AUD, dominio de equipo, token de API, JWT, identificador de aplicación, cabeceras confidenciales, nombres de usuarios, países o probabilidades se registra en GitHub Actions.** Los logs contienen solo estados resumidos. La correlación con la API oficial se realiza exclusivamente en el job de `main`, usando credenciales existentes. No se modifica nada en Cloudflare; tests sintéticos aislados en PR.

Si se encuentra una app por AUD, eso aún **no demuestra** que las tres rutas queden asociadas inequívocamente con esa política ni que la sesión del usuario consiga pasar la validación RS256 del Worker. El parámetro de redirección es información pública, no una prueba criptográfica. `shadow2027Unlocked=false` bajo todas las condiciones.

## Criterio de evidencia

- Auditor de sintaxis y seguridad con pruebas adversariales (redirecciones HTTP/evil, respuesta 200, mezclas de audiencia, cuerpo no leído, JWT ausente, scope denegado y varias apps).
- Primera ejecución real desde GitHub Actions sin cookies ni tokens y, si el candidato AUD existe, contraste con el catálogo Access usando permiso de lectura ya comprobado.
- **Verdadero resultado científico:** ninguno; mejora de controles de visibilidad para AV-057. `MAD-02=PARCIAL`, `PsicoPredicciones=0`, cohorte privada intacta.
- Próximo paso si se identifica aplicación: obtener el *team domain* por el canal autorizado, configurar por seguridad las variables en el Worker sin publicar valores, y probar una **sesión legítima 200 frente a anonimato 403/302** antes de declarar disponible la tabla inline. Si no se identifica, priorizar documentación de lo que falta, no habilitar un acceso por atajo.
