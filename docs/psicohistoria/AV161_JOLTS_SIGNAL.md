# Señal de vacantes JOLTS: mejora insuficiente

28/10/2026. Hipótesis adicional: el descenso de vacantes conocidas contiene
información sobre una subida posterior de desempleo. Contrato publicado antes
de adquirir la fuente en `a3e4c200a5d20cf001cb901557e11ebd858fbe3b`.
Antes del cálculo, `e303498b` corrige dos textos heredados de ICSA sobre reloj
y ausencias; fórmula, parámetros, fechas y criterios permanecen iguales.

## Diseño y procedencia

ALFRED JTSJOR: Rate, mensual, ajustada estacionalmente. Archivo privado:
188meses ene2011–ago2026,641intervalos,189vintages seleccionados. SHA256:
`73922929d881fb694a905448f8cb1b6880f301ec2063af77285ac7d78b1b47ed082f`.
Las tasas admiten decimales0–100; no son miles enteros de PAYEMS.

Corte25del mes anterior al objetivo y emisión hipotética26. La base UNRATE
es objetivo−2meses; la última referencia JOLTS debe ser objetivo−3. Son dos
relojes distintos. La señal es descenso en puntos de la tasa de vacantes
durante tres meses, dividido por0,5pp y limitado a[-3,3]. Intervalos de cada
origen congelados y etiquetas iniciales sólo conocidas al corte de entrenamiento.
Si falta la referencia requerida o hay otra más reciente, omisión pareada.

Un único beta no negativo, intercepto logit de frecuencia Beta(1,1) fijo,
suma de pérdida Bernoulli +beta²/2,60meses calendario/min48etiquetas.
Sin búsqueda de escala, lag, regularización, submuestras ni periodos.
Criterio previo: Brier al menos5%menor que AMBAS frecuencias y menor que
persistencia. Superarlo sólo justificaría otro protocolo prospectivo.

## Resultado pareado y decisión

93objetivos mensuales2019–sep2026;91calculables y90con etiqueta puntuable,
16eventos. Nov/dic2025sin entradas admisibles; oct2025sin etiqueta inicial,
por lo que todos los comparadores lo excluyen del score.

| Candidato JOLTS | Frecuencia etiquetas | Frecuencia operativa | Persistencia |
|---:|---:|---:|---:|
|0,145534412|0,151494912|0,152789108|0,177777778|

Mejoras3,934%y4,748%frente a las frecuencias: **descartado por criterio previo**.
Estar cerca del5%no autoriza rebajarlo. Los años2022–24pasan individualmente,
pero se conserva toda la muestra, incluida pandemia; elegirlos después de ver
el resultado no valida el modelo. Historia inspeccionada y selección adaptativa.

## Verificación y límites

Siete pruebas cubren fuente/escala decimal/intervalos y reloj distinto,
exclusión de revisiones y etiquetas futuras, ausencias y transformación en pp.
Con dependencias:28PASS. Un programa independiente reconstruye181orígenes
con rawCSV/Fraction y verifica los91ajustes mediante Newton/Hessiano frente a
bisección: selección, coeficientes, probabilidades y los cuatro Brier de90casos
coinciden. Informe privado SHA256:
`ebbe6f062e330f5960244b9d64655801faa587ff466a232aaf04ff695795bae0`.

No emisión, cambios a cohortes existentes ni habilidad prospectiva demostrada.
La coherencia ALFRED no acredita los bytes originales de publicación BLS.
Conservar este negativo, no rescatar parámetros ni presentarlo como ganador.
