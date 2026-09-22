# Privacidad y seguridad

## Regla fundamental

GitHub solo contiene código, documentación técnica y datos ficticios. Las fuentes originales conservan la propiedad de sus datos.

## Datos prohibidos en el repositorio

- Emails o mensajes reales.
- Saldos, extractos, números de cuenta o datos patrimoniales reales.
- Datos familiares sensibles o información médica.
- Contraseñas, tokens, API keys, secretos, cookies o credenciales OAuth.
- Exportaciones completas de cuentas personales.
- Identificadores externos que permitan acceder o inferir información sensible.

## Clasificación

| Nivel | Ejemplo abstracto | Tratamiento futuro |
|---|---|---|
| `normal` | Preferencia de interfaz | Protección estándar |
| `personal` | Objetivo o relación personal | Acceso privado |
| `confidencial` | Contexto financiero resumido | Cifrado y acceso restringido |
| `muy_confidencial` | Salud, credenciales o detalle patrimonial | Minimización extrema; evitar persistencia |

La clasificación no autoriza a almacenar el dato: primero debe existir una necesidad legítima y un diseño seguro.

## Propiedad y minimización

- Gmail conserva emails; Calendar conserva eventos; Sheets conserva finanzas; GitHub conserva proyectos de software.
- El sistema guarda el mínimo contexto derivado necesario: estado, relación, decisión y referencia.
- Siempre que sea posible, usar referencias opacas revocables en vez de copiar contenido.
- Separar datos reales de fixtures y pruebas. Los fixtures del repositorio deben indicar claramente que son ficticios.

## Reglas para integraciones futuras

1. Revisión de amenazas y minimización antes de conectar una fuente.
2. OAuth con permisos mínimos y revocables.
3. Secretos fuera del repositorio y del cliente web.
4. Registro de acceso sin registrar contenido sensible.
5. Estrategia explícita de borrado, retención y recuperación.
6. Confirmación humana para acciones externas con consecuencias.

## Revisión antes de commit

- Inspeccionar cambios completos.
- Buscar patrones de secretos y datos reales.
- Confirmar que `.env`, credenciales y exportaciones están ignorados.
- Verificar que ejemplos y nombres son ficticios.

## Frontera pública / privada local

- `.private/` contiene el estado personal provisional y debe permanecer ignorado por Git.
- GitHub Pages publica una lista cerrada: `app/`, `core/`, el redirect raíz y `.nojekyll`. Nunca debe ampliarse con copias recursivas de la raíz.
- El cargador privado solo funciona en loopback y requiere `?private=1`; el sitio público no intenta cargar datos reales.
- El archivo local no está cifrado. Debe contener contexto mínimo y referencias, no historiales completos, credenciales, identificadores financieros ni documentos.
- Servir el prototipo privado únicamente enlazado a `127.0.0.1`, no a una interfaz de red compartida.
- Antes de cada commit, confirmar con `git check-ignore` que el estado privado sigue excluido y con `git status` que ningún archivo real está preparado para subir.

## Incidente

Si se detecta un secreto o dato real: detener publicación, revocar credenciales si procede, retirar el dato del historial de forma segura y documentar únicamente la corrección técnica, nunca el secreto.
