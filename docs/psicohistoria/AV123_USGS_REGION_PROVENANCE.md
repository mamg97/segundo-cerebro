# AV-123 · Procedencia de región y profundidad OAF

24/10/2026. Se sigue el código fijado en `21403ee02c68316f7bbc04e2d0f86c9eb642a389`, cuyo rótulo coincide con 1.06.1876. Cuatro originales completos nuevos, con SHA-256 y blob Git SHA-1 verificados. No se consulta ningún catálogo de desenlaces.

## Cadena acreditada

1. `ForecastParameters` construye una región circular de búsqueda alrededor del centroide de las réplicas disponibles; si no hay réplicas, usa la localización del principal. El centro final no tiene por qué ser el epicentro. El rango de profundidad se pasa a las búsquedas del catálogo, tanto para centroide como para muestreo.
2. `ForecastResults` pasa región y límites de profundidad a la recuperación del catálogo histórico. Al preparar el forecast bayesiano, añade los parámetros de presentación de esa región al mapa que se serializa en el producto.
3. `SphRegionCircle.get_display_params` publica círculo, latitud/longitud con cuatro decimales y radio con dos. El archivo técnico conserva el centro sin ese redondeo.
4. La pertenencia al círculo de búsqueda compara distancia horizontal esférica con radio mediante `<=`. La distancia usa haversine y radio equivalente a **111,12 km por grado**, aproximadamente 6.366,71 km. No es distancia hipocentral ni geodesia elipsoidal. El código advierte de indeterminación numérica muy cerca del borde.

## Contraste de un par archivado

El forecast público coincide con el modelo bayesiano marcado para publicación en el archivo técnico. El centro/radio publicados coinciden con el redondeo declarado en el código.

- Desplazamiento entre centro preciso y mostrado: **6,96 metros**.
- Distancia entre centro preciso y epicentro: **4,43 km**.
- Radio técnico y mostrado: **10 km**.
- Profundidad de búsqueda histórica: **−5 a 700 km**.

Son datos de un único par técnico ya archivado; no una cohorte ni validación de desenlaces. Demuestran que sustituir el centro técnico por el epicentro puede cambiar la selección espacial, y que el redondeo mostrado puede importar en el borde.

## Qué no queda establecido

Los límites −5/700 aparecen como filtros de **búsqueda histórica**. En la ruta revisada se serializa la geometría de presentación, pero no se acredita por ello un contrato futuro de profundidad. Tampoco se demuestra que el modelo deba evaluarse con distancia hipocentral, con un radio estándar diferente o con la caja rectangular que envuelve el círculo.

La procedencia del centro redondeado queda resuelta. Para el futuro protocolo, la elección propuesta es conservar el centro técnico y el publicado, justificar explícitamente cuál define la evaluación y registrar sensibilidad de borde. La profundidad del desenlace y las revisiones del catálogo requieren una regla anterior a su consulta. Esta auditoría no aprueba todavía ese contrato ni atribuye semántica oficial no encontrada.

SIS-02 PARCIAL/NO. Sin captura prospectiva admitida, emisión o score. No se atestigua el binario/configuración desplegados únicamente por coincidir el rótulo.

## Fuentes fijadas

- [ForecastParameters.java](https://github.com/opensha/opensha-oaf/blob/21403ee02c68316f7bbc04e2d0f86c9eb642a389/src/main/java/org/opensha/oaf/aafs/ForecastParameters.java), líneas 537–544 y 694–768: profundidad, centroide y círculo de búsqueda.
- [ForecastResults.java](https://github.com/opensha/opensha-oaf/blob/21403ee02c68316f7bbc04e2d0f86c9eb642a389/src/main/java/org/opensha/oaf/aafs/ForecastResults.java), 320–328 y 919–931: muestreo y presentación del modelo bayesiano.
- [SphRegionCircle.java](https://github.com/opensha/opensha-oaf/blob/21403ee02c68316f7bbc04e2d0f86c9eb642a389/src/main/java/org/opensha/oaf/util/SphRegionCircle.java), 49–85 y 381–385: pertenencia y redondeo de presentación.
- [SphLatLon.java](https://github.com/opensha/opensha-oaf/blob/21403ee02c68316f7bbc04e2d0f86c9eb642a389/src/main/java/org/opensha/oaf/util/SphLatLon.java), 244–249, 264–274 y 327–349: radio ComCat, haversine y distancia.

Informe privado SHA-256: `bcf4bb45d537007cb7b349bcfcab49f26819996ec53879acaffedff20f3f592a`. Originales, par técnico y manifiesto permanecen fuera de Git. Los números anteriores describen el contraste reproducido; no una garantía de precisión física de los epicentros.
