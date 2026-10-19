# PSICOHISTORIA — AV-053 · Concordancia de díadas UCDP 19.1 y 25.1

**19/10/2026 · Auditoría retrospectiva descriptiva, no modelado.**

## Motivación

AV-052 estableció que entre 61 casos donde el archivo antiguo Onset indica `newconf=1` mientras los actuales indican `onset1=0`, solo 10 presentan actividad intrastatal en el mismo par GW-año en las dos ediciones UCDP/PRIO Armed Conflict; 51 no tienen actividad de tipo 3–4 en ninguna. Esto no permite concluir ausencia de violencia ni resolver el origen de las señales de `newconf` porque una incompatibilidad política puede generar varias **díadas** (gobierno contra organizaciones distintas).

El [codebook UCDP Dyadic 19.1](https://ucdp.uu.se/downloads/dyadic/ucdp-dyadic-191.pdf) y el [codebook Dyadic 25.1](https://ucdp.uu.se/downloads/dyadic/ucdp-dyadic-251.pdf) definen las variables `dyad_id`, `conflict_id`, `gwno_loc` y `type_of_conflict`. UCDP publica ambas ediciones en su [catálogo histórico](https://ucdp.uu.se/downloads/olddw.html). Las consultas `gwno_loc` identifican la localización de la incompatibilidad, no necesariamente el lugar físico de las batallas.

## Comprobación empírica implementada

- `research/psychohistory/ucdp_dyadic_lineage_av053.py` descubre, valida y descarga la edición **19.1 y 25.1** del UCDP Dyadic Dataset y, como control, las dos ediciones UCDP/PRIO Armed Conflict ya autenticadas **solo como archivos observados en 2026**. Distingue CSV directo de ZIP, sin inventar el nombre del fichero.
- Fija el mismo panel de **10.130** GW-año y subgrupo de **61** resultados antiguos con `newconf=1` y ambas etiquetas modernas `onset1=0`, sin seleccionar nuevos casos a partir de los datos modernos.
- Cuenta si hay una díada activa tipo 3/4 en ambas ediciones, solo antigua, solo moderna o ninguna; además si las ediciones comparten algún `dyad_id` o `conflict_id` numérico. Audita incoherencias entre IDs de conflictos presentes en Dyadic y Armed Conflict, sin alterar los datos.
- Emite exclusivamente hashes SHA-256 observados en la ejecución, número de filas, cobertura de años y contadores agregados. Nunca difunde código GW, ID de conflicto, nombre de país, nombre de actor, ni trayectorias individuales.
- `test_ucdp_dyadic_lineage_av053.py` utiliza díadas ficticias para detectar enlaces manipulados, CSV incompatibles, supervivencia del universo, inconsistencias de IDs y falsas afirmaciones de equivalencia. La CI `.github/workflows/psychohistory-ucdp-dyadic-lineage.yml` opera sobre un runner efímero sin almacenar datasets.

## Límites

Los IDs de versiones distintas son coincidencias *candidatas*: no se considera que una coincidencia numérica autentique el mismo linaje histórico. Una díada-año activa no implica que ese año comience un conflicto nuevo, ni que el origen antiguo `newconf` sea intercambiable con el moderno. El archivo antiguo Onset servido bajo la etiqueta 19.1 finaliza en 2017, a pesar del codebook 19.1 que cubre 2018. **No** utilizar fuentes modernas o sus revisiones para entrenar un modelo supuestamente emitido en julio de 2020.

No se alteran AV-042, AV-046, predicciones, modelos, patrimonio, repositorios privados ni las 1.176 probabilidades de la cohorte sombra 2027. `MAD-02` sigue `PARCIAL` y ningún score o backtest histórico está autorizado.

## Próximo experimento

Si persisten casos sin correspondencia en UCDP/PRIO y Dyadic, revisar qué fuente o script generó realmente el antiguo `onsets_computed.csv`, qué versión y fecha de publicación puede autenticarse y qué significa `newconf` respecto a conflicto y díada. El paso siguiente es reconstruir una línea de procedencia **por edición y por definición**, no entrenar aún con etiquetas incompatibles.

## Resultado de contraste REAL en GitHub Actions (19/10/2026)

La CI ha inspeccionado los datasets originales, sin imprimir filas, países ni dyad_id individuales.

| Fuente | Ubicación en UCDP | Filas | Último año | SHA-256 descarga observada 2026 |
|---|---|---:|---:|---|
| Dyadic 19.1 | https://ucdp.uu.se/downloads/dyadic/ucdp-dyadic-191.csv | **3.000** | 2018 | `b1eed9ae6540268a157694068c8f3b2be9bb6104640aec2d1c43dab487c9a0f6` |
| Dyadic 25.1 | https://ucdp.uu.se/downloads/dyadic/ucdp-dyadic-251-csv.zip | **3.432** | 2024 | `e34d26c39d23739ab65bc52fd42747aa88e7ecdf84d16c7bacafd590ed767330` |

El CSV interno del ZIP Dyadic 25.1 tiene SHA-256 `e5bf6e3779a903f3df3ec476592332ce51ccf3798174b3db4c1b06dd1dd5a7ba`. Estos hashes identifican bytes **observados en octubre de 2026**, no demuestran disponibilidad histórica anterior a julio de 2020.

El panel de 10.130 país-año y el subgrupo de 61 antiguos con newconf positivo se mantuvieron EXACTAMENTE sin exclusiones retrospectivas. Contando solo díadas internas (tipos 3 y 4) en `gwno_loc`:

| Actividad dyadic por GW-año | Cantidad |
|---|---:|
| En ambas ediciones | **10** |
| Solo Dyadic 19.1 | **0** |
| Solo Dyadic 25.1 | **0** |
| Sin díada interna en ninguna | **51** |

De los diez con actividad en ambas ediciones, **los diez** comparten algún `dyad_id` y algún `conflict_id` numérico. No se detectaron desfases entre IDs de conflicto presentes en el archivo Dyadic y el Armed Conflict Dataset **para esos diez**. De los 51 sin díada, 45 preceden a 1989 y seis corresponden a 1989–2017.

**Resultado negativo importante:** el pasar de conflicto-año a díada-año **no** cambia la distribución 10/51 observada en AV-052. No implica que 51 países/años no tuviesen violencia real. El antiguo archivo Onset no es una instantánea histórica de UCDP Dyadic reconocida y puede contener semánticas o versiones de datos distintas. La revisión causal sigue **no adjudicada**.

El próximo avance debe investigar la **procedencia y fechas del archivo concreto `onsets_computed.csv`** servido bajo la etiqueta 19.1. Su cobertura real hasta 2017, frente a los originales Armed Conflict/Dyadic 19.1 que incluyen 2018, ya apunta a desalineación documental. No convertir esa pista en una datación ni usar el CSV antiguo como fuente de entrenamiento sin pruebas.
