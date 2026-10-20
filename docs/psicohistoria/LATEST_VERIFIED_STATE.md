# PSICOHISTORIA — Estado científico verificado · 20/10/2026

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
