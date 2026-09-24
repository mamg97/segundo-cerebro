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

- El navegador no accede directamente a Apple Health.
- El iPhone envía únicamente el resumen energético necesario mediante un Worker dedicado.
- El token Bearer de ingesta es secreto y no se versiona.
- No enviar frecuencia cardiaca, ubicación, entrenamientos detallados u otros datos de Salud si no existe una necesidad explícita.
- La ausencia de datos se representa como desconocida; no se infieren métricas de salud.

## Frontera pública

GitHub Pages publica únicamente la demo mock. Un fallo o cambio en la aplicación privada nunca debe provocar que datos reales terminen en Pages.

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


## Objetos y armario

- Inventario real, fotografías, ubicaciones domésticas, números de serie, facturas, garantías y valor económico permanecen fuera de Git.
- El dominio se trata como `confidencial`.
- La demo pública no instancia OBJETOS ni contiene fixtures que imiten posesiones reales.
- `/api/state` recibe únicamente `objectsSummary`; el detalle se carga bajo demanda mediante `/api/objects`.
- El frontend nunca recibe credenciales de Google.
- Los documentos completos permanecen en su fuente propietaria; el inventario guarda como máximo referencias.
- La ausencia de fuente se representa como `source-pending`; no se transforma en ceros ni en datos ficticios.
