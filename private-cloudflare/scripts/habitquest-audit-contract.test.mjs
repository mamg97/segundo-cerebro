import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const code = readFileSync(new URL("./web-audit.mjs", import.meta.url), "utf8");

test("HabitQuest authenticates a canonical read before long-running visual traversal", () => {
  const start = code.indexOf('const habitQuestProbe = await probeApi("/api/habits"');
  const visualArea = code.indexOf('} else if (areaId === "area-habits")');
  const otherDomain = code.indexOf('const nutrition = await api("/api/nutrition")');
  assert.ok(start > 0 && otherDomain > start && visualArea > start);
  assert.match(code, /habitQuestProbe\.body\?\.source\?\.title === "HabitQuest Data"/);
  assert.match(code, /Array\.isArray\(habitQuestProbe\.body\?\.habits\)/);
  assert.match(code, /Array\.isArray\(habitQuestProbe\.body\?\.todayHabits\)/);
});

test("status is machine readable and never includes private habit data", () => {
  const begin = code.indexOf("const habitQuestProbe =");
  const end = code.indexOf("if (health.body?.ok)", begin);
  const block = code.slice(begin, end);
  assert.match(block, /\[HABITQUEST_SMOKE\]/);
  assert.match(block, /"PASS"/);
  assert.match(block, /"FAIL_HTTP_"/);
  assert.doesNotMatch(block, /JSON\.stringify\(habitQuestProbe\.body\)/);
  assert.doesNotMatch(block, /console\.log\([^\n]*(?:\.habits|\.todayHabits|\.source)/);
});
