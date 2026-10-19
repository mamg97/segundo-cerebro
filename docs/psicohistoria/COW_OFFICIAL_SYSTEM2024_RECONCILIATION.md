# PSICOHISTORIA — Cotejo directo del panel oficial COW `system2024`

**19 de octubre de 2026 — investigación científica, no evaluación as-of.**

## Fuente original de Correlates of War

El [sitio oficial de State System Membership v2024](https://correlatesofwar.org/data-sets/state-system-membership/)
enlaza directamente el archivo
[System2024.zip](https://correlatesofwar.org/wp-content/uploads/System2024.zip).
Durante la ejecución efímera de GitHub Actions se descargaron los bytes
**del servidor del proveedor**, no una tabla simulada ni un panel
construido a partir de incidentes.

El ZIP contiene `System2024/system2024.csv` (391.036 bytes) y su
equivalente Stata, junto con metadatos de macOS. El CSV original tiene
**17.511 observaciones y cuatro columnas**: `ccode`, `stateabb`,
`statenme`, `year`.

SHA-256 **observados en octubre de 2026**, no certificados para fechas
anteriores:

- ZIP oficial: `de7cae05d9908cff3606df185518cda380dbdc4c4f24739e72b0b13c1cb4a3d4`
- CSV extraído: `1186f0c30fe549967bb5d33d0084ca47d6ab8215e298ec5ad83d34b6dbb04ea8`
- Intervalos COW v2024 en [copia académica fijada a commit](https://github.com/brentonk/us_diplomatic_missions/blob/0dda0ef93b7958f67c79031c1695dd9e5408a62c/input/cow_statelist2024.csv):
  `722153b45eda9c39826a04aab80ca7b29a8b1cfdfe5d92714503420555675484`

Ningún archivo original ni fila país–año se ha añadido al repositorio.
Ambos archivos se obtienen en cada workflow a directorios temporales
del runner y se borran incluso en caso de fallo.

## Método

`research/psychohistory/cow_official_system2024.py` comprueba que
el ZIP proviene de una descarga válida y controla tamaño, rutas
peligrosas, número de entradas, CSV único, esquema y hash actual.

`research/psychohistory/cow_official_system_reconcile.py` valida
de forma **independiente**:

1. Integridad de los tres archivos por SHA-256 observado.
2. Cada combinación `(ccode, year)` única en el CSV **oficial**.
3. Para cada intervalo de pertenencia de `states2024`, el conjunto
   de códigos–año abarca todos los años inclusivos.
4. Igualdad completa entre el conjunto oficial y el reconstruido,
   informando por separado códigos–año faltantes y sobrantes.
5. Abreviatura oficial compatible con **alguna** de las abreviaturas
   de ese código–año, sin identificar automáticamente un único
   territorio entre sucesiones históricas.

No se usa ausencia de filas de violencia como negativo, ni se
convierte código COW a `country_id` de GW/UCDP. Se calcula
exclusivamente una relación descriptiva **COW frente a COW**.

## Resultado empírico: conciliación exacta

Evidencia: [GitHub Actions de la PR #669](https://github.com/mamg97/segundo-cerebro/actions/runs/39247155902).

| Métrica agregada | Resultado |
|---|---:|
| Códigos–año únicos en el CSV oficial | **17.511** |
| Códigos–año reconstruidos desde intervalos | **17.511** |
| Códigos–año coincidentes | **17.511** |
| Solo en archivo oficial | 0 |
| Solo en reconstrucción | 0 |
| Abreviaturas oficiales ajenas al abanico de intervalos | 0 |
| Códigos–año reconstruidos con más de una abreviatura histórica | 1 |

En **2006** se documenta una sucesión bajo el mismo código numérico
COW: hay un código–año en el que los intervalos incluyen dos
abreviaturas, mientras el panel oficial almacena una única
observación para ese código–año. La conciliación perfecta **no
certifica** qué definición de país o continuidad institucional
debe utilizar PSICOHISTORIA. El siguiente nivel científico requiere
una concordancia geográfica histórica revisada.

También se comprobó que 1990 presenta 165 códigos–año oficiales,
2002 registra 192, 2006 registra 193 y 2011, 2020 y 2024 registran
195 cada uno. En el avance 35 se había comprobado que el universo
del **1 de enero** era inferior en determinados años; esa distinción
permanece vigente.

## Límites epistemológicos

La versión COW v2024 se [anunció el 3 de noviembre de 2025](https://correlatesofwar.org/news/state-system-membership-update-v2024/).
Los checksums calculados en 2026 permiten reproducir *esta* edición,
no demostrar que sus bytes existieran antes de orígenes simulados
en 1990, 2006, 2011 o 2024.

Estos flags permanecen `false`:
`historical_state_identity_reconciled`,
`source_as_of_verified`,
`historical_byte_timestamp_verified`,
`country_negative_labels_verified`,
`backtest_authorized`, `models_scored` y `forecast_issued`.

La coincidencia **sí valida el conjunto oficial actual de códigos–año**;
NO valida una capacidad predictiva, ni el universo UCDP con países sin
incidentes, ni fuentes independientes verdaderamente disponibles en
cada fecha hipotética de predicción.

## Siguiente trabajo

Encontrar pruebas datadas de ediciones **pre-origen** y una política
explícita para identidades territoriales sucesoras y microestados.
Contrastar la cobertura del universo UCDP —incluidos países con cero
incidentes— antes de transformar un país-año en observación
supervisada válida para *onset*.
