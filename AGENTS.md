# AGENTS.md — Segundo Cerebro

Estas reglas son permanentes y se aplican a cualquier herramienta que continúe el proyecto.

## Propósito

Construir un segundo cerebro personal y privado: un sistema operativo de vida con un coordinador central, estado global común y módulos especializados. El repositorio es la memoria oficial del proyecto; nunca se debe depender del historial de una conversación.

## Antes de cambiar nada

1. Leer este archivo completo.
2. Leer `docs/HANDOFF.md` completo.
3. Consultar `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/PRIVACY.md` y `docs/DECISIONS.md` según el trabajo.
4. Revisar estado de Git, ramas y cambios sin commit.
5. Entender el propósito de cualquier trabajo previo antes de modificarlo o reemplazarlo.

## Límites de privacidad

- GitHub solo puede contener código, documentación técnica y datos ficticios inequívocos.
- No guardar datos personales reales, emails reales, saldos, extractos, patrimonio real, datos familiares o médicos, contraseñas, tokens, claves API, credenciales OAuth ni secretos.
- No conectar cuentas personales ni APIs reales hasta que una fase futura lo autorice expresamente.
- Las fuentes originales conservan la propiedad de sus datos. El Segundo Cerebro almacena principalmente estado, relaciones, referencias, decisiones y contexto mínimo.
- Todo dato debe admitir una sensibilidad: `normal`, `personal`, `confidencial` o `muy_confidencial`.
- Antes de cada commit, revisar que no haya secretos ni datos reales.

## Arquitectura y alcance actual

- Flujo conceptual: Usuario → Coordinador → Estado global común → módulos → fuentes externas.
- Los módulos no deben crear memorias aisladas ni duplicar el estado global.
- La fase v0.1 usa exclusivamente mocks y no decide todavía hosting ni base de datos definitiva.
- Mantener la solución pequeña, legible, responsive y preparada para evolucionar a PWA.
- No añadir dependencias o abstracciones sin una necesidad concreta.

## Documentación viva

- `docs/HANDOFF.md` describe solo el presente, no un diario. Actualizarlo al final de cada bloque de trabajo.
- Las decisiones duraderas van en `docs/DECISIONS.md`.
- La arquitectura, el modelo y la privacidad viven en sus documentos homónimos.
- Si el código contradice la documentación, resolver la inconsistencia antes de terminar.

## Convenciones de trabajo

- Hacer commits pequeños y descriptivos.
- Ejecutar las comprobaciones disponibles y registrar el resultado en `docs/HANDOFF.md`.
- No borrar ni sobrescribir trabajo previo sin comprobar para qué sirve.
- Tratar todos los archivos bajo `sources/` como referencias de solo lectura: no editarlos, moverlos, renombrarlos ni borrarlos. Pueden ser reemplazados por la sincronización del proyecto ChatGPT.
- No configurar un remoto ni publicar el repositorio sin autorización explícita.
