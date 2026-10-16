# PSICOHISTORIA — Programa científico v0.1

Fecha: 2026-10-16. Inspiración: Fundación, de Isaac Asimov. Objetivo: evaluar si modelos históricos, estadísticos y de sistemas complejos anticipan fenómenos sociales colectivos de forma probabilística y verificable. No se presupone determinismo histórico.

## Hipótesis falsable

H0: el modelo de interés NO mejora un baseline preespecificado, en el universo y horizonte seleccionados, fuera de muestra. H1: existe una mejora de calidad probabilística replicable, con calibración y robustez temporal. Una mejora no demuestra causalidad ni una teoría general de la historia.

Primer benchmark implementado: dos objetivos país-año en UCDP OrganizedViolenceCY 26.1: presencia de 25+ muertes estatales registradas y aparición de episodio agregado tras un año bajo ese umbral. La resolución anual usa el universo oficial de países. Es retrospectivo exploratorio con una release revisada; no demuestra disponibilidad histórica ni skill prospectivo. Protocolo, código y limitaciones: [PSYCHOHISTORY_BENCHMARK.md](PSYCHOHISTORY_BENCHMARK.md). Resultados operativos únicamente en el registro privado.

## Cuatro vertientes

| Línea | Objeto de estudio | Primer prototipo | Validación |
| --- | --- | --- | --- |
| V1 Cliodinámica | Regularidades e indicadores históricos estructurales | Índice transparente con fuentes históricas auditadas | Validación entre sociedades, épocas y sensibilidad de parámetros |
| V2 Forecasting | Probabilidades de eventos futuros y series sociales | Baselines de persistencia/frecuencia y modelo logístico | Walk-forward, Brier, Brier Skill y calibración |
| V3 Sociedades artificiales | Mecanismos micro-macro | Agentes con reglas en grafos y semillas reproducibles | Patrones empíricos predefinidos, sensibilidad, replicabilidad |
| V4 Meta-Lab | Método científico común y trazabilidad | Registro de hipótesis, experimentos, KPI y predicciones | Auditoría de baselines, scoring pareado y reproducciones |

V4 es infraestructura metodológica autónoma inspirada en A Second Foundation, no una cuarta familia de modelos empíricos.

## Política de evaluación

- Brier Score = media((probabilidad − resultado)^2). Menor es mejor.
- Brier Skill Score = 1 − Brier(modelo) / Brier(baseline), calculado exclusivamente sobre observaciones idénticas y con baseline positivo. Valores positivos significan mejora en esa muestra.
- Métricas secundarias: log loss, PR-AUC, curvas de calibración, intervalo de incertidumbre, cobertura temporal y geográfica.
- No usar información posterior a la fecha de pronóstico, reentrenar sobre la ventana de test, seleccionar hipótesis tras inspeccionar los resultados, ni comparar muestras distintas.
- Separar experimentos retrospectivos, backtest histórico y predicciones prospectivas realmente emitidas antes del desenlace.
- Si no existen observaciones válidas, mostrar «SIN DATOS», nunca 0 o valores ilustrativos como si fueran científicos.
- Cada resultado debe declarar fenómeno, universo, horizonte, versión de datos/modelo y criterio de elegibilidad.

Madurez 0–5: 0 idea; 1 diseño; 2 datos/reglas auditados; 3 MVP reproducible; 4 validación; 5 prospectivo shadow o producción interna. La madurez NO es una puntuación de precisión.

## Fuentes candidatas sin incorporar aún

- Seshat: https://seshatdatabank.info/
- UCDP: https://ucdp.uu.se/
- VIEWS: https://viewsforecasting.org/
- Banco Mundial: https://data.worldbank.org/
- Eurostat: https://ec.europa.eu/eurostat/
- ForecastBench: https://forecastbench.org/
- A Second Foundation: https://asecondfoundation.org/

Verificar antes de ingerir licencias, versión de release, sesgos, cobertura y disponibilidad histórica «as-of».

## Registro privado canónico

Fuente: SEGUNDO CEREBRO - PROYECTOS. Pestañas:
- Proyectos / Documentacion / Relaciones: padre y cuatro subproyectos, documentación y relaciones.
- PsicoHitos: hito_id, vertiente, titulo, fase, estado, criterio_aceptacion, evidencia_url, prioridad, orden, updated_at.
- PsicoKPIs: kpi_id, vertiente, nombre, categoria, unidad, direccion, valor, referencia, estado, fecha, definicion.
- PsicoExperimentos: experimento_id, vertiente, hipotesis, dataset_version, modelo_version, metrica, valor, baseline, fecha, estado, evidencia_url, notas.
- PsicoPredicciones: prediccion_id, vertiente, fenomeno, region, horizonte, fecha_emision, fecha_resolucion, probabilidad, resultado, estado, modelo_version, as_of, baseline_prob.

El registro de predicciones resueltas solo será puntuable si, además de probabilidades/etiquetas/fechas válidas, un verificador de servidor comprueba un sello temporal independiente vinculado al contenido original. La integración del verificador sigue pendiente: producción excluye todas las filas sin ese recibo. Las fechas de Sheets y un hash local no prueban prospectividad.

Atención: un Google Sheet editable no es evidencia de inmutabilidad. `sealing.py` implementa preparación privada y verificación local RFC3161 contra raíz de confianza; falta seleccionar/verificar una autoridad independiente e integrar esa comprobación con el Worker. No se declara sellado ni producción prospectiva.

## Laboratorio visual

La ruta privada app/research-lab.html consulta GET /api/projects y GET /api/research-lab; no introduce polling, nuevas cuentas ni servicios de pago. La interfaz muestra constelación y detalle por vertiente, hitos, madurez, KPIs, scoring prospectivo y curva de calibración cuando existen datos, predicciones, experimentos y filtros de roadmap.

Los anillos representan hitos cerrados, jamás precisión científica. Los scorecards sin datos deben quedar vacíos con explicación. La fuente operativa es el Sheet privado: editar un hito o KPI no exige publicar código.

## Hitos de ejecución

1. Sprint 0: estructura, contrato, dashboard y prueba CI.
2. Sprint 1: definir variable objetivo, datos abiertos, as-of y etiquetas.
3. Sprint 2: baseline V2 y backtest temporal, métricas reproducibles.
4. Sprint 3: índice V1 y comparación con baseline.
5. Sprint 4: ABM V3 y análisis de sensibilidad.
6. Sprint 5: shadow forecasting, monitoreo prospectivo y ensemble V4.

Éxito no significa acertar siempre. Significa saber qué anticipamos mejor que referencias sólidas, con evidencia replicable y límites explícitos. Fracaso en mejorar el baseline también es un resultado científicamente útil.

## Seguridad y coste

Privacidad equivalente al resto de Segundo Cerebro: datos operativos en Sheets y Worker tras Cloudflare Access, nunca en Git público ni en la demo. Coste incremental cero; carga manual/bajo demanda. No inferencias a nivel de personas identificadas, secretos ni datos de ámbitos personales en registros de investigación.
