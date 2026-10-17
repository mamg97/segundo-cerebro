# Psicohistoria — protocolo de investigación continua

Fecha de adopción: 2026-10-17. Estado: propuesta operativa, sujeta a revisión científica.

## Principio rector
Desarrollo continuo, incorporación dinámica y validación permanente. No existen fechas de lanzamiento obligatorias por dominio. Cada modelo puede avanzar independientemente; ninguna mejora reescribe predicciones anteriores.

## Dominios
Conflictos y geopolítica; macroeconomía; mercados; comportamiento social; demografía; catástrofes y riesgos sistémicos; transformación tecnológica. Se admiten nuevos dominios con definición explícita de datos, variable objetivo y utilidad.

## Estados por modelo
1. Hipótesis y pregunta verificable.
2. Datos con procedencia, licencia, frecuencia y retraso de publicación documentados.
3. Implementación reproducible con tests.
4. Backtesting temporal sin fugas de información, comparado con benchmarks.
5. Predicciones prospectivas activas, con incertidumbre y sin atribuir validación científica.
6. Evaluación prospectiva acumulada, calibración y comparación con benchmarks.
7. Revisión, mejora, sustitución o retirada documentada.

## Registro prospectivo
Cada emisión conserva: identificador único, dominio, evento operacionalizado, población/geografía, instante de emisión UTC, inicio y fin del horizonte, probabilidad o distribución, versión de código y datos, disponibilidad temporal de las variables, identificador del benchmark, política de resolución, fuente de verificación y estado. Registrar también predicciones fallidas, anuladas y no resolubles con causa. Las emisiones son append-only: las correcciones se hacen mediante nuevas entradas enlazadas, nunca editando retrospectivamente.

## Comparabilidad y evaluación
Comparar modelos sobre las mismas unidades, ventanas y fechas de emisión; no atribuir a mejoras algorítmicas la ventaja de disponer de información más reciente. Reportar Brier/log loss cuando corresponda, calibración, discriminación, cobertura, incertidumbre y tamaño muestral; incluir intervalos de confianza y benchmarks simples. Separar estrictamente resultados retrospectivos y prospectivos; no seleccionar únicamente eventos favorables.

## Prioridades inmediatas
- Auditar los módulos, pipelines y datasets existentes antes de duplicar implementaciones.
- Definir esquema y pruebas automáticas del registro append-only.
- Emitir un primer lote de predicciones solo tras validar procedencia temporal, resolución y benchmarks.
- Incorporar dominios adicionales tan pronto como cumplan los requisitos técnicos, sin calendario artificial.
- Mantener un inventario vivo con estado técnico, estado de evidencia, bloqueos y siguiente experimento.

## Salvaguardas
No alterar series canónicas, predicciones históricas ni resultados para mejorar métricas. No afirmar capacidad de anticipación hasta que exista evidencia prospectiva suficiente. Evitar automatizaciones de pago y proteger secretos.
