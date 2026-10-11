import test from "node:test";
import assert from "node:assert/strict";
import {
  validTapoSdp, sameOriginTapoWrite, tapoRtcRoute,
  handleTapoRtcSignaling, tapoRtcLimits
} from "./tapo-rtc-signaling.js";

const description = {
  type: "offer",
  sdp: "v=0\r\no=- 123 456 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=fingerprint:sha-256 TEST-FAKE-FINGERPRINT\r\n"
};
const id = "550e8400-e29b-41d4-a716-446655440000";

test("SDP validator accepts bounded video descriptions and rejects invalid signals", () => {
  assert.equal(validTapoSdp(description, "offer"), true);
  assert.equal(validTapoSdp({ ...description, type: "answer" }, "answer"), true);
  for (const payload of [
    { ...description, type: "pranswer" },
    { ...description, sdp: "secret" },
    { ...description, sdp: description.sdp.replace("m=video", "m=audio") },
    { ...description, secret: "extra" },
    { ...description, sdp: description.sdp + "x".repeat(tapoRtcLimits.MAX_SDP_CHARS) }
  ]) assert.equal(validTapoSdp(payload, "offer"), false);
});

test("fixed route allowlist rejects id spoofing and unknown operations", () => {
  assert.deepEqual(tapoRtcRoute("/api/home/tapo/rtc", "POST"), { operation: "create" });
  assert.deepEqual(tapoRtcRoute("/api/home/tapo/rtc/" + id + "/poll", "GET"),
    { operation: "poll", sessionId: id });
  assert.deepEqual(tapoRtcRoute("/api/home/tapo/rtc/" + id + "/offer", "PUT"),
    { operation: "offer", sessionId: id });
  assert.equal(tapoRtcRoute("/api/home/tapo/rtc/" + id + "/offer", "GET"), null);
  assert.equal(tapoRtcRoute("/api/home/tapo/rtc/notanid/poll", "GET"), null);
  assert.equal(tapoRtcRoute("/api/home/tapo/rtc/" + id + "/reset", "POST"), null);
});

test("write operations demand exact same-origin browser request", () => {
  const req = (origin, site) => new Request("https://private.example/api/home/tapo/rtc", {
    method: "POST", headers: { ...(origin && { Origin: origin }), ...(site && { "Sec-Fetch-Site": site }) }
  });
  assert.equal(sameOriginTapoWrite(req("https://private.example", "same-origin")), true);
  assert.equal(sameOriginTapoWrite(req("https://private.example", "cross-site")), false);
  assert.equal(sameOriginTapoWrite(req("https://other.example", "same-origin")), false);
  assert.equal(sameOriginTapoWrite(req(null, "same-origin")), false);
});

test("signaling disabled by default even with DB available", async () => {
  const request = new Request("https://private.example/api/home/tapo/rtc", {
    method: "POST", headers: { Origin: "https://private.example" }
  });
  const response = await handleTapoRtcSignaling(request, { DB: {} });
  assert.equal(response.status, 404);
  assert.equal((await response.json()).code, "TAPO_RTC_DISABLED");
});

test("enabled signaling still blocks invalid origins before database access", async () => {
  const request = new Request("https://private.example/api/home/tapo/rtc", {
    method: "POST", headers: { Origin: "https://attacker.example" }
  });
  const response = await handleTapoRtcSignaling(request, { TAPO_RTC_EXPERIMENTAL: "true", DB: {} });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, "INVALID_ORIGIN");
});
