# PSICOHISTORIA · AV-084 — Señales anteriores al origen y primer cambio de régimen

**Fecha:** 21/10/2026 · **V2/V4** · Estado **EXPLORATORIO RETROSPECTIVO POST HOC**. Este experimento NO certifica una predicción emitida en 2024 o 2025 ni un modelo válido para inversiones.

## Hipótesis contrastada

El AV-083 ya utiliza duración del régimen de violencia anual con participación estatal (**UCDP OrganizedViolenceCY, umbral 25 muertes**). AV-084 investiga si la **intensidad numérica antes del corte** predice mejor la *primera* entrada/salida en los dos años siguientes.

Las dos señales se fijan explícitamente:
- **Régimen bajo:** 10–24 muertes estatales en el último año histórico admitido. Cercanía al umbral, no evento de violencia por encima del umbral.
- **Régimen alto:** ≥25 muertes en el último año y en el penúltimo; las muertes del último son ≤50 % de las del penúltimo. Es una reducción de intensidad, no una salida ya realizada.

Entrenamiento exclusivo con las filas anteriores a cada origen, según **edición antigua** `OrganizedViolenceCY 23.1` hasta 2022 o `24.1` hasta 2023. Para cada año de entrenamiento se calcula el estado previo, su duración acumulada, la señal calculada **en el año anterior** y la etiqueta de primer cruce del año siguiente. Se regulariza cada célula (régimen × duración × señal) hacia el hazard de duración de AV-083, con concentración fija **50**; los intervalos de duración siguen siendo **1, 2–3, 4–7, 8+**. El modelo original AV-083 y los cinco benchmarks históricos se mantienen **intactos**.

Los resultados del primer año son el hazard de la célula correspondiente. Para **el segundo año** no se conoce el número de muertos del primero: se utiliza el hazard de duración AV-083 **sin imputar muertes futuras ni observar el puente**, multiplicado por la probabilidad de supervivencia sin cambio del primero. Vector de probabilidad `[primer cambio en puente, primer cambio en año destino, sin cambio]` suma 1.

Código `research/psychohistory/signal_hazard_first_passage.py`; tests `test_signal_hazard_first_passage.py` incluidos en workflow `.github/workflows/psychohistory-duration-hazard.yml`. ZIP/XLSX con SHA-256 fijado de las ediciones oficiales; las pruebas adversariales rechazan duplicados, números negativos, NaN, huecos e intentos de cambiar el corte; alteraciones en etiquetas posteriores afectan únicamente a los diagnósticos ex post y el scoring. No se publican nombres ni identificadores país a país.

## Resultados reales de dos ventanas examinadas previamente

| Modelo | Entrena hasta 2022; evalúa 2023–24 (N 196, 11 cambios) | Entrena hasta 2023; evalúa 2024–25 (N 196, 8 cambios) |
| --- | ---: | ---: |
| **AV-084 señales + duración** | **0,089745** | 0,079861 |
| AV-083 duración | 0,089821 | **0,078591** |
| Markov por país | 0,093725 | 0,079299 |
| Memoria dos estados | 0,095549 | 0,080887 |
| Persistencia | 0,112245 | 0,081633 |
| Markov global | 0,109672 | 0,087524 |
| Frecuencia constante | 0,406585 | 0,400992 |

Brier del primer cambio (menor mejor). El nuevo modelo **gana por 0,000076 respecto a AV-083 en la primera ventana y pierde por 0,001270 en la segunda**. Esta ausencia de estabilidad no respalda una mejor capacidad de predicción.

Bootstrap descriptivo **2.000** veces, emparejado y estratificado por régimen inicial:
- 2023–24: AV-084 menos AV-083 `−0,0000758`, percentiles 95 % **[−0,002215; +0,001954]**; contra Markov país `−0,003981` [−0,018514; +0,010411].
- 2024–25: AV-084 menos AV-083 `+0,0012696` **[−0,000117; +0,002908]**; contra Markov país `+0,000562` [−0,009500; +0,011854].
- Todos los intervalos cruzan cero y no modelan correlación regional/temporal. Estas dos ventanas comparten 2024 y los mismos países; no son ensayos independientes. La propia hipótesis fue escogida tras estudiar AV-080 a AV-083, de modo que **toda comparación es desarrollo exploratorio, no evaluación confirmatoria**.

## La prueba decisiva: pocos países tenían la señal

| Origen / ventana evaluada | Señal anterior al origen | N señalados | Países que realizaron primer cambio |
| --- | --- | ---: | ---: |
| Origen 2024 / 2023–24 | Régimen bajo; 10–24 muertes en 2022 | **5** | **2** |
| Origen 2024 / 2023–24 | Régimen alto; descenso ≥50 % en 2022 | **4** | **0** |
| Origen 2025 / 2024–25 | Régimen bajo; 10–24 muertes en 2023 | **3** | **0** |
| Origen 2025 / 2024–25 | Régimen alto; descenso ≥50 % en 2023 | **7** | **0** |

Datos de origen: `sourceSignal.observedFirstChangeOutcomeByRegimeAndFlag` producidos en el workflow. La señal combinada afecta **9/196** y **10/196** países respectivamente. Dos eventos en el primer corte y ninguno en el segundo **no permiten inferir tasa de éxito**, generalización o causalidad. Los valores numéricos fueron derivados solo de ediciones antiguas; los resultados reales procedieron solo de las ediciones posteriores.

## Conclusión científica y siguiente experimento

1. No incorporar AV-084 al motor público, Laboratorio de Predicciones real, registros de `PsicoPredicciones`, cohor­tes 2027 ni toma de decisiones bursátiles.
2. Un acercamiento anual al umbral de muertes es conceptualmente una señal posible, pero escasa y de bajo poder estadístico. En la segunda ventana no coincidió con ningún primer cambio. Es insuficiente para construir «alertas tempranas».
3. Priorizar señales **más frecuentes y con mayor resolución temporal**, como la evolución mensual de incidentes, composición de actores, concentración geográfica y señales institucionales/agenda pública; evaluar siempre disponibilidad de fuente en el instante *as-of*. Una señal «registrada en el mes» y publicada meses después **no era todavía observable**.
4. Preespecificar hipótesis, cohortes futuras y métrica de primer cambio antes de evaluar nuevos períodos, así como resultados de estabilidad y riesgo por separado. Referencias obligatorias: persistencia, Markov por país y AV-083.
5. **Sin prueba independiente de vintage emitida en el origen**: incluso 23.1 y 24.1 descargadas hoy no certifican su contenido exactamente publicado el 1/1/2024 o 1/1/2025. Todos los resultados siguen post hoc, con 2027 `SHADOW_NO_EMITIDO`.

Resultado metodológico: **añadir variables no garantiza más capacidad predictiva**. Esta hipótesis debe conservarse como resultado negativo o indeterminado para evitar sesgo de publicación.
