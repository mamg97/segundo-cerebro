# PSICOHISTORIA · AV-062 — Agendas institucionales y sinergias

**20/10/2026 · Estado:** diseño de aplicaciones, primer validador temporal sintético y panel privado basado en datos canónicos. **Ninguna predicción ni ingreso ni rentabilidad acreditados.**

## Identidad científica inalterada

- **V1 Cliodinámica:** estudiar factores estructurales históricos que podrían condicionar decisiones y cambios.
- **V2 Forecasting:** estimar outcomes acotados, con probabilidades, baselines y evaluación temporal de verdad.
- **V3 Agentes:** explorar posibles mecanismos de negociación, contagio o coordinación sin confundir simulaciones con pronósticos.
- **V4 Met laboratorio:** hashes, procedencia, pre-registro, filtrado as-of y falsación común.

Las ramas A1–A3 son **aplicaciones transversales**, no V5–V7, ni una teoría más precisa por decreto. El trabajo de onset/2027 y fuentes temporales sigue siendo prioridad del programa original. `PsicoPredicciones` sigue intacto.

## Hipótesis y capas

| Rama | Pregunta falsable | Entrada clave | Primera referencia | Salida todavía no autorizada |
| --- | --- | --- | --- | --- |
| A1 Agenda predictiva | ¿Aporta conocer reuniones/participantes públicos skill adicional al consenso histórico? | Agenda, lista pública confirmada, fecha publicación/captura y situación económica previa | Frecuencia condicional por institución/tema + calendario, ajustada sin test | Probabilidad de decisión institucional |
| A2 Transmisión financiera | ¿Predicciones pre-reunión + sorpresa frente al consenso anticipan una reacción negociable? | Decisiones, expectativa pre-evento, precios y exposición de compañías históricos | Event study por anuncio conocido, cambios controlados por índice/factor | Señal financiera y P/L |
| A3 Radar País | ¿Informes adaptados a exposición real mejoran decisiones de clientes? | Riesgos documentados, sectores, mercados y necesidades de clientes | Fuentes públicas y análisis manual trazable | SaaS comercial y predicciones certificadas |

**Condición conjunta:** avance comercial o financiero NO aumenta la madurez científica de V2. Skill de decisiones, reacciones y beneficios se mide por separado.

## Pipeline común y jerarquía de tiempo

`evento programado → observaciones públicas con fecha y captura → contexto histórico anterior → outcome institucional → sorpresa frente al consenso ex ante → transmisión a sectores/activos → evaluación`.

Cada registro admite `event_id`, `event_start_at`, `outcome_kind`, `published_at`, `captured_at`, `capture_sha256`, `url`, `kind` y, opcionalmente, referencia de testigo externo. Los sellos declarados manualmente no acreditan criptográficamente la fecha. El gate `agenda_asof.py` no realiza consultas remotas ni pronósticos: **rechaza material posterior al instante de emisión** y marca cualquier resultado solo como investigación con procedencia pendiente de verificación externa.

Aun con un documento fechado, no se puede deducir si un encuentro tuvo lugar, si fue privado, el contenido negociado o el resultado. Los participantes no públicos permanecen como desconocidos, nunca imputados.

## Cohorte de partida y criterio experimental A1

1. Elegir ANTES del muestreo un `outcome_kind` (ej. `rate_decision` o `trade_measure`), institución, universo, calendario, ventana anterior a reunión y reglas para aplazamientos/cancelaciones.
2. Obtener copias de agendas en dos estados: observación previa firmada por un testigo externo y resultados oficiales posteriores. Auditar tasa de agendas modificadas, canceladas o sin participantes públicos.
3. Registrar solo variables conocidas en el instante: documento observado, inflación/PIB de vintage original, declaraciones emitidas hasta fecha, relación entre asistentes documentados. Tratar ausencia de agenda como **desconocido**, no ausencia de reunión.
4. Baselines: prevalencia suavizada de entrenamiento, calendario previo, y para decisiones monetarias expectativa implícita del mercado medida **antes de la emisión**. Evaluación chronological blocked walk-forward, Brier/log-loss/calibración pareados, intervalos por eventos.
5. Comparar ablation `sin agenda` vs `con agenda` sin cambiar ejemplos ni hiperparámetros según resultados. Evaluar también el problema de que agendas no observables sesguen la muestra.
6. Guardar predicciones separadas de las hipótesis; jamás registrar un análisis retrospectivo como señal emitida. Bloquear uso financiero hasta superar controles económicos posteriores.

## Protocolo A2: sorpresa y monetización

- Event study con tiempos UTC documentados de anuncio y precio/consenso de snapshot previo, ventanas pre-registradas, retornos anormales netos de factores y sensibilidad a anuncios simultáneos.
- Medir no solo dirección sino magnitud/tiempo: spread, liquidez, slippage, coste, vencimiento y riesgo de cola. Contrastar con modelos sin agenda y con consenso del mercado. Controlar empresas descotizadas/sesgo de supervivencia.
- No se conectan carteras, posiciones, órdenes, API de broker ni datos personales a GitHub. MIDAS es potencial consumidor **read-only** cuando exista evidencia; F1B sintético continúa aparcado conforme a [puerta científica](PUERTA_EVIDENCIA_CIENTIFICA_V1.md).
- Ninguna operación financiera ni suscripción SaaS queda autorizada por este prototipo.

## Fuentes institucionales candidatas (verificar condiciones antes de ingesta)

- <https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm> (calendarios FOMC, comunicados y actas).
- <https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html> (consejo BCE).
- <https://commission.europa.eu/strategy-and-policy/decision-making-process/weekly-meetings-commission_en> (reuniones de la Comisión; verificar URL y cadencia).
- <https://www.consilium.europa.eu/en/meetings/> (reuniones Consejo UE).
- <https://www.lamoncloa.gob.es/presidente/agenda/Paginas/index.aspx> (agenda institucional española).
- <https://www.sec.gov/search-filings/edgar-application-programming-interfaces> (exposición empresarial, sujeto a licencia y fechas).
- Para expectativas financieras: verificar procedencia, coste y derechos de series de futuros/opciones. Nunca suponer histórico point-in-time al descargarlo hoy.

**Importante:** una página actual con actas/resultado NO es evidencia de que la información estuviera en la agenda antes de la reunión. Se requiere archivado auténtico, control de revisión y prueba temporal independiente.

## Laboratorio Virtual / grafo de sinergias

La pestaña `Ideas y sinergias` se alimenta exclusivamente de `/api/projects` (privado, Cloudflare Access) y de las filas `Proyectos/Documentacion/Relaciones`. Si faltan datos, anuncia ausencia; si existen, muestra líneas, próxima acción y conexiones. No introduce otro almacenamiento ni inventa scores. V1–V4, mapa neuronal y exploración de futuros quedan intactos.

**Criterios siguientes:** validar 2–3 snapshots reales de agendas con captura anclada; pre-registrar target y benchmark; abrir evaluación as-of; solo después estudiar respuesta financiera. Separación explícita de capacidad científica, utilidad empresarial y utilidad para trading.
