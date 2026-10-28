# Pronóstico numérico de desempleo: ridge descartado

28/10/2026. Nueva pregunta tras los ensayos binarios: estimar directamente el
cambio de la primera tasa mensual ALFRED frente a la base conocida dos meses
antes. Es una exploración adaptativa sobre historia ya vista, no confirmación
ni una modificación de las probabilidades ya emitidas.

## Contrato previo y comparadores

Fórmula publicada en `59351f31a455ff23c711c06cc4f009f26feddf3b` antes del cálculo.
Dos entradas: cambio de la tasa conocida entre base y base−2meses, y logaritmo
del ratio de solicitudes ICSA de las últimas cuatro semanas frente a cuatro
previas. Variables de cada origen congeladas; sólo etiquetas cuya publicación
inicial se conocía al corte25, anterior a emisión hipotética26.

Ridge con intercepto sin penalizar, pérdida cuadrática MEDIA + suma de
pendientes estandarizadas al cuadrado; lambda1fija. Centrado/desviación
poblacional sólo de entrenamiento;60meses calendario, mínimo48casos. Sin
recortar ni modificar predicciones extremas. Objetivo y errores en puntos
porcentuales de desempleo, no en logaritmos ni Brier.

Comparadores: cambio cero (mantener base) y cambio medio de las etiquetas
históricas conocidas. Regla previa: RMSE al menos5%menor que ambos y MAE no
superior a persistencia. No seleccionar hiperparámetros ni subperiodos.

## Resultado global pareado

| Error (puntos porcentuales) | Ridge | Mantener tasa | Cambio medio |
|---|---:|---:|---:|
|RMSE|2,071630083|1,671774943|1,702353557|
|MAE|0,650186292|0,557303371|0,588585150|

**Descartado:** empeora ambas referencias.89casos puntuables; se excluyen
nov/dic2025 y feb2026 por entradas incompletas, para todos los comparadores.
Frente al ensayo binario hay un caso menos porque también exige la tasa de
base−2meses. No comparar directamente errores con sus90meses.

La pandemia se conserva; explica gran parte del error y no autoriza quitarla.
2024pasa la regla descriptiva anual, pero escogerlo después de observarlo no
valida el modelo completo. Ni quitar años ni ajustar lambda tras el fallo.

## Verificación y consecuencia

Cinco pruebas nuevas: objetivo numérico/primera edición, base anterior a
revisión, etiquetas futuras, huecos/antigüedad y regla conjunta RMSE/MAE.
Seis pruebas del ridge/reloj semanal reutilizado también pasan. Dos fixtures
iniciales de prueba se corrigieron antes del cálculo: fechas semanales sin
huecos y ejemplo analítico que realmente supera RMSE pero falla MAE.
Otro programa reconstruye181orígenes desde CSV/Fraction y resuelve89sistemas
3×3 por eliminación gaussiana: selección, predicciones, niveles y seis
métricas coinciden. PASS. Informe privado SHA256:
`a964ab86a785cdc95872b7b637a2085a888b2079538dbfd6e1b237874183f106`.

No demuestra habilidad prospectiva ni origen binario de documentos BLS.
La pareja de fuentes desempleo/solicitudes no produce por ahora un candidato
admitido; conservar referencias y piloto semanal autorizado. Una nueva
candidata necesita información adicional o hipótesis independiente, no otra
variante elegida para rescatar estas fórmulas. No cambia emisión mensual,
cohorte anual ni resolución prevista; no hay forecast nuevo.
