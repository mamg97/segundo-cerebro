# AV136 — Contrato adaptado de referencia mensual

24/10/2026. Protocolo prospectivo separado de los candidatos descartados AV121 y
AV133. Se elige frecuencia simple después de conocer AV133: selección post hoc
reconocida. No se repite un backtest ni se convierte el ensayo conocido en una
confirmación. Ninguna predicción calculada con fuentes reales en este avance.

## Especificación congelada

`macro_monthly_reference_v1.json` fija doce objetivos: noviembre de 2026 a octubre de 2027.
Evento: primera tasa nacional BLS de desempleo civil desestacionalizado del mes
objetivo menos tasa base archivada al emitir, mayor o igual a 0,2 puntos porcentuales.
Base=objetivo − 2 meses. Sesenta meses finales candidatos para diferencias de dos meses;
se omiten pares con extremos ausentes, sin imputación; mínimo 48 pares.
Probabilidad Beta(1,1)=(eventos+1)/(pares+2). Comparador persistencia p=0.

La referencia elimina explícitamente la exigencia de lag de momento del ensayo
pareado anterior: ese lag no participa en su fórmula. Las ausencias siguen
excluyendo sus pares. Cambia la cobertura; no se reutiliza el score de AV133 como
resultado del nuevo contrato. No se ajustarán parámetros durante la cohorte.

Fuentes oficiales capturadas entre los días 19 y 25 del mes anterior, con bytes/hash, prueba
externa antes del corte del día 25 23:59:59 UTC y procedencia privada. La última referencia
observada debe ser la base requerida. Selector ALFRED diario; un hash comprobado
por el CLI no prueba por sí solo captura, origen ni disponibilidad temporal.

Emisión el día 26 entre las 00:00 y12:00 UTC, tras cerrar el corte. Se concreta la hora 12:00 del
plan anterior como plazo máximo; la hora efectiva debe quedar atestada y registrada.
Nunca etiquetar la hora prevista como emisión realizada. Si falta cualquier gate,
registrar omisión de ese objetivo; no sustituirlo, retrasarlo ni retrofecharlo.

## Resolución y revisión

Capturar la primera publicación Employment Situation de BLS dentro de 48 horas de
su publicación efectiva. Captura tardía queda MISSING_INITIAL salvo evidencia
independiente de la primera edición. Una demora del comunicado conserva estado
pendiente, nunca evento 0. Las correcciones se conservan como sensibilidad separada;
el resultado primario y la base emitida no se sobrescriben con revisiones.

Revisión tras 12 objetivos, mínimo 10 resueltos y 2 de cada clase; comparar Brier pareado
contra persistencia y exigir al menos10 % de mejora relativa para pasar la comparación
preliminar. Si Brier del comparador es 0, skill relativo no está definido y no pasa.
Publicar cobertura/omisiones/eventos/errores individuales. No parada opcional ni
búsqueda de otros parámetros. Doce objetivos no demuestran utilidad general ni
justifican recomendaciones de decisión.

## Implementación y pruebas

`macro_monthly_reference.py` prepara cálculos privados, nunca emisiones. Conserva
numerador/denominador exactos, pares/exclusiones, hash del contrato y código.
CLI exige hash del protocolo y original ALFRED, y no escribe dentro de Git ni
sobrescribe informes. Todas las puertas prospectivas permanecen falsas.
Seis pruebas sintéticas: serie plana, igualdad exacta del umbral, falta de lag,
pares insuficientes, datos futuros/base equivocada y entradas inválidas. Las siete
pruebas del candidato anterior siguen pasando sin cambiar sus archivos.

MAC-01/03 PARCIAL/NO. Siguiente: ejecutar fuentes privadas fijadas una vez publicado
este contrato; conservar un borrador y completar captura/sello/registro antes del
plazo. El cálculo preparatorio no constituye una emisión en PsicoPredicciones.
