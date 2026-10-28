# Evaluador anual 2027: preparación recuperable

28/10/2026. La cohorte anual ya está emitida: 196 países y seis modelos.
Este módulo prepara su evaluación según `policy_2027.json` original; no cambia
probabilidades, fuentes de entrenamiento, modelos, umbral ni política sellada.
No existen resultados oficiales del año2027 completo en esta fecha.

## Qué hace

`annual_evaluation.py` recibe rutas privadas a candidato, bundle original,
plan de inscripción, fuente futura y pin. Reconstruye el plan con el validador
existente y exige igualdad completa con el original, incluido compromiso y
SHA de política. No acepta una tabla de probabilidades editable alternativa.
La comprobación local del plan real inscrito coincide:196países/seismodelos;
no se ha puntuado ningún desenlace real ni solicitado sellos nuevos.

La fuente futura debe conservar `ucdp.zip` y `codebook.pdf`. El pin tiene
exactamente `schema=psychohistory.annual_outcome_source_pin.v1`, `version`,
`archiveSha256`, `codebookSha256` y `capturedAtUtc`. No hay flags de aprobación.
Se comprueban hashes, cabecera PDF, un solo CSV limitado, columnas, versión,
IDs/años enteros, duplicados y muertes enteras finitas no negativas. Una captura
anterior al fin de2027 o posterior al reloj del verificador se rechaza.
Son controles de coherencia; no autentican origen, completitud anual o que la
edición sea la primera oficial. Un año2027 dentro del CSV tampoco lo prueba.

Cada país congelado se cruza por `country_id`, nunca por nombre ni posición.
`sb_total_deaths_best >=25` define el resultado. País ausente, valor vacío o
`NA` queda irresuelto, con IDs y recuentos separados. Entidades nuevas se
reportan aparte, sin ampliar el roster. Los seis modelos usan exactamente los
mismos países resueltos y conservan todas sus probabilidades originales.

Se reutilizan Brier, log-loss con clip1e-12, AP con empates agrupados y
calibración de cinco bins del motor existente. Comparación principal:
v2_logistic frente a frequency, diferencia de Brier y skill sólo si el Brier
base es positivo. Cero países produce métricas nulas. El bootstrap pareado
existente usa1000remuestreos, seed20261020, una observación por país y sólo con
al menos tres resueltos. Es sensibilidad descriptiva: no trata dependencia
regional ni acredita generalización temporal. No se selecciona otro ganador.

## Ejecución y frontera de evidencia

La CLI acepta `--config /ruta/privada/config.json --out /ruta/privada/nuevo.json`.
El JSON de configuración contiene únicamente `candidate_path`, `bundle`,
`plan_path`, `source_dir` y `pin_path`. Salida exclusiva, permisos0600, fuera
del repositorio; stdout sólo estado y recuento. No red ni escrituras canónicas.
El informe siempre es `OFFLINE_CANDIDATE_NOT_ADMITTED`, con
`evaluationEligible=false`, `canonicalRowsResolved=false` y
`predictiveSkillDemonstrated=false`. Los hashes identifican bytes, no conceden
admisión. El reloj local tampoco sustituye evidencia temporal independiente.

Cuando exista la primera publicación oficial completa, habrá que observar su
origen/captura con herramienta autorizada, conservar originales y demostrar
que es esa primera edición; recuperar la inscripción y sus cinco recibos
originales, comprobar confianza/tiempos y aprobar la resolución en una puerta
separada. Después podrá publicarse el score acreditado. Revisiones posteriores
se guardan en informes separados; nunca reemplazan el primer resultado.
La fecha de publicación todavía es desconocida; horizonte geopolítico2027
implica que no puede resolverse antes de2028. Esto no retrasa otros pilotos.

## Validación

Ocho pruebas nuevas con fuentes y países inventados cubren umbral, faltantes,
país extra, emparejamiento de seis modelos, aritmética Fraction independiente,
baseline perfecto, cero resueltos, corrupción del plan, archivo/versiones,
fechas imposibles y CLI sin sobrescritura/admisión. Ningún fixture real en Git.
Se añade una regresión determinista del TSQ con hash acabado en NUL: algunos
OpenSSL abrevian esos bytes en el volcado humano. Leer el OCTET STRING DER
original evita un falso rechazo aleatorio sin relajar la verificación.
