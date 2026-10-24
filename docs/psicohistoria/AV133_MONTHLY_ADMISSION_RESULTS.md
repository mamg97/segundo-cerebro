# AV133 · Resultado mensual: candidato descartado

24/10/2026. Se ejecutó una vez el contrato AV132 después de publicar y fusionar
PR #828. No se modificaron ventana, umbral, cohorte ni parámetros al ver resultados.

| Métrica | Resultado |
| --- | ---: |
| Objetivos mensuales prefijados | 93 |
| Casos puntuables y pareados | 89 |
| Eventos ≥0,2 pp | 16 |
| Brier candidato con momento | 0,188251594 |
| Brier frecuencia suavizada | 0,154253030 |
| Brier persistencia p=0 | 0,179775281 |
| Habilidad candidato frente a frecuencia | −22,04 % |

**No supera admisión.** El candidato tiene mayor error que ambos comparadores
y queda descartado para emisión bajo esta versión. No se optimizarán sus
parámetros para rescatar el score. El ensayo macro semestral anterior permanece
separado, negativo e íntegro.

## Cobertura y límites

- Octubre2025: probabilidad calculable, pero etiqueta ausente; no puntúa.
- Noviembre/diciembre2025: el último mes publicado no coincide con la base
  exigida; no cambiar el horizonte ni imputar.
- Marzo2026: falta el mes necesario para el momento; exclusión para toda la
  comparación pareada, incluido el baseline.

El benchmark de frecuencia tiene un Brier un14,20 % menor que persistencia
**en esta muestra**. No significa14,20 % más aciertos ni habilidad futura
probada. En2021 y2026 no hubo eventos entre casos puntuados y persistencia
obtuvo error cero; la ventaja no es uniforme por años. Dieciséis eventos,
ventanas solapadas, historia conocida y comparación exploratoria impiden
concluir calibración o utilidad decisional general.

La etiqueta histórica es la primera observación ALFRED conservada; no se ha
convertido en evidencia de bytes iniciales BLS. Una eventual emisión futura
requiere fuentes realmente capturadas y resultado observado bajo contrato.

## Reproducibilidad

Informe privado `monthly_admission_v1.json`, SHA-256
`26e733a64216fe0aaeb5f6f1c574b9b2f778231d17946b0906599860fa0fe7ca`.
Contrato SHA-256
`af73f77f90cbe8f92c2a23ca1af22a6c2d71d8da13344b9da948e7b4f10ef6ee`.
Fuentes originales fijadas por el contrato; informe con identidad del código.

Un segundo programa privado, que lee los CSV directamente de los ZIP y usa
fracciones racionales sin importar el motor, contrasta93orígenes,
5.385diferencias históricas,270probabilidades,89etiquetas y los tres Brier.
Resultado PASS. Original y contraste se conservan sin sobrescribir.

## Qué continúa

Cerrar un piloto de **referencia**, usando la frecuencia sencilla, sigue siendo
posible sin fingir que el candidato aprobado existe. Esa decisión sería una
adaptación explícita posterior a este ensayo y requerirá un contrato nuevo:
benchmark fijado, evaluación prospectiva frente a persistencia, política de
resolución y límites de uso. No se cambia la puerta de AV132 ni se promueve al
candidato descartado. Priorizar el sello independiente y la captura de fuentes
para esa referencia; no abrir otra familia de modelos para buscar un ganador.

La primera fecha de resolución4/12/2026 sigue siendo condicional a una emisión
válida antes de noviembre; no es una promesa de utilidad. Cero emisiones y
cero scores prospectivos. MAC-03/04 permanecen PARCIAL/NO.
