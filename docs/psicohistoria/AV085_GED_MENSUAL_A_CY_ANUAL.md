# PSICOHISTORIA · AV-085 — Puente entre incidentes GED con fechas exactas y cambios de régimen anuales

**21/10/2026 · V2/V4 · Estado: EXPLORATORIO RETROSPECTIVO, NO PRONÓSTICO EMITIDO**

## Pregunta científica

¿Los **incidentes letales estatales con fechas exactas** del año anterior, agregados desde UCDP GED, identifican anticipadamente países que **cruzan por primera vez** el umbral anual de 25 muertes de UCDP OrganizedViolenceCY?

La propuesta avanza respecto a AV-084 porque GED tiene observaciones con fecha diaria (pueden agregarse por mes), pero **GED = incidentes localizados geográficamente**, mientras que `OrganizedViolenceCY` registra un agregado país-año bajo su propia definición de violencia estatal. Los productos son **distintos**: coincidir un ID de país no implica identidad de la participación, la clasificación de eventos ni las muertes; no se sustituye uno por otro. La falta de un incidente elegible en GED **NO** significa que no hubiera violencia en ese país.

## Metodología cerrada

- **Año de entrenamiento 2022**: OrganizedViolenceCY 23.1 para el conjunto de riesgo y estado inicial, GED 23.1 para el año 2022, OrganizedViolenceCY 25.1 *solo* para comprobar 2023–2024. Origen hipotético 2024.
- **Año de entrenamiento 2023**: OrganizedViolenceCY 24.1 para el conjunto de riesgo, GED 24.1 para el año 2023, OrganizedViolenceCY 26.1 *solo* para comprobar 2024–2025. Origen hipotético 2025.
- Cada año original de GED se valida mediante ZIP oficial y **SHA-256 observado y fijado antes de puntuar**; se exige `id` único y tipos conocidos. Solo entran registros `type_of_violence=1` (state-based), `best>=1`, `date_prec=1` y `date_start = date_end` de un único día dentro del año de corte. Incidentes inciertos/menos precisos quedan **excluidos del indicador**, no reclasificados como ausencia real de violencia.
- Grupo principal de países originalmente con **menos de 25 muertes**; categorías de número de incidentes elegibles en último año `0`, `1`, `2–4`, `>=5`. La categoría 0 significa solo **ningún registro elegible en esta edición**.
- Sensibilidad temporal predefinida: presencia de un incidente elegible entre **octubre y diciembre** del último año histórico. Todos los contadores de último trimestre deben pertenecer al total del año y no pueden excederlo.
- Resultados: primer cruce del umbral en puente o en año objetivo, o ninguno. Solo desenlaces posteriores de ediciones CY nuevas, **sin reentrenar ni publicar filas país-evento**. Se excluyen países sin ambos desenlaces (jamás imputar cero). No se estima modelo nuevo, ni coeficientes, ni probabilidades futuras.

