import http from "node:http";
import { timingSafeEqual } from "node:crypto";

const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const ALLOWED_TYPES = new Set(["original", "processed", "thumbnail"]);
const DEFAULT_HOST_SUFFIXES = [".oaiusercontent.com", ".openai.com"];

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function bearer(request) {
  const header = String(request.headers.get("authorization") || "").trim();
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function normalizeObjectId(value) {
  const id = String(value || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(id)) throw new Error("INVALID_OBJECT_ID");
  return id;
}

function normalizeImageType(value) {
  const type = String(value || "").trim().toLowerCase();
  if (!ALLOWED_TYPES.has(type)) throw new Error("INVALID_IMAGE_TYPE");
  return type;
}

function bounded(value, max) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : "";
}

function allowedHost(hostname, suffixes) {
  const host = String(hostname || "").toLowerCase();
  return suffixes.some((suffix) => {
    const normalized = String(suffix || "").trim().toLowerCase();
    if (!normalized) return false;
    if (normalized.startsWith(".")) return host.endsWith(normalized);
    return host === normalized;
  });
}

function parseHostSuffixes(value) {
  const items = String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
  return items.length ? items : DEFAULT_HOST_SUFFIXES;
}

async function fetchOpenAIFile(ref, config, fetchImpl = fetch) {
  const mime = String(ref?.mime_type || "").toLowerCase();
  if (!ALLOWED_MIME.has(mime)) throw new Error("INVALID_IMAGE_MIME");
  const url = new URL(String(ref?.download_link || ""));
  if (url.protocol !== "https:" || !allowedHost(url.hostname, config.fileHostSuffixes)) {
    throw new Error("FILE_HOST_NOT_ALLOWED");
  }

  let current = url;
  for (let hop = 0; hop < 4; hop += 1) {
    const response = await fetchImpl(current, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": "SegundoCerebroObjectsBridge/1.0" }
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("FILE_REDIRECT_INVALID");
      current = new URL(location, current);
      if (current.protocol !== "https:" || !allowedHost(current.hostname, config.fileHostSuffixes)) {
        throw new Error("FILE_REDIRECT_NOT_ALLOWED");
      }
      continue;
    }

    if (!response.ok) throw new Error("FILE_DOWNLOAD_FAILED");
    const length = Number(response.headers.get("content-length") || 0);
    if (length && length > config.maxBytes) throw new Error("IMAGE_TOO_LARGE");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.byteLength || bytes.byteLength > config.maxBytes) throw new Error("IMAGE_TOO_LARGE");
    return { bytes, mime };
  }

  throw new Error("TOO_MANY_REDIRECTS");
}

function configFromEnv(env = process.env) {
  return {
    actionKey: String(env.CHATGPT_ACTION_API_KEY || ""),
    upstreamSecret: String(env.OBJECTS_UPSTREAM_SECRET || ""),
    upstreamBaseUrl: String(env.SEGUNDO_CEREBRO_BASE_URL || "https://segundo-cerebro.mamg97.workers.dev").replace(/\/+$/, ""),
    maxBytes: Math.max(1024, Number(env.MAX_IMAGE_BYTES || DEFAULT_MAX_BYTES)),
    fileHostSuffixes: parseHostSuffixes(env.OPENAI_FILE_HOST_SUFFIXES)
  };
}

