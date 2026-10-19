# PSICOHISTORIA — Observaciones negativas oficiales UCDP 24.1

**19/10/2026 · Avance 38. Fuente de resultados retrospectivos, no features as-of.**

## Nuevo hallazgo documental y de datos

El [codebook oficial UCDP OrganizedViolenceCY v24.1](https://ucdp.uu.se/downloads/organizedviolencecy/UCDP_OrganizedViolenceCY_Codebook_241.pdf)
indica expresamente que el conjunto cubre **1989–2023** e
incluye **todos los Estados Gleditsch–Ward existentes desde 1989**.
A diferencia de un CSV de **eventos positivos** Candidate, incorpora
**una fila por país–año y tres indicadores binarios** de existencia
de violencia: `sb_exist_cy`, `ns_exist_cy` y `os_exist_cy`.

También publica ceros en fatalidades para años sin fatalidades
codificadas. Su codebook advierte que el umbral UCDP de 25 muertes
por actor/díada-año puede excluir episodios reales anteriores
a superar dicho umbral. El valor 0 en UCDP, por tanto, **no es
evidencia de ausencia universal de toda violencia**.

## Validación directa de fuente oficial

El [ZIP oficial v24.1](https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy-241-csv.zip)
se descargó únicamente en runner GitHub Actions, sin registrar
datos por país ni subir CSV/ZIP al repositorio.

El auditor `research/psychohistory/ucdp_country_year_zeros.py`
comprueba hash SHA-256, integridad del ZIP, ruta interna segura,
único CSV, esquema obligatorio, unicidad de GW country_id + year,
años 1989–2023, flags binarios 0/1 y presencia de los 35 años.
Las únicas salidas son contadores agregados.

**Observación de la edición actual, octubre de 2026:**

| Métrica | Conteo |
|---|---:|
| Filas explícitas país–año | **6.740** |
| Años distintos | 35 |
| Países–año con `sb/ns/os_exist_cy` los tres 0 | **4.762** |
| Países–año con al menos un `sb/ns/os_exist_cy` = 1 | **1.978** |

| Año | Filas país–año | Tres indicadores 0 | Al menos un indicador 1 |
|---|---:|---:|---:|
| 1989 | 172 | 119 | 53 |
| 2006 | 194 | 150 | 44 |
| 2019 | 196 | 131 | 65 |
| 2020 | 196 | 134 | 62 |
| 2023 | 196 | 133 | 63 |

SHA-256 **observados hoy en 2026**, no en 2024:
- ZIP: `00410bdb65023d1bc8799f47f188677965046bb73447ee33094782db30076260`
- CSV original extraído: `3571f2c2a693e14c53bea95cbf4afa47009e054cd2a79b6e6e3d99cad935def8`

Las pruebas de CI con datos reales y tests sintéticos comprueban
integridad, hashes incorrectos, años fuera de cobertura, duplicados,
campos ausentes y ausencia de aprobación automática de backtesting.

## Tres observables distintos que NO deben intercambiarse

1. **Estado retrospectivo de violencia codificada**:
   UCDP OrganizedViolenceCY 24.1 proporciona indicadores explícitos
   0/1 por país y año. Esto es una fuente de *etiquetas observadas*,
   aplicables a su propia definición de GED.
2. **Inicio de un nuevo conflicto (onset)**:
   requiere un criterio de novedad, un historial previo suficiente
   y distinción entre persistencia y surgimiento. Un indicador 0/1
   en el año no constituye por sí mismo un onset.
3. **Predicción histórica as-of**:
   requiere que las features, el roster y los modelos estuvieran
   disponibles **antes del instante de emisión**. Una edición de
   2024, aunque describa 1989–2023, no se podía conocer en 2006.
   Sus etiquetas pueden usarse para resolver el pasado **después**
   de ocurrido, nunca para dotar de información futura al modelo.

No se infiere equivalencia entre GED anual 24.1 y Candidate
**mensual**, cuyos límites temporales y revisiones difieren.

## Puertas científicas pendientes

Los estados `covered_gw_states_verified_against_independent_vintage`,
`latest_monthly_candidate_equivalence_verified`,
`historically_available_before_issuance_verified`,
`source_as_of_verified`, `backtest_authorized`, `models_scored`
y `forecast_issued` permanecen **false**.

**Siguiente paso:** cotejar la cobertura oficial de este panel 24.1
frente a un roster GW históricamente fechado (no COW `ccode`),
construir onset con historial y elegibilidad estricta, y separar
fuentes anuales de resolución de las features genuinamente
conocidas en el origen. No emitir ningún nuevo Brier ni pronóstico
sin superar las puertas.
