# Señal externa ICSA: experimento binario descartado

28/10/2026. Hipótesis: las solicitudes iniciales de subsidio contienen señal
adicional para anticipar una subida de al menos0,2pp del desempleo a dos meses.
Se adquirieron819vintages de ICSA de ALFRED;4.523intervalos, unidades Number,
ajuste estacional y frecuencia semanal sábado. Originales privados con huella.

## Diseño publicado antes de ejecutar

[Contrato](../../research/psychohistory/macro_claims_v1.json), publicado en
`a1ed4f3df42b5d04495dd280efd4b8d99cca2ce2`. En cada corte25del mes anterior
al objetivo: comparar media de cuatro últimas semanas publicadas con las
cuatro anteriores; tensión si la razón supera1,10. Ocho semanas consecutivas,
última no anterior a14días; reconstrucción por intervalos ALFRED.

Para entrenar: últimos60meses calendario de orígenes históricos, mínimo48casos,
con variables fijadas en cada origen y etiquetas conocidas al corte actual.
Probabilidad del grupo con prior12hacia frecuencia global de esos targets.
Comparadores: frecuencia de targets pasados, referencia operativa de60cambios
UNRATE y persistencia0. Criterio previo: Brier al menos5%menor que ambas
frecuencias y estrictamente menor que persistencia. Una fórmula, sin búsqueda.

## Resultado

| Medida | Resultado |
|---|---:|
| Casos pareados |90|
| Eventos |16|
| Brier candidato ICSA |0,155182602|
| Brier frecuencia de targets |0,151561715|
| Brier referencia operativa |0,152789108|
| Brier persistencia |0,177777778|

**Descartado:** no mejora las referencias. Sólo5casos activan tensión, con2eventos;
los85restantes contienen14eventos. Esto limita la evidencia sobre episodios
intensos y no autoriza buscar otro umbral en esta muestra. El resultado no
prueba que toda información de solicitudes sea inútil.

Octubre2025 carece de etiqueta y noviembre/diciembre2025 no cumplen mes base.
Los comparadores se puntúan en los mismos90casos. La muestra y el entrenamiento
difieren de AV152/133; no presentar sus diferencias de Brier como mejora pareada
sobre esos experimentos. Ningún nuevo pronóstico fue emitido.

## Verificación y alcance

Seis pruebas analíticas cubren umbral exacto, revisiones posteriores, semanas
incompletas/viejas, intervalos ambiguos, etiquetas aún desconocidas y ventana
calendario. Un programa independiente lee los CSV originales y usa fracciones:
verifica184orígenes de entrenamiento, señales, selección temporal, probabilidades,
etiquetas y los cuatro Brier. PASS. Informe privado SHA256:
`12727745e64d33df38736e44c31bfd599a26326e4f3144ec01ba1b8eff7f720c`.

Historia ya conocida y utilizada en experimentos previos; exploratorio, meses
solapados y16eventos, sin confirmación ni capacidad predictiva demostrada.
Vintages diarios ALFRED no equivalen a bytes de primera publicación de la fuente.
Fuentes: [ICSA](https://alfred.stlouisfed.org/series?seid=ICSA) y
[formatos ALFRED](https://alfred.stlouisfed.org/help/downloaddata).
