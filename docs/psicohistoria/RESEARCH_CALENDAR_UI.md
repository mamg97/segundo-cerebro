# Calendario privado de investigación

28/10/2026. Extensión de Inicio y Mapa del proyecto, con la identidad visual
existente. La tabla privada `PsicoCalendario` guarda el plan de trabajo y sus
condiciones, separadamente de `PsicoPredicciones` y sus resultados.

Columnas mínimas: `plan_id,dominio,titulo,fecha_utc,precision_fecha,tipo,condicion,
limite_interpretacion,estado,actualizado,evidencia_url`. Lectura acotada A1:L100;
una tabla llena, esquema ausente o error no elimina predicciones ni fases.
Sólo se exponen esos campos en el endpoint privado; caché existente30segundos,
sin polling nuevo. No hay escritura desde la web ni destinos públicos nuevos.

El calendario distingue instantes UTC mostrados en Madrid, meses previstos,
límite «desde el año» sin fecha de publicación, y líneas sin fecha defendible.
Es planificación guardada: no lee en vivo el estado de las automatizaciones.
Las fechas vencidas se marcan para revisión; nunca se convierten automáticamente
en emisión, omisión, resolución o éxito. IDs duplicados, fechas imposibles y
tipos/estados desconocidos se excluyen. Texto escapado y links sóloHTTPS.

Los pasos cercanos aparecen antes de los ensayos históricos. Las condiciones se
abren por fila; revisión semanal de enero, cohorte anual desde2028 y mercados
aplazados se agrupan en un desplegable. La fecha del dato DOL sigue orientativa
hasta confirmar calendario/release efectivo; BLS también requiere confirmación.
No se promete habilidad o utilidad para enero/2028. En el mapa, la antigua
«próxima comprobación» se renombra como resultado de una **emisión registrada**:
no debe confundirse con el siguiente trabajo de desarrollo.

La carga inicial de siete hitos se escribió/releyó en la fuente canónica
privada, con validación nativa de estado/precisión de fechas. Se preservaron
predicciones, probabilidades, fases y seguimientos existentes.

Validación:147pruebas de integración del laboratorio y sus adaptadores PASS,
incluyendo seis nuevas de calendario/adapter, fechas, mes, año desconocido,
fallo aislado, caché, metadatos innecesarios, duplicados yHTMLmalicioso.
Vista local integrada comprobada a1280y433pxsin desbordamiento horizontal;
condiciones desplegadas y límites anuales visibles. El fixture local no es
producción ni prueba de emisiones; comprobación de fuente real tras despliegue
se documenta en el checkpoint privado. Detector de diseño ejecutado: advertencias
sobre tipografía/glows/retícula del sistema heredado; no se reemplaza su identidad
ni se añaden esos efectos al calendario. Sin rondas de rediseño o pulido abierto.
