# AV-116 — Umbral nominal y tolerancia histórica en OAF

23/10/2026. Revisión de fuentes primarias previa a definir el desenlace. No se ha consultado un catálogo de resultados ni emitido un pronóstico.

## Versión y alcance

El producto retrospectivo de AV-114 declara `1.06.1876 (07/27/2026)`. El historial de OpenSHA permite localizar el [commit `21403ee`](https://github.com/opensha/opensha-oaf/commit/21403ee02c68316f7bbc04e2d0f86c9eb642a389), cuyo [VersionInfo.java](https://github.com/opensha/opensha-oaf/blob/21403ee02c68316f7bbc04e2d0f86c9eb642a389/src/main/java/org/opensha/oaf/aafs/VersionInfo.java) declara exactamente ese número y fecha. Se conservan privadamente cinco archivos completos con verificación del hash Git de cada blob y SHA-256 local.

Esto vincula la revisión a código con el mismo rótulo de versión. No es una atestación del binario instalado, sus dependencias o configuración. El código actual `fdfbaef163f3355201a8df5a56b8bbffaaaf24a5` declara 1.06.1878: no se ha usado su fecha para atribuir retrospectivamente el comportamiento.

## Cadena de cálculo verificada en 1.06.1876

| Paso | Evidencia | Consecuencia |
| --- | --- | --- |
| Conteo histórico | `USGS_AftershockForecast`: semianchura predeterminada 0,05; observaciones con magnitud >= umbral menos semianchura | El contador histórico puede incluir M4,95 en el grupo rotulado M5 si se usa ese valor predeterminado. |
| Probabilidad futura | El mismo archivo pasa `minMag` directamente a `getProbOneOrMoreEvents` | El llamador no resta la semianchura al umbral futuro. |
| Modelo bayesiano RJ | `RJ_AftershockModel_Bayesian` hereda ese método de `RJ_AftershockModel` sin sobrescribirlo | La probabilidad es la media ponderada de `1 - exp(-expectedVal)` sobre el soporte de parámetros. |
| Intensidad esperada | `AftershockStatsCalc` recibe el mismo `magMin` y usa `10^(a + b*(magMain-magMin))`, integrado en el intervalo temporal | Tampoco aparece una resta de 0,05 en esta cadena de magnitud. |

Fuentes fijadas al commit: [contador y llamador, líneas 498–648](https://github.com/opensha/opensha-oaf/blob/21403ee02c68316f7bbc04e2d0f86c9eb642a389/src/main/java/org/opensha/oaf/rj/USGS_AftershockForecast.java#L498), [probabilidad RJ, líneas 828–848](https://github.com/opensha/opensha-oaf/blob/21403ee02c68316f7bbc04e2d0f86c9eb642a389/src/main/java/org/opensha/oaf/rj/RJ_AftershockModel.java#L828), [herencia bayesiana](https://github.com/opensha/opensha-oaf/blob/21403ee02c68316f7bbc04e2d0f86c9eb642a389/src/main/java/org/opensha/oaf/rj/RJ_AftershockModel_Bayesian.java#L47), [intensidad e integral](https://github.com/opensha/opensha-oaf/blob/21403ee02c68316f7bbc04e2d0f86c9eb642a389/src/main/java/org/opensha/oaf/rj/AftershockStatsCalc.java#L160).

Los tres primeros archivos son idénticos byte a byte entre las dos revisiones inspeccionadas. `AftershockStatsCalc` cambia en otros métodos, pero la conversión de productividad y la integral utilizadas aquí permanecen iguales. Esto es inspección y comparación de fuentes; no se ha compilado ni ejecutado el sistema USGS.

## Consecuencia para el protocolo

No trasladar la tolerancia del contador histórico a la variable binaria futura. En esta cadena RJ, el bin nominal M5 introduce 5,0 en el modelo. Una evaluación con eventos preferidos M>=4,95 requeriría una justificación adicional y explícita; no queda justificada por el contador mostrado en el producto.

El futuro contrato debe fijar cómo adjudica magnitudes preferidas, redondeos y revisiones del catálogo. No se ha resuelto con este análisis la política de profundidad, pertenencia espacial, bordes temporales o completitud. La cadena RJ inspeccionada tampoco acredita el comportamiento de un producto ETAS.

`SIS-02` permanece `PARCIAL/NO`. Siguen pendientes el contrato completo, captura prospectiva admisible y atestación temporal independiente. Esta revisión reduce una ambigüedad metodológica y no acredita habilidad predictiva ni aprobación de gates.
