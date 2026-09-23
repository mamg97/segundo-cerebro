# Segundo Cerebro

Sistema operativo personal privado con un coordinador central, estado global común y módulos especializados.

## Dos superficies separadas

### Demo pública

La demo de GitHub Pages sigue siendo estática y usa exclusivamente datos ficticios:

https://mamg97.github.io/segundo-cerebro/

Sirve para validar interfaz y navegación. Nunca debe contener datos personales, secretos ni conexiones privadas.

### Aplicación privada

La aplicación real se sirve mediante Cloudflare Worker y está protegida por Cloudflare Access. Usa D1 y adaptadores privados para consultar o actualizar las fuentes autorizadas.

Actualmente existen integraciones operativas para:

- finanzas derivadas desde Google Sheets;
- calendario iCloud mediante CalDAV en modo lectura;
- HabitQuest desde su Google Sheet, con lectura y gestión de hábitos;
- gimnasio y nutrición dentro de Salud;
- ingesta de gasto energético diario desde Apple Health mediante un Worker dedicado.

GitHub contiene el código y la documentación técnica, nunca los datos personales reales.

## Estado actual

El frontend sigue siendo HTML, CSS y JavaScript nativos, pero el proyecto ya no es solo un prototipo estático. La arquitectura privada remota está operativa y el sistema dispone de lectura y escritura selectiva según cada fuente.

La fuente de verdad de cada dominio continúa fuera de Git cuando corresponde. D1 se usa para estado privado derivado y para datos operativos propios del sistema cuando así está documentado.

## Orientación para continuar

Leer en este orden:

1. `AGENTS.md`
2. `docs/HANDOFF.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DATA_MODEL.md`
5. `docs/PRIVACY.md`
6. `docs/DECISIONS.md`
7. el contrato del módulo correspondiente dentro de `agents/`

La interfaz vive en `app/`. La infraestructura privada vive en `private-cloudflare/`.

## Modo local

La demo puede servirse localmente desde la raíz:

```sh
python3 -m http.server 4173
```

Después abre `http://localhost:4173/app/`.

Existe además una superposición privada local histórica en `.private/`, ignorada por Git. Es un mecanismo auxiliar y ya no es la arquitectura principal del sistema.

## Privacidad

Antes de introducir una fuente, endpoint o campo nuevo, revisar `docs/PRIVACY.md`. Los secretos se configuran fuera del repositorio y los datos reales nunca se versionan.
