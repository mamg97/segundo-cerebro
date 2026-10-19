# PSICOHISTORIA — Último relevo científico verificado (19/10/2026)

## Estado de referencia

- **AV-20261019-034** registrado y reconsultado en la hoja privada canónica de PROYECTOS.
- [PR #666](https://github.com/mamg97/segundo-cerebro/pull/666) fusionada en `main`, squash `4023d1d304d8073afadf86c24dc89d08d890c3b6`.
- GitHub Actions: auditor real de estados, tests sintéticos, CI `main` y revisión de privacidad completados con éxito.
- Documentación y evidencia: [ISSUE_DAY_ROSTER_GATE.md](ISSUE_DAY_ROSTER_GATE.md), [ejecución de fuentes públicas](https://github.com/mamg97/segundo-cerebro/actions/runs/39242450612).

## Resultado científico

Para emisiones el día 1, elegir como universo de países los miembros
de **todo el mes** puede usar información que ocurre después del origen:
junio de 2006 registra 192 Estados presentes el día 1 pero solo 191
durante todo el mes, tanto COW v2024 como GW v7+micro; dos altas
posteriores al origen y una baja. Julio 2011 incluye una nueva
pertenencia durante el mes en ambos sistemas.

Este análisis se hizo con ficheros observados en 2026, publicados
en 2025 (COW v2024) y 2021 (GW v7); **no acredita vintages as-of**
para 2006, 2011 o 2020. Los hashes actuales no son evidencia de
los bytes históricamente descargables.

## Bloqueos y siguiente tarea

- `MAD-02=PARCIAL`, `V2-02=EN_CURSO`, `PsicoAvances=34`,
  `PsicoPredicciones=0`; cohorte shadow 2027 intacta y no emitida.
- No usar COW `ccode` como UCDP/GW `country_id` sin concordancia
  territorial revisada y fechada.
- **Siguiente avance prioritario:** comprobar de forma empírica los
  country-year de COW `system.csv`, cuyo codebook incluye un país si
  estuvo presente en cualquier momento del año. No aceptar ese
  denominador como universo conocido el 1 de enero, y separar origen,
  publicación del vintage, cobertura y definición de negativos UCDP.
- Siguen pendientes evidencia independiente del contenido exacto
  de versiones históricas, cobertura de países sin incidentes y un
  backtest onset sin fugas. No afirmar predicción efectiva ni nuevos
  Brier scores hasta demostrarlo.

## Notas operativas

`docs/HANDOFF.md` contiene el relevo global del repositorio, pero
su sección introductoria de PSICOHISTORIA quedó en AV-033 porque
la actualización de un archivo de gran tamaño fue bloqueada por
la conexión en este turno. El estado válido más reciente de
PSICOHISTORIA está en **esta nota**, el informe de AV-034
y las pestañas privadas `PsicoAvances` / `PsicoFases`.
Este documento contiene únicamente información técnica pública.
