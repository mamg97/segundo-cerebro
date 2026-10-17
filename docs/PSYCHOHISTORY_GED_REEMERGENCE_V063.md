# PSICOHISTORIA — GED v0.6.3 · reaparición de violencia letal tras silencio documentado

**Estado:** target y baselines congelados en código y pruebas sintéticas; no afirmar resultados de este nuevo target hasta ejecutar fuentes oficiales privadas. La versión UCDP GED 25.1 disponible está retrospectivamente revisada, no `as-of` correcta. La simulación histórica nunca se convierte retroactivamente en pronóstico emitido.

## Pregunta científica preregistrada

> Si un país lleva **12 meses completos sin ningún incidente estatal letal GED elegible** en la última fecha de información conocida, ¿qué probabilidad existe de que aparezca **al menos un incidente** durante los siguientes 24 meses?

La definición del evento GED elegible es exactamente la del benchmark mensual ya existente: `type_of_violence=1` (state-based), `best>=1`, `date_prec=1`, `date_start=date_end` (día exacto), país asignado al incidente. Por tanto **«12 meses sin incidentes elegibles» no significa 12 meses en paz**; puede haber incidentes con fecha incierta, sin muertes best, violencia no estatal u otras clases de violencia. El objetivo tampoco equivale a «nueva guerra», «invasión» ni `onset1` oficial de UCDP: éstos se evalúan aparte.

### Calendario temporal sin fuga futura

Para el mes final objetivo `T`, la fecha hipotética de emisión es su primer día; el corte informativo es `C=T−24 meses`, por la latencia conservadora del experimento mensual. La población de riesgo se decide **exclusivamente con observaciones hasta C**, no con la etiqueta de los meses posteriores.

- Son elegibles únicamente países presentes de forma explícita en el roster anual GW de Onset 25.1 durante los **24 meses de historia anteriores al corte, inclusive**.
- La condición de riesgo es que los **12 meses `C−11..C` estén libres de incidentes elegibles**; esa condición se verifica en el corte y **nunca** con datos de `C+1..T`.
- El resultado retrospectivo es `Y=1` si en el intervalo posterior `C+1..T` aparece al menos un incidente GED elegible. El primer evento tras el corte es, por construcción, una reaparición después de los 12 meses tranquilos anteriores al corte. `Y=0` solo significa ausencia documentada de ese tipo de GED en ese intervalo, siempre que el roster esté completo.
- Para resolver la etiqueta se exige roster explícito durante los 24 meses posteriores. Si falta algún año del roster, el pronóstico se conserva como **emitido hipotéticamente pero no evaluable**, con recuentos `n_issued`, `n_evaluated` y `n_unresolved`. **Nunca** se seleccionan a posteriori los países participantes usando su futuro: la exclusión pertenece solo a la fase de resolución.
- Para entrenamiento en corte C se utilizan cohortes históricas con ancla `A` cuyo resultado `A+24≤C` ya habría madurado, durante los últimos **60 meses de anclas**. La elegibilidad de A se calcula con el historial conocido en A, y el resultado solo se incorpora cuando ha madurado. No entrenar con el futuro del propio corte.
- Las fuentes se comprueban por SHA-256 del ZIP GED 25.1 y del CSV Onset 25.1. El roster GW es una reconstrucción **revisada en 2025**, por lo que aun preservando la causalidad temporal de columnas, no hay prueba de que fuese accesible en esas fechas históricas.

### Baselines predefinidos

Las tres probabilidades usan exactamente los mismos países y fechas, sin búsqueda post-test de parámetros:

1. `global_reemergence`: frecuencia Beta(1,1) de cohortes elegibles históricas completas, con anclas del periodo disponible de 60 meses y resultado madurado por C.
2. `country_shrinkage`: historial de reapariciones del propio país dentro de esa ventana, contraído a la tasa global con **20 pseudocasos**.
3. `country_history`: tasa Beta(1,1) del país dentro de esas cohortes históricas, o frecuencia global cuando no consta ninguna cohorte histórica elegible del país.

Ventanas **validación 2016–2019** y **test retrospectivo 2020–2024**, población country-month con roster, Brier, log-loss, AP con empates, captura top 10 %, calibración y Brier Skill respecto a la frecuencia global. Los horizontes de 24 meses se solapan y crean dependencias marcadas: **no usar intervalos iid por país-mes**, ni interpretar cientos de meses como cientos de experimentos independientes. Comparaciones científicas posteriores requerirán bootstrap anual/bloques de al menos 24 meses y cohortes fuera de tiempo. Nunca llamar «alerta preventiva» a un riesgo que todavía no ha demostrado funcionar prospectivamente.

### Ejecución privada (solo tras revisión de pruebas)

```sh
python3 research/psychohistory/ged_reemergence.py \
  --ged-zip /privado/ged251-csv.zip \
  --ged-sha256 SHA256_ARCHIVO_OFICIAL_VERIFICADO \
  --roster-csv /privado/ucdp-intrastate-country-onset-251.csv \
  --roster-sha256 SHA256_ROSTER_VERIFICADO \
  --out /privado/psycho-ged-reemergence-24m.json
```

La salida detallada es **privada, create-only**, no debe volcarse a Git. No se modifica `PsicoPredicciones`, la cohorte anual de 2027, la UI ni los modelos de Onset. Hasta evaluar material oficial e integridad de archivos y pasar QA, **no mostrar probabilidades numéricas nuevas en la aplicación**.

### Criterio de salida

CI sintética verde, ejecución auditada con originales privados, recuentos de positivos/muestra por año, comparación de modelos contra global y local fuerte, análisis de sensibilidad sobre eventos GED de fecha imprecisa y una evaluación histórica sin fugas. Si el target tiene pocos positivos o nulas mejoras frente al baseline, documentar el resultado tal cual y no atribuirle evidencia de «psicohistoria» predictiva.
