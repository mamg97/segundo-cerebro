# AV-118 — Primera aparición RUC frente a primera publicación ALFRED

23/10/2026. Auditoría descriptiva de revisiones, sin modelo ni backtest.

Se comparan los originales fijados por hash en [AV-089](AV089_MACRO_RUC_VINTAGES.md) y [AV-117](AV117_ALFRED_INITIAL_RELEASES.md): libro RUC de la [Fed de Filadelfia](https://www.philadelphiafed.org/surveys-and-data/real-time-data-research/ruc) y ZIP de primeras publicaciones de [ALFRED](https://alfred.stlouisfed.org/series/downloaddata?seid=UNRATE). El programa vuelve a verificar ambos archivos y sus estructuras, alinea por mes de referencia y selecciona la primera celda numérica RUC de izquierda a derecha. Usa aritmética decimal para la diferencia, sin estimar resultados predictivos.

## Resultado

| Cobertura | Número |
| --- | ---: |
| Meses comparables, enero de 2011–julio de 2026 | 186 |
| Coinciden | 182 |
| Difieren | 4 |
| Ausencia en ambas fuentes | 1: octubre de 2025 |
| Meses ALFRED fuera del rango del libro RUC archivado | 2: agosto y septiembre de 2026 |

Las diferencias, definidas como primera aparición RUC menos valor inicial ALFRED, son:

| Referencia | Primer vintage RUC | Diferencia, puntos porcentuales |
| --- | --- | ---: |
| Noviembre de 2011 | 2012Q1 | +0,1 |
| Noviembre de 2012 | 2013Q1 | +0,1 |
| Noviembre de 2022 | 2023Q1 | −0,1 |
| Noviembre de 2025 | 2026Q1 | −0,1 |

Esto demuestra que la primera aparición trimestral RUC no equivale siempre al valor de primera publicación archivado por ALFRED. No atribuye la causa de cada revisión ni convierte a una fuente en verdad definitiva. Para un objetivo de primera publicación, reemplazar ALFRED por la primera columna RUC disponible cambiaría cuatro etiquetas de nivel en este intervalo; no se ha calculado si cambiaría la etiqueta de subida de 0,5 puntos a seis meses.

## Reproducción y límites

`research/psychohistory/ruc_initial_release_comparison.py` recibe ambos originales y hashes completos, verifica los auditores existentes y conserva el informe fuera de Git. Tres pruebas sintéticas cubren elección de la primera celda frente a la revisión posterior, mes fuera de cobertura, ausencia/conflicto y duplicado ALFRED. El ensayo real reproduce 186/4/0,1; no se imputan ceros.

El rótulo RUC conserva resolución trimestral y ALFRED resolución diaria. Esta comparación no certifica disponibilidad intradía ni alinea todavía predictores con una fecha de emisión. `MAC-02` sigue `PARCIAL/NO`, sin score, pronóstico ni modificación de gates. Próximo paso: contrato temporal explícito de predictores, horizonte y etiqueta inicial antes del experimento.
