# PSICOHISTORIA — Cohorte futura 2027 sin etiquetas observadas

**Implementación:** \`research/psychohistory/future_2027_candidates.py\`.
**Estado:** capacidad de preparación privada, NO pronósticos emitidos. La verificación empírica de los bytes oficiales UCDP 26.1 contra ambos SHA-256 preregistrados pasó en CI efímera (workflow 39130567553, 18/10/2026); los originales y `MANIFEST.json` sí están archivados en el ZIP de reproducción privado del 16/10/2026 (24/24 miembros verificados). El generador canónico de seis modelos **ya se ha ejecutado literalmente** en un entorno privado, con ZIP UCDP original verificado y preflight de código; los resultados siguen **NO emitidos**. No se crea ninguna fila de \`PsicoPredicciones\`.

## Qué calcula

Se prepara un conjunto de **candidatos no emitidos** para el año calendario completo **2027**, con la definición preregistrada en \`research/psychohistory/protocol.json\`: si \`sb_total_deaths_best >= 25\` en territorio del país durante 2027. No son predicciones de una guerra individual, invasión o atentado.

- **Datos fuente:** UCDP OrganizedViolenceCY **26.1**, 1989–2025, ZIP+PDF exactos fijados en el protocolo. Los bytes deben pasar la admisión \`source_release_intake.inspect()\` y \`benchmark.audit(strict=True)\` antes de calcular. Además, el runner no acepta protocolos alterados por otra llamada: el objeto recibido debe coincidir íntegramente con \`protocol.json\` de la revisión ejecutada, y se prohíbe conservar los originales dentro del árbol público de Git.
- **Países:** únicamente roster observado en 2025 con al menos cinco años contiguos 2021–2025. No se inventan países ni historiales.
- **Features:** se construyen con las mismas cinco variables que \`benchmark.panel()\`, a partir del historial observado hasta **2025**; 2026 no se observa ni se utiliza.
- **Entrenamiento:** se reutiliza \`benchmark.predict_origin()\` sobre su panel histórico etiquetado únicamente hasta 2025 y filas futuras con \`target=None\`. Se conservan exactamente los seis modelos preregistrados, incluidos el baseline \`frequency\`, la regularización y las transformaciones. No hay nuevo ajuste de hiperparámetros o selección basada en test.
- **Horizonte 2027:** lag de dos años para las variables: 2027 − 2 = **2025**. Ningún pronóstico para 2026 con el período ya iniciado y desenlaces parciales; tampoco se reutilizan los resultados revisados posteriores como si fuesen información disponible en 2025.
- **Salida:** JSON exclusivamente privado, create-only, con *hashes* de ZIP, PDF, CSV interno, protocolo, motor y este generador, metadatos de entrenamiento y probabilidades de cada modelo por país. \`outcome=null\` en todos los candidatos; \`forecastIssued=false\`, \`prospectiveEligible=false\`, \`sourcePublicationAsOfVerified=false\`. La consola solo devuelve hashes, número de candidatos y banderas de estado.

El registro resultante **no es un ledger ni una emisión prospectiva**; no se debe insertarlo en \`PsicoPredicciones\` ni consumirlo como señal comercial u operativa.

## Ejecución real desde la fuente privada ya archivada

\`\`\`bash
# En el repo, exclusivamente si ucdp.zip y codebook.pdf están en una carpeta PRIVADA
python3 research/psychohistory/source_release_intake.py \
  --source-dir "$HOME/Private/PSICOHISTORIA/UCDP_CY_26_1" \
  --out "$HOME/Private/PSICOHISTORIA/AUDITS/source-intake-261.json"

python3 research/psychohistory/future_2027_candidates.py \
  --source-dir "$HOME/Private/PSICOHISTORIA/UCDP_CY_26_1" \
  --out "$HOME/Private/PSICOHISTORIA/AUDITS/future-2027-candidates.json"
\`\`\`

No editar ni sustituir los SHA preregistrados si la descarga no coincide. El generador también calcula probabilidades del baseline, lo que **no demuestra** utilidad, calibración ni skill prospectivo de los modelos.

## Ejecución canónica desde el ZIP privado ya archivado (18/10/2026)

Se ha añadido una segunda entrada segura a `future_2027_candidates.py`: `--private-archive`.
Permite calcular la misma cohorte de seis modelos a partir del paquete existente
`PSICOHISTORIA_UCDP_261_REPRODUCCION.zip` almacenado **fuera de Git**.
No exige volver a descargar originales ni crear carpetas permanentes duplicadas.

La entrada ejecuta primero `private_archive_intake.verify_private_archive()`,
que verifica `MANIFEST.json`, los dos hashes UCDP preregistrados, el protocolo
interno y la estructura país-año. Extrae ZIP y codebook solo a una carpeta
temporal privada, ejecuta `generate_private_candidates()` con los mismos seis
modelos y elimina el staging automáticamente. El JSON destino sigue siendo
create-only; la consola no imprime probabilidades.

Ejemplo de ejecución **en un entorno privado con el paquete original accesible**:

```bash
python3 research/psychohistory/future_2027_candidates.py \
  --private-archive "/PRIVATE/PSICOHISTORIA_UCDP_261_REPRODUCCION.zip" \
  --out "/PRIVATE/2027_SIX_MODEL_UNISSUED_NEW.json"
