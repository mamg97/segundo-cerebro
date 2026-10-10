// Salud visual: los datos se consultan y modifican únicamente mediante API privada.
const escapeVision = (value) => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);

function visionDateLabel(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return "Sin fecha registrada";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function lensSphere(value) {
  return value === null || value === undefined ? "Pendiente" : `${Number(value) > 0 ? "+" : ""}${value} D`;
}

async function visionFetch(method = "GET", body) {
  const response = await fetch(method === "POST" ? "/api/health/vision/replace" : "/api/health/vision", {
    method,
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    credentials: "same-origin",
    cache: "no-store",
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (!response.ok) throw new Error("VISION_" + response.status);
  const payload = await response.json();
  if (!payload.ok) throw new Error("VISION_NOT_SAVED");
  return payload;
}

function renderVision(data) {
  const panel = document.querySelector("#vision-panel");
  if (!panel) return;
  const profile = data.profile || {};
  const due = data.nextReplacementOn;
  const now = new Date();
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  const dueStatus = due ? (due < today ? "Sustitución pendiente" : due === today ? "Cambiar hoy" : "Próximo cambio") : "Próximo cambio sin calcular";
  const changes = Array.isArray(data.changes) ? data.changes : [];
  panel.innerHTML = `
    <div class="health-section-heading">
      <div><strong>Salud visual · lentillas</strong><p>Datos personales protegidos. La graduación se guarda en el área privada, no en GitHub.</p></div>
    </div>
    <div class="vision-glance" aria-label="Graduación y renovación">
      <div><span>Ojo derecho (OD)</span><strong>${escapeVision(lensSphere(profile.rightSphere))}</strong></div>
      <div><span>Ojo izquierdo (OI)</span><strong>${escapeVision(lensSphere(profile.leftSphere))}</strong></div>
      <div><span>${escapeVision(dueStatus)}</span><strong>${escapeVision(visionDateLabel(due))}</strong></div>
    </div>
    <form id="vision-profile-form" class="vision-profile-form">
      <h3>Ficha de lentillas</h3>
      <p class="health-source-note">Esfera (SPH) en dioptrías, con signo + o −. No confundir con cilindro (CYL), eje o graduación de gafas. Introduce solo valores confirmados.</p>
      <div class="vision-form-grid">
        <label>OD · esfera (D)<input name="rightSphere" type="number" step="0.01" min="-30" max="30" inputmode="decimal" placeholder="—" value="${escapeVision(profile.rightSphere ?? "")}"></label>
        <label>OI · esfera (D)<input name="leftSphere" type="number" step="0.01" min="-30" max="30" inputmode="decimal" placeholder="—" value="${escapeVision(profile.leftSphere ?? "")}"></label>
        <label>Marca<input name="brand" maxlength="100" value="${escapeVision(profile.brand ?? "")}" placeholder="Pendiente"></label>
        <label>Modelo<input name="model" maxlength="100" value="${escapeVision(profile.model ?? "")}" placeholder="Pendiente"></label>
        <label>Reemplazo<select name="replacementMonths">
          ${[1, 2, 3, 6, 12].map(m => `<option value="${m}" ${Number(profile.replacementMonths || 1) === m ? "selected" : ""}>${m === 1 ? "Cada mes" : "Cada " + m + " meses"}</option>`).join("")}
        </select></label>
        <label>Último cambio<input type="date" name="lastReplacedOn" value="${escapeVision(profile.lastReplacedOn ?? "")}"></label>
      </div>
      <div class="vision-form-actions">
        <button class="primary-action" type="submit">Guardar ficha</button>
        <button class="vision-record-button" type="button" id="vision-replace-today">He cambiado las lentillas hoy</button>
      </div>
      <p id="vision-form-status" role="status" aria-live="polite"></p>
    </form>
    <div class="vision-history">
      <strong>Historial de sustituciones</strong>
      ${changes.length
        ? `<p>${changes.map(date => escapeVision(visionDateLabel(date))).join(" · ")}</p>`
        : '<p>Todavía no hay cambios registrados desde la web.</p>'}
      <p class="health-source-note">La próxima fecha es orientativa según el calendario de sustitución, no un recordatorio programado. Respeta siempre la pauta de tu óptico y el fabricante.</p>
    </div>
  `;
  const form = panel.querySelector("#vision-profile-form");
  const status = panel.querySelector("#vision-form-status");
  const save = form.querySelector('button[type="submit"]');
  const replace = panel.querySelector("#vision-replace-today");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const data = Object.fromEntries(values);
    status.textContent = "Guardando…";
    save.disabled = true;
    try {
      const result = await visionFetch("PUT", data);
      if (panel.isConnected) renderVision(result);
    } catch {
      status.textContent = "No se ha guardado. Revisa la conexión y los campos.";
    } finally { save.disabled = false; }
  });
  replace.addEventListener("click", async () => {
    status.textContent = "Registrando cambio…";
    replace.disabled = true;
    try {
      const result = await visionFetch("POST", { replacedOn: today });
      if (panel.isConnected) renderVision(result);
    } catch {
      status.textContent = "No se ha registrado el cambio.";
    } finally { replace.disabled = false; }
  });
}

export async function loadVisionPanel(isPrivate) {
  const panel = document.querySelector("#vision-panel");
  if (!panel) return;
  if (!isPrivate) {
    panel.innerHTML = '<p class="health-empty">La ficha de lentillas solo está disponible en la aplicación privada.</p>';
    return;
  }
  panel.innerHTML = '<p class="health-empty">Cargando ficha visual privada…</p>';
  try {
    const result = await visionFetch();
    if (panel.isConnected) renderVision(result);
  } catch {
    if (panel.isConnected) panel.innerHTML = '<p class="health-empty">No se ha podido acceder a la ficha visual privada.</p>';
  }
}
