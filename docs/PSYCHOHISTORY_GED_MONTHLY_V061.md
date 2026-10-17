# PSICOHISTORIA — experimento country-month GED v0.6.1

**Estado:** nuevo objetivo operacional de **riesgo mensual de incidentes letales estatales** con ensayos sintéticos. No existe todavía una estimación prospectiva validada de sucesos individuales.

## Pregunta científica

¿Cuál sería la probabilidad de que se registre **al menos un incidente UCDP GED 25.1 state-based** en un país durante el mes siguiente, con `best >= 1`, `date_prec = 1` y fechas `date_start = date_end` que señalen un único día, usando únicamente observaciones anteriores al corte?

Este objetivo **no** es el inicio de una guerra, una invasión, el número exacto de fallecidos ni la presencia de todo tipo de violencia. Predice la incidencia mensual de *incidentes estatales letales y fechados exactamente* según la definición anterior. No debe interpretarse un cero de esta etiqueta como «no hubo violencia»: puede haber eventos con fecha imprecisa, incidentes no estatales o sucesos fuera de GED.

**Archivos:** `research/psychohistory/ged_monthly_incidence.py` y `test_ged_monthly_incidence.py`.

## Metodología previa a la evaluación

- Fuente de eventos: ZIP original UCDP GED 25.1, SHA-256 proporcionado y verificado, sin copiar eventos reales a Git. Roster de países-año: CSV oficial UCDP Onset 25.1 `intrastate_country`, también verificado por SHA-256. El roster define **membresía GW para evaluación**, no resultados que condicionen el modelo.
- Unidad: `country-month`; muestra 2016–2019 validación y 2020–2024 test retrospectivo. Se excluye un país si falta la membresía explícita de algún año necesario para la ventana de 24 meses de entrenamiento. Nunca se hace `fillna(0)` para miembros ausentes.
- Fecha hipotética de emisión: primer día del mes objetivo; **desfase fijo de 24 meses** en la entrada. El mes objetivo `t` solo usa datos mensuales de hasta `t−24`. Frecuencia global Beta(1,1) de meses país elegibles y tasa por país sobre una historia de 24 meses, contraída con peso de 24 meses equivalentes. Ambos modelos usan el mismo universo.
- Etiqueta `Y=1` si al menos uno de los GED que satisface todos los criterios está en ese país-mes; para meses del roster con cero incidentes elegibles, `Y=0` significa *ningún incidente de fecha exacta y tipo estatal con best>0 registrado*, no ausencia genérica de conflicto.
- Se excluye de **este target** GED `type_of_violence != 1`, `best=0`, `date_prec != 1` y registros cuyo intervalo no permita fecha exacta. Se guarda número de exclusiones por razón. La fuente oficial y sus IDs de eventos se validan para evitar duplicados.
- Métricas: Brier y log-loss binarios, AP con empates, captura en el 10 % de países-mes con mayor riesgo y calibración descriptiva. Variaciones por mes y por año no constituyen validez temporal as-of.
- Importante: el archivo GED **25.1 es una publicación revisada de 2025**; reconstruir predicciones de 2016–2024 desde esta edición **no es un test vintage-correct**. Tampoco se prueba que esos datos estuvieran disponibles al hipotético corte `t−24`.
- Ni probabilidades mensuales ni reportes país-mes se publican en el repositorio, en el frontend o en un Sheet hasta verificar fuente y resultados. Se guardan exclusivamente en fichero privado, en modo create-only. Los tests en Git son sintéticos.

## Ejecución de investigación en contenedor privado

```bash
python3 research/psychohistory/ged_monthly_incidence.py \
  --ged-zip /privado/ucdp-ged251.zip \
  --ged-sha256 SHA_GED_PREVIAMENTE_FIJADO \
  --onset-country-csv /privado/ucdp-intrastate-country-onset-251.csv \
  --onset-sha256 SHA_ONSET_PREVIAMENTE_FIJADO \
  --out /privado/psico-ged-monthly-20261017.json
```

Los resultados serán **exploratorios** y no implican que podamos predecir un incidente concreto con fecha, perpetrador o ubicación. El siguiente gate es ejecutar una muestra real sobre ambas fuentes oficiales archivadas en Drive, auditar la cobertura y comparar el resultado con un baseline fuerte. Es fundamental revisar el efecto de la exclusión de `date_prec>1` y evitar promesas predictivas sobre episodios futuros basadas solo en fit retrospectivo.

La vista principal de Futuros debe conservar **primero el grafo de probabilidades**; si se añade una nueva vista mensual, se hará únicamente después de resultados oficiales auditados y por fuente canónica privada, no con valores incrustados.


## Ampliación del benchmark: baseline fuerte de incidencia local (v0.6.2)

Antes de atribuir habilidad a la contracción hacia la prevalencia global, se añade **`country_history_24m`**: tasa suavizada Beta(1,1) de presencia de incidentes GED con fecha exacta entre los **24 últimos meses disponibles del propio país**, terminando en `t−24`. La fórmula es `(1 + meses_con_evento) / (24 + 2)`. Comparte exactamente país-mes y etiquetas con `global_frequency` y `country_shrinkage`; el target sigue siendo **incidencia**, no comienzo de conflicto.

La evaluación comparativa incluye Brier y log-loss, AP con empates, concentración top 10 %, calibración y Brier Skill tanto frente al baseline global como frente a la contracción por país. Si el baseline local sencillo obtiene menor error que el modelo más elaborado, debe reflejarse explícitamente; **no seleccionar el ganador con posterioridad para proclamar skill científica**. Este benchmark se añade después de la primera reproducción exploratoria, por lo que cualquier nueva comparación sigue siendo exploratoria: no constituye protocolo preinscrito antes del experimento original.

En una reproducción exploratoria privada con GED 25.1 y GW roster de Onset 25.1 se observó un patrón que exige prudencia: el historial local es un comparador exigente porque el objetivo de «algún incidente» está muy influido por la persistencia en países que ya registraban violencia estatal. No prueba capacidad para anticipar nuevas guerras. Los resultados numéricos, casos país-mes y archivos originales **no** se publican en Git: están en el informe privado del experimento archivado en Drive.

Próximo diseño científico independiente: «primera aparición de un incidente estatal letal tras un periodo explícito sin incidentes elegibles», con un target y población de evaluación preregistrados que no dependan de información futura al seleccionar la muestra. Nunca mostrar ese nuevo target como si fuera la probabilidad GED mensual actual.
