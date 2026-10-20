import test from "node:test";
import assert from "node:assert/strict";
import { decodeLookSheetPreview, serveObjectsLookSheetPreview } from "./look-sheet-media.js";

test("LookMedia preview accepts a compact private WebP with valid signature", () => {
  const bytes = Buffer.from("RIFF\\0\\0\\0\\0WEBPVP8 ", "binary");
  const preview = decodeLookSheetPreview({
    mime_type: "image/webp", base64_preview: bytes.toString("base64")
  });
  assert.equal(preview.mime, "image/webp");
  assert.deepEqual(Buffer.from(preview.bytes), bytes);
});

test("LookMedia rejects MIME mismatch, malformed previews and oversized base64", () => {
  const image = Buffer.from("RIFF\\0\\0\\0\\0WEBPVP8 ", "binary").toString("base64");
  assert.throws(() => decodeLookSheetPreview({mime_type:"text/html",base64_preview:image}), /MIME/);
  assert.throws(() => decodeLookSheetPreview({mime_type:"image/png",base64_preview:image}), /SIGNATURE/);
  assert.throws(() => decodeLookSheetPreview({mime_type:"image/webp",base64_preview:"@@"}), /PREVIEW/);
  assert.throws(() => decodeLookSheetPreview({mime_type:"image/webp",base64_preview:"A".repeat(49_001)}), /PREVIEW/);
});

test("LookMedia read rejects non-sheet versions without making network requests", async () => {
  const response = await serveObjectsLookSheetPreview({}, async () => {
    throw new Error("NETWORK_MUST_NOT_BE_CALLED");
  }, "look-example", "d1-legacy-version");
  assert.equal(response, null);
});
