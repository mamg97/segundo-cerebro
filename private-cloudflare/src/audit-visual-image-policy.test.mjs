import assert from "node:assert/strict";
import test from "node:test";
import { isExternalAuditImageSource, isVerifiedAuditVisualImage } from "./audit-visual-image-policy.js";

const origin = "https://private.example.invalid";

test("cross-origin product images use browser load, not a CORS fetch", () => {
  const external = "https://images.example.invalid/products/fixture.jpg";
  assert.equal(isExternalAuditImageSource(external, origin), true);
  assert.equal(isExternalAuditImageSource("/api/health/recipes/fixture/image?v=1", origin), false);
  assert.equal(isExternalAuditImageSource("data:image/png;base64,AAAA", origin), false);
  assert.equal(isVerifiedAuditVisualImage({
    ok: true, decoded: true, verification: "BROWSER_IMAGE_LOAD",
    status: 0, width: 160, height: 90
  }, external, origin), true);
});

test("external images still fail if browser cannot load or decode them", () => {
  const external = "https://images.example.invalid/products/missing.jpg";
  for (const probe of [
    { ok: false, decoded: false, error: "ImageError", verification: "" },
    { ok: false, decoded: false, error: "TypeError" },
    { ok: true, decoded: false, verification: "BROWSER_IMAGE_LOAD", width: 0, height: 0 },
    { ok: true, decoded: true, verification: "BROWSER_IMAGE_LOAD", width: 0, height: 90 }
  ]) assert.equal(isVerifiedAuditVisualImage(probe, external, origin), false);
});

test("private image validation retains HTTP 200, image MIME and decode requirements", () => {
  const privateSrc = "/api/health/recipes/fixture/image?v=1";
  const good = { ok: true, status: 200, contentType: "image/jpeg", decoded: true };
  assert.equal(isVerifiedAuditVisualImage(good, privateSrc, origin), true);
  assert.equal(isVerifiedAuditVisualImage({ ...good, status: 502 }, privateSrc, origin), false);
  assert.equal(isVerifiedAuditVisualImage({ ...good, contentType: "text/html" }, privateSrc, origin), false);
  assert.equal(isVerifiedAuditVisualImage({ ...good, decoded: false }, privateSrc, origin), false);
  assert.equal(isVerifiedAuditVisualImage({
    ok: true, decoded: true, verification: "BROWSER_IMAGE_LOAD", width: 200, height: 100
  }, privateSrc, origin), false);
});
