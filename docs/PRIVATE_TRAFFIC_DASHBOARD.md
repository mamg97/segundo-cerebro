# Panel privado genérico de tráfico web

## Arquitectura y confidencialidad

- El código público solo contiene una capacidad genérica de métricas de sitios; **no incluye nombres reales de organizaciones, URLs de proyectos ni IDs de cuenta**.
- Los sitios, prefijos de ruta, cifras observadas y etiquetas se almacenan exclusivamente en **D1 privada**, bajo la aplicación protegida por Cloudflare Access.
- Integración en la pestaña privada **Proyectos → Tráfico web**. La demo estática pública no presenta el panel ni datos reales.
- Endpoint autenticado y mismo origen `GET /api/web-traffic?days=90` y `POST /api/web-traffic`. POST exige `Origin` local y `application/json`; no admite escrituras externas.
- No se conecta ninguna cuenta de proveedor ajena al Worker. No se envían credenciales ni se importan URLs/cifras de otros productos en GitHub.
- Migración `0018_web_traffic.sql`, aplicada por el workflow de despliegue privado normal.
- Compatible con costes ordinarios del nivel gratuito, sin tareas adicionales ni polling.

## Modelo

`web_traffic_sites(id, label, path_prefix, created_at, updated_at)`: catálogo exclusivamente privado.
`web_traffic_daily(site_id, day, visits, page_views, source, updated_at)`: una observación diaria por sitio, con `NULL` para campos no conocidos.

La interfaz permite añadir un sitio usando un nombre interno y un prefijo como `/producto-ejemplo/`, y registrar cifras verificadas del proveedor por fecha. El código no inyecta métricas ficticias y nunca convierte ausencia de datos en ceros.

**Límite actual:** no existe aún conexión automática a una API externa de analítica. Una captura del proveedor o una exportación validada requiere incorporación al registro privado. Esto es intencionado: no introducir tokens entre cuentas organizativas y personales sin diseño de seguridad explícito. La disponibilidad y frescura se muestran de manera transparente.

## Pruebas

`node --test app/site-traffic.test.mjs private-cloudflare/src/site-traffic.test.mjs`

El despliegue completo ejecuta los tests y aplica las migraciones antes de publicar el Worker. Tras desplegar, validar la ruta bajo Cloudflare Access. La ausencia de sitios registrados debe mostrar un estado vacío, no valores falsos.

## Evolución futura

Podrá añadirse una fuente agregada independiente mediante un adaptador de lectura con configuración inyectada solo en runtime privado. El catálogo real sigue en D1 y el código público no debe contener enlaces directos entre proyectos ni credenciales externas.
