import assert from "node:assert/strict";
import test from "node:test";
import { renderObjectsLookImage } from "./look-images.js";

function request(body = {}) {
  return new Request("https://brain.example.test/api/internal/objects/look/look-test/render", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function source(items) {
  const version = (name) => "version-" + name + "-1234";
  return {
    status: "ok-live",
    value: {
      looks: [{
        id: "look-test",
        name: "Look test",
        items
      }],
      wardrobe: [
        {
          objectId: "obj-top",
          thumbnailUrl: "/api/objects/obj-top/image/thumbnail?v=" + version("top")
        },
        {
          objectId: "obj-bottom",
          thumbnailUrl: "/api/objects/obj-bottom/image/thumbnail?v=" + version("bottom")
        },
        {
          objectId: "obj-shoes",
          thumbnailUrl: "/api/objects/obj-shoes/image/thumbnail?v=" + version("shoes")
        }
      ]
    }
  };
}

function mediaStore() {
  const writes = [];
  return {
    writes,
    async get(key) {
      if (!key.includes("/thumbnail/")) return null;
      return {
        body: new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]),
        httpMetadata: { contentType: "image/webp" }
      };
    },
    async put(key, bytes, options) {
      writes.push({ key, bytes: new Uint8Array(bytes), options });
    },
    async delete() {}
  };
}

test("renders a self-contained look image from canonical wardrobe thumbnails", async () => {
  const store = mediaStore();
  let writtenUrl = null;
  const result = await renderObjectsLookImage(
    request({ look_id: "look-test", overwrite: false }),
    {},
    async () => "token",
    "look-test",
    {
      authenticated: true,
      mediaStore: store,
      fetchObjectsSummary: async () => source([
        { objectId: "obj-top", role: "superior" },
        { objectId: "obj-bottom", role: "inferior" },
        { objectId: "obj-shoes", role: "calzado" }
      ]),
      resolveObjectsSpreadsheetId: async () => "sheet",
      getLookRow: async () => ({
        rowNumber: 2,
        headerMap: new Map([["look_id", 0], ["foto_url", 2]]),
        row: ["look-test", "Look test", ""]
      }),
      writeLookPhoto: async (_sheet, _token, _row, url) => { writtenUrl = url; },
      invalidateObjectsCache: () => {}
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.render_source, "canonical-wardrobe");
  assert.equal(result.item_count, 3);
  assert.equal(result.url, writtenUrl);
  assert.equal(store.writes.length, 1);
  assert.equal(store.writes[0].options.httpMetadata.contentType, "image/svg+xml");

  const svg = new TextDecoder().decode(store.writes[0].bytes);
  assert.match(svg, /^<svg /);
  assert.equal((svg.match(/data:image\/webp;base64,/g) || []).length, 3);
  assert.match(svg, /fill="#f3f1ed"/);
  assert.equal(svg.includes("/api/objects/obj-"), false);
});

test("refuses to render a look missing a required visual role", async () => {
  const store = mediaStore();
  await assert.rejects(
    renderObjectsLookImage(
      request({ look_id: "look-test" }),
      {},
      async () => "token",
      "look-test",
      {
        authenticated: true,
        mediaStore: store,
        fetchObjectsSummary: async () => source([
          { objectId: "obj-top", role: "superior" },
          { objectId: "obj-bottom", role: "inferior" }
        ]),
        resolveObjectsSpreadsheetId: async () => "sheet",
        getLookRow: async () => ({
          rowNumber: 2,
          headerMap: new Map([["look_id", 0], ["foto_url", 2]]),
          row: ["look-test", "Look test", ""]
        }),
        writeLookPhoto: async () => {},
        invalidateObjectsCache: () => {}
      }
    ),
    (error) => error?.code === "LOOK_REQUIRED_ROLE_MISSING"
  );
});
