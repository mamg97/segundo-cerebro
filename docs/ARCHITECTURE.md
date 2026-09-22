# Arquitectura

## Visión

El Segundo Cerebro es un sistema coordinado, no una colección de agentes con memorias independientes.

```text
Usuario
  ↓
Coordinador / Chief of Staff
  ↓
Estado global común
  ↓
Módulos especializados
  ↓
Referencias a fuentes externas propietarias
```

## Responsabilidades

### Coordinador

Interpreta la intención del usuario, combina contexto de varias áreas, detecta conflictos y presenta prioridades. No es propietario exclusivo de datos de ningún área.

### Estado global común

Mantiene entidades, relaciones, decisiones, estado operativo y referencias mínimas. Todos los módulos consultan esta misma capa. En v0.1 es un módulo JavaScript en memoria con datos mock.

### Módulos

Las áreas previstas son Finance, Career, Calendar/Social, Partner, Family, Family Wealth, Projects y Coordinator. Un módulo aporta reglas y vistas especializadas, pero no una memoria paralela.

### Integraciones

En el futuro adaptarán Gmail, Outlook, Google Calendar, Google Drive/Sheets y GitHub. Cada fuente seguirá siendo propietaria del dato original. No hay integraciones activas en v0.1.

## Implementación v0.1

```text
app/
  index.html      interfaz y estructura semántica
  styles.css      sistema visual responsive
  app.js          renderizado e interacciones locales
core/
  mock-state.js   estado global común, ficticio e inmutable por sesión
agents/           límites de los módulos futuros
integrations/     contrato y prohibición temporal de conexiones
docs/             memoria operativa y decisiones
```

La aplicación es estática, sin framework ni dependencias externas. Esta elección reduce superficie, evita comprometer decisiones prematuras y permite validar navegación, jerarquía y modelo.

## Flujo actual

1. `app.js` carga una única instantánea desde `core/mock-state.js`.
2. Las vistas derivan resúmenes y listas de ese estado.
3. La caja de consulta busca localmente coincidencias en los mocks; no envía texto fuera del dispositivo.
4. La vista de sistema representa la jerarquía Coordinador → estado común → módulos → capacidades y fuentes.

## Vista operativa

El árbol de la interfaz es una explicación observable de la arquitectura, no un conjunto de agentes con memoria independiente. Sus nodos muestran:

- El Coordinador que interpreta y combina contexto.
- El estado global común como única fuente de verdad.
- Módulos especializados que consultan ese estado.
- Capacidades transversales sin memoria propia.
- Fuentes propietarias con estado y nivel de acceso explícitos.

En v0.1.1 todos los estados son ficticios. Solo el mock local aparece activo; las fuentes externas se muestran bloqueadas y sin conectar.

## Capa privada local experimental

Para validar casos reales sin publicarlos, la interfaz admite una superposición local provisional:

1. El modo normal siempre carga `core/mock-state.js`.
2. Solo si el host es `localhost`, `127.0.0.1` o `::1` y la URL incluye `?private=1`, `app.js` intenta importar `.private/state.js`.
3. `.private/` está ignorado por Git y no se copia en el workflow de GitHub Pages.
4. Si el archivo falta o no declara `mode: private-local`, la interfaz conserva los mocks.

Esta capa no conecta conversaciones ni servicios. Contiene una síntesis mínima creada manualmente a partir de fuentes leídas sin modificarlas. Es una prueba del modelo común, no la decisión de persistencia definitiva: el archivo no está cifrado y no debe servirse fuera de `127.0.0.1`.

## Evolución prevista, no decidida

- Capa de persistencia privada.
- Autenticación y cifrado.
- Adaptadores de fuentes con permisos mínimos.
- Coordinador con lenguaje natural.
- Instalable como PWA.

Hosting, base de datos, proveedor de IA y método de sincronización quedan deliberadamente abiertos.
