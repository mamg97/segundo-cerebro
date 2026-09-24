# Handoff — Segundo Cerebro

## Última actualización

- **Fecha:** 2026-09-24
- **Herramienta:** ChatGPT normal
- **Rama operativa:** `main`
- **Repositorio:** `mamg97/segundo-cerebro`

## Propósito de este documento

Este archivo describe únicamente el estado vigente y el siguiente paso. El historial de implementación permanece en Git y las decisiones duraderas en `docs/DECISIONS.md`.

## Estado actual

Segundo Cerebro dispone de dos superficies separadas:

- **GitHub Pages:** demo pública con mocks, sin datos ni conexiones privadas.
- **Cloudflare:** aplicación privada protegida por Access, con Worker, D1 e integraciones autorizadas.

La aplicación privada ya no es un prototipo de solo lectura. Hay escritura selectiva en los dominios que la necesitan y lectura estricta en los que no.

## Arquitectura operativa

```text
Usuario
  ↓
ORGANIZADOR / WEB GENERAL
  ↓
Estado global común
  ↓
Finance · Calendar · Habits · Health · resto de áreas
  ↓
Fuentes propietarias / D1
```

Las conversaciones especializadas gestionan su dominio, pero no crean fuentes de verdad paralelas. Este repositorio y los contratos de `agents/` permiten relevo entre ChatGPT normal y Work/Codex.

## Funcionalidad vigente

### Interfaz

- Dashboard responsive para Mac, iPhone e iPad.
- Modo claro/oscuro.
- Logo cerebral común en navegación y favicon.
- Thinking Orb vendorizado con estados de actividad.
- Vista semanal de agenda, eventos importantes, decisiones y módulos.
- Diseño móvil corregido para evitar overflow y apariencia de escritorio comprimido.

### Finanzas

- Fuente oficial externa + memoria de reglas + hoja privada derivada.
- Resumen mensual, presupuesto, próximos movimientos y conciliación.
- Separación entre partidas comunes e individuales.
- Deudas con resumen y detalle.
- Patrimonio con evolución histórica.
- Flujo mensual separado conceptualmente de inversiones/ahorro.
- Contrato vigente: `agents/FINANCE.md`.

### Calendario

- Integración iCloud por CalDAV.
- Lectura únicamente.
- Vista semanal y eventos importantes.
- Reglas privadas de alias y clasificación viven fuera de Git.
- El horizonte ampliado permite detectar eventos relevantes futuros sin convertir la home en un calendario completo.

### Hábitos

- HabitQuest está integrado de forma nativa.
- El Sheet original sigue siendo fuente de verdad.
- Lectura de hábitos, histórico y progreso.
- Marcar/desmarcar respetando Last-Write-Wins.
- Crear, editar, archivar/restaurar, eliminar y reordenar hábitos.
- Paridad funcional ampliada: vista lista/compacta, ordenación, separación pendientes/completados y activos/archivados, progreso diario, estadísticas 60/90 días, semana actual, heatmap de cinco semanas, logros y feedback de gamificación. La vista de gestión usa tarjetas densas con metadatos/chips, estadísticas y acciones secundarias discretas para evitar el aspecto administrativo inicial.
- La aplicación independiente HabitQuest se mantiene como fallback durante la validación; no se duplican su login Google, onboarding, tema independiente ni import/export XLSX.

### Salud — Gimnasio

- Salud contiene Médicos, Gimnasio y Nutrición.
- Médicos deriva de iCloud y es solo lectura.
- El plan de gimnasio vive en la fuente privada.
- Las sesiones y ejercicios registrados se persisten en D1.
- La UI recuerda la última carga real por ejercicio, permite borrar sesiones y muestra progreso.

### Salud — Nutrición

