# AV-086 — Corrección de AV-085 y diagnóstico mensual verificable

21/10/2026. Investigación retrospectiva exploratoria sobre las **mismas dos
ventanas ya inspeccionadas**. No es un octavo modelo ni una confirmación nueva.

## Corrección científica obligatoria

AV-085 describió CY como «participación del país». Esa descripción es incorrecta
para **OrganizedViolenceCY**: sus codebooks 23.1 y 24.1, introducción y variables
`country_id_cy` / `sb_total_deaths_best_cy`, definen agregados de violencia
**dentro de las fronteras**, derivados de GED, con códigos Gleditsch-Ward.
La advertencia general del codebook GED sobre otros productos anuales no debe
trasladarse a CY sin consultar el codebook específico.

Fuentes primarias:

- [GED 23.1](https://ucdp.uu.se/downloads/ged/ged231.pdf), pp. 3 y 10/22.
- [GED 24.1](https://ucdp.uu.se/downloads/ged/ged241.pdf), variables y precisión temporal.
- [CY 23.1](https://ucdp.uu.se/downloads/organizedviolencecy/UCDP_OrganizedViolenceCY_Codebook_231.pdf), pp. 2–4.
- [CY 24.1](https://ucdp.uu.se/downloads/organizedviolencecy/UCDP_OrganizedViolenceCY_Codebook_241.pdf), pp. 2–4.

El contrato `ged_cy_source_contract.json` fija URL, tamaño y SHA-256 de los cuatro
PDF, observados el 21/10/2026. GED 23.1 cubre 1989–2022 y GED 24.1 1989–2023.
La fecha de extracción de la portada GED 23.1 dice 2022-03-22 pese a su cobertura
hasta diciembre 2022: se conserva como inconsistencia documental, **no** como
prueba de publicación. Ni fecha de evento, ni `source_date` periodística, ni
extracción UCDP equivalen a primera disponibilidad del archivo o emisión.

Reconciliación completa de ambas ediciones: **196/196** totales anuales de
muertes estatales GED (todas las precisiones) coinciden con CY del mismo año y
edición; **cero** discrepancias de nombres. Es una comprobación interna de
agregación y correspondencia geográfica, no evidencia independiente.
El lector detiene el diagnóstico si falla. Un incidente GED sigue siendo
distinto de una primera transición anual por el umbral de 25 muertes.

Los ceros oficiales CY describen el producto: su codebook advierte del filtro
de inclusión de díadas. No prueban ausencia de violencia real. Tampoco la
ausencia de registros GED de fecha exacta es un negativo verificado.

## Implementación real

- Se comprueban fechas de **todas** las filas GED, incluso años anteriores y
  tipos excluidos. Se rechazan extremos futuros ocultos tras `year` antiguo,
  intervalos invertidos, precisión fuera de 1–5, filas irregulares y cabeceras
  duplicadas. No se reconstruyen meses a partir de intervalos imprecisos.
- Serie interna de doce conteos y muertes de incidentes estatales letales de
  día exacto. Descriptores: meses con registros, pendiente lineal de conteos,
  diferencia Q4−Q3, recencia y HHI **temporal**. Sin registros, recencia y HHI
  son indefinidos (`null`). No se calculó concentración geográfica.
- Los registros imprecisos y sus muertes se conservan para reconciliación y
  calidad; no se distribuyen artificialmente entre meses. Las salidas públicas
  solo muestran sumas y métricas agregadas, sin identidades.
- Se congelan probabilidades de los cinco modelos originales y duración AV-083
  antes de leer desenlaces. Ninguno se modifica ni se elige como campeón.
- Se añaden Brier categórico, log loss con piso numérico 1e-12, Brier de cualquier
  primer cambio, tablas de calibración, precisión, cobertura y falsas alarmas.
  Umbral diagnóstico fijo 10 %; no optimizado y sin interpretación de utilidad.
- Etiquetas ausentes excluidas y contadas; NaN, infinito, negativos y duplicados
  rechazados. Bootstrap pareado por regiones completas, 2.000 réplicas y cinco
  grupos gruesos, solo sensibilidad descriptiva con pocos bloques.

## Resultados sobre archivos oficiales completos

Las reglas GED de esta tabla se aplican **solo a países inicialmente bajos**;
las métricas de modelos posteriores cubren entradas y salidas. No mezclar sus
denominadores.

| Corte / desenlaces | Regla GED | N bajos | Entradas detectadas / totales | Falsas alarmas / estables | Precisión |
| --- | --- | ---: | ---: | ---: | ---: |
| 2022 / 2023–24 | Algún incidente exacto anual | 159 | 2/5 | 10/154 | 16,67 % |
| 2022 / 2023–24 | Algún incidente exacto Q4 | 159 | 0/5 | 3/154 | 0 % |
| 2023 / 2024–25 | Algún incidente exacto anual | 162 | 1/4 | 11/158 | 8,33 % |
| 2023 / 2024–25 | Algún incidente exacto Q4 | 162 | 0/4 | 6/158 | 0 % |

| Modelo intacto | Brier 2023–24 / 2024–25 | Cambios detectados al 10 % | Falsas alarmas |
| --- | --- | --- | --- |
| Persistencia | 0,112245 / 0,081633 | 0/11 · 0/8 | 0/185 · 0/188 |
| Markov país regularizado | 0,093725 / 0,079299 | 10/11 · 5/8 | 46/185 · 50/188 |
| Memoria de dos estados | 0,095549 / 0,080887 | 7/11 · 4/8 | 31/185 · 35/188 |
| Duración AV-083 | 0,089821 / 0,078591 | 8/11 · 5/8 | 34/185 · 35/188 |

La precisión de duración es **19,05 % y 12,50 %**. Su menor Brier agregado no
resuelve el problema de falsas alarmas. El Brier condicionado a cambios es
peor que Markov país en ambas ventanas. Las bandas regionales de diferencia
duración−Markov país son [−0,011689; +0,008160] y [−0,010290; +0,008303];
cruzan cero, con solo cinco bloques regionales y dos ventanas solapadas.
El informe reproducible incluye los seis modelos, incluidas frecuencia y
Markov global, y todas sus métricas; esta tabla resume los comparadores pedidos.

## Verificación y límites

413 pruebas Python sintéticas superadas localmente, incluidas trece del puente
y diagnóstico mensual. Dos ejecuciones completas con los seis ZIP/XLSX oficiales
verificados por sus lectores originales; se conservan los Brier de AV-083.
CI reproduce fuentes, codebooks y pruebas. La evidencia remota y la fusión se
documentan en el handoff al cerrar el incremento.

**No hay modelo mensual probabilístico nuevo, mejora prospectiva validada ni
señal financiera.** Los descriptores aún no se entrenan para predecir. Repetir
un análisis con más métricas sobre los mismos países no crea datos nuevos.
2027 continúa `SHADOW_NO_EMITIDO`; no se escribe `PsicoPredicciones`.

## Siguiente experimento de mayor valor

Prerregistrar una señal sobre una sucesión nueva de **Candidate GED publicados
mensualmente**, con bytes capturados y testigo externo anterior al origen,
roster completo y política expresa para precisión `0` no documentada. Definir
primero un objetivo mensual propio y su fecha de resolución; mantener CY como
objetivo anual distinto. Guardar todos los meses, incluidos los no puntuables,
y evaluar períodos futuros no solapados. No reabrir otra búsqueda de factores
en 2023–2025 para presentarla como validación independiente.
