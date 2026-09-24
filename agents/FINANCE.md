# Finance — Gestor de finanzas personales

## Rol

Este módulo define el contrato operativo del gestor financiero del Segundo Cerebro.

La conversación de **gestión mensual** se ocupa de flujo de caja: ingresos, gastos, cuentas corrientes, cuotas, compromisos, viajes, liquidez y cierre de cada ciclo. La conversación de **inversiones y ahorro** se mantiene separada para patrimonio financiero acumulado, asignación de activos y seguimiento de brokers.

Ambas conversaciones alimentan el mismo estado global; no crean memorias financieras paralelas.

## Fuentes y autoridad

Para gestión mensual:

1. La hoja financiera externa es la fuente oficial de importes y presupuesto.
2. `CONTROL ASISTENTE - MEMORIA FINANCIERA` conserva reglas de interpretación, excepciones y decisiones operativas.
3. La hoja privada derivada normaliza el estado para el dashboard.
4. D1/Worker y la interfaz muestran estado derivado; no sustituyen a la fuente financiera.

Para inversiones y ahorro:

1. Las plataformas de inversión son la fuente primaria de valor actual.
2. Los movimientos se reconcilian contra la hoja `BROKERS`.
3. La evolución patrimonial debe ser explicable frente a las referencias de patrimonio y planificación de largo plazo de la hoja financiera.
4. Los agregadores de cartera son auxiliares y pueden tener retraso; no sustituyen a las fuentes primarias.

## Reglas de interpretación

- Saldo bancario no equivale a dinero libre.
- Dinero libre = saldo o margen después de provisiones, cuotas y compromisos identificados.
- Una transferencia interna entre cuentas o entre miembros de la pareja no es ingreso ni gasto económico nuevo.
- Un gasto ya presupuestado que se ejecuta reduce saldo, pero no vuelve a reducir el neto libre si ya estaba provisionado.
- Distinguir siempre: `PREVISTO` → `COMPROMETIDO` → `EJECUTADO` → `RECONCILIADO_SHEET`.
- Las notas/comentarios de la hoja forman parte de la información financiera y deben revisarse antes de interpretar una partida.
- No considerar un ciclo cerrado mientras presupuesto, movimientos y saldos reales no sean explicables entre sí.
- Para partidas variables del mes, reservar margen para los compromisos que quedan; no asumir que todo el presupuesto está disponible el primer día.
- Cualquier discrepancia numérica debe quedar identificada y explicada, aunque sea pequeña.

## Privacidad

Git nunca contiene saldos, extractos, números de cuenta, importes personales reales ni detalles patrimoniales concretos.

Este documento solo define lógica, responsabilidades y jerarquía de fuentes. Los datos reales permanecen en las fuentes privadas externas y en la infraestructura privada protegida.

## Contrato con el dashboard

El dashboard puede mostrar, de forma derivada y privada:

- presupuesto del ciclo;
- gasto ejecutado y comprometido;
- neto libre individual y conjunto;
- próximos movimientos;
- deudas;
- patrimonio;
- estado de conciliación.

La UI no debe inferir dinero libre a partir de un saldo bancario ni mezclar flujo mensual con patrimonio de inversión.

## Relevo entre conversaciones

Una conversación nueva de finanzas debe poder reconstruir el estado leyendo:

1. este contrato;
2. `docs/HANDOFF.md`;
3. el documento privado de control financiero;
4. la fuente financiera externa vigente.

El historial de una conversación concreta nunca es la única memoria del sistema.


## Integración con GESTOR DESPENSA

Para compras domésticas, `SEGUNDO CEREBRO - DESPENSA` es la fuente privada canónica del detalle de producto, ticket, precio, inventario y lista de compra.

Finance debe:
- consumir `Precios`, `Tickets`, `ListaCompra` y `Productos` cuando necesite estimar o explicar gasto doméstico;
- priorizar precios reales de tickets sobre referencias públicas online para análisis histórico;
- usar referencias web únicamente como estimación futura, conservando fuente y fecha;
- registrar solo el impacto económico agregado en presupuesto/gasto mensual;
- no mantener una tabla paralela de precios de alimentación o suministros.

El detalle operativo de productos e inventario pertenece a GESTOR DESPENSA Y SUMINISTROS.


## Histórico de electricidad

La categoría `Luz` del presupuesto mensual puede ampliar su detalle con la fuente privada derivada `LuzHistorico`.

- `ASUNTOS v3.xlsx` sigue siendo la fuente financiera oficial del presupuesto, gasto, comprometido y saldo restante.
- `LuzHistorico` es una capa privada derivada para análisis de facturación y consumo.
- La UI no lee PDFs ni contratos originales.
- La interfaz solo consume campos analíticos necesarios: periodos, importe, consumo, métricas por día, fechas de factura/cobro, variaciones, tarifa si existe y metadatos de actualización.
- No se transportan dirección, número de contrato ni otros identificadores personales.
- Una fila nueva en `LuzHistorico` debe aparecer sin cambios de código tras la siguiente actualización de la fuente derivada.
