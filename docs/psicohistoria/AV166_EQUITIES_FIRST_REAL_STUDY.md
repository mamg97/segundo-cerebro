# AV166 · Primera evaluación bursátil real

29/10/2026. La prioridad humana reabre la línea de riesgo bursátil a 20
sesiones. Se conserva el prototipo anterior y se ejecuta un estudio completo
con la fuente de investigación diaria de Fama–French, sin comprar datos.

El [contrato previo](EQUITIES_REAL_MARKET_FIRST_STUDY.md) quedó publicado en
`08913fdd07913aef34c754c1f2c20bf3571868a2` antes de descargar el archivo.
No se cambiaron ventana, variables, regularización ni criterio después de
conocer el resultado. La logística de cuatro variables queda **descartada
por el filtro fijado**; no hay modelo admitido ni emisión bursátil.
Informe, observaciones, métricas, periodos e intervalos permanecen privados.

## Qué se ha verificado

- ZIP original, descripción del mercado y notas archivados con huellas.
- Lectura estricta de la edición, fechas, filas y valores ausentes; retorno
  del mercado reconstruido como Mkt−RF más RF, en las unidades correctas.
- Proxy de riqueza con dividendos, distinta de una cotización ETF o índice
  de precios. No es precio ejecutable ni valor patrimonial personal.
- Comparación pareada con frecuencia creciente, frecuencia reciente y
  logística que usa sólo volatilidad. Purga de etiquetas aún no maduras,
  normalización con entrenamiento y cuatro periodos descriptivos fijos.
- Bootstrap pareado de bloques y avisos con umbral predefinido. Una mejora
  de media no acredita estabilidad; ningún periodo permite rescatar el modelo.
- Quince pruebas del piloto y nuevo estudio: integridad, datos futuros,
  cambios de etiquetas, tratamiento de una sola clase y CLI privada exclusiva.
- Contraste independiente desde CSV original con cadenas logarítmicas y
  álgebra lineal NumPy, sin importar el motor del proyecto: identidades,
  etiquetas, ventanas, cuatro comparadores y decisión coincidentes.

La historia está revisada y se reconstruye periódicamente. Las observaciones
del proveedor no son una auditoría independiente del calendario de bolsa.
No se ha demostrado disponibilidad histórica as-of ni se estima el riesgo
actual con datos retrasados. No hay P/L, operaciones, broker o integración
con MIDAS. Los originales macro y anual siguen intactos.

## Siguiente paso

Conservar este resultado negativo. La utilidad exige una fuente actual
verificable, previsiones anteriores al horizonte, resultados posteriores y
una decisión con pérdidas y costes explícitos. La siguiente unidad debe
aportar un mecanismo u objetivo distinto; no afinar este candidato con los
resultados ya conocidos. El avance de software no completa EQ-05 o EQ-06.

La CI valida exclusivamente fixtures sintéticos. La ejecución real, el
contraste, la escritura/relectura del registro y la comprobación del frontal
privado deben acreditarse aparte; no se deducen de un merge.