export async function handleRequest(request, env = process.env, fetchImpl = fetch) {
  const config = configFromEnv(env);
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") {
    return json({
      ok: true,
      service: "segundo-cerebro-objects-chatgpt-bridge",
      configured: Boolean(config.actionKey && config.upstreamSecret)
    });
  }

  if (url.pathname === "/render-look-image") {
    if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
    if (!config.actionKey || !config.upstreamSecret) return json({ ok: false, code: "BRIDGE_NOT_CONFIGURED" }, 503);
    if (!safeEqual(bearer(request), config.actionKey)) return json({ ok: false, code: "AUTH_REQUIRED" }, 401);

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ ok: false, code: "INVALID_JSON" }, 400);
    }

    let lookId;
    try {
      lookId = normalizeObjectId(payload?.look_id);
    } catch {
      return json({ ok: false, code: "INVALID_LOOK_ID" }, 400);
    }

    const upstreamUrl = config.upstreamBaseUrl + "/api/internal/objects/look/" + encodeURIComponent(lookId) + "/render";
    console.info("[objects-bridge]", { stage: "look_render_upstream_start", lookId });

    let upstream;
    try {
      upstream = await fetchImpl(upstreamUrl, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + config.upstreamSecret,
          "Content-Type": "application/json",
          "user-agent": "SegundoCerebroObjectsBridge/1.0"
        },
        body: JSON.stringify({
          look_id: lookId,
          overwrite: payload?.overwrite === true
        })
      });
    } catch {
      console.warn("[objects-bridge]", { stage: "look_render_network_failed", lookId });
      return json({ ok: false, code: "UPSTREAM_UNREACHABLE" }, 502);
    }

    let result;
    try {
      result = await upstream.json();
    } catch {
      const contentType = String(upstream.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      console.warn("[objects-bridge]", {
        stage: "look_render_invalid_response",
        lookId,
        status: upstream.status,
        contentType: contentType || null
      });
      return json({
        ok: false,
        code: "UPSTREAM_INVALID_RESPONSE",
        upstream_status: upstream.status,
        upstream_content_type: contentType || null
      }, 502);
    }

    if (!upstream.ok || result?.ok !== true) {
      const code = String(result?.code || "UPSTREAM_RENDER_FAILED");
      console.warn("[objects-bridge]", { stage: "look_render_failed", lookId, code, status: upstream.status });
      return json({ ok: false, code }, upstream.status >= 400 ? upstream.status : 502);
    }

    console.info("[objects-bridge]", {
      stage: "look_render_done",
      lookId,
      version: result.version || null,
      itemCount: result.item_count || null
    });
    return json({
      ok: true,
      look_id: result.look_id,
      foto_url: result.url || null,
      version: result.version || null,
      render_source: result.render_source || null,
      item_count: result.item_count || null,
      updated_at: result.updated_at || null
    }, 201);
  }

  if (url.pathname === "/ingest-look-image") {
    if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
    if (!config.actionKey || !config.upstreamSecret) return json({ ok: false, code: "BRIDGE_NOT_CONFIGURED" }, 503);
    if (!safeEqual(bearer(request), config.actionKey)) return json({ ok: false, code: "AUTH_REQUIRED" }, 401);

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ ok: false, code: "INVALID_JSON" }, 400);
    }

    let lookId;
    try {
      lookId = normalizeObjectId(payload?.look_id);
    } catch {
      return json({ ok: false, code: "INVALID_LOOK_ID" }, 400);
    }

    const refs = Array.isArray(payload?.openaiFileIdRefs) ? payload.openaiFileIdRefs : [];
    if (refs.length !== 1) return json({ ok: false, code: "ONE_IMAGE_FILE_REQUIRED" }, 400);
    const ref = refs[0] || {};
    if (!String(ref.id || "").trim() || !String(ref.download_link || "").trim()) {
      return json({ ok: false, code: "INVALID_FILE_REFERENCE" }, 400);
    }

    console.info("[objects-bridge]", { stage: "look_download_start", lookId });
    let downloaded;
    try {
      downloaded = await fetchOpenAIFile(ref, config, fetchImpl);
    } catch (error) {
      const code = String(error?.message || "FILE_DOWNLOAD_FAILED");
      console.warn("[objects-bridge]", { stage: "look_download_failed", lookId, code });
      const status = code === "IMAGE_TOO_LARGE" ? 413 : code.includes("MIME") ? 415 : 400;
      return json({ ok: false, code }, status);
    }

    const form = new FormData();
    form.set("look_id", lookId);
    form.set("overwrite", payload?.overwrite === true ? "true" : "false");
    const rawName = bounded(ref?.name || "look-image", 120).replace(/[^A-Za-z0-9._ -]+/g, "_") || "look-image";
    form.set("image", new Blob([downloaded.bytes], { type: downloaded.mime }), rawName);

    const upstreamUrl = config.upstreamBaseUrl + "/api/internal/objects/look/" + encodeURIComponent(lookId) + "/image";
    console.info("[objects-bridge]", {
      stage: "look_upstream_start",
      lookId,
      bytes: downloaded.bytes.byteLength
    });

    let upstream;
    try {
      upstream = await fetchImpl(upstreamUrl, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + config.upstreamSecret,
          "user-agent": "SegundoCerebroObjectsBridge/1.0"
        },
        body: form
      });
    } catch {
      console.warn("[objects-bridge]", { stage: "look_upstream_network_failed", lookId });
      return json({ ok: false, code: "UPSTREAM_UNREACHABLE" }, 502);
    }

    let result;
    try {
      result = await upstream.json();
    } catch {
      const contentType = String(upstream.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      console.warn("[objects-bridge]", {
        stage: "look_upstream_invalid_response",
        lookId,
        status: upstream.status,
        contentType: contentType || null
      });
      return json({
        ok: false,
        code: "UPSTREAM_INVALID_RESPONSE",
        upstream_status: upstream.status,
        upstream_content_type: contentType || null
      }, 502);
    }

    if (!upstream.ok || result?.ok !== true) {
      const code = String(result?.code || "UPSTREAM_INGEST_FAILED");
      console.warn("[objects-bridge]", { stage: "look_upstream_failed", lookId, code, status: upstream.status });
      return json({ ok: false, code }, upstream.status >= 400 ? upstream.status : 502);
    }

    console.info("[objects-bridge]", { stage: "look_done", lookId, version: result.version || null });
    return json({
      ok: true,
      look_id: result.look_id,
      foto_url: result.url || null,
      version: result.version || null,
      updated_at: result.updated_at || null
    }, 201);
  }

  if (url.pathname !== "/ingest-object-image") return json({ ok: false, code: "NOT_FOUND" }, 404);
  if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  if (!config.actionKey || !config.upstreamSecret) return json({ ok: false, code: "BRIDGE_NOT_CONFIGURED" }, 503);
  if (!safeEqual(bearer(request), config.actionKey)) return json({ ok: false, code: "AUTH_REQUIRED" }, 401);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, code: "INVALID_JSON" }, 400);
  }

  let objetoId;
  let imageType;
  try {
    objetoId = normalizeObjectId(payload?.objeto_id);
    imageType = normalizeImageType(payload?.image_type);
  } catch (error) {
    return json({ ok: false, code: String(error?.message || "INVALID_INPUT") }, 400);
  }

  const refs = Array.isArray(payload?.openaiFileIdRefs) ? payload.openaiFileIdRefs : [];
  if (refs.length !== 1) return json({ ok: false, code: "ONE_IMAGE_FILE_REQUIRED" }, 400);
  const ref = refs[0] || {};
  if (!String(ref.id || "").trim() || !String(ref.download_link || "").trim()) {
    return json({ ok: false, code: "INVALID_FILE_REFERENCE" }, 400);
  }

  console.info("[objects-bridge]", { stage: "download_start", objetoId, imageType });
  let downloaded;
  try {
    downloaded = await fetchOpenAIFile(ref, config, fetchImpl);
  } catch (error) {
    const code = String(error?.message || "FILE_DOWNLOAD_FAILED");
    console.warn("[objects-bridge]", { stage: "download_failed", objetoId, imageType, code });
    const status = code === "IMAGE_TOO_LARGE" ? 413 : code.includes("MIME") ? 415 : 400;
    return json({ ok: false, code }, status);
  }

  const form = new FormData();
  form.set("objeto_id", objetoId);
  form.set("image_type", imageType);
  form.set("overwrite", payload?.overwrite === true ? "true" : "false");
  for (const [key, max] of [
    ["vista_prenda", 64],
    ["color_principal", 80],
    ["patron", 80],
    ["categoria_visual", 80],
    ["capa", 32],
    ["estado_procesado", 16]
  ]) {
    const value = bounded(payload?.[key], max);
    if (value) form.set(key, value);
  }
  const rawName = bounded(ref?.name || "image", 120).replace(/[^A-Za-z0-9._ -]+/g, "_") || "image";
  form.set("image", new Blob([downloaded.bytes], { type: downloaded.mime }), rawName);

  const upstreamUrl = config.upstreamBaseUrl + "/api/internal/objects/" + encodeURIComponent(objetoId) + "/image";
  console.info("[objects-bridge]", {
    stage: "upstream_start",
    objetoId,
    imageType,
    bytes: downloaded.bytes.byteLength
  });

  let upstream;
  try {
    upstream = await fetchImpl(upstreamUrl, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + config.upstreamSecret,
        "user-agent": "SegundoCerebroObjectsBridge/1.0"
      },
      body: form
    });
  } catch (error) {
    console.warn("[objects-bridge]", { stage: "upstream_network_failed", objetoId, imageType });
    return json({ ok: false, code: "UPSTREAM_UNREACHABLE" }, 502);
  }

  let result;
  try {
    result = await upstream.json();
  } catch {
    const contentType = String(upstream.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    console.warn("[objects-bridge]", {
      stage: "upstream_invalid_response",
      objetoId,
      imageType,
      status: upstream.status,
      contentType: contentType || null
    });
    return json({
      ok: false,
      code: "UPSTREAM_INVALID_RESPONSE",
      upstream_status: upstream.status,
      upstream_content_type: contentType || null
    }, 502);
  }
  if (!upstream.ok || result?.ok !== true) {
    const code = String(result?.code || "UPSTREAM_INGEST_FAILED");
    console.warn("[objects-bridge]", { stage: "upstream_failed", objetoId, imageType, code, status: upstream.status });
    return json({ ok: false, code }, upstream.status >= 400 ? upstream.status : 502);
  }

  let version = null;
  try {
    version = new URL(String(result.url || ""), config.upstreamBaseUrl).searchParams.get("v");
  } catch {}

  const response = {
    ok: true,
    objeto_id: result.objeto_id,
    image_type: result.image_type,
    estado_procesado: result.estado_procesado || null,
    version,
    updated_at: result.updated_at || null
  };
  if (imageType === "original") response.foto_original_url = result.url || null;
  if (imageType === "processed") response.foto_procesada_url = result.url || null;
  if (result.thumbnail_url) response.miniatura_url = result.thumbnail_url;

  console.info("[objects-bridge]", { stage: "done", objetoId, imageType, version });
  return json(response, 201);
}

async function nodeRequestToWeb(req) {
  const protocol = "http";
  const host = req.headers.host || "localhost";
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  return new Request(protocol + "://" + host + req.url, {
    method: req.method,
    headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method || "GET") ? undefined : body
  });
}

async function writeNodeResponse(res, response) {
  res.statusCode = response.status;
  for (const [key, value] of response.headers) res.setHeader(key, value);
  const bytes = Buffer.from(await response.arrayBuffer());
  res.end(bytes);
}

if (import.meta.url === new URL("file://" + process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  const server = http.createServer(async (req, res) => {
    try {
      const request = await nodeRequestToWeb(req);
      const response = await handleRequest(request);
      await writeNodeResponse(res, response);
    } catch (error) {
      console.error("[objects-bridge]", { stage: "unhandled", code: String(error?.message || "ERROR") });
      await writeNodeResponse(res, json({ ok: false, code: "INTERNAL_ERROR" }, 500));
    }
  });
  server.listen(port, "0.0.0.0", () => console.info("[objects-bridge]", { stage: "listening", port }));
}
