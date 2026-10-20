# PSICOHISTORIA — AV-056 · Visibilidad de predicciones experimentales 2027

**20/10/2026. Estado inicial:** integración de navegación propuesta para la app privada; separar aprobación de PR, despliegue Worker, seguridad Access y emisión científica.

## Por qué la primera cohorte se guardó en privado

**No es una exigencia legal o científica que todas las estimaciones por país permanezcan secretas.** Las fuentes UCDP sobre conflictos son públicas y publicar modelos es compatible con investigación reproducible, sujeto a licencias/atribución y a no confundir una estimación con una predicción verificada. Se guardó la cohorte de 2027 privadamente para separar artefacto real de muestras sintéticas de GitHub Pages y no contaminar `PsicoPredicciones`: 196 países × seis modelos, objetivo anual presencia de >=25 muertes estatales durante 2027, todos `outcome=null` y `forecastIssued=false`.

Esto **no equivale** a que el usuario deba navegar siempre por Drive. El lugar correcto para mostrar la entrada es el laboratorio autenticado de Segundo Cerebro, con una distinción visible entre probabilidad experimental y scoring prospectivo. Una futura página pública podría mostrarse previa decisión explícita de publicación, diseño de advertencias y cumplimiento de atribución.

## Implementación de navegación (sin exposición pública de datos)

- `app/research-lab.html`: nueva pestaña **2027 · Experimental**.
- `app/research-shadow2027.mjs`: presentador que identifica **únicamente** el registro `ucdp261-2027-mobile-private-ranking-20261020` de `PsicoExperimentos` ya leído por el Worker privado. Comprueba vertiente `V2`, `SHADOW_NO_EMITIDO`, `UCDP OrganizedViolenceCY 26.1`, métrica `paises_ranqueados_sin_emision`, 196 países y **un solo** registro; rechaza vínculos arbitrarios y acepta solo Google Sheets HTTPS canónico sin tokens ni URL con terceros.
- `app/research-lab.js`: dibuja la vista y admite enlace directo `?view=shadow2027` (cuando la versión privada del Worker esté desplegada).
- `app/research-shadow2027.test.mjs`: escenarios ficticios y adversariales que rechazan vínculos manipulados, registros duplicados, cohortes alteradas o estado emitido sin prueba.
- `.github/workflows/psychohistory-private-2027-navigation.yml`: ejecuta pruebas JS sin acceder a Drive ni almacenar filas reales.

**Punto de seguridad:** el front-end y el Worker se protegen con la configuración real de Cloudflare Access de la instalación privada. Este cambio no crea ningún endpoint nuevo ni incorpora valores reales o ID real de Google Sheets en GitHub. La URL al ranking llega solamente como campo `evidence` del API **ya existente** `/api/research-lab`, basado en la tabla privada autorizada. Cualquier cuenta que acceda a la interfaz aún debe tener permisos en Google Drive para abrir la hoja. No dar por comprobada la política Access a partir de CI sintética.

**No se implementa un proxy de probabilidades:** sin comprobación adicional de autorización por ruta, un endpoint que sirva las 1.176 cifras sería una superficie de exposición nueva. La pestaña se limita a presentar los metadatos e ir al recurso privado; una futura integración completamente inline requiere auditar permisos Access y reglas de la fuente antes de habilitarla.

## Puertas y garantías

- La PR **no despliega** por sí sola el Worker privado, pero una fusión en `main` que modifica `app/**` sí activa el workflow existente `.github/workflows/deploy-private-cloudflare.yml`. La pestaña estará visible en Cloudflare **solo si el job de despliegue termina con éxito** y se comprueba la autenticación de Cloudflare Access; GitHub Pages conserva un entorno mock independiente.
- El ranking privado de Google Sheets del AV-055 **ya existe**, no depende de esta integración. El acceso directo sigue siendo válido incluso si el Worker está en una versión anterior.
- No se altera la cohorte, la política de score o el ledger `PsicoPredicciones`. **MAD-02=PARCIAL**, cero pronósticos oficialmente emitidos.
- Predicciones abiertas/publicadas: técnicamente posibles, pero requieren consentimiento explícito sobre distribución de probabilidades aún no validadas y una política de archivado/versionado; no se activa la publicación por preguntar "por qué privado".

## Siguiente avance de mayor valor

Certificar emisión prospectiva antes del **1 de enero de 2027**, con prueba `as-of` de fuentes, compromiso único SHA-256 + `salt`, solicitud y recibo RFC3161 independiente validado, y asiento append-only privado. El outcome anual completo se evaluará con la primera fuente oficial que lo cubra (calendario probable: 2028, no garantizado). Para avisos a 30–90 días es imprescindible otro diseño mensual y comparación prospectiva con VIEWS.
