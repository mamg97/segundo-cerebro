# Lector de la primera cifra semanal DOL

28/10/2026. Pieza operativa para resolver el piloto semanal autorizado cuando
existan una emisión válida y su primera publicación. No cambia el protocolo,
las probabilidades, el umbral de10.000, las12semanas ni los permisos de sellado.
La semana24oct sigue omitida; ninguna fila semanal emitida o resuelta por esto.

`research/psychohistory/dol_weekly_release.py` extrae del PDF original la
narrativa **advance figure for seasonally adjusted initial claims** y la fila
**Initial Claims (SA)** de la tabla de programas estatales. Exige que coincidan
valor, sábado objetivo y las fechas de las dos semanas anteriores; verifica
además la diferencia aritmética con el dato previo revisado. No toma NSA,
insured unemployment, media móvil ni la segunda columna como nuevo resultado.

El encabezado de embargo debe coincidir con la fecha de release y su día de
semana. El año del objetivo se deriva de esa fecha, incluyendo diciembre/enero;
la hora08:30Eastern se convierte mediante America/New_York, con DST. Esta hora
es la **nominal del embargo**, no prueba de que el release se publicó realmente
entonces. Un cambio de formato, encabezado ambiguo o discrepancia bloquea la
extracción y exige revisión del original; no se elige el valor más conveniente.

El parser lee los bytes PDF fijados por SHA256 antes de extraer todas sus
páginas. Se registra versión del extractor y hash del texto extraído. La CLI
requiere un input privado y un output nuevo fuera de Git con permisos0600:

```sh
python3 research/psychohistory/dol_weekly_release.py \
  --pdf /ruta/privada/release.pdf --sha256 SHA256_DE_LOS_BYTES \
  --target YYYY-MM-DD --release-date YYYY-MM-DD \
  --out /ruta/privada/extraction-new.json
```

La lectura PDF utiliza `pdfplumber` (contraste real con0.11.9); los tests de
texto y composición no requieren instalarlo enCI. Para reproducir el contraste
usar el Python del runtime de documentos/PDF o un entorno con esa dependencia.

`candidate_from_pdf` enlaza la extracción con `resolution_candidate` existente,
conserva el umbral del plan y el límite de captura48horas desde el release
efectivo suministrado, y rechaza una hora efectiva anterior al embargo. Nunca
convierte un plan local en una emisión: resultado siempre candidato,
`forecast_issued=false`, `evaluation_eligible=false`. Antes de resolver el
registro real hay que observar origen oficial, hora efectiva/primera edición,
inscripción previa y ambos recibos originales; conservar revisiones aparte.
El URL mutable [DOL data.pdf](https://www.dol.gov/ui/data.pdf) no acredita por
sí mismo qué bytes se ofrecían el día de publicación.

## Verificación

Siete pruebas nuevas y17de dependencias pasan (24): selección correcta frente a
columnas confundibles, ambigüedad, fechas, rollover anual, DST, cero, cambios
positivos/negativos, formato numérico, pin del PDF, CLI sin sobrescritura y
composición con umbral congelado/límite48horas sin admisión.

El PDF oficial disponible durante la prueba corresponde al22oct y al objetivo
17oct, anterior al piloto. Se archivó en privado completo porHTTPS, se renderizaron
y revisaron visualmente las páginas1y4, y la CLI coincidió con narrativa/tabla:
advanceSA194.000, previo revisado200.000, diferencia−6.000. Es una prueba del
lector, **no un backtest ni una resolución prospectiva**; la captura se hizo
fuera de48horas y no permite resolver nada. No se usó el objetivo omitido24oct.
Original, cabeceras, captura, renders y extracción permanecen fuera deGit.
