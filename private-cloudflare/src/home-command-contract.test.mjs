import test from "node:test";
import assert from "node:assert/strict";
import { HOME_ROBOT_ACTIONS, homeTransportApproved, validateHomeRobotCommand } from "./home-command-contract.js";

const nowMs = Date.parse("2026-01-01T12:00:00Z");
const valid = {
  command_id: "550e8400-e29b-41d4-a716-446655440000",
  device_id: "vacuum_demo",
  action: "return_home",
  created_at: "2026-01-01T11:59:55Z",
  expires_at: "2026-01-01T12:01:00Z"
};
const trusted = {
  nowMs, enabled: true, trustedActor: true, transportApproved: true,
  allowedDeviceIds: ["vacuum_demo"], allowedRoomIds: ["room_demo_1", "room_demo_2"]
};
const check = (cmd = valid, options = trusted) => validateHomeRobotCommand(cmd, options);

test("transport is denied by default or without every safety condition", () => {
  assert.equal(homeTransportApproved(), false);
  const secure = { enabled: true, encrypted: true, serverIdentityVerified: true, protocolVerified: true };
  for (const key of Object.keys(secure)) {
    assert.equal(homeTransportApproved({ ...secure, [key]: false }), false);
  }
  assert.equal(homeTransportApproved(secure), true);
});

test("execution is denied until independently authorized by backend", () => {
  for (const key of ["enabled", "trustedActor", "transportApproved"]) {
    assert.equal(check(valid, { ...trusted, [key]: false }).code, "HOME_DISABLED");
  }
  assert.equal(check(valid, {}).code, "HOME_DISABLED");
});

test("accepts known actions for authorized device only", () => {
  for (const action of HOME_ROBOT_ACTIONS.filter((value) => value !== "clean_rooms")) {
    const result = check({ ...valid, action });
    assert.equal(result.ok, true, action);
    assert.equal(result.command.action, action);
  }
  assert.equal(check({ ...valid, action: "delete_all" }).code, "HOME_ACTION_DENIED");
  assert.equal(check({ ...valid, device_id: "someone_else" }).code, "HOME_DEVICE_DENIED");
});

test("validates room allowlist; rejects unknown and duplicate rooms", () => {
  const c = { ...valid, action: "clean_rooms", room_ids: ["room_demo_1", "room_demo_2"] };
  assert.deepEqual(check(c).command.roomIds, ["room_demo_1", "room_demo_2"]);
  assert.equal(check({ ...c, room_ids: ["room_demo_1", "room_demo_1"] }).code, "HOME_ROOMS_DENIED");
  assert.equal(check({ ...c, room_ids: ["room_unknown"] }).code, "HOME_ROOMS_DENIED");
  assert.equal(check({ ...valid, room_ids: [] }).code, "HOME_INVALID_FIELDS");
});

test("rejects malformed IDs, extra fields, stale commands and invalid clocks", () => {
  assert.equal(check({ ...valid, command_id: "not-a-uuid" }).code, "HOME_INVALID_ID");
  assert.equal(check({ ...valid, extra: "secret" }).code, "HOME_INVALID_FIELDS");
  assert.equal(check({ ...valid, expires_at: "2026-01-01T12:00:00Z" }).code, "HOME_EXPIRED");
  assert.equal(check({ ...valid, created_at: "2026-01-01T12:00:10Z" }).code, "HOME_EXPIRED");
  assert.equal(check({ ...valid, expires_at: "2026-01-01T12:04:00Z" }).code, "HOME_EXPIRED");
  assert.equal(check({ ...valid, created_at: "tomorrow" }).code, "HOME_INVALID_TIME");
  assert.equal(check({ ...valid, command_id: "a".repeat(200) }).code, "HOME_INVALID_ID");
});

test("does not inspect payload before denying disabled operations", () => {
  const payload = { device_id: "secret-device", extra: "password", action: "start_cleaning" };
  assert.deepEqual(check(payload, { nowMs }), { ok: false, code: "HOME_DISABLED" });
});
