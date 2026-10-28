# VIEWS mensual: primera importación real comprobada

28/10/2026. El importador ya existente sólo tenía pruebas sintéticas. Ahora se
ha ejecutado con el CSV country-month ofrecido por la página oficial y su
codebook: `fatalities003_2026_08_t01`. La lista oficial de datasets identifica
su publicación el25sep2026; la edición de septiembre aparece como **prevista**
para finales de octubre, no se ha tratado esa previsión como publicación real.

La fuente contiene6876filas,191países y36meses. Conservamos sus bytes originales,
cabecerasHTTPS, página y codebook en privado. Para la consulta de octubre se
extraen573filas de noviembre2026/diciembre2026/enero2027: leads3/4/5desde las
entradas de agosto. Capturar hoy no actualiza los datos de entrada a octubre.
No es información en tiempo real ni prueba de la capacidad de Psicohistoria.

## Adaptación y control

El esquema observado usa `country`, mientras el lector esperaba `name`.
Se admite exactamente uno de esos dos campos como nombre; ambos juntos o
cabeceras duplicadas se rechazan. No se modifica ni normaliza el original.
Se refuerzan CSV sin filas desiguales, enteros, correspondencia únicaGW/ISO,
identidad de meses compartida entre países y ordinales consecutivos sin asumir
un origen de calendario no documentado. La lectura y el hash usan un solo
snapshot de bytes. Las salidas privadas se crean directamente con0600 y nunca
sobrescriben otro archivo.

Ocho pruebas sintéticas PASS. EjecuciónCLI real completa y contraste separado
rawCSV/Decimal:573filas,191países, tresmeses, identidades y valores coinciden
exactamente, sin diferencias de roundtrip observadas. No nuevos backtests,
reentrenamiento, score, TSA ni filas en PsicoPredicciones.

## Consulta disponible

La vista privada `PsicoVIEWS` presenta un país por fila, filtros nativos, tres
probabilidades mensuales y tres predicciones puntuales de fallecidos. Identifica
edición, corte de entrada, fuente y origen externo. Se verificaron por relectura
las2292celdas de191países. El formato porcentual distingue cero de probabilidades
positivas muy pequeñas; el color tiene escala fija0–100%, no expresa calidad.
Los originales y elCSV largo permanecen privados y permiten reproducir la vista.

`main_dich` es la probabilidad externa de al menos25muertes relacionadas con
combate por país-mes; `main_mean` es una predicción puntual de fallecidos. No
exponenciar ingenuamente `main_mean_ln`, no sumar probabilidades ni atribuir una
probabilidad conjunta trimestral. El universo191no se une por posición/nombre a
los196países de nuestra cohorte anual, cuyo objetivo y resolución son distintos.
La consulta de un benchmark publicado no demuestra que nuestros modelos sean
útiles o mejores. Fuente as-of de cada emisión y evaluación futura siguen siendo
puertas separadas; esta importación no concede admisión científica propia.

Fuentes primarias:
- [Acceso oficial](https://viewsforecasting.org/data/).
- [CSV de la edición](https://viewsforecasting.org/wp-content/uploads/2026/09/fatalities003_2026_08_t01_cm.csv).
- [Codebook](https://api.viewsforecasting.org/fatalities003_2026_08_t01/codebook).
- [Datasets publicados y previstos](https://github.com/prio-data/views_api/wiki/Available-datasets).
