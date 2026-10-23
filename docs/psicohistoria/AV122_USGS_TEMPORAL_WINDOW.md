# AV-122 · Ventana temporal del producto USGS OAF

23/10/2026. Revisión de código fijado y productos ya archivados; no se consulta catálogo de desenlaces, no se admite captura prospectiva y no se calcula score.

## Hallazgo

La ventana de la probabilidad es la pareja **timeStart/timeEnd del bloque forecast**. No debe reconstruirse como 24 horas desde creationTime, desde la actualización del producto ni desde la descarga.

En el código con rótulo 1.06.1876, `Duration.ONE_DAY` suma un día a un `Instant`; semana, mes y año usan respectivamente 7, 30 y 365 días. El constructor puede redondear el inicio hacia arriba antes de calcular. Los mismos límites calculados se pasan al modelo y después se escriben como milisegundos Unix en el JSON.

Si `roundStart` está activo, la rejilla es de 10 minutos cuando el inicio solicitado está a no más de 24 horas del principal, y de 60 minutos después. Un instante ya alineado se conserva. No se infiere de ello la configuración efectiva del binario de producción; se usan los límites publicados, sin redondearlos otra vez.

## Evidencia primaria fijada

Commit `21403ee02c68316f7bbc04e2d0f86c9eb642a389`, conservado en AV116:

- [USGS_AftershockForecast.java](https://github.com/opensha/opensha-oaf/blob/21403ee02c68316f7bbc04e2d0f86c9eb642a389/src/main/java/org/opensha/oaf/rj/USGS_AftershockForecast.java): duraciones y rejillas 65–87; aplicación del redondeo 527–539; cálculo de límites y llamada probabilística 616–643; delta temporal 664–667; redondeo 801–842; salida JSON 942–944.
- [AftershockStatsCalc.java](https://github.com/opensha/opensha-oaf/blob/21403ee02c68316f7bbc04e2d0f86c9eb642a389/src/main/java/org/opensha/oaf/rj/AftershockStatsCalc.java): intensidad integrada entre los límites, 200–220.
- [RJ_AftershockModel.java](https://github.com/opensha/opensha-oaf/blob/21403ee02c68316f7bbc04e2d0f86c9eb642a389/src/main/java/org/opensha/oaf/rj/RJ_AftershockModel.java): comentario del intervalo con ambos extremos incluidos, 192–193.

Se han vuelto a verificar SHA-256 y SHA-1 Git de los cinco originales archivados. Coincidir con el rótulo de versión no atestigua el binario ni su configuración desplegada.

## Contraste con archivos

Cuatro archivos de forecast del mismo evento, con 16 bloques: todos cumplen las duraciones 1/7/30/365 días y un inicio común dentro de cada archivo. Son actualizaciones de una secuencia, no cuatro observaciones independientes.

En el archivo vigente al capturarlo, el inicio publicado está **3.488.246 ms** después de creationTime; en los tres históricos, **488.386 ms** después. El contraste prueba que sustituir timeStart por creationTime cambia materialmente la ventana. No prueba captura pre-ventana: estos archivos se recuperaron después.

Informe privado SHA-256: `18d34f59ed90224fbda7e592da0be66768b327915879b9c2f58cc1b35d14efde`. Incluye hash de cada archivo, límites, duración y diferencia con creationTime.

## Borde temporal todavía por fijar

El borrador proponía [inicio,fin). No se eleva esa propuesta a regla oficial: un comentario del modelo usa extremos incluidos y la integral continua no resuelve cómo contar un evento de catálogo registrado exactamente en el límite. Con tiempos discretos, esa diferencia puede afectar al desenlace.

Antes de admitir una cohorte, fijar explícitamente la regla de borde, conservar eventos exactamente en ambos límites y documentar cualquier sensibilidad. La regla no puede escogerse después de ver los resultados. Región, profundidad, revisiones del catálogo y atestación pre-ventana siguen pendientes. SIS-02 continúa PARCIAL/NO; el contrato completo no está aprobado.