- Fuente privada `SEGUNDO CEREBRO - SALUD`.
- Pestañas lógicas: comidas reutilizables, registro planificado/consumido, objetivos y energía manual de fallback.
- La UI muestra consumido, gasto, balance, objetivo, comidas e histórico cuando existen datos.
- No se inventan objetivos nutricionales ni gasto ausente.
- Contrato vigente: `agents/HEALTH.md`.

### Apple Health

Hay un único puente privado:

```text
Apple Watch / Apple Health / Zepp
→ Atajo único de iPhone
→ segundo-cerebro-health-ingest
→ Service Binding
→ segundo-cerebro
→ D1 privado
→ Salud / GESTOR GYM Y NUTRI
```

Estado:
- el puente energético original sigue operativo y compatible en `/v1/energy`;
- el flujo v2 de producción usa `/v1/sync` y está validado end-to-end con actividad + composición corporal;
- `health_energy_daily` se amplió con pasos, minutos de ejercicio, entrenamientos opcionales, timestamp de muestreo y detalle de fuentes;
- `health_body_samples` guarda muestras corporales normalizadas e idempotentes por tipo + timestamp original + fuente;
- `MedicionesCorporales` conserva el baseline histórico/manual y se amplió con IMC, masa magra, timestamp original e importación;
- `EnergiaDiaria` conserva el fallback manual y se amplió con pasos, minutos de ejercicio, entrenamientos y metadatos de muestreo;
- `ObjetivosActividad` ya contiene los objetivos operativos y la regla de no ajustar la comida 1:1 por kcal del reloj;
- Salud incorpora una pestaña `Resumen` con peso de hoy, media 7 días, cambio semanal, grasa/IMC/masa magra cuando existan, kcal activa/reposo/total, pasos, ejercicio y progreso frente a objetivos;
- la media de peso usa promedios diarios y compara 7 días actuales frente a 7 anteriores;
- bioimpedancia se interpreta como tendencia;
- el gestor operativo es `GESTOR GYM Y NUTRI`;
- el Atajo del iPhone ya envía energía activa/reposo, pasos, minutos de ejercicio, peso, grasa corporal, IMC y masa magra;
- Zepp Life está confirmado como fuente de composición corporal;
- una referencia incorrecta heredada al duplicar bloques (`Body Fat Percentage` apuntando a `Weight`) fue detectada y corregida; el backend actualizó la misma muestra mediante UPSERT, sin dejar una muestra duplicada para ese timestamp;
- el refresh token de Google se renovó temporalmente usando el cliente OAuth existente de LITOS; queda pendiente crear un cliente OAuth dedicado de Segundo Cerebro.

## Fuentes de verdad

- Finanzas: fuente financiera externa; hoja derivada solo transporta estado normalizado.
- Calendario y citas: iCloud.
- HabitQuest: Google Sheet original.
- Plan/base de Salud y Nutrición: Sheet privado de Salud.
- Sesiones de gimnasio: D1.
- Actividad automática de Apple Health: D1 `health_energy_daily`.
- Composición corporal automática de Apple Health: D1 `health_body_samples`; baseline/manual en `MedicionesCorporales`.
- Código, arquitectura y contratos: Git.
- Secretos: configuración privada de Cloudflare/local, nunca Git.

## Privacidad

- No versionar cifras personales, eventos reales, históricos médicos, nombres privados de reglas, credenciales ni tokens.
- GitHub Pages debe seguir siendo mock.
- iCloud permanece de solo lectura.
- Las mutaciones privadas deben escribir exclusivamente en la fuente documentada para ese dominio.

## Problemas o límites conocidos

- La caja de consulta sigue siendo principalmente una experiencia local del frontend; todavía no existe un asistente general con lenguaje natural conectado a todos los datos del sistema.
- La aplicación todavía no es una PWA offline.
- No todos los dominios previstos tienen contrato propio en `agents/`.
- La calidad del estado depende de que las fuentes privadas estén sincronizadas y reconciliadas.
- Apple Health v2 está validado end-to-end. Queda pendiente únicamente automatizar la ejecución diaria del Atajo y separar el OAuth de Google del proyecto LITOS.

