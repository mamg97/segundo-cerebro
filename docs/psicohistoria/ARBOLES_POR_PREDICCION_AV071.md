# PSICOHISTORIA — AV-071 · Un árbol completo por predicción

**20/10/2026.** El árbol, no los horizontes técnicos, es la unidad principal del explorador retrospectivo. No se modifica el algoritmo de cuatro estados ni la remodelación global del laboratorio.

- **Árbol canónico**: un catálogo aceptado por el motor privado con `catalog.id`, origen, país y modelo. El índice muestra exactamente los catálogos registrados; no inventa predicciones para años sin experimentos.
- **Todos los años**: árbol continuo de `cutoff` (último dato) a `origin-1` (puente integrado, NO observado entonces) y después todos los años proyectados `origin…origin+maxHorizon-1`. Cambiar la inspección por año no recorta ramas ni elimina años.
- **Evaluación**: seleccionar un año cambia únicamente el panel de resultados, caminos retenidos y probabilidades de ese año; las probabilidades del árbol principal proceden siempre del Worker, sin condicionar a los resultados históricos.
- **Hindsight**: superposición observada a posteriori solo con el control habilitado, distinguida gráficamente del cálculo; fuente UCDP revisada NO es as-of históricamente verificada.
- **Navegación**: galería de árboles canónicos; cambio de origen consulta el motor; conserva país/modelo compatibles. Escritorio y móvil permiten scroll horizontal anual sin estrechar ni perder nodos.
- **Alcance y ciencia**: la galería solo contiene catálogos retrospectivos disponibles; la cohorte 2027 continúa shadow, no emitida. No hay órdenes ni señales financieras.
- **QA**: tests de orígenes separados, años íntegros, significado del puente, superposición posterior, interfaz/CSP/privacidad y publicación Cloudflare.
