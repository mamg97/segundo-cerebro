# PSICOHISTORIA — Predicciones mensuales externas y nueva frontera de utilidad

**18/10/2026 · F1 conflictos · V2 modelos/benchmarks · estado: sin validación propia de alertas mensuales.**

## Hallazgo que cambia la prioridad

VIEWS (*Violence & Impacts Early-Warning System*) publica gratuitamente pronósticos globales de
violencia estatal. Su modelo externo `fatalities003` produce:

- **Fallecidos previstos por país-mes:** `main_mean` (predicción puntual).
- **Probabilidad de al menos 25 muertes por combate por país-mes:** `main_dich`.
- **Horizontes 1–36 meses**, actualizados mensualmente, incorporando numerosas
  fuentes (UCDP, ACLED, Banco Mundial, V-Dem, PRIO-GRID, FAO).
- **Desagregación territorial** para África y Oriente Próximo (no cubierta
  por nuestro modelo país-año).

Según la [página de datos VIEWS](https://viewsforecasting.org/data/),
la release `fatalities003_2026_08_t01` emplea entradas hasta agosto
2026 y ofrece predicciones septiembre 2026–agosto 2029. Comprobar
en la propia web la release más reciente **antes de cada descarga**;
las páginas cacheadas pueden devolver snapshots anteriores.

**No son predicciones de PSICOHISTORIA.** Una predicción puntual de
fallecidos no es un recuento observado ni tiene necesariamente un
intervalo de confianza. En nuestro modelo anual se estima
`P(sb_total_deaths_best >=25 en TODO 2027)`, no una cifra de muertes.

## Capacidad implementada

`research/psychohistory/views_external_monthly.py` importa una descarga
**oficial ya almacenada en privado** del CSV country-month,
fijando release exacta y SHA-256; valida columnas e identidad
(country_id, GW/ISO), los 36 meses de cada país, duplicados,
cifras finitas y probabilidades dentro de [0,1]. Exige
`--asof-month YYYY-MM`, e informa exclusivamente de los tres
**meses naturales completos siguientes**, no de 30/60/90 días
exactos. Todo queda fuera de Git, con CSV create-only.

Ejemplo de uso bajo sesión/infraestructura privada autorizada,
sin exponer probabilidades ni imprimir país alguno:

```sh
python3 research/psychohistory/views_external_monthly.py \
  --input-csv /PRIVATE/fatalities003_2026_08_t01_cm.csv \
  --release fatalities003_2026_08_t01 \
  --sha256 SHA256_REVISADO_LOCALMENTE_DE_LA_DESCARGA_OFICIAL \
  --asof-month 2026-10 \
  --out-csv /PRIVATE/views_2026_11_through_2027_01.csv
```

El CSV incluye exclusivamente filas reales y **nunca las genera el
modelo propio**. Los meses completos siguientes a octubre 2026 son
noviembre, diciembre y enero. Al usar la release de agosto, el
desfase con el último dato es de 3, 4 y 5 meses respectivamente.
No fingir que la lectura equivale a información actualizada a octubre.

Para un país y un horizonte de tres meses, se puede sumar las
**predicciones puntuales mensuales de fallecidos**; no se pueden sumar
las probabilidades `main_dich` ni convertirlas en la probabilidad
de algún conflicto durante el trimestre sin un modelo de dependencia.
El fichero de salida las mantiene por mes. Tampoco se debe convertir
`main_mean_ln` en `main_mean` mediante una exponencial ingenua
de una previsión logarítmica.

## Competidores y límites

- El `fatalities003` de VIEWS es un **benchmark externo especializado**,
  no evidencia de habilidad de nuestro modelo.
- No comparar numéricamente su `P(>=25 BRDs/mes)` con el
  `P(>=25 muertes estatales/año)` de nuestra cohorte 2027:
  resolución temporal y definición exacta del objetivo son distintas.
- Exigir fuentes con versiones temporales, test prequential, calibración,
  balance entre falsos avisos y omisiones, y comparación rigurosa con
  referencias triviales y VIEWS antes de declarar un sistema de alertas
  nuestro.
- Para un modelo a 1–3 meses propio, UCDP Candidate conserva
  varias **releases históricas mensuales** desde 2021 que permiten
  organizar un dataset vintage-aware. Se necesitan fechas exactas
  por archivo, denominador de país-mes completo y un objetivo definido
  sin conocimiento futuro. El historial de 2018–2020 no tenía cobertura
  global uniforme.
- No basta con extraer noticias recientes y asignar manualmente un
  porcentaje. Variables potencialmente nuevas: movilización, cambios
  en violencia mensual, represión, economía, condiciones climáticas,
  desplazamiento y spillovers fronterizos; incorporar solo tras medir
  información accesible en cada fecha de emisión.

## ¿Cuándo nos será útil?

- **Ya:** el portal VIEWS permite consultar pronósticos mensuales
  externos de fallecidos y conflictos; no hace falta esperar a 2028.
- **Primer prototipo nuestro:** puede prepararse técnicamente tan
  pronto como exista un panel mensual fechado y reconstruible.
  No se promete una fecha, dado que falta medir disponibilidad,
  cobertura y habilidad fuera de muestra.
- **Predicción realmente útil:** solo si reduce errores de predicción
  frente a baselines relevantes y VIEWS, y demuestra robustez,
  calibración y coste de falsas alertas tolerable.
- **2027 propio:** el observatorio anual sigue `SHADOW_NO_EMITIDO`;
  incluso con sello futuro no habrá score prospectivo hasta release
  oficial que cubra 2027.

### Seguridad y privacidad

Las muestras de test son enteramente **ficticias**.
No se distribuyen CSV de pronósticos reales ni se extraen country IDs
de cuentas privadas. No hay conexión nueva en GitHub Actions,
descarga remota ejecutada por el módulo, cron, pagos, D1 ni escritura
en `PsicoPredicciones`. La importación real seguirá pendiente
hasta verificar los bytes de una descarga concreta del proveedor.

Referencias:
- <https://viewsforecasting.org/model/fatalities003/>
- <https://viewsforecasting.org/data/>
- <https://ucdp.uu.se/downloads/olddw.html>
