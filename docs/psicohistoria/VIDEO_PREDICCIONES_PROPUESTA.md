# PSICOHISTORIA — Diseño del estudio audiovisual

Fecha: 2026-10-20. Especificación de producto y estado: **V0 experimental implementada**, con vídeos educativos sintéticos grabables localmente en el navegador. El motor de predicciones reales y la narración final siguen pendientes.

## Objetivo y límites

Transformar una investigación verificable en un vídeo vertical de 35–60 segundos. Estilo: negro, blanco y cian discreto; diagramas orbitales y redes, poco texto, transiciones sobrias, narración natural y subtítulos.

Una publicación visual no confiere validez científica. No confundir experimentos retrospectivos con pronósticos realmente emitidos. Sin publicar probabilidades privadas por defecto.

## Flujo propuesto

**Fuente privada → Control de evidencia → Guion → Storyboard → Animaciones → Voz → Previsualización → Aprobación → Exportación**

1. Seleccionar un experimento de PsicoExperimentos o una emisión *verdadera* de PsicoPredicciones.
2. Validar target, horizonte, fuente, fecha de disponibilidad as-of, estado SHADOW/EMITIDO/EVALUADO, baseline, incertidumbre y permiso de divulgación. Si no existe evidencia, bloquear afirmaciones concretas.
3. Producir 5–7 escenas, con una sola idea por pantalla; texto grande, hasta 12 palabras en titulares y máximo dos líneas de subtítulos.
4. Renderizar gráficos originales mediante SVG/Canvas y FFmpeg, sin suscripción ni API externa; versión 1080×1920 H.264/30 fps. Voz propia o TTS local opcional. No introducir dependencias pagadas para el MVP.
5. Previsualizar y aprobar manualmente. Guardar MP4, script, audio, hash de contenido y manifiesto de procedencia en almacenamiento privado. No autopublicar a Instagram/YouTube.

## Guion de referencia (45 s)

| Segundos | Visual | Qué se explica |
|---|---|---|
| 0–4 | Pregunta en pantalla negra | Gancho comprobable |
| 4–10 | Mapa o diagrama | Qué fenómeno se estudia |
| 10–20 | Animación del modelo | Qué datos y variables se utilizaron |
| 20–30 | Curva o comparación | Resultado frente al baseline, solo si existe |
| 30–40 | Incertidumbre | Qué NO demuestra |
| 40–45 | Evidencia y siguiente prueba | Trazabilidad y conclusión |

## Plan de versiones

- **V0 (primero):** vídeo educativo de un caso *sintético* para validar estilo, tiempo de render, legibilidad y seguridad.
- **V1 (después):** editor privado del laboratorio, con tres pasos: Elegir evidencia → Previsualizar → Exportar. Mostrar estado científico en todo momento.
- **V2 (solo con evidencia):** piezas sobre emisiones prospectivas selladas y resultados verificables, siempre con target, horizonte, as-of y comparación científica.
- **V3 (opcional):** animación con IA generativa, solo si mejora la calidad y hay presupuesto, licencias y aprobación sobre datos compartidos.

## Privacidad, licencias y fiabilidad

GitHub público contendrá únicamente código, plantillas y fixtures ficticios. Los datos originales, guiones con resultados privados, voz y vídeos reales quedan en infraestructura protegida por Cloudflare Access y almacenamiento privado. Prohibido automatizar publicación sin revisión. Rotular permanentemente RETROSPECTIVO, EXPLORATORIO, SHADOW_NO_EMITIDO, EMITIDO o EVALUADO según corresponda. El diseño nunca atribuirá predicción de nuevas guerras a un modelo de presencia anual.

**Esta entrega no genera MP4 ni modifica fuentes canónicas, modelos, API, credenciales, costes o decisiones de acceso.**

## Entrega V0 · 20/10/2026

La vista privada `?view=video` integra `app/research-video-studio.mjs` y `app/research-video-studio.css`, muestra dos guiones educativos de siete escenas y previsualiza animaciones originales 9:16 mediante Canvas. `MediaRecorder` y `canvas.captureStream(24)` permiten grabar **45 segundos** sin enviar nada a servidores; exporta **WebM o MP4 según los códecs disponibles en el navegador**. Añade una pista sonora ambiental local cuando Web Audio está disponible. No hay voz generada en el editor (se indica en la interfaz). Se requiere navegador compatible y mantener la pestaña activa mientras se graba.

Se produjo además un piloto externo de 45 s, MP4 vertical Full HD, con música y voz local. El fichero de vídeo no se incorpora al repositorio público ni se expone desde un endpoint, y no se declara producto de previsión emitida. Un prototipo local no acredita la calidad de un pipeline editorial profesional.

**Fuera de alcance:** automatización de la narración de calidad, lectura segura y redacción de hallazgos privados, render server-side, publicación, almacenamiento compartido o generación ilimitada desatendida. El motor V0 es puramente educativo y no accede a `PsicoPredicciones` ni a probabilidades país-modelo.
