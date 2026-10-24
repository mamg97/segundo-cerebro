# AV-124 · Diagnóstico espacial OAF reutilizable

24/10/2026. Implementación sin red ni adjudicación de desenlaces, basada en la convención geométrica fijada en [AV123](AV123_USGS_REGION_PROVENANCE.md).

## Capacidad

`research/psychohistory/usgs_oaf_spatial_diagnostic.py` compara dos círculos suministrados —técnico y mostrado— para una lista de puntos. Calcula distancia horizontal esférica con 111,12 km/grado, margen al borde y pertenencia nominal `distancia <= radio`. Conserva el cálculo nominal y marca `BORDER` cuando el margen absoluto es menor o igual a una tolerancia **explícita**.

La tolerancia no es incertidumbre física de localización ni permiso para ensanchar el radio; solo hace visibles casos que requieren revisión. No se adjudica el desenlace de esos casos. Coordenadas fuera de rango, números no finitos, booleanos, radios inválidos, tolerancia negativa, IDs vacíos/duplicados y geometrías no circulares se rechazan.

También calcula desplazamiento de centros y la cota geométrica `desplazamiento + diferencia absoluta de radios` para el cambio del margen. La cota procede de la desigualdad triangular en la misma esfera; no es un intervalo de confianza ni garantiza localizaciones verdaderas.

## Verificación

Seis pruebas sintéticas cubren distancias analíticas en ecuador, cruce del antimeridiano, polos/antípodas, borde y tolerancia, cambio de pertenencia por centro desplazado, radios distintos y rechazo de entradas inválidas. Ejecución CLI sobre cuatro puntos hipotéticos alrededor de la geometría archivada: cuatro procesados y un caso marcado para revisión de borde; ninguna observación sísmica usada como desenlace.

El informe guarda hashes del input y código, rechaza sobrescritura y mantiene `source_pair_validated=false`, `depth_evaluated=false`, `outcome_adjudicated=false` y `forecast_issued=false`. La autenticación del par técnico sigue correspondiendo al capturador/auditor de fuente; este módulo no la sustituye.

```sh
python3 research/psychohistory/usgs_oaf_spatial_diagnostic.py \
  --input /ruta/privada/diagnostic-input.json \
  --output /ruta/privada/diagnostic-report.json
```

Contrato mínimo: `schema=oaf-spatial-diagnostic-input-v1`, `technical` y `display` con `type=circle`, `center={lat,lon}`, `radius_km`; `boundary_tolerance_km` no negativa; `points=[{id,lat,lon}]`. Coordenadas canónicas lat[-90,90], lon[-180,180]. No consulta catálogos ni evalúa profundidad, tiempo, magnitud o completitud.

SIS-03 avanza a PARCIAL/NO por esta pieza geométrica; no constituye un predictor completo. Continúan pendientes contrato integral de desenlace y cohorte, atestación temporal y admisión prospectiva.
