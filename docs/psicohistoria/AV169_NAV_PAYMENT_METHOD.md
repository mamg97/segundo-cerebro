# AV169 · Método NAV reconciliado desde documentación del emisor

29/10/2026. El prospecto SPY de26ene2026, recuperado desde el enlace del
producto a su visor oficial, establece la reinversión al NAV de las fechas
de pago. Se archivó el PDF original y se inspeccionaron sus páginas relevantes.
La captura HTML de una redirección anterior sigue identificada como HTML.

El [contrato por periodo](NAV_PAYMENT_METHOD_CONTRACT.md) quedó publicado en
`4b9ea943` antes del nuevo contraste. Reconoce derechos en fecha ex, mantiene
cuentas por cobrar y convierte efectivo en participaciones en fecha de pago.
No consulta NAV posteriores al cierre para valorar derechos pendientes.

Los mismos seis plazos de la ficha concuerdan ahora con la tolerancia original.
La aproximación ex-NAV de AV167 y sus diferencias permanecen archivadas;
no se amplió la tolerancia ni se corrigió el fichero del emisor. El cambio
responde a documentación primaria nueva, no a selección de un resultado.

Siete pruebas nuevas y nueve del intake correctas: derechos previos a la
compra, efectivo pendiente, reinversión, NAV de pago ausente, datos futuros,
incidencias por periodo y CLI privada exclusiva. Un ledger independiente de
eventos, con openpyxl/Decimal sin importar código del proyecto, reproduce
todos los estados diarios y comparaciones por periodo.

## Límite de la conclusión

La incoherencia de fechas2006 sigue en la fuente global. Los plazos contrastados
no la utilizan; un periodo que la contenga se rechaza. La concordancia acredita
una definición por esos periodos, no toda la historia del proveedor.

No se convierte el ledger en una cotización ajustada ni se concatenan retornos
independientes. No hay fuente admitida globalmente, procedencia histórica as-of,
calendario completo o acciones corporativas de toda la historia acreditados.
Tampoco hay modelo admitido, nueva emisión bursátil ni riesgo actual calculado.
Los modelos negativos AV166/168 y los originales macro/anual no se modifican.

Siguiente paso: contrato de uso temporal y evaluación futura de referencias,
con disponibilidad/corte reales y resultados posteriores; ninguna operación
real o integración de cartera se deriva de este control contable.

Fuente estable: https://www.ssga.com/us/en/individual/resources/doc-viewer#spy&prospectus
