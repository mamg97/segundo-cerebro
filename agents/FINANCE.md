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

El seguimiento MIDAS de carteras ficticias es un laboratorio separado: la fuente es el diario público de `mamg97/midas-paper-lab`, leído sin escritura a través de `GET /api/midas`. Su capital demo nunca se suma al patrimonio personal ni se reconcilia contra `BROKERS`. Cada fila conserva estado, fecha de última sesión, variación frente al cierre anterior y rentabilidad acumulada; la ausencia de diario o de cierre previo se muestra como desconocida, no como 0 %. La línea `capital_cycle_inflection_2026` es una campaña prospectiva adicional: retirada multianual de capital + supervivencia financiera + valoración normalizada + confirmación de giro, con señal mensual y ejecución paper en la apertura siguiente. No se presenta como estrategia validada ni se mezcla con patrimonio real.

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


## Liquidez por cuenta y distribución patrimonial

El dashboard distingue dos visualizaciones privadas complementarias:

### Liquidez por cuenta

La fuente derivada puede exponer las pestañas privadas `Cuentas` y `ReservasCuenta`.

`Cuentas`:
- `account_id`: identificador estable de la cuenta;
- `name`: nombre legible;
- `bank`: entidad;
- `owner`: Miguel, Andrea o Común;
- `balance`: saldo actual conocido;
- `free_amount`: opcional; si falta, se deriva como saldo menos reservas;
- `currency`;
- `updated_at`;
- `note`.

`ReservasCuenta`:
- `account_id`;
- `label`: destino de la reserva;
- `amount`;
- `status`;
- `kind`;
- `priority`;
- `note`.

Reglas:
- cada cuenta se representa como una barra segmentada por reservas y dinero libre;
- las reservas representan dinero con destino ya identificado, aunque siga físicamente en la cuenta;
- si las asignaciones superan el saldo, la UI debe marcar discrepancia y no ocultarla;
- no se hardcodean saldos ni nombres reales de cuentas en Git;
- el Gestor de Finanzas mantiene estas asignaciones cuando el usuario comunica nuevos saldos, provisiones o liberaciones.
- la leyenda visual de una cuenta nunca puede comprimir texto hasta solaparlo. Cuando hay más de 6 segmentos/compromisos, la tarjeta abandona el reparto vertical fijo asociado a líneas guía y usa filas de altura natural; se prioriza legibilidad sobre conservar las líneas conectoras.

### Liquidez real por cuenta

El saldo bancario, el disponible bancario y el dinero libre interno son magnitudes distintas y deben mostrarse por separado.

Para cada cuenta:
- `balance` = saldo contable observado;
- retenciones activas = operaciones bancarias todavía no consolidadas;
- disponible bancario = saldo contable menos retenciones;
- compromisos internos = pagos, sobres y transferencias pendientes dentro del ciclo;
- `free_amount` = disponible bancario menos compromisos internos todavía pendientes.
- En cuentas comunes con presupuesto por sobres, cualquier sobrante provisional de partidas ya ejecutadas permanece en una reserva `cycle_surplus_buffer` hasta el cierre explícito del ciclo; no se muestra como dinero libre ni como ahorro antes de decidir su destino.

Reglas:
- una partida presupuestaria no ejecutada no se etiqueta como «dinero libre» si todavía corresponde a una obligación o sobre del ciclo;
- alquiler, cuotas, recibos y demás cargos recurrentes deben existir en `ReservasCuenta` antes de calcular el libre interno;
- los recibos ya ejecutados se marcan terminales y no se vuelven a reservar;
- la fuente maestra `ASUNTOS v3.xlsx` es estrictamente solo lectura;
- el histórico bancario se conserva en `MovimientosCuenta`, con `account_id`, fecha, concepto, importe, saldo posterior y trazabilidad de importación;
- la UI presenta `MovimientosCuenta` en un único workspace con pestañas por cuenta. Las pestañas se derivan de las cuentas conectadas y del propio histórico, nunca se hardcodean; una cuenta conectada sin movimientos debe seguir apareciendo con estado vacío explícito.
- un histórico bancario puede confirmar la ruta real de pago y corregir asignaciones de cuenta sin modificar el maestro.

