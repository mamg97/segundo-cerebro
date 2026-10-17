# PSICOHISTORIA — GED v0.6.7 · robustez frente al calendario de evaluación

**Estado:** código y pruebas sintéticas. El diagnóstico agregado con los originales privados de UCDP GED y Onset 25.1 (versiones revisadas) está archivado separadamente en Drive, bajo PSICOHISTORIA - EXPERIMENTOS. Nunca copiar aquí valores empíricos, datos país-mes, probabilidades reales ni enlaces que expongan credenciales.

## Pregunta preregistrada

¿La comparación de Brier, log-loss, capacidad de ranking (AP con empates y ROC-AUC) y calibración entre los **cuatro modelos congelados** de GED reaparición a 24 meses cambia significativamente *en sentido descriptivo* al desplazar el calendario de evaluación?

No se alteran las predicciones, desenlaces, cohortes ni hiperparámetros congelados del informe v0.6.5; se vuelve a puntuarlos en submuestras de fechas terminales de horizonte T, separadas por 24 meses. Una evaluación descriptiva que mejora con esta selección de submuestras NO constituye nueva validación independiente.

## Datos y contrato

- Entradas **privadas**: JSON originales exactos de GED reemergencia v0.6.3 y GED recencia v0.6.5, extraídos de sus ZIP de Drive.
- Rechazo estricto si cambian: esquemas, flags retrospectivos, horizonte de 24 meses, modelos, país/fecha/corte, desenlaces, Brier total archivado, denominadores, salidas de los tres baselines o recencia incompatible con un historial insuficiente.
- Los ZIP de origen y los hashes GED/Onset se comprueban **antes y aparte** contra sus manifiestos privados; un SHA local o el manifiesto de una release revisada no demuestra que los datos estuviesen disponibles en la fecha hipotética de emisión.
- El módulo no descarga datos, no necesita API ni dependencia extra y guarda JSON con modo **create-only**.

## Construcción del contraste

Para cada partición —validación con fin de horizonte 2016–2019, test con fin de horizonte 2020–2024— se calculan 24 alineaciones de calendario, \`offset=0..23\`, ancladas en enero del primer año de la partición. Dentro de cada alineación, las ventanas objetivo de 24 meses **no se solapan**. Debido a la longitud desigual de las particiones hay 2 fechas por alineación en validación; en test hay 3 para offsets 0–11 y 2 para offsets 12–23.

Cada alineación informa N, eventos, cuatro modelos con Brier, log-loss, AP de umbrales agrupados para empates, ROC-AUC con empates, calibración en cinco bandas, y composición de cuatro buckets históricos. Se registran las fechas finales \`T\` y las fechas hipotéticas de emisión \`T−23 meses\`; no confundirlas.

El contador de alineaciones en que recencia obtiene menor Brier que \`country_history\` es **un diagnóstico**, no una prueba estadística. Las 24 alineaciones reutilizan gran parte de los mismos países y desenlaces; tampoco hay independencia entre países de una fecha dada. No calcular intervalos, p-values, elegir mejor offset, retocar bins, ni convertir los resultados en predicciones prospectivas.

## Ejecución reproducible en entorno privado

\`\`\`bash
python3 research/psychohistory/ged_calendar_robustness.py \
  --original /privado/ged_reemergence_report.json \
  --recency /privado/ged_recency_comparison.json \
  --out /privado/ged-calendar-v067-create-only.json
\`\`\`

Las pruebas sintéticas del módulo rechazan modificaciones de cortes, etiquetas, baselines congelados, historial incompleto, recuentos y Brier preexistente. También verifican los 24 offsets, el desfase emisión/fin y métricas con empates.

## Resultado privado y siguiente interpretación

Una auditoría retrospectiva independiente contra los informes privados originales y sus manifiestos generó un ZIP **nuevo, solo propietario** con los 48 paneles, código de análisis, pruebas y hashes. Esa ejecución **no implica** que el código GitHub haya generado exactamente el mismo fichero byte a byte; su implementación sigue la misma regla y se valida separadamente en CI.

La sensibilidad temporal puede constatar estabilidad del Brier y a la vez diferencias notables en AP/AUC y calibración. La madurez científica sigue limitada por **2/3 bloques de calendario como máximo**, correlación dentro y entre alineaciones, disponibilidad as-of no verificable y ausencia de sello temporal independiente.

**No cambiar el orden del grafo de Futuros ni publicar nuevos scores en la UI.** El siguiente paso científico es: auditoría de composición de universos históricos y unión factual GED con acontecimientos fechados, siempre sin atribuir el target genérico a guerras/invasiones específicas.
