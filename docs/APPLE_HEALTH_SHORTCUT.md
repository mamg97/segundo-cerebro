# Apple Health → Segundo Cerebro — Atajo de iPhone

## Estado

Integración v2 validada end-to-end el 2026-09-24.

Flujo confirmado:

```text
Apple Watch / Zepp Life → Apple Health → Atajo iPhone
→ segundo-cerebro-health-ingest
→ Service Binding
→ segundo-cerebro
→ D1 health_energy_daily + health_body_samples
→ Salud / Resumen / Nutrición
```

La prueba real devolvió `201` en `/api/health/sync` y la API privada confirmó actividad, energía y composición corporal persistidas correctamente. El flujo unificado `/v1/sync` es ya el flujo operativo recomendado.

## Atajo operativo

El Atajo debe usar el endpoint unificado `/v1/sync`. `/v1/energy` queda solo como compatibilidad.

Nombre recomendado:

`Segundo Cerebro · Energía hoy`

### Energía activa

1. `Buscar muestras médicas`.
2. Tipo: `Energía en actividad`.
3. Fecha de inicio: `es hoy`.
4. Sin agrupar, ordenar ni limitar.
5. `Calcular estadísticas` → `Suma`.
6. Guardar el resultado en la variable `activeKcal`.

### Energía en reposo

Repetir el bloque anterior con:

- Tipo: `Energía en reposo`.
- Fecha de inicio: `es hoy`.
- Estadística: `Suma`.
- Variable: `restingKcal`.

### Envío

Usar la URL privada del Worker de ingestión:

```text
https://segundo-cerebro-health-ingest.mamg97.workers.dev/v1/sync
```

Añadir `Obtener contenido de URL`:

- Método: `POST`.
- Cabecera `Authorization`: `Bearer <TOKEN_PRIVADO>`.
- Cuerpo: `JSON`.
- Actividad: `activeKcal`, `restingKcal`, `steps`, `exerciseMinutes`.
- Composición corporal: listas paralelas `bodyMassValues` + `bodyMassMeasuredAts`, `bodyFatPercentageValues` + `bodyFatPercentageMeasuredAts`, `bodyMassIndexValues` + `bodyMassIndexMeasuredAts`, `leanBodyMassValues` + `leanBodyMassMeasuredAts`.
- Fuente común actual: `Zepp Life`.

No hace falta enviar `date`: el Worker usa la fecha local de Madrid.

No hace falta enviar `totalKcal`: el Worker suma activa + reposo.

## Permisos de iOS

Atajos puede advertir que la petición deriva de muchas muestras de Salud. Aunque el aviso enumere todas las muestras origen, el JSON configurado envía únicamente los dos totales agregados.

Para este Atajo se autorizó el envío al dominio privado del Worker.

## Automatización recomendada

Como el Atajo consulta `hoy`, la estrategia más simple es ejecutarlo automáticamente cerca del final del día.

Recomendación inicial:

- Hora: `23:55`.
- Frecuencia: diaria.
- Acción: ejecutar `Segundo Cerebro · Energía hoy`.
- Ejecución inmediata / sin preguntar.

Cada ejecución hace UPSERT sobre la fecha actual: D1 conserva una sola fila por día. Repetir el Atajo durante el día es seguro y simplemente sustituye el total anterior por una lectura más reciente.

### Limitación

Una ejecución a las 23:55 puede no incluir unos pocos minutos finales del día. Para el uso actual esa diferencia es irrelevante. Si en el futuro se necesita cierre exacto, se puede recuperar el día anterior con un Atajo específico sin cambiar el backend.

## Seguridad

- El token Bearer no se guarda en Git.
- El token no debe copiarse a documentación ni conversaciones.
- Si se expone, volver a ejecutar `npm run setup:health-ingest` para rotarlo.
- El endpoint `/health` expone solo estado técnico mínimo.
- `/v1/energy` rechaza peticiones sin token.

## Validación realizada

La integración se considera operativa porque se verificó:

- lectura de energía activa y en reposo desde Apple Health;
- suma de ambas categorías en Atajos;
- petición POST autenticada;
- respuesta `ok: true`;
- persistencia en D1 con una única fila por fecha y actualización idempotente;
- lectura posterior desde Salud → Nutrición;
- cálculo de gasto total y balance energético.


