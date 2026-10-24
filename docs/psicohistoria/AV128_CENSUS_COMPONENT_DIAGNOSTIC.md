# AV-128 · Descomposición contable del error de crecimiento Census

24/10/2026. Diagnóstico exploratorio diseñado después de los resultados
AV127. Conserva intactos el protocolo v1, sus referencias y sus errores.

## Definiciones y trazabilidad

El libro de proyección `np2023-t1.xlsx`, nota A90, define componentes entre
el 1 de julio del año anterior y el 30 de junio del año indicado. Las
definiciones de [Vintage2024](https://www2.census.gov/programs-surveys/popest/technical-documentation/file-layouts/2020-2024/NST-EST2024-ALLDATA.pdf)
y [Vintage2025](https://www2.census.gov/programs-surveys/popest/technical-documentation/file-layouts/2020-2025/NST-EST2025-ALLDATA.pdf)
usan los mismos intervalos anuales en los campos de componentes. Se
acumulan2023–2024 para julio2024 y2023–2025 para julio2025.

Se archivaron ambos CSV oficiales y sus dos diccionarios PDF, con URL,
fecha de recuperación, tamaño, cabeceras y SHA-256. Los CSV proceden de
los enlaces de las páginas oficiales de [V2024](https://www.census.gov/newsroom/press-kits/2024/national-state-population-estimates.html)
y [V2025](https://www.census.gov/newsroom/press-kits/2026/national-state-population-estimates.html).
Cada uno contiene66registros y una única fila nacional SUMLEV010,
STATE00, NAME United States. Los totales de2022 y objetivos coinciden
exactamente con los XLSX ya fijados por AV126/127.

Se comprobaron las identidades de cambio natural, migración neta y cambio
total, incluido el residuo explícito. El cambio de población no se
reconstruye eliminando valores desconocidos o forzando residuos a cero.

## Resultado

Las cifras son aportaciones firmadas a la **diferencia de crecimiento**,
en personas. La revisión de la base2022 permanece separada en AV127.
Para defunciones se usa el signo inverso: más defunciones proyectadas
reducirían la población proyectada.

| Aportación | 2024 / V2024 | 2025 / V2025 | 2024 / V2025 (sensibilidad) |
| --- | ---: | ---: | ---: |
| Nacimientos proyectados menos estimados | +4.541 | +18.426 | +1.887 |
| Defunciones estimadas menos proyectadas | +467.210 | +615.828 | +474.225 |
| Migración internacional neta proyectada menos estimada | −3.372.418 | −3.694.807 | −3.290.605 |
| Menos migración doméstica estimada | 0 | 0 | 0 |
| Menos residuo explícito estimado | 0 | 0 | 0 |
| Residuo de proyección no asignado a componentes | +1.000 | 0 | +1.000 |
| **Diferencia total de crecimiento** | **−2.899.667** | **−3.060.553** | **−2.813.493** |

La migración internacional neta tiene la mayor aportación negativa en
esta identidad. Nacimientos y, especialmente, defunciones compensan una
parte. El residuo de1000personas en2024 se conserva: surge al comparar
cambios de stocks y suma de componentes publicados en miles. No se
redistribuye arbitrariamente a una variable.

Estas son diferencias entre proyecciones y estimaciones posteriores,
que incorporan revisiones y decisiones metodológicas. La identidad no
establece cuánto cambio real ocurrió por una causa particular, ni cuánto
del error se debe a una nueva metodología. Tampoco prueba que reestimar
la migración mejore una predicción fuera de esta muestra.

## Verificación reproducible

`research/psychohistory/census_component_diagnostic.py` fija hashes de
dos CSV, la proyección y el informe AV127. Rechaza duplicados, celdas
vacías/no aplicables convertidas a cero, unidades o ventanas inesperadas,
identidades rotas y discrepancias entre totales CSV/XLSX. No sobrescribe
informes existentes.

Siete pruebas sintéticas verifican selección nacional, registros mal
formados, enteros, identidades, signo de defunciones, conservación de
residuos y ventanas temporales. El informe real cierra las tres sumas
con AV127. Un lector XLSX independiente contrastó21aportaciones y sumas.

Informe privado SHA-256:
`7655d6e7eee284d04e2348e74f2f658f3ced69bbf956c2cbd123d57a2fb2eaab`.
Los hashes completos de originales y código se incluyen en el informe
y manifiesto privado; no se publican filas canónicas del seguimiento.

```bash
python3 research/psychohistory/census_component_diagnostic.py \
  --source-dir /PRIVATE/census-resident-sources \
  --component-dir /PRIVATE/census-component-sources \
  --output /PRIVATE/census-component-report.json
```

DEM-03/04 siguen PARCIAL/NO. Próximo: documentar cambios metodológicos
entre vintages si se necesita interpretar las aportaciones, o avanzar
otra línea independiente. Ningún forecast propio, gate aprobado ni
calibración probabilística se deriva de esta descomposición.
