import assert from "node:assert/strict";
import test from "node:test";
import { createObjectsDriveMediaStore, OBJECTS_DRIVE_MEDIA } from "./objects-media-drive.js";

const KEY = "objects/obj-shirt-example-001/processed/12345678-abcd";
const PNG = new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);

test("Drive media store keeps object assets private behind the canonical storage contract", async () => {
  const calls = [];
  const folderId = "1FolderObjectsMedia12345";
  const fileId = "1ObjectMediaFile123456";
  let mediaCreated = false;

  const fakeFetch = async (input, init = {}) => {
    const url = String(input);
    const method = init.method || "GET";
    calls.push({ url, method, headers: init.headers || {}, body: init.body || null });

    if (url.startsWith("https://www.googleapis.com/drive/v3/files?")) {
      const q = new URL(url).searchParams.get("q") || "";
      if (q.includes(OBJECTS_DRIVE_MEDIA.folderName)) {
        return new Response(JSON.stringify({
          files: [{ id: folderId, name: OBJECTS_DRIVE_MEDIA.folderName, mimeType: "application/vnd.google-apps.folder", trashed: false }]
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (q.includes("objects-media__obj-shirt-example-001__processed__12345678-abcd")) {
        return new Response(JSON.stringify({
          files: mediaCreated
            ? [{ id: fileId, name: "objects-media__obj-shirt-example-001__processed__12345678-abcd", mimeType: "image/png", size: "8", md5Checksum: "abc123", trashed: false }]
            : []
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
    }

    if (url.startsWith("https://www.googleapis.com/upload/drive/v3/files?")) {
      assert.equal(method, "POST");
      assert.match(String(init.headers["Content-Type"]), /^multipart\/related; boundary=/);
      const bodyText = new TextDecoder().decode(init.body);
      assert.match(bodyText, /objects-media__obj-shirt-example-001__processed__12345678-abcd/);
      assert.match(bodyText, /"segundoCerebroRole":"objects-media"/);
      mediaCreated = true;
      return new Response(JSON.stringify({
        id: fileId,
        name: "objects-media__obj-shirt-example-001__processed__12345678-abcd",
        mimeType: "image/png",
        size: "8",
        md5Checksum: "abc123"
      }), { status: 200, headers: { "content-type": "application/json" } });
    }

    if (url === "https://www.googleapis.com/drive/v3/files/" + fileId + "?alt=media") {
      return new Response(PNG, {
        status: 200,
        headers: { "content-type": "image/png", etag: "\"drive-etag\"" }
      });
    }

    if (url === "https://www.googleapis.com/drive/v3/files/" + fileId && method === "DELETE") {
      mediaCreated = false;
      return new Response(null, { status: 204 });
    }

    throw new Error("Unexpected fetch " + method + " " + url);
  };

  const store = createObjectsDriveMediaStore(
    {},
    async () => "google-token",
    { fetch: fakeFetch }
  );

  await store.put(KEY, PNG, {
    httpMetadata: { contentType: "image/png" },
    customMetadata: { objetoId: "obj-shirt-example-001", imageType: "processed" }
  });

  const object = await store.get(KEY);
  assert.ok(object);
  assert.equal(object.httpMetadata.contentType, "image/png");
  assert.equal(object.httpEtag, "\"drive-etag\"");
  const downloaded = new Uint8Array(await new Response(object.body).arrayBuffer());
  assert.deepEqual(downloaded, PNG);

  await store.delete(KEY);
  assert.equal(mediaCreated, false);
  assert.ok(calls.some((call) => call.url.includes("upload/drive/v3/files")));
  assert.ok(calls.some((call) => call.method === "DELETE"));
});

test("Drive media store returns null for a missing canonical asset", async () => {
  const fakeFetch = async (input) => {
    const url = String(input);
    if (url.startsWith("https://www.googleapis.com/drive/v3/files?")) {
      const q = new URL(url).searchParams.get("q") || "";
      if (q.includes(OBJECTS_DRIVE_MEDIA.folderName)) {
        return new Response(JSON.stringify({
          files: [{ id: "1FolderObjectsMedia12345", name: OBJECTS_DRIVE_MEDIA.folderName, mimeType: "application/vnd.google-apps.folder" }]
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ files: [] }), { status: 200 });
    }
    throw new Error("Unexpected fetch " + url);
  };

  const store = createObjectsDriveMediaStore({}, async () => "token", { fetch: fakeFetch });
  assert.equal(await store.get(KEY), null);
});
