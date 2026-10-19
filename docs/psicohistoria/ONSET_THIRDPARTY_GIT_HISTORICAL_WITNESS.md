# PSICOHISTORIA — AV-045 · Testigo Git de un archivo UCDP histórico (19/10/2026)

**Avance científico:** localización de un objeto de datos antiguos inequívocamente identificado en un repositorio de terceros; **NO** prueba de disponibilidad de esos bytes en la fecha de origen.

## Nuevo hallazgo empírico

En el repositorio académico externo [knapply/data4ds4da](https://github.com/knapply/data4ds4da), el [commit público `02ac3d72`](https://github.com/knapply/data4ds4da/commit/02ac3d720bb0a34248888a6900e2d7854be8a4ba) incorpora una referencia a UCDP GED 19.1 y declara **2020-01-11 17:55:45 UTC** como fecha de autor y committer. GitHub informa **firma no verificada (`unsigned`)**. La fuente R del mismo proyecto dice haber obtenido GED 19.1 el **10 de enero de 2020**. <https://rdrr.io/github/knapply/data4ds4da/src/data-raw/ucdp_19.1.R>

La API de GitHub permite verificar, **hoy**, sin descargar el dataset, estos objetos inmutables:

- Commit Git: `02ac3d720bb0a34248888a6900e2d7854be8a4ba`
- Tree Git: `58119f4869633210bc28b94bce9061596a517ed3`
- Ruta CSV original: `inst/datasets/ucdp_19.1/ged191.csv`
- Blob Git SHA-1: `3f7e4621ba0d264a62b221fa06773e02d66d046f`
- Tamaño declarado: **68.235.762 bytes**.

La identidad del objeto Git es verificable mediante su hash y su enlace dentro del árbol del commit. **No se ha descargado, inspeccionado ni re-publicado** ninguna de las filas reales del CSV de 68 MB; tampoco se ha comprobado si ese CSV antiguo coincide hoy byte a byte con una copia actual del servidor oficial.

## Por qué NO es aún un testigo temporal

Una fecha `author.date` o `committer.date` es metadato controlado por el creador del commit, susceptible de ser retrodatado; el commit anterior está **sin firma**. Una identidad de Git, aunque verifique qué bytes corresponden al blob, **no autentica cuándo GitHub recibió esos bytes**. No se dispone de un registro externo de recepción, ni de un sello RFC 3161 o de otro anclaje verificable de la fecha.

En particular:

| Emisión hipotética | Qué permite concluir |
|---|---|
| 1 enero 2019 | El commit declara una fecha posterior. No atestigua disponibilidad antes de emitir. |
| 1 enero 2020 | El commit declara 11 enero 2020, después del origen. Su existencia **no prueba** que GED 19.1 fuese inaccesible el 1 enero: solo carecemos de un testigo válido para ese día. |
| 1 enero 2021 | La fecha **declarada** del commit precede al origen, pero sigue sin ser sello independiente; además GED 19.1 concluye en **2018**, no cubre la actividad del año previo 2020. |

El comunicado [Uppsala 16 junio 2020](https://www.uu.se/en/department/peace-and-conflict-research/news/archive/2020-06-16-major-data-releases-from-ucdp) anuncia por primera vez GED **20.1**, que contiene eventos de 1989–2019. Esa edición tampoco permite un replay que la utilice el **1/01/2020**. El anuncio fechado atestigua la cronología declarada de una edición, pero no sus bytes.

## Código y CI

- `research/psychohistory/onset_git_mirror_witness.py` exige SHA de commit/tree/blob, tamaño, ruta, tipo, modo, integridad de metadatos, fechas explícitas UTC y estado de firma. Se rechazan versiones alteradas y reproducciones con identidad equivocada.
- `test_onset_git_mirror_witness.py` aplica controles adversariales exclusivamente sobre **metadatos inventados**, no datos de países.
- `.github/workflows/psychohistory-onset-git-mirror.yml` consulta únicamente **dos respuestas JSON pequeñas** de la API pública de GitHub, dentro del runner efímero, y elimina esos JSON. **Nunca descarga los 68 MB ni ejecuta cálculos con países reales.**

Toda autorización de disponibilidad histórica, elegibilidad de país-onset1, scoring y emisión permanece **false**. La fase `MAD-02` sigue `PARCIAL`, `PsicoPredicciones` permanece vacía y no se toca la cohorte sombra 2027 ni se añade infraestructura de pago.

## Próxima pista de investigación

Identificar evidencia independiente de fecha de incorporación al servidor de archivos de datos antiguos (por ejemplo, un registro externo contemporáneo y un digest coincidente) y una fuente intrastatal **con cobertura completa del año previo y de todos los países en riesgo**. Paralelamente, diseñar un experimento adicional con un origen/horizonte expresamente redefinido para **no depender de la publicación instantánea del 31 de diciembre**, sin presentarlo como backtest del objetivo onset1/enero ya preregistrado.
