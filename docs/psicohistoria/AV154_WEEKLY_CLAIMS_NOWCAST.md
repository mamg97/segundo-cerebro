# Nowcast semanal ICSA: ridge descartado

28/10/2026. Pregunta distinta del desempleo mensual: anticipar el primer dato
ALFRED de la próxima semana de solicitudes aún no publicada. La semana puede
haber terminado; es nowcasting de una publicación, no predicción de despidos
futuros ni de una recesión.

## Diseño anterior al cálculo

Contrato/código publicados en96af9f875039fbed6c761c41f245f2b9d3ceff67 antes
de ejecutar. Origen miércoles, corte martes previo, última observación sábado.
Se descartan etiquetas publicadas el miércoles o antes por el límite diario
ALFRED. Exige52semanas consecutivas de variables conocidas y base más reciente.

Ridge con dos variables: logaritmo del último dato frente a media52semanas y
cambio logarítmico semanal. Entrenamiento156semanas calendario, mínimo104casos,
con etiquetas conocidas al corte y variables congeladas en su propio origen.
Escalado sólo de entrenamiento; penalización1sobre pérdida media; intercepto
sin penalizar. Sin búsqueda de hiperparámetros. Comparadores: último dato y
media de cuatro semanas. Criterio: error cuadrático medio logarítmico en raíz
al menos5%menor que ambos; MAE logarítmico como descripción secundaria.

## Resultados pareados

| Medida | Ridge | Último dato | Media4semanas |
|---|---:|---:|---:|
| RMS de error logarítmico |0,160920158|0,149747919|0,198270547|
| Media de error absoluto logarítmico |0,063589539|0,061206726|0,080544073|

381casos puntuables de404objetivos2019–sep2026;15excluidos por etiqueta no
posterior al día de emisión y8por variables incompletas. Ningún excluido se
puntúa para un comparador. Estas cifras son errores en escala logarítmica,
no porcentajes de acierto ni puntos porcentuales de desempleo.

**Descartado:** empeora persistencia. El año2026 cumple la regla individual,
pero elegirlo después de observar el desglose no valida el resultado global.
Se conserva2020 y todos los demás años; no ajustar regularización ni ventanas.

## Verificación y límites

Seis pruebas analíticas cubren solución ridge conocida, características
constantes, invariancia del escalado, entrenamiento sin etiquetas futuras,
publicación temprana y métricas pareadas. Otro programa reconstruye el panel
CSV y resuelve las ecuaciones3×3 por eliminación gaussiana independiente:
381predicciones, selección temporal y seis métricas coinciden. PASS.
Informe privado SHA256:
`208edb768468e90a34a931d1623a08f953a1ebddce28ff57b3336ea61eaa6c7a`.

Es historia conocida, ensayo exploratorio y observaciones dependientes.
La primera versión del archivo ALFRED no acredita los bytes iniciales del
Departamento de Trabajo. Ninguna emisión, promoción del modelo mensual,
validación prospectiva ni recomendación de inversión.

Siguiente unidad: preparar piloto semanal explícito de las dos referencias
sencillas para capturar resultados con rapidez. Requiere contrato, fuentes
actuales y autorización temporal propios; no promover al ridge descartado.
