const WGER_ORIGIN = "https://wger.de";
const WGER_API_BASE = WGER_ORIGIN + "/api/v2";
const WGER_PROVIDER = "wger";
const WGER_TIMEOUT_MS = 8000;
const WGER_LIST_CACHE_MS = 15 * 60 * 1000;
const WGER_DETAIL_CACHE_MS = 60 * 60 * 1000;

let referenceCache = { value: null, expiresAt: 0 };
const searchCache = new Map();
const detailCache = new Map();

function cleanText(value, max = 4000) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, code) => {
      const point = Number(code);
      return Number.isFinite(point) ? String.fromCodePoint(point) : "";
    });
}

function descriptionText(value) {
  return cleanText(
    decodeHtmlEntities(
      String(value || "")
        .replace(/<br\s*\/?\s*>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<li[^>]*>/gi, "• ")
        .replace(/<[^>]+>/g, " ")
    ),
    6000
  );
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value), WGER_ORIGIN);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isTrustedWgerMediaUrl(value) {
  const url = safeUrl(value);
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "wger.de" || host.endsWith(".wger.de");
  } catch {
    return false;
  }
}

function withTimeout(ms = WGER_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, timeout };
}

async function fetchWgerJson(path, params = {}, options = {}) {
  const url = new URL(WGER_API_BASE + path);
  for (const [key, raw] of Object.entries(params)) {
    if (raw === null || raw === undefined || raw === "") continue;
    url.searchParams.set(key, String(raw));
  }
  const { controller, timeout } = withTimeout(options.timeoutMs || WGER_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Segundo-Cerebro/1.0"
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error("WGER_" + response.status);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function listResults(payload) {
  return Array.isArray(payload) ? payload : Array.isArray(payload?.results) ? payload.results : [];
}

async function fetchReferences() {
  if (referenceCache.value && referenceCache.expiresAt > Date.now()) return referenceCache.value;

  const [languagesPayload, musclesPayload, equipmentPayload, categoriesPayload] = await Promise.all([
    fetchWgerJson("/language/", { limit: 100 }),
    fetchWgerJson("/muscle/", { limit: 100 }),
    fetchWgerJson("/equipment/", { limit: 100 }),
    fetchWgerJson("/exercisecategory/", { limit: 100 })
  ]);

  const languages = listResults(languagesPayload);
  const languageById = new Map(
    languages.map((item) => [String(item.id), String(item.short_name || item.code || item.language_code || "").toLowerCase()])
  );

  const value = {
    languageById,
    muscles: listResults(musclesPayload).map((item) => ({
      id: item.id,
      name: cleanText(item.name_en || item.name || "", 100),
      nameOriginal: cleanText(item.name || "", 100)
    })),
    equipment: listResults(equipmentPayload).map((item) => ({
      id: item.id,
      name: cleanText(item.name || "", 100)
    })),
    categories: listResults(categoriesPayload).map((item) => ({
      id: item.id,
      name: cleanText(item.name || "", 100)
    }))
  };
  referenceCache = { value, expiresAt: Date.now() + WGER_LIST_CACHE_MS };
  return value;
}

function translationCode(translation, languageById) {
  const raw = translation?.language;
  if (raw && typeof raw === "object") {
    return String(raw.short_name || raw.code || raw.language_code || "").toLowerCase();
  }
  return languageById.get(String(raw)) || "";
}

function chooseTranslation(raw, languageById) {
  const translations = Array.isArray(raw?.translations) ? raw.translations : [];
  const spanish = translations.find((item) => translationCode(item, languageById) === "es");
  const english = translations.find((item) => translationCode(item, languageById) === "en");
  return spanish || english || translations[0] || null;
}

function normalizeLicense(raw) {
  if (!raw) return null;
  if (typeof raw === "string") return { title: cleanText(raw, 120), url: null };
  if (typeof raw === "number") return { title: "Licencia wger #" + raw, url: null };
  const title = cleanText(
    raw.full_name || raw.name || raw.short_name || raw.title || raw.license_title || "",
    160
  );
  const url = safeUrl(raw.url || raw.license_object_url || null);
  if (!title && !url) return null;
  return { title: title || "Licencia declarada por wger", url };
}

function mediaLicense(media, fallback) {
  const title = cleanText(media?.license_title || "", 160);
  const url = safeUrl(media?.license_object_url || null);
  const author = cleanText(media?.license_author || "", 160);
  const authorUrl = safeUrl(media?.license_author_url || null);
  if (title || url || author) return { title: title || "Licencia declarada por wger", url, author, authorUrl };
  return fallback ? { ...fallback, author: "", authorUrl: null } : null;
}

function normalizeMuscle(item) {
  return {
    id: item?.id ?? null,
    name: cleanText(item?.name_en || item?.name || "", 100),
    nameOriginal: cleanText(item?.name || "", 100),
    imageMain: safeUrl(item?.image_url_main || null),
    imageSecondary: safeUrl(item?.image_url_secondary || null)
  };
}

function proxyMediaPath(exerciseId, kind, mediaId, variant = "") {
  const base = "/api/gym/exercises/" + encodeURIComponent(String(exerciseId)) +
    "/media/" + encodeURIComponent(kind) + "/" + encodeURIComponent(String(mediaId));
  return variant ? base + "?variant=" + encodeURIComponent(variant) : base;
}

export function normalizeWgerExercise(raw, languageById = new Map()) {
  const translation = chooseTranslation(raw, languageById);
  const exerciseId = raw?.id ?? null;
  const baseLicense = normalizeLicense(raw?.license);
  const images = (Array.isArray(raw?.images) ? raw.images : [])
    .map((item) => {
      const original = safeUrl(item?.image);
      const medium = safeUrl(item?.thumbnails?.medium);
      const small = safeUrl(item?.thumbnails?.small);
      const license = mediaLicense(item, baseLicense);
      if (!original || !license || !exerciseId || item?.id === undefined || item?.id === null) return null;
      return {
        id: item.id,
        kind: "image",
        isMain: Boolean(item.is_main),
        width: safeNumber(item.width),
        height: safeNumber(item.height),
        previewUrl: proxyMediaPath(exerciseId, "image", item.id, medium ? "medium" : small ? "small" : ""),
        originalUrl: proxyMediaPath(exerciseId, "image", item.id),
        license
      };
    })
    .filter(Boolean);

  const videos = (Array.isArray(raw?.videos) ? raw.videos : [])
    .map((item) => {
      const source = safeUrl(item?.video);
      const license = mediaLicense(item, baseLicense);
      if (!source || !license || !exerciseId || item?.id === undefined || item?.id === null) return null;
      return {
        id: item.id,
        kind: "video",
        isMain: Boolean(item.is_main),
        width: safeNumber(item.width),
        height: safeNumber(item.height),
        duration: safeNumber(item.duration),
        codec: cleanText(item.codec_long || item.codec || "", 80),
        url: proxyMediaPath(exerciseId, "video", item.id),
        license
      };
    })
    .filter(Boolean);

  const aliases = Array.isArray(translation?.aliases)
    ? translation.aliases.map((item) => cleanText(item?.alias || "", 120)).filter(Boolean)
    : [];

  return {
    id: exerciseId,
    uuid: cleanText(raw?.uuid || "", 80) || null,
    name: cleanText(translation?.name || "Ejercicio", 180),
    aliases,
    description: descriptionText(translation?.description || translation?.description_source || ""),
    category: raw?.category ? {
      id: raw.category.id ?? null,
      name: cleanText(raw.category.name || "", 120)
    } : null,
    muscles: (Array.isArray(raw?.muscles) ? raw.muscles : []).map(normalizeMuscle),
    secondaryMuscles: (Array.isArray(raw?.muscles_secondary) ? raw.muscles_secondary : []).map(normalizeMuscle),
    equipment: (Array.isArray(raw?.equipment) ? raw.equipment : []).map((item) => ({
      id: item?.id ?? null,
      name: cleanText(item?.name || "", 120)
    })),
    images,
    videos,
    hasVideo: videos.length > 0,
    hasImage: images.length > 0,
    license: baseLicense,
    source: {
      provider: WGER_PROVIDER,
      label: "wger",
      apiUrl: WGER_API_BASE + "/exerciseinfo/" + encodeURIComponent(String(exerciseId)) + "/"
    }
  };
}

async function languageMap() {
  try {
    return (await fetchReferences()).languageById;
  } catch {
    return new Map();
  }
}

async function fetchRawExerciseDetail(exerciseId) {
  const id = String(exerciseId || "").trim();
  if (!/^\d+$/.test(id)) throw new Error("INVALID_WGER_EXERCISE_ID");
  const cached = detailCache.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const raw = await fetchWgerJson("/exerciseinfo/" + id + "/");
  detailCache.set(id, { value: raw, expiresAt: Date.now() + WGER_DETAIL_CACHE_MS });
  return raw;
}

export async function getGymLibraryExercise(exerciseId) {
  const [raw, languages] = await Promise.all([fetchRawExerciseDetail(exerciseId), languageMap()]);
  return normalizeWgerExercise(raw, languages);
}

function cacheKeyForSearch(options) {
  return JSON.stringify({
    q: options.q || "",
    muscle: options.muscle || "",
    equipment: options.equipment || "",
    category: options.category || "",
    featured: options.featured || "",
    limit: options.limit || 24,
    offset: options.offset || 0
  });
}

function clampInteger(value, min, max, fallback) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

async function featuredVideoExercises(limit, offset) {
  const videoPayload = await fetchWgerJson("/video/", {
    limit: Math.min(80, Math.max(24, limit * 3)),
    offset,
    ordering: "-id"
  });
  const videoRows = listResults(videoPayload);
  const ids = [...new Set(videoRows.map((item) => Number(item?.exercise)).filter(Number.isFinite))].slice(0, limit);
  if (!ids.length) return { count: 0, results: [] };

  const exercisePayload = await fetchWgerJson("/exerciseinfo/", {
    id__in: ids.join(","),
    language__code: "es,en",
    limit: ids.length
  });
  const raw = listResults(exercisePayload);
  const order = new Map(ids.map((id, index) => [String(id), index]));
  raw.sort((a, b) => (order.get(String(a.id)) ?? 999) - (order.get(String(b.id)) ?? 999));
  return { count: Number(videoPayload?.count || raw.length), results: raw };
}

export async function searchGymExerciseLibrary(options = {}) {
  const limit = clampInteger(options.limit, 1, 48, 24);
  const offset = clampInteger(options.offset, 0, 10000, 0);
  const normalized = {
    q: cleanText(options.q || "", 120),
    muscle: cleanText(options.muscle || "", 20),
    equipment: cleanText(options.equipment || "", 20),
    category: cleanText(options.category || "", 20),
    featured: cleanText(options.featured || "", 20),
    limit,
    offset
  };
  const key = cacheKeyForSearch(normalized);
  const cached = searchCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  let payload;
  if (!normalized.q && !normalized.muscle && !normalized.equipment && !normalized.category && normalized.featured === "video") {
    payload = await featuredVideoExercises(limit, offset);
  } else {
    payload = await fetchWgerJson("/exerciseinfo/", {
      name__search: normalized.q || null,
      language__code: "es,en",
      muscles: /^\d+$/.test(normalized.muscle) ? normalized.muscle : null,
      equipment: /^\d+$/.test(normalized.equipment) ? normalized.equipment : null,
      category: /^\d+$/.test(normalized.category) ? normalized.category : null,
      limit,
      offset
    });
  }

  const languages = await languageMap();
  let exercises = listResults(payload).map((item) => normalizeWgerExercise(item, languages));
  if (normalized.featured === "video") exercises = exercises.filter((item) => item.hasVideo);
  const value = {
    count: Number(payload?.count ?? exercises.length),
    offset,
    limit,
    exercises
  };
  searchCache.set(key, { value, expiresAt: Date.now() + WGER_LIST_CACHE_MS });
  return value;
}

export async function getGymExerciseLibraryMeta() {
  const refs = await fetchReferences();
  return {
    provider: WGER_PROVIDER,
    providerLabel: "wger",
    priceEur: 0,
    attributionRequired: true,
    categories: refs.categories,
    muscles: refs.muscles,
    equipment: refs.equipment
  };
}

async function ensureGymLibraryTables(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS gym_exercise_links (
      plan_exercise_id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      provider_exercise_id TEXT NOT NULL,
      provider_exercise_uuid TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();
  await env.DB.prepare(
    "CREATE INDEX IF NOT EXISTS idx_gym_exercise_links_provider ON gym_exercise_links(provider, provider_exercise_id)"
  ).run();
}

export async function getGymExerciseLinks(env) {
  await ensureGymLibraryTables(env);
  const result = await env.DB.prepare(`
    SELECT plan_exercise_id, provider, provider_exercise_id, provider_exercise_uuid, created_at, updated_at
    FROM gym_exercise_links
    ORDER BY updated_at DESC
  `).all();
  return (result.results || []).map((row) => ({
    planExerciseId: row.plan_exercise_id,
    provider: row.provider,
    providerExerciseId: row.provider_exercise_id,
    providerExerciseUuid: row.provider_exercise_uuid || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function linkGymExercise(env, input = {}) {
  const planExerciseId = cleanText(input.planExerciseId || "", 120);
  const providerExerciseId = cleanText(input.providerExerciseId || "", 40);
  if (!planExerciseId) throw new Error("GYM_PLAN_EXERCISE_ID_REQUIRED");
  if (!/^\d+$/.test(providerExerciseId)) throw new Error("INVALID_WGER_EXERCISE_ID");

  const exercise = await getGymLibraryExercise(providerExerciseId);
  const now = new Date().toISOString();
  await ensureGymLibraryTables(env);
  await env.DB.prepare(`
    INSERT INTO gym_exercise_links (
      plan_exercise_id, provider, provider_exercise_id, provider_exercise_uuid, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(plan_exercise_id) DO UPDATE SET
      provider = excluded.provider,
      provider_exercise_id = excluded.provider_exercise_id,
      provider_exercise_uuid = excluded.provider_exercise_uuid,
      updated_at = excluded.updated_at
  `).bind(
    planExerciseId,
    WGER_PROVIDER,
    String(exercise.id),
    exercise.uuid,
    now,
    now
  ).run();
  return {
    planExerciseId,
    provider: WGER_PROVIDER,
    providerExerciseId: String(exercise.id),
    providerExerciseUuid: exercise.uuid,
    updatedAt: now,
    exercise
  };
}

export async function proxyGymExerciseMedia(request, exerciseId, kind, mediaId) {
  if (!["video", "image"].includes(kind)) return new Response("Not found", { status: 404 });
  const raw = await fetchRawExerciseDetail(exerciseId);
  const collection = kind === "video"
    ? (Array.isArray(raw?.videos) ? raw.videos : [])
    : (Array.isArray(raw?.images) ? raw.images : []);
  const media = collection.find((item) => String(item?.id) === String(mediaId));
  if (!media) return new Response("Not found", { status: 404 });

  let source = kind === "video" ? safeUrl(media.video) : safeUrl(media.image);
  if (kind === "image") {
    const variant = new URL(request.url).searchParams.get("variant");
    if (variant === "medium") source = safeUrl(media?.thumbnails?.medium) || source;
    if (variant === "small") source = safeUrl(media?.thumbnails?.small) || source;
  }
  if (!source || !isTrustedWgerMediaUrl(source)) return new Response("Not found", { status: 404 });

  const headers = new Headers({ Accept: kind === "video" ? "video/*" : "image/*" });
  const range = request.headers.get("Range");
  if (range) headers.set("Range", range);

  const { controller, timeout } = withTimeout(12000);
  let upstream;
  try {
    upstream = await fetch(source, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  if (!upstream.ok && upstream.status !== 206) return new Response("Upstream media unavailable", { status: 502 });

  const responseHeaders = new Headers();
  for (const name of ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges", "ETag", "Last-Modified"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  responseHeaders.set("Cache-Control", "private, max-age=86400");
  responseHeaders.set("X-Exercise-Media-Source", WGER_PROVIDER);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
}
