## Estado de prioridad revisado · 18/10/2026

**APLAZADO POR DECISIÓN DE INVESTIGACIÓN.** Esta línea es una aplicación
eventual del método PSICOHISTORIA, no una prioridad del laboratorio.
La PR #639 permanece en `main` como código genérico probado únicamente
con precios **sintéticos**, sin ejecución con precios reales, sin
operaciones y sin signals. No dedicar nuevos sprints bursátiles hasta
acreditar un modelo central de fenómenos colectivos con validación
real `as-of`, comparación fuerte y alguna evaluación prospectiva
adecuadamente resuelta. Véase
[PUERTA_EVIDENCIA_CIENTIFICA_V1.md](PUERTA_EVIDENCIA_CIENTIFICA_V1.md).

---

# PSICOHISTORIA — F1B · Investigación bursátil (primer experimento)

**18/10/2026 · Modelo de riesgo de renta variable · sin emisiones, ni operaciones.**

## Pregunta falsable de la versión 0.1

¿Puede una logística que utiliza exclusivamente precios de cierre históricos
mejorar una frecuencia histórica suavizada para anticipar si, durante
las **20 próximas sesiones bursátiles**, algún cierre ajustado estará
al menos **5 % por debajo** del cierre ajustado actual?

Esto **no** pronostica la rentabilidad de mañana, el precio objetivo,
los beneficios de una acción ni la pérdida máxima intradía.
`adjusted_close` es una proxy histórica del precio económicamente
comparable; los ajustes futuros por dividendos/splits pueden requerir
revisión as-of, y una cartera real no compra/vende al cierre histórico
ya observado sin fricción.

**Objetivo fijo**:
`y_t = 1[min(adjusted_close_{t+1}...adjusted_close_{t+20}) / adjusted_close_t <= 0.95]`.

**Features disponibles al cierre de t**: retorno logarítmico 5 sesiones,
retorno logarítmico 20 sesiones, volatilidad realizada de 20
sesiones (desviación típica logarítmica escalada a 20 sesiones)
y drawdown actual desde el máximo de los últimos 60 cierres ajustados.

**Modelo piloto**: regresión logística con regularización L2 fija
(`ridge=.1`, `iterations=50`) reutilizando el solver testeado
de PSICOHISTORIA. Estandarización exclusiva con entrenamiento disponible.
**Baseline obligatorio**: probabilidad de evento histórica de entrenamiento,
suavizada Laplace `(eventos+1)/(N+2)`; sin ajustar hiperparámetros por el test.

**Validación**: walk-forward creciente, mínimo 252 ejemplos con
horizonte completamente maduro, test cada 20 sesiones (ventanas
de eventos test sin solapamientos), purga de todas las etiquetas
cuyo final es posterior al instante de emisión del test.
Los factores y normalizador de cada fold se entrenan solo con
datos disponibles a ese cierre. Informar Brier modelo vs
baseline **sobre la misma submuestra** y cantidad de ejemplos
no modelables por ausencia de ambas clases.

**Importante**: un filtro de 20 sesiones para madurez de etiquetas no
demuestra que el proveedor ofreciera estos precios ajustados en cada
fecha histórica; se exige evidencia de proveedor, fecha de obtención y
correcciones corporativas. Solo usar un CSV de un activo con filas
`date,asset_id,adjusted_close`, fechas estrictamente ascendentes,
positivas, checksum SHA-256 externo exacto y `source-asof`.
El código **no descarga datos** ni valida autenticidad del proveedor.

## Entregables

- `research/psychohistory/equities_drawdown_research.py`:
  lectura privada con checksum, creación privada de reporte CSV
  cronológico y JSON opcional `latest_shadow`.
- `test_equities_drawdown_research.py`: datos sintéticos, fallo de
  duplicados/orden/precios no finitos/checksum y **mutación completa
  de datos futuros** para comprobar que no cambian estimaciones anteriores.
- No métricas reales todavía: solo tests ficticios. Nada se
  añade a `PsicoPredicciones`, MIDAS o cartera real.
- El JSON más reciente se etiqueta `SHADOW_NOT_ISSUED`,
  `outcome=null`, sin fecha firmada, sin autorización de trading.

Ejemplo de ejecución **solo en entorno privado autorizado**:

```bash
python3 research/psychohistory/equities_drawdown_research.py \
  --input-csv /PRIVATE/history_adjusted.csv \
  --source-sha256 SHA256_EXACTO_DE_LOS_BYTES_PRIVADOS \
  --source-asof 2026-10-18 \
  --output-csv /PRIVATE/walkforward_oos_new.csv \
  --latest-shadow-json /PRIVATE/latest_new.json
```

La salida solo imprime agregados, jamás cotizaciones, identificadores,
rutas ni holdings. Un `latest_shadow` no significa una predicción
emitida en la fecha del último cierre.

## Ruta a capacidad económica real

| Etapa | Prueba de aceptación |
| --- | --- |
| Diseño piloto | Features, objetivo, horizonte, baseline y tratamiento as-of congelados |
| Datos observados | Cotizaciones reales identificadas por proveedor, licencia, fechas, ajustes y hash; delistings/universo histórico si se amplía a varias acciones |
| Backtest | Comparación OOS por periodos alcistas y bajistas; error de calibración, Brier, prevalencia y falsos avisos |
| Comparación económica | Costes, spread, slippage, dividendos, impuestos si proceden, sensibilidad de umbrales y simulación de ejecución **a partir de la siguiente sesión** |
| Prospectividad | Señales almacenadas antes del horizonte, resultados solo cuando maduren; paper trading sin orden real |
| Escalado | Comparación contra buy-and-hold, baselines de riesgo y validación entre activos sin selección a posteriori |

No confundir el proyecto bursátil con MIDAS:
`midas-paper-lab` mantiene **sus estrategias paper propias** y no
puede considerarse validación del modelo de PSICOHISTORIA.
Conectarlos solo mediante una interfaz explícita read-only cuando
ambos contratos y procedencias estén demostrados.

**Siguientes hipótesis (todavía NO implementadas)**:
`P(retorno_20d>0)` y predicción de volatilidad realizada 20 sesiones.
Las variables macro, resultados empresariales, sentimiento, opciones
y geopolítica son candidatas científicas, **no** features actuales.

Referencias metodológicas:
- <https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-47>
- <https://www.crsp.org/wp-content/uploads/guides/CRSP_US_Stock_%26_Indexes_Database_Data_Descriptions_Guide.pdf>
