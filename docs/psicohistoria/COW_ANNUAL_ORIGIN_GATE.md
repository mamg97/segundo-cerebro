# PSICOHISTORIA — La selección país-año de COW y la fuga del 1 de enero

**19/10/2026 · Investigación AV-035 (pendiente de integración hasta CI y merge).**

## Semántica documentada — no confundir panel anual con roster en origen

El [codebook oficial de COW State System Membership v2024](https://correlatesofwar.org/wp-content/uploads/State-System-Membership-Codebook-V2024.pdf),
página 2, define `system2024` como país-año si el Estado estuvo
presente **en cualquier momento del año**. Por tanto:

- **Conjunto anual `ANY_TIME_YEAR`:** códigos COW con al menos un
  día de pertenencia entre el 1/01 y el 31/12 del año.
- **Roster enero 1 `ISSUE_DAY`:** códigos presentes el 1/01 del año.
- **Roster año completo `FULL_YEAR`:** pertenencia desde el 1/01
  hasta el 31/12, un criterio aún más restrictivo.

Un origen hipotético del 1/01 no puede equipararse al conjunto
`ANY_TIME_YEAR`, porque incluye códigos que se incorporaron
posteriormente. Tampoco puede sustituirse por `FULL_YEAR`,
que se basa en conocer si un Estado desapareció después del origen.

**Cuidado con sucesiones:** en 2006 COW código 345 cambia de
abreviatura dentro del año por la desintegración del Estado previo.
El codebook oficial lo documenta en su página 3. El auditor
distingue número de código y par código-abreviatura, pero **ninguno
es automáticamente identidad territorial homogénea**.

## Auditor reproducible

`research/psychohistory/cow_annual_origin_gate.py` valida
el `states2024` obtenido de una
[copia pública fijada a commit académico](https://github.com/brentonk/us_diplomatic_missions/tree/0dda0ef93b7958f67c79031c1695dd9e5408a62c/input)
con SHA-256 observado en octubre 2026:
`722153b45eda9c39826a04aab80ca7b29a8b1cfdfe5d92714503420555675484`.

Reconstruye la **regla publicada** de `system2024` a partir
de intervalos de Estados. **No descarga ni compara los bytes del
CSV oficial `system2024`**: la validez del procedimiento
sigue siendo una reproducción de su regla documental, no un
cotejo de tablas oficiales ni una validación de los bytes históricos.

Su salida pública solo contiene números agregados por año.
Tiene controles explícitos para:
- incorporación posterior a enero, salida durante el año y cambios
  de abreviatura bajo un mismo código;
- códigos ambiguos simultáneamente el 1/01, con salida no evaluable
  en lugar de elegir una identidad;
- año posterior a 2024, fuente censurada sin extrapolar.

### Puertas imposibles de superar con estos datos

`source_as_of_verified=false`,
`official_system2024_year_rows_independently_verified=false`,
`cross_system_country_id_concordance_verified=false`,
`country_negative_labels_verified=false`,
`backtest_authorized=false`,
`models_scored=false` y `forecast_issued=false`.

Los datos COW v2024 se anunciaron en
[noviembre de 2025](https://correlatesofwar.org/news/state-system-membership-update-v2024/);
aunque la pertenencia se reconstruya para 1990/2006/2011/2024,
la edición utilizada **no existía como fuente publicada en esos
orígenes de enero**. Los hashes tomados en 2026 no prueban
disponibilidad de los mismos bytes en décadas anteriores.

No se crean negativos UCDP por ausencia de incidentes ni se
modifica la cohorte shadow 2027.

## Verificación programada

[Workflow empírico](../../.github/workflows/psychohistory-cow-annual-origin.yml):
una sola descarga pública efímera de `states2024`, comparación de
1990, 2002, 2006, 2008, 2011, 2020, 2024 y 2025, eliminación
de los bytes del runner sin artifacts ni cron. Tests unitarios con
Estados ficticios y sucesiones ambiguas.

**Siguiente hito:** contrastar, si resulta accesible, el fichero
oficial `system2024` directamente y certificar su regla real de
representación de códigos repetidos; localizar fuente territorial
independiente y efectivamente disponible antes de cada origen,
además de evidencia de cobertura UCDP incluyendo Estados sin sucesos.
