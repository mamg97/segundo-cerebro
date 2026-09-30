import assert from "node:assert/strict";
import test from "node:test";
import {
  ObjectsImageError,
  generateThumbnailWebp,
  normalizeObjectId,
  uploadObjectsImage
} from "./objects-images.js";

const KNOWN_IDS = [
  "obj-shirt-scalpers-skyblue-001",
  "obj-sweater-poloclub-quarterzip-grey-001",
  "obj-chino-zara-navy-001",
  "obj-sneakers-adidas-samba-blue-001"
];

const PNG_1X1 = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lm8W8QAAAABJRU5ErkJggg==",
  "base64"
));

const HEADERS = [
  "objeto_id","tipo_prenda","color","talla","temporada","formalidad","contextos","oficina",
  "ultimo_uso","veces_usado","compatible_con","notas","foto_original_url","foto_procesada_url",
  "miniatura_url","estado_procesado","vista_prenda","color_principal","patron","categoria_visual",
  "capa","ultima_actualizacion_visual"
];

function armarioRow(id, values = {}) {
  const row = Array(HEADERS.length).fill("");
  const headerMap = new Map(HEADERS.map((header, index) => [header, index]));
  row[headerMap.get("objeto_id")] = id;
  for (const [key, value] of Object.entries(values)) {
    row[headerMap.get(key)] = value;
  }
  return { rowNumber: 16, headers: HEADERS, headerMap, row };
}

function sourceFor(id, extra = {}) {
  return {
    status: "ok-live",
    value: {
      objects: [{ id, name: "Prenda test", status: "DISPONIBLE", ...extra.object }],
      wardrobe: [{
        objectId: id,
        name: "Prenda test",
        subcategory: "Camisa",
        layer: "superior",
        primaryColor: "azul",
        status: "DISPONIBLE",
        ...extra.wardrobe
      }]
    }
  };
}

function mockBucket({ failPutAt = 0 } = {}) {
  const data = new Map();
  let puts = 0;
  return {
    data,
    async put(key, bytes, options = {}) {
      puts += 1;
      if (failPutAt && puts === failPutAt) throw new Error("R2_PUT_FAILED");
      data.set(key, {
        bytes: new Uint8Array(bytes),
        httpMetadata: options.httpMetadata || {},
        customMetadata: options.customMetadata || {}
      });
    },
    async delete(key) {
      data.delete(key);
    },
    async get(key) {
      const item = data.get(key);
      if (!item) return null;
      return {
        body: item.bytes,
        httpMetadata: item.httpMetadata,
        httpEtag: '"test-etag"'
      };
    }
  };
}

function imageRequest(id, {
  mime = "image/png",
  imageType = "processed",
  overwrite = false,
  authenticated = true,
  bytes = PNG_1X1,
  extra = {}
} = {}) {
  const form = new FormData();
  form.set("objeto_id", id);
  form.set("image_type", imageType);
  if (overwrite) form.set("overwrite", "true");
  for (const [key, value] of Object.entries(extra)) form.set(key, String(value));
  form.set("image", new File([bytes], "../unsafe/garment.png", { type: mime }));
  const headers = authenticated ? { "cf-access-jwt-assertion": "test-jwt" } : {};
  return new Request("https://private.example/api/objects/" + id + "/image", {
    method: "POST",
    headers,
    body: form
  });
}

function depsFor(id, bucket, {
  current = {},
  source = sourceFor(id),
  write = async () => {},
  thumbnail = async () => ({ bytes: new Uint8Array([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50]), width: 1, height: 1, mime: "image/webp" })
} = {}) {
  return {
    bucket,
    fetchObjectsSummary: async () => source,
    resolveObjectsSpreadsheetId: async () => "sheet-test",
    getArmarioRow: async () => armarioRow(id, current),
    writeArmarioFields: write,
    invalidateObjectsCache: () => {},
    generateThumbnailWebp: thumbnail
  };
}

async function rejectCode(promise, code, status) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof ObjectsImageError);
    assert.equal(error.code, code);
    if (status !== undefined) assert.equal(error.status, status);
    return true;
  });
}

test("rejects nonexistent canonical objects", async () => {
  const id = KNOWN_IDS[0];
  const bucket = mockBucket();
  const deps = depsFor(id, bucket, {
    source: { status: "ok-live", value: { objects: [], wardrobe: [] } }
  });
  await rejectCode(
    uploadObjectsImage(imageRequest(id), { OBJECTS_MEDIA: bucket }, async () => "token", id, deps),
    "OBJECT_NOT_FOUND",
    404
  );
  assert.equal(bucket.data.size, 0);
});

test("rejects invalid MIME before storage", async () => {
  const id = KNOWN_IDS[0];
  const bucket = mockBucket();
  await rejectCode(
    uploadObjectsImage(
      imageRequest(id, { mime: "text/plain", bytes: new TextEncoder().encode("not image") }),
      { OBJECTS_MEDIA: bucket },
      async () => "token",
      id,
      depsFor(id, bucket)
    ),
    "INVALID_IMAGE_MIME",
    415
  );
  assert.equal(bucket.data.size, 0);
});

