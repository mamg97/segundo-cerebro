# PSICOHISTORIA — AV-052 · Linaje histórico UCDP/PRIO 19.1 vs 25.1

**19/10/2026 · Experimento de revisión retrospectiva, NO un backtest.**

## Problema preregistrado

En el panel fijo de 10.130 pares GW-año de 1946–2017, UCDP Onset antiguo y UCDP25.1 difieren en 85 casos donde el antiguo marca onset1=1 y las variantes modernas por país y por conflicto marcan 0. De ellos, 61 marcan además **newconf=1 en el archivo antiguo**, mientras que las dos variantes modernas registran newconf=0. Esta diferencia tampoco se explica ajustando únicamente el periodo de inactividad.

## Nueva fuente independiente de indicadores onset

El [catálogo histórico UCDP](https://ucdp.uu.se/downloads/olddw.html) enlaza versiones 19.1 y 25.1 del **UCDP/PRIO Armed Conflict Dataset**. Según el [codebook original 19.1](https://ucdp.uu.se/downloads/ucdpprio/ucdp-prio-acd-191.pdf), la unidad es **conflicto-año**: `conflict_id`, `year`, `type_of_conflict` y `gwno_loc` describen la historia y el lugar de la incompatibilidad política.

- `type_of_conflict=3` es intrastatal y `4` es intrastatal internacionalizado.
- `gwno_loc` identifica Estados a los que se refiere la incompatibilidad, **no necesariamente el lugar físico del evento**. Cuando existen varios, se separan por coma.
- La documentación UCDP diferencia explícitamente un conflicto de una **díada** entre gobierno y organización rebelde. Por ello no es científicamente válido tratar un ID de conflicto compartido como prueba de que dos registros de `newconf` son equivalentes.
- [UCDP advierte sobre cambios de sistema de IDs desde 17.1](https://ucdp.uu.se/downloads/); ambas fuentes 19.1 y 25.1 usan identificadores posteriores al cambio, pero pueden existir reasignaciones o recodificaciones entre ediciones. La coincidencia numérica es únicamente candidata.

## Experimento

`research/psychohistory/ucdp_prio_conflict_lineage_av052.py` obtiene los dos ZIP oficiales desde sus enlaces **descubiertos en el índice**, sin inventar rutas, y vuelve a comprobar los SHA-256 ya fijados de los tres CSV UCDP Onset utilizados en AV-049/051. Los nuevos SHA-256 de ACD 19.1 y 25.1 se consignan solo como identidad de bytes **observados ahora**, no como prueba de depósito previo a julio de 2020.

No publica ningún país, ID de conflicto, historia individual o fila. Dentro del runner efímero, construye conjuntos `(GW, año) → {conflict_id}` a partir de conflictos internos tipos 3–4. Para las 61 claves ya fijadas calcula categorías agregadas:

- Hay al menos un conflicto interno ese año en ambas ediciones.
- Hay conflicto interno solo en 19.1 o solo en 25.1.
- No aparece un conflicto interno en ninguna.
- Si ambas versiones contienen conflictos, cuentan como dos clases adicionales las coincidencias de al menos un identificador numérico y las no coincidencias.

El resultado es evidencia de **presencia/ausencia de actividad declarada por edición**, no un veredicto sobre un conflicto real ni la prueba del origen del evento. Las fechas de la copia revisada son posteriores al origen hipotético de 2020; `gwno_loc` tampoco constituye un roster de países sin conflicto, por lo que **ningún backtest ni emisión prospectiva quedan autorizados**.

## Ingeniería y reglas adversariales

Se añade `test_ucdp_prio_conflict_lineage_av052.py` con escenarios enteramente ficticios: sustitución de enlaces del catálogo, ZIP inseguro, esquema incorrecto, año/violencia incompatible con la edición, país con dos conflictos simultáneos, coincidencia numérica compartida vs recodificada, y rechazo de usar una mini-muestra como el denominador de 10.130.

Workflow `.github/workflows/psychohistory-prio-conflict-lineage.yml` ejecuta las pruebas y el contraste real sin persistir archivos, generar pronósticos, entrenar modelos, introducir secretos o costear infraestructura.

## Dependencias posteriores

1. Si las fuentes muestran que algunos registros antigua=1/nueva=0 desaparecen como **conflicto activo** de UCDP/PRIO, cuantificar su relación con la revisión histórica; no atribuirla sin examinar díadas y cambios territoriales.
2. Si coinciden en el mismo año e ID en ambas ediciones pese a los flags distintos, investigar específicamente diferencias en la función de derivación de `newconf` y del historial de conflictos.
3. Buscar documentación histórica contemporánea y testigos independientes de bytes previos al origen; sin ello, `MAD-02` sigue `PARCIAL` y `PsicoPredicciones` permanece vacío. Las 1.176 probabilidades sombra privadas de 2027 no se tocan.
