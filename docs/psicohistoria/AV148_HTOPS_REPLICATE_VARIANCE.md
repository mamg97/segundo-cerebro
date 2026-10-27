# AV148 · Incertidumbre del agregado de soledad HTOPS

27/10/2026. Reproducción de marzo con el [PUF oficial actual](https://www2.census.gov/programs-surveys/demo/datasets/hhp/2026/topical/HTOPS_HPS_2603_CSV.zip).
El ZIP contiene microdatos, pesos replicados y diccionario de la misma entrega.
Los originales y resultados detallados se conservan privados, con huellas.
No son los bytes acreditados de la primera publicación histórica.

## Identidad y reproducción

El diccionario asigna `SOC_LONELY` a la pregunta de soledad: códigos 1 y 2
son Always y Usually; -99 es no respuesta. Se une por `SCRAMID` sin duplicados
ni pérdidas. `PWEIGHT0` coincide con `PWEIGHT`; se usan `PWEIGHT1` a
`PWEIGHT80`, sin mezclar pesos de hogar. Los 12.521 registros corresponden a
adultos; la no respuesta permanece en el denominador.

El total reproduce exactamente 261.534.494 adultos. Los marginales reproducen
la tabla archivada dentro de media persona, tolerancia del redondeo publicado.
Ambos errores estándar marginales se reproducen dentro de 0,0005 personas,
correspondiente a la precisión de tres decimales de las celdas originales.

## Resultado

La fuente oficial denomina el método **successive difference replication**:
`Var(theta) = (4/80) sum((theta_i - theta_full)^2)`.
Se centra en el estimador completo, no en la media de los replicados.

- Proporción Always+Usually: **5,580748 %**.
- Error estándar del agregado: **1.751.419,472 personas**.
- Error estándar de la proporción: **0,669671 puntos porcentuales**.
- La covarianza de los dos marginales es negativa. La identidad de varianza
  de la suma se verifica y el resultado queda dentro de los límites AV130.

La razón se recalcula con cada denominador replicado. En esta estimación
nacional, esos denominadores coinciden con el control poblacional salvo
redondeo numérico; por eso coincide aquí con normalizar por el total fijo.
No se presupone esa igualdad para otras estadísticas o subpoblaciones.

`replicate_variance.py` implementa el cálculo. Siete pruebas analíticas cubren
centrado, covarianza negativa, escala, razón con denominador variable,
cardinalidad, finitud y entradas imposibles. La reproducción privada valida
unión, códigos, edades, pesos, hashes y concordancia con las tablas archivadas.

## Límites y siguiente paso

Se resuelve la covarianza faltante de AV130. SOC-02/03 siguen PARCIAL/NO:
faltan primeras versiones, regla de revisiones y un objetivo futuro con corte
anterior al campo. La incertidumbre calculada no cubre sesgos sistemáticos,
no demuestra cambio entre olas ni habilidad predictiva. No se escribe forecast.

Fuente metodológica: [Census, Source and Accuracy, marzo 2026, página 11](https://www2.census.gov/programs-surveys/demo/technical-documentation/hhp/HTOPS_2603_Source_and_Accuracy.pdf).
