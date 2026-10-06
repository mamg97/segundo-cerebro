# Privacidad y seguridad

## Regla fundamental

GitHub contiene únicamente código, documentación técnica, licencias y datos ficticios. Los datos personales reales permanecen en fuentes privadas y en la infraestructura protegida cuando su persistencia es necesaria.

## Datos prohibidos en Git

- Emails o mensajes reales.
- Saldos, extractos, números de cuenta o posiciones patrimoniales reales.
- Datos familiares sensibles o información médica.
- Contraseñas, tokens, API keys, secretos, cookies o credenciales OAuth.
- Exportaciones completas de cuentas personales.
- Identificadores privados que permitan acceso a una fuente.
- Dumps de D1, Sheets o calendarios con datos reales.

## Clasificación

| Nivel | Ejemplo abstracto | Tratamiento |
|---|---|---|
| `normal` | Preferencia de interfaz | Protección estándar |
| `personal` | Objetivo o relación personal | Acceso privado |
| `confidencial` | Contexto financiero resumido | Acceso restringido y minimización |
| `muy_confidencial` | Salud, credenciales o detalle patrimonial | Minimización extrema y persistencia solo cuando esté justificada |

La clasificación no autoriza por sí sola el almacenamiento.

## Propiedad y minimización

- Cada dominio debe declarar su fuente de verdad.
- El sistema transporta o deriva únicamente los campos necesarios para la función visible.
- Evitar duplicar historiales completos cuando basta un resumen o referencia.
- Los fixtures del repositorio deben ser inequívocamente ficticios.
- D1 puede almacenar datos privados cuando sea la persistencia operativa documentada; eso no autoriza a copiarlos a Git.

## Aplicación privada remota

- La aplicación privada se sirve mediante Cloudflare Worker.
- Cloudflare Access protege la superficie interactiva antes de exponer datos.
- `/api/state` y respuestas privadas usan políticas de no caché cuando corresponde.
- El frontend privado debe enviar cabeceras de seguridad y `noindex`.
- Los secretos de Google, iCloud y Health ingest se configuran fuera de Git.
- Los directorios de build, configuración privada y `.private/` permanecen excluidos del repositorio cuando contienen material sensible.

## Lectura y escritura

La seguridad se define por capacidad, no por una regla global de solo lectura.

### Solo lectura

Las integraciones que no necesitan modificar la fuente deben permanecer de solo lectura. iCloud Calendar es el caso de referencia.

### Escritura controlada

HabitQuest, gimnasio, nutrición y energía permiten mutaciones privadas porque forman parte de su función operativa. Cada endpoint debe:

1. validar entrada;
2. escribir solo en la fuente autorizada;
3. conservar la semántica de reconciliación del dominio;
4. no registrar secretos ni contenido sensible innecesario;
5. fallar de forma segura si la configuración privada no está disponible.

No añadir escritura a un dominio nuevo sin revisar fuente de verdad, amenaza y reversibilidad.

## Apple Health

- El navegador no accede directamente a Apple Health; HealthKit solo se lee dentro de la app nativa autorizada en el iPhone.
- El bridge envía únicamente los tipos previstos por el contrato de Salud: actividad diaria, composición corporal, workouts mínimos y señales de recuperación/sueño autorizadas.
- El token Bearer de ingesta es secreto. En el iPhone vive en Keychain con protección de dispositivo; nunca se guarda en Git ni en UserDefaults.
- El repositorio no contiene valores reales de HealthKit, exportaciones de Salud, identificadores de muestras ni historiales médicos.
- D1 privado persiste solo los campos necesarios para análisis longitudinal. No se replica el almacén completo de Apple Health.
- La ausencia de datos se conserva como desconocida; no se inferieren métricas fisiológicas.
- Añadir un tipo HealthKit nuevo requiere justificar su uso en Salud y actualizar este contrato antes de enviarlo.
- La app no solicita permisos de escritura en HealthKit.

## Fotos de recetas

- Las fotos de recetas son datos privados de Salud/Nutrición y no se publican en GitHub Pages ni se versionan en Git.
- El original permanece en Drive privado bajo la estructura operativa de Segundo Cerebro. Una preview web compacta puede persistirse en la pestaña técnica oculta `RecipeMedia` del Sheet de Salud para evitar depender de permisos Drive en tiempo de lectura.
- La aplicación privada entrega la imagen mediante proxy autenticado same-origin y no expone el identificador bruto de Drive ni el contenido base64 al frontend.
- Solo se aceptan referencias a archivos de imagen; una referencia ausente o inválida debe fallar de forma segura y mostrarse como receta sin foto.
- Los ingredientes y pasos reales permanecen únicamente en las fuentes privadas canónicas.

## Frontera pública

GitHub Pages publica únicamente la demo mock. Un fallo o cambio en la aplicación privada nunca debe provocar que datos reales terminen en Pages.

