# PSICOHISTORIA — AV-043 · Auditoría de vintages históricos (19/10/2026)

**Estado: TRIAGE DE FUENTES. No hay testigos autenticados de bytes pre-origen ni conjunto en riesgo aprobado.**

## Fuentes contrastadas

1. [Índice oficial de versiones antiguas UCDP](https://ucdp.uu.se/downloads/olddw.html): contiene actualmente GED 19.1 y Candidate 20.0.10.
2. [UCDP: comunicado de versiones 19.1 (2019)](https://ucdp.uu.se/downloads/updatealert/ucdp_updatealert32.html): anuncia edición GED 19.1 con material hasta 2018. Su texto no es un certificado independiente de publicación de bytes exactos.
3. [UCDP: comunicado 20.1 y Candidate (2020)](https://ucdp.uu.se/downloads/updatealert/ucdp_updatealert34.html): anuncia disponibilidad de revisiones de 2019 y el inicio del servicio Candidate mensual.
4. [Índice UCDP Candidate histórico](https://ucdp.uu.se/downloads/olddw.html): antes de 20.0.10, la cobertura era regional; desde octubre de 2020 se declara global. Eso tampoco da un universo de países sin eventos.

| Versión | Origen hipotético 01/01/2020 | Resultado del análisis |
|---|---|---|
| GED 19.1 | Un vintage de 2019 con observación hasta 2018 *puede* ser contexto rezagado conocido, pero sin testigo de bytes fechado | No resuelve actividad durante Y−1 (2019). No autoriza onset1 ni el conjunto en riesgo. |
| Candidate 20.0.10 | Edición 2020: NO existía en el origen de enero de 2020 | Descartado para 01/01/2020; la cobertura global declarada posterior no se retrotrae. |

## Software incluido

- **onset_historical_vintages.py:** valida únicamente fechas de origen, metadatos inmutables y enlaces oficiales exactos; ofrece estados de cronología necesaria y razones de bloqueo. No procesa filas de países ni eventos, ni da valores perdidos por ceros.
- **test_onset_historical_vintages.py:** controles de fechas inválidas, suplantación de enlaces, mutación de metadatos, eventos desconocidos y toda afirmación de emisión/certificación.
- **psychohistory-onset-historical-vintages.yml:** CI de pruebas sintéticas y comprobación del índice oficial HTML de UCDP en un runner efímero. Si desaparece un vínculo esperado, falla. No descarga CSVs ni publica IDs de países.

La presencia de un vínculo en un catálogo consultado en 2026 NO atestigua que su contenido binario existiera idéntico en un año histórico. La fecha de observación de eventos, la fecha de publicación, el acceso comprobado por terceros y la autenticación criptográfica son variables distintas.

## Próximo bloqueo por resolver

Para el target fijo de AV-042, **onset1 intrastatal país–año**, se necesita una medición completa de la actividad relevante durante Y−1 verificablemente disponible ANTES de 01/01/Y, universo sin eventos y crosswalk territorial aprobado. Incluso un GED antiguo auténtico puede proporcionar variables rezagadas, pero NO convierte estados sin eventos en elegibles ni suple datos de 2019. En ausencia de bytes pre-origen independientes, cualquier backtest sigue bloqueado. Si técnicamente es imposible, se deberá preregistrar una redefinición explícita de origen, horizonte y etiqueta; nunca introducirla silenciosamente.

**Compromisos:** MAD-02 permanece PARCIAL; PsicoPredicciones mantiene cero emisiones; cohorte privada 2027, modelos, Worker, interfaz y datasets canónicos intactos; ningún gasto recurrente nuevo. Registrar AV-043 en PsicoAvances solo después de PR fusionada, tests y CI verificados.
