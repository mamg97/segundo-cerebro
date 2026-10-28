# Comparaciones visuales de ensayos históricos

La web lee el contrato existente de PsicoExperimentos: valor, baseline, métrica,
fecha, hipótesis, modelo y notas. No añade tablas, llamadas, credenciales ni
polling. Ningún resultado real se incluye en el bundle público.

## Notas estructuradas

Schema `psychohistory.paired-evaluation.v1`, runType
`adaptive_historical_screen`, forecastIssued:false, skillDemonstrated:false,
n entero positivo, decision `rejected` o `screen_passed`, criterion no vacío,
y references con1–3pares label/value. El baseline de la fila debe coincidir
exactamente con la primera referencia. Métricas admitidas: brier [0,1], rmse
no negativo en puntos porcentuales. El autor del registro garantiza muestra
pareada; el frontend no acredita procedencia por poder leer un JSON.

IDsduplicados, valores ausentes/no finitos, schema ambiguo y metadatos que
atribuyan habilidad/emisión se excluyen. Nunca se infiere admisión porque el
candidato gane a una sola referencia; la decisión completa viene del contrato
científico. Un filtro histórico superado tampoco es habilidad prospectiva.

Inicio enseña los tres últimos ensayos; Evidencia los conserva todos. Cada
comparación tiene su escala propia, métrica/unidad, tamaño de muestra,
criterio y enlace. No clasifica entre muestras diferentes ni convierte error
en porcentaje de acierto. Barras SVG con atributos numéricos y CSS externo
compatibles con CSP; números y etiquetas accesibles sin depender del color.

Cinco pruebas nuevas cubren descarte pese a mejorar una referencia, datos
inválidos/contradictorios, métricas separadas/duplicados, inyección y resumen.
Verificación integrada local: Inicio/Evidencia, escritorio y433pxsin overflow.
El render local usa un fixture privado con sólo los tres ensayos; la ausencia
de otras filas en ese fixture no representa el registro real de producción.

La prueba local amplia encontró dependencias ausentes @cf-wasm/photon y un
test preexistente que interpreta espacios de ruta como %20. No se modifica
código ajeno por ese entorno; CI con dependencias en Linux debe pasar antes
de integrar. Build y26pruebas del laboratorio correctos.