### Cuentas de crédito y financiaciones

Las tarjetas de crédito y financieras con saldo propio no se modelan como cuentas corrientes ni como un único gasto domiciliado.

La capa privada derivada puede exponer:

`CuentasCredito`:
- identificador estable de la cuenta de crédito;
- entidad/proveedor y titular;
- cuenta bancaria donde se domicilia el recibo;
- saldo pendiente bruto;
- saldo revolving y saldo de aplazamientos por separado;
- reembolsos de terceros pendientes;
- exposición económica propia después de esos reembolsos;
- próximo recibo estimado;
- límites de crédito y fecha de actualización.

`ECIProductos`:
- productos vigentes o cerrados de Financiera El Corte Inglés;
- tipo: revolving o aplazamiento;
- responsable económico real: común, personal o tercero;
- cuota, saldo pendiente, plazo actual/total, interés y vencimiento;
- reembolso de tercero cuando exista.

`ECIHistorico`:
- conciliación mensual del recibo;
- saldo revolving inicial, compras, intereses, cuota y saldo final;
- aplazamientos incluidos en el recibo;
- total cobrado y trazabilidad de fuente.

`ECIMovimientos`:
- compra/devolución individual identificada en extractos ECI;
- fecha, comercio/departamento, importe y bucket de financiación;
- permite reconstruir qué operaciones han alimentado el saldo revolving sin asignar artículos no soportados por el extracto.

`ECIFuturo`:
- calendario de cargos futuros conocidos o proyectados;
- cuotas contractuales de aplazamientos, reembolsos de terceros y exposición neta del hogar;
- para revolving, cualquier fila futura debe estar marcada como proyección y documentar el supuesto de no realizar nuevas compras.

Reglas:
- un recibo domiciliado de una financiera se descompone siempre en sus componentes antes de clasificarlo;
- un gasto de tercero financiado con una tarjeta propia se mantiene visible en el saldo bruto, pero su reembolso esperado se separa de la exposición económica del hogar;
- una compra revolving no se asigna a una categoría concreta sin soporte del extracto;
- los extractos y cifras reales permanecen en la fuente privada; Git solo contiene el contrato y la lógica;
- la UI privada puede mostrar una sección específica de crédito alimentada dinámicamente por estas estructuras.

### Asignaciones internas de eToro

Parte del valor de eToro puede estar invertida pero económicamente comprometida para retiradas futuras. No se trata como liquidez libre ni se resta del patrimonio bruto: se visualiza como una segmentación interna del valor actual de eToro.

`EtoroAsignaciones` contiene:
- importe nominal todavía reservado por destino;
- salida mensual prevista;
- siguiente retirada y última retirada conocida;
- propietario económico, fuente y nota de conciliación;
- bloque `core` = resto de eToro no comprometido por esas reservas, derivado del último `PatrimonioDetalle`.

Reglas:
- 100 % de la barra eToro = valor actual de eToro en `PatrimonioDetalle`;
- las reservas nominales provienen del maestro y de sus comentarios/planes, no de una estimación de mercado;
- la variación de mercado se absorbe en el bloque `Resto inversión eToro` hasta el siguiente cierre;
- una retirada ejecutada reduce o cierra el bloque correspondiente; no se descuenta dos veces del patrimonio;
- si maestro, comentario y tabla fechada discrepan en la fecha final, conservar la discrepancia en la nota y usar la tabla fechada más explícita para la programación operativa.

### Distribución patrimonial

La fuente derivada puede exponer `PatrimonioDetalle` con:
- `id`;
- `platform` o custodio;
- `amount`;
- `asset_class`;
- `currency`;
- `updated_at`;
- `status`;
- `note`.

