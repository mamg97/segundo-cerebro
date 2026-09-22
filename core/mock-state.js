// DATOS EXCLUSIVAMENTE FICTICIOS PARA LA V0.1.
// Ningún nombre, importe, fecha o asunto representa información personal real.

export const mockState = Object.freeze({
  meta: {
    version: "0.1.1",
    mode: "mock",
    updatedAt: "2026-09-22T08:30:00+02:00",
  },
  system: {
    coordinator: {
      title: "Coordinador",
      description: "Combina contexto, propone prioridades y mantiene una visión única.",
      status: "ready",
    },
    capabilities: [
      { id: "cap-review", title: "Revisión semanal", description: "Resume cambios y asuntos abiertos.", status: "simulated" },
      { id: "cap-priority", title: "Priorizador", description: "Ordena siguientes acciones con contexto.", status: "simulated" },
      { id: "cap-conflict", title: "Detector de conflictos", description: "Señala cruces entre agenda y objetivos.", status: "simulated" },
      { id: "cap-privacy", title: "Control de privacidad", description: "Comprueba sensibilidad y acceso.", status: "active" },
    ],
    sources: [
      { id: "source-local", title: "Mock local", access: "Solo lectura", status: "active" },
      { id: "source-external", title: "Fuentes externas", access: "Sin conectar", status: "locked" },
    ],
  },
  areas: [
    { id: "area-general", slug: "general", title: "Estado general", shortTitle: "General", summary: "La semana está enfocada y quedan tres decisiones por desbloquear.", health: 78, tone: "ink", module: "Coordinator", sensitivity: "personal", status: "steady" },
    { id: "area-career", slug: "career", title: "Carrera", shortTitle: "Carrera", summary: "Preparar la conversación de crecimiento profesional.", health: 72, tone: "blue", module: "Career", sensitivity: "personal", status: "attention" },
    { id: "area-finance", slug: "finance", title: "Finanzas", shortTitle: "Finanzas", summary: "Revisión mensual preparada con cifras ficticias.", health: 84, tone: "mint", module: "Finance", sensitivity: "confidencial", status: "steady" },
    { id: "area-calendar", slug: "calendar", title: "Agenda", shortTitle: "Agenda", summary: "Dos compromisos próximos y un hueco de concentración.", health: 91, tone: "sky", module: "Calendar", sensitivity: "personal", status: "steady" },
    { id: "area-partner", slug: "partner", title: "Pareja / Boda", shortTitle: "Pareja", summary: "El siguiente hito depende de confirmar una cita.", health: 76, tone: "rose", module: "Partner", sensitivity: "confidencial", status: "attention" },
    { id: "area-family", slug: "family", title: "Familia", shortTitle: "Familia", summary: "Seguimiento familiar al día.", health: 88, tone: "amber", module: "Family", sensitivity: "confidencial", status: "steady" },
    { id: "area-wealth", slug: "wealth", title: "Patrimonio familiar", shortTitle: "Patrimonio", summary: "Inventario conceptual pendiente de acordar alcance.", health: 58, tone: "violet", module: "Family Wealth", sensitivity: "muy_confidencial", status: "attention" },
    { id: "area-projects", slug: "projects", title: "Proyectos", shortTitle: "Proyectos", summary: "Dos proyectos activos; uno necesita una decisión.", health: 69, tone: "cyan", module: "Projects", sensitivity: "personal", status: "attention" },
    { id: "area-loops", slug: "open-loops", title: "Open Loops", shortTitle: "Open Loops", summary: "Cinco asuntos abiertos, dos con prioridad alta.", health: 63, tone: "coral", module: "Coordinator", sensitivity: "personal", status: "attention" },
    { id: "area-goals", slug: "goals", title: "Objetivos", shortTitle: "Objetivos", summary: "Tres horizontes activos y medibles.", health: 81, tone: "lime", module: "Coordinator", sensitivity: "personal", status: "steady" },
  ],
  projects: [
    { id: "project-marriage", type: "PROJECT", title: "Proyecto matrimonio", areaId: "area-partner", status: "active", progress: 42, nextAction: "Confirmar la cita de la próxima semana", sensitivity: "confidencial", sourceRefs: [], updatedAt: "2026-09-22" },
    { id: "project-portfolio", type: "PROJECT", title: "Portfolio profesional", areaId: "area-career", status: "active", progress: 68, nextAction: "Seleccionar dos casos de estudio ficticios", sensitivity: "personal", sourceRefs: [], updatedAt: "2026-09-21" },
    { id: "project-home", type: "PROJECT", title: "Mejoras del hogar", areaId: "area-projects", status: "planning", progress: 18, nextAction: "Comparar alcance y calendario", sensitivity: "personal", sourceRefs: [], updatedAt: "2026-09-20" },
  ],
  openLoops: [
    { id: "loop-ring", type: "OPEN_LOOP", title: "Recoger el anillo", areaId: "area-partner", projectId: "project-marriage", personId: null, status: "open", priority: "high", dueDate: "2026-09-25", cost: null, nextAction: "Confirmar que está listo antes de desplazarse", blocker: "Esperando confirmación ficticia", sensitivity: "confidencial", sourceRefs: [], updatedAt: "2026-09-22" },
    { id: "loop-review", type: "OPEN_LOOP", title: "Preparar revisión profesional", areaId: "area-career", projectId: "project-portfolio", personId: null, status: "open", priority: "high", dueDate: "2026-09-28", cost: null, nextAction: "Redactar tres resultados y dos preguntas", blocker: null, sensitivity: "personal", sourceRefs: [], updatedAt: "2026-09-22" },
    { id: "loop-budget", type: "OPEN_LOOP", title: "Cerrar revisión mensual", areaId: "area-finance", projectId: null, personId: null, status: "open", priority: "medium", dueDate: "2026-09-30", cost: null, nextAction: "Revisar las categorías del ejemplo", blocker: null, sensitivity: "confidencial", sourceRefs: [], updatedAt: "2026-09-21" },
    { id: "loop-call", type: "OPEN_LOOP", title: "Organizar llamada familiar", areaId: "area-family", projectId: null, personId: "person-relative-a", status: "open", priority: "medium", dueDate: null, cost: null, nextAction: "Proponer dos horarios", blocker: null, sensitivity: "confidencial", sourceRefs: [], updatedAt: "2026-09-20" },
    { id: "loop-scope", type: "OPEN_LOOP", title: "Definir alcance del inventario", areaId: "area-wealth", projectId: null, personId: null, status: "open", priority: "low", dueDate: null, cost: null, nextAction: "Separar categorías sin introducir valores reales", blocker: "Falta acordar el nivel de detalle", sensitivity: "muy_confidencial", sourceRefs: [], updatedAt: "2026-09-19" },
  ],
  goals: [
    { id: "goal-weekly", type: "GOAL", title: "Reducir asuntos sin siguiente acción", areaId: "area-loops", status: "active", horizon: "Esta semana", metric: "Open loops accionables", target: "100%", sensitivity: "personal", sourceRefs: [], updatedAt: "2026-09-22" },
    { id: "goal-career", type: "GOAL", title: "Clarificar el siguiente paso profesional", areaId: "area-career", status: "active", horizon: "90 días", metric: "Opciones evaluadas", target: "3", sensitivity: "personal", sourceRefs: [], updatedAt: "2026-09-21" },
    { id: "goal-system", type: "GOAL", title: "Validar el Segundo Cerebro", areaId: "area-projects", status: "active", horizon: "Este trimestre", metric: "Revisiones semanales útiles", target: "8", sensitivity: "personal", sourceRefs: [], updatedAt: "2026-09-22" },
  ],
  decisions: [
    { id: "decision-focus", type: "DECISION", title: "Elegir foco del próximo trimestre", areaId: "area-career", status: "open", question: "¿Qué opción mejora aprendizaje y libertad?", options: ["Profundizar", "Explorar", "Esperar evidencia"], decision: null, sensitivity: "personal", sourceRefs: [], updatedAt: "2026-09-22" },
    { id: "decision-inventory", type: "DECISION", title: "Nivel de detalle patrimonial", areaId: "area-wealth", status: "open", question: "¿Qué mínimo aporta contexto sin copiar datos sensibles?", options: ["Solo categorías", "Rangos", "Detalle externo"], decision: null, sensitivity: "muy_confidencial", sourceRefs: [], updatedAt: "2026-09-20" },
    { id: "decision-project", type: "DECISION", title: "Prioridad de mejoras del hogar", areaId: "area-projects", status: "open", question: "¿Qué mejora resolver primero?", options: ["Funcionalidad", "Confort", "Posponer"], decision: null, sensitivity: "personal", sourceRefs: [], updatedAt: "2026-09-19" },
  ],
  events: [
    { id: "event-focus", type: "EVENT", title: "Bloque de concentración", areaId: "area-career", status: "confirmed", startsAt: "2026-09-23T09:30:00+02:00", endsAt: "2026-09-23T11:00:00+02:00", locationRef: "Sin ubicación", sensitivity: "personal", sourceRefs: [], updatedAt: "2026-09-22" },
    { id: "event-planning", type: "EVENT", title: "Revisión semanal", areaId: "area-general", status: "confirmed", startsAt: "2026-09-24T18:00:00+02:00", endsAt: "2026-09-24T18:30:00+02:00", locationRef: "Local", sensitivity: "personal", sourceRefs: [], updatedAt: "2026-09-22" },
  ],
  people: [
    { id: "person-relative-a", type: "PERSON", title: "Familiar A (ficticio)", status: "active", sensitivity: "confidencial", sourceRefs: [], updatedAt: "2026-09-20" },
  ],
  assets: [
    { id: "asset-category-home", type: "ASSET", title: "Vivienda — categoría ficticia", areaId: "area-wealth", status: "unverified", sensitivity: "muy_confidencial", sourceRefs: [], updatedAt: "2026-09-19" },
  ],
  sources: [
    { id: "source-mock", type: "SOURCE", title: "Datos locales ficticios", provider: "mock", status: "active", sensitivity: "normal", sourceRefs: [], updatedAt: "2026-09-22" },
  ],
});
