# PSICOHISTORIA — auditoría matemática independiente del Futures Engine

**Fecha:** 17/10/2026. **Estado:** complemento independiente para integrar con la versión local v0.4.0, aún no publicada.

## Estado exacto visto en el navegador local

La página http://127.0.0.1:8791/app/research-lab.html mostraba FUTURES ENGINE / ucdp-futures-v1 con dos países sintéticos, origen 2010 con información hasta 2008, cinco familias de modelo (frecuencia constante, persistencia, Markov global, Markov por país regularizado y memoria de dos estados), horizonte variable, grafo de flujos, intervalos paramétricos, beam de 64 prefijos y máximo 12 historias visibles. La página, pero **no** su código local, estaba disponible para revisión.

**No sobrescribir ese progreso local con el código actualmente integrado en main**, que sigue en v0.3.0.

## Ontología observacional

Una etiqueta binaria anual y[t] indica si la cifra oficial UCDP de muertes estatales agregadas alcanza el umbral preregistrado de 25.

Estados de dos años consecutivos:
- 00: por debajo en ambos años; sucesores 00 y 01.
- 01: entrada por encima del umbral; sucesores 10 y 11.
- 10: salida por debajo del umbral; sucesores 00 y 01.
- 11: continuidad por encima del umbral; sucesores 10 y 11.

Cada transición debe respetar (a,b) → (b,c). Este espacio de estados **no representa la estabilidad social general**.

## Invariantes de aceptación

1. Toda distribución de cuatro estados suma exactamente 1 dentro de tolerancia numérica.
2. Cada fila de la matriz suma 1; transiciones incompatibles con la observación consecutiva valen 0.
3. Flujo entre nodos = masa del origen × probabilidad condicional.
4. Total de flujos entrantes y salientes de cada estado coincide con sus distribuciones de años adyacentes.
5. Una trayectoria individual multiplica probabilidades condicionales; dos historias que acaban en un nodo no son la misma historia.
6. Con truncado a top-k: masa visualizada + masa residual = 1; nunca renormalizar la masa mostrada.
7. El último par observado de 2008 necesita dos transiciones para calcular el estado de 2010: 2009 es un año puente no observado.
8. Si las historias se seleccionan mediante beam search, rotular top-k como aproximado hasta contrastarlo con el cálculo exacto: conservar masa no garantiza conservar las rutas óptimas.
9. Los intervalos Beta-Monte Carlo son **paramétricos condicionales**; no tienen cobertura empírica acreditada ni prueban capacidad predictiva.

## Auditor independiente

Archivo: research/psychohistory/futures_audit.py.

Funciones:
- validate_distribution / validate_matrix: normalización y ceros estructurales.
- transition_counts / transition_matrix: conteos binarios y regularización Beta declarada, sin afirmaciones empíricas.
- propagate: distribución multicategoría exacta hasta 12 pasos, sin pérdida de masa.
- graph_flows: probabilidades conjuntas y condicionales separadas.
- exact_top_paths: top-k exacto de caminos y masa residual, sin selección heurística.
- parameter_intervals: simulación reproducible de incertidumbre de parámetros con una matriz fija por réplica.
- verify_aggregate_output: comparación directa contra resultados normalizados del motor.

Archivo de tests: research/psychohistory/test_futures_audit.py; usa solo valores inventados, incluido un ejemplo que imita las proporciones de la pantalla local, sin copiar datos científicos privados.

## Esquema mínimo para test de integración

Exportar únicamente en entorno de pruebas un objeto con campos:

- initial: distribución completa por estado.
- matrix: matriz 4×4 con estados etiquetados.
- horizon: entero 0 a 12.
- distributions: array de distribuciones desde el origen hasta el horizonte.
- paths, opcional: top_paths con estados/probabilidad, represented_mass, residual_mass.
- keep, opcional: límite de caminos.

El motor local puede tener otro contrato; realizar un adaptador de test sin modificar el esquema canónico del proyecto.

## Principales limitaciones

La herramienta prueba **coherencia interna**, no que el pronóstico sea correcto. Ni el prior Beta(1,1), ni el release histórico UCDP revisado, ni los intervalos paramétricos acreditan capacidad de predicción prospectiva. No se conoce el estado local del código: solo la interfaz que renderizaba el navegador. El motor v0.4.0 debe conservarse como fuente del trabajo local y recuperarse antes de integrar.

## Guía para mañana

1. Desde Work/Codex recuperar y guardar los cambios locales v0.4.0.
2. Contrastar con main y esta rama; evitar sustituir sus controles, animaciones o flujos.
3. Añadir un adaptador que traduzca la salida local al contrato del auditor.
4. Comprobar horizontes 1, 3, 5, 10; flujos, transiciones, intervalos y masa residual.
5. Contrastar beam de 64 prefijos con top-k exacto: no aceptar silenciosamente rutas top-k incorrectas.
6. Corregir la indicación DATOS CANÓNICOS en preview ficticia para que no parezca un experimento real.
7. Mantener resultados privados, sin hardcoding; CI, QA autenticada y despliegue solo tras integración validada.

**No dar por finalizada la validación científica hasta tener fuentes históricas realmente disponibles en fecha de emisión, evaluación fuera de muestra y pronósticos prospectivos sellados.**
