# Primer benchmark real: protocolo y límites

El runner `research/psychohistory/benchmark.py` implementa un **experimento exploratorio retrospectivo con una versión revisada**. No reconstruye la información publicada en cada origen histórico, no acredita capacidad prospectiva y no debe alimentar `PsicoPredicciones`.

## Fuente y licencia

UCDP Country-Year Dataset on Organized Violence within Country Borders, versión 26.1, 1989–2025. Descarga y código metodológico oficiales: https://ucdp.uu.se/downloads/. Licencia CC BY 4.0 confirmada en ese centro. Atribución: Sundberg, Ralph y Erik Melander (2013), “Introducing the UCDP Georeferenced Event Dataset”, Journal of Peace Research 50(4), 523–532; Yilmaz, Mert Can (2026), código metodológico OrganizedViolenceCY 26.1. Conservar estos créditos en cualquier derivado compartido.

El archivo oficial incluye países sin registros de violencia, con universo Gleditsch–Ward variable por año. No expandir retrospectivamente una lista de países actuales ni convertir estados inexistentes en observaciones negativas. Un cero significa ausencia de muertes registradas por el procedimiento de UCDP, no ausencia demostrada de violencia. El umbral de inclusión de díadas introduce sesgo de observación. `sb_exist` indica algún evento y **no** equivale al umbral anual de actividad de un conflicto.

El CSV usa nombres `country`, `year`, etc.; el PDF describe sufijos `_cy`. El adaptador valida el esquema efectivo del CSV y fija SHA-256 del ZIP y del PDF en `protocol.json`. Un cambio de bytes falla antes del ajuste; no actualizar silenciosamente hashes. El procesamiento usa únicamente agregados, sin nombres de actores ni individuos.

## Objetivos separados

1. **Presencia anual:** `sb_total_deaths_best >= 25` dentro de las fronteras del país durante el año objetivo.
2. **Aparición de episodio agregado:** la condición anterior y `<25` el año inmediatamente anterior. La información del año previo forma parte de la **etiqueta**, nunca de los predictores ni del filtro de elegibilidad al emitir el pronóstico.

No equivalen a la definición de inicio de un conflicto de UCDP/PRIO ni identifican causas. La presencia puede resultar fácil de anticipar por duración/persistencia, sin demostrar capacidad para anticipar nuevas crisis. Por eso se publican ambos objetivos por separado.

Se adopta país-año por la existencia de un universo anual oficial con ceros y cobertura consistente; no se ha auditado todavía el denominador ni el historial de publicaciones necesario para país-mes.

## Información y particiones

- Ventana de validación: objetivos 2010–2015. Evaluación de test: 2016–2025.
- Walk-forward expansivo anual. Para origen `t`, etiquetas de entrenamiento solo hasta `t-2`; las características de cada fila usan exclusivamente años hasta su propio `t-2`.
- Se exigen cinco años consecutivos de historia. No imputar países nuevos, huecos ni etiquetas finales no observadas. Conservar exclusiones y denominadores en el informe.
- Predictores: actividad observada dos años atrás, frecuencia en los últimos cinco años disponibles, `log1p` de muertes estatales, no estatales y unilaterales del último año disponible. Los conteos se transforman, nunca se mezclan con datos contemporáneos del objetivo.
- Estandarización, ajuste de logits, frecuencias y tablas solo con entrenamiento de ese origen.
- Los desfases son una **suposición conservadora**, no fechas históricas de publicación verificadas. Toda la release 26.1 se observó después del periodo evaluado: hay riesgo de revisiones. `as_of_verified=false` en el informe es obligatorio.

No se incluyen todavía PIB, población, instituciones ni datos Seshat. Hace falta auditar crosswalks de países y versiones históricas antes de incorporarlos. V1 es aquí un índice de memoria de conflictividad; no representa todavía una teoría cliodinámica estructural completa.

## Modelos y comparación

- Frecuencia histórica global suavizada con Laplace.
- Persistencia determinista de la última etiqueta disponible (dos años atrás). Log loss usa recorte 1e-12; declarar esta convención.
- Markov suavizado: frecuencia de la etiqueta según la última etiqueta disponible, ajustada solo en entrenamiento.
- Índice V1: media de cuatro variables normalizadas —frecuencia histórica y tres intensidades de violencia— con pesos iguales, transformada mediante logística univariada.
- Logística L2 multivariable: pérdida media + `0.025/2 × ||coeficientes||²`, sin penalizar intercepto. Newton amortiguado, tolerancia de gradiente 1e-7; un fallo de convergencia aborta la ejecución.
- Tabla no lineal: interacciones de actividad, cualquier historia de actividad y existencia de violencia no estatal/unilateral. Regularización hacia frecuencia global con 20 pseudo-observaciones.

Los seis modelos se informan para ambos objetivos. No seleccionar el ganador en test ni crear ensemble después de verlo. El primer prototipo de descenso de gradiente con número fijo de pasos no garantizaba convergencia: la especificación v2 corrige ese defecto tras inspeccionar resultados preliminares. Es una corrección numérica documentada, **no una preregistración confirmatoria**. Las salidas preliminares se conservan separadas como superadas.

