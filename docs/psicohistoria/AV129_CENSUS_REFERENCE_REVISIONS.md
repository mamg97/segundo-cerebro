# AV-129 · Interpretación de las referencias Census revisadas

24/10/2026. Contexto documental y reconciliación de AV127/128.
Se conserva el ensayo publicado, incluidos sus errores y referencias.

## Cambios documentados

Las [notas oficiales V2024](https://www2.census.gov/programs-surveys/popest/technical-documentation/methodology/2020-2024/2024-est-relnotes.pdf),
página2, explican una ampliación de la estimación de inmigración nacida
fuera de Estados Unidos: incorporan datos administrativos mensuales de
migración humanitaria y añaden el75 % de esos casos a la medida ACS de
residencia un año antes. El ajuste afecta a los períodos julio2021–junio2022,
julio2022–junio2023 y julio2023–junio2024, elevando la migración neta
internacional respecto a V2023. La misma nota describe la transición de
estadísticas vitales hacia NCHS. Estos cambios pertenecen al método de
estimación de la referencia; no constituyen observaciones independientes
del error de una proyección.

Las [notas V2025](https://www2.census.gov/programs-surveys/popest/technical-documentation/methodology/2020-2025/2025-est-relnotes.pdf)
describen una base2020 construida principalmente con MARC, ajustes
administrativos y el uso exclusivo de NCHS en estadísticas vitales.
También documentan distribución territorial de migración humanitaria
mediante expedientes EOIR y ajustes de emigración para julio2024–junio2025
con datos ENOE. No se infiere que cada cambio territorial altere por sí
mismo el total nacional en la misma cuantía.

**Reloj documental:** el PDF de notas V2025 recuperado declara actualización
del14/05/2026. La [declaración metodológica V2025](https://www2.census.gov/programs-surveys/popest/technical-documentation/methodology/2020-2025/methods-statement-v2025.pdf)
lleva enero2026. No se atribuye retrospectivamente todo el texto de mayo
a la publicación de enero, ni se certifican bytes históricos iniciales.
Tres originales PDF completos, tamaños y hashes se conservaron privadamente.

## Qué explica la sensibilidad2024

Con la proyección fija, sustituir la referencia V2024 por V2025 para
julio2024 cambia el error firmado en **+107.191 personas**: de−3.628.988
a−3.521.797. Es equivalente a una reducción de107.191 en la referencia.

| Cambio en el error al usar V2025 | Personas |
| --- | ---: |
| Diferencia de base2022 | +21.017 |
| Diferencia de crecimiento posterior | +86.174 |
| **Total** | **+107.191** |

El cambio de crecimiento se descompone, usando exactamente AV128, en
−2.654 por nacimientos, +7.015 por defunciones y +81.813 por migración
internacional; las demás aportaciones no cambian. La suma es86.174.
Se conservaron las dos identidades y los hashes de informes de entrada.

Esta reconciliación cuantifica la revisión entre dos referencias publicadas.
Las notas no proporcionan un experimento que permita asignar cada persona
de esa revisión a una innovación metodológica concreta. El porcentaje75 %
de V2024 es un parámetro descrito por Census, no una corrección que deba
aplicarse de nuevo al CSV ni una medida de incertidumbre de la proyección.

## Consecuencia para la investigación

El resultado sigue siendo: la proyección oficial tuvo menor error absoluto
que los comparadores predefinidos en estos dos horizontes, frente a las
referencias fijadas. Su diferencia de crecimiento tiene una aportación
negativa importante en migración neta. No se convierte ese hallazgo en
causalidad, calibración o validación general.

Para una ampliación futura deben fijarse antes del cálculo el origen,
la versión de proyección, las referencias y el tratamiento de revisiones.
Conservar el resultado v1 y presentar cualquier nuevo análisis como
exploratorio/adaptado o evaluarlo prospectivamente. DEM-02/04 PARCIAL/NO;
WPP sigue separado. No se emite forecast ni se aprueban gates.
