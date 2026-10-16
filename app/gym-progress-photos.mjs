// Gym photo progress UI. Private, same-origin, no browser persistence.
const VIEWS = [["frente", "Frente"], ["diagonal", "Diagonal · 45°"], ["perfil", "Perfil"]];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[c]);
const localDate = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
};
const formatDate = (s) => {
  const parsed = new Date(String(s) + "T12:00:00");
  return Number.isNaN(parsed.getTime()) ? String(s) :
    new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(parsed);
};
const safePhotoUrl = (url) => /^\/api\/gym\/photos\/\d{4}-\d{2}-\d{2}\/(frente|diagonal|perfil)\/image\?v=[A-Za-z0-9%:._-]*$/.test(String(url || ""))
  ? String(url) : null;

export function gymPhotosMarkup(series = [], selectedDate = null, compareDate = "") {
  const active = series.find(s => s.date === selectedDate) || series[0] || null;
  const comparator = compareDate && compareDate !== active?.date ? series.find(s => s.date === compareDate) : null;
  const selector = (chosen, includeEmpty = false) =>
    (includeEmpty ? '<option value="">Sin comparación</option>' : '') +
    series.filter(s => !includeEmpty || s.date !== active?.date).map(s =>
      '<option value="' + esc(s.date) + '"' + (chosen === s.date ? ' selected' : '') + '>' +
      esc(formatDate(s.date)) + '</option>').join("");
  const cards = (record) => '<div class="gym-photos-grid">' + VIEWS.map(([view, label]) => {
    const url = safePhotoUrl(record.views?.[view]?.url);
    return '<figure class="gym-photo-figure"><div class="gym-photo-frame">' +
      (url ? '<img src="' + esc(url) + '" alt="' + esc(label + ", " + formatDate(record.date)) +
        '" loading="lazy" decoding="async" referrerpolicy="no-referrer">' :
        '<span class="gym-photo-empty">Sin fotografía</span>') +
      '</div><figcaption>' + esc(label) + '</figcaption></figure>';
  }).join("") + '</div>';
  const history = active
    ? '<div class="gym-photos-history"><label>Fecha de la serie<select id="gym-photo-selected-date">' +
      selector(active.date) + '</select></label><label>Comparar con<select id="gym-photo-compare-date">' +
      selector(comparator?.date || "", true) + '</select></label></div>' +
      '<section class="gym-photos-series"><h4>' + esc(formatDate(active.date)) + '</h4>' + cards(active) + '</section>' +
      (comparator ? '<section class="gym-photos-series"><h4>Comparación · ' +
        esc(formatDate(comparator.date)) + '</h4>' + cards(comparator) + '</section>' : '') +
      '<button type="button" class="gym-photo-delete" id="gym-photo-delete">Eliminar esta serie fotográfica</button>'
    : '<p class="health-empty">Todavía no hay series fotográficas registradas.</p>';
  return '<section class="gym-photos" aria-label="Progreso físico privado">' +
    '<header class="gym-photos-header"><div><strong>Progreso físico</strong><p>Fotografías de torso · frente, diagonal y perfil · solo en tu espacio privado</p></div>' +
    '<span class="gym-photos-count">' + series.length + (series.length === 1 ? ' serie' : ' series') + '</span></header>' +
    history +
    '<details class="gym-photos-add"><summary>+ Añadir serie fotográfica</summary>' +
    '<form id="gym-photos-upload-form" enctype="multipart/form-data">' +
    '<label>Fecha de las fotos<input name="date" type="date" required max="' + esc(localDate()) +
    '" value="' + esc(localDate()) + '"></label><div class="gym-photos-upload-grid">' +
    VIEWS.map(([view, label]) => '<label>' + esc(label) +
      '<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" name="' + esc(view) + '" required></label>').join("") +
    '</div><p class="gym-photo-privacy-note">Las fotos se optimizan en el dispositivo, eliminando los metadatos de localización. Se guarda una copia visual privada; conserva los originales si quieres la máxima resolución.</p>' +
    '<button class="gym-save-button" type="submit">Guardar las 3 fotografías</button>' +
    '<p id="gym-photo-upload-status" role="status" aria-live="polite"></p></form></details></section>';
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" }, ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.code || "GYM_PHOTO_" + response.status);
  return data;
}

