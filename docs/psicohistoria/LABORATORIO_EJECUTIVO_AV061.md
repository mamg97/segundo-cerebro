# PSICOHISTORIA — AV-061 · Laboratorio intuitivo y calendario honesto de predicciones

**Fecha:** 20/10/2026. **Producto:** Segundo Cerebro privado. **Cambio de interfaz; no entrenamiento ni nuevas probabilidades.**

## Problema identificado

La versión anterior abría el explorador técnico `Futuros` en primera posición. El usuario debía interpretar gráficos, tablas, seis pestañas y documentos extensos antes de responder tres preguntas: **¿qué hemos conseguido?, ¿qué no sabemos todavía?, ¿qué hacemos a continuación?** Los gráficos históricos y la red conceptual son útiles, pero no deben sustituir al diagnóstico inicial.

## Cambio implementado

- **Pantalla predeterminada «Inicio»**, cargada desde `/api/research-lab` bajo Cloudflare Access. El usuario puede pasar después a `Explorador`, `Riesgos 2027`, `Mapa del proyecto`, `Evidencia`, `Registro` e `Hitos`. Los módulos gráficos siguen intactos y accesibles.
- Nuevo **«PSICOHISTORIA / EN 10 SEGUNDOS»** con un vistazo ejecutivo: estado de **validación científica no demostrada**, disponibilidad condicional del observatorio 2027, horizonte de una emisión prospective y estado del scoring.
- **Cuatro pasos visuales:** `Datos → Modelos → Emitir → Evaluar`. Se advierte expresamente que terminar datos/modelos **no certifica la precisión del forecasting**.
- **Tres comentarios estratégicos:** (1) sello temporal antes de 2027 condicionado a fuente-as-of, (2) bloqueo de datos/revisión histórica, (3) separación entre **presencia** y **nueva aparición** de conflictos. Prioridades sin promesas de métricas.
- **Acciones claras:** `Ver riesgos de 2027` (pestaña privada, sin nueva URL/endpoint), `¿Funcionan los modelos?` (evidencia), `Ver mapa del proyecto` (órbitas y hitos).
- **Detalles extensos progresivos:** cronología de utilidad oculta en `<details>` accesible; diseño responsive de tarjetas y pasos para móviles; navegación desplazable horizontalmente sin botones recortados.
- Cabecera reducida y cuatro indicadores directos: países 2027 y modelos solo si existe fuente privada `SHADOW_NO_EMITIDO` única y auténtica, recuento de emisiones registrado, evaluaciones válidas. No se insertan valores reales de país o tokens en HTML/Git.
- **Pruebas ficticias** de casos sin fuente, duplicados/estado emitido falso, cambio de horizonte, simulación vs pronóstico, acciones semánticas, ausencia de enlaces privados en HTML y CSP sin `style=` inline. `.github/workflows/psychohistory-lab-brief-ui.yml`.

## Cuándo tendrá utilidad predictiva

| Uso | Condición y horizonte | Estado |
|---|---|---|
| Explorar riesgo relativo de violencia estatal durante el conjunto de 2027 | Hoja privada: 196 países × seis familias de modelos, **1.176 probabilidades**; target **≥25 muertes estatales acumuladas en el año**. No indica guerra nueva. | **Disponible de forma exploratoria**, no validada prospectivamente |
| Cohorte emitida prospectivamente para 2027 | Congelación e independencia del recibo temporal antes de las 00:00 UTC del **01/01/2027**, con as-of de fuentes/censo y definición fija del outcome. | **Pendiente**; fecha objetivo condicionada, no entrega garantizada |
| Brier y comparación prospectiva de resultados anuales de 2027 | Cuando UCDP publique una edición con el año completo, **posiblemente 2028**, sujeto a la publicación oficial. | Pendiente; no hay resultado conocido |
| Alertas útiles sobre nuevos conflictos a 30–90 días | Entrenamiento y evaluación separados por horizonte mensual, etiquetas de inicio fechadas, baseline y comparación VIEWS sin mezclar unidad mensual/anual. | **Sin fecha acreditada** |

**No es un indicador de seguridad operativa, decisión de viaje, inversión ni certeza de guerra.** Los backtests actuales de persistencia presentan señales exploratorias mejores que el inicio de nuevos episodios, sin acreditación prospectiva.

## Criterios de verificación y límites

1. **UI/repo:** PR fusionada, tests UI + CSP + regresiones científicas, guard de privacidad y workflow de despliegue Cloudflare exitosos. El cambio a `main` que toca `app/**` desencadena el Worker privado.
2. **Producción:** confirmar `Deploy production Worker` y, de ser posible, inspección visual de la interfaz con cuenta autorizada; el CI y un despliegue verde no son prueba de que la pantalla haya renderizado en el dispositivo del usuario.
3. **Fuentes:** en ausencia de fuente privada auténtica, mostrar **«Ranking no disponible»**, no 196 datos ficticios. Si el registro de emisiones no contiene filas no se declara ninguna.
4. **Seguridad:** permanece intacto el segundo control JWT Cloudflare Access (AUD real pendiente) para servir las probabilidades inline. La pestaña `Riesgos 2027` conserva el vínculo directo a la hoja privada como fallback.
5. **Canónico:** `MAD-02=PARCIAL`, `PsicoPredicciones=0` y cohorte 2027 `SHADOW_NO_EMITIDO` no se alteran. Este avance es **usabilidad verificada** y mejores explicaciones científicas, no madurez predictiva superior.

**Siguiente trabajo científico prioritario:** sellado externo de emisiones 2027 (RFC3161/TSA) y fuente de entrenamiento con disponibilidad histórica acreditada. Resolver la audiencia Cloudflare Access por un canal de autorización adecuado, no mediante saltarse el control.
