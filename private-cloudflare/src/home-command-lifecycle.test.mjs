import test from "node:test";
import assert from "node:assert/strict";
import { nextHomeCommandState, homeCommandDisplayStatus } from "./home-command-lifecycle.js";

const nowMs = Date.parse("2026-01-01T12:00:00Z");
const pending = {
  commandId: "550e8400-e29b-41d4-a716-446655440000",
  status: "pending",
  expiresAt: "2026-01-01T12:01:00.000Z"
};
const transition = (state, status, moment = nowMs) => nextHomeCommandState(state, status, { nowMs: moment });

test("command lifecycle separates sending, acceptance and observed execution", () => {
  const sent = transition(pending, "dispatched");
  assert.equal(sent.ok, true);
  const ack = transition(sent.state, "accepted");
  assert.equal(ack.ok, true);
  assert.match(homeCommandDisplayStatus(ack.state.status), /sin verificar/);
  const observed = transition(ack.state, "observed");
  assert.equal(observed.state.status, "observed");
});

test("duplicate event is idempotent but does not transmit another command", () => {
  const sent = transition(pending, "dispatched");
  assert.equal(transition(sent.state, "dispatched").unchanged, true);
  assert.equal(transition(sent.state, "pending").code, "HOME_TRANSITION_DENIED");
});

test("stale command may expire but can never be dispatched", () => {
  const late = nowMs + 120_000;
  assert.equal(transition(pending, "dispatched", late).code, "HOME_EXPIRED");
  assert.equal(transition(pending, "expired", late).state.status, "expired");
});

test("sent command does not expire or automatically replay after timeout", () => {
  const sent = transition(pending, "dispatched").state;
  assert.equal(transition(sent, "expired", nowMs + 120_000).code, "HOME_CANNOT_EXPIRE_SENT");
  assert.equal(transition(sent, "unknown", nowMs + 120_000).state.status, "unknown");
  assert.equal(transition({ ...sent, status: "unknown" }, "dispatched").code, "HOME_TRANSITION_DENIED");
});

test("an unknown result may be resolved only by observation or failure", () => {
  const unknown = { ...pending, status: "unknown" };
  assert.equal(transition(unknown, "observed").state.status, "observed");
  assert.equal(transition(unknown, "failed").state.status, "failed");
  assert.equal(transition(unknown, "accepted").code, "HOME_TRANSITION_DENIED");
});

test("receipt without dispatch, result mutation after terminal state, invalid input fail closed", () => {
  assert.equal(transition(pending, "accepted").code, "HOME_TRANSITION_DENIED");
  assert.equal(transition({ ...pending, status: "observed" }, "failed").code, "HOME_TRANSITION_DENIED");
  assert.equal(transition(null, "dispatched").code, "HOME_STATE_INVALID");
  assert.equal(transition(pending, "password_change").code, "HOME_EVENT_INVALID");
});
