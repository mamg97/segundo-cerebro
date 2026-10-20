# PSICOHISTORIA — AV-074 · Barra única de configuración del Explorador

**20 de octubre de 2026.** Se elimina la duplicación entre los selectores iniciales, las tarjetas de orígenes y el bloque aislado «¿Qué quieres predecir?».

## Comportamiento

En escritorio, una sola fila ordena **Sociedad · Predicción/origen · Modelo · Pregunta · Mostrar realidad · Calcular**. Los cuatro desplegables y el interruptor se presentan como un único formulario, encima del árbol y del aviso de backtest. El selector de predicción mantiene todos los catálogos registrados; las tarjetas duplicadas dejan de consumir altura. La explicación breve de la pregunta se mantiene en el resumen del árbol, pero ya no incluye ningún control.

Se conservan: años íntegros del árbol, nodo semántico, selección anual, cálculo en Worker privado, comparación de realidad posterior y metodología retrospectiva. Cambiar Sociedad/Predicción/Modelo consulta de nuevo el Worker; cambiar Pregunta solo agrega las probabilidades existentes de los cuatro estados; Mostrar realidad solo altera la superposición. El botón Calcular sirve para repetir explícitamente la consulta. El control se deshabilita mientras carga o no existen resultados históricos válidos.

En ventanas inferiores a 1160 px, la barra pasa a dos filas compactas; en móvil, a dos o una columna según espacio. Se mantiene el foco de teclado, el orden de navegación y los estados «Calculando» y «deshabilitado».

## QA

Las pruebas sintéticas verifican un único formulario, los cuatro desplegables, una sola casilla de realidad, un botón Calcular, procedencia del catálogo real, escapado de texto y ausencia de tarjetas duplicadas. La CI incluye pruebas regresivas del árbol completo, la evidencia retrospectiva y el respeto de los protocolos V1–V4 y 2027. No se cambian probabilidades, fuentes canónicas, posiciones financieras ni modelos.

**Limitación:** el test puede confirmar HTML/CSS y CI, pero la inspección visual dentro de la sesión de Cloudflare Access sigue siendo una verificación posterior.
