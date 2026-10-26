# AV142 — Mapa de madurez conectado a la fuente privada

Mejora deliberada de interfaz y lectura de datos. La vista anterior solo leía
hitos V1–V4 y no exponía las fases por dominio ni la bitácora de avances.
Se añaden dos rangos acotados a la API privada bajo demanda y caché existente.
Si falla su lectura, el panel muestra fuente no disponible, nunca cero avance.

Inicio e Hitos presentan áreas desplegables con etapas verificadas, parciales,
bloqueadas y pendientes; evidencia, bloqueo y siguiente acción proceden del
registro privado. Solo COMPLETADA junto con criterio SI cuenta como verificada.
Las barras cuentan etapas y nunca representan porcentaje de utilidad.
Se distinguen actividad de7/14días completos y próxima comprobación prevista.
Las fechas proceden de emisiones sin resultado, excluyendo borradores; el bloque
anual anterior se identifica expresamente como geopolítico.

Pruebas sintéticas: límites de fecha, criterios incompletos, escape HTML,
fuente ausente y exclusión de borradores/resultados ya resueltos. Quince pruebas
locales de progreso, briefing y navegación pasan. Sin predicción nueva ni
promoción de fase científica. Publicación y comprobación real de producción
se registran por separado, no quedan acreditadas por este documento.

Dirección visual: conservar tema oscuro y tipografía del laboratorio;
matriz compacta por áreas, etapas con etiqueta y detalle progresivo mediante
controles nativos de teclado. Lectura en escritorio y columnas apiladas móvil.

## Revisión integrada antes de publicar

101 pruebas locales del adaptador y módulos de investigación correctas.
Se corrigieron dos comprobaciones de versión estática obsoletas. El adaptador
rechaza esquema ausente y respuestas denegadas, minimiza campos y reutiliza caché.
Vista integrada contra copia privada actual de fases, avances, hitos y predicción: recuentos y fecha coinciden.
Escritorio y viewport móvil revisados; detalle nativo abre correctamente y el
ancho del documento coincide con viewport medido433px, sin desbordamiento global.
No se usó la copia local como prueba del endpoint desplegado. Pendiente CI/producción.
