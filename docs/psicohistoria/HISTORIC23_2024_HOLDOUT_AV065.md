# PSICOHISTORIA — AV-065 · Holdout 2024: prerregistro y admisión de archivo 23.1

**20/10/2026 · Experimento nuevo; sin resultados de 2024 vistos aún.**

## Contrato fijo previo al holdout

- **Pregunta:** ¿Se sostiene la ventaja de V2 frente a persistencia y Markov observada en el test 2025 cuando evaluamos un año distinto **2024**?
- **Entrenamiento y cinco variables:** exclusivamente UCDP OrganizedViolenceCY **23.1**, con desenlaces hasta **2022**; nunca se permite entrada de UCDP 24.1 / 25.1 / 26.1 en variables o fitting.
- **Target:** presencia estatal binaria `sb_total_deaths_best >=25` en 2024, país-año completo. Nada sobre comienzo formal de guerra/onset.
- **Cohorte:** universo de países 2022 de 23.1, con cinco años consecutivos hasta 2022; recortar únicamente casos sin outcome 2024 de release 25.1 (no rellenar ausentes con ceros). Usar GW country IDs y documentar gaps/revisiones de IDs antes de score.
- **Modelos y hiperparámetros:** los seis ya fijados en `benchmark.py` (frequency, persistence, markov, v1_memory_index, v2_logistic, interaction_table). Entrenamiento labels hasta 2022; features 2022. Sin tuning sobre 2025 ni sobre 2024.
- **Resultado cuantitativo obligatorio:** Brier, log loss, AP y skill de V2 frente a **frequency, persistence y markov**, y comparación con interaction_table; N, positivos, excluidos, rango temporal y cotejo de SHA. Reportar casos no resolubles, no inventar eventos ni probabilidades.
- **Criterio de interpretación:** la comparación 2024 será **exploratoria** porque se decidió tras ver 2025. Incluso dos años positivos no probarían habilidad prospectiva ni independencia de la fuente. CI de 2024 solo se habilitará tras congelar ZIP/XLSX exacto (hash observado AHORA) y confirmar que 23.1 contiene variables comparables sin sustituciones. Si faltan: fail-closed.

## Paso de esta PR

Únicamente localizar URL oficial 23.1 en el índice de UCDP, descargar temporalmente el libro histórico, extraer **metadatos del encabezado y hash**; **no acceder a labels 2024**, ni calcular backtest, ni modificar dashboard o producción. Pruebas unitarias 100 % sintéticas y de host allowlist. Los archivos de UCDP no se publican en GitHub. Ningún cron, API de pago, ni predicción.

Fuentes: <https://ucdp.uu.se/downloads/olddw.html> y codebook 23.1 <https://ucdp.uu.se/downloads/organizedviolencecy/UCDP_OrganizedViolenceCY_Codebook_231.pdf>.