## Bridge v2 — actividad + composición corporal

Estado: operativo y validado end-to-end el 2026-09-24. Zepp Life está confirmado como fuente para peso, grasa corporal, IMC y masa magra en el Atajo actual.

El puente v2 amplía el mismo Worker y el mismo secreto. No se crea una segunda integración.

Nuevo endpoint recomendado para el Atajo:

```text
POST /v1/sync
```

El endpoint antiguo `/v1/energy` sigue operativo para compatibilidad.

### Estructura prevista

```json
{
  "activity": {
    "activeKcal": 0,
    "restingKcal": 0,
    "steps": 0,
    "exerciseMinutes": 0,
    "sampledAt": "ISO-8601",
    "sources": [],
    "workouts": []
  },
  "bodySamples": [
    {
      "type": "bodyMass",
      "value": 0,
      "unit": "kg",
      "measuredAt": "ISO-8601",
      "source": "source name from Apple Health"
    }
  ]
}
```

Tipos corporales admitidos por el backend:
- `bodyMass`
- `bodyFatPercentage`
- `bodyMassIndex`
- `leanBodyMass`

No incluir un tipo en el Atajo hasta confirmar que existen muestras reales en Apple Health.

### Auditoría de referencias en Atajos

Cada acción `Obtener Valor de Muestras médicas` y `Obtener Fecha de inicio de Muestras médicas` debe apuntar al bloque `Buscar muestras médicas` de su propia métrica. Al duplicar bloques, Atajos puede conservar la referencia al bloque anterior.

Se detectó y corrigió un caso real: `bodyFatPercentageValues` seguía apuntando al bloque `Weight`, por lo que enviaba el peso como porcentaje de grasa. La comprobación fiable es tocar la variable `Muestras médicas` → `Mostrar acción` y verificar que lleva al bloque correcto.

### Idempotencia

- actividad: una fotografía diaria, UPSERT por fecha;
- cuerpo: una muestra única por tipo + timestamp original + fuente.

Ejecutar varias veces el Atajo no duplica registros.

### Interpretación

- peso: conservar todas las muestras; usar media móvil de 7 días y cambio frente a los 7 días anteriores;
- grasa/IMC/masa magra de básculas de consumo: usar como tendencia;
- gasto del Apple Watch: informativo;
- nunca aumentar/reducir ingesta 1:1 según calorías del reloj;
- decisiones de GESTOR GYM Y NUTRI: usar tendencias de 7–14 días.

- The unified ingest also accepts parallel list fields from Shortcuts (`bodyMassValues` + `bodyMassMeasuredAts` + `bodyMassSources`, and equivalents for fat %, BMI and lean mass) so every same-day sample can be preserved without one HTTP request per sample.

- Nota de compatibilidad con Atajos: las listas corporales pueden enviarse como arrays JSON o como texto con un elemento por línea. Esto permite usar directamente variables mágicas de listas en campos de tipo Texto cuando el editor JSON de Atajos no admite enlazar una lista dinámica.

- Simplificación de composición corporal: el endpoint `/v1/sync` acepta `bodySource` como fuente común para `bodyMass`, `bodyFatPercentage`, `bodyMassIndex` y `leanBodyMass`, evitando repetir `Zepp Life` cuatro veces en Atajos.


## Corrección de pruebas erróneas

No es necesario borrar manualmente las muestras corporales erróneas generadas durante la configuración. `health_body_samples` es único por `metric_type + measured_at + source` y el backend usa `ON CONFLICT ... DO UPDATE`, por lo que una sincronización posterior correcta reemplaza el valor anterior para la misma medición en lugar de duplicarlo.

## Deuda técnica OAuth

El acceso Google usado por Salud se renovó temporalmente con el cliente OAuth existente de LITOS. Funciona, pero no es la arquitectura final. Crear un cliente OAuth propio de Segundo Cerebro y publicarlo fuera de modo Testing queda como tarea pendiente para eliminar esa dependencia y evitar caducidades de refresh token asociadas al entorno de prueba.
