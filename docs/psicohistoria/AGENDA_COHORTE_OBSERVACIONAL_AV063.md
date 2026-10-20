# PSICOHISTORIA — AV-063 · Primera cohorte institucional observacional

**Fecha:** 20 octubre 2026. **Estado:** dos reuniones reales registradas en privado; captura documental con sello externo y pronósticos todavía pendientes.

## Qué se ha observado

Se ha consultado el calendario oficial FOMC y el calendario del Consejo de Gobierno del BCE para identificar reuniones próximas. Los registros de investigación de ambas instituciones **residen exclusivamente en** `SEGUNDO CEREBRO - PROYECTOS` (pestañas privadas `PsicoAgendaEventos` y `PsicoAgendaFuentes`), con fecha de consulta diaria, URL oficial, ventanas de reunión, target candidato y bandera `NO_EMITIDA`. En GitHub no se versionan filas canónicas ni snapshots personales.

La observación de calendario **no** acredita un aviso previo de cambio de tipo, no demuestra disponibilidad histórica de las agendas antes de su publicación ni equivale a lista real de asistentes. No se conocen ahora los resultados futuros.

## Dos niveles de evidencia separados

| Nivel | Evidencia requerida | Disponible |
| --- | --- | --- |
| **Descubrimiento de calendario** | URL oficial permitida, fecha de consulta, reunión pendiente, outcome a investigar | **Sí**: dos fuentes oficiales consultadas |
| **Captura temporal verificable** | Bytes originales, SHA256, hora UTC de primera captura independiente, recibo externo verificable y historial de revisiones | **No**: los campos faltantes permanecen vacíos |
| **Predicción preanuncio** | Baseline/variables publicados ex ante, probabilidad sellada antes del anuncio | **No**: `PsicoPredicciones` intacta |
| **Evaluación** | Resultado oficial posterior, scoring pareado y cronología de disponibilidad | **No**: decisiones aún no resueltas |

El adaptador `private-cloudflare/src/psycho-agenda.js` es **read-only**, acepta exclusivamente referencias de calendarios de dominios oficiales, rechaza duplicados y estados ambiguos, y produce `forecastCount=0` aun ante fuentes reconocidas. La lectura adicional en `/api/research-lab` es opcional: si faltan pestañas/fuentes, la cohorte original 2027 no se interrumpe.

## Experimento predefinido A1.1 — decisiones monetarias

**Unidad:** reunión programada; **outcome candidato:** dirección del cambio en tasa oficial al finalizar el encuentro (sube, baja, mantiene). **Importante:** el esquema genérico `rate_decision` debe explicitar qué tasa (Fed: banda de tipos y criterio para target upper bound o midpoint; BCE: facilidad de depósito) y vigencia exacta antes de emitir. El outcome ordinal necesita un modelo diferente del binario anual de conflictos.

**Benchmark obligatorio:** consenso observable justo antes de la decisión y frecuencia de reuniones anteriores entrenada con ventana temporal; nunca comparar una expectativa derivada después del anuncio. Para evaluar valor de *agendas*, realizar un modelo sin agenda y otro con agenda sobre eventos idénticos y **cortes temporales idénticos**, usando walk-forward bloqueado por fecha. Asistentes privados o desconocidos son missing, no ceros.

**Regla:** cero predicciones reales hasta definición íntegra de tasas, snapshots point-in-time, baseline, versión del modelo y recibo independiente; cero órdenes / integración con MIDAS.

## Siguiente desarrollo priorizado

1. Crear un mecanismo privado de captura inmutable de las fuentes oficiales, con timestamp verificable independiente y comparación de revisiones, respetando condiciones de publicación.
2. Fijar qué tipo de interés/outcome se mide y recolectar datos previos con timestamp, sin inferir sorpresa de la agenda.
3. Medir cobertura, ausencias, revisiones y controles de retrovisión; luego emitir un pronóstico probabilístico genuinamente prospectivo, sin perseguir una probabilidad arbitraria.
4. En paralelo continuar reconstrucción temporal UCDP y sellado independiente 2027, que sigue siendo el objetivo científico troncal.

**Fuente principal oficial:** https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm y https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html.