## Métricas e incertidumbre

Brier, skill pareado frente a cada referencia, log loss, AP no interpolada como resumen de precisión–recall (empates agrupados), calibración y ECE con cinco intervalos fijos. Las curvas y registros muestran denominadores, eventos y versiones. Se desglosa por año, región y ventanas 2016–2020 / 2021–2025.

IC del 95 %: 500 réplicas de bootstrap circular de bloques de dos años, tomando todos los países de cada año conjuntamente y manteniendo apareadas las predicciones. Condicionados a modelos ajustados; no incluyen variabilidad de reentrenamiento, revisiones, especificación ni toda la dependencia temporal. Con diez años son frágiles. Los intervalos Wilson de las celdas de calibración son solo descriptivos y no corrigen dependencia del panel.

Sensibilidad a etiquetas: reevaluar las mismas probabilidades congeladas usando estimaciones low/high. Esto mide incertidumbre de medición del desenlace; no es un reentrenamiento ni una prueba completa de robustez estructural.

## V3

Reutiliza el prototipo de contagio irreversible: 180 agentes, 40 pasos, cuatro umbrales × tres fracciones iniciales × 20 semillas. Devuelve media, rango, desviación y repetición de seed 0 de cada celda. Los escenarios son sintéticos y no se ajustan a los países del benchmark. No pueden explicar cese de violencia. Falta una selección previa de patrones empíricos y un mecanismo con recuperación antes de calibrarlo.

## Reproducción y persistencia

```sh
node research/psychohistory/download.mjs /ruta/privada/datos
python3 research/psychohistory/benchmark.py --data-dir /ruta/privada/datos --output-dir /ruta/privada/run-a
python3 research/psychohistory/benchmark.py --data-dir /ruta/privada/datos --output-dir /ruta/privada/run-b
cmp /ruta/privada/run-a/report.json /ruta/privada/run-b/report.json
cmp /ruta/privada/run-a/predictions.json /ruta/privada/run-b/predictions.json
```

Python estándar, sin instalación de bibliotecas ni APIs de pago. Node obtiene solo dos archivos públicos, reutiliza caché y verifica hashes; no usa la API UCDP que exige token. Registrar CPython/versión, hash del código, protocolo, fuentes y resultados. La igualdad exacta se comprueba en el mismo entorno; entre plataformas usar tolerancias numéricas documentadas.

`registry.py` prepara filas para el mismo Sheet privado. `PsicoExperimentos.notas` puede contener el sobre JSON `psychohistory.backtest.v1`: objetivo, horizonte, partición, hash de muestra y protocolo, métricas, calibración y agregados anuales. La UI rechaza informes incoherentes y solo agrupa poblaciones/protocolos idénticos. Un registro es una evaluación modelo–objetivo; varias evaluaciones comparten muestra y **no** son experimentos independientes. El sobre `psychohistory.abm.v1` es exclusivamente sintético. Las columnas existentes no cambian.

Los archivos completos viven en un archivo privado de Drive enlazado desde `evidencia_url`; el Sheet mantiene estado y resultados canónicos. No publicar resultados operativos, microdatos, enlaces privados ni IDs en Git. La interfaz consume la API privada existente y no lee el archivo de evidencia al cargar. Sin polling, cron, nueva infraestructura ni coste incremental.

## Sellado previo y siguiente puerta científica

`sealing.py prepare` genera un compromiso SHA-256 con sal aleatoria de 256 bits que vincula identificación, fenómeno, región, horizonte, emisión, resolución, as-of, probabilidades y versiones. Genera una petición RFC3161. **El compromiso local no prueba fecha.** Solo debe enviarse esa petición opaca a una autoridad temporal independiente previamente revisada. No se selecciona ni contacta una TSA automáticamente.

`sealing.py verify` verifica la respuesta RFC3161 contra los bytes originales mediante OpenSSL y una raíz de confianza fijada administrativamente; compara fecha firmada con emisión y desenlace. El payload, la sal, la cadena, la respuesta y el manifiesto permanecen privados. Una autoridad autofirmada por el operador no constituye independencia; nunca aceptar una raíz propuesta por el Sheet.

La integración de esa verificación con el Worker sigue pendiente. El evaluador de producción falla cerrado: **cero filas puntuables prospectivas** sin un recibo comprobado por código de servidor de confianza, aunque Sheets contenga fechas anteriores o un supuesto `sealVerified`. No se han emitido predicciones ni se afirma haber probado una TSA real.

Siguiente prioridad: benchmark con releases realmente disponibles en cada fecha, auditoría del universo y covariables socioeconómicas históricas. Congelar una nueva especificación antes de ver un periodo adicional. Solo después pasar a shadow prospectivo. La estética y un skill retrospectivo positivo no sustituyen esas puertas.
