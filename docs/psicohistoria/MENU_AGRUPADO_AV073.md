# PSICOHISTORIA · AV-073 — Navegación principal simplificada

El menú principal queda reducido a **Inicio, Predicciones, Investigación y Crear**. Las nueve vistas y sus IDs originales se conservan.

| Sección | Opciones contextuales |
| --- | --- |
| Inicio | Resumen inicial |
| Predicciones | Explorador, Riesgos 2027 |
| Investigación | Mapa del proyecto, Evidencia, Registro, Hitos |
| Crear | Ideas y sinergias, Estudio audiovisual |

El submenú muestra solo opciones de la sección seleccionada. Los enlaces `?view=` funcionan para cada vista, la navegación interna actualiza la URL sin perder otros parámetros (incluidos `track`) y el historial permite atrás/adelante mediante `popstate`. Acceso de teclado mediante botones HTML y `aria-current`/`aria-pressed`.

Se utiliza CSS separado, apto para móvil con cuatro secciones compactas y submenú desplazable, para preservar la remodelación visual paralela.

Sin cambios a modelos, evaluaciones históricas, fuentes privadas, predicciones, investigación 2027 ni infraestructura de pago. Solo navegación y pruebas de regresión.
