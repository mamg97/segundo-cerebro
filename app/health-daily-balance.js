// Only derived presentation: no writes, no invented HealthKit expenditure.
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function healthDayBalanceModel(data, todayDate) {
  const date = datePattern.test(String(data?.date || "")) ? data.date : todayDate;
  const day = Array.isArray(data?.nutritionHistory)
    ? data.nutritionHistory.find((entry) => entry?.date === date)
    : null;
  const numeric = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const consumption = numeric(data?.nutritionSummary?.consumed?.kcal);
  const intakeConfirmed = consumption !== null &&
    (Number(day?.consumedEntryCount || 0) > 0 || consumption > 0);
  const active = numeric(data?.activity?.activeKcal);
  const resting = numeric(data?.activity?.restingKcal);
  const explicitTotal = numeric(data?.activity?.totalKcal);
  const burned = explicitTotal !== null
    ? explicitTotal
    : active !== null && resting !== null ? active + resting : null;
  const coverage = String(day?.coverageQuality || "missing");
  const comparable = ["full", "live"].includes(coverage) && burned !== null;
  const balance = intakeConfirmed && comparable ? consumption - burned : null;
  return {
    date,
    isToday: date === todayDate,
    intake: intakeConfirmed ? consumption : null,
    active,
    resting,
    burned,
    balance,
    coverage,
    comparable,
    intakeConfirmed
  };
}

function kcal(value, signed = false) {
  if (value === null) return "—";
  const rounded = Math.round(value);
  return (signed && rounded > 0 ? "+" : "") + rounded.toLocaleString("es-ES") + " kcal";
}

export function renderHealthDayBalance(data, todayDate) {
  const day = healthDayBalanceModel(data, todayDate);
  const status = day.balance === null
    ? day.intake === null ? "Sin ingesta confirmada"
      : !day.comparable ? "Gasto sin cobertura completa del Watch" : "Balance no disponible"
    : day.balance < 0 ? "Déficit" : day.balance > 0 ? "Superávit" : "Equilibrio";
  const balanceTone = day.balance === null ? "is-pending"
    : day.balance < 0 ? "is-deficit" : day.balance > 0 ? "is-surplus" : "is-neutral";
  const sourceQuality = day.comparable
    ? day.isToday ? "Datos del reloj provisionales hasta cerrar el día." : "Gasto con cobertura completa o sincronización válida."
    : "El gasto parcial o ausente no sirve para calcular un balance fiable.";
  const detail = [
    day.active === null ? null : "Activas " + kcal(day.active),
    day.resting === null ? null : "Reposo " + kcal(day.resting)
  ].filter(Boolean).join(" · ") || "Desglose energético no disponible";
  const prettyDate = datePattern.test(day.date)
    ? new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
      .format(new Date(day.date + "T12:00:00Z"))
    : "Fecha no disponible";
  return `
    <section class="health-day-summary" aria-label="Balance calórico del día seleccionado">
      <div class="health-day-summary-heading">
        <div><strong>Balance del día</strong><span>${day.isToday ? "Hoy" : prettyDate} · ${status}</span></div>
        <div class="health-day-navigation" aria-label="Consultar días anteriores">
          <button type="button" data-health-day-step="-1" aria-label="Día anterior">‹</button>
          <label><span>Fecha</span><input type="date" id="health-overview-date" value="${day.date}" max="${todayDate}" aria-label="Fecha de balance calórico"></label>
          <button type="button" data-health-day-step="1" aria-label="Día siguiente" ${day.date >= todayDate ? "disabled" : ""}>›</button>
          <button type="button" data-health-day-today ${day.isToday ? "disabled" : ""}>Hoy</button>
        </div>
      </div>
      <div class="health-day-summary-grid">
        <article><small>Consumidas · confirmadas</small><strong>${kcal(day.intake)}</strong><span>${day.intake === null ? "Sin consumo confirmado" : "Solo registro consumido"}</span></article>
        <article><small>Gastadas · total reloj</small><strong>${kcal(day.burned)}</strong><span>${detail}</span></article>
        <article class="health-day-balance-result ${balanceTone}"><small>Balance = consumidas − gastadas</small><strong>${kcal(day.balance, true)}</strong><span>${status}${day.isToday && day.balance !== null ? " · provisional" : ""}</span></article>
      </div>
      <p class="health-day-summary-note">${sourceQuality}${day.isToday ? " Hábitos y Gym conservan su estado actual." : " Hábitos y Gym muestran el estado actual, no el de la fecha histórica."}</p>
    </section>`;
}
