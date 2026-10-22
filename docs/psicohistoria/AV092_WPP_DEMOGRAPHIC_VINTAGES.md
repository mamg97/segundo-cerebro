# AV-092 — Primera auditoría de ediciones demográficas WPP

22/10/2026. Línea de demografía independiente de UCDP y de RUC. Auditoría
de procedencia y compatibilidad, sin evaluación de habilidad predictiva.

## Fuentes oficiales preservadas

El [catálogo de descargas WPP de la ONU](https://population.un.org/wpp/assets/downloads.json)
enlaza la edición 2024 y el ZIP histórico 2022. Se conservaron fuera de Git
el catálogo, el CSV comprimido 2024 completo, el miembro CSV de indicadores
medios 2022 y las [notas de publicación 2022](https://population.un.org/wpp/assets/Files/WPP2022_Release-Note-rev1.pdf)
y [2024](https://population.un.org/wpp/assets/Files/WPP2024_Release-Note.pdf).
El miembro 2022 se extrajo con solicitudes de rango del ZIP oficial de
3,5 GB: el CRC ZIP y SHA del miembro quedaron verificados, **no** el SHA ni
los bytes completos del contenedor. El 2024 `.csv.gz` sí se archivó entero
y fijó por SHA. Los metadatos HTTP de modificación observados hoy no prueban
cuándo estuvieron disponibles históricamente esos bytes.

La ONU fecha ambas revisiones el 11 de julio de 2022 y 2024. La nota 2022
describe una corrección técnica posterior de densidad de población;
la nota 2024 compara estimaciones de población de 2023 entre ediciones.
La edición posterior incorpora censos y otros datos nuevos: es una estimación
revisada, no una verdad externa definitiva del resultado demográfico.

## Comprobación reproducible

`research/psychohistory/wpp_vintage_schema_audit.py` exige los SHA completos,
lee el CSV 2022 y el gzip 2024, y compara únicamente el indicador
`TPopulation1July` para países/áreas `LocTypeID=4`, variante `Medium`, año
2023. Es la misma unidad (miles de personas a 1 de julio) en ambas fuentes.

| Control | Resultado |
| --- | ---: |
| Columnas comunes | 67 |
| Filas de cada archivo | 43.472 (2022); 84.360 (2024) |
| Países/áreas de 2023 por edición | 237; 237 |
| ISO3, LocID y nombres coincidentes | 237 |
| Valores 2023 idénticos entre ediciones | 0 |

El último recuento demuestra que los valores se revisaron; **no** mide el
tamaño, dirección, utilidad o exactitud de esas revisiones. No se extraen
tasas de error ni se selecciona un modelo después de mirar los cambios.
La CI prueba sólo casos sintéticos; los datos reales siguen privados.

## Contrato pendiente

Para una predicción demográfica evaluable hacen falta objetivo, horizonte,
universo y benchmark fijados antes de resultados futuros. Una posibilidad
es medir la magnitud de revisión de la población de un año al publicarse una
edición posterior, pero ello mide estabilidad editorial de la ONU y requiere
un diseño propio. Otra es comparar proyecciones con censos/registrales
independientes, con definición compatible de población, país y fecha. No se
elige ninguno como target definitivo con esta auditoría. `DEM-01/02` deben
seguir `PARCIAL`; no existe emisión ni score de demografía.

**Avance posterior:** [AV-102](AV102_WPP_CENSUS_US_POPULATION_SCOPE.md)
archiva Census Vintage 2023 y compara la fila estadounidense 2023 con ambas
ediciones ONU. La diferencia de universo de facto/residente impide llamar a
la brecha «error de pronóstico». `DEM-02` continúa PARCIAL/NO.