La vista MIDAS solo se habilita en el bundle privado. Su fuente pública contiene exclusivamente carteras y operaciones ficticias; nunca se copia a ese repositorio el diario genético privado, credenciales de brokers ni posiciones personales. La vista no añade su capital demo al patrimonio real.

El extracto del genético original contiene solo fechas y valores de una cartera simulada, sin operaciones ni posiciones. Se recibe con GitHub OIDC firmado y restringido al workflow privado previsto; se guarda únicamente en D1, detrás de la aplicación protegida por Access. El Worker de ingesta público admite escritura autenticada y no ofrece lectura del extracto. La cifra se presenta como rendimiento simulado registrado, con su limitación de ejecución a cierre explícita.

## Modo privado local

`.private/` es una capa auxiliar histórica para pruebas y migraciones locales. Está ignorada por Git, no es la arquitectura principal y no debe servirse por una interfaz de red compartida.

## Revisión antes de commit

- Inspeccionar todos los cambios.
- Buscar secretos y datos reales.
- Confirmar exclusiones de `.private/`, credenciales y exportaciones.
- Verificar que ejemplos y nombres sean ficticios.
- Revisar que ninguna documentación copie valores personales procedentes de las fuentes.

## Incidente

Si se detecta un secreto o dato real en Git: detener la publicación, revocar credenciales si procede, retirar el dato del historial de forma segura y documentar únicamente la corrección técnica.


## Gestor Padres

- El dominio completo se trata por defecto como `muy_confidencial`.
- No se mezclan datos médicos de terceros con el historial de Salud del usuario.
- D1 privado puede guardar estado operativo, cronología breve y referencias documentales mínimas.
- Calendario, Finanzas, LITOS, email y repositorios documentales continúan siendo fuentes propietarias cuando corresponda.
- La demo pública no instancia el módulo ni contiene fixtures que imiten casos reales.
- La home general solo puede recibir un resumen minimizado de atención; el detalle pertenece a la vista privada protegida por Access.

## Despensa

- Inventario real, tickets, precios, patrones de compra, enlaces privados y fotos domésticas permanecen fuera de Git.
- El repositorio público solo contiene lógica, contratos y estilos; no contiene el identificador real del Sheet.
- `/api/state` recibe únicamente un resumen minimizado de Despensa.
- El detalle se carga bajo demanda mediante `/api/pantry`, siempre detrás de Cloudflare Access.
- El navegador no recibe credenciales Google ni consulta Sheets directamente.
- El texto humano del dashboard es una derivación de filas privadas actuales; no se persiste como una segunda fuente de verdad.
- El agente EventKit usa un token exclusivo guardado en Keychain y un secreto Cloudflare; nunca recibe OAuth de Google.
- El nombre de lista se configura localmente y los IDs reales de lista/recordatorio no se versionan.
- D1 puede conservar IDs EventKit, nombres normalizados, timestamps, cola y auditoría porque es infraestructura privada; logs y respuestas nunca deben imprimir el Bearer token.
- La demo pública no llama a `/v1/shopping-list/*` ni contiene nombres reales de compra.


## Objetos y armario

- Inventario real, fotografías, ubicaciones domésticas, números de serie, facturas, garantías y valor económico permanecen fuera de Git.
- El dominio se trata como `confidencial`.
- La demo pública no instancia OBJETOS ni contiene fixtures que imiten posesiones reales.
- `/api/state` recibe únicamente `objectsSummary`; el detalle se carga bajo demanda mediante `/api/objects`.
- El frontend nunca recibe credenciales de Google.
- Los documentos completos permanecen en su fuente propietaria; el inventario guarda como máximo referencias.
- `foto_original_url`, `foto_procesada_url` y `miniatura_url` son referencias privadas asociadas al mismo `objeto_id`; no se hardcodean URLs reales ni bytes de imágenes en Git o en la demo pública.
- La aplicación privada puede renderizar imágenes HTTPS detrás de Cloudflare Access, pero ampliar `img-src` no amplía `script-src` ni `connect-src`; las imágenes no adquieren capacidad de ejecución.
- Las imágenes canónicas de Armario se almacenan como bytes privados en el D1 ya existente mediante tablas técnicas de assets/chunks. D1 no sustituye la identidad canónica del Sheet y la lectura usa rutas same-origin del Worker protegidas por Cloudflare Access.
- `POST /api/objects/:objeto_id/image` no acepta URLs remotas: exige archivo multipart, MIME permitido + firma binaria coherente, máximo 8 MiB y un `objeto_id` existente en el inventario/Armario.
- Las claves físicas del almacén D1 son rutas técnicas versionadas derivadas del `objeto_id`; nunca sustituyen la identidad canónica del Sheet.
- Un fallo de actualización del Sheet desencadena borrado compensatorio de los assets recién subidos. Las sustituciones conservan la versión previa hasta que la nueva referencia canónica se ha escrito correctamente.
- Los logs del flujo registran únicamente etapa, `objeto_id`, tipo de imagen y estado técnico; nunca bytes, tokens OAuth, cookies de Access ni contenido de la fotografía.
- El recorte/eliminación de fondo puede ejecutarse antes del upload por una herramienta autorizada; el Worker persiste el archivo recibido en el almacén visual D1, genera la miniatura y actualiza el mismo registro `Armario`.
- La ausencia de fuente o de imagen se representa como `source-pending`/placeholder; no se transforma en ceros ni en datos ficticios.