## Sistema visual

- En la portada oscura, los epígrafes/categorías de tarjeta usan naranja y todos los títulos e importes principales comparten la misma familia sans.

- La portada comienza su información operativa con dos tarjetas uniformes: Hábitos de hoy (clic → HabitQuest) y balance nutricional (consumidas, gastadas y objetivo; clic → Salud/Nutrición). El objetivo nunca se inventa: si no existe muestra `Pendiente`.

- La cabecera superior conserva saludo/fecha y control de tema. Se eliminaron el badge de estado privado, el avatar `SC`, el gran titular de portada y el indicador `Pulso general`; el primer bloque de contenido mantiene separación visual respecto a la línea inferior de la cabecera.

- El modo oscuro usa un sistema visual único azul noche + azul eléctrico + naranja.
- Tokens principales: fondo `#07101D`, superficie `#0B1728`, superficie secundaria `#10213A`, azul `#2F6BFF / #5FA8FF`, naranja `#FF7A1A / #FFB347`, texto `#F8FAFC`, muted `#A8B3C7`, borde `#1E3350`.
- En oscuro se unifica la tipografía en Avenir Next / Segoe UI / system sans; se elimina la mezcla de serif en títulos.
- El naranja queda reservado para énfasis, progreso, estados destacados y microinteracciones; el azul para navegación, acciones y estructura.
- Las áreas y módulos se restringen visualmente a la familia azul/naranja para evitar el mosaico multicolor anterior.

## Despliegue automático

- El Worker privado tiene workflow de producción en `.github/workflows/deploy-private-cloudflare.yml`.
- Un cambio relevante en `main` valida JavaScript, construye el bundle privado, comprueba que no entren archivos privados y ejecuta `wrangler deploy`.
- Los secretos de despliegue de Cloudflare ya están configurados en GitHub Actions.
- El 2026-09-23 se validó una ejecución real completa hasta producción.
- El flujo normal es ChatGPT/GitHub → commit a `main` → GitHub Actions → Cloudflare, sin `git pull` ni `npm run deploy` manuales.

### Configuración CI/CD completada

El deploy automático completo está activado con los *repository secrets* documentados:

- `CLOUDFLARE_API_TOKEN`: token de API de Cloudflare con permisos para editar/deployar Workers.
- `CLOUDFLARE_ACCOUNT_ID`: identificador de cuenta de Cloudflare.

Rutas oficiales:
- API Tokens: `https://dash.cloudflare.com/profile/api-tokens`
- GitHub: repositorio → Settings → Secrets and variables → Actions.

Reglas:
- nunca versionar ninguno de estos valores;
- nunca pegarlos en una conversación;
- los cambios relevantes en `main` se despliegan sin intervención local.

## Próxima acción exacta

Cerrar Apple Health v2 y después volver a HabitQuest:

1. Crear en iPhone una automatización personal diaria a las `23:55` que ejecute el Atajo de Salud con ejecución inmediata/sin preguntar.
2. Verificar al día siguiente que el POST `/v1/sync` se ejecutó en background y que la API privada refleja el cierre diario.
3. Crear un cliente OAuth propio de Segundo Cerebro y sustituir la dependencia temporal del OAuth de LITOS.
4. Después retomar la validación de absorción de HabitQuest en iPhone, iPad y Mac.

## Archivos que debe leer el siguiente relevo

- `AGENTS.md`
- `docs/HANDOFF.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PRIVACY.md`
- `docs/DECISIONS.md`
- `agents/FINANCE.md`
- `agents/HEALTH.md`
- `agents/HABITS.md`
- `private-cloudflare/README.md`
- `docs/APPLE_HEALTH_SHORTCUT.md`

No reconstruir el proyecto desde conversaciones antiguas salvo que se investigue una decisión histórica concreta.