```

El ensayo calculado antes mediante wrapper byte-equivalente (**196 países,
1.176 probabilidades comparadas con máxima desviación 0**) se guarda
separadamente en la carpeta privada de Drive; se identifica como
`SHADOW_NO_EMITIDO` en `PsicoExperimentos` y **NO** se introduce en
`PsicoPredicciones`. **Actualización 18/10/2026:** el CLI canónico se ejecutó literalmente desde ocho archivos públicos recuperados y comprobados con SHA-1 de blobs Git idénticos a `main` (incluidos generador, motor, protocolo, validador y preflight). Desde el ZIP privado original calculó 196 países × seis modelos. El preflight estricto devolvió `CANONICAL_SHADOW_PREFLIGHT_PASSED_NOT_ISSUED`. Todas las **1.176** probabilidades coinciden exactamente (`maxAbsoluteDeviation=0.0`) con el wrapper previo. El paquete privado nuevo conserva salida, preflights y manifiesto de integridad (5/5), sin copiar los originales.

La disponibilidad de fuentes al momento de una emisión futura, la independencia
de la autoridad de sello temporal y la preinscripción del registro prospectivo
siguen siendo puertas separadas. Nunca convertir estos candidatos en `ISSUED`
por el mero hecho de existir un JSON verificable o un ZIP privado.

## Resultado canónico empírico — 18/10/2026

- **Código auténtico:** 8 ficheros públicos del repositorio fueron recuperados, sus hashes de blobs Git verificados byte a byte y ejecutados desde un checkout temporal aislado fuera de Git; el medio de transferencia se eliminó después.
- **Fuente:** archivo privado existente `PSICOHISTORIA_UCDP_261_REPRODUCCION.zip`, 24/24 hashes internos, ZIP y PDF UCDP 26.1 preregistrados coincidentes; ningún duplicado permanente de fuentes.
- **Ejecución literal:** `future_2027_candidates.py --private-archive ... --out ...` completada: **196 países, seis modelos, 1.176 probabilidades**, SHA-256 de salida `a696769e2ab6260c2870443b5aeec3af6d2fa54ebea6ccca2aa615b0b39f8ef1`. Contraste con la versión previa: 1.176/1.176 probabilidades idénticas, desviación 0.
- **Preflight real:** `issue_2027_preflight.py --require-canonical` = `CANONICAL_SHADOW_PREFLIGHT_PASSED_NOT_ISSUED`. La salida anterior se clasifica aparte `LEGACY_SHADOW_STRUCTURALLY_VALID_NOT_CANONICAL`.
- **Evidencia privada durable:** paquete ZIP canónico de 7.184 bytes con 5/5 miembros verificados, verificado de nuevo en Drive como `shared=false` y solo propietario. `PsicoExperimentos` contiene el registro `ucdp261-2027-6model-canonical-shadow-20261018`; el previo de wrapper sigue separado. `PsicoPredicciones` continúa solo con cabecera (0 emisiones).
- **No se declara pronóstico emitido:** ninguno tiene TSA recibo externo ni source `as-of` acreditado para emisión. No existe outcome 2027 ni Brier prospectivo puntuable.


## Control temporal y bloqueo pendiente

Una edición UCDP 2025 publicada antes de emitir en octubre-diciembre 2026 puede servir como entrada de un futuro *shadow forecast*, pero deben fijarse de forma independiente la disponibilidad de sus bytes y de sus variables. La nota oficial del 9/6/2026 acredita estadísticas públicas de 2025, pero **no** prueba la fecha de publicación del ZIP concreto.

Antes de afirmar una emisión real, falta:
1. Mantener y auditar **el archivo privado existente** `PSICOHISTORIA_UCDP_261_REPRODUCCION.zip` (16/10/2026), con `sources/ucdp.zip`, `sources/codebook.pdf` y `MANIFEST.json`: los 24 miembros y los SHA fijados se han comprobado. No crear duplicados innecesarios.
2. Conservar evidencia externa con fecha y alcance de versión y de disponibilidad *as-of* del input.
3. Conservar el prerregistro ya hecho en `policy_2027.json` y `PREREGISTRO_SCORE_2027.md`, con universo y criterio de resolución fijados, sin cambiar reglas tras observar resultados 2027.
4. Transformar cada candidato en un borrador del ledger con identificador y todos los SHA, obtener un recibo RFC3161 **de TSA independiente verificada**, y registrar una emisión fechada realmente antes del año objetivo.
5. Resolver a partir de un futuro dataset anual UCDP cuando se publique. Hasta entonces \`outcome=null\` y ninguna puntuación.

Pruebas sintéticas: \`test_future_2027_candidates.py\` comprueba estructura sin labels, modelos idénticos al motor ya existente, ausencia de leak futuro, política de roster, cortes, cinco-year history y rechazo de fuente no validada. El resultado real no se guarda ni se simula en Git.

## Ensayo científico privado del 18/10/2026 (NO emitido)

Desde los originales UCDP 26.1 archivados y verificados en Drive (SHA 2/2 y
manifiesto 24/24), se ejecutó en un contenedor privado un wrapper equivalente
al algoritmo de `candidate_rows`, reutilizando `benchmark.py` y `engines.py`
cuyos hashes Git de blobs coinciden exactamente con los vigentes en `main`.
Resultado de QA: 196 candidatos país-2027, seis modelos, **1.176 probabilidades**
finitas dentro de [0,1], 196 `outcome=null`, y todas las variables y etiquetas
de entrenamiento con fecha máxima **2025**. Este wrapper no es la ejecución
literal ni el certificado del runner CLI canónico, y el JSON anterior se archivó en Drive privado. Posteriormente el CLI canónico ejecutado literalmente produjo un segundo paquete privado sin sustituir el histórico.

No se han publicado probabilidades, no se ha creado `ISSUED`, no se ha
seleccionado modelo por acierto futuro ni se ha declarado skill. La prueba
sirve únicamente para avanzar desde el esquema sintético a un cálculo real
**no puntuable**. La ejecución formal canónica y el almacenamiento privado ya están completados; siguen pendientes exclusivamente los requisitos adicionales de disponibilidad `as-of`, independencia y recibo de TSA, y registro de emisión antes del desenlace.
