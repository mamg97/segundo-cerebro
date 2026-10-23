# AV-114 — Procedencia de la geometría y selección de modelo OAF

23/10/2026. Auditoría retrospectiva de fuentes; todavía no define ni puntúa un desenlace.

Se archivó el [archivo técnico oficial](https://earthquake.usgs.gov/product/oaf/us6000tx38/us/1792588324773/forecast_data.json) de la misma versión del [pronóstico público](https://earthquake.usgs.gov/product/oaf/us6000tx38/us/1792588324773/forecast.json). El archivo técnico tiene 50.759 bytes y SHA-256 `4a2da9a7640ac7b044d8db2d1ee5806ebaa5b5fab57e8ee6b7158a47eb2785d6`. Ambos originales se conservan fuera de Git, con sus URL y capturas; el nuevo diagnóstico privado verifica hashes antes de comparar.

`pdl_event_id` identifica el evento esperado. Solo `bayesian_pdl` es verdadero entre los tres modelos RJ presentes; el objeto `results.bayesian_json` es idéntico, tras parsear JSON, al pronóstico publicado completo. Los objetos genérico y específico de secuencia no son iguales al publicado. No basta elegir el primer modelo disponible.

La región de búsqueda técnica es un círculo con centro `(21.643555140103228, 142.9597470575727)` y radio `10`. El pronóstico público muestra `(21.6436, 142.9597)` y el mismo radio: hay redondeo del centro. Los parámetros técnicos de profundidad son `−5` y `700`. Son parámetros del cálculo observado, no una regla de evaluación aprobada automáticamente.

El [código de desarrollo de SphRegionCircle](https://github.com/opensha/opensha-oaf/blob/master/src/main/java/org/opensha/oaf/util/SphRegionCircle.java), blob inspeccionado `2fa81bed50592915d619d8bc798de600c07bcf03`, documenta radio en kilómetros y pertenencia por distancia horizontal menor o igual al radio; advierte incertidumbre numérica en el borde. Esta lectura del código actual no acredita por sí sola el binario usado por el producto, que declara versión `1.06.1876`.

La [API ComCat](https://earthquake.usgs.gov/fdsnws/event/1/) distingue radio en grados de `maxradiuskm`, aplica límites temporales inclusivos y usa profundidad por defecto de `−100` a `1000` km. `updatedafter` filtra eventos modificados: no reconstruye un catálogo histórico. Sin catálogo/contribuidor explícitos devuelve la información preferida actual.

Consecuencia metodológica: conservar ambos JSON en cada futura captura y fijar antes de consultar resultados qué centro, profundidad, borde temporal, magnitud y política de revisiones se evaluarán. La región técnica puede orientar ese contrato, pero no sustituye su justificación. Una futura política de intervalo semiabierto requeriría filtrar el extremo final explícitamente, pues la API incluye ambos extremos.

No se consultó el catálogo del desenlace, no se calcularon aciertos ni Brier y no se emitió un forecast. `SIS-02` sigue `PARCIAL/NO`: falta captura prospectiva válida, reloj independiente, población elegible y contrato de outcome. El informe privado `geometry_pair_audit_20261023.json` conserva la comparación y los hashes de entrada.
