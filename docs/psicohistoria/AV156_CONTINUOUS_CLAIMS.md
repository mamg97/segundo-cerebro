# Señal ICSA continua: incremento insuficiente

28/10/2026. Ensayo adaptativo y exploratorio posterior a AV153. Su señal binaria
sólo se activó cinco veces; aquí se pregunta si la magnitud aporta información.
No es una validación independiente de la historia ya inspeccionada.

## Regla fijada antes de calcular

Contrato publicado en `a7ebed2147e3f78f0b7594613411484665282dfd`.
Objetivo original: primera tasa mensual ALFRED al menos 0,2 puntos porcentuales
por encima de la base conocida dos meses antes. Cortes 25/emisión ficticia26,
cuatro semanas de solicitudes frente a las cuatro anteriores; etiquetas y
variables históricas congeladas en cada origen. Sin emisiones reales.

La variable continua es log(ratio)/log(1,10), limitada previamente a [-3,3].
El logit de la frecuencia Beta(1,1) actúa como intercepto fijo. Se estima una
única pendiente no negativa minimizando la SUMA de pérdidas logarítmicas más
beta²/2. Entrenamiento de60meses calendario, mínimo48casos conocidos al corte.
No se optimizan escala, límites, regularización ni ventana. El umbral binario
heredado sirve sólo para describir la señal y nunca entra en este ajuste.

## Decisión global

90casos pareados,16eventos. Brier:

| Candidato continuo | Frecuencia de etiquetas | Frecuencia operativa | Persistencia |
|---:|---:|---:|---:|
|0,151413172|0,151561715|0,152789108|0,177777778|

Mejora0,098%frente a frecuencia de etiquetas y0,901%frente a frecuencia
operativa; ambas inferiores al5%exigido. **Descartado.** No basta con mejorar
unas décimas de milésima después de explorar varias fórmulas. Todos los años,
incluido2020, permanecen en el resultado; no rescatar un subperiodo favorable.

## Evidencia y límites

Seis pruebas nuevas cubren solución estacionaria analítica, frontera de
pendiente cero, monotonía, escala, estabilidad numérica y exclusión de
etiquetas futuras. Otras seis protegen el reloj/base ICSA reutilizados.
Un programa independiente reconstruye184orígenes desde CSV con fracciones y
resuelve los90ajustes con Newton/Hessiano, en lugar de la bisección del motor.
Probabilidades, coeficientes, selección y cuatro Brier coinciden: PASS.
Informe privado SHA256:
`86a9e5304af0b36b3515c5ae3e0eb7118e980c537ed8c829f41b0086beaa58d8`.

No acredita bytes originales BLS, habilidad prospectiva, causalidad ni valor
para inversión. Se conserva el ensayo sin retuning, no se altera el piloto
semanal de referencias ni las emisiones mensual/anual ya registradas.
