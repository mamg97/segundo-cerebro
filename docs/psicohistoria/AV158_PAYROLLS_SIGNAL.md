# Señal adicional de empleo PAYEMS: descartada

28/10/2026. Ensayo adaptativo de información adicional: contracción del empleo
no agrícola conocido, distinta de solicitudes ICSA. Fórmula publicada en
`3f198808a40d3d5f7cc665a4e43217cd8e14c188` antes de adquirir sus intervalos.

## Fuente y reloj

Fuente oficial [ALFRED PAYEMS](https://alfred.stlouisfed.org/series?seid=PAYEMS),
BLS Current Employment Statistics, serie CES0000000001. Mensual, ajustada
estacionalmente, miles de personas. Archivo por periodos reales capturado el
28oct desde formulario público sin credenciales:190vintages seleccionados,
189meses ene2011–sep2026 y1707intervalos. SHA256 fuente:
`7cf7f71c93002ca56e47c80b1b6880f301ec2063af77285ac7d78b1b47ed082f`.

El motor valida hash, miembros, identidad/escala, enteros positivos, roster
mensual completo, primer release posterior al mes, orden y continuidad de
intervalos, y terminal abierto. Nunca interpreta miles como porcentaje.
En cada corte25, el último PAYEMS debe coincidir con la base UNRATE del
objetivo−2meses y existir base−3. No se usa historia revisada actual.

## Modelo único y criterio previo

Objetivo binario original: tasa UNRATE inicialmente publicada al menos0,2pp
por encima de base conocida dos meses antes. Variable de riesgo:
clip(log(PAYEMS(base−3)/PAYEMS(base))/log(1,01),−3,3). El logit de frecuencia
Beta(1,1) es intercepto fijo; una pendiente no negativa minimiza suma de pérdida
Bernoulli más beta²/2. Ventana60meses calendario, mínimo48etiquetas conocidas.
Se reutiliza solucionador probado, sin buscar escala/lags/lambda/periodos.

Regla: Brier pareado al menos5%menor que AMBAS frecuencias y menor que
persistencia. No basta con aprobar código ni ganar un año aislado.

## Resultado y decisión

90meses/16eventos:

| PAYEMS | Frecuencia etiquetas | Frecuencia operativa | Persistencia |
|---:|---:|---:|---:|
|0,153863270|0,151494912|0,152789108|0,177777778|

**Descartado:** empeora1,563%y0,703%las frecuencias. La frecuencia de etiquetas
no coincide exactamente con el ensayo ICSA porque cambian los orígenes de
entrenamiento elegibles. No presentar comparaciones entre ensayos como ganancia.
Ningún año satisface la regla completa; conservar pandemia y todos los casos.

## Verificación y límites

Cinco pruebas nuevas de procedencia, unidades/valores, intervalos, revisión
futura, disponibilidad y escala; junto a dependencias:26PASS. La lectura
UNRATE conserva sus parámetros por defecto y pruebas existentes.
Programa independiente reconstruye182orígenes desde CSV/Fraction y verifica
90ajustes mediante Newton/Hessiano frente a bisección: selección, coeficientes,
probabilidades y cuatro Brier coinciden. Informe privado SHA256:
`77a2936b6637908a09bb395c84f9eefdf588b9659db7b3bae44e9d6a64dd9d02`.

La fuente es otro instrumento del mismo sistema laboral y su edición original
BLS no está atestada; no son datos independientes de la economía. Historia ya
vista, selección adaptativa y observaciones dependientes: no confirmación,
causalidad, habilidad prospectiva ni emisión. Se preserva el piloto semanal
como referencia experimental. Ampliar investigación exige una nueva pregunta
sustantiva, no una búsqueda de parámetros para rescatar estos candidatos.
