# PSICOHISTORIA v0.5 — iniciación de conflictos armados (objetivo independiente)

**Estado:** nuevo protocolo y pipeline offline preparado; **no se han publicado nuevas probabilidades de países reales**, ni se ha validado un modelo prospectivo.

## Pregunta de investigación

> Si emitimos un pronóstico el **1 de enero del año Y**, ¿cuál es la probabilidad de que UCDP registre en el país un **nuevo inicio o reanudación** de un conflicto armado interno (o, en un experimento separado, entre Estados) durante Y?

Definición de etiqueta: columna oficial `onset1` del **UCDP Onset Dataset v25.1, país-año, sin contar múltiples inicios dentro del mismo país y año**. Incluye tanto el primer inicio como la reanudación tras más de un año desde la última actividad. **No es** exactamente «una nueva guerra», una invasión o un golpe de Estado. UCDP define «conflicto armado estatal» por al menos 25 muertes **relacionadas con el combate en una díada** durante un año, y distingue tipos 2 (interestatal), 3 (interno) y 4 (interno internacionalizado).

**Dos experimentos distintos**, nunca mezclados:

1. `intrastate_country`: inicio de conflicto interno o interno internacionalizado (tipos 3 y 4). UCDP Onset 25.1 **Country Level**.
2. `interstate_country`: inicio de conflicto entre Estados (tipo 2). UCDP Onset 25.1 **Country Level**.

No confundir con la actual variable agregada `sb_total_deaths_best >= 25` de OrganizedViolenceCY, que cuenta muertes de diversos conflictos dentro de un mismo país y **no es** la definición oficial de nuevo inicio. Tampoco equiparar un inicio de conflicto interestatal con «invasión»: ésta exige otro criterio y documentación independiente.

**Fuente oficial, sin copiar datos reales en Git**:

