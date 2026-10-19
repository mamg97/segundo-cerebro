# PSICOHISTORIA — Correspondencia territorial candidata COW ↔ GW/UCDP

**19/10/2026 · AV-032 en revisión. Ninguna equivalencia territorial aprobada.**

## Objetivo

El avance 31 confirmó que COW y Gleditsch–Ward tienen coberturas y
codificaciones diferentes. Comparar 189 códigos iguales no certifica
identidad. Este módulo busca *candidatos para revisión humana*, no
un mapeo listo para entrenar modelos ni calcular probabilidades.

Las fuentes originales siguen siendo independientes:

- [COW State System Membership 2024](https://correlatesofwar.org/data-sets/state-system-membership/): llega hasta 31/12/2024, publicación en noviembre de 2025.
- [Gleditsch–Ward v7.0](https://ksgleditsch.com/statelist.html): lista principal + suplemento separado de microestados, cobertura termina 31/12/2020, publicación mayo de 2021.
- Copias públicas en [commit académico fijo](https://github.com/brentonk/us_diplomatic_missions/tree/0dda0ef93b7958f67c79031c1695dd9e5408a62c/input). SHA-256 de bytes observados en octubre 2026, **no datación histórica de esos bytes**.

## Algoritmo implementado

`research/psychohistory/cow_gw_token_review.py` valida primero los
tres ficheros exactos con los auditores GW y COW existentes. Para cada
mes consulta los códigos con pertenencia al **mes completo**.
Altas parciales no se fuerzan a países continuos.

Comparación de abreviaturas **solo cuando son tokens únicos dentro de
ambas fuentes**:

- Abreviatura idéntica y número idéntico: `TOKEN_ONLY_NOT_REVIEWED`,
  nunca `APPROVED`.
- Abreviatura idéntica pero número diferente: también propuesta textual,
  con discordancia numérica explícita.
- Número idéntico pero abreviatura diferente: detector de posible falsa
  equivalencia; no se crea propuesta.
- Abreviatura repetida, sucesión compartida, miembro parcial o ausente:
  quedan sin resolver, nunca se sobreescriben identificadores.
- Mes posterior a 2020: GW censurado, **no se intenta cruzar países de 2024**.
- Mes posterior a 2024: COW también censurado.

La salida estándar y los logs de GitHub Actions contienen **solo
recuentos agregados**, por mes: candidatos textuales, casos con código
igual/distinto, colisiones numéricas, filas pendientes de revisión y
censura de cada fuente. El JSON detallado de revisión, si se solicita,
se crea una sola vez fuera de Git con permisos `0600`; ni CI ni Git
publican esa cola individual.

## Ejecución

```bash
python3 research/psychohistory/cow_gw_token_review.py \
  --cow /PRIVATE/cow_statelist2024.csv \
  --gw /PRIVATE/ksgmdw.txt \
  --micro /PRIVATE/microstates.txt \
  --cow-sha256 <SHA256_OBSERVADO_EN_2026> \
  --gw-sha256 <SHA256_OBSERVADO_EN_2026> \
  --micro-sha256 <SHA256_OBSERVADO_EN_2026> \
  --month 2019-12 --month 2020-12 --month 2024-12 \
  --private-review-output /PRIVATE/crosswalk_review_NEW.json
```

La opción `--private-review-output` es opcional y no se usa en CI.
No se permite salida por país en el repositorio público.

## Puertas científicas

Permanecen `false`: `one_to_one_geographic_concordance_verified`,
`ucdp_event_coverage_verified`, `source_as_of_verified`,
`absence_of_event_equals_zero_verified`,
`vintage_correct_backtest`, `scores_computed` y `forecast_issued`.
Una igualdad de abreviatura y código **no basta** para adjudicar un
país tras secesiones, sucesiones o fronteras discutidas.

Siguiente etapa: registrar decisiones individuales con evidencia y
versiones pertinentes, diseñar un `crosswalk` validado con casos
especiales y conseguir testigos de disponibilidad histórica de datos
Candidate y roster, todo ello antes de construir negativos.

## Resultados empíricos de las fuentes públicas

La [ejecución 39235681286](https://github.com/mamg97/segundo-cerebro/actions/runs/39235681286)
ha procesado realmente los ficheros originales fijados en la PR, con
trazas reducidas a contadores y sin generar la cola individual en CI.

| Mes | COW completo | GW+micro completo | Abreviatura y número coinciden | Abreviatura coincide, número difiere | COW sin abreviatura pareja | GW sin abreviatura pareja |
|---|---:|---:|---:|---:|---:|---:|
| 2019-12 | 195 | 197 | 186 | 4 | 5 | 7 |
| 2020-12 | 195 | 197 | 186 | 4 | 5 | 7 |
| 2024-12 | 195 | — | — | — | — | — |
| 2025-01 | — | — | — | — | — | — |

Para cada uno de los dos meses comparables, **190 propuestas textuales**
(186 con número igual, cuatro con número diferente), dos contactos
numéricos no resueltos con abreviatura distinta. **Ningún ID se ha
homologado.** Las coincidencias tampoco certifican continuidad territorial
en períodos posteriores a los intervalos de las fuentes.

La cola de revisión privada, si un responsable la genera manualmente,
contendría **404 entradas** para los meses 2019-12 y 2020-12 juntos:
190 propuestas y 12 pendientes de cada mes. La CI no la produjo, no
guardó filas individuales ni publicó tabla de correspondencias.

Estos resultados identifican explícitamente el trabajo pendiente, pero
**no resuelven ninguna etiqueta negativa de conflictos ni permiten
construir un panel `as-of` válido**.
