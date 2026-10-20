# PSICOHISTORIA · AV-072 — Pregunta seleccionable y significado de los nodos

**20/10/2026.** Se incorporan seis preguntas de predicción **derivadas de la misma distribución de cuatro estados**, sin entrenar nuevos modelos.

| Pregunta anual | Estados que responden SÍ |
| --- | --- |
| ≥25 muertes estatales | 01 + 11 |
| <25 muertes estatales | 00 + 10 |
| Entrada en el episodio agregado | 01 |
| Salida | 10 |
| Persistencia | 11 |
| Bajo→bajo | 00 |

Cada estado resume dos años: 00 ambos <25, 01 anterior <25 y actual ≥25, 10 anterior ≥25 y actual <25, 11 ambos ≥25. Ninguno demuestra por sí mismo inicio de guerra ni ausencia de otras formas de violencia.

La pregunta se escoge en el encabezado del gráfico. El porcentaje de SÍ es la suma exacta de la probabilidad de sus estados, y NO es el complemento. No se altera la matriz, los niveles, los caminos, el entrenamiento ni la trayectoria real retrospectiva. Una columna de cuatro explicaciones alineadas con las cuatro filas de nodos indica el significado de cada nodo y cuáles contestan afirmativamente.

Preguntas sobre **inicio de guerras nuevas, decisiones de dirigentes y reuniones, mercados y empresas** aparecen explícitamente DESHABILITADAS hasta que exista fuente/modelo/validación adecuada. Prohibido presentar para ellas porcentajes derivados inapropiadamente del modelo de violencia estatal.

La información histórica de UCDP está revisada, no verifica disponibilidad as-of en cada origen. 2027 continúa shadow sin pronósticos emitidos. Pruebas de regresión: suma exacta de masas, semántica de estados, marcado, objetivos deshabilitados y aislamiento del motor.
