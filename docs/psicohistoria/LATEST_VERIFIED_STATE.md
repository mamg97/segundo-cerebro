# PSICOHISTORIA — Estado científico verificado · 22/10/2026

## AV-090 · Auditoría de cobertura RUC en revisión

- [PR #780](https://github.com/mamg97/segundo-cerebro/pull/780) quedó
  fusionada con tres checks correctos; `AV-20261022-089` está en el Sheet
  privado y `MAC-01/02` siguen parciales, con criterio no superado.
- [AV-090](AV090_RUC_OBSERVATION_COVERAGE.md) cuenta primeras apariciones
  trimestrales y documenta la excepción del cierre federal de 2025. Código y
  CI pendientes de cierre; no equivale a primer dato BLS ni a backtest.

---

## AV-089 · Fuente macroeconómica en preparación

- Rama de trabajo para auditar los vintages trimestrales RUC de desempleo
  mensual de la Reserva Federal de Filadelfia, independiente de UCDP. 244
  vintages, 955 meses y 141.146 celdas numéricas con original y hash
  conservados fuera de Git. [Informe AV-089](AV089_MACRO_RUC_VINTAGES.md).
- Pendiente de cierre remoto y registro canónico: este bloque es una
  **preparación**, no un pronóstico ni un backtest. Falta fechar las
  publicaciones de cada vintage y la primera observación del target.
- El [mapa de líneas](MAPA_LINEAS_INDEPENDIENTES_20261022.md) distingue los
  siete dominios y sus preguntas pendientes; sus etapas no se comparten.

---

## AV-088 · La anomalía Candidate persiste en la exportación trimestral

- [PR #778](https://github.com/mamg97/segundo-cerebro/pull/778) compara las
  descargas oficiales de septiembre 26.0.9 y enero–septiembre 26.01.26.09,
  ambas fijadas por hash. Los 2.014 registros mensuales aparecen con los
  campos básicos idénticos entre los 16.633 trimestrales, incluido el único
  intervalo que abarca septiembre sin un extremo dentro del mes. Informe
  [AV-088](AV088_CANDIDATE_MENSUAL_TRIMESTRAL.md).
- Esta es una correspondencia entre dos exportaciones UCDP, no una fuente
  independiente ni una aclaración de la regla textual. `SOURCE_QUALITY_BLOCKED`
  continúa; faltan reloj externo, roster y objetivo mensual preespecificado.
  No hay scoring ni emisión y 2027 sigue `SHADOW_NO_EMITIDO`. Consultar la PR
  y el registro privado para el cierre de código y el evento canónico.

---

## AV-087 · Observación de Candidate vigente: calidad temporal pendiente

- **[PR #761](https://github.com/mamg97/segundo-cerebro/pull/761)** fusionada
  (`de804901136903987af54325cfb117ff649f100f`), cuatro checks SUCCESS; fuente
  oficial `39617592333`. AV-087 VERIFICADO en registro privado, un experimento
  agregado releído. Se verifica la observación, no se admite el replay científico.

- Candidate 26.0.9 (septiembre 2026) y codebook 1.5 oficiales, con hashes
  observados el 21/10/2026. 2.014 registros y 44 países con registros; no es un
  roster completo. Precisión 1–5: 1.725/262/6/15/6; cero códigos 0.
- Un intervalo abarca todo septiembre sin extremos dentro del mes. Se conserva
  en el denominador y el auditor devuelve SOURCE_QUALITY_BLOCKED. Requiere
  aclarar el contrato de exportación; no demuestra fecha futura ni error del proveedor.
- [Informe AV-087](AV087_CANDIDATE_ACTUAL_CALIDAD_TEMPORAL.md), lector reutilizado,
  cuatro tests nuevos y workflow sin cron. 417 pruebas locales. Consultar el
  [handoff](CODEX_CHATGPT_HANDOFF.md) para cierre remoto y estado del registro.
- Ningún modelo entrenado, puntuación o emisión nueva; no equivale a CY anual.

---

## AV-086 · Corrección geográfica de AV-085 y diagnóstico mensual

- **[PR #760](https://github.com/mamg97/segundo-cerebro/pull/760)** fusionada
  (`31dba31a01e79bd1c27664126df3353ba13ef16c`), cuatro checks SUCCESS; fuente
  oficial `39615996330`. AV-086 VERIFICADO, dos informes agregados canónicos
  releídos; evento AV-085 preservado.

- Estado de implementación y evidencia: [handoff Codex↔ChatGPT](CODEX_CHATGPT_HANDOFF.md).
- **Corrección:** los codebooks CY 23.1/24.1 definen un agregado geográfico
  dentro de fronteras, derivado de GED; no participación de países. Coinciden
  los nombres y 196/196 totales de muertes estatales de cada edición. No son
  fuentes independientes. Se corrige esa afirmación de AV-085, preservando sus
  resultados descriptivos. [Informe AV-086](AV086_CORRECCION_GEOGRAFICA_Y_DIAGNOSTICO_MENSUAL.md).
- Doce meses de registros exactos, tendencia, recencia, recurrencia, intensidad
  y concentración temporal; fechas validadas incluso en filas excluidas,
  precisión 1–5, faltantes/NaN/duplicados rechazados. Cuatro codebooks con
  URL/tamaño/SHA fijados; seis archivos GED/CY oficiales íntegros reproducidos.
- Los cinco modelos originales y duración AV-083 permanecen intactos. Se
  replican sus Brier, añadiendo log loss, calibración y alarmas. Al 10 %,
  duración detecta 8/11 y 5/8 cambios con 34/185 y 35/188 falsas alarmas;
  precisión 19,05 % / 12,50 %. Las bandas pareadas de cinco regiones incluyen
  cero. GED Q4 detecta 0/5 y 0/4 entradas, con 3 y 6 falsas alarmas.
- **No es otro modelo ni validación independiente**: mismos años solapados,
  análisis post hoc, bytes descargados 2026 sin testigo histórico. Ninguna
  mejora prospectiva demostrada. `2027 SHADOW_NO_EMITIDO` se conserva.
- Próximo paso: fuente Candidate mensual con reloj externo, protocolo de señal
  y objetivo mensual propio registrados antes de un período futuro nuevo.

---

## AV-20261021-085 · Puente GED mensual → primeras transiciones anuales: valor limitado de Q4

- **[PR #757](https://github.com/mamg97/segundo-cerebro/pull/757)** fusionada a `main`, squash `37c0cbe5b94be80a7f71f19c1ec4588a38c54ea5`. Herramienta `ged_monthly_cy_bridge.py`: incidentes estatales letales GED de día exacto como predictor descriptivo y primer cambio anual CY ≥25 muertes como desenlace distinto. **AV-086 corrige la interpretación previa:** ambos productos usan geografía GW; CY es un agregado de GED dentro de fronteras, no participación. Cero registros elegibles no acredita cero violencia. Fuentes y scoring separados por edición. CI oficial, motor y privacidad de AV-085 SUCCESS.
- Datos verificados en dos cohortes retrospectivas de **196 países** cada una: origen 2024: GED `23.1` hasta 2022, CY `23.1` para riesgo/corte y `25.1` para desenlace 2023/24; origen 2025: GED `24.1` hasta 2023, CY `24.1` para riesgo/corte y `26.1` para desenlace 2024/25. GED23.1 SHA `9aa082f9e1f62da5ea3245c39b1cee45daab6dc8b3a17fb0f0cdae9ba13ce6f7`, GED24.1 SHA `202e84f3bc91f085b2a886959cbbdeed9d381d758ee897b68520f59ea631c760` (**observados y fijados el 21/10/2026**, NO emitidos históricamente).
- **Países inicialmente BAJOS (<25)**: en corte 2022, entre 147 sin incidente GED estatal letal exacto hubo 3 primeras entradas en 2023–24; entre 12 con ≥1 incidente hubo 2 primeras entradas. En corte 2023, entre 150 sin registro hubo 3 entradas en 2024–25; entre 12 con registro, **1**. Los países con cualquier incidente GED en el **último trimestre octubre–diciembre** fueron apenas **3 y 6**, respectivamente, con **cero primeras entradas** posteriores en estas dos muestras. El antecedente de un incidente anual muestra una asociación descriptiva débil, el de actividad en Q4 ninguna evidencia positiva; tamaños muestrales insuficientes.
- El archivo GED 23.1 incluyó **316.818** filas históricas; GED 24.1 **349.733**. Exclusiones en años del corte por fecha imprecisa `2.565/4.534`; por tipo no estatal `6.926/8.185` y por `best=0` `1.512/1.544`, respectivamente. Los países sin incidente de **fecha exacta** no son países sin violencia. No se han construido nuevos scores/modelos; solo tablas agregadas de asociación, que **no demuestran causalidad, habilidad prospectiva ni rendimiento financiero**.
- Informe [AV-085](AV085_GED_MENSUAL_A_CY_ANUAL.md), `PsicoAvances` `AV-20261021-085` **VERIFICADO**, **6 nuevos registros** `av085-ged-*` en `PsicoExperimentos`. La cohorte 2027 permanece `SHADOW_NO_EMITIDO`, `PsicoPredicciones` solo contiene encabezados; **no se alteraron modelos ni predicciones del Explorador**.
- **Próximo desarrollo prioritario:** reconstruir sucesión de publicaciones **Candidate GED mensuales** con evidencias externas de cuándo se observaron realmente los bytes, códigos temporales y una población de países completa, antes de asociarla a un resultado CY y a periodos **sin solape futuro**. Los datos de GED anual definitivo descargados hoy no prueban el estado informativo de enero 2024/2025; distinguir tiempo de suceso, publicación periodística, registro UCDP, primera publicación del archivo y sello temporal externo.

---

## AV-20261021-084 · Señales preumbral: no anticipación estable con observaciones anuales

- **[PR #755](https://github.com/mamg97/segundo-cerebro/pull/755)** fusionada a `main`, squash `d06a6dbcb81302319fd9d3d96e7c5f6ba788af50`. Séptimo candidato **solo científico** `research/psychohistory/signal_hazard_first_passage.py`: riesgo de **primer cambio** con un indicador observado **antes del corte** —régimen bajo con 10–24 muertes estatales anuales (cercanía al umbral UCDP ≥25), o régimen alto con caída anual de al menos 50% manteniendo ≥25— combinado con duración y suavizado a su hazard original (pseudo-N=50). **Segundo año: señal de intensidad futura desconocida; usar hazard base por duración, no consultar puente no observado**. Los cinco modelos originales y AV-083 intactos, sin cambios productivos.
- ZIP/XLSX oficiales UCDP separados por vintage y SHA pinneados: **23.1 hasta 2022 para entreno** y **25.1 solo para desenlaces 2023/24**; **24.1 hasta 2023** y **26.1 solo para desenlaces 2024/25**. Dos cohortes de 196 países, 11 y 8 primeros cambios. Brier señal **0,089745/0,079861** frente a duración `0,089821/0,078591`. La señal mejora marginalmente en la primera ventana y **empeora en la segunda**. Diferencia señal − duración `−0,000076` [−0,002215; +0,001954] y `+0,001270` [−0,000117; +0,002908]. Bandas descriptivas bootstrap 2.000× **cruzan cero**. **Sin campeón**.
- **Cobertura escasa:** para origen 2024 señal baja cercana a umbral `5 países, 2 primeros cambios`; señal alta de descenso `4 países, 0 cambios`. Para origen 2025 `3, 0 cambios` y `7, 0 cambios` respectivamente. Solo `9/196` y `10/196` señalados en los dos cortes; no interpretar las cifras como sensibilidad, calibración o alerta confiable.
- Código, tests y privacidad aprobados (**3 workflows SUCCESS**). Documento [AV-084](AV084_SENALES_PREVIAS_UMBRAL.md); Sheet canónico `PsicoAvances` registra `AV-20261021-084` VERIFICADO y `PsicoExperimentos` incluye cuatro registros agregados `av084-early-signal-*`. **Resultados negativos preservados para evitar sesgo de publicación.**
- **Límites:** diseño post hoc sobre ventanas históricas ya inspeccionadas que comparten 2024; correlación entre países, registros antiguos descargados posteriormente sin testigo de disponibilidad exacta y pocas transiciones. **No** modelar premios financieros, cotizaciones ni acciones con estos resultados. `PsicoPredicciones` y 2027 `SHADOW_NO_EMITIDO` inalterados; `MAD-04` parcial.
- **Siguiente trabajo prioritario:** inventario de variables temporales **mensuales** (intensidad de incidentes, actores, geografía), anuncios oficiales y agendas de dirigentes con **publicación y disponibilidad as-of verificadas**; probar solo cuando existan nuevos cortes y desenlaces temporalmente independientes. Mantener la ambición de psicohistoria y su conexión geopolítica-financiera, pero sin reclamar capacidad predictiva o rentabilidad no demostrada.

---

## AV-20261021-083 · Nuevo hazard de duración, sin victoria demostrada

- **[PR #753](https://github.com/mamg97/segundo-cerebro/pull/753)** fusionada a main, commit `cbb36c157e15ccb54bdb681d8cf56365143d49cc`: sexto modelo **solo experimental** de tiempo hasta primer cambio en régimen de muertes estatales UCDP ≥25. Tiempo consecutivo en estado anual bajo/alto con buckets fijos `1,2–3,4–7,8+`; suavizado al hazard global de régimen con concentración `20`; pronóstico absorbente de primera entrada/salida en dos años. Código `research/psychohistory/duration_hazard_first_passage.py` y tests sintéticos de masa/filtraciones, CI independiente con descarga SHA-pinned 23.1/25.1 y 24.1/26.1. Engine CI, privacidad, oficiales **SUCCESS**. Documento [AV-083](AV083_HAZARD_DURACION_PRIMER_CAMBIO.md).
- **Datos reales, dos ventanas retrospectivas solapadas**: (i) origen 2024 con entreno exclusivo OrganizedViolenceCY 23.1 hasta 2022 y desenlaces 25.1 2023–24: `N=196`, **11 primeros cambios**, 185 sin cambio, Brier duración **0,089821** vs Markov país 0,093725 y persistencia 0,112245. (ii) origen 2025 con entreno exclusivo 24.1 hasta 2023 y desenlaces 26.1 2024–25: `N=196`, **8 primeros cambios**, 188 sin cambio, Brier duración **0,078591** vs Markov país 0,079299 y persistencia 0,081633. Cinco modelos originales NO alterados.
- **Advertencia causal y de capacidad:** El mejor Brier global del nuevo modelo procede fundamentalmente de su menor error en **países que permanecen estables**. En los países con transición observada, **Markov por país regularizado obtiene menor Brier** en las dos ventanas. Bootstrap de 3.000 remuestreos pareados país/estrato: ΔBrier `duración - Markov país` (negativo = mejor) `−0,003905 [−0,018013;+0,010333]` y `−0,000708 [−0,010518;+0,009774]`; ambos intervalos incluyen cero. El nuevo modelo fue construido **después de inspeccionar AV-080/082**, por lo que no sirve como confirmación independiente, y los períodos comparten 2024.
- Se guardaron **14 registros de experimentos** (`av083-duration-*`) en `PsicoExperimentos`, y `AV-20261021-083` VERIFICADO en `PsicoAvances`. **No se ha modificado el motor productivo, cohortes 2027, PsicoPredicciones, precios de bolsa ni ninguna predicción pública**. 2027 sigue `SHADOW_NO_EMITIDO`. `MAD-04` continúa **PARCIAL**.
- **Siguiente falsación**: preferir validación **estrictamente futura y sellada**, datos as-of con fecha externa, períodos no solapados, diferencia entre detección de evento y estabilidad, incertidumbre agrupada por bloques regionales/temporales, benchmark de persistencia/Markov país. No declarar ganador ni generar señales bursátiles.

---

## AV-20261020-081/082 · Incertidumbre y replicación con otro vintage (sin campeón científico)

- **[PR #750](https://github.com/mamg97/segundo-cerebro/pull/750)** fusionada, squash `aff4468719ef88ec221494e00129d771abacc0a3`, CI privado/científico y reproducciones pinneadas SUCCESS. En AV-080 24.1→26.1, 196 países (162 inicial bajo, 34 alto); ocho primeros cambios (5 en 2024, 3 en 2025), 188 sin cambios. `release_first_passage_uncertainty.py` repitió 3.000 remuestreos **pareados por país** estratificados por régimen inicial. ΔBrier respecto a persistencia: Markov país `−0,002334`, banda condicional `[−0,022757;+0,014653]`, memory2 `−0,000745 [−0,020929;+0,015543]`, Markov global `+0,005891 [−0,012761;+0,021544]`. **Todos cruzan cero**. Poca prevalencia y dependencia regional no modelada; no seleccionar ganador. Doc: [AV-081](AV081_INCERTIDUMBRE_HOLDOUT_EDICIONES.md).
- **[PR #751](https://github.com/mamg97/segundo-cerebro/pull/751)** fusionada, squash `5bc050560633ed1fedcd70fe7303261093d730be`, QA científico, privacidad y ejecuciones oficiales para **las dos ventanas** SUCCESS. Se utilizó únicamente OrganizedViolenceCY **23.1 XLSX hasta 2022 para entrenamiento**, fuente 25.1 ZIP **solo para etiquetas 2023 y 2024**, matriz de transición original de cinco modelos. 196 países (159 inicialmente bajos, 37 altos), primeros cruces 2023=7, 2024=4, sin cruce=185. Resultados Brier de primer cambio: shrinkage `0,093725`, memory2 `0,095549`, persistencia `0,112245`, markov_global `0,109672`, frecuencia `0,406585`. Tres mil pares por país: shrinkage − persistencia `−0,018520 [−0,044460;+0,004610]`; memory2 y Markov global también cruzan cero. Doc [AV-082](AV082_PRIMER_CAMBIO_23_25.md).
- Comparación con AV-080: Markov país regularizado obtiene menor Brier en ambas ventanas, pero **ambas comparten desenlaces 2024** y países interdependientes; los experimentos no son dos holdouts temporalmente independientes. Los archivos históricos fueron descargados en 2026 y carecen de testimonio independiente de existencia exacta antes de 01/01/2024 o 01/01/2025. No hay pronóstico sellado desde aquellos días. Éxito descriptivo NO es prueba prospectiva; ninguna mejora declarada como significativa.
- Resultados canónicos: `PsicoAvances` AV-081/AV-082, `PsicoExperimentos` cinco filas AV-081 y seis AV-082. **Sin cambios al motor de producción, fuentes canónicas, PsicoPredicciones ni 2027 SHADOW_NO_EMITIDO**.
- **Próxima falsación:** sellar antes de futuras observaciones un protocolo y conjunto de predicciones con fecha externa verificable, ventanas temporalmente **no solapadas**, benchmarks simples y evaluación de hazard/primer cambio por duración y régimen inicial. Las señales geopolíticas y de agendas de dirigentes deben evaluarse solo con fuentes disponibles en origen y sin derivar recomendaciones bursátiles antes de superar la validación.

---

## AV-20261020-079/080 · Evidencia de versiones y primer cambio sin filtración de edición posterior

- **[PR #747](https://github.com/mamg97/segundo-cerebro/pull/747)** fusionada, main `63ad39d5c2b14c2316f668cfdbac8771e97f8aba`: fail-closed `research/psychohistory/audit_future_asof_eligibility.mjs`, con cinco fuentes UCDP identificadas por producto y edición, pruebas adversariales y CI SUCCESS. **Corrección necesaria:** la API de UCDP solo documenta 26.1 para OrganizedViolenceCY, PERO [archivo histórico oficial UCDP](https://ucdp.uu.se/downloads/olddw.html) contiene **OrganizedViolenceCY 23.1 (Excel), 24.1 (CSV), 25.1 (CSV)**. No confundir el producto **GED 24.1 (eventos)** con **OrganizedViolenceCY 24.1 (país-año)**. Las ediciones 24.1/25.1 siguen siendo posteriores a los orígenes 2016/2020. 24.1 resulta candidata cronológicamente para origen 2025, pero una URL histórica consultada hoy no verifica byte disponible al 01/01/2025. [Documento AV-079](FUENTES_ASOF_AV079.md).
- **[PR #748](https://github.com/mamg97/segundo-cerebro/pull/748)** fusionada a main `1886f991743a07ccbd131654008120719e05b7ad`: **holdout de primera transición 2024–2025 con fuentes separadas**. La versión **OrganizedViolenceCY 24.1** se pinneó con SHA `00410bdb65023d1bc8799f47f188677965046bb73447ee33094782db30076260`, usando SOLO datos hasta 2023 para ajuste de los cinco modelos, país y parámetros. El archivo **OrganizedViolenceCY 26.1** pinneado SHA `66910888f5653af42776d2debc1d72fe527559e7f7fc82e69b7c8771467f2d34` entra EXCLUSIVAMENTE al hacer scoring de 2024 (puente) y 2025, en tres categorías: primer cruce en 2024, primer cruce en 2025 o ningún cruce. Ambos ZIP descargados efímeramente en Actions, verificados y borrados. Código `research/psychohistory/release_separated_first_passage.py`, pruebas contra filtraciones y archivo de procedimiento [AV-080](PRIMER_CAMBIO_HOLDOUT_EDICIONES_AV080.md). CI scientific/privacy/holdout oficial SUCCESS.
- **Resultado fuente separada observado:** 196 países elegibles, **5** primeros cambios 2024, **3** primeros cambios 2025, **188** sin primer cambio al final; 0 faltantes y 0 revisiones de la categoría de 25 muertes para el dato 2023 entre ambas ediciones dentro de estos 196 (no descarta revisiones de conteos exactos). Brier de distribución categórica de primer cruce `shrinkage 0,079299`, `memory2 0,080887`, `persistencia 0,081633`, `markov_global 0,087524`, `frecuencia 0,400992`. Persistencia adjudicó P=0 a los ocho cruces; log loss expresamente recortado 1e-12. Ventaja shrinkage sobre persistencia `−0,002334` demasiado pequeña con ocho eventos y **un solo corte temporal** para promocionar un modelo ganador.
- **Canonización y límites:** `PsicoAvances` AV-079/080 y `PsicoExperimentos` ocho filas agregadas, sin exponer países. Sigue siendo **HOLDOUT_RETROSPECTIVO_SEPARADO_POR_EDICIÓN**, NO emisión histórica real: no hay evidencia independiente de publicación de bytes 24.1 al 01/01/2025 ni congelación del modelo entonces, y la evaluación usa fuente 26.1 retrospectiva. No tocar `PsicoPredicciones`, inversiones, Worker de producción, modelos 2016/2020 ni cohortes 2027. `2027 SHADOW_NO_EMITIDO`; MAD-04 continúa PARCIAL.
- **Siguiente falsación:** registrar antes de conocer nuevos desenlaces un protocolo con fuente y reloj independientes; o intentar una versión vieja 23.1→25.1 con adaptador XLSX predefinido, sin recalibrar respecto a 2024/25. Un caso único de dos años con ocho eventos no acredita skill prospectiva.

---

## AV-20261020-077 y AV-20261020-078 · Tiempo hasta la primera transición (censura e incertidumbre)

- **[PR #744](https://github.com/mamg97/segundo-cerebro/pull/744)** fusionada a `main` (squash `6e363087a3756d9cc4a6c0fff52b2d8678d0ad80`). Primer paso de investigación sobre `tiempo hasta primer cambio` de umbral UCDP país-año: primera entrada/salida, cada año posible y supervivencia sin cambio hasta horizonte. Masa probabilística absorbida al primer cruce (no cuenta dos veces); incluye puente sin observar **solo como etiqueta retrospectiva**. Código canónico reutiliza matrices inmutables `private-cloudflare/src/research-futures-engine.mjs`: `research/psychohistory/audit_future_first_passage.mjs`, tests sintéticos y workflow CI **SUCCESS**. [AV-077](PRIMER_CAMBIO_ESTADO_AV077.md).
- Cohorte origen **2016** (corte 2014): 195 países, 11 pasos 2015–2025, 34 países con primera transición, 161 censurados, 7 cambios registrados en el puente; 165 países empiezan bajos y 30 altos. Cohorte origen **2020** (corte 2018): 196 países, 7 pasos 2019–2025, 23 primeros cambios, 173 censurados, 4 transiciones en puente; 163 bajos, 33 altos.
- Brier de **tiempo hasta primer cambio**, 2016/2020: persistencia `0,348718/0,234694`, country-shrinkage `0,311503/0,234409`, memory2 `0,332336/0,234234`, Markov global `0,365609/0,262633`, frecuencia `0,927533/0,766566`. Persistencia determinista asigna P=0 a los **34/23 cambios observados**; log loss recortado en `1e-12` exclusivamente por estabilidad numérica, no se llama calibración.
- **[PR #745](https://github.com/mamg97/segundo-cerebro/pull/745)** fusionada `45d7adb51cc5049a7c0a2ccaa284619265ce4787`. Nuevo bootstrap pareado por país estratificado en régimen inicial (2.000 réplicas, seed `54117 + origin`). Todos los intervalos de ΔBrier frente a persistencia de **markov, shrinkage y memory2 cruzan cero** en ambas cohortes. La frecuencia constante tiene diferencia positiva pero el diseño es post hoc. [AV-078](INCERTIDUMBRE_PRIMER_CAMBIO_AV078.md).
- **Resultado para Túnez:** primer cruce desde régimen alto en 2017 (tercer paso desde último dato 2014), con probabilidad de ese *primer cruce exactamente entonces* `12,2347 %` según Markov global; probabilidad acumulada hasta 2017 `45,5734 %`. Diferenciar de probabilidad del estado 10 en 2017 (`12,3431 %`) y de cualquier afirmación causal.
- En el Sheet canónico, `PsicoExperimentos` contiene 12 filas `av077-first-passage-*` y 10 `av078-first-passage-bootstrap-*`; `PsicoAvances` registra `AV-20261020-077/078`. **Nunca seleccionar un campeón por estos resultados**: fuentes UCDP 26.1 retrospectivas revisadas sin acreditación as-of, casos país vinculados a regiones y muestras temporales solapadas. El bootstrap estratificado no reproduce toda la dependencia histórica. `PsicoPredicciones` no se ha escrito y 2027 sigue `SHADOW_NO_EMITIDO`.
- **Siguiente falsación principal:** obtener vintages disponibles en cada corte verificables (as-of), pre-registrar cohortes con calendario no solapado y predicciones selladas, contrastar evento primer cambio y calibración hazard por estado/duración/actores sin reentrenar sobre los dos catálogos aquí inspeccionados. No hay señales bursátiles.

---

## AV-20261020-076 · Por qué falla el árbol de Túnez en 2017–2018

- **[PR #742](https://github.com/mamg97/segundo-cerebro/pull/742)** fusionada (merge squash `504d10e33517c43eaade3f6f884bd29c98298fc6`) y **despliegue de producción Cloudflare SUCCESS**. Nuevo módulo `app/research-futures-diagnostics.mjs` para inspeccionar, a posteriori, años de divergencia entre estado modal y observado, con porcentajes y Brier de los modelos, en un desplegable que solo se muestra con «Mostrar realidad». Motor de predicción original intacto. Assets v0.5.29. [Informe completo AV-076](TUNEZ_DIAGNOSTICO_CAMINO_AV076.md).
- **Túnez, catálogo origen 2016, información máxima 2014** (fuente retrospectiva revisada UCDP 26.1): los estados reales observados del catálogo son 2016=11, **2017=10**, **2018=00**, 2019–2025=00. Markov global había adjudicado al estado real 2017 solo **12,3431 %** y a 2018 **42,6204 %**; 2017–18 difieren del estado modal previsto. **2025 sí coincide** con el nodo modal 00 (**75,0944 %**); la pregunta anual ≥25 muertes se evaluaba como riesgo **20,7928 %**, no como afirmación de que ocurriría.
- **Auditoría de generalización**, sin cambiar pesos ni fuentes: catálogos 2016 (195 países, 1.950 observaciones país-año dependientes) y 2020 (196, 1.176 dependientes), cinco modelos preexistentes. Brier multicategoría medio **Markov 0,226989/0,170239** vs **persistencia 0,168205/0,120748**. Ninguno de los 34/18 casos de estado real 10 «Salida» fue modal para Markov, pero todos recibieron probabilidad distinta de cero; esto NO demuestra mala calibración. Script reproducible `research/psychohistory/audit_future_regime_changes.mjs` con pruebas sintéticas, resultados resumidos en 12 nuevas filas de `PsicoExperimentos` y `PsicoAvances.AV-20261020-076=VERIFICADO`.
- **Límites científicos:** todos los experimentos son post hoc, las fuentes antiguas no están acreditadas as-of, las cohortes comparten países y años, los 10 años de Túnez no son 10 experimentos independientes; los 3.126 país-año tampoco equivalen a 3.126 observaciones independientes. La distinción entre modalidad y probabilidades calibradas es esencial. Los factores históricos (insurgencia fronteriza, Libia y contrainsurgencia) son contexto **sin atribución causal verificada**; terrorismo y estado UCDP no son la misma categoría.
- **Siguiente pregunta falsable:** ¿se anticipan salidas y entradas mejor con modelos que consideren duración del episodio, señales recientes, estructura de actores, región y cambios temporales sin violar as-of? Diseñar en nuevas fechas y comparar contra persistencia, shrinkage y memory2 antes de ajustar. **MAD-04 sigue parcial. PsicoPredicciones sigue vacía y 2027 SHADOW_NO_EMITIDO**. No generar trading ni señal bursátil.

---

## AV-20261020-071 · Un árbol anual completo por predicción retrospectiva

- [PR #730](https://github.com/mamg97/segundo-cerebro/pull/730) fusionada en `main` (squash `d751308e3c6cb29efc46647ea48ec65c3647834c`), **sin modificar el motor probabilístico, datasets ni cohorte prospectiva de 2027**. La vista privada `?view=futures` presenta un índice de **árboles existentes** por catálogo/origen retrospectivo (solo orígenes canónicos, sin inventar años ni emisiones) y un árbol completo con corte → puente no observado → todos los años proyectados.
- Seleccionar un año sirve para inspeccionar su probabilidad, scoring histórico y caminos retenidos, **sin recortar el árbol**. La trayectoria histórica real continúa como capa independiente, opcional, obtenida a posteriori de UCDP revisada. Estilos aislados `app/research-futures-trees.css` con desplazamiento horizontal en móvil. [Especificación y controles AV-071](ARBOLES_POR_PREDICCION_AV071.md).
- **Pruebas PR en verde**: UI laboratorio `39461063135`, Worker privado `39461062831`, privacidad `39461062827`, gates Access/2027 `39461062810`/`39461062875`. Despliegue de producción Cloudflare Worker `39461194768` **SUCCESS**, UI main `39461194921`, guard privacidad `39461194931` y demo Pages `39461194788` SUCCESS. La inspección visual autenticada en Chrome tras refrescar no se ha realizado; no se afirma comprobación visual directa.
- El estudio audiovisual añadido en paralelo por [PR #729](https://github.com/mamg97/segundo-cerebro/pull/729) se **conservó expresamente** al integrar los árboles. Para evitar colisión, los avances canónicos `AV-069` (vídeos) y `AV-070` (verificación audiovisual) se respetan, y esta mejora de árboles se identifica finalmente como **AV-071**.
- **Sin nueva evidencia científica:** `PsicoPredicciones` sigue vacía, 2027 `SHADOW_NO_EMITIDO`. No se alteraron modelos ni métricas de AV-064/066/068. El cambio es una representación más comprensible y completa de cálculos retrospectivos ya existentes.

---

## AV-20261020-068 · Incertidumbre país: aún no existe ventaja robusta frente a Markov

- **[PR #727](https://github.com/mamg97/segundo-cerebro/pull/727) fusionada** (squash `1a5fee246ceb2ab1939ded9fbf793fa9b649fab9`). Incorpora `paired_country_uncertainty.py` (bootstrap pareado de pérdidas Brier por país, 1.000 remuestreos, semilla fija) en las dos evaluaciones ya existentes de 2024 y 2025. No cambia modelos/hyperparámetros, tareas del Laboratorio ni 2027. Informe empírico completo: [AV-068](PAIRED_COUNTRY_UNCERTAINTY_AV068.md). CI empírica [2024 #39457269332](https://github.com/mamg97/segundo-cerebro/actions/runs/39457269332) y [2025 #39457269585](https://github.com/mamg97/segundo-cerebro/actions/runs/39457269585), más repetición CI en PR y guard privacidad **SUCCESS**.
- **Nueva conclusión obligatoria:** V2 logistic tiene menor Brier **puntual** frente a Markov y persistencia en ambos años, pero los IC país **cruzan cero**. Diferencia V2−Markov 2024 **−0,01399365**, IC descriptivo `[-0,03132139; +0,00108897]`; 2025 **−0,00234692**, IC `[-0,01097375; +0,00686542]`. Frente persistencia también cruzan cero en 2024 y 2025. Solo frente al baseline débil de frecuencia los intervalos son completamente negativos. **Ninguna superioridad robusta o habilidad prospectiva puede afirmarse**.
- **El bootstrap no es confirmatorio**: elegido tras mirar los resultados, asume países remuestreables pero no corrige dependencias geopolíticas espaciales, hay solo un bloque temporal por año y la procedencia de bytes históricos UCDP no está autenticada al origen. No sumar 2024 y 2025 como dos repeticiones temporales independientes. El target sigue siendo **presencia de violencia estatal ≥25**, no onset.
- **Canónico privado:** `PsicoAvances.AV-20261020-068=VERIFICADO` para implementación/medición descriptiva; ocho registros `av068-countrybootstrap-*` en `PsicoExperimentos` con valores e intervalos íntegros y caveats. `MAD-04=PARCIAL` y `PsicoPredicciones` continúa vacío. 2027 sigue SHADOW_NO_EMITIDO; F1B bolsa aparcado y no se modificó MIDAS. Avance UI paralelo AV-067 permanece separado.
- **Siguiente prioridad real:** conseguir archivos observados auténticamente antes de su fecha de origen y nuevos bloques temporales autónomos; valorar el skill V2 frente a persistencia y Markov bajo condiciones no ajustadas a 2024/2025. Preparar sello temporal externo de cohorte 2027, sin afirmar emisión hasta recibo independiente validado.

---

## AV-20261020-066 · Dos cortes temporales reales 2024/2025 (exploratorios)

- **PR [#723](https://github.com/mamg97/segundo-cerebro/pull/723)** (exploración 23.1) y [#724](https://github.com/mamg97/segundo-cerebro/pull/724) (segundo holdout, squash `705b28b6ea9d2b6c9af5b9c774660cb9207de1d6`) fusionadas en `main`; SIN tocar frontend/Cloudflare y manteniendo trabajo visual paralelo. [Documento científico AV-066](HISTORIC23_2024_HOLDOUT_AV066.md).
- **Primera evidencia 2024 registrada:** UCDP CY23.1 XLSX hasta 2022 (SHA256 `6c7dc09c...` observado **ahora**), outcome CY25.1 ZIP sobre 2024 (SHA256 `564ce9a3...` observado **sin score** en PR), mismo algoritmo e hiperparámetros originales V2. 196 países emparejados, 35 positivos, 0 missing outcome, 5.360 train rows. Brier **frequency 0,14746105; persistence 0,05102041; markov 0,04589744; V1 0,04696158; V2 logistic 0,03190378; interaction 0,03504036**. CI empírico [#39456067226](https://github.com/mamg97/segundo-cerebro/actions/runs/39456067226) y CI final PR: holdout `39456365643`, privacidad `39456365092`, motores `39456364179` **SUCCESS**. En main motores `39456490081`, privacidad `39456490230` y Pages `39456490066` SUCCESS.
- **Referencia año 2025 AV-064:** CY24.1 entrenado hasta 2023, resultados CY26.1, 196 países, 34 positivos, V2 logistic Brier **0,03674327** vs persistence **0,04081633** y markov **0,03909019**. Dos años con mejora frente a las referencias fuertes, pero **la prueba 2024 se eligió tras inspeccionar el resultado de 2025**. NO equivale a preregistro confirmatorio independiente, NO prueba robustez entre épocas, ni predice onset ni inversiones.
- **Fuente canónica privada:** `PsicoExperimentos` incluye seis nuevas filas `av066-frozen2024-*` con flags `sourceAsOfVerified=false`, `forecastIssued=false`, `tradingAuthorized=false`; `PsicoAvances.AV-20261020-066=VERIFICADO` por test de datos reales. `PsicoFases.MAD-04=PARCIAL`; `PsicoPredicciones` vacía. NO se han modificado modelos 2027 ni precios ni carteras.
- **Prioridad científica:** cuantificar incertidumbre emparejada frente a Markov y persistencia sin seleccionar parámetros en el test; autenticar históricamente bytes de releases, mejorar cobertura de orígenes independientes (sin imputaciones), sellar prospectivamente cohorte 2027 y medir onset como objetivo separado. AV-066 solo acredita **dos tests retrospectives con separación de versiones**, no un sistema general de previsión.

---

## AV-20261020-064 · Contraste real de modelos con versiones UCDP separadas

- **[PR #720](https://github.com/mamg97/segundo-cerebro/pull/720) fusionada** a `main` (squash `7e7ab2c2f91739b30eae658a45961e465577cb42`). Se han ejecutado seis modelos ya fijados de `benchmark.py` contra outcomes **no disponibles en el dataset de entrenamiento**: UCDP CY **24.1** hasta 2023 (features y labels de train) y CY **26.1** para outcomes anuales **2025**. El nuevo programa `release_separated_holdout.py` exige SHA256 exacto de dos ZIP, acepta únicamente alias oficiales no ambiguos `_cy` y no rellena features faltantes. Protocolo y [resultados completos agregados AV-064](RELEASE_SEPARATED_HOLDOUT_AV064.md).
- **Primer resultado observado con datos reales**, [CI #39453143638](https://github.com/mamg97/segundo-cerebro/actions/runs/39453143638) y repetición [#39453541468](https://github.com/mamg97/segundo-cerebro/actions/runs/39453541468) SUCCESS: 196 países, 34 positivos, 0 outcomes sin resolver, 5.556 train históricos; Brier `frequency=0.14385283`, `persistence=0.04081633`, `markov=0.03909019`, `v2_logistic=0.03674327`, `interaction_table=0.03632530`, `v1_memory_index=0.04750615`. V2 mejora ~9,98 % sobre persistencia y ~6,00 % sobre Markov EN ESTA COHORTE; interacción marginalmente supera V2 en Brier. Ningún modelo elegido ganador después de ver el test.
- **Precaución científica central:** un solo año de evaluación; prueba **retrospectiva release-separated**, no emisión pasada ni validación prospectiva. Los ZIP se descargaron y cotejaron **ahora (2026)**, sin testigo independiente de que 24.1 fuera exactamente esos bytes en 2024. El target es **presencia** ≥25 muertes estatales en el país durante 2025, NO nuevos conflictos. Ventaja frente a frecuencia parcialmente debida a persistencia. No se ha ganado dinero ni construido señal financiera.
- **Trazabilidad y verificaciones:** [PR #720](https://github.com/mamg97/segundo-cerebro/pull/720) tres CI SUCCESS (holdout `39453541468`, motores `39453541353`, privacidad `39453541355`); main `39453709733` motores, `39453710036` privacidad, `39453709972` demo Pages SUCCESS. La CI no toca Worker de producción, ya que no hay cambios en UI ni servicios. En la hoja privada canónica: `PsicoAvances.AV-20261020-064=VERIFICADO` para comparación real **no confirmatoria**; seis filas de `PsicoExperimentos` con su origen, métricas, flags falsos y enlaces a CI. `PsicoPredicciones` sigue VACÍO. Cohorte 2027 no alterada.
- **Prioridad siguiente:** una prueba de otro año **2024** con edición fuente UCDP 23.1 (archivo XLSX) y una edición posterior del resultado. Fijar plan antes de inspeccionar los scores y reconocer que decisiones tomadas tras 2025 son exploratorias. Mantener proceso V1–V4, vintages históricas, timestamp externo de emisión 2027; F1B bolsa continúa aparcado.

---

## AV-20261020-063 · Primeros eventos institucionales reales en radar privado (sin forecasting)

- **[PR #716](https://github.com/mamg97/segundo-cerebro/pull/716) fusionada** en `main` (squash `bf29e0e524334285da17ca76f0171c1bf22d2b9a`); **[Cloudflare Worker producción #39449052376](https://github.com/mamg97/segundo-cerebro/actions/runs/39449052376) SUCCESS**, con el paso `Deploy production Worker` SUCCESS. Postmerge: UI #39449052225, privacidad #39449052217, Pages #39449052134 SUCCESS. Cinco CI PR SUCCESS, incluidos Worker completo, UI, Access y guard privacidad.
- **Dos fuentes oficiales reales identificadas**, en el Sheets privado canónico `SEGUNDO CEREBRO - PROYECTOS`: `PsicoAgendaEventos` + `PsicoAgendaFuentes` contienen reuniones monetarias futuras de Fed/FOMC y BCE, fechas y enlaces oficiales. Se registraron únicamente como `PROGRAMADA_FUENTE_OFICIAL` + `NO_EMITIDA`, estado `REFERENCIA_OFICIAL_SIN_CAPTURA_DE_BYTES`; **campos `published_at`, `first_seen_utc`, `capture_sha256` vacíos**, porque NO existe snapshot original ni testigo externo de tiempo.
- **Nueva capacidad real:** adaptador `private-cloudflare/src/psycho-agenda.js` lee fuentes privadas opcionales (sin impactar V1–V4 ni 2027), permite sólo calendarios en dominios oficiales preadmitidos, valida fechas, evita links manipulados, duplicados y estados falsos; informa `forecastCount=0`. `Ideas y sinergias` muestra «Reuniones en seguimiento» con URLs oficiales y advertencia de falta de captura, predicción y resultado. Documento [AV-063](AGENDA_COHORTE_OBSERVACIONAL_AV063.md).
- **Canónico revalidado:** `AV-20261020-063=VERIFICADO` solamente para ingeniería/datos descubiertos; `AG-01=PARCIAL`, `AG-02=NO_INICIADA`, `AG-03=NO_INICIADA`, `MF-01=PARCIAL`, `RP-01=NO_INICIADA`; **`PsicoPredicciones` vacío** y 2027 continúa `SHADOW_NO_EMITIDO`. No se han usado cotizaciones, operaciones, fuentes restringidas o pagos.
- **Siguiente puerta A1:** captura original privada con SHA256 y testigo temporal independiente; definición exacta de tasa monetaria y variable resultado; expectativas disponibles ANTES del anuncio, baseline y corte fijo. **Prioridad troncal sin cambio:** reconstrucción UCDP `as-of`, precompromiso/sello independiente 2027 y validación fuera de muestra de fenómenos colectivos. No se ha probado skill con agendas ni con mercados financieros.

---

## AV-20261020-062 · Laboratorio de ideas y aplicaciones, desplegado

- **[PR #713](https://github.com/mamg97/segundo-cerebro/pull/713) fusionada** en `main` (squash `3f9f5f43ddc13d4ab46896c80f3be19c65779e6a`). Código, prototipo y metodología documentados en [AGENDA_INSTITUCIONAL_SINERGIAS_AV062.md](AGENDA_INSTITUCIONAL_SINERGIAS_AV062.md). El catálogo canónico privado `SEGUNDO CEREBRO - PROYECTOS` registra tres subproyectos derivados A1 Agenda institucional, A2 Transmisión macrofinanciera y A3 Radar País, más documentación y relaciones con V1–V4 y MIDAS como posible consumidor **solo lectura futuro**.
- **Interfaz nueva desplegada:** pestaña `Ideas y sinergias` en Laboratorio Virtual privado, `?view=ideas`, carga únicamente datos y relaciones del API existente `/api/projects` bajo Access; cards responsive, enlaces con lista restringida y escape HTML. Sin valores de países, carteras ni probabilidades empotrados en Git. Si faltan registros, estado vacío honesto. La pantalla `Inicio` enlaza a esta vista; diagramas y vistas anteriores se conservan.
- **Primer desarrollo A1:** `research/psychohistory/agenda_asof.py` valida estructuralmente timestamps UTC, evento posterior al corte, capturas SHA256 y observaciones de fuentes públicas antes de emisión. No acredita por sí mismo autenticidad de captura, presencia de participantes ni recibos externos. Pruebas adversariales **sintéticas**, cero scraping real, entrenamiento o emisiones.
- **Pruebas PR todas SUCCESS:** UX `39446533836`, motores `39446533853`, seguridad Worker `39446533761`, privada 2027 `39446533786`, JWT `39446533787`, repositorio público `39446534141`. **Postmerge:** UI `39446692871`, motores `39446692887`, privacidad `39446692769`, demo Pages `39446692903`, **[Cloudflare production deploy `39446692802`](https://github.com/mamg97/segundo-cerebro/actions/runs/39446692802) SUCCESS con paso `Deploy production Worker` SUCCESS**. No inspección manual de navegador autenticado.
- **Verificación canónica privada:** `PsicoAvances.AV-20261020-062=VERIFICADO` para software/metodología; `PsicoFases.AG-01=PARCIAL`, `AG-02=NO_INICIADA`, `MF-01=PARCIAL`, `RP-01=NO_INICIADA`. La cohorte 2027 y `PsicoPredicciones` permanecen intactas (**cero emisiones**); F1B bursátil sigue aplazada por la [puerta científica](PUERTA_EVIDENCIA_CIENTIFICA_V1.md). No señales, trading, ingresos ni validación prospectiva.
- **Continuación prioritaria:** núcleo V1–V4: fuente UCDP **as-of** y ancla temporal independiente para emisión 2027; A1: seleccionar UN outcome institucional, auditar capturas históricas y participantes efectivamente publicados, fijar baseline + prueba de ablation temporal, y solo después estudiar A2. Mantener coste incremental 0 € y privacidad.

---

## AV-20261020-061 · Laboratorio ejecutivo intuitivo en Segundo Cerebro, desplegado

- **[PR #710](https://github.com/mamg97/segundo-cerebro/pull/710) fusionada**, squash `485d0670c91f14e6f07edfc0bab38ffe02b11580`. La página privada `app/research-lab.html` inicia ahora en **«Inicio»** y no en el explorador técnico. [Documento AV-061](LABORATORIO_EJECUTIVO_AV061.md). Gráficos, órbitas y simulaciones anteriores conservados en pestañas secundarias.
- **Resumen de primera pantalla** `PSICOHISTORIA / EN 10 SEGUNDOS`: tarjetas de consulta 2027 sólo si hay cohorte privada verificada (`SHADOW_NO_EMITIDO`), número real de emisiones registradas, evaluación prospectiva sin inventar resultados; 4 pasos **Datos → Modelos → Emitir → Evaluar**; tres comentarios estratégicos para sellado externo, as-of histórico y separación entre presencia e inicio de conflictos. Botones a `Riesgos 2027`, `Evidencia` y `Mapa del proyecto`, metodología extendida en `details`. CSS móvil con pasos 2×2, tarjetas 1 columna y pestañas desplazables. Cabecera y métricas principales compactadas.
- **Calendario con caveats**: 2027 **ya explorable**, pero es la probabilidad experimental de **≥25 muertes de violencia estatal en TODO 2027**, no aparición de guerra nueva. **Emisión prospectiva antes del 01/01/2027** es objetivo condicionado a fuente as-of, roster, baseline fijo y sello independiente, no garantía. **Primera evaluación anual quizá en 2028**, solo cuando exista release UCDP completo; **alertas mensuales de nuevas guerras 30–90 días no tienen fecha ni skill probado**. Sin datos privados incrustados en GitHub ni nuevas emisiones.
- **Pruebas y despliegue confirmados**: GitHub Actions PR #710 UI `39436912035`, CI Worker `39436912074`, privacidad `39436912094`, Access gate `39436912369`, investigación privada `39436912088` **SUCCESS**. Suite Worker de **797 tests**, con único contrato de pantalla inicial actualizado tras cambiar inicio de Futuros a resumen (motor matemático sin cambios). Postmerge main [UX `39437153783`](https://github.com/mamg97/segundo-cerebro/actions/runs/39437153783), privacidad `39437154081`, Pages `39437154112`, [Cloudflare Deploy `39437153784`](https://github.com/mamg97/segundo-cerebro/actions/runs/39437153784) **SUCCESS**, incluidos **Run tests**, **Build private bundle**, **Apply D1 migrations**, **Deploy production Worker**. Sesión personal de navegador y screenshot móvil no inspeccionados.
- **Registro canónico privado releído**: `PsicoAvances=61`, `AV-20261020-061=VERIFICADO` como entrega de diseño/CI/despliegue; `MAD-02=PARCIAL`; `PsicoPredicciones=0`. Cohorte privada 2027 **196 países × 6 modelos = 1.176 estimaciones sombra** intacta, sin gasto incremental.
- **Límites intactos**: ruta inline `/api/research-shadow2027` continúa **fail-closed** porque falta audiencia y emisor reales de Cloudflare Access (AV-059/060). La pestaña Riesgos 2027 conserva el enlace a Google Sheets privado; no se ha debilitado ninguna política. PSICOHISTORIA permanecerá dentro de Segundo Cerebro, por decisión del propietario.
- **Próxima prioridad de investigación**: certificar fuente as-of y recibo externo RFC3161 antes de cualquier emisión 2027, mantener `PsicoPredicciones` sin entradas no acreditadas. Modelo separado para onset a 30–90 días con vintages/benchmark VIEWS. **Próxima UX**: inspección en sesión autenticada escritorio/móvil, accesibilidad y ajustes de legibilidad según feedback real.

---

## AV-20261020-060 · Cloudflare Access: reto anónimo de login y correlación de audiencia

- [PR #708](https://github.com/mamg97/segundo-cerebro/pull/708) **fusionada** (squash `1fda497894ab6d75f75cd6eec77965c07de65609`), con pruebas adversariales, comprobación real de las tres rutas privadas desde GitHub Actions y [documentación](ACCESS_LOGIN_CHALLENGE_AV060.md). [CI de producción](https://github.com/mamg97/segundo-cerebro/actions/runs/39432333571), privacidad `39432333469`, Pages `39432336389` y despliegue Cloudflare `39432333699` **SUCCESS**.
- **Hallazgo observado, sin exponer datos privados:** `ALLROUTESREDIRECTTOACCESS=true`; `AUDIENCEHINTSTATUS=NOT_PRESENT`; `TEAMHOSTHINTSTATUS=CONSISTENT`; `APPCORRELATION=NOT_EVALUABLE`; `PRODUCTIONJWTACCEPTANCETEST=NOT_PERFORMED`; `SHADOW2027UNLOCKED=false`. Los tres `Location` HTTPS llegan al flujo de Access y muestran un mismo dominio de equipo, pero **ninguno lleva un segmento AUD de 64 hex** que permita cruzar sin ambigüedades con la lista oficial de aplicaciones.
- **Controles de seguridad:** sin cookies, credenciales, lectura de respuestas privadas, ni impresión de `Location`, AUD, host de equipo, IDs de apps, JWT, nombres de países o probabilidades. La API de la organización Zero Trust continúa sin permiso read-only para el token vigente (AV-059). **No se ha configurado la ruta inline ni se ha relajado la verificación RSA/JWKS.** El enlace a la hoja privada sigue disponible en la pestaña 2027 experimental de Segundo Cerebro.
- **Canónico privado reabierto:** `PsicoAvances=60`, `AV-20261020-060=VERIFICADO` para ejecución de diagnóstico/CI; `PsicoFases.MAD-02=PARCIAL`; `PsicoPredicciones=0`. 196 países × seis modelos 2027 siguen `SHADOW_NO_EMITIDO`, intactos; 0 € de nueva infraestructura.
- **AV-061 operativo:** acceso autorizado a metadatos de la aplicación concreta Access, obtener su audiencia exacta y el `auth_domain` real **sin publicarlos**, configurar Worker por canal privado y validar sesión válida frente a anónimo; nunca inferir JWT positivo de un 302. **AV-061 científico paralelo:** emisión 2027 requiere sello temporal externo, roster, reglas as-of y bloqueo de revision hindsight, y sigue sin estar aprobada.

---

## AV-20261020-059 · Cloudflare Access: permisos reales y destinos Worker (lectura segura)

- **Entrega fusionada y verificada:** PR inicial [#704](https://github.com/mamg97/segundo-cerebro/pull/704) añadió `private-cloudflare/scripts/audit-psychohistory-access-metadata.mjs` y tests read-only; la corrección [PR #707](https://github.com/mamg97/segundo-cerebro/pull/707) se reconstruyó sobre main y fusionó squash `cab6d04f5ffa1856df7f787b6ea3e674bab92355`. Se cerró PR #705 en conflicto **sin fusionarla**. [Documento de diagnóstico](ACCESS_READONLY_METADATA_AV059.md).
- **Datos reales de [GitHub Actions read-only main #39429742917](https://github.com/mamg97/segundo-cerebro/actions/runs/39429742917)**: `APPSAPI=OK`; `ORGANIZATIONAPI=READ_SCOPE_DENIED`; `TARGETAPP=NONE`; `ACCESSSCOPEHINT=NO_WORKER_SCOPE_OBSERVED`; `AUDIENCE=UNVERIFIED`; `TEAMDOMAIN=UNVERIFIED`; `SAFETOENABLEPRIVATE2027=false`. **Esto no prueba ausencia de Access**: el AV-058 demostró denegación anónima con HTTP 302 a Cloudflare Access en las tres rutas. No se ha autenticado una sesión legítima ni obtenido el AUD.
- **Causa raíz del bloqueo para activar tabla inline:** el token ya configurado permite enumerar Access apps, pero **no** consultar la organización Zero Trust; tampoco se localizó en el catálogo accesible un destino hostname exacto ni una app `worker/all_workers` inequívocamente asociable al Worker. El código reconoce los `destinations` modernos, con precedencia sobre `self_hosted_domains`, separa `worker` y `all_workers` sin inventar `worker_id`, y rechaza resultados parciales de paginación. La ejecución de diagnóstico completa correctamente aunque la lectura necesaria esté denegada; **eso NO habilita ninguna API ni sustituye una comprobación de sesión autorizada**.
- **CI y privacidad:** tests ficticios PR #707 `39429549222`, validación Worker `39429549194`, guard público `39429549164` en verde. Postmerge main [Cloudflare Worker `39429742942`](https://github.com/mamg97/segundo-cerebro/actions/runs/39429742942), privacidad `39429742848`, Pages `39429742790` y read-only `39429742917` **SUCCESS**. No se expusieron IDs de aplicación, AUD, host de organización, JWT, token ni probabilidades y no se cambiaron políticas, variables o credenciales.
- **Registro canónico privado releído**: `PsicoAvances=59`, último `AV-20261020-059=VERIFICADO` para implementación/investigación de permisos; `PsicoFases.MAD-02=PARCIAL`; `PsicoPredicciones=0`. El ranking 2027 (196 países × seis modelos) sigue exclusivamente dentro de Segundo Cerebro y en Drive privado como `SHADOW_NO_EMITIDO`, sin nuevos pronósticos ni costes.
- **AV-060 recomendado:** determinar el identificador real de la aplicación Access que cubre el Worker por un canal autorizado de permisos mínimos (Access Apps **y Organizations Read**); cruzar `worker_id` y destinos/overrides si procede. Configurar `PSICO_ACCESS_TEAM_DOMAIN`/`PSICO_ACCESS_APP_AUD` únicamente con valores auténticos por secretos del Worker y validar `200` con sesión legítima y rechazo anónimo. **Hasta entonces el visor inline permanece cerrado**, manteniendo el enlace al ranking privado. El sello prospectivo externo de 2027 continúa como línea científica prioritaria.

---

## AV-20261020-058 · Comprobación externa de Cloudflare Access para las rutas privadas

- [PR #702](https://github.com/mamg97/segundo-cerebro/pull/702) **fusionada** (squash `f0740afedc345d90a335bfbe673fc3fbc89270df`). Auditor sin tokens ni credenciales que consulta tres rutas en producción y **nunca lee ni registra** cuerpos de respuesta, URLs de Sheets, países o probabilidades.
- [Primera prueba real, GitHub Actions run #39423024862](https://github.com/mamg97/segundo-cerebro/actions/runs/39423024862): `/api/research-lab` **302 BLOCKED**, `/api/research-shadow2027` **302 BLOCKED**, `/app/research-lab.html?view=shadow2027` **302 BLOCKED** por redirección validada al flujo de Cloudflare Access. Todas sin cookie/JWT. Un HTTP 200 o error no clasificable haría fallar el trabajo; un fallo de conexión no cuenta como control de privacidad superado.
- **Vigilancia recurrente real**: prueba añadida al auditor horario existente `.github/workflows/web-audit.yml`, **antes de obtener OIDC**. El paso `Verify PSICOHISTORIA anonymous access denied in production` en el primer [run de producción #39423562922](https://github.com/mamg97/segundo-cerebro/actions/runs/39423562922) tras merge completó **SUCCESS**. CI completa de Worker del PR, privacidad y páginas de PR/main y despliegue privado de main **SUCCESS**. No se han modificado reglas Access, ni tokens ni credenciales.
- [Auditor y limitaciones](ACCESS_ANONYMOUS_BOUNDARY_AV058.md). Un 302 legítimo demuestra **solo bloqueo de peticiones anónimas en esas tres rutas y en ese instante**, no prueba acceso de un usuario autorizado. La configuración **real** `PSICO_ACCESS_TEAM_DOMAIN` / `PSICO_ACCESS_APP_AUD` del segundo control del AV-057 y una respuesta 200 con JWT válido siguen **PENDIENTES**. Hasta entonces, la tabla inline permanece denegada por defecto; el enlace anterior a la hoja privada funciona de manera independiente.
- **Criterio explícito del propietario:** PSICOHISTORIA dentro de Segundo Cerebro; no publicar observatorio abierto. **Canónico privado releído**: `PsicoAvances=58`, `AV-20261020-058=VERIFICADO` como ingeniería/seguridad auditada; `MAD-02=PARCIAL`; `PsicoPredicciones=0`. Cohorte sombra 2027 (196 países, seis modelos) sin cambios, 0 euros adicionales.
- **AV-059 siguiente:** verificar, solo con permisos de lectura mínimos y sin divulgar valores, si la app Cloudflare Access que cubre el hostname tiene AUD y team domain identificables a través de la API del propietario; probar sesión real antes de activar el visor inline. No usar IDs de cuenta como AUD ni aceptar claims solo por email. En paralelo, pendiente el sello y registro prospectivo externos de la cohorte 2027, independientemente de su interfaz.

---

## AV-20261020-057 · Decisión: SOLO dentro de Segundo Cerebro · visor 2027 con Access criptográfico

- **Privacidad confirmada expresamente por el propietario:** PSICOHISTORIA permanece **dentro de Segundo Cerebro**; NO se abre un observatorio público ni se distribuyen probabilidades en GitHub Pages. Se conserva la hoja privada de 196 países × 6 modelos (1.176 probabilidades) sin modificación, `SHADOW_NO_EMITIDO`.
- [PR #701](https://github.com/mamg97/segundo-cerebro/pull/701) **fusionada** en `main` (squash `9548ecbf5c914f9e22eef734bb6ee22e4535e94e`). Test de JWT RS256 legítimo y adversarial (firma, emisor, AUD, caducidad, `alg=none`), lectura Google Sheets canónica, integridad de 196 registros, sanitización HTML, privacidad, CI Worker y mock Pages **SUCCESS**; [Cloudflare producción desplegado](https://github.com/mamg97/segundo-cerebro/actions/runs/39414643325) **SUCCESS**.
- [Documento de arquitectura y limitaciones](PRIVATE_INLINE_2027_AV057.md). Implementación `app/research-shadow2027-inline.mjs`: búsqueda por país, orden y selector de seis modelos dentro de `2027 · Experimental`, mediante lectura **lazy** de `GET /api/research-shadow2027`. Backend `private-cloudflare/src/research-shadow2027-private.js` obtiene los valores únicamente de la hoja auténtica referenciada en el registro privado `PsicoExperimentos`, verifica edición, 196 filas, rangos [0,1], ranking y fórmulas; ningún ID de Sheet o probabilidad incrustado en el repositorio público.
- **Puerta de privacidad indispensable:** `private-cloudflare/src/research-shadow2027-auth.js` rechaza (HTTP 403) la ruta **antes de consultar Google** salvo JWT `Cf-Access-Jwt-Assertion` firmado RS256 por Cloudflare Access, con `iss`, audiencia de la aplicación `PSICO_ACCESS_APP_AUD`, equipo `PSICO_ACCESS_TEAM_DOMAIN`, expiración, `nbf`, `iat`, sujeto y JWKS oficial comprobados. **No están acreditadas la configuración real de estas dos variables ni una prueba completa autenticada/anónima de producción**. Por ello, entrega de código y despliegue son VERIFICADOS, pero el **visor inline NO debe anunciarse operable** hasta configurar/verificar el Access real. El enlace privado a la hoja sigue disponible como alternativa.
- **Canónico privado releído:** `PsicoAvances=57`, `AV-20261020-057=VERIFICADO` solo para ingeniería+CI+despliegue; `MAD-02=PARCIAL`; `PsicoPredicciones=0`. No hay sello externo de emisión ni prospectiva 2027, no se ha cambiado ninguna probabilidad, coste incremental 0 €.
- **Siguiente acción:** recuperar por canal autorizado los **valores reales** de equipo Cloudflare Zero Trust y Audience de la aplicación que ya protege Segundo Cerebro, establecer configuración del Worker sin volcarlos a Git y probar `403` anónimo y `200` autorizado en producción, además del render móvil. No usar políticas sólo por email o headers sin firma. No publicar la cohorte al público.

---

## AV-20261020-056 · Acceso a cohorte 2027 desde el laboratorio privado de Segundo Cerebro

- [PR #700](https://github.com/mamg97/segundo-cerebro/pull/700) **fusionada** en `main`, squash `ae0d3ed9155a335423ad1116b500bc2ae7bb97e5`; tests JS específicos, validación completa de Worker, control de privacidad y mock Pages **SUCCESS**. [Despliegue real Cloudflare](https://github.com/mamg97/segundo-cerebro/actions/runs/39391652206) **SUCCESS**: GitHub Actions verificó específicamente `Build private bundle`, `Apply D1 migrations` y `Deploy production Worker`. Autenticación real dentro del navegador del usuario **no inspeccionable en esta sesión**, verificarla en la propia web.
- Nueva pestaña **«2027 · Experimental»** en `app/research-lab.html`, accesible después de despliegue del Worker mediante `/app/research-lab.html?view=shadow2027`. Usa `app/research-shadow2027.mjs` para resolver enlace HTTPS a Google Sheets desde `PsicoExperimentos` previamente leído con `/api/research-lab`: exige ID exacto del experimento privado, `V2`, `SHADOW_NO_EMITIDO`, edición UCDP 26.1, `paises_ranqueados_sin_emision=196`, un solo registro y URL válida `https://docs.google.com/spreadsheets/d/.../edit`. En caso de anomalía, **no se muestra enlace**.
- **Límite de esta integración:** la pestaña enlaza a la hoja privada, **no incrusta las 1.176 probabilidades en la web**. La hoja requiere permisos de Google independientes de Cloudflare Access; no se ha añadido endpoint nuevo, ni tokens, URL de hoja, países o probabilidades al repositorio público. [Decisión de visibilidad](VISIBILIDAD_SHADOW_2027_AV056.md): no existe obligación general de ocultar el resultado por país; se mantiene privado inicialmente para preservar el carácter exploratorio y separar mock público de cohorte no emitida. La publicación abierta posterior requiere autorización explícita y política de revisión/versionado.
- **Canónico privado releído**: `PsicoAvances=56`, último `AV-20261020-056=VERIFICADO` como entrega de software/despliegue; `MAD-02=PARCIAL`; `PsicoPredicciones=0` (solo cabecera). Los 196 países/seis modelos de 2027, `forecastIssued=false`, código de training y resultados siguen sin cambiar. Cero gasto adicional.
- **Siguiente puerta científica:** para que la cohorte 2027 sea una emisión prospectiva real ANTES del 01/01/2027 faltan sello independiente RFC3161 recibido y validado, acreditación `source as-of`, registro append-only y autorización científica. Primer scoring completo de 2027 solo después del release oficial íntegro (fecha previsiblemente en 2028). Los avisos de nuevas guerras/conflictos a 30–90 días son otro target y requieren modelos mensuales con vintages y comparación con VIEWS. **La disponibilidad de la pestaña no demuestra skill predictivo.**

---

## AV-20261020-055 · Observatorio de riesgos 2027 disponible en móvil, exclusivamente privado

- [PR #699](https://github.com/mamg97/segundo-cerebro/pull/699) **fusionada** en main, squash `3b14565df5b7b4e4588d46d77189d42ce2873c00`. Tests sintéticos, [CI científica main](https://github.com/mamg97/segundo-cerebro/actions/runs/39388415741), privacidad y Pages **SUCCESS**.
- **Entrega privada realmente creada y comprobada**: hoja nativa de Google Sheets en carpeta PSICOHISTORIA - EXPERIMENTOS, con pestañas `Ranking 2027` y `Guía y límites`. **196 países únicos, seis probabilidades por país (1.176)**, campos de baseline y comparación; filtros y congelación de títulos para consulta móvil. Acceso y enlace REAL **solo en el registro privado `PsicoExperimentos`** bajo `ucdp261-2027-mobile-private-ranking-20261020`; no revelar el ID del fichero ni probabilidades en Git público. Comprobado `shared=false`, 197 filas de Ranking (incluida cabecera), integridad de rangos [0,1], orden y deltas porcentuales.
- Fuente: el HTML privado canónico creado el **18/10/2026**; no se ha generado ningún forecast distinto, no se ha entrenado de nuevo ni modificado la cohorte. Meta `issued=false`; **33 países** con logística experimental >=50 %, uno con diferencia entre V2 e interacciones >=20 puntos porcentuales. Son estadísticas exploratorias, **no alertas de guerra o seguridad**.
- [Auditor offline reutilizable](../../research/psychohistory/shadow_observatory_2027_integrity.py) y [contrato](PRIVATE_2027_MOBILE_OBSERVATORY_AV055.md): verifica JSON de un observatorio HTML privado sin ejecutar scripts ni publicar IDs, rangos [0,1], cardinalidad, unicidad, ranking, deltas y advertencias. CI de GitHub usa exclusivamente datos ficticios; validación de bytes privados reales efectuada a través de Drive fuera del repositorio.
- Un comparador externo, [VIEWS fatalities003](https://viewsforecasting.org/data/), se ha incorporado a la guía privada para permitir consulta de predicciones mensuales **externas**, que NO comparten horizonte ni exactamente el mismo target anual que PSICOHISTORIA.
- **Estado canónico releído**: `PsicoAvances=55`, último `AV-20261020-055=VERIFICADO` (entrega de producto e integridad); `PsicoFases.MAD-02=PARCIAL`, `PsicoPredicciones=0`. El target propio 2027 es presencia anual de >=25 muertes estatales y no aparición de nueva guerra. Cohorte sombra 2027 intacta, coste incremental 0 €.
- **Próximo paso prioritario**: preparar **emisión prospectiva realmente verificable antes de 01/01/2027**, solo con fuente timestamped as-of, recibo RFC3161 de autoridad independiente y registro privado append-only. No otorgar elegibilidad por la mera existencia del ranking, precompromiso local o test sintético. Primer scoring prospectivo del año 2027 solo tras publicación oficial que lo cubra íntegramente (provisionalmente **2028**). Para nuevos conflictos a 1–3 meses, experimento y métrica aparte usando vintages mensuales y benchmark VIEWS; fecha de valor predictivo propio aún indeterminada.

---

## AV-20261020-054 · Onset 19.1: contradicción de vintage y contaminación aparente de universo

- [PR #698](https://github.com/mamg97/segundo-cerebro/pull/698) **fusionada** (squash `766e3b8ab8ac4e9700767dddbc6d115cbfd60cf9`). Pruebas adversariales, lectura de cinco ficheros UCDP oficiales SHA-pinned y [CI científica de main](https://github.com/mamg97/segundo-cerebro/actions/runs/39382388341), privacidad y Pages **SUCCESS**.
- [Auditor y evidencia](ONSET_191_PROVENANCE_TYPES_AV054.md): muestra preregistrada de **10.130** GW-año y **61** residuales `newconf=1` antiguo / `onset1=0` moderno. Conflictos UCDP/PRIO 19.1 y 25.1 idénticos por categorías de `gwno_loc` para esos 61: **38** con actividad **solo no intrastatal** (37 interestatales tipo2 y 1 extraestatal tipo1), **10** mixtos (interna y no interna), **0** solo interna y **13** sin clave ACD. Los **51 sin actividad interna** del AV-052 se dividen ahora en 38 con conflictos de otros tipos y 13 sin coincidencia. En los 13 sin clave, todos los años son anteriores a 1989.
- El [codebook oficial UCDP Onset 19.1](https://ucdp.uu.se/downloads/onset/UCDP_Onset_Dataset_Codebook_19.1.pdf) anuncia muestra monádica país-año **1946–2018** con tipos internos **3/4**. El CSV actualmente servido por el catálogo histórico como 19.1 (`onsets_computed.csv`, SHA-256 observado 2026 `ba54aeace175173b7643a2c14ba35ce89a2fcfd31712085e4fd13de656f752a8`) termina **2017** y tiene **10.203** filas para **10.142** claves GW-año, con **61** repeticiones. Una fuente académica externa (*peacesciencer*) también documenta multiplicidad de episodios y ejemplos extraestatales. **La identidad y completitud de la edición etiquetada 19.1 NO están certificadas.**
- Esta coincidencia por país-año con conflicto tipo1/2 **no establece** cuál fue el conflicto específico que produjo cada `newconf` ni prueba error individual. Dictamen operativo: **INCOMPATIBLE_UNVERIFIED_VINTAGE** para entrenar onset intrastatal 25.1; no admitirlo como etiquetas históricas sin obtener archivo correcto, reloj temporal independiente y definiciones homologadas.
- **Canónico privado releído:** `PsicoAvances=54`, último `AV-20261020-054=VERIFICADO`; `MAD-02=PARCIAL`; `PsicoPredicciones=0`. Cohorte privada 2027 no modificada, coste adicional 0 €.
- **AV-055 pendiente:** buscar versión original Onset 19.1 *efectivamente publicada en 2019* y la causa de que el enlace actual sirva 1946–2017; también auditar en qué medida los episodios extraestatales/interestatales pasan a `onset1` antiguo. Sin sello de publicación, roster completo GW al origen, etiquetas comparables y exclusión de hindsight, **no hay backtest/Brier real ni predicción emitida**.

---

## AV-20261019-053 · UCDP Dyadic 19.1–25.1 (conjunto fijo de 61)

- [PR #697](https://github.com/mamg97/segundo-cerebro/pull/697) **fusionada** (squash `291e3aa715f31a358235a4d6d342b5e21f4f2b80`), pruebas sintéticas, auditor de las dos fuentes UCDP reales, privacidad y [CI científica de main](https://github.com/mamg97/segundo-cerebro/actions/runs/39332902303) SUCCESS, Pages SUCCESS.
- [Documento de resultados](UCDP_DYADIC_LINEAGE_AV053.md). Dyadic 19.1: **3.000 filas** hasta 2018 (SHA-256 CSV observado octubre 2026 `b1eed9ae6540268a157694068c8f3b2be9bb6104640aec2d1c43dab487c9a0f6`); Dyadic 25.1: **3.432 filas** hasta 2024 (SHA ZIP `e34d26c39d23739ab65bc52fd42747aa88e7ecdf84d16c7bacafd590ed767330`; CSV interno `e5bf6e3779a903f3df3ec476592332ce51ccf3798174b3db4c1b06dd1dd5a7ba`). Los hashes sólo autentican identidad **observada en 2026**, no disponibilidad pre-2020.
- Sobre 61 GW-año fijados (antiguo `newconf=1`, ambas variantes modernas `onset1=0`): **10** con actividad interna por díadas en **ambas** ediciones, **0** sólo antigua/moderna y **51** sin díadas internas identificadas en ninguna. Los diez comparten algún `dyad_id` y `conflict_id` numérico. Se preservó el universo original de 10.130 GW-año y los 85 residuales. No se divulgaron códigos, nombres ni filas de países.
- Coincide con el resultado ACD AV-052 bajo la agregación país-año. **No** atribuir automáticamente las 51 diferencias a errores o ausencia de violencia: unidad/conflicto/díada y edición pueden tener semánticas distintas.
- **Canónico privado releído y deduplicado:** `PsicoAvances=53`, último `AV-20261019-053=VERIFICADO`; `MAD-02=PARCIAL`; `PsicoPredicciones=0`. Se detectó y eliminó una fila duplicada de AV-053 sobre la misma PR #697; ninguna evidencia útil se perdió. Cohorte sombra privada 2027 sin cambios y coste incremental 0 €.
- **AV-054:** examinar el contenido real y versión efectiva de `onsets_computed.csv` (enlace catalogado 19.1 pero cobertura terminada en 2017), y su concordancia con el codebook de UCDP Onset 19.1. Antes de cualquier entrenamiento histórico: verificar publicación as-of, roster GW completo y etiquetas del mismo estimand.

---

## AV-20261019-052 · UCDP/PRIO 19.1 ↔ 25.1: linaje de conflictos para 61 residuos

- [PR #696](https://github.com/mamg97/segundo-cerebro/pull/696) **fusionada** en main (squash `eb2f74683d391c76ade1c4b2f25b2570b513099d`), fuente oficial UCDP/PRIO real, tests ficticios, CI científica, privacidad y Pages **SUCCESS** en PR y [main](https://github.com/mamg97/segundo-cerebro/actions/runs/39331566384).
- [Auditor y documentación](PRIO_CONFLICT_LINEAGE_AV052.md): se descubrieron desde catálogo oficial las dos ediciones históricas UCDP/PRIO Armed Conflict. **19.1** CSV directo con 2.384 filas (hasta 2018) SHA-256 `722c58a955cb25a53b126f83f0e4a95e6a3129d9fefda7421f650b5c482fbd91`; **25.1** ZIP con 2.752 filas (hasta 2024), SHA-256 ZIP `b49f7e80510d8a5779a52d872aef5b26456b3f5cbdd3ec32031339488e81813f`, CSV interior `a7a2ff6caf6c854f4fafb1b17f616da1ed6bbc00612943ec6e071511ebea7a81`. Las identidades observadas son **de octubre 2026**, no prueba de accesibilidad pre-2020.
- Sobre las **61** claves GW-año con `newconf=1` antiguo y onset1 modernos=0, filtrando solo violencia interna 3/4 y `gwno_loc`: **10** muestran conflicto interno activo en **ambas** ediciones, **0** solo en 19.1, **0** solo en 25.1 y **51** sin entrada intrastatal en ninguna. Los diez compartieron algún ID numérico de conflicto (identidad entre vintages **NO certificada**). Entre los 51 sin entrada: 45 antes de 1989 y 6 en 1989–2017.
- **Implicación:** la diferencia de `newconf` no se explica de forma simple por eliminar conflictos internos activos de UCDP/PRIO 19.1 entre ediciones; las unidades *onset*, conflicto-año y díada-año son diferentes y la falta de correspondencia no demuestra ausencia de violencia real. Mantener los 61 y 51 sin «resolver» artificialmente.
- **Canónico privado releído:** `PsicoAvances=52`, último `AV-20261019-052=VERIFICADO`; `MAD-02=PARCIAL`; `PsicoPredicciones=0`. AV-042 y AV-046 no se han mutado, 1.176 probabilidades sombra privadas 2027 intactas, coste adicional 0 €.
- **AV-053 siguiente:** comparar UCDP Dyadic 19.1/25.1 para las mismas 61 claves, con código GW y hashes por fuente, sin publicar países ni afirmar causalidad; investigar por qué el CSV Onset antiguo enlazado como 19.1 termina en 2017. **No** simular predicciones históricas sin autenticar datos/roster/training as-of.

---

## AV-20261019-051 · Diagnóstico empírico de 85 discrepancias residuales

- [PR #695](https://github.com/mamg97/segundo-cerebro/pull/695) **fusionada** (squash `69806f6c1a56cfdac481ba2e7429283d129b2c52`). Pruebas sintéticas, pipeline de UCDP real y privacidad de PR SUCCESS; [CI científica de main](https://github.com/mamg97/segundo-cerebro/actions/runs/39329041698), privacy y Pages SUCCESS.
- [Auditor y resultados](ONSET_RESIDUAL_NEWCONF_AV051.md): panel inalterado de **10.130** claves GW-año. Entre los **85** casos antiguo `onset1=1` frente a dos variantes modernas `onset1=0`, `newconf` antiguo=1 en **61** y =0 en 24; `newconf` moderno=0 en los 85. Además, `onset5` antiguo=1 en 70 y =0 en 15, mientras country25 `onset5=0` en todos. **43** residuales en 1946–1969, **23** en 1970–1988, **6** en 1989–1999 y **13** en 2000–2017. Hashes UCDP fijados como observaciones de 2026, no testigos temporales de 2020.
- De los otros **127** casos antiguo1/country0/conflict1, `newconf` antiguo1=56 y moderno conflict1=54. En los seis inversos antiguo0/country1/conflict1, `newconf` antiguo=0 y moderno country=1. No son indicadores semánticamente intercambiables.
- Hallazgo: las 61 discrepancias de `newconf` antiguo vs moderno muestran que el problema **no se resuelve sólo alterando el umbral de reinicio**. No se infiere eliminación de conflictos verdaderos ni 61 errores corregidos: la definición antigua incluye conflictos/díadas y las revisiones del código pueden diferir.
- **Canónico privado releído:** `PsicoAvances=51`, último `AV-20261019-051=VERIFICADO`; `MAD-02=PARCIAL`; `PsicoPredicciones=0`. Cohorte sombra 2027 (1.176 probabilidades privadas) intacta, sin nuevos costes.
- **AV-052 siguiente:** reconciliar versiones históricas UCDP/PRIO por conflictos/díadas y aclarar identidad/revisión de `newconf` sin difundir identidades de países. Ningún Brier, entrenamiento ni emisión de forecast autorizados hasta verificar bytes y relojes de fuente, roster y etiquetas train en su fecha.

---

## AV-20261019-050 · Cuatro definiciones oficiales de UCDP comparadas

- [PR #693](https://github.com/mamg97/segundo-cerebro/pull/693) fusionada en `main` (squash `e978cd86e692ff4efe97d64329eeb812a7a977a8`). Auditor de catálogo/CSV real, pruebas sintéticas, [main ciencia](https://github.com/mamg97/segundo-cerebro/actions/runs/39298237486), privacidad y Pages SUCCESS.
- [Documento científico](ONSET_FOUR_VARIANT_SEMANTICS_AV050.md). Se incorpora UCDP 25.1 country-level multiple-onset oficial (`ucdp-intrastate-country-multiple-onset-251.csv`, SHA-256 observado octubre 2026 `5fe7411942aa7e6a38d6386faa64f4d7f0703482509f121c4136c0e3223d7f05`). Consta de 12.606 filas y 53 duplicaciones por GW-año; para comparación se proyectan filas repetidas por OR descriptivo sin aprobar entrenamiento.
- Sobre **10.130** GW-año comunes (1946–2017), discrepancias con etiqueta antigua: 25.1 **country** = **218**, 25.1 **country multiple** = **218** y 25.1 **conflict ANY** = **96**. Las binarias `onset1` de country y country-multiple coinciden sobre este subconjunto, sin implicar igualdad de otros indicadores, periodos ni estimands. De 212 antiguos positivos frente a country negativo, 127 son conflict positivo pero multiple negativo y **85** permanecen negativos en todas las definiciones modernas; **66 de estos 85** son anteriores a 1989 y **19** posteriores (hasta 2017).
- **Canónico Sheets releído:** `PsicoAvances=50` con `AV-20261019-050=VERIFICADO`; `MAD-02=PARCIAL`; `PsicoPredicciones=0`. AV-042/046 sin mutar, cohorte sombra privada 2027 sin cambios, 0 € gasto adicional.
- **Próximo ensayo AV-051:** estudiar por separado las 85 diferencias residuales contra historias de conflicto UCDP/PRIO y etiqueta `newconf`; continuar autenticación de vintages y roster pre-emisión. No declarar causalidad de revisiones ni emitir Brier ficticio.

---

## AV-20261019-049 · Triangulación semántica de inicio intrastatal

- [PR #691](https://github.com/mamg97/segundo-cerebro/pull/691) **fusionada en main** (squash `5a009bd793fc7f7593473acd090de7382356d64f`). PR pruebas sintéticas, triangulación de tres CSV reales y privacidad SUCCESS; [CI científica de main](https://github.com/mamg97/segundo-cerebro/actions/runs/39297184405), privacy y Pages SUCCESS.
- [Documento detallado](ONSET_SEMANTIC_TRIANGULATION_AV049.md): usando **exactamente 10.130** claves GW-año comunes 1946–2017, discrepancias de `onset1` antiguo frente a UCDP25.1 intrastatal **country** = **218**, frente a UCDP25.1 **conflict** agrupado por «al menos un inicio» = **96**. De los **212** antiguo=1/country=0, **127** son conflict=1, y **85** conflict=0. Quedan seis antiguo=0/country=1 (también conflict=1). Años antiguos 1946–1988 = 5.210 pares; 1989–2017 = 4.920.
- Los CSV oficiales fueron comprobados por SHA-256 observados en 2026; 61 filas duplicadas en archivo antiguo y 53 en conflicto moderno se gestionan para comparación descriptiva sin inventar nuevas etiquetas. **Una coincidencia no demuestra causa individual**; cambio de unidad riesgo-conflicto/país y revisión histórica son hipótesis distintas. No admitir Onset25.1 como etiqueta entrenable disponible en 2020.
- **Canónico privado releído:** `PsicoAvances=49`, último `AV-20261019-049` VERIFICADO; `PsicoFases.MAD-02=PARCIAL`; `PsicoPredicciones=0`. Cohorte sombra 2027 sin modificar y sin gasto adicional.
- **Próxima investigación:** contrastar también variante moderna country-level multiple-onset y explicar los 85 residuales por periodos; continuar búsqueda de etiquetas históricas y roster de países con testigos independientes anteriores a emisión. Ningún Brier o habilidad científica demostrados.

---

## AV-20261019-048 · Diferencia REAL de labels onset entre vintages

- [PR #689](https://github.com/mamg97/segundo-cerebro/pull/689) fusionada `main` (squash `c0c4d46c89cb325590c671c3bb52a9efe5f7d02c`), CI fuente oficial real y tests ficticios/privacidad/main/Pages **SUCCESS**.
- [Auditor y documentación](ONSET_CROSS_VINTAGE_DRIFT_AV048.md): comparación retrospectiva entre Onset antiguo catalogado 19.1 y country-onset 25.1 sobre GW-año numéricos coincidentes 1946–2017. **10.130 pares**, 9.912 coincidencias (9.638 cero/cero, 274 uno/uno), **218 discordancias** (212 antiguo uno vs moderno cero, seis al revés); 2,15 % de discrepancia. Se observan 12 claves solo antiguas y 2.423 solo nuevas; estas cifras no certifican equivalencia territorial.
- Dado que los codebooks antiguos hablan de reinicios por conflicto y la definición country-level moderna considera toda la violencia intrastatal de un Estado, hay **riesgo concreto de NO equivalencia del estimand**, además de revisiones retroactivas. No atribuir 212 casos a errores corregidos ni a rendimiento de un modelo. Una etiqueta revisada nunca se usa como entrenamiento conocido en 2020.

## AV-20261019-047 · Fuentes empíricas auténticas 2019–2020

- [PR #688](https://github.com/mamg97/segundo-cerebro/pull/688), squash `df3574bca2fe7f6f40232e6feeff1440a7776254`, CI de fuentes GED20.1 y Onset19.1, auditor de roster GW histórico, pruebas adversariales y main/privacidad/Pages **SUCCESS**.
- [Resultados oficiales](HISTORICAL_TRAINING_SOURCE_AUDIT_AV047.md): GED20.1 contiene **225.385 eventos 1989–2019**, de ellos **12.484 en 2019** y 8.964 clasificados como **state-based** (no necesariamente conflicto interno). El vínculo del catálogo para Onset 19.1 entrega `onsets_computed.csv` con **10.203 filas, 10.142 GW-año únicos, 61 filas duplicadas con onset1 idéntico**; archivo finaliza en **2017**, pese a que el codebook 19.1 declara 2018. SHA-256 de ambos archivos observados octubre 2026 y fijados; no acredita disponibilidad histórica.
- GW roster candidato, commit académico declarado mayo 2020, comprobado solo a nivel de metadatos Git, sin validar las identidades de países ni el reloj del servidor.

## Estado y siguiente falsación

- **Fuente canónica privada releída:** `PsicoAvances=48`, último `AV-20261019-048` VERIFICADO; `MAD-02=PARCIAL`; `PsicoPredicciones=0`. Cohorte privada de 2027 (1.176 probabilidades sombra) no alterada, coste incremental 0 €.
- **AV-049 prioritario:** investigar con evidencia semántica si la asimetría 212/6 se debe a la diferencia de definiciones conflicto-vs-país; determinar si existe un target histórico realmente homologable y un roster 2020 con testigo temporal independiente. Solo después diseñar baselines en muestra pareada y score fuera de muestra.
- No calcular un Brier de Onset v25.1 como si Onset antiguo fuera entrenamiento equivalente, no usar GED type_of_violence=1 como señal exclusiva de guerras civiles, y no inventar emisión de predicciones en 2020.

---

## AV-20261019-046 · Experimento alternativo de emisión en julio

- [PR #687](https://github.com/mamg97/segundo-cerebro/pull/687) **fusionada en main** (squash `f42e68487243ab58a1950f34ab03692dadb47b10`); 7 pruebas adversariales de contrato, privacidad y [CI científica de main](https://github.com/mamg97/segundo-cerebro/actions/runs/39289947771) SUCCESS, Pages SUCCESS.
- [Documento del protocolo](ONSET_JULY_ORIGIN_NEXT_YEAR_EXPERIMENT.md): hipótesis separada del origen de AV-042, con emisión simulada el 01/07/2020 a las 00:00 UTC, GED 20.1 (datos hasta 31/12/2019) anunciado oficialmente el 16/06/2020, y outcome de inicio/reanudación country-onset1 para **todo 2021**. Su población es el roster fijo **que habría sido conocido el día de emisión**, no solo países en riesgo según conocimiento posterior. Por tanto se trata de **incidencia incondicional** y NO de hazard condicionado a elegibilidad. UCDP Onset v25.1 solo puede usarse como resolución retrospectiva, nunca para entrenar un modelo de 2020.
- El auditor `research/psychohistory/onset_july2020_nextyear_protocol.py` valida la geometría de fechas, versión, población, lag de publicación, horizontes y veto a hindsight, pero **nunca** autentica bytes de UCDP ni calcula scores o emisiones. Aún faltan fuentes/roster/etiquetas de entrenamiento con evidencias temporales independientes y una política territorial verificada.
- **Sheets canónico verificado después de escribir:** `PsicoAvances=46`, último `AV-20261019-046` VERIFICADO; `PsicoFases.MAD-02=PARCIAL` y `PsicoPredicciones=0`. Modelos y 1.176 probabilidades sombra privadas para 2027 no modificados. Coste adicional 0 €.
- Siguiente prueba empírica: autenticar una copia completa GED 20.1 y un roster de países sin eventos **anteriores al 01/07/2020**, además de etiquetas históricas de entrenamiento publicadas entonces. Nunca se atribuirá una emisión ficticia a 2020.

---

## AV-20261019-045 · Testigo Git tercero GED 19.1 (sin as-of)

- [PR #685](https://github.com/mamg97/segundo-cerebro/pull/685) fusionada en `main` (squash `b08286d71ee46ea85d6ec147ba71b2877bdc5106`); CI independiente del objeto Git, tests adversariales, privacidad y [CI de main](https://github.com/mamg97/segundo-cerebro/actions/runs/39288896539) SUCCESS; publicación Pages SUCCESS.
- [Evidencia académica](ONSET_THIRDPARTY_GIT_HISTORICAL_WITNESS.md): GED 19.1 mirror, commit Git `33316d9367907b8452d3a5ac3fe0ff2bd7da7f43` con fecha declarada 10/01/2020 y firma `unsigned`, árbol `9996db934c356ee561ba477b1a0a32bc996b0dc1`, blob `3f7e4621ba0d264a62b221fa06773e02d66d046f`, 68.235.762 bytes. El 11/01 la ruta se renombró conservando el mismo blob. Su timestamp Git no certifica recepción o acceso histórico pre-origen.
- **Canónico privado comprobado:** `PsicoAvances=45`, último `AV-20261019-045` VERIFICADO; `MAD-02=PARCIAL`; `PsicoPredicciones=0`. No se han modificado las 1.176 probabilidades sombra privadas de 2027.

## AV-20261019-044 · Auditor de capturas CDX

- [PR #684](https://github.com/mamg97/segundo-cerebro/pull/684), squash `7c6a74eae0233634e3988687a53f36cbb2a3a170`, CI real, 9 tests ficticios, privacidad, main y Pages SUCCESS.
- [Protocolo](ONSET_ARCHIVE_BYTE_WITNESS_TRIAL.md) y sondeo Internet Archive: `INDEX_REQUEST_UNAVAILABLE_NOT_EVIDENCE_OF_ABSENCE`; captura no verificable **no** equivale a ausencia. SHA1 CDX no autentica tiempo de depósito. Origen UTC del auditor es una hipótesis nueva, no la definición retroactiva de AV-042.
- Ningún backtest ni Brier nuevo, ninguna emisión de forecast. Coste incremental 0 €.

## Próxima entrega científica

Diseñar explícitamente un origen y horizonte que admitan publicaciones anuales con retraso de meses, y un denominador formal de observaciones prospectivas sin fingir riesgos condicionados. No reutilizar datasets revisados de años posteriores como inputs/labels históricos entrenables; exigir testigos independientes de publicación y roster completo antes de calcular cualquier skill.

---

## AV-20261019-043 · Vintages históricos con auditoría temporal fail-closed

- [PR #680](https://github.com/mamg97/segundo-cerebro/pull/680) **fusionada en main**, squash `396f12a7e3ca98d9c7eaa887b38d214c60b64d8a`. Workflow independiente de índice histórico UCDP, tests sintéticos y privacidad **SUCCESS**. [CI científica de main](https://github.com/mamg97/segundo-cerebro/actions/runs/39262787362), privacidad y demo Pages **SUCCESS**.
- [Documento científico](ONSET_HISTORICAL_VINTAGE_DISCOVERY.md): índice UCDP actual confirma enlaces a GED 19.1 (edición 2019, datos hasta 2018) y Candidate 20.0.10 (cobertura global declarada desde octubre 2020). Para origen **01/01/2020**, GED 19.1 es como máximo contexto de actividad rezagada hasta 2018 (Y−2), no evidencia de la actividad intrastatal del año 2019 (Y−1). Candidate 20.0.10 es posterior al origen y se descarta. No afirmar disponibilidad exacta de bytes en 2019 por disponer hoy del índice ni por comunicado antiguo.
- Software `onset_historical_vintages.py`: dos fuentes indexadas con identidad inmutable, origen temporal, disponibilidad *solo candidata*, exclusión automática de releases posteriores, cobertura de país desconocida y prueba adversarial. **Todas las autorizaciones de as-of, risk set, scoring y emisión son false.**
- **Canónico privado releído tras escritura:** `PsicoAvances=43`, último `AV-20261019-043` VERIFICADO; `MAD-02=PARCIAL`; `PsicoPredicciones=0`. Cohorte privada shadow 2027 sin modificar. El gasto adicional sigue en **0 €**; no hay cron, Worker ni modelos nuevos de predicción.
- **Siguiente bloqueo:** localizar archivos completos e íntegros de actividad intrastatal Y−1 **con testigos de bytes autenticados antes de 1 enero Y**, evidencia de países sin eventos y homologación territorial GW/UCDP; solo entonces crear elegibilidad país-onset1. Si el origen es inviable, preregistrar separadamente una nueva fecha y horizonte, nunca mutar a posteriori el objetivo del AV-042.

---

## AV-20261019-042 · Contrato de emisión anual sin información futura

- [PR #678](https://github.com/mamg97/segundo-cerebro/pull/678) **fusionada** en main, squash `19e8812e9672519062e630cea9fad146d139f773`. CI científica, lectura de fuente real, privacidad, Worker Builds y despliegue de main **SUCCESS**.
- Nuevo [contrato experimental](ONSET_ISSUE_DATE_CONTRACT.md): origen **1 de enero Y**, horizonte **año Y**, unidad **país-año**, etiqueta candidata **UCDP Onset v25.1 intrastatal por país, `onset1`**. `newconf`, `onset5` e inicio de una díada no son la misma definición ni se sustituyen en el código.
- El contrato sintético `research/psychohistory/onset_issue_contract.py` exige información de riesgo y actividad intrastatal, cobertura territorial, fecha de disponibilidad de cada fuente y corte de features estrictamente **anteriores** al origen. Todas las puertas de aprobación real (`vintage_verified`, `full_risk_set_at_issue`, `backtest`, `models_scored`, `forecast_issued`) siguen **false**.
- Hallazgo científico: un archivo **anual** que contiene actividad durante todo el 31/12 de Y−1 no puede suponerse completado, publicado y verificado a las 00:00 del **1/01/Y**. Se requiere un origen más tardío **con horizonte redefinido** o una fuente realmente oportuna ya disponible pre-origen; no se automatiza ningún cambio metodológico.
- Empírico UCDP 25.1 país-año (hash completo observado octubre de 2026, validado en runner efímero): **12.553** observaciones 1946–2024. `onset1=1` en **2006: 3**, **2019: 5**, **2020: 4**, **2023: 2**, **2024: 2**. En 2020 `onset5=1` en **1** país-año, pero **196 filas ≠ 196 países elegibles** al instante de emisión. Tener fila del año anterior tampoco prueba que se conociese su estado de paz antes del origen.
- Incidencia detectada en CI: SHA-256 inicial truncado a **57** caracteres en documento/código/workflow. Se confirmó con hash calculado en runner que UCDP **no** había mutado los bytes, se corrigió la transcripción a 64 caracteres y la ejecución real pasó. No se sobreescribió información canónica ni se cambió de fuente.

## Fuente canónica privada

- `PsicoAvances`: **42 eventos**; último `AV-20261019-042` verificado y releído.
- `PsicoFases.MAD-02=PARCIAL`; `PsicoHitos.V2-02=EN_CURSO`; `PsicoPredicciones=0` emisiones.
- Cohorte sombra 2027 y sus **1.176 probabilidades privadas intactas**. No se modificaron modelo, Worker, frontend ni infraestructura de pago; sin cron recurrentes.

## Siguiente entrega científica

1. Encontrar una fuente de **actividad intrastatal disponible antes de cada emisión**, con su fecha precisa, universo incluyendo países sin eventos y evidencia independiente de bytes históricos (no solo hash observado hoy).
2. Aprobar pertenencia, equivalencia GW/UCDP y conjunto en riesgo de `onset1`; excluir Estados con actividad intrastatal previa que los deje fuera según la definición país de UCDP y tratar desconocidos como **UNKNOWN**, no negativos.
3. Someter baselines y entrenamiento a verdaderos orígenes fuera de muestra, congelación de features y cohorts; solo después calcular Brier de onset sin confundir persistencia y novedad.

`docs/HANDOFF.md` del repositorio completo aún contiene una cabecera de PSICOHISTORIA antigua por su gran tamaño; esta **nota pequeña** y el seguimiento privado de PROYECTOS son la referencia operativa vigente del subproyecto. No crear otros registros paralelos.
