// No cookies, secret or SDP is copied into a URL or saved in browser storage.
// Frames remain in browser WebRTC tracks; Worker is signaling-only.
const base = "/api/home/tapo/rtc";
const stun = [{ urls: "stun:stun.cloudflare.com:3478" }];
const el = (name) => document.getElementById(name);
let pc = null;
let screenStream = null;
let activeSession = null;
let generation = 0;
let role = null;

function status(message) { el("status").textContent = message; }
function setButtons(active) {
  el("start").disabled = active;
  el("watch").disabled = active;
  el("stop").disabled = !active;
}

async function api(method, path, { key, body } = {}) {
  const headers = { "Accept": "application/json" };
  if (key) headers["X-Tapo-Session-Key"] = key;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(base + path, {
    method, headers, cache: "no-store", credentials: "same-origin",
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error("No hay respuesta JSON autenticada del Worker."); }
  if (!response.ok || !payload.ok) throw new Error(payload.code || "ERROR_SERVIDOR");
  return payload;
}
function videoPeer() {
  const connection = new RTCPeerConnection({ iceServers: stun, iceTransportPolicy: "all" });
  connection.addEventListener("connectionstatechange", () => {
    if (connection !== pc) return;
    if (connection.connectionState === "connected") status("Conexión WebRTC establecida. El vídeo viaja cifrado entre dispositivos.");
    else if (connection.connectionState === "failed") status("No existe ruta directa: ICE falló. Sin TURN no se puede completar esta sesión.");
    else if (connection.connectionState === "disconnected") status("La conexión WebRTC se ha interrumpido.");
  });
  return connection;
}
function waitForIceComplete(connection, timeoutMs = 20_000) {
  if (connection.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      connection.removeEventListener("icegatheringstatechange", changed);
      reject(new Error("ICE_TIMEOUT"));
    }, timeoutMs);
    function changed() {
      if (connection.iceGatheringState !== "complete") return;
      clearTimeout(timeout);
      connection.removeEventListener("icegatheringstatechange", changed);
      resolve();
    }
    connection.addEventListener("icegatheringstatechange", changed);
  });
}
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function waitForDescription(sessionId, key, expectedType, run) {
  const until = Date.now() + 13 * 60_000;
  while (generation === run && Date.now() < until) {
    const result = await api("GET", "/" + sessionId + "/poll", { key });
    if (result.type !== expectedType) throw new Error("ROL_INCORRECTO");
    if (result.description) return result.description;
    await delay(3000);
  }
  throw new Error("SESIÓN_CADUCADA_O_CANCELADA");
}
function stopLocal() {
  generation += 1;
  if (pc) { pc.close(); pc = null; }
  if (screenStream) {
    screenStream.getTracks().forEach(track => track.stop());
    screenStream = null;
  }
  el("preview").srcObject = null;
  el("remote").srcObject = null;
  const closing = activeSession;
  const wasPresenter = role === "presenter";
  activeSession = null;
  role = null;
  setButtons(false);
  el("copy").disabled = true;
  el("invitation").value = "";
  if (wasPresenter && closing) {
    api("DELETE", "/" + closing.id, { key: closing.key }).catch(() => {});
  }
}

el("start").addEventListener("click", async () => {
  if (pc || screenStream) return;
  const run = ++generation;
  role = "presenter";
  setButtons(true);
  status("Selecciona únicamente la ventana Tapo. La captura comienza en tu Mac.");
  try {
    // Permission must be requested directly from a real user gesture, BEFORE other awaits.
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      audio: false, video: { frameRate: { ideal: 12, max: 15 } }
    });
    if (generation !== run) { screenStream.getTracks().forEach(t => t.stop()); return; }
    screenStream.getVideoTracks()[0].addEventListener("ended", () => {
      stopLocal();
      status("Has detenido la captura de pantalla; sesión finalizada.");
    }, { once: true });
    el("preview").srcObject = screenStream;
    const session = await api("POST", "");
    if (generation !== run) return;
    activeSession = { id: session.sessionId, key: session.presenterKey };
    el("invitation").value = session.sessionId + "." + session.viewerKey;
    el("copy").disabled = false;

    pc = videoPeer();
    for (const track of screenStream.getVideoTracks()) pc.addTrack(track, screenStream);
    await pc.setLocalDescription(await pc.createOffer());
    status("Negociando conectividad. Copia la invitación al iPhone mientras esperas.");
    await waitForIceComplete(pc);
    if (generation !== run) return;
    await api("PUT", "/" + session.sessionId + "/offer", {
      key: session.presenterKey,
      body: { type: "offer", sdp: pc.localDescription.sdp }
    });
    status("Oferta disponible. Pega la invitación en el otro dispositivo.");
    const answer = await waitForDescription(session.sessionId, session.presenterKey, "answer", run);
    if (generation !== run) return;
    await pc.setRemoteDescription(answer);
    status("Respuesta recibida: intentando conexión cifrada entre dispositivos.");
  } catch (error) {
    stopLocal();
    status("Prueba detenida: " + String(error?.message || error).slice(0, 110));
  }
});

el("watch").addEventListener("click", async () => {
  if (pc || screenStream) return;
  const invite = el("join").value.trim();
  const match = invite.match(/^([0-9a-f-]{36})\.([0-9a-f]{64})$/i);
  if (!match) { status("La invitación no tiene el formato esperado."); return; }
  const [, sessionId, viewerKey] = match;
  const run = ++generation;
  role = "viewer";
  activeSession = { id: sessionId.toLowerCase(), key: viewerKey.toLowerCase() };
  setButtons(true);
  try {
    status("Buscando la oferta desde el Mac...");
    const offer = await waitForDescription(activeSession.id, activeSession.key, "offer", run);
    if (generation !== run) return;
    pc = videoPeer();
    pc.addEventListener("track", (event) => {
      if (generation !== run) return;
      const stream = event.streams[0] || new MediaStream([event.track]);
      el("remote").srcObject = stream;
      el("remote").play().catch(() => {
        status("Vídeo recibido. Pulsa Reproducir si Safari no inicia automáticamente.");
      });
    });
    await pc.setRemoteDescription(offer);
    await pc.setLocalDescription(await pc.createAnswer());
    status("Reuniendo candidatos de conexión, sin enviar fotogramas al servidor.");
    await waitForIceComplete(pc);
    if (generation !== run) return;
    await api("PUT", "/" + activeSession.id + "/answer", {
      key: activeSession.key,
      body: { type: "answer", sdp: pc.localDescription.sdp }
    });
    status("Respuesta enviada. Esperando vídeo cifrado desde el Mac...");
  } catch (error) {
    stopLocal();
    status("No se pudo conectar: " + String(error?.message || error).slice(0, 110));
  }
});

el("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(el("invitation").value);
    status("Invitación copiada. Pégala en el otro dispositivo; no la compartas públicamente.");
  } catch {
    el("invitation").focus();
    el("invitation").select();
    status("Selecciona y copia manualmente la invitación.");
  }
});
el("stop").addEventListener("click", () => {
  stopLocal();
  status("Sesión detenida. Captura de pantalla desactivada.");
});
window.addEventListener("pagehide", () => { stopLocal(); });
