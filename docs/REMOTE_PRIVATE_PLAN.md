# Plan — acceso web privado

## Problema

La demo pública en GitHub Pages permite validar la interfaz desde cualquier dispositivo, pero por diseño no puede mostrar el estado personal real. La capa `.private/` solo existe en el equipo local y no se sincroniza.

## Objetivo

Poder abrir Segundo Cerebro desde Mac, iPhone o iPad y consultar el estado real mediante una web autenticada, sin publicar esos datos ni convertir GitHub en la base de datos.

## Arquitectura objetivo

```text
Navegador
   │
   │ HTTPS + autenticación
   ▼
Aplicación privada
   │
   │ API autenticada
   ▼
Backend privado
   │
   ├── estado estructurado
   ├── relaciones
   ├── open loops
   └── referencias a fuentes
```

GitHub conserva exclusivamente código, documentación y mocks. Los datos reales viven en un almacén privado separado.

## Requisitos mínimos antes de desplegar datos reales

1. Autenticación de usuario único o lista cerrada.
2. HTTPS obligatorio.
3. Datos privados fuera del repositorio y fuera del artefacto de GitHub Pages.
4. Secretos únicamente en servidor o gestor de secretos; nunca embebidos en JavaScript público.
5. Persistencia cifrada en reposo o proveedor con cifrado gestionado adecuado.
6. Copia de seguridad y procedimiento de recuperación.
7. Registro de procedencia, sensibilidad y frescura de cada entidad.
8. Integraciones externas en lectura por defecto y con permisos mínimos.
9. Capacidad de revocar sesiones y credenciales.
10. Separación explícita entre demo mock y aplicación privada.

## Fases

### Fase A — actual

- GitHub Pages: demo pública con mocks.
- `.private/`: validación local, sin sincronización.

### Fase B — siguiente

- Elegir alojamiento privado, autenticación y almacén.
- Crear una API mínima para leer el mismo modelo de estado que hoy usa la superposición local.
- Mantener desactivadas las integraciones automáticas.

### Fase C

- Migrar de forma controlada la síntesis local al almacén privado.
- Validar desde Mac, iPhone e iPad.
- Añadir backup y auditoría.

### Fase D

- Incorporar fuentes externas una a una, empezando en solo lectura.
- Definir reglas de frescura y sincronización.

## Decisión todavía abierta

No se selecciona proveedor de hosting, base de datos ni autenticación en este documento. Esa elección debe hacerse comparando privacidad, coste, mantenimiento, exportabilidad y facilidad de acceso desde los dispositivos.
