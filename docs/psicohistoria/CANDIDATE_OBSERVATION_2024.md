# PSICOHISTORIA — Primera inspección de UCDP Candidate histórico

## Prueba empírica acotada

El histórico oficial UCDP contiene **Candidate 24.0.12**, descrito como
publicación de cobertura global. URL exacta de CSV:
https://ucdp.uu.se/downloads/candidateged/GEDEvent_v24_0_12.csv

La tarea CI **psychohistory-candidate-source-probe.yml** descarga el CSV
público al runner temporal y aplica **candidate_source_probe.py**:

- verifica estructura mínima de eventos, fechas no futuras ni invertidas,
  valores válidos de país y categoría de violencia;
- calcula SHA-256 de los **bytes efectivamente observados hoy** y número
  agregado de filas/eventos, años y países CON EVENTOS, sin mostrar
  identificadores o filas por país;
- no guarda el archivo en un artifact, no publica datos reales en Git y
  elimina la copia del runner incluso si falla la inspección;
- no solicita credenciales ni añade coste recurrente. Pruebas unitarias
  exclusivamente ficticias.

**Muy importante:** el número de países con incidentes en un CSV
de eventos NO representa la cobertura del universo de países.
Los países cubiertos sin incidentes no tienen una fila de «cero».
Hay que obtener y verificar por separado el roster geográfico y su vigencia
en cada edición, si se quiere construir un denominador sin sesgo.

## Límites evidenciales

Que un GitHub Action descargue los bytes hoy en 2026 prueba su
**disponibilidad actual**, no que los mismos bytes exactos ya
existieran a finales de 2024. Ni el nombre de edición ni la etiqueta
«global» son una prueba criptográfica de fecha anterior.
El hash observado ahora NO ha sido cotejado con un hash certificado
independiente de esa fecha.

Este experimento no reconstruye features, labels ni pronósticos;
candidate_equals_final_ged=false, as_of_verified=false,
backtest_authorized=false, forecast_issued=false.

La puerta de evaluación de la cohorte completa sigue en
[CANDIDATE_ASOF_COVERAGE.md](CANDIDATE_ASOF_COVERAGE.md).
La futura integración deberá fijar evidencia independiente de edición,
fecha y ámbito, así como un roster completo: solo entonces podrá reconstruir
el panel prequential y comparar nuevas apariciones frente a baselines.

Fuente de alcance geográfico:
https://ucdp.uu.se/downloads/olddw.html
(versiones 2018/19 limitadas a África; 2020 con expansión; desde
2021 histórico global).
