# PSICOHISTORIA · AV-076 — Auditoría de divergencia temporal: Túnez

Fecha 20/10/2026. **Investigación retrospectiva exploratoria**, no emisión histórica genuina, ni inferencia causal. Se investiga la pregunta: «¿Por qué difiere el árbol desde 2014 de lo que ocurrió en Túnez en 2017–2018?».

## Procedencia y alcance
Fuente canónica: `PsicoExperimentos`, catálogo `3e3354a6acf0-catalog-2016` (año origen 2016; máximo dato 2014; edición **UCDP OrganizedViolenceCY 26.1**, observada en 2026, no datos as-of acreditados). País Tunisia, código 616. Modelo `markov` de `ucdp-futures-v1`. Estados consecutivos: `00 bajo-bajo`, `01 entrada`, `10 salida`, `11 persistencia`; se trata de **categorías país-año de ≥25 muertes de conflicto con participación estatal**, no inicio/fin de guerra ni cualquier atentado.

Estado inicial observado en el catálogo: `2014=11`; puente **2015=11**, no visto en origen; 2016=11, 2017=10, 2018–2025=00 en la fuente revisada.

La matriz global de Markov usa conteos de entrenamiento `global.transitions=[[3909,129],[135,604]]` más suavizado de Laplace 1; por tanto:
- Transición al umbral desde estado previo bajo: `(129+1)/(3909+129+2)=0.03217821782`.
- Permanecer sobre el umbral desde estado previo alto: `(604+1)/(135+604+2)=0.81646423752`.
- Pasar por debajo desde estado alto: `(135+1)/(135+604+2)=0.18353576248`.

Se asume **transición estacionaria idéntica a todos los países**, sin coyuntura tunecina, frontera con Libia, cambios entre facciones, política de seguridad, indicadores mensuales ni fuentes contemporáneas. Las tasas explican MECÁNICAMENTE el pronóstico, no la causa real del cambio histórico.

## Reproducción exacta del fallo

| Año | Observación UCDP revisada | Estado modal previsto | Probabilidad previa asignada al estado real | Brier multicategoría del caso |
| --- | --- | --- | ---: | ---: |
| 2016 | 11 persistencia | 11 persistencia | 66,6614 % | 0,165189 |
| **2017** | **10 salida** | **11 persistencia** | **12,3431 %** | **1,170434** |
| **2018** | **00 bajo-bajo** | **11 persistencia** | **42,6204 %** | **0,548764** |
| 2019 | 00 bajo-bajo | 00 bajo-bajo | 51,1895 % | 0,393947 |
| 2025 | 00 bajo-bajo | 00 bajo-bajo | 75,0944 % | 0,097819 |

En **2025** el modelo estimó `P(≥25 muertes)=20,7928 %`, `P(<25 muertes)=79,2072 %`; el estado final más probable coincide con el observado (00). No se puede llamar «fallida» a la pregunta binaria 2025 solo por ver un porcentaje no nulo de riesgo; los pronósticos probabilísticos se evalúan mediante reglas propias.

### Recuento retrospectivo 2016–2025, mismo caso dependiente

| Modelo | Brier medio (10 años correlacionados) | Años cuyo estado modal no coincide |
| --- | ---: | --- |
| Markov global | 0,331285 | 2017, 2018 |
| Country shrinkage | 0,359579 | 2017, 2018 |
| Frecuencia global | 0,371223 | 2016, 2017 |
| Memoria dos estados | 0,550619 | 2017–2020 |
| Persistencia determinista | 1,800000 | 2017–2025 |

**NO seleccionar hiperparámetros ni elegir el modelo ganador según Túnez.** Estos son diez desenlaces de la misma trayectoria, NO diez repeticiones independientes; el caso fue escogido tras mirar el resultado. Las reglas de país de los catálogos pueden tener versiones históricas revisadas.

### Origen alternativo en 2020: NO equivale a anticipación desde 2014

Catálogo `3e3354a6acf0-catalog-2020`, corte 2018 y estado inicial `00`: todos los objetivos 2020–2025 son `00` en la edición revisada. En 2025 Markov asigna `85,6486 %` a `00`. Brier medio Markov `0,018661` frente a persistencia determinista `0` en esos seis años. La aparente mejora se debe en parte a **empezar después del cambio de 2017–2018**; no es prueba de que se habría anticipado el punto de inflexión en 2014.

## Contexto histórico, no atribución causal

- 2015–2016 fueron años de actividad militante intensa, incluidos ataques a instalaciones de seguridad de Ben Guerdane en marzo de 2016. Fuentes: [Carnegie (2017)](https://carnegieendowment.org/middle-east/research/2017/07/the-geographic-trajectory-of-conflict-and-militancy-in-tunisia), [Carnegie (2018)](https://carnegieendowment.org/research/2018/08/the-insurgency-in-tunisias-western-borderlands).
- Esos informes mencionan insurgencia fronteriza, efecto del conflicto libio y operaciones de seguridad. **No justifican afirmar que una operación específica causó un cruce del umbral UCDP en 2017**.
- Los atentados contra civiles o incidentes de terrorismo no siempre corresponden al indicador anual estatal de UCDP: categorías distintas. Tampoco el estado 00 equivale a paz.

## Implementación y próxima falsación

Módulo puro `app/research-futures-diagnostics.mjs`: contrasta cada año observable con la **probabilidad modal predicha** en el año original y su probabilidad asignada al desenlace efectivo. Un panel `<details>` aparece exclusivamente con la realidad posterior visible y no modifica `matrix`, `levels`, `snapshots` ni `scoreHistoricalCases`. Disponibilidad parcial no se denomina acierto.

**Siguiente estudio científico recomendado:** analizar en toda la cohorte (no solo Túnez) si Markov falla de forma sistemática en el primer año de salida `11→10` y en los dos años posteriores. Comparar Brier de Markov, persistencia, memoria y shrinkage contra una referencia fuerte, por grupos de origen y período; comprobar independencia temporal y edición de fuente. Hipótesis a falsar: **mala detección del momento de cambios de régimen**, no que «Túnez fue un caso impredecible». No entrenar con 2017 para evaluarlo después como si fuese evidencia ex ante.
