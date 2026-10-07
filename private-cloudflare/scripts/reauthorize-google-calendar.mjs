import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [, , tokenPathArg] = process.argv;

if (!tokenPathArg) {
  console.error("Uso: node scripts/reauthorize-google-calendar.mjs /ruta/authorized_user.json");
  process.exit(1);
}

const tokenPath = resolve(tokenPathArg);
const payload = JSON.parse(await readFile(tokenPath, "utf8"));
for (const key of ["client_id", "client_secret"]) {
  if (!payload[key]) throw new Error("Falta " + key + " en el JSON OAuth");
}

const scopes = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/calendar.readonly"
];

const state = randomBytes(24).toString("hex");
let settleCallback;
const callbackPromise = new Promise((resolveCallback, rejectCallback) => {
  settleCallback = { resolve: resolveCallback, reject: rejectCallback };
});

const server = createServer((req, res) => {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname !== "/oauth2/callback") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    if (url.searchParams.get("state") !== state) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Estado OAuth no válido.");
      settleCallback.reject(new Error("OAUTH_STATE_MISMATCH"));
      return;
    }
    const error = url.searchParams.get("error");
    if (error) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Autorización cancelada o rechazada.");
      settleCallback.reject(new Error("OAUTH_" + String(error).toUpperCase()));
      return;
    }
    const code = url.searchParams.get("code");
    if (!code) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Falta el código OAuth.");
      settleCallback.reject(new Error("OAUTH_CODE_MISSING"));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<!doctype html><meta charset=\"utf-8\"><title>Segundo Cerebro</title><p>Autorización completada. Puedes cerrar esta pestaña.</p>");
    settleCallback.resolve(code);
  } catch (error) {
    settleCallback.reject(error);
  }
});

await new Promise((resolveListen, rejectListen) => {
  server.once("error", rejectListen);
  server.listen(0, "127.0.0.1", resolveListen);
});

const address = server.address();
if (!address || typeof address === "string") throw new Error("OAUTH_LOCAL_SERVER_FAILED");
const redirectUri = "http://127.0.0.1:" + address.port + "/oauth2/callback";

const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
auth.searchParams.set("client_id", payload.client_id);
auth.searchParams.set("redirect_uri", redirectUri);
auth.searchParams.set("response_type", "code");
auth.searchParams.set("scope", scopes.join(" "));
auth.searchParams.set("access_type", "offline");
auth.searchParams.set("prompt", "consent");
auth.searchParams.set("include_granted_scopes", "true");
auth.searchParams.set("state", state);

console.log("Abriendo Google para autorizar Drive/Sheets y Calendar en modo lectura de calendario.");
console.log("Si el navegador no se abre, copia esta URL:\n" + auth.toString());

const opener = process.platform === "darwin"
  ? ["open", [auth.toString()]]
  : process.platform === "win32"
    ? ["cmd", ["/c", "start", "", auth.toString()]]
    : ["xdg-open", [auth.toString()]];
try {
  const child = spawn(opener[0], opener[1], { stdio: "ignore", detached: true });
  child.unref();
} catch {
  // La URL ya se ha mostrado para apertura manual.
}

let code;
try {
  code = await Promise.race([
    callbackPromise,
    new Promise((_, rejectTimeout) => setTimeout(() => rejectTimeout(new Error("OAUTH_CALLBACK_TIMEOUT")), 10 * 60 * 1000))
  ]);
} finally {
  server.close();
}

const tokenBody = new URLSearchParams({
  client_id: payload.client_id,
  client_secret: payload.client_secret,
  code,
  grant_type: "authorization_code",
  redirect_uri: redirectUri
});

const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: tokenBody
});
const tokenPayload = await tokenResponse.json().catch(() => ({}));
if (!tokenResponse.ok) {
  throw new Error("GOOGLE_TOKEN_EXCHANGE_" + tokenResponse.status);
}
if (!tokenPayload.access_token || !tokenPayload.refresh_token) {
  throw new Error("GOOGLE_REFRESH_TOKEN_MISSING_AFTER_CONSENT");
}

const probe = await fetch(
  "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1&minAccessRole=reader",
  { headers: { Authorization: "Bearer " + tokenPayload.access_token } }
);
if (!probe.ok) {
  let reason = "";
  try {
    const body = await probe.json();
    reason = String(body?.error?.errors?.[0]?.reason || body?.error?.status || "")
      .replace(/[^A-Z0-9_-]/gi, "_").toUpperCase().slice(0, 80);
  } catch {
    reason = "";
  }
  throw new Error("GOOGLE_CALENDAR_PROBE_" + probe.status + (reason ? "_" + reason : ""));
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, "..");
const result = spawnSync(
  "npx",
  ["wrangler", "secret", "put", "GOOGLE_REFRESH_TOKEN", "--config", "wrangler.bootstrap.jsonc"],
  {
    cwd: projectDir,
    input: tokenPayload.refresh_token + "\n",
    stdio: ["pipe", "inherit", "inherit"],
    encoding: "utf8"
  }
);
if (result.status !== 0) process.exit(result.status || 1);

console.log("OAuth Google actualizado: Calendar read-only validado y GOOGLE_REFRESH_TOKEN sustituido.");
console.log("No se ha escrito ningún token nuevo en Git ni en el repositorio local.");
