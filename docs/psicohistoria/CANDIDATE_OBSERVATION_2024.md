# PSICOHISTORIA — Primera inspección de UCDP Candidate histórico

## Prueba empírica acotada

El histórico oficial UCDP contiene **Candidate 24.0.12**, descrito como
publicación de cobertura global. URL exacta de CSV:
https://ucdp.uu.se/downloads/candidateged/GEDEvent_v24_0_12.csv

La tarea CI **psychohistory-candidate-source-probe.yml** descarga el CSV
público al runner temporal y aplica **candidate_source_probe.py**:

- verifica estructura mínima de eventos y contabiliza fechas fuera del rango
  nominal o invertidas como bloqueos de replay, sin ignorar esos registros,
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

## Primera anomalía empírica, sin admisión as-of

La [ejecución CI inicial](https://github.com/mamg97/segundo-cerebro/actions/runs/39161126467)
descargó correctamente los bytes públicos el 18/10/2026, pero encontró
**6 filas con `date_end` posterior a 2024**, 0 anteriores a 1989 y
0 con el intervalo de fechas invertido. Un nombre de edición 24.0.12
**no** convierte automáticamente todas sus filas en observaciones disponibles
en 2024. No sabemos aún si la causa es una revisión retroactiva, el alcance
real de la edición o una interpretación que exige el codebook.

El auditor devuelve `OBSERVED_BUT_REPLAY_BLOCKED_DATE_SCOPE_ANOMALY`
con los tres contadores agregados, y mantiene prohibido puntuar, afirmar
procedencia histórica o tratar como negativos a países ausentes. **No** se
filtran silenciosamente las seis filas ni se atribuye retrospectivamente
una disponibilidad temporal demostrada.
