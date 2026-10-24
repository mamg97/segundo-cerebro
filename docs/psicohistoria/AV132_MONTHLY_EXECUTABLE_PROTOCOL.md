# AV132 · Contrato ejecutable mensual, previo al cálculo real

24/10/2026. Implementa el plan [AV131](AV131_MONTHLY_PILOT_AND_LEDGER_CLOCK.md).
No se han calculado resultados reales bajo este contrato al publicar esta versión.

## Contrato y admisión

`research/psychohistory/macro_monthly_protocol_v1.json`, SHA-256
`af73f77f90cbe8f92c2a23ca1af22a6c2d71d8da13344b9da948e7b4f10ef6ee`.

Ensayo retrospectivo exploratorio: todos los objetivos mensuales desde enero
2019 hasta septiembre2026, sin seleccionar meses por resultado. Corte: día25
anterior al objetivo; emisión hipotética día26 12:00 UTC, siempre anterior al
mes objetivo. Base obligatoria=objetivo−2; un retraso no altera el horizonte.
Los intervalos ALFRED se reconstruyen a cada corte; etiquetas iniciales se
consultan después de calcular las probabilidades, nunca como características.
La resolución histórica usa primera observación ALFRED, no acredita bytes
originales BLS ni disponibilidad intradía.

Como especifica AV131: 60 meses finales candidatos, parejas de extremos a dos
meses, mínimo48; frecuencia Beta(1,1), candidato de igual distribución con
momento lineal de tres meses proyectado dos meses, y persistencia con p=0.
Umbral exacto0,2pp con Decimal. Las parejas con un extremo ausente se excluyen;
una ausencia intermedia no invalida una diferencia entre dos extremos conocidos.
Se conserva el detalle de parejas y exclusiones.

Antes del cálculo se fija una puerta adicional de admisión: el candidato debe
tener Brier estrictamente menor que **ambos** comparadores sobre los mismos
casos para poder seguir hacia una emisión experimental. Si no supera esa
prueba se descarta esta versión y no se retoca para mejorar el resultado.
Superarla tampoco demuestra habilidad ni satisface los demás gates.

Es un diseño nuevo adaptado después de conocer el resultado negativo macro
semestral; no una réplica confirmatoria ni un rescate de aquel resultado.
Horizon­tes y parejas se solapan; no tratar los casos como independientes ni
presentar significación estadística. Se informan cobertura, eventos y años.

## Implementación y verificación

`macro_monthly_pilot.py` genera probabilidades sin recibir resultados futuros;
el evaluador añade las etiquetas después. Fuentes fijadas por los mismos hashes
originales usados en AV119/120. El CLI exige bytes y hash del contrato, valida
los ZIP antes de reconstruir, registra hashes de código, rechaza sobrescritura
y obliga a una salida privada fuera del repositorio. No tiene ruta ISSUED.

Siete pruebas sintéticas pasan: serie constante, igualdad con baseline sin
momento, umbral exacto y recuentos, ausencias, base adelantada/retrasada,
independencia respecto del resultado futuro, etiqueta prematura, reloj,
métricas pareadas y valores inválidos. No se ha ejecutado todavía la historia
real. Publicar y fusionar este contrato antes de ejecutar:

```sh
python3 research/psychohistory/macro_monthly_pilot.py \
  --protocol research/psychohistory/macro_monthly_protocol_v1.json \
  --protocol-sha256 af73f77f90cbe8f92c2a23ca1af22a6c2d71d8da13344b9da948e7b4f10ef6ee \
  --realtime /PRIVATE/realtime_periods_response.bin \
  --initial /PRIVATE/initial_release_response.bin \
  --output /PRIVATE/monthly_admission_v1.json
```

MAC-01/03 siguen PARCIAL/NO. Próximo: ensayo real inmutable y contraste
independiente; solo si supera admisión completar fuente actual, resolución
BLS, sello y ledger real. No se escriben predicciones ni se abre otra línea.
