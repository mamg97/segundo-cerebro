# Primera evaluación bursátil real a20sesiones · contrato29/10/2026

Reapertura expresa del propietario: prioridad riesgo bursátil a20sesiones.
El aplazamiento18oct queda superado para este estudio; agenda queda secundaria.
Contrato fijado antes de descargar el archivo diario o calcular resultados.
Una sola ejecución principal, sin rescatar parámetros después del resultado.

## Fuente y objetivo exactos

Biblioteca primaria KennethR.French, Fama/French3Factors diarios, edición
CIZ ofrecida hoy. La página declara cobertura hasta30sept2026. Descargar sólo
del enlace CSV de la biblioteca y conservar ZIP, notas, fechaUTC y SHA256.
Es material de investigación publicado con copyright Fama/French: acceso
gratuito, uso privado de investigación con atribución; no licencia abierta
ni permiso de redistribución de originales o uso comercial. No comprar datos,
no subir originales, curvas o valores reales al repositorio público.

Mercado agregado estadounidense de la definición oficial deRm−Rf; sumar RF
en puntos porcentuales y dividir por100. Cadena de riqueza W con base100:
W[t]=W[t−1]*(1+(Mkt−RF[t]+RF[t])/100). No usar Mkt−RF solo. No es cotización
ETF, S&P500, valor de cartera ni precio ejecutable. El objetivo es la caída
de esta proxy de retorno total, no precio sin dividendos ni drawdown intradía:
min(W[t+1:t+21])/W[t] <=0.95. El código debe etiquetar esta distinción.

Biblioteca reconstruye/revisa historia y cambió FIZ aCIZ; la edición actual
no demuestra disponibilidad histórica en cada origen. El estudio es
RETROSPECTIVO_REVISADO_EXPLORATORIO, nunca emisión ni prueba as-of.
No inventar cotizaciones posteriores al último dato ni estimar riesgo actual
desde un origen viejo. La fecha de captura no es primera publicación.

## Diseño congelado

- Usar datos desde primera sesión>=2000-01-01 hasta2026-09-30, sin rellenar
  faltantes ni extrapolar; validar secuencia original íntegra antes de recortar.
- Primera prueba: primera sesión>=2010-01-01. Después cada20sesiones del
  archivo válido, sólo ventanas objetivo completas. Entrenamiento creciente
  desde2000 con lookback60 y etiquetas maduras20sesiones. Mínimo252etiquetas.
  Orígenes de entrenamiento diarios dependientes; pruebas sin solapamiento
  de retornos futuros no significan independencia económica.
- Reutilizar cuatro variables del piloto: log-retorno5/20, volatilidad
  poblacional de20log-retornos escalada sqrt20 y caída desde máximo60.
  Normalizar sólo con entrenamiento disponible. Logística L2=.1,50iteraciones,
  convergencia del solver canónico; fallo impide puntuar, no ajustar el modelo.
- Comparadores en exactamente las mismas pruebas: frecuencia Laplace creciente;
  frecuencia Laplace de últimas252etiquetas maduras; logística sólo volatilidad
  con igual regularización, normalización y ventanas. Sin ajustar al test.
- Brier principal pareado. Informar número de eventos/casos, logloss con
  recorte1e-12 sólo para log,5bins de calibración fijos [0,.2,.4,.6,.8,1],
  alertas exploratorias p>=.20 (precision/recall/falsaalarma, sin seleccionar).
- Bloques descriptivos2010–14,2015–19,2020–22,2023–26; no seleccionar ganadores
  de cada bloque. Bootstrap pareado de bloques móviles12orígenes,1000réplicas,
  semilla20261029; condicionado a la historia revisada, sin cubrir selección
  del mercado, especificación ni errores de proveedor.
- Filtro exploratorio: al menos100pruebas y20eventos; Brier candidato al
  menos5%menor que AMBAS frecuencias y menor que volatilidad sola. Si falla,
  DESCARTADO por ese filtro, sin retocar. Si pasa, PROMETEDOR_RETROSPECTIVO,
  no modelo admitido ni señal utilizable. Intervalos se informan sin confundir
  filtro histórico con significación confirmatoria o beneficio económico.

## Cierre completo

Intake estricto probado con archivos ficticios, ZIP/CSV/codebook fijados,
CLI real privada, comparación independiente de transformación, etiquetas,
variables, normalización/ajuste y scores. Archivar informe íntegro, incluidos
negativos. UnaPR agrupada con decisión, canónico privado releído y límites.
No PsicoPredicciones, sellos, órdenes, broker, MIDAS ni conexión a patrimonio.
La utilidad futura exigirá fuente actual verificable, emisiones anteriores
al horizonte, resultados maduros y una decisión concreta con costes.

Fuentes primarias:
- https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html
- https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/Data_Library/f-f_factors.html
