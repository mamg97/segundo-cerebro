# Experimento macro: frecuencia condicionada descartada

28/10/2026. Un ciclo completo: hipótesis, fórmula congelada y publicada,
pruebas, ejecución única, contraste independiente y decisión.

## Hipótesis y diseño previo

Condicionar la frecuencia de subidas de desempleo al signo del último cambio
mensual podría mejorar el evento de subida de al menos0,2pp a dos meses de la
base. Tres estados: bajada, estabilidad y subida. Para cada cambio histórico,
el estado se calcula en su mes inicial; nunca en el final que contiene el
resultado. Así se evita extrapolar linealmente la magnitud de un salto.

Ventana60finales mensuales, mínimo48pares disponibles. Referencia suavizada
`p0=(k+1)/(n+2)`. Candidato `p=(k_estado+12*p0)/(n_estado+12)`: fuerza12fijada,
sin búsqueda. Sin estado actual no se puntúa ningún comparador; sin estado de
un análogo, éste permanece en la frecuencia general pero no en el grupo
condicional. Sin imputar ni cambiar el reloj mensual ALFRED del archivo.

Regla fijada: Brier al menos5%menor que frecuencia y estrictamente menor que
persistencia0. Un resultado favorable exigiría protocolo futuro separado.
Contrato/código publicados en5ea46fb19baf705ea13bbd8e914e4c5a0b055d92 antes
de ejecutar resultados, dentro de esta misma rama. La historia ya había sido
inspeccionada en otros experimentos: esto no es un test confirmatorio.

## Resultado y decisión

| Medida | Resultado |
|---|---:|
| Orígenes |93|
| Casos pareados |89|
| Eventos |16|
| Brier candidato |0,1591811023|
| Brier frecuencia |0,1541404670|
| Brier persistencia0 |0,1797752809|
| Mejora relativa vs frecuencia |−3,27%|

**Descartado.** Supera persistencia, pero empeora la frecuencia sencilla y
no cumple el criterio previo. No se ajusta fuerza, señal o ventana tras ver
el resultado. Sólo2021 favorece al candidato frente a frecuencia en el
desglose anual; eso no rescata el resultado agregado.

La muestra difiere de AV133: entra marzo2026 y sale enero2026 por el rezago
de un mes. No comparar sus Brier como mejora directa sobre el antiguo modelo.
Octubre2025 carece de etiqueta; noviembre/diciembre2025 no cumplen mes base;
enero2026 carece de señal. Ambas referencias usan los mismos89casos nuevos.

## Verificación y límites

Seis pruebas analíticas: cálculo exacto manual, señal al inicio, traslación de
niveles, dato futuro, ausencias y comparación pareada. Otro programa lee
los CSV originales directamente y usa fracciones racionales, sin importar
el motor: verifica93orígenes, probabilidades, etiquetas y los tres Brier.
Informe privado SHA256:
`5eb4fc3d7321d261d9efdf0ac1185736a28ba16f09541a58b47fd8f95c6e446a`.

Los originales ALFRED y sus hashes no se sustituyen. La primera observación
ALFRED no acredita bytes iniciales BLS. Hay16eventos, meses dependientes y
reutilización de historia; ninguna habilidad futura ni probabilidad emitida.
El piloto prospectivo original permanece separado.

## Siguiente decisión

Se detiene esta familia de ajustes al desempleo aislado. La próxima hipótesis
necesita una señal económica adicional y evidencia temporal utilizable, con
una sola regla fijada antes de evaluar. Priorizar solicitudes iniciales de
subsidio de desempleo como señal candidata; primero probar disponibilidad
as-of y cobertura, con presupuesto acotado, sin búsqueda de ganadores.
