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


function fakeD1() {
  const sessions = new Map();
  return {
    sessions,
    prepare(sql) {
      let args = [];
      const self = this;
      return {
        bind(...values) { args = values; return this; },
        async first() {
          if (sql.startsWith("SELECT COUNT(*)")) {
            return { total: [...sessions.values()].filter(r => r.expires_at > args[0]).length };
          }
          if (sql.startsWith("SELECT presenter_hash")) {
            const r = sessions.get(args[0]);
            return r && r.expires_at > args[1] ? { ...r } : null;
          }
          throw new Error("Unexpected mock SELECT");
        },
        async run() {
          if (sql.startsWith("CREATE TABLE")) return { meta: { changes: 0 } };
          if (sql.startsWith("INSERT INTO")) {
            const [id, presenter_hash, viewer_hash, created_at, expires_at] = args;
            if (sessions.has(id)) throw new Error("Duplicate");
            sessions.set(id, { presenter_hash, viewer_hash, created_at, expires_at, offer: null, answer: null });
            return { meta: { changes: 1 } };
          }
          if (sql.startsWith("UPDATE")) {
            const [text, id, now] = args;
            const row = sessions.get(id);
            const col = sql.includes("SET offer =") ? "offer" : "answer";
            if (row && row.expires_at > now && row[col] === null) {
              row[col] = text;
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }
          if (sql.startsWith("DELETE FROM") && sql.includes("expires_at")) {
            for (const [id, row] of sessions) if (row.expires_at <= args[0]) sessions.delete(id);
            return { meta: { changes: 0 } };
          }
          if (sql.startsWith("DELETE FROM") && sql.includes("presenter_hash")) {
            const row = sessions.get(args[0]);
            if (row?.presenter_hash === args[1]) sessions.delete(args[0]);
            return { meta: { changes: 1 } };
          }
          throw new Error("Unexpected mock SQL");
        }
      };
    }
  };
}

test("end-to-end signaling isolates capabilities, one-time offers and keeps media out of DB", async () => {
  const now = Date.parse("2026-10-11T12:00:00Z");
  const DB = fakeD1();
  const env = { TAPO_RTC_EXPERIMENTAL: "true", DB };
  const url = "https://private.example/api/home/tapo/rtc";
  const make = (method, suffix, key, body) => new Request(url + suffix, {
    method,
    headers: {
      ...(method === "GET" ? {} : { Origin: "https://private.example" }),
      ...(key ? { "X-Tapo-Session-Key": key } : {}),
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const call = async (method, suffix = "", key, body, moment = now) => {
    const res = await handleTapoRtcSignaling(make(method, suffix, key, body), env, moment);
    return { status: res.status, data: await res.json() };
  };

  const newRoom = await call("POST");
  assert.equal(newRoom.status, 201);
  const { sessionId, presenterKey, viewerKey } = newRoom.data;
  assert.equal(presenterKey.length, 64);
  assert.equal(viewerKey.length, 64);
  const suffix = "/" + sessionId;
  assert.equal(DB.sessions.size, 1);

  assert.equal((await call("GET", suffix + "/poll", "not-a-key")).status, 403);
  assert.equal((await call("PUT", suffix + "/offer", viewerKey, description)).status, 403);
  assert.equal((await call("PUT", suffix + "/answer", viewerKey, { ...description, type: "answer" })).status, 409);
  assert.equal((await call("PUT", suffix + "/offer", presenterKey, description)).status, 201);
  assert.equal((await call("PUT", suffix + "/offer", presenterKey, description)).status, 409);
  const seenByViewer = await call("GET", suffix + "/poll", viewerKey);
  assert.equal(seenByViewer.data.type, "offer");
  assert.deepEqual(seenByViewer.data.description, description);
  const beforeAnswer = await call("GET", suffix + "/poll", presenterKey);
  assert.equal(beforeAnswer.data.description, null);

  assert.equal((await call("PUT", suffix + "/answer", viewerKey, { ...description, type: "answer" })).status, 201);
  const seenBySender = await call("GET", suffix + "/poll", presenterKey);
  assert.equal(seenBySender.data.type, "answer");
  assert.equal(seenBySender.data.description.type, "answer");

  const stored = DB.sessions.get(sessionId);
  assert.equal(Object.keys(stored).some(k => /frame|video|audio|image/i.test(k)), false);
  assert.equal(stored.presenter_hash.includes(presenterKey), false);
  assert.equal(stored.viewer_hash.includes(viewerKey), false);
  assert.equal((await call("DELETE", suffix, viewerKey)).status, 403);
  assert.equal((await call("DELETE", suffix, presenterKey)).status, 200);
  assert.equal(DB.sessions.size, 0);
});

test("expired signaling sessions cannot be resumed with an old viewer key", async () => {
  const now = Date.parse("2026-10-11T12:00:00Z");
  const DB = fakeD1();
  const env = { TAPO_RTC_EXPERIMENTAL: "true", DB };
  const create = new Request("https://private.example/api/home/tapo/rtc", {
    method: "POST", headers: { Origin: "https://private.example" }
  });
  const r = await handleTapoRtcSignaling(create, env, now);
  const { sessionId, viewerKey } = await r.json();
  const poll = new Request("https://private.example/api/home/tapo/rtc/" + sessionId + "/poll", {
    headers: { "X-Tapo-Session-Key": viewerKey }
  });
  const expired = await handleTapoRtcSignaling(poll, env, now + tapoRtcLimits.SESSION_TTL_MS);
  assert.equal(expired.status, 403);
});