test("uploads canonical processed image and generated thumbnail", async () => {
  const id = KNOWN_IDS[0];
  const bucket = mockBucket();
  let thumbnailCalls = 0;
  const deps = depsFor(id, bucket, {
    thumbnail: async () => {
      thumbnailCalls += 1;
      return { bytes: new Uint8Array([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50]), width: 400, height: 500, mime: "image/webp" };
    }
  });
  const result = await uploadObjectsImage(imageRequest(id), { OBJECTS_MEDIA: bucket }, async () => "token", id, deps);
  assert.equal(result.ok, true);
  assert.equal(result.objeto_id, id);
  assert.equal(result.image_type, "processed");
  assert.equal(result.estado_procesado, "procesada");
  assert.match(result.url, new RegExp("^/api/objects/" + id + "/image/processed\\?v="));
  assert.match(result.thumbnail_url, new RegExp("^/api/objects/" + id + "/image/thumbnail\\?v="));
  assert.equal(thumbnailCalls, 1);
  assert.equal(bucket.data.size, 2);
});

test("writes processed URL, thumbnail URL and visual state to Armario", async () => {
  const id = KNOWN_IDS[0];
  const bucket = mockBucket();
  let captured = null;
  const deps = depsFor(id, bucket, {
    write: async (_sheet, _token, _armario, fields) => { captured = fields; }
  });
  await uploadObjectsImage(
    imageRequest(id, { extra: { vista_prenda: "frontal", patron: "liso", categoria_visual: "camisa" } }),
    { OBJECTS_MEDIA: bucket },
    async () => "token",
    id,
    deps
  );
  assert.ok(captured);
  assert.match(captured.foto_procesada_url, /\/image\/processed\?v=/);
  assert.match(captured.miniatura_url, /\/image\/thumbnail\?v=/);
  assert.equal(captured.estado_procesado, "procesada");
  assert.equal(captured.vista_prenda, "frontal");
  assert.equal(captured.patron, "liso");
  assert.equal(captured.categoria_visual, "camisa");
  assert.equal(captured.capa, "superior");
  assert.match(captured.ultima_actualizacion_visual, /^\d{4}-\d{2}-\d{2}T/);
});

test("storage errors fail safely without Sheet writes", async () => {
  const id = KNOWN_IDS[0];
  const bucket = mockBucket({ failPutAt: 1 });
  let writes = 0;
  const deps = depsFor(id, bucket, { write: async () => { writes += 1; } });
  await rejectCode(
    uploadObjectsImage(imageRequest(id), { OBJECTS_MEDIA: bucket }, async () => "token", id, deps),
    "OBJECTS_MEDIA_UPLOAD_FAILED",
    502
  );
  assert.equal(writes, 0);
  assert.equal(bucket.data.size, 0);
});

test("Sheet update failure compensates by deleting newly uploaded assets", async () => {
  const id = KNOWN_IDS[0];
  const bucket = mockBucket();
  const deps = depsFor(id, bucket, {
    write: async () => { throw new Error("SHEET_DOWN"); }
  });
  await rejectCode(
    uploadObjectsImage(imageRequest(id), { OBJECTS_MEDIA: bucket }, async () => "token", id, deps),
    "OBJECTS_SHEET_UPDATE_FAILED",
    502
  );
  assert.equal(bucket.data.size, 0);
});

test("overwrite is explicit and superseded canonical assets are cleaned after success", async () => {
  const id = KNOWN_IDS[0];
  const bucket = mockBucket();
  const oldVersion = "12345678-abcd";
  const oldProcessedKey = "objects/" + id + "/processed/" + oldVersion;
  const oldThumbKey = "objects/" + id + "/thumbnail/" + oldVersion;
  bucket.data.set(oldProcessedKey, { bytes: PNG_1X1, httpMetadata: { contentType: "image/png" } });
  bucket.data.set(oldThumbKey, { bytes: PNG_1X1, httpMetadata: { contentType: "image/png" } });
  const current = {
    foto_procesada_url: "/api/objects/" + id + "/image/processed?v=" + oldVersion,
    miniatura_url: "/api/objects/" + id + "/image/thumbnail?v=" + oldVersion
  };

  await rejectCode(
    uploadObjectsImage(imageRequest(id), { OBJECTS_MEDIA: bucket }, async () => "token", id, depsFor(id, bucket, { current })),
    "IMAGE_ALREADY_EXISTS",
    409
  );

  const result = await uploadObjectsImage(
    imageRequest(id, { overwrite: true }),
    { OBJECTS_MEDIA: bucket },
    async () => "token",
    id,
    depsFor(id, bucket, { current })
  );
  assert.equal(result.ok, true);
  assert.equal(bucket.data.has(oldProcessedKey), false);
  assert.equal(bucket.data.has(oldThumbKey), false);
  assert.equal(bucket.data.size, 2);
});

test("real thumbnail pipeline outputs WebP", async () => {
  const result = await generateThumbnailWebp(PNG_1X1, 512);
  assert.equal(result.mime, "image/webp");
  assert.equal(result.width, 1);
  assert.equal(result.height, 1);
  assert.ok(result.bytes.byteLength > 12);
  const signature = new TextDecoder("ascii").decode(result.bytes.slice(8, 12));
  assert.equal(signature, "WEBP");
});

test("accepts the four existing canonical objeto_id values", () => {
  for (const id of KNOWN_IDS) assert.equal(normalizeObjectId(id), id);
});

test("rejects unauthenticated image upload requests", async () => {
  const id = KNOWN_IDS[0];
  const bucket = mockBucket();
  await rejectCode(
    uploadObjectsImage(
      imageRequest(id, { authenticated: false }),
      { OBJECTS_MEDIA: bucket },
      async () => "token",
      id,
      depsFor(id, bucket)
    ),
    "AUTH_REQUIRED",
    401
  );
  assert.equal(bucket.data.size, 0);
});
