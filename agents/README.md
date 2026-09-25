# Módulos especializados

Los contratos de este directorio definen responsabilidades, fuentes de verdad y reglas de interpretación de cada dominio. No son memorias independientes: todos los módulos participan del mismo Segundo Cerebro y del estado global coordinado.

## Contratos actuales

- `COORDINATOR.md`: Cerebro Global, punto de entrada principal, enrutamiento de intenciones y composición multi-dominio.
- `FINANCE.md`: gestor de finanzas personales, conciliación, separación entre flujo mensual e inversiones/ahorro y jerarquía de fuentes.
- `HEALTH.md`: Salud, Nutrición y gasto energético, incluyendo la relación entre Sheets, D1 y Apple Health.
- `HABITS.md`: HabitQuest integrado, fuente de verdad, escritura LWW, gamificación, progreso y criterio de retirada de la app independiente.

Los dominios sin contrato propio todavía se rigen por `AGENTS.md`, `docs/ARCHITECTURE.md` y `docs/DATA_MODEL.md`. La interacción habitual del usuario debe evolucionar hacia `COORDINATOR.md`; los gestores especializados son módulos internos y consolas de mantenimiento, no destinos que el usuario deba elegir manualmente.

Cuando un dominio gane lógica operativa relevante, debe recibir un contrato aquí antes de depender del historial de una conversación.
