# AV-117 — Primeras publicaciones UNRATE archivadas por ALFRED

23/10/2026. Se obtiene una fuente de vintages para desarrollar el objetivo macro, sin entrenar ni evaluar predicciones.

## Archivo y cobertura

El [formulario oficial ALFRED de UNRATE](https://alfred.stlouisfed.org/series/downloaddata?seid=UNRATE) permite descargar `Observations, Initial Release Only`. Se solicitaron niveles, enero de 2011–septiembre de 2026 y todos los vintages ofrecidos desde 2011. Respuesta HTTP 200 ZIP de 3.239 bytes, SHA-256 `d5f90cacdb89b99bac8292363e3a359c9e135eee30f7b6eabb61c4aebc70a90d`, con README y CSV. El ZIP, solicitud exacta, formulario y documentación completos se conservan privadamente fuera de Git.

El CSV contiene **189 meses consecutivos, 188 valores y una ausencia**. Octubre de 2025 tiene valor vacío y `realtime_start_date=2025-12-16`: esa fecha acompaña al registro ausente; no representa una tasa observada ni debe convertirse en cero. La serie oficial es mensual, porcentaje, ajustada estacionalmente, procedente de BLS/CPS.

El cruce con los cinco DOM BLS de AV-100, revalidando sus hashes, coincide en tasa y fecha: enero de 2011 (9,0; 04/02/2011), abril de 2020 (14,7; 08/05/2020), septiembre de 2025 (4,4; 20/11/2025), enero de 2026 (4,3; 11/02/2026) y septiembre de 2026 (4,2; 02/10/2026). Es un contraste limitado a esos cinco casos, no validación independiente de los otros 183 valores.

## Qué significa el reloj

La [ayuda de descarga](https://alfred.stlouisfed.org/help/downloaddata) define este formato como valores iniciales y fecha de primera publicación. La [metodología de ALFRED](https://alfred.stlouisfed.org/help) prioriza la fecha proporcionada por la fuente; si falta, usa la del proveedor o primera disponibilidad en FRED. Los datos se incorporan normalmente dentro de un día laborable y pueden contrastarse con servicios terceros cuando falta el original.

Por tanto, es evidencia oficial de vintage con resolución diaria, suficiente para preparar un panel candidato; no prueba bytes BLS del primer instante ni un timestamp intradía. La fecha de descarga de hoy tampoco es su fecha histórica de publicación. Un futuro corte debe justificar su relación con esas fechas y con la disponibilidad de predictores RUC.

## Verificación reproducible

`research/psychohistory/alfred_initial_release_audit.py` verifica hash, miembros ZIP, serie/formato, columnas, meses consecutivos, fechas y tasas finitas dentro de 0–100. Conserva ausencias explícitas y rechaza entradas ambiguas; no descarga datos ni puntúa modelos. Seis pruebas sintéticas cubren corrupción, duplicados/huecos, formato incorrecto, ausencia, valores inválidos y publicación prematura. El ensayo real produce 189/188 y el contraste privado 5/5.

`MAC-02` sigue `PARCIAL/NO`. Este avance aporta etiquetas iniciales candidatas; aún faltan reloj y cobertura de predictores, preespecificación de horizonte/target/baseline y validación temporal. No hay backtest, score ni emisión.