La UI muestra una composición visual del patrimonio por custodio/plataforma. El objetivo es saber de un vistazo dónde está el patrimonio, no sustituir el detalle operativo de Coinbase, eToro, Interactive Brokers, BBVA u otras plataformas.

El total de `PatrimonioDetalle` debe poder conciliarse con el patrimonio agregado cuando ambas cifras correspondan a la misma fecha y perímetro. Una diferencia debe mostrarse o investigarse, no asumirse como correcta.

### Diario de patrimonio

La fuente privada derivada puede exponer `PatrimonioDiario` como histórico de cierres nocturnos de la cartera. Sustituye operativamente al antiguo hábito manual **Diario mercados** sin convertir Git ni HabitQuest en fuente patrimonial.

Campos:
- `date`: fecha local del cierre;
- `patrimony`: valor total mostrado por la fuente del cierre; puede ser `null` en históricos sin este dato;
- `currency`: moneda exacta mostrada por la fuente;
- `change_pct`: variación diaria expresada como decimal;
- `pnl_day`: P/L monetario del día;
- `movement`: clasificación descriptiva opcional;
- `action`, `comment`, `events`: contexto heredado u opcional;
- `source`, `source_row`, `source_status`, `captured_at`: trazabilidad.

Reglas:
- una captura nocturna de Delta comunicada por el usuario puede registrar o actualizar el cierre de ese día en esta fuente privada derivada;
- se conservan exactamente moneda, valor, variación y P/L que muestre la captura; no se convierte divisa ni se reconstruyen valores ausentes sin una fuente verificada;
- el histórico heredado de `DIARIO MERCADOS` de la fuente financiera se importa preservando sus anotaciones, pero un patrimonio total inexistente permanece `null`;
- `PatrimonioDiario` sirve para evolución diaria y no reemplaza `PatrimonioDetalle` como distribución actual por custodio ni `Patrimonio` como referencia histórica mensual;
- el antiguo hábito **Diario mercados** queda archivado: el registro pasa a Finanzas → Patrimonio y deja de formar parte de la adherencia de hábitos.



## Responsabilidad de ORGANIZADOR sobre Finanzas

ORGANIZADOR y la capa de interfaz son consumidores de solo lectura del estado financiero ya mantenido por GESTOR FINANZAS.

- No crean cuentas, reservas, retenciones ni posiciones patrimoniales paralelas.
- La UI puede separar visualmente reservas de tipo `card_hold` como retenciones bancarias sin duplicarlas en otra tabla.
- `Cuentas`, `ReservasCuenta` y `PatrimonioDetalle` siguen siendo las estructuras privadas derivadas que alimentan estas vistas.
- La visualización de liquidez representa siempre el saldo actual como 100% de la barra; cualquier compromiso que exceda ese saldo se informa aparte y no aumenta la barra.
- La visualización patrimonial toma `PatrimonioDetalle` para la distribución actual y mantiene `Patrimonio` como referencia histórica. Las diferencias entre snapshots de distinta fecha no se presentan como conciliación 1:1.


### Histórico de operaciones Delta

- Los exports de Delta son una **fuente auxiliar privada** para reconstruir actividad histórica de inversión, no una fuente contable primaria de valoración actual.
- El archivo bruto se conserva privado e íntegro; las filas automáticas de sincronización/balance se mantienen para trazabilidad pero se excluyen de las métricas de operativa real.
- Segundo Cerebro resuelve la hoja privada de histórico mediante la clave `DELTA_OPERATIONS_SHEET_ID` de `IntegracionesPrivadas` y la carga solo cuando se abre el detalle patrimonial.
- La vista puede mostrar número de compraventas, activos, días activos, actividad anual, volumen bruto por divisa, activos más operados y operaciones individuales paginadas.
- El volumen bruto transaccional no equivale a beneficio, rentabilidad ni aportación neta.
- No se debe inferir P/L histórico total únicamente a partir del export: para ello harían falta lotes/coste, corporate actions, divisas y flujos externos reconciliados.
