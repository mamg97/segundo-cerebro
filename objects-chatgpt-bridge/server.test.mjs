import assert from "node:assert/strict";
import test from "node:test";
import { handleRequest } from "./server.mjs";

const ENV = {
  CHATGPT_ACTION_API_KEY: "action-key",
  OBJECTS_UPSTREAM_SECRET: "upstream-secret",
  SEGUNDO_CEREBRO_BASE_URL: "https://brain.example.test",
  OPENAI_FILE_HOST_SUFFIXES: ".oaiusercontent.com"
};

function actionRequest(body, key = "action-key") {
  return new Request("https://bridge.example.test/ingest-object-image", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + key,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

function payload(overrides = {}) {
  return {
    objeto_id: "obj-shirt-scalpers-skyblue-001",
    image_type: "processed",
    openaiFileIdRefs: [{
      name: "shirt.png",
      id: "file-test",
      mime_type: "image/png",
      download_link: "https://files.oaiusercontent.com/signed/test"
    }],
    vista_prenda: "frontal",
    color_principal: "celeste",
    patron: "liso",
    categoria_visual: "camisa",
    capa: "superior",
    ...overrides
  };
}

test("rejects unauthenticated requests", async () => {
  const response = await handleRequest(actionRequest(payload(), "wrong"), ENV, async () => {
    throw new Error("should not fetch");
  });
  assert.equal(response.status, 401);
});

test("rejects arbitrary external file URLs", async () => {
  const response = await handleRequest(actionRequest(payload({
    openaiFileIdRefs: [{
      name: "shirt.png",
      id: "file-test",
      mime_type: "image/png",
      download_link: "https://evil.example/image.png"
    }]
  })), ENV, async () => {
    throw new Error("should not fetch");
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "FILE_HOST_NOT_ALLOWED");
});

test("downloads the ChatGPT file reference and forwards multipart to the canonical endpoint", async () => {
  const calls = [];
  const fakeFetch = async (input, init = {}) => {
    calls.push({ input: String(input), init });
    if (String(input).startsWith("https://files.oaiusercontent.com/")) {
      return new Response(new Uint8Array([0x89,0x50,0x4e,0x47,1,2,3]), {
        status: 200,
        headers: { "content-type": "image/png", "content-length": "7" }
      });
    }
    assert.equal(String(input), "https://brain.example.test/api/internal/objects/obj-shirt-scalpers-skyblue-001/image");
    assert.equal(init.headers.Authorization, "Bearer upstream-secret");
    assert.ok(init.body instanceof FormData);
    assert.equal(init.body.get("objeto_id"), "obj-shirt-scalpers-skyblue-001");
    assert.equal(init.body.get("image_type"), "processed");
    assert.equal(init.body.get("capa"), "superior");
    const file = init.body.get("image");
    assert.equal(file.type, "image/png");
    return new Response(JSON.stringify({
      ok: true,
      objeto_id: "obj-shirt-scalpers-skyblue-001",
      image_type: "processed",
      url: "/api/objects/obj-shirt-scalpers-skyblue-001/image/processed?v=version-1234",
      thumbnail_url: "/api/objects/obj-shirt-scalpers-skyblue-001/image/thumbnail?v=version-1234",
      estado_procesado: "procesada",
      updated_at: "2026-09-30T10:00:00.000Z"
    }), { status: 201, headers: { "content-type": "application/json" } });
  };
  const response = await handleRequest(actionRequest(payload()), ENV, fakeFetch);
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.foto_procesada_url.includes("processed"), true);
  assert.equal(body.miniatura_url.includes("thumbnail"), true);
  assert.equal(body.version, "version-1234");
  assert.equal(calls.length, 2);
});

test("propagates canonical ingest errors without marking success", async () => {
  const fakeFetch = async (input) => {
    if (String(input).startsWith("https://files.oaiusercontent.com/")) {
      return new Response(new Uint8Array([1,2,3]), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: false, code: "OBJECTS_MEDIA_NOT_CONFIGURED" }), {
      status: 503,
      headers: { "content-type": "application/json" }
    });
  };
  const response = await handleRequest(actionRequest(payload()), ENV, fakeFetch);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, code: "OBJECTS_MEDIA_NOT_CONFIGURED" });
});


test("renders an existing look without external file staging", async () => {
  const calls = [];
  const request = new Request("https://bridge.example.test/render-look-image", {
    method: "POST",
    headers: {
      Authorization: "Bearer action-key",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      look_id: "look-curated-office-blue-beige-001",
      overwrite: false
    })
  });

  const fakeFetch = async (input, init = {}) => {
    calls.push({ input: String(input), init });
    assert.equal(
      String(input),
      "https://brain.example.test/api/internal/objects/look/look-curated-office-blue-beige-001/render"
    );
    assert.equal(init.headers.Authorization, "Bearer upstream-secret");
    assert.equal(init.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(init.body), {
      look_id: "look-curated-office-blue-beige-001",
      overwrite: false
    });
    return new Response(JSON.stringify({
      ok: true,
      look_id: "look-curated-office-blue-beige-001",
      url: "/api/objects/look/look-curated-office-blue-beige-001/image?v=version-5678",
      version: "version-5678",
      render_source: "canonical-wardrobe",
      item_count: 3,
      updated_at: "2026-10-02T09:10:00.000Z"
    }), { status: 201, headers: { "content-type": "application/json" } });
  };

  const response = await handleRequest(request, ENV, fakeFetch);
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.look_id, "look-curated-office-blue-beige-001");
  assert.equal(body.foto_url.includes("/api/objects/look/"), true);
  assert.equal(body.render_source, "canonical-wardrobe");
  assert.equal(body.item_count, 3);
  assert.equal(calls.length, 1);
});
