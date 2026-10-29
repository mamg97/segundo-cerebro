# AV167 · Auditoría de NAV y distribuciones del emisor

29/10/2026. El histórico del emisor permite avanzar hacia una fuente diaria
reciente. NAV por participación, precio de mercado y retorno total son
objetos distintos: no se renombran columnas para encajar el piloto bursátil.

El [contrato de transformación y tolerancia](ETF_ISSUER_SOURCE_CONTRACT.md)
se publicó en `7d4667ca` antes de calcular concordancia. Se preservan los
XLSX originales, ficha y captura privada. Lector estándar de XLSX con huellas,
identidad de fondo, fechas, dividendos/ganancias y control de trimestres.
Las filas vacías omitidas por Excel conservan su número real; se rechazan
fórmulas, enlaces externos, fechas duplicadas y saltos que requieren revisión.

## Decisión: fuente aún no admitida

Existe una incoherencia original entre fechas de pago y registro. Se conserva
como incidencia, sin imputar una fecha correcta. La transformación ex-NAV
sólo produce un diagnóstico matemático: no supera el gate de metadatos.

La comparación con seis plazos de la ficha mensual también falla la tolerancia
prefijada en parte de los plazos. No se amplía esa tolerancia ni se cambia
reinvención, fecha o fórmula para forzar concordancia. La diferencia puede
depender de metodología del emisor; la causa todavía no está acreditada.

Nueve pruebas ficticias y CLI privada exclusiva correctas. Un lector
independiente openpyxl/Decimal reproduce todas las filas y diferencias de
retornos exactamente, sin importar el motor del proyecto. La ficha se revisó
visualmente para distinguir NAV de Market Value e Index, y acumulado de anual.
Las observaciones, cantidades y comparaciones completas permanecen privadas.

Resultado `SOURCE_METADATA_AND_PERFORMANCE_BLOCKED`, no source admission,
scoring, forecast, señal ni riesgo actual. Las marcas de disponibilidad
histórica y acciones corporativas verificadas también continúan falsas.

## Continuación concreta

Obtener definición primaria del método de retorno y evidencia histórica de
la distribución inconsistente, o admitir otra fuente conforme a su contrato.
La regularidad genérica del calendario no corrige por sí sola una fila.
La fecha de captura tampoco demuestra disponibilidad histórica. Mantener
esta auditoría separada del modelo agregado descartado en AV166.

Esperar esos documentos no obliga a detener una prueba independiente de
distribución de pérdidas con la fuente de investigación ya archivada. No
recalcular AV166 ni inferir rentabilidad operativa de un control contable.