- Inicio país-año interno: https://ucdp.uu.se/downloads/onset/ucdp-intrastate-country-onset-251.csv
- Inicio país-año interestatal: https://ucdp.uu.se/downloads/onset/ucdp-interstate-country-onset-251.csv
- [Codebook v25.1](https://ucdp.uu.se/downloads/onset/ucdp-codebook-onset-251.pdf)
- [Centro de descargas](https://ucdp.uu.se/downloads/) (CC BY 4.0). Citar edición exacta y referencias oficiales UCDP; la fuente contiene etiquetas a partir de 1946 y cobertura editorial hasta 2024.

## Qué implementa ya el código

`research/psychohistory/ucdp_onset.py` es un pipeline reproducible solo con biblioteca estándar. Recibe CSV local, tipo de conjunto y un SHA-256 **fijado explícitamente por el operador antes del experimento**. Rechaza estructuras inesperadas, duplicados país-año, etiquetas desconocidas, fechas imposibles y ediciones equivocadas. **No rellena** miembros del sistema Gleditsch–Ward ausentes con ceros; no acepta ficheros de conflictos individuales como si fueran paneles país-año.

Corte temporal del pronóstico anual de Y: solo observaciones de años **hasta Y−2**; Y−1 permanece desconocido, sin filtrar países por «situación vigente» que se conoció después. Un país se puntúa solo si hay **5 años consecutivos** de historia antes del corte y una etiqueta válida en Y. Los excluidos se contabilizan por año.

Dos comparadores deliberadamente simples, sin ajuste post-test ni elección de un ganador:

- `global_frequency`: frecuencia previa de `onset1` en todos los país-año oficialmente observados hasta Y−2, suavizada con Beta(1,1).
- `country_shrinkage`: tasa de los 5 años previos del país, contraída hacia esa frecuencia global con peso fijo de 20 observaciones equivalentes.

Validación 2010–2015 y test retrospectivo 2016–2024; los modelos se reestiman en cada origen usando siempre el corte Y−2. Métricas binaria Brier, log-loss, tasa base, número de inicios reales, países-año evaluados y excluidos; comparaciones sobre **el mismo denominador**. Para sucesos raros, priorizar calibración, Brier/log-loss, PR-AUC y capacidad de separación con intervalos temporalmente válidos cuando haya volumen suficiente. No declarar mejora sin contrastar variación temporal e incertidumbre. No escoger modelos según errores en el test.

### Ejecución privada (al disponer del CSV y su SHA independiente)

```bash
python3 research/psychohistory/ucdp_onset.py \
  --csv /ruta/privada/ucdp-intrastate-country-onset-251.csv \
  --kind intrastate_country \
  --expected-sha256 HASH_SHA256_REVISADO \
  --target onset1 \
  --output /ruta/privada/PSICOHISTORIA/onset-interno-251.json
```

Repetir con `--kind interstate_country` y su CSV exacto, como cohorte separada. El informe de casos concretos, hashes de muestras, resultados, países y errores debe guardarse exclusivamente en infraestructura privada; el código impide escribir en el repositorio. Los tests CI son **100 % sintéticos**, no demuestran ejecución sobre archivos oficiales ni habilidad predictiva real.

## Puertas de evidencia aún pendientes

1. Descargar y archivar ambos CSV oficiales en la carpeta privada de fuentes, registrar SHA-256 verificado e inspeccionar contra codebook el esquema efectivo (incluidos valores faltantes y universo Gleditsch–Ward). **Sin esta auditoría no generar resultados operativos.**
2. Ejecutar ambos experimentos privados, registrar todos los scores y baselines, inspeccionar inicios históricos reales y los falsos positivos/falsos negativos. No rellenar con «golpe de Estado» o «invasión» lo que UCDP no codifica.
3. Resolver explícitamente la selección país-año en riesgo: en la versión 2 del Onset Dataset un país con conflicto interno vigente no se considera en riesgo de nuevo inicio mientras ese episodio sigue; el backtest implementa la **probabilidad incondicional a la fecha de emisión** para todos los países observables y por eso no usa el conocimiento posterior de actividad en Y para seleccionar la muestra.
4. Comparar con un baseline externo fuerte, como [VIEWS](https://viewsforecasting.org/), solo si fenómeno/universo/horizonte y disponibilidad as-of son comparables. Estimar incertidumbre por bloques temporales y exigir más de una cohorte independiente.
5. Recuperar **vintages de época**; la edición 25.1 revisada en 2025 no estuvo disponible en el origen 2016. Ningún resultado anterior implica habilidad prospectiva.
6. Para **acontecimientos reconocibles y fechados** en días/meses, diseñar una segunda línea con **UCDP GED (eventos, lugar, fecha, actores e identificadores)** y una regla de agregación temporal preregistrada. Un registro de incidente GED no es automáticamente una «guerra nueva» ni un evento no violento. Respetar licencias y no mostrar datos no verificados.

La cohorte del motor anterior para 2027 sigue siendo sobre los **cuatro estados agregados de violencia**, no sobre el nuevo `onset1`. No asignar retrospectivamente a esas 3.920 distribuciones un fenómeno que no predijeron.

## Criterio de salida de la fase

Esta fase acaba cuando las versiones/columnas reales hayan sido confirmadas, ambos backtests tengan cobertura y métricas guardadas de forma privada, y la UI identifique por separado **estado de conflicto agregado (actual)**, **inicio de conflicto armado interno (nuevo)** e **inicio de conflicto interestatal (nuevo)**, mostrando métricas únicamente para experimentos realmente ejecutados. No usar valores sintéticos en producción.


## Diagnóstico de sucesos raros (v0.5.1, métricas disponibles cuando se ejecute el CSV oficial)

Los conflictos que empiezan son relativamente infrecuentes, por lo que un Brier bajo puede reflejar que el modelo casi siempre predice «no ocurre». Además de Brier y log-loss, `ucdp_onset.py` calcula:

- **Precisión media en el ranking (Average Precision / AP):** ranking binario con agrupación de probabilidades idénticas para no privilegiar arbitrariamente el orden de los países. Indefinida si no hubo ningún inicio en la muestra. No confundir con ROC-AUC ni con una tasa de acierto.
- **Cobertura de eventos en el 10 % de mayor riesgo:** qué porcentaje de los inicios observados cae en el decil superior según el ranking del modelo. En caso de empate exacto en el límite, cada país recibe peso fraccionario y se publica `tie_handling=fractional_expected`. El enriquecimiento (`risk_lift`) compara la tasa de eventos del decil superior con la prevalencia de la muestra.
- **Brier Skill frente al baseline registrado:** `1 - Brier(country_shrinkage)/Brier(global_frequency)` sobre **los mismos países-año**, sin seleccionar un ganador por el test. Es posible un resultado negativo; cero indica mismo error.
- **Calibración por cinco intervalos iguales** con denominadores, frecuencias reales y probabilidades medias. Intervalos vacíos permanecen sin estadísticas.
- **Diagnóstico anual** (2010–2015, 2016–2024): muestra anual, número de inicios, Brier y AP. Una muestra anual sin inicios devuelve AP nulo, no cero ni 100 %. La AP combinada sobre todos los países-año puede no representar la calidad de cada año si varía la prevalencia o si hay cambios de escala.

Estas métricas son **diagnósticos estadísticos retrospectivos** con la versión revisada 25.1. No demuestran capacidad prospectiva, anticipación de una invasión identificada ni significación estadística. Se exige evaluación posterior por bloques temporales, comparación contra modelos fuertes y pruebas vintage-correct antes de proclamar utilidad operativa. Los umbrales de alerta o intervención siguen sin definirse; no se elegirán utilizando el test.

 
## Ingesta oficial privada reproducible

`research/psychohistory/stage_onset_sources.py` permite descargar **ambos** CSV UCDP Onset 25.1 del dominio oficial, verificar encabezados y coherencia estructural, y guardarlos con permisos limitados en una carpeta **nueva, fuera del repositorio**. No modifica el motor ni almacena resultados en Git. La operación es todo-o-nada: si una fuente no pasa la validación, no se guarda ninguna.

```bash
python3 research/psychohistory/stage_onset_sources.py \
  --out-dir /ruta/privada/ucdp-onset-251-20261017
```

El manifiesto incorpora hashes SHA-256 de los bytes descargados y el universo de cada archivo. **Esos hashes son observados al descargar, no una firma independiente preexistente**. La existencia de los CSV no autoriza por sí sola un backtest como vintage-correct. Su disponibilidad histórica en 2016/2020 permanece sin verificar.

Para permitir la ingesta sin Codex ni comandos locales, la automatización de GitHub Actions puede descargar una **copia pública de las fuentes UCDP** en un runner temporal y transferirla después, como archivo, al almacenamiento privado del proyecto. La acción no debe incluir datasets privados, credenciales, puntuaciones por país ni artefactos con pronósticos reales; conservar como máximo un día el archivo de transferencia. El registro y los scores se calculan exclusivamente tras la ingesta privada, su revisión independiente y la comprobación del esquema oficial.



## Resúmenes de Onset en el laboratorio privado (v0.5.1)

Los primeros resultados oficiales **revisados retrospectivamente** se registran como un resumen por fenómeno (interno/interestatal) en `PsicoExperimentos.notas`, esquema `psychohistory.onset.summary.v1`. El análisis completo, predicciones por país, datos fuente y auditoría de incertidumbre permanecen exclusivamente en Google Drive privado.

Contrato de un resumen: `datasetVersion=25.1`, `target=onset1`, `kind` inequívoco, `runType=retrospective_revised_release_exploratory`, `sourceAsOfVerified=false`, `prospectiveEligible=false`, `sourceIndependentShaPinning=false`, hash de la fuente, `models=[global_frequency,country_shrinkage]`, lag=2 años, memoria de 5 años y dos particiones `validation` (2010–2015) y `test` (2016–2024). Cada partición guarda N, inicios, exclusiones, Brier de ambos modelos, skill, AP, log-loss, captura en el 10 % de mayor riesgo, intervalo por bootstrap de años y conteos agregados anuales.

El frontend `app/research-onset.mjs` valida el esquema, consistencia de denominadores, suma anual y Brier Skill antes de mostrar resultados, sin cifras hardcodeadas. Si falta el registro canónico no muestra métricas ficticias. Solo consume la API de lectura privada y **no añade endpoints ni modifica el grafo probabilístico anterior**.

La incertidumbre usa *bootstrap pareado por bloques de año* para reflejar sensibilidad a la elección de 6/9 años; no son periodos temporalmente independientes, intervalos de eficacia prospectiva ni una prueba de validez `as-of`. Distinguir siempre capacidad de ranking retrospectivo de pronóstico operativo.


## Cronología real anual de inicios (v0.5.3)

El observatorio muestra una gráfica 2016–2024 de **conteos observados de países con onset1** a partir de `PsicoExperimentos.notas`, sin cargar ni incluir datos operativos en el Git público. Presenta por separado interno e interestatal, con etiquetas anuales, denominadores auditados y nota de que cada barra cuenta **países-año**, no «guerras independientes». Es exclusivamente post-hoc sobre UCDP Onset 25.1; no muestra probabilidades prospectivas ni cambios en la red de cuatro estados.

Los datos pasan el parser `psychohistory.onset.summary.v1`; filas erróneas se descartan. No se introduce una integración nueva ni polling, se reutiliza la respuesta de `/api/research-lab` y los estilos son responsive con desplazamiento horizontal.
