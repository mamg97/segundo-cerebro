# Fuente diaria del emisor: NAV y distribuciones

29/10/2026. Esta unidad resuelve procedencia e interpretación de datos actuales;
no recalcula ni rescata el modelo descartado en AV166. No emite probabilidades.

Fuentes primarias enlazadas desde el producto del emisor: histórico NAV XLSX,
histórico de distribuciones XLSX y ficha oficial mensual PDF. Conservar bytes,
URL, captura UTC y SHA256, sin inferir primera publicación. Lectura privada;
el acceso gratuito no concede licencia abierta ni redistribución comercial.
No enviar originales del proveedor a Git o a terceros.

## Transformación candidata, fijada antes de contrastar retornos

- Identificar explícitamente ticker y tipo de tabla; filas NAV únicas,
  positivas y descendentes; fechas de distribuciones y componentes exactos.
- Sumar dividendo y ganancias de capital cortas/largas en la fecha ex-dividendo;
  blancos en esos componentes monetarios se interpretan como cero sólo en el
  esquema explícito del emisor. Falta de una fila no implica distribución cero.
- Verificar que cada fecha ex en la cobertura NAV tenga una sesión, y al menos
  una distribución por trimestre completo para el fondo trimestral estudiado.
- Proxy de reinversión en NAV de fecha ex:
  W[t]/W[t−1]=(NAV[t]+distribución[t])/NAV[t−1]. No es precio de mercado,
  cartera ejecutada, rentabilidad tras impuestos ni reconstrucción de splits.
- Un salto NAV diario absoluto superior al 30 % bloquea la transformación
  hasta revisar acción corporativa/error; ausencia de saltos no demuestra que
  no hubiera acciones corporativas. No ajustar automáticamente por ratios.
- Contrastar retornos QTD/YTD/1/3/5/10 años con ficha al mismo corte mensual;
  anualización exacta para plazos de varios años. Tolerancia prefijada
  **0,03 puntos porcentuales**. Si discrepan, conservar discrepancia y bloquear
  la admisión total-return; no cambiar fecha de reinversión para forzar ajuste.

## Puertas que siguen separadas

La primera lectura encuentra metadatos de pago anteriores al registro en una
fila histórica. No se corrigen ni se descartan. Se conservan como incidencia
`SOURCE_METADATA_BLOCKED`: se permite contrastar matemáticamente la proxy
ex-NAV porque no usa la fecha de pago, pero esa transformación diagnóstica no
supera el gate de coherencia ni permite scoring o emisión. Los criterios y
tolerancia de contraste fijados arriba permanecen idénticos.

Integridad XLSX, coherencia de calendario/distribuciones y concordancia con
retornos publicados son controles distintos. El producto de esta unidad sigue
siendo CANDIDATE_SOURCE_ONLY: revisiones históricas, acciones corporativas,
precio de mercado, disponibilidad real y uso/licencia para producción requieren
su propia evidencia. No aplicar directamente una logística de mercado agregado
a un ETF ni atribuirle habilidad por coincidir una transformación contable.

Entregable completo: lector reproducible sin dependencias nuevas, pruebas
ficticias de corrupción/fechas/duplicados/splits, CLI privada exclusiva y
contraste independiente openpyxl/Decimal con originales. Resultado de admisión
documentado, positivo o bloqueado, y una sola PR agrupada.
