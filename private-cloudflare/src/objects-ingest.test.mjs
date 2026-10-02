import assert from "node:assert/strict";
import test from "node:test";
import gateway from "./objects-ingest.js";

test("forwards canonical look render requests through the service binding", async () => {
  let forwarded = null;
  const env = {
    SEGUNDO_CEREBRO: {
      async fetch(request) {
        forwarded = request;
        return new Response(JSON.stringify({
          ok: true,
          look_id: "look-test",
          url: "/api/objects/look/look-test/image?v=version-1234"
        }), {
          status: 201,
          headers: { "content-type": "application/json" }
        });
      }
    }
  };

  const request = new Request(
    "https://objects-ingest.example.test/api/internal/objects/look/look-test/render",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer secret",
        "content-type": "application/json"
      },
      body: JSON.stringify({ look_id: "look-test", overwrite: false })
    }
  );

  const response = await gateway.fetch(request, env);
  assert.equal(response.status, 201);
  assert.ok(forwarded);
  assert.equal(
    new URL(forwarded.url).pathname,
    "/api/internal/objects/look/look-test/render"
  );
  assert.equal(forwarded.headers.get("authorization"), "Bearer secret");
  assert.deepEqual(await forwarded.json(), {
    look_id: "look-test",
    overwrite: false
  });
});
