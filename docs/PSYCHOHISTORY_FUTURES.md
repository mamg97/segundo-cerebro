# Futures Engine — matemática y protocolo v1

Implementación **retrospectiva exploratoria**, no un pronóstico emitido antes del desenlace. Los parámetros y resultados reales pertenecen al Sheet privado y al archivo de reproducción; este documento contiene método y ejemplos de estructura. Reutiliza el benchmark UCDP auditado y no sustituye sus objetivos binarios.

## 1. Estados observables

Para cada país del universo anual oficial, sea $B_y=1$ si `sb_total_deaths_best >= 25` en el año $y$, y cero en caso contrario. No significa ausencia de violencia, paz institucional ni legitimidad. Definimos $S_y=2B_{y-1}+B_y$:

| Código | Par | Significado operacional |
| --- | --- | --- |
| 0 | 00 | Permanencia bajo el umbral |
| 1 | 01 | Entrada en un episodio agregado |
| 2 | 10 | Salida del episodio agregado |
| 3 | 11 | Persistencia del episodio agregado |

Las cuatro categorías son exhaustivas y excluyentes cuando existen ambos años. No son los inicios oficiales por díada UCDP/PRIO ni categorías subjetivas de estabilidad/crisis. Una transición $i\to j$ solo es posible si $\lfloor j/2\rfloor=i\bmod2$. Así, una entrada no puede ser seguida por permanencia 00 sin pasar por una salida.

