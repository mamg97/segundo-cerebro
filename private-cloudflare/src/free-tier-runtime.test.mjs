import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("production Worker has no legacy per-minute Objects staging cron", () => {
  const config=JSON.parse(fs.readFileSync(new URL("../wrangler.bootstrap.jsonc", import.meta.url),"utf8"));
  const crons=Array.isArray(config?.triggers?.crons) ? config.triggers.crons : [];
  assert.equal(crons.includes("* * * * *"),false);
});

test("production Worker no longer registers the legacy staging scheduled handler", () => {
  const source=fs.readFileSync(new URL("./index.js", import.meta.url),"utf8");
  assert.equal(source.includes("processObjectsImageQueue"),false);
  assert.equal(/async\s+scheduled\s*\(/.test(source),false);
});
