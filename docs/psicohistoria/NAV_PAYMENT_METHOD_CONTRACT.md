# Retorno NAV por periodo y reinversión en pago

29/10/2026. Evidencia nueva: prospecto SPY fechado26ene2026, recuperado por
el visor del emisor; página26 de96, nota(b) de Financial Highlights: reinversión
en NAV de las respectivas fechas de pago. Página8 explica una aproximación
de final de año cuando el pago de enero todavía no había ocurrido.

Fuentes: enlace público de producto → Prospectus → visor RightProspectus,
archivo original privado, SHA256 y páginas renderizadas. Las antiguas rutas
APAC/EMEA redirigen HTML o404; no se presentan como PDF recuperado. El documento
SEC2009 había dado la pista, pero no se usa como sustituto del prospecto2026.

El diagnóstico ex-NAV de AV167 permanece intacto y bloqueado. Esta definición
se fija ANTES del nuevo cálculo de concordancia, sin variar tolerancia0,03pp.
No es otra versión de los modelos negativos ni un experimento bursátil nuevo.

## Ledger por periodo, sin datos de pagos posteriores al corte

- Comprar teóricamente una participación al NAV inicial del periodo, sin
  derechos sobre dividendos cuya fecha ex ya pasó. No es una orden real.
- En cada fecha ex dentro del periodo, reconocer una cuenta por cobrar igual
  al importe distribuido por las participaciones mantenidas antes de esa fecha.
- En fecha de pago, convertir esa cuenta en participaciones adicionales al
  NAV de ese día. No invertir anticipadamente el dividendo en fecha ex.
- Al cierre del periodo, riqueza = participaciones*NAV + derechos pendientes
  a valor nominal. No consultar NAV futuros para pagos aún no ocurridos.
  Se trata de un supuesto contable explícito sujeto al contraste, no de una
  cotización ejecutable. Las comisiones y fiscalidad siguen excluidas.
- Retorno por periodo respecto a su NAV inicial; anualizar sólo plazos de
  varios años. No concatenar retornos independientes para inventar un precio
  ajustado o un índice causal global.

## Incidencias y prueba externa

La fila de fechas inconsistentes2006 sigue presente en el diagnóstico global.
Un periodo que la incluya queda bloqueado; los periodos posteriores pueden
contrastarse sin utilizar ni corregir esa fila. Se informa siempre la
incidencia global: concordancia de periodos no limpia todo el proveedor.

Comparar los MISMOS seis plazos de la ficha30sept2026, misma tolerancia0,03pp,
con los resultados originales conservados. Si no concuerda, mantener bloqueo;
no probar fechas o cifras alternativas hasta forzar coincidencia. Si concuerda,
acredita únicamente coherencia de la definición por esos periodos. No acredita
calendario completo, procedencia histórica as-of, ausencia de revisiones,
acciones corporativas de toda la historia ni capacidad predictiva.

Entregar ledger, pruebas de derechos/pagos/periodos, CLI privada y contraste
independiente. No publicaciones de datos, probabilidades, TSV/Sheets o
solicitudes TSA sin los permisos específicos aplicables.
