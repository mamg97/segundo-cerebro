# ChatGPT normal — Segundo Cerebro

Este directorio documenta el carril de trabajo de ChatGPT normal cuando Work/Codex no está disponible o no es la herramienta adecuada.

## Regla de entrada

Antes de trabajar:

1. Leer `AGENTS.md`.
2. Leer `docs/HANDOFF.md`.
3. Consultar la documentación de `docs/` relevante.
4. No asumir que el estado local privado de Codex está disponible desde este entorno.

## Responsabilidades

ChatGPT normal puede:

- razonar sobre arquitectura, modelo, prioridades y producto;
- revisar y actualizar la documentación común;
- trabajar sobre el repositorio remoto cuando exista acceso autorizado;
- preparar cambios para que Work/Codex los continúe;
- actualizar el estado canónico en `docs/HANDOFF.md`.

No debe inventar el contenido de `.private/` ni subir datos reales al repositorio.

## Salida

Al cerrar un bloque relevante:

- actualizar `docs/HANDOFF.md` con el estado presente;
- registrar aquí únicamente un resumen técnico si aporta trazabilidad;
- dejar la próxima acción suficientemente concreta para que Work/Codex pueda continuar sin releer conversaciones largas.