## Proyectos

El catálogo real de proyectos es privado.

- No versionar en Git el listado real completo, especialmente proyectos sensibles, repositorios privados o relaciones personales/profesionales.
- Git contiene únicamente el contrato, adaptador y componentes de UI.
- La fuente canónica es `SEGUNDO CEREBRO - PROYECTOS`.
- `/api/state` solo recibe un resumen numérico.
- `GET /api/projects` requiere la aplicación privada protegida por Cloudflare Access.
- Los enlaces privados se transportan desde la fuente privada y no se hardcodean.
- Un proyecto marcado `read_only` puede ser mostrado/documentado, pero este dominio no debe modificar su repositorio o sistema propietario.


## Adherencia de Salud

La clasificación diaria es información privada de Salud.

- No incluir días reales, kcal, proteína, pasos, workouts, hábitos o estados de cumplimiento en Git.
- Git contiene únicamente lógica genérica, UI y contratos.
- `GET /api/health/adherence` solo está disponible en la aplicación privada protegida.
- La pestaña `AdherenciaManual` permanece en el Sheet privado de Salud.
- La demo pública no debe simular datos que puedan confundirse con el histórico real del usuario.


### Staging visual de OBJETOS

Las imágenes generadas por ChatGPT pueden pasar temporalmente por la carpeta privada `SEGUNDO CEREBRO - OBJETOS STAGING` de Google Drive para salvar la limitación actual de acciones MCP personalizadas de escritura en cuentas personales.

- La carpeta no es pública ni se usa para servir imágenes a la web.
- El identificador de Drive solo vive en `ImageIngestQueue` hasta completar la ingesta.
- Los bytes se descargan server-side usando las credenciales Google ya configuradas en Segundo Cerebro.
- Tras éxito, el archivo de staging se envía a papelera.
- Las URLs que persisten en `Armario` apuntan únicamente a lectura privada same-origin de Segundo Cerebro.
- No se publican secretos, tokens, rutas locales ni URLs firmadas externas.


## Gym exercise library

The public exercise catalogue is kept separate from private training data.

- External catalogue requests contain only generic exercise search/filter terms.
- Personal training state remains in the existing private sources.
- Exercise media is resolved by the Worker and served through authenticated same-origin routes.
- The media route only accepts resources resolved from the configured wger provider.
- D1 stores only the minimal mapping between a canonical plan exercise and its public reference exercise.
- Only resources with explicit license metadata are shown, and attribution remains visible.
- Commercial or ambiguous third-party exercise media must not be copied into Segundo Cerebro.

## Recipe ingredient product reference

- Recipe quantities, consumption, targets, inventory and receipt history remain private.
- `/api/pantry/products/:producto_id` is served through the existing authenticated private application boundary.
- The optional Mercadona reference sends only the public numeric SKU resolved from a canonical official product URL. Never send ingredient quantities, recipe names, health history, stock, notes, user identity or Google authorization to Mercadona.
- Official catalogue image references are HTTPS and use `referrerpolicy="no-referrer"`. Recipe photographs keep their existing private same-origin pipeline.
- External reference failures leave the canonical card usable, with missing fields explicitly pending. No paid dependency is introduced.



## Carrera profesional

El dominio Carrera es `confidencial`.

- Nombres reales de managers/compañeros, organigramas, salarios, bandas, oportunidades, candidaturas, notas de negociación y preferencias de transición permanecen en la fuente privada.
- Git contiene únicamente contrato, adaptador, UI y fixtures inequívocamente sintéticos.
- `/api/state` recibe solo el resumen necesario para navegación/priorización; el detalle se obtiene bajo demanda con `GET /api/career`.
- Una estimación salarial debe conservar su etiqueta de estimación; no se transforma en dato confirmado por aparecer en la interfaz.
- Finanzas conserva la autoridad de ingresos y movimientos reales; Carrera no replica extractos, nóminas ni contabilidad.
- URLs de procesos profesionales pueden conservarse en la fuente privada. No versionar referencias privadas, correos de recruiters, documentos de candidatura ni notas personales.
- El portfolio público puede enseñar la arquitectura del módulo usando datos sintéticos, nunca el estado profesional real del usuario o de terceros.
