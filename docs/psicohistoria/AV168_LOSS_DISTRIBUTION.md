# AV168 · Distribución de pérdidas a 20 sesiones

29/10/2026. Estudio independiente de la logística descartada: distribución de
escenarios con simulación histórica filtrada por volatilidad, frente a los
mismos bloques históricos sin filtrar. No se cambia el modelo AV166.

[Contrato previo](EQUITIES_LOSS_DISTRIBUTION_CONTRACT.md), publicado en
`398c81ae` antes del cálculo. Se conservan los dos cuantiles y el criterio:
la versión filtrada queda **descartada por el filtro fijado**. No seleccionar
el cuantil favorable ni cambiar la ventana de volatilidad tras ver resultados.
Intervalos y cobertura no permiten declarar precisión futura estable.

El objetivo es la mayor pérdida respecto al origen en los próximos cierres,
distinta de una caída pico-valle. Escenarios usan bloques consecutivos del
pasado y volatilidades rezagadas; la ES incluye masa fraccional en la frontera
de la cola. Una cobertura VaR aceptable tampoco validaría por sí sola la ES.

Siete pruebas nuevas: colas conocidas, pérdida respecto al origen, cambio
de todo el futuro, referencia degenerada y CLI privada exclusiva. Contraste
independiente CSV/NumPy reproduce escenarios, cuantiles, ES, métricas,
excedencias y decisión. Informes y resultados completos permanecen privados.
No hay emisión, modelo admitido, P/L o estimación de riesgo actual.

La prueba utiliza la misma historia revisada que AV166; no añade observaciones
económicas independientes. No es una validación del fondo cuya admisión de
fuente sigue bloqueada en AV167. Preservar ambos negativos y las fuentes.

Siguiente paso útil: resolver procedencia/metodología de una fuente actual y
definir evaluación futura de referencias, o formular una hipótesis con
información adicional. No variar estos parámetros para salvar el candidato.
