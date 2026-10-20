# PSICOHISTORIA · AV-079 — Compatibilidad histórica y disponibilidad temporal de fuentes V4

**20/10/2026 · V2/V4 · ESTADO: INVESTIGACIÓN DE PROCEDENCIA, SIN AUTORIZACIÓN AS-OF**.

## Hallazgo principal

La versión del Explorador de Futuros con árboles de 2016/2020 consume la edición **UCDP OrganizedViolenceCY 26.1**, compilada en 2026. Filtrar registros anteriores a 2014/2018 de una edición revisada **no reproduce** la fotografía informativa que habría existido al originarse la predicción. Esos modelos siguen como backtests exploratorios ex post. Este hallazgo afecta a los resultados AV-076/077/078, pero no invalida su uso descriptivo para detectar errores o comparar referencias sobre una misma edición.

**Corrección frente a lectura incompleta de la API oficial:** la API de UCDP ofrece la versión `26.1` de OrganizedViolenceCY, pero el [archivo histórico oficial de UCDP](https://ucdp.uu.se/downloads/olddw.html) muestra del **mismo producto** las ediciones `25.1 (CSV)`, `24.1 (CSV)`, `23.1 (Excel)`. Se revisaron los documentos `docs/PSYCHOHISTORY_VINTAGES_AND_PROSPECTIVE.md`, `research/psychohistory/vintage_audit.py` y `research/psychohistory/release_separated_holdout.py`, que ya recogen las ediciones 24.1/25.1. **No confundir GED 24.1, conjunto de eventos, con OrganizedViolenceCY 24.1, agregado país-año**.

| Origen hipotético (1 enero) | Últimos datos admitidos | Producto antiguo candidato | ¿Cronología plausible? | ¿Backtest vintage-correct verificado? |
| --- | --- | --- | --- | --- |
| 2016 | 2014 | OrganizedViolenceCY 24.1 (compilación 2024) | **No** | NO |
| 2020 | 2018 | OrganizedViolenceCY 24.1 (compilación 2024) | **No** | NO |
| 2025 | 2023 | OrganizedViolenceCY 24.1 (compilación 2024) | **Sí, condicional** | **NO**: falta evidencia independiente de fecha exacta, cobertura y congelación |
| 2025 | 2023 | OrganizedViolenceCY 25.1 (compilación 2025) | **No**: año de edición no prueba publicación antes del 1 enero | NO |
| 2025 | 2023 | GED 24.1 (eventos, 2024) | Cronología candidata, pero **producto distinto** | NO sin reconstrucción semántica y población cero |
| 2027 (preparación) | 2025 | OrganizedViolenceCY 26.1 (compilación 2026) | **Sí, condicional** | NO; 2027 permanece SHADOW_NO_EMITIDO |

La fecha de edición aproximada es solamente una **cota temporal de exploración**: la página de descargas actual no acredita qué bytes estaban publicados al 1 de enero, ni una distribución congelada, ni el modelo o resultados emitidos entonces. La lista oficial de archivos antiguos no representa un sello criptográfico. Si cambia la definición o cobertura entre productos/ediciones, se exige revisión semántica. No se asignarán ceros a países ausentes.

## Implementación

- `research/psychohistory/audit_future_asof_eligibility.mjs`: inventario explícito de cinco candidatas: OrganizedViolenceCY 24.1, 25.1, 26.1 y GED 24.1, 26.1; protocolo puro y **fail-closed**. Devuelve cronología, identidad de producto, cobertura declarada, bloqueos y verificaciones necesarias, jamás probabilidad o identidad de país.
- `research/psychohistory/audit_future_asof_eligibility.test.mjs`: pruebas sintéticas para rechazar 26.1 como fuente históricamente disponible en 2016/2020, reconocer 24.1 para origen 2025 como candidata del producto correcto **sin autorizar as-of**, impedir sustituir GED, evitar promoción por banderas aportadas por un operador y mantener 2027 bloqueado.
- CLI sobre un **catálogo privado**: `node research/psychohistory/audit_future_asof_eligibility.mjs /ruta-privada/catalogo.json organizedviolencecy_26_1`. No publicar archivos originales privados ni identificadores de país.

El control no puede «aprobar» por sí solo ninguna fecha: requieren autenticación externa de fecha de archivos, características/etiquetas previas al origen, cohorte de riesgo con países de cero eventos, congelación del código/entrenamiento, y sellado de predicciones antes de desenlaces.

## Vertiente siguiente con mayor valor científico

**AV-080 propuesto:** conectar `release_separated_holdout.py` existente (24.1 como entrenamiento, 26.1 como resultados 2025) con el objetivo de **primera entrada o salida 2024–2025**, manteniendo (i) 2024 como puente no observado, (ii) todos los predictores/modelos entrenados exclusivamente en 24.1 hasta 2023, (iii) scoring de resultados solo desde 26.1, y (iv) inspección de revisiones y cobertura por país. Si no se certifica publicación real de los bytes 24.1 antes de un origen supuesto (por ejemplo 01/01/2025), denominarlo siempre `HOLDOUT_SEPARADO_POR_EDICIÓN_RETROSPECTIVO`, **no** pronóstico histórico real.

**Contratos inalterados:** UCDP 26.1 canónico, matrices de AV-076/078, historial privado, `PsicoPredicciones`, financiación y 2027 SHADOW_NO_EMITIDO. No afirmar capacidad bursátil hasta validación prospectiva fuera de muestra.