Fuente primaria: [UCDP OrganizedViolenceCY 26.1, código metodológico](https://ucdp.uu.se/downloads/organizedviolencecy/UCDP_OrganizedViolenceCY_Codebook_261.pdf), Mert Can Yilmaz (2026), y Sundberg y Melander (2013). La release cubre 1989–2025 y usa estados Gleditsch–Ward existentes en cada año. Sus ceros y umbrales de inclusión heredan límites de GED. Licencia CC BY 4.0 y checksums: [benchmark](PSYCHOHISTORY_BENCHMARK.md).

## 2. Tiempo e información

El origen $o$ es el 1 de enero del año objetivo inicial. Se admite información solo hasta $c=o-2$, suponiendo dos años de desfase. El estado inicial conocido es $S_c$, no el estado contemporáneo $S_o$. El año $o-1$ es un puente no observado: **se integra**, nunca se condiciona en su etiqueta real.

Horizonte $H$ comprende $o,\ldots,o+H-1$. La distribución terminal requiere $H+1$ transiciones desde $c$:

$$\pi_{o+H-1}=e_{S_c}^{\mathsf T}P^{H+1}.$$

Este desfase controla el uso explícito de etiquetas futuras, pero no corrige revisiones de la release. `vintageVerified=false`, `prospectiveEligible=false` y `retrospective_revised_release` son obligatorios. Se requieren cinco años consecutivos de historia disponibles. No se imputan países actuales en el pasado ni etiquetas ausentes. La falta de observaciones finales se registra como exclusión ex post, no como cero ni como señal predictora.

## 3. Cinco comparadores estimables

La versión inicial mantiene cinco modelos sin elegir ganador ni ajustar pesos en test. Para un conteo binario $n_0,n_1$, $q=(n_1+1)/(n_0+n_1+2)$:

| Modelo | Probabilidad del siguiente $B=1$ |
| --- | --- |
| Frecuencia constante | $q$ global sobre años disponibles; Bernoulli iid. Induce una distribución multinomial constante sobre pares tras dos pasos, no un multinomial libre |
| Persistencia | $B$ del último estado; referencia determinista |
| Markov global | $q_{B_y}$, conteos de transiciones de un año hasta $c$ |
| Markov por país regularizado | $(n_{c,b,1}+20q_b)/(n_{c,b,0}+n_{c,b,1}+20)$; contracción hacia Markov global |
| Memoria de dos estados | $q_{S_y}$, conteos de tripletas hasta $c$; admite dependencia de entrada/salida, además de nivel |

Cada tasa induce una fila de cuatro categorías con exactamente dos destinos permitidos. Matrices y estados se mantienen fijos durante cada trayectoria. Se reestiman anualmente al avanzar el origen, usando solo datos hasta su corte. El prior global del modelo por país es plug-in; no se presenta como inferencia jerárquica bayesiana completa. Países con el mismo historial pueden compartir probabilidades: no se inventan covariables para diferenciarlos.

Código de ajuste: `research/psychohistory/futures.py`. Motor operativo puro: `private-cloudflare/src/research-futures-engine.mjs`. Una prueba compara kernels y propagación Python/JavaScript sobre conteos ficticios.

## 4. Caminos, agregación y masa

Con parámetros estimados $\hat\theta$, la probabilidad de una historia completa es

$$p(s_{c+1},\ldots,s_T\mid S_c,\hat\theta)=\prod_{y=c+1}^{T}P_{s_{y-1},s_y}(\hat\theta).$$

El grafo temporal **agrega** historias por `(año,estado)`. El flujo de una arista es $f_y(i,j)=\pi_{y-1}(i)P_{ij}$; su suma entrante equivale a la masa del nodo destino y su suma saliente a la del origen. La visualización etiqueta por separado masa marginal, probabilidad condicional y flujo agregado. No interpreta un flujo como la probabilidad de una historia concreta.

Para la lista de historias se usa beam de 64 prefijos y se muestran hasta 12. La poda no garantiza las 12 historias globalmente mayores. Las probabilidades retenidas **no se renormalizan**. El residual es $1-\sum p_{\rm retenida}$ e incluye todo lo omitido. El grafo agregado se calcula exactamente con forward, conserva toda la masa y es independiente del beam. Límite: diez años objetivo, once transiciones incluyendo puente.

El recorrido observado posteriormente puede superponerse como línea discontinua. Se conserva en una sección separada del catálogo, después de ajustar parámetros; no entra en el kernel, en la semilla ni en las bandas. Una prueba de invariancia cambia ese recorrido y exige idénticas probabilidades.

## 5. Incertidumbre paramétrica

Cada tasa suavizada se asocia a Beta$(n_1+1,n_0+1)$. Por país, se usa Beta$(n_1+20q_b,n_0+20(1-q_b))$, condicionada al prior global plug-in. Se generan 128 kernels con semilla fija; **un mismo kernel muestreado se mantiene en todos los pasos** de cada réplica. Las bandas 2,5–97,5 % resumen variabilidad paramétrica idealizada.

La estimación puntual usa la matriz media plug-in; no se afirma que $E[P^H]=(E[P])^H$ ni que sea la integración posterior completa de historias. Las bandas no tienen por qué sumar uno. Las filas se tratan como condicionalmente independientes; la dependencia real entre países y años puede reducir su cobertura. No incluyen revisiones, búsqueda de especificaciones, mecanismos omitidos o cambios de régimen. **No son intervalos de precisión científica ni cobertura prospectiva acreditada.** Persistencia no recibe bandas degeneradas con apariencia de certeza: muestra ausencia de intervalo paramétrico.

## 6. Protocolo fuera de muestra

`futures_protocol.json` fija modelos, priors, horizontes y cortes antes de registrar resultados. El desarrollo es exploratorio tras conocer el benchmark binario. Tras una ejecución inicial se corrigió la regla de incertidumbre para respetar el solapamiento de horizontes; no se denomina preregistración.

- Validación: secuencias completas dentro de 2010–2015. Un horizonte que no cabe queda sin evaluación, no se extiende al test.
- Test: secuencias completas dentro de 2016–2025; H=1,3,5,10. A diez años solo cabe un origen, por lo que no permite robustez entre épocas.
- Todos los modelos comparten exactamente país, origen, desenlace y hash de muestra dentro de un horizonte. No sumar horizontes o modelos como muestras independientes.
- Brier nominal sin normalizar: $N^{-1}\sum_n\sum_{k=0}^3(p_{nk}-1[y_n=k])^2$, rango 0–2. Log loss de la categoría terminal. Estados sin orden defendible: no usar RPS.
- Calibración por estado en cinco bins fijos, ECE medio de las cuatro curvas, con N y frecuencias. El promedio puede ocultar categorías raras; conservar cada curva.
- Probabilidad de la secuencia binaria completa: forward con máscara de las etiquetas observadas desde el origen, integrando el puente. Su log loss se compara solo dentro del mismo horizonte; no es la probabilidad de la categoría terminal.
- Riesgo acumulado de superar el umbral al menos una vez en el intervalo: $1-P(B_o=\cdots=B_T=0)$; Brier binario separado.
- Skill pareado frente a frecuencia, persistencia y Markov. IC por bootstrap circular de bloques de orígenes, longitud $\max(2,H)$, manteniendo todos los países de cada origen juntos. Se exige un mínimo de dos bloques completos; de lo contrario, IC no estimable. Condicionado a ajustes ya realizados, sin reproducir entrenamiento ni toda la dependencia.
- Informes por año, región, país y ventanas de orígenes. Una ventana sin muestra conserva `null`. No se selecciona ganador, se crea ensemble ni se declara estabilidad a diez años.

## 7. Cuatro vertientes y puertas pendientes

**V1.** La memoria de segundo orden es un modelo interpretable estimable con este panel, no una implementación estructural-demográfica completa. El marco estructural candidato sería $z_{t+1}=f(z_t,x_t;\theta)+\epsilon_t$, con variables de población, élites y estado. El panel actual no observa salarios relativos, competencia de élites ni capacidad estatal con vintages auditados: la identificación de esa dinámica no está establecida. No asignar parámetros ni etiquetas de crisis ficticias. [Turchin (2013)](https://escholarship.org/uc/item/6qp8x28p) desarrolla ese marco de presiones; una [prueba crítica posterior, Georgescu (2023)](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0287912) cuestiona capacidad explicativa y validez de variables de élites. Debe someterse a pruebas nuevas, no incorporarse como ley.

**V2.** Kernels globales, por país y con memoria operativos. Multinomial con covariables, supervivencia, HMM y boosting quedan pendientes de datos y de un comparador exigente. No se usan estados latentes sin identificación.

**V3.** `agents_recovery.py` extiende mecanismos sintéticos con activación y recuperación síncronas en red dirigida de anillo y un enlace aleatorio por agente. Si está inactivo, $p_i=\epsilon+(1-\epsilon)\lambda 1[r_i\ge\tau]$; si está activo, permanece con probabilidad $1-\rho$. Rejilla reproducible de umbral, recuperación e inicialización, 20 semillas por celda, dispersión y repetición de seed 0. Los pasos no equivalen a años, los cuantiles son dispersión entre semillas y no se transforman en probabilidades de países. Falta fijar correspondencia observacional y calibrar con episodios empíricos; no hay afirmación causal.

**V4.** Registro compartido versionado, catálogos y métricas en `PsicoExperimentos.notas`, archivos íntegros privados y cálculo bajo demanda. No se crean proyectos ni almacenes paralelos. Un ensemble requerirá pesos aprendidos y evaluados en orígenes separados; no hay pesos por tener cuatro vertientes. Sellado temporal independiente y disponibilidad as-of siguen pendientes; el evaluador prospectivo existente continúa fallando cerrado.

## 8. Reproducción y ejecución privada

```sh
node research/psychohistory/download.mjs /ruta/privada/datos
python3 research/psychohistory/futures.py --data-dir /ruta/privada/datos --output-dir /ruta/privada/a
python3 research/psychohistory/futures.py --data-dir /ruta/privada/datos --output-dir /ruta/privada/b
cmp /ruta/privada/a/report.json /ruta/privada/b/report.json
cmp /ruta/privada/a/predictions.json /ruta/privada/b/predictions.json
python3 research/psychohistory/agents_recovery.py --output-dir /ruta/privada/abm
python3 -m unittest discover -s research/psychohistory -p 'test_*.py' -v
```

Solo tras auditoría de calidad y checksums se ajusta sobre datos reales. Los outputs reales nunca se versionan en Git. `futures_registry.py` prepara sobres `psychohistory.futures.catalog.v1` y `psychohistory.futures.metrics.v1` compatibles con las columnas actuales, sin escritura remota automática. Celdas limitadas a 45.000 caracteres; IDs derivados del informe y adición sin sobrescribir resultados anteriores.

La API privada `GET /api/research-futures?catalog=...&country=...&model=...` acepta únicamente una selección del catálogo canónico; valida parámetros y coherencia antes de calcular. El navegador no ajusta modelos ni inventa probabilidades. `GET /api/research-lab` entrega el índice validado para selectores. La UI v0.4.0 comparte datos entre Explorador e Investigador, muestra grafo, historias, masa residual, bandas, matriz, benchmark, calibración y procedencia. Horizontes no preevaluados se identifican como tales.

SVG sin librerías ni activos externos: hasta 45 nodos visibles y 88 aristas (incluidas las de masa nula) (en la configuración de cuatro estados y diez años), ancho local desplazable. Grosor `0.5 + 14 × flujo`, radio `max(4,20√masa)`. Pulsos decorativos, pausa, reproducción de años con velocidad, teclado, movimiento reducido y suspensión fuera de viewport/segundo plano. Animación temporal local, sin solicitudes nuevas; consulta del modelo únicamente al entrar o pulsar Calcular. Sin cron, nueva infraestructura, D1, servicios pagos ni coste incremental.

Siguiente experimento prioritario: reconstruir releases realmente disponibles en cada origen y un crosswalk socioeconómico con vintages, congelar un periodo nuevo y comparar candidatos contra **todas** las referencias, incluida persistencia. No declarar el MVP científicamente validado mientras no se cierre esa puerta.


## 9. Evaluación individual de casos históricos (v0.4.2)

El explorador permite elegir países de los catálogos reales y pulsar **Revelar desenlace y evaluar modelos**. El backend entrega un score descriptivo por caso para los cinco modelos, sin ajustar modelos ni usar los resultados observados como predictores.

- El estado terminal observado para horizonte H es el elemento H+1 de la serie observedStates; el índice 0 es el corte conocido o−2 y el índice 1 corresponde al puente o−1 no conocido al emitir.
- Solo se puntúa una secuencia observada completa entre 1 y H+1. Un hueco no se rellena como resultado negativo ni se transforma en observación.
- El motor calcula con cada modelo la distribución del horizonte usando únicamente el kernel ajustado hasta el corte. Después, y solo después, mide la probabilidad del estado observado, el Brier categórico de cuatro estados (0–2) y el log-loss del estado terminal.
- Las cinco filas del caso comparten país, origen, horizonte y etiqueta. Un único Brier no demuestra mayor capacidad predictiva, calibración, eficacia causal ni ventaja estadística.
- Es un cálculo **post-hoc** sobre release retrospectivamente revisada, no un experimento ciego ni una predicción sellada; revelar en UI no equivale a una evaluación as-of correcta.
- Los resultados agregados con denominadores siguen en la vista Investigador. Para confirmar habilidad prospectiva, reconstruir primero los archivos/versiones realmente disponibles antes de cada origen, fijar el protocolo y verificar pronósticos posteriores mediante sellado independiente.


## 10. Primera vista de casos observados y red probabilística (v0.4.3)

La pestaña Futuros pasa a ser la **primera pantalla del laboratorio privado**, antes de la portada ilustrativa y los indicadores generales. El análisis comienza con **país, origen, horizonte, estado real y probabilidad asignada a ese estado**. No se inventan nombres ni descripciones específicas de acontecimientos históricos: los únicos eventos observables en este panel son las transiciones del umbral anual UCDP definido arriba. Los eventos nominales o sus causas requieren una fuente diferente verificada y una taxonomía más rica.

- Para un caso retrospectivo completo, el resultado real, Brier y log-loss individuales son visibles por defecto, sin botón de revelación. Las cinco probabilidades del estado registrado proceden de la API calculada con los parámetros del corte histórico.
- La red conserva las probabilidades, masas de nodos y flujos de aristas **sin condicionar al recorrido real**. Sobre ella se superpone, activada por defecto, la secuencia observada posteriormente en **ámbar**, con anillos y una marca del estado final. Un control explícito permite ocultarla para examinar predicciones aisladas.
- La cronología distingue **último dato conocido**, **puente no observado cuando se emitía**, y **años objetivo observados ex post**. Cada año identifica estado 00/01/10/11, su semántica operacional y ausencias sin imputación.
- Se coloca después del grafo una comparación de cinco modelos en exactamente el mismo caso y una distribución de los futuros posibles; la evaluación científica agregada permanece en la vista Investigador.
- Si el resultado es inexistente o la secuencia incompleta, el panel indica no evaluable y no atribuye al modelo probabilidades de un desenlace desconocido, Brier ni log-loss. El gráfico no muestra un recorrido real completo inexistente.
- Todo lo anterior es **retrospectivo exploratorio sobre la release revisada 26.1**, con `vintageVerified=false` y `prospectiveEligible=false`. La apariencia visual no es una predicción sellada ni establece causalidad o precisión científica.
- Diseño responsive sin dependencias adicionales, sin endpoints de escritura ni alteraciones de `PsicoExperimentos`. Pruebas sintéticas de resaltado, ausencia de etiquetas, escape HTML, orden inicial y masa probabilística original.
