# Distribución de pérdidas a 20 sesiones · contrato previo

29/10/2026. Nueva pregunta de riesgo: ¿cuánto puede caer la riqueza en los
próximos 20 cierres, en lugar de limitarse a una probabilidad binaria?
Esta unidad no modifica la logística descartada AV166 ni sus parámetros.
El mecanismo es simulación histórica filtrada por volatilidad, sin regresión
de etiquetas. La elección se hace tras observar otros resultados: exploratoria,
no confirmatoria, y reutiliza historia conocida, sin nueva muestra independiente.

## Datos y definición

Reutilizar ZIP Fama–French diario original ya fijado por SHA en AV166; mercado
agregado, Mkt−RF+RF y cadena de retorno total. Mismo tramo desde2000 hasta
30sept2026. Primera prueba desde primera sesión>=1ene2010, cada20sesiones,
sólo horizontes maduros completos. No aplica al SPY bloqueado ni al riesgo hoy.

Pérdida máxima en cierres futuros respecto al origen:
`L=max(0, 1−min(exp(sum(r[1:k]))) para k=1..20)`.
No drawdown pico-valle, precio intradía, pérdida de una cartera ni P/L operativo.

## Dos distribuciones predefinidas

Para cada origen, usar exactamente los1260retornos diarios anteriores e
incluido el de ese cierre (cinco años bursátiles aproximados). Construir TODOS
sus bloques consecutivos de20retornos:1241escenarios, sin selección o semilla.

1. Referencia histórica sin filtrar: cada bloque conserva sus log-retornos.
2. Filtrada: para cada retorno pasado r[i], innovación z[i]=r[i]/sigma[i−1],
   sigma[j]=desviación poblacional de los20retornos hasta j. Suelo1e−6 fijado,
   sin recortar innovaciones. En cada escenario futuro usar sigma[origen]*z[i].
   Mantener orden del bloque, sin supuesta independencia diaria y sin ajustar
   drift o calibración al resultado. Ambos métodos usan las mismas fechas.

Cuantiles de pérdida90% y95%: inversa empírica, orden ceil(q*N), sin
interpolación. ES95: media de la cola superior exacta5%, con ponderación
fraccional de la observación de frontera. Son resúmenes de escenarios, no
garantías de pérdida máxima ni intervalos de confianza del riesgo verdadero.

## Evaluación y decisión fijadas antes de ejecutar

- Pérdida pinball pareada paraq=.90 y.95, cada una en las mismas ventanas.
  Informar excedencias estrictasL>q, severidad de excedencias y ES95 sin llamar
  a ésta validada por un test de cobertura VaR. No seleccionar un cuantil.
- Periodos descriptivos2010–14,2015–19,2020–22,2023–26. Bootstrap pareado
  de bloques móviles12orígenes,1000réplicas,semilla20261029, condicionado a
  historia revisada y a esta especificación; no cubre revisiones o selección.
- Filtro exploratorio: al menos100casos; pinball filtrada al menos5%menor
  que histórica en AMBOS cuantiles, y excedencias no superiores a20% paraq90
  o10% paraq95. Estos techos son descartes de mala cobertura, no certificados
  de calibración. Si no cumple, DESCARTADO sin cambiar ventanas/filtro/suelo.
  Si cumple, PROMETEDOR_RETROSPECTIVO, nunca admisión ni utilidad demostrada.
- Sin compras/ventas, costes, señales bursátiles, TSR o PsicoPredicciones.
  La prueba de utilidad económica y los resultados futuros siguen pendientes.

Entregar pruebas de escenarios/colas/ausencias/futuro, CLI privada, informe
íntegro y contraste NumPy independiente de escenarios y métricas. Una PR
agrupada y registro canónico únicamente con el permiso de almacenamiento vigente.
