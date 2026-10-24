# AV-127 · Primer ensayo Census residente reproducible

24/10/2026. Se ejecuta el contrato publicado AV126, SHA-256
`b60d344eaac44df3b0a7020bb238d9189d206c61d3b74e83abb8b2b517840271`,
fusionado antes de calcular los resultados. No se cambian objetivos,
referencias, comparadores ni métricas después de observar errores.

## Resultado descriptivo

La proyección principal Census queda por debajo de las dos estimaciones
de referencia. Tiene menor error absoluto que los dos comparadores
predefinidos en ambos horizontes. El alcance es una proyección oficial,
dos horizontes dependientes y estimaciones revisables de la misma institución.

| Objetivo / referencia | Error proyección (personas) | Error porcentual | Error absoluto constante | Error absoluto lineal |
| --- | ---: | ---: | ---: | ---: |
| Julio2024 / V2024 | −3.628.988 | −1,0670 % | 6.823.431 | 4.311.425 |
| Julio2025 / V2025 | −3.768.857 | −1,1027 % | 8.497.300 | 4.729.291 |

Media descriptiva de error absoluto: proyección **3.698.922,5 personas**,
constante **7.660.365,5**, lineal **4.520.358**. No se interpreta como
evidencia de habilidad general o validación de un modelo propio.

Fuentes de los cálculos: [proyección principal2023](https://www2.census.gov/programs-surveys/popproj/tables/2023/2023-summary-tables/np2023-t1.xlsx),
[estimaciones V2022](https://www2.census.gov/programs-surveys/popest/tables/2020-2022/state/totals/NST-EST2022-POP.xlsx),
[V2024](https://www2.census.gov/programs-surveys/popest/tables/2020-2024/state/totals/NST-EST2024-POP.xlsx)
y [V2025](https://www2.census.gov/programs-surveys/popest/tables/2020-2025/state/totals/NST-EST2025-POP.xlsx).
Se utilizaron los bytes archivados y hashes del protocolo, no una descarga
posterior que pudiera cambiar las referencias.

## Revisión de base y sensibilidad predefinida

| Objetivo / referencia | Diferencia base2022 | Diferencia de crecimiento | Suma (error total) |
| --- | ---: | ---: | ---: |
| 2024 / V2024 | −729.321 | −2.899.667 | −3.628.988 |
| 2025 / V2025 | −708.304 | −3.060.553 | −3.768.857 |

La identidad separa la diferencia al inicio del cambio posterior. La
primera parte incluye revisión y precisión de la tabla; no es una atribución
causal a nacimientos, mortalidad o migración.

En la sensibilidad fijada **2024/V2025**, el error de la misma proyección
es **−3.521.797 personas (−1,0358 %)**. La nueva referencia cambia el error
en107.191 personas respecto a V2024. Se conserva el resultado primario y
se informa la sensibilidad separada, sin seleccionar la edición favorable.

## Implementación y verificación

`research/psychohistory/census_resident_evaluation.py` ejecuta localmente,
sin red, con contrato y fuentes fijados por SHA. Resuelve la hoja por su
relación en el libro, comprueba etiquetas/años y unicidad, conserva valores
numéricos XML y convierte miles a personas con Decimal. Rechaza fórmulas
inesperadas, fuentes cambiadas, duplicados, celdas inválidas y sobrescritura.

Once pruebas sintéticas comprueban unidades/precisión, selección nacional
y fecha julio, rechazo de duplicados y datos inválidos, relaciones de hoja,
métricas analíticas, baselines, descomposición, origen fijo, hashes y
preservación del informe existente. Una lectura separada con openpyxl y
aritmética racional Fraction contrastó **54 valores** del informe real.

Informe y contraste conservados privadamente. SHA del informe:
`ac60b0afc5edd725e66d587a4064330d01f78342e6b4659070ca8ca90fba6dc1`.
El informe incluye hashes de código, contrato y entradas, celdas originales,
entradas normalizadas, fechas, métricas y límites.

```bash
python3 research/psychohistory/census_resident_evaluation.py \
  --protocol research/psychohistory/census_resident_protocol_v1.json \
  --source-dir /PRIVATE/census-resident-sources \
  --output /PRIVATE/census-resident-report.json
```

## Alcance científico y siguiente paso

DEM-03/04 permanecen PARCIAL/NO. Este ensayo adicional Census no soluciona
la incompatibilidad WPP de facto/residente. No hay predicciones propias,
calibración probabilística, intervalo de confianza, confirmación prospectiva
ni independencia estadística de la referencia. Los bytes históricos del
primer día siguen sin atestación independiente.

Conservar v1. Si se investiga la composición de la diferencia de crecimiento,
fijar un análisis separado con componentes comparables y documentación de
sus revisiones antes de atribuir causas. No ajustar este ensayo para
reducir su error ni ampliar retrospectivamente su muestra como confirmación.
