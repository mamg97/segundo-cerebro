# PSICOHISTORIA — Primera salida interpretable: 2027 (experimental)

**Fecha:** 18/10/2026 · Estado: `SHADOW_NO_EMITIDO` · Foco: utilidad analítica.

## Entrega

Se ha generado en **Drive privado** un observatorio HTML autocontenido de
196 países y seis modelos, con búsqueda, ranking y divergencia
`v2_logistic` frente a `interaction_table`.
Se ha comprobado `shared=false` y único permiso del propietario.
Los detalles y probabilidades **no se incluyen en GitHub**.

El archivo utiliza la cohorte canónica de seis modelos (196 países,
1.176 probabilidades, outcome 2027 `null`) y los nombres `country`
del CSV UCDP 26.1 de 2025, ambos guardados en Drive. Comprueba
preflight canónico y hashes del ZIP privado. `decision_view_2027.py`
incorpora al repositorio el generador reutilizable de CSV:
- nombres del archivo oficial; ranking por `v2_logistic`;
- probabilidad `frequency` y diferencia expresada en puntos porcentuales;
- los otros cuatro modelos sin fabricar un ensemble;
- dispersión `abs(v2_logistic-interaction_table)` etiquetada como
  **desacuerdo de modelos**, nunca intervalo de confianza;
- filtrado de salida CSV frente a inyección de fórmulas y escritura
  create-only fuera de Git.

La tabla **no** afirma nuevos inicios de conflicto, recomendaciones
de seguridad o inversión, ni actualidad en 2026. El objetivo es
`sb_total_deaths_best>=25` dentro del territorio país durante
todo 2027: puede ser persistencia de un episodio ya existente.

## Hallazgo retrospectivo que condiciona el valor real

El benchmark exploratorio `run/report.json` de UCDP 26.1
(ventana de prueba 2016–2025, fuente revisada) da:

| Problema país-año | Brier frecuencia | Brier V2 logística | Skill relativo |
| --- | ---: | ---: | ---: |
| Presencia de violencia estatal | 0.144440 | 0.039116 | ≈72.9 % |
| Aparición de episodio agregado | 0.017576 | 0.017557 | ≈0.1 % |

La importante mejora en **presencia** puede estar relacionada con
persistencia. **No** existe evidencia convincente de ganancia en
nuevas apariciones: el target de apariciones y el de presencia son
distintos. Se debe presentar por separado la evaluación prospectiva,
medición de calibración y magnitud de utilidad versus baseline.

Estas cifras son exploratorias: edición histórica única revisada,
elección de modelo posterior a algunas pruebas, sin reconstrucción
temporal de vintages. Ni siquiera el 72.9 % acredita predicción
prospectiva ni causalidad.

## ¿Cuándo será una predicción comprobable?

- **Desde hoy:** visualización exploratoria y listado de riesgo relativo
  2027; no confundir utilidad descriptiva con accuracy futuro.
- **Si el compromiso se emite y sella realmente ANTES de 2027:** desde
  entonces habrá un experimento prospectivo a la espera de resolución.
  Crear la solicitud de sello sin recibir una prueba verificable no basta.
- **Tras la primera publicación anual que cubra el año completo 2027:**
  se podrá calcular Brier real de 2027 siguiendo el protocolo. Uppsala
  anunció estadísticas de 2024 el 11/06/2025 y las de 2025 el
  09/06/2026; esto orienta provisionalmente a **2028** para los
  resultados 2027, pero no garantiza mes/fecha ni identidad de release
  OrganizedViolenceCY.
- **Predicciones a 30–90 días:** requieren **otro modelo** con la
  fuente de eventos candidatos UCDP (ciclo mensual y desfase de hasta
  un mes); deben contar con target, cobertura de países-año-mes,
  entrenamiento, test prequential/vintage y protocolo propios.
  No transformar artificialmente las predicciones anuales en
  probabilidades mensuales.

## Reglas de privacidad, límites y siguiente trabajo

El informe real se almacena exclusivamente en Drive privado;
el repositorio contiene **código genérico y tests ficticios**.
No insertar estos resultados en `PsicoPredicciones`; pertenecen a
`PsicoExperimentos` mientras sean shadow. La interfaz pública
de GitHub Pages usa solo mock data.

La siguiente capacidad de máximo valor científico será validar
**riesgo de nuevas apariciones** mediante un panel mensual con
vintages reales; no seguir optimizando solo la prueba criptográfica.
Para cualquier métrica, informar de tamaño muestral, tasas base,
calibración y mejora frente a modelos ingenuos.

Fuentes:
- [UCDP downloads](https://ucdp.uu.se/downloads/)
- [Uppsala, datos 2024 anunciados el 11/06/2025](https://www.uu.se/en/press/press-releases/2025/2025-06-11-ucdp-sharp-increase-in-conflicts-and-wars)
- [Uppsala, datos 2025 anunciados el 09/06/2026](https://www.uu.se/en/press/press-releases/2026/2026-06-09-ucdp-record-number-of-conflicts-between-states)
