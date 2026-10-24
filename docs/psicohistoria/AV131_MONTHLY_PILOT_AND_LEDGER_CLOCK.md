# AV131 · Piloto mensual y conservación temporal del registro

24/10/2026. Prioridad operativa: cerrar un ciclo de predicción, captura del
resultado y comparación. Las ampliaciones HTOPS quedan detrás de esta unidad.
El resultado negativo macro v1 y el ensayo de proyección externa Census se
conservan; ninguno acredita utilidad predictiva propia.

## Calendario y pregunta candidata

El [calendario BLS](https://www.bls.gov/schedule/news_release/empsit.htm),
consultado el 24/10/2026, anuncia el dato de octubre para el 6 de noviembre y
el de noviembre para el **4 de diciembre de 2026, 08:30 America/New_York**.
El segundo sería el primer desenlace de un mes íntegramente futuro si el
piloto se emite antes del 1 de noviembre. Octubre sería un nowcast y queda
fuera del piloto principal. Son fechas programadas, no garantía de publicación.

Propuesta separada de macro v1: probabilidad de que la primera tasa nacional
BLS de desempleo desestacionalizado del mes objetivo supere en al menos
0,2 puntos porcentuales la tasa base conocida al emitir. Base: dos meses
antes del objetivo. Emisión mensual prevista el día 26 a las 12:00 UTC del
mes anterior al objetivo, con información capturada como máximo el día 25
23:59:59 UTC. Primera emisión candidata: 26/10/2026 para noviembre; si no se
cumplen las puertas antes del corte, se registra ausencia y no se retrofecha.

### Diseño que debe congelarse antes de calcular el nuevo modelo

- Cohorte fija de doce objetivos, noviembre de 2026 a octubre de 2027;
  una emisión por mes y ninguna selección según resultados posteriores.
- Último mes observado debe coincidir con base=objetivo−2; en caso contrario
  no se emite. No imputar meses ausentes ni cambiar el horizonte para salvarlos.
- Sesenta meses finales candidatos para cambios históricos a dos meses,
  terminando en la base; conservar cada pareja cuyos extremos existan y
  exigir al menos 48 parejas válidas. Mismo snapshot as-of para todos los datos.
- Comparador probabilístico: frecuencia suavizada (k+1)/(n+2) de cambios
  >=0,2 pp. Comparador adicional de persistencia: probabilidad cero de subida.
- Candidato sencillo: sumar a cada cambio histórico dos veces la pendiente
  de los últimos tres meses, (u_base−u_base−3)/3, y aplicar la misma frecuencia
  suavizada al umbral. Sin búsqueda de ventanas, penalizaciones ni umbrales.
  Es una hipótesis nueva adaptada tras conocer el fracaso de v1; no un modelo
  ya validado. La pendiente no se resta de la distribución histórica.
- Resultado: primera tasa publicada para el mes objetivo, conservando el
  comunicado y hora de captura. La tasa base queda fijada al emitir; revisiones
  posteriores solo en sensibilidad separada. Una captura tardía o ambigua se
  marca no resoluble bajo el contrato primario, nunca se rellena como cero.
- Brier pareado contra ambos comparadores, cobertura de los doce objetivos,
  exclusiones, número de eventos y errores mensuales. Los cambios a dos meses
  se solapan: no presentar los doce casos como independientes.
- Revisión operativa al cerrar los doce objetivos: candidato para ampliación
  solo con al menos diez resolubles, al menos dos eventos y dos no eventos,
  y Brier al menos 10 % menor que **ambos** comparadores. Si algún comparador
  tiene Brier cero no se declara mejora relativa. Este umbral es una decisión
  de cribado fijada ahora, no una prueba de significación o utilidad general.
  No promover ni retocar el modelo durante la cohorte. Un único acierto no
  acredita habilidad; la utilidad para decisiones necesita su evaluación propia.

## Puertas pendientes y siguiente entrega

**No emitido.** El diseño anterior es un plan metodológico público previo a
cálculos, no la aprobación científica de un contrato ejecutable. Implementar
el generador con pruebas de reloj, umbral, ausencias y comparadores; contrastar
con fuentes congeladas y completar la revisión retrospectiva admisible antes
de decidir si el piloto puede emitirse. Separar cualquier ensayo histórico
exploratorio de la cohorte futura.

Antes de una emisión: protocolo ejecutable fijado por hash, datos realmente
capturados antes del corte, código y resolución fijados, ancla temporal
independiente, recibo del compromiso exacto y alta privada append-only. No
reemplazar estos requisitos por un flag o una fecha local. Si no se alcanza el
26/10, el mes omitido no se sustituye por un caso favorable. No se ha creado
una automatización adicional ni escrito en PsicoPredicciones.

## Fallo corregido en el ledger existente

`scan` llamaba al validador de altas, que comparaba `issuedAt` contra el reloj
de la lectura. Un borrador válido dejaba de ser legible al vencer su fecha;
además impedía añadir nuevos borradores a esa cadena.

Ahora las lecturas comprueban la fecha local persistida de alta y exigen que
preceda a `issuedAt`. Rechazan fecha inválida, futura o una falsa afirmación de
sello independiente. Las altas siguen exigiendo emisión futura respecto del
reloj actual, incluso tras adquirir el bloqueo; no se permite retrofecharlas.
Los bytes históricos no se migran ni reescriben. Un reloj local y una cadena
reescribible por su propietario siguen sin constituir un sello independiente.

Dos regresiones nuevas verifican lectura después de la fecha prevista,
extensión de la cadena, rechazo de nuevas altas retroactivas y metadatos
inválidos. Las 18 pruebas de la familia prospectiva pasan. Esto corrige una
precondición operativa; no activa ISSUED ni aprueba gates científicos.