**Fuentes oficiales:** [histórico UCDP GED](https://ucdp.uu.se/downloads/olddw.html), `ged231-csv.zip` SHA-256 **`9aa082f9e1f62da5ea3245c39b1cee45daab6dc8b3a17fb0f0cdae9ba13ce6f7`**, `ged241-csv.zip` SHA-256 **`202e84f3bc91f085b2a886959cbbdeed9d381d758ee897b68520f59ea631c760`**. Los cuatro archivos anuales originales CY utilizan sus SHA ya fijados por AV-080/082. Los GED 23.1 y 24.1 fueron **observados y fijados el 21/10/2026**: ello NO acredita disponibilidad histórica en 01/01/2024 o 01/01/2025.

## Resultados reales: primer cambio en países que inicialmente estaban bajo el umbral

| Último año disponible / evaluación posterior | Países inicialmente bajos | GED exacto en año: ninguno / cambios | GED exacto en año: >=1 / cambios | GED exacto en OCT–DIC: >=1 / cambios |
| --- | ---: | --- | --- | --- |
| **2022 → 2023–24** | 159 | **147 / 3** | **12 / 2** | **3 / 0** |
| **2023 → 2024–25** | 162 | **150 / 3** | **12 / 1** | **6 / 0** |

En 2022 los países inicialmente altos fueron 37 y seis registraron una primera salida del umbral en 2023/24; en 2023 fueron 34 y cuatro salieron en 2024/25. La contribución de GED exacto se computa por **ubicación** de eventos y no demuestra una explicación causal de su salida.

El contraste anual de países originalmente bajos resulta exploratoriamente sugestivo, pero **solo 12 países por ventana presentaban >=1 evento GED exacto**, y solo **dos y uno** acabaron cruzando el umbral. El subgrupo trimestral se reduce a 3 y 6 países, **sin cambios posteriores**. Esto no demuestra que los últimos tres meses sean irrelevantes en otros contextos; demuestra que este **indicador muy restrictivo de archivo anual** no añade evidencia útil en estas dos ventanas.

La edición GED 23.1 examinó **316.818 filas** y encontró ubicaciones con incidente exacto elegible durante 2022 en 49 países de la cohorte; GED 24.1 examinó **349.733 filas** y observó 46 durante 2023. Para el año de corte, se excluyeron registros por tipo distinto del estatal (6.926/8.185), `best=0` (1.512/1.544) y fecha imprecisa (2.565/4.534), respectivamente. **Estas categorías de exclusión no son nuevos desenlaces negativos**.

Los resultados por régimen inicial y por categoría de 0/1/2–4/≥5 incidentes, junto con los cuatro paneles de octubre–diciembre, se obtienen directamente en la salida **agregada** `cells` y `lastQuarterOctoberToDecember`. No se publica nombre o identidad de un país ni filas de GED.

## Ingeniería y seguridad

- `research/psychohistory/ged_monthly_cy_bridge.py`: lector GED exacto, checks de SHA-256, archivo ZIP acotado, `id` único, auditoría de fechas, separación total de vintage antigua para variables y posterior para resultados, controles contra faltantes y conteo trimestral.
- `test_ged_monthly_cy_bridge.py`: pruebas sintéticas de coincidencia de etiquetas, fuga temporal, ausencia de imputación de ceros, fecha exacta, tipo de violencia, exclusiones, fidelidad de hashes y conservación de población.
- `.github/workflows/psychohistory-ged-monthly-cy-bridge.yml`: dos trabajos en CI, con descarga efímera, recuperación íntegra de archivos oficiales, ejecución de dos ventanas, **eliminación** de fuentes del runner; tests científico y privacidad **SUCCESS**.
- Sin modificación alguna al motor operativo, ninguna probabilidad nueva, ninguna alerta, ninguna operación económica, ni datos en `PsicoPredicciones`.

## Interpretación y próxima prioridad

1. **NO extrapolar** tasas basadas en 1–3 cambios observados: los intervalos serían enormes, los países comparten conflictos regionales y las dos ventanas comparten 2024.
2. Los GED definitivos son retrospectivamente revisados; aunque su edición sea anterior al origen hipotético, falta un **testigo externo autenticado** de cuándo estuvieron accesibles los bytes exactos. La ausencia de incidentes elegibles es ausencia de registros con la fecha y filtro requeridos, no seguridad de paz.
3. El siguiente salto científico no es otra comparación post hoc con estos 196 países; es un estudio de **Candidate GED realmente publicado mensualmente**, con snapshots originales antes del origen, sello independiente, ventanas suficientemente amplias y denominadores que incluyan países de cero incidentes. Solo con ese pipeline podrá evaluarse una señal útil antes de los desenlaces posteriores.
4. El objetivo mensual de GED (incidentes exactos) **no es intercambiable** con el objetivo anual de violencia estatal CY. Deben mantenerse separados los modelos y no presentar probabilidad de conflicto o de bolsa calculada a partir de uno como si fuese la del otro.
5. Estado científico `MAD-04 PARCIAL`, `2027 SHADOW_NO_EMITIDO`. No hay evidencia prospectiva ni señal monetizable confiable por ahora.

**Resultado principal:** el historial anual de incidentes GED aporta una hipótesis de riesgo que merece investigación, pero el supuesto impulso reciente de octubre-diciembre no mejora la detección del primer cruce observado en estas muestras; conservar expresamente este resultado negativo.
