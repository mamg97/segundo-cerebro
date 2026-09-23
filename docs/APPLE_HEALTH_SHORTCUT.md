# Apple Health → Segundo Cerebro — Atajo de iPhone

## Objetivo

Enviar a Segundo Cerebro únicamente el resumen energético necesario:

- calorías activas;
- calorías en reposo;
- total derivado;
- fecha del día resumido.

No se envían frecuencia cardiaca, ubicación, pasos, sueño ni entrenamientos.

## Requisitos

1. Apple Health ya recibe actividad del Apple Watch.
2. El Worker `segundo-cerebro-health-ingest` está desplegado.
3. Se ha ejecutado en el Mac:

```sh
cd private-cloudflare
npm run setup:health-ingest
```

El comando valida el Worker, comprueba la protección Bearer y muestra una URL y un token una sola vez. Esos dos valores se guardan en el iPhone y nunca se copian a Git o a un chat.

## Estrategia recomendada

Primero crear y ejecutar manualmente un atajo para **ayer**. Usar ayer evita enviar un día incompleto y permite verificar el circuito extremo a extremo con datos ya cerrados.

Después de validar el flujo, crear una automatización personal diaria por la mañana que ejecute el mismo atajo. Si en el futuro se necesita balance casi en tiempo real, se puede añadir una segunda sincronización del día actual sin cambiar la API.

## Atajo: `Segundo Cerebro · Energía ayer`

### 1. Fecha objetivo

- Acción: obtener fecha actual.
- Ajustarla restando 1 día.
- Formatearla como `yyyy-MM-dd`.
- Guardar ese resultado como la fecha que se enviará.

### 2. Calorías activas

Añadir `Buscar muestras de Salud` / `Find Health Samples`:

- Tipo: **Calorías activas** / **Active Calories**.
- Fecha de inicio: ayer.
- Sin límite de una sola muestra.

Pasar el resultado a `Calcular estadísticas` / `Calculate Statistics`:

- Operación: **Suma**.

Guardar el resultado como `activeKcal`.

### 3. Calorías en reposo

Repetir el bloque anterior:

- Tipo: **Calorías en reposo** / **Resting Calories**.
- Fecha de inicio: ayer.
- Estadística: **Suma**.

Guardar el resultado como `restingKcal`.

### 4. Crear el JSON

Añadir una acción `Diccionario` con:

```text
date         → fecha YYYY-MM-DD
activeKcal   → suma de calorías activas
restingKcal  → suma de calorías en reposo
```

No hace falta enviar `totalKcal`: el Worker lo calcula como activa + reposo cuando ambas existen.

### 5. Enviar al Worker

Añadir `URL` con la URL privada mostrada por `setup:health-ingest`.

Después añadir `Obtener contenido de URL` / `Get Contents of URL`:

- Método: `POST`.
- Cuerpo de solicitud: `JSON`.
- JSON: el diccionario anterior.
- Cabecera:
  - nombre: `Authorization`
  - valor: `Bearer <TOKEN_PRIVADO>`

No introducir el token en ninguna otra acción que lo muestre o registre.

### 6. Primera ejecución manual

Ejecutar el atajo desde la app Atajos.

La primera vez iOS puede pedir permiso para leer las categorías de Salud y para acceder a la URL. Conceder únicamente los permisos necesarios.

La respuesta correcta del Worker tiene esta forma conceptual:

```json
{
  "ok": true,
  "date": "YYYY-MM-DD",
  "activeKcal": 0,
  "restingKcal": 0,
  "totalKcal": 0
}
```

Los números reales dependen de Apple Health.

Después comprobar en Segundo Cerebro → Salud → Nutrición que el día enviado utiliza la energía de D1.

## Automatización diaria

Cuando la prueba manual sea correcta:

1. Atajos → Automatización.
2. Crear automatización de **Hora del día**.
3. Ejecutarla cada mañana, por ejemplo a las 06:30.
4. Acción: ejecutar `Segundo Cerebro · Energía ayer`.
5. Configurar ejecución inmediata/sin preguntar.
6. Permitir ejecución con el dispositivo bloqueado si iOS lo solicita.

La sincronización de la mañana consolida el día anterior una vez Apple Health ha tenido tiempo de cerrar sus muestras.

## Validación

La integración se considera completada cuando:

- el Atajo obtiene valores distintos de vacío;
- el Worker responde `ok: true`;
- D1 contiene la muestra del día;
- Salud → Nutrición muestra el gasto total;
- el balance se calcula como `kcal consumidas - kcal gastadas`;
- si existe una fila manual del Sheet para la misma fecha, gana la muestra más reciente de D1.

## Seguridad

- El token Bearer no se guarda en Git.
- El token no debe enviarse por chat, email ni capturas.
- Si el token se expone, volver a ejecutar `npm run setup:health-ingest`; el secreto queda rotado.
- El endpoint `/health` solo expone estado técnico mínimo.
- `/v1/energy` rechaza peticiones sin token.