function makePreview(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof Blob) || file.size > 8 * 1024 * 1024) {
      reject(new Error("Elige una imagen de menos de 8 MB.")); return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se puede abrir la fotografía.")); };
    image.onload = async () => {
      URL.revokeObjectURL(url);
      try {
        const longest = Math.max(image.naturalWidth, image.naturalHeight);
        if (!longest) throw new Error("Imagen sin dimensiones.");
        for (const size of [1300, 1100, 900, 720]) {
          const scale = Math.min(1, size / longest);
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise(done => canvas.toBlob(done, "image/webp", 0.82));
          if (blob?.type === "image/webp" && blob.size <= 440000) {
            resolve(new File([blob], "progreso.webp", { type: "image/webp" })); return;
          }
        }
        throw new Error("No se puede optimizar esta imagen en formato WebP.");
      } catch (error) { reject(error); }
    };
    image.src = url;
  });
}

let inFlight = null;
export async function loadGymProgressPhotos(isPrivate = true, force = false) {
  const panel = document.querySelector("#gym-photos-panel");
  if (!panel) return;
  if (!isPrivate) { panel.innerHTML = '<p class="health-empty">Disponible solo en Segundo Cerebro privado.</p>'; return; }
  if (!force && panel.dataset.photosLoaded === "1") return;
  if (inFlight) return inFlight;
  panel.innerHTML = '<p class="health-empty">Cargando fotografías privadas…</p>';
  inFlight = (async () => {
    try {
      const response = await api("/api/gym/photos");
      if (!panel.isConnected) return;
      let selectedDate = response.series?.[0]?.date || null;
      let compareDate = "";
      const draw = () => {
        panel.innerHTML = gymPhotosMarkup(response.series, selectedDate, compareDate);
        panel.dataset.photosLoaded = "1";
        panel.querySelector("#gym-photo-selected-date")?.addEventListener("change", event => {
          selectedDate = event.target.value; compareDate = ""; draw();
        });
        panel.querySelector("#gym-photo-compare-date")?.addEventListener("change", event => {
          compareDate = event.target.value; draw();
        });
        panel.querySelector("#gym-photo-delete")?.addEventListener("click", async event => {
          if (!window.confirm("¿Eliminar las fotos del " + formatDate(selectedDate) +
            " del historial de Segundo Cerebro? Los originales de Drive no se borrarán.")) return;
          event.currentTarget.disabled = true;
          try { await api("/api/gym/photos/" + selectedDate, { method: "DELETE" });
            panel.dataset.photosLoaded = "0"; inFlight = null; await loadGymProgressPhotos(true, true);
          } catch {
            window.alert("No se ha podido eliminar esta serie.");
            if (event.currentTarget.isConnected) event.currentTarget.disabled = false;
          }
        });
        panel.querySelector("#gym-photos-upload-form")?.addEventListener("submit", async event => {
          event.preventDefault();
          const form = event.currentTarget;
          if (!form.reportValidity()) return;
          const status = form.querySelector("#gym-photo-upload-status");
          const submit = form.querySelector('button[type="submit"]');
          submit.disabled = true; status.textContent = "Preparando fotografías…";
          try {
            const data = new FormData();
            data.set("date", form.elements.date.value);
            for (const [view] of VIEWS) data.set(view, await makePreview(form.elements[view].files[0]));
            status.textContent = "Guardando la serie privada…";
            await api("/api/gym/photos", { method: "POST", body: data });
            panel.dataset.photosLoaded = "0"; inFlight = null; await loadGymProgressPhotos(true, true);
          } catch (error) {
            status.textContent = error.message === "GYM_PHOTO_DATE_EXISTS"
              ? "Ya hay fotos en esta fecha; primero elimina la serie anterior."
              : "No se han guardado las fotos: " + String(error.message || "Error de conexión.");
            submit.disabled = false;
          }
        });
      };
      draw();
    } catch (error) {
      if (panel.isConnected) panel.innerHTML = '<p class="health-empty">No se puede cargar el archivo privado. Vuelve a abrir Progreso físico para reintentarlo.</p>';
      panel.dataset.photosLoaded = "0";
      console.warn("Private gym photos unavailable", String(error?.message || "UNKNOWN"));
    }
  })().finally(() => { inFlight = null; });
  return inFlight;
}
