# Apple Health → Segundo Cerebro — Atajo de iPhone

## Estado

Integración validada end-to-end el 2026-09-23.

Flujo confirmado:

```text
Apple Watch → Apple Health → Atajo iPhone
→ segundo-cerebro-health-ingest
→ Service Binding
→ segundo-cerebro
→ D1 health_energy_daily
→ Salud / Nutrición
```

La prueba real devolvió `ok: true` y la UI mostró el gasto recibido con origen `apple_health`.

## Atajo operativo

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

Usar la URL privada generada por `npm run setup:health-ingest`:

```text
https://segundo-cerebro-health-ingest.mamg97.workers.dev/v1/energy
```

Añadir `Obtener contenido de URL`:

- Método: `POST`.
- Cabecera `Authorization`: `Bearer <TOKEN_PRIVADO>`.
- Cuerpo: `JSON`.
- Campos:
  - `activeKcal` → variable `activeKcal`.
  - `restingKcal` → variable `restingKcal`.

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

Estado: backend preparado; configuración del iPhone pendiente de auditoría de fuentes Zepp/Zepp Life.

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

### Auditoría previa obligatoria

Para cada tipo de dato corporal:
1. abrir Salud;
2. abrir el tipo concreto;
3. entrar en `Fuentes de datos y acceso`;
4. confirmar si Zepp, Zepp Life u otra fuente aparece como contribuyente;
5. revisar alguna muestra real y su fecha.

Apple indica que en `Fuentes de datos y acceso` solo aparecen fuentes que contribuyen a ese tipo de dato.

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
