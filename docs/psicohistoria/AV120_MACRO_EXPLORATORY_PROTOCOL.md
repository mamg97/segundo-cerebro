# AV-120 · Protocolo macro exploratorio congelado

Fecha: 23/10/2026. Estado: contrato y ejecutor preparados; resultados reales todavía no calculados al fijar esta versión.

## Pregunta y reloj

Estimar la probabilidad de que la primera tasa UNRATE del mes objetivo supere en al menos **0,5 puntos porcentuales** la tasa del mes base conocida en el corte. El objetivo es el **mes base + 6 meses**, no el máximo durante ese intervalo ni seis meses después de la emisión. La base es el último mes disponible; puede retrasarse durante una interrupción de publicaciones.

Orígenes trimestrales: día 16 a las 00:00, America/New_York, en febrero, mayo, agosto y noviembre, desde 2011 hasta el 16/08/2026. Datos conocidos según ALFRED al día 15 anterior. El margen diario evita atribuir una hora histórica no acreditada. La etiqueta se conoce desde su fecha inicial ALFRED; no equivale a disponer de los bytes originales BLS. Los datos terminan en septiembre de 2026.

## Diseño fijado antes del cálculo

- Evaluación desde 16/02/2019; entrenamiento expansivo con orígenes anteriores y etiquetas ya disponibles en cada corte, mínimo 20 casos.
- Características: nivel del mes base y cambios de 1, 3 y 6 meses, todos reconstruidos con la misma versión histórica del corte.
- Logística L2 con penalización 1,0 sobre pérdida media; intercepto sin penalización. Escalado con media y desviación poblacional del entrenamiento únicamente. Máximo 100 iteraciones; fallo explícito si no converge.
- Comparador: frecuencia histórica suavizada Beta(1,1), (eventos+1)/(casos+2). Si el entrenamiento tiene una sola clase, ambos devuelven ese comparador y el caso queda marcado; no se presenta como ajuste logístico.
- Sin imputación: variables ausentes excluyen el origen; etiquetas ausentes o fuera del archivo no se puntúan. Una etiqueta ya conocida al corte invalida el caso. No se ajustan parámetros según resultados.
- Brier de ambos métodos sobre exactamente los mismos casos; habilidad 1 − Brier_modelo/Brier_base, desglose anual, medias de probabilidad y número de eventos. No se usan casos no puntuables para las métricas.

El comparador concreto es frecuencia histórica, no la persistencia binaria mencionada en un borrador anterior. Esta elección queda documentada antes de calcular resultados y no supone una comparación exhaustiva con todos los baselines posibles.

## Congelación y reproducción

Contrato: `research/psychohistory/macro_protocol_v1.json`.
SHA-256: `e12dd9a31b9d1c18ce575e5d35092b375df8154090b804aed726b753f4d7df32`.

El ejecutor exige ese hash y los bytes del contrato versionado. Valida los hashes de ambos ZIP originales y las auditorías AV-117/119 antes de construir casos. El informe privado conserva hash del contrato, cinco módulos de código y fuentes; rechaza sobrescribir un archivo de salida existente. Publicar y fusionar esta versión antes de ejecutar los datos reales. El identificador de commit completa la referencia inmutable.

```sh
python3 research/psychohistory/macro_retrospective.py \
  --protocol research/psychohistory/macro_protocol_v1.json \
  --protocol-sha256 e12dd9a31b9d1c18ce575e5d35092b375df8154090b804aed726b753f4d7df32 \
  --realtime /ruta/privada/realtime_periods_response.bin \
  --initial /ruta/privada/initial_release_response.bin \
  --output /ruta/privada/macro_retrospective_v1.json
```

Siete pruebas sintéticas verifican reloj, horizonte, umbral exacto, ausencias, disponibilidad de etiquetas, invariancia frente a desenlaces futuros, fallback de una clase, ajuste finito y métricas emparejadas. No son resultados sobre las series reales.

## Alcance

Experimento retrospectivo **exploratorio**: la historia, incluida la pandemia, ya es conocida. La congelación precede al cálculo de este ensayo, no al conocimiento de la historia. Pocos orígenes y horizontes solapados impiden tratar los casos como independientes. No se declara confirmación, capacidad predictiva demostrada, emisión real ni aprobación de gates. Los resultados negativos se conservarán sin retocar este protocolo; cualquier diseño posterior tendrá nueva versión y reconocerá la adaptación.

MAC-01, MAC-02 y MAC-03 permanecen PARCIAL/NO. El ensayo pendiente desarrolla MAC-04; no cambia emisiones prospectivas. Originales y casos individuales permanecen privados.
