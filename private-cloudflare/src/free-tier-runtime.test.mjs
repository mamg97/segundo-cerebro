import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("production Worker has no legacy per-minute Objects staging cron", () => {
  const config=JSON.parse(fs.readFileSync(new URL("../wrangler.bootstrap.jsonc", import.meta.url),"utf8"));
  const crons=Array.isArray(config?.triggers?.crons) ? config.triggers.crons : [];
  assert.equal(crons.includes("* * * * *"),false);
});

test("production Worker allows only bounded 30-minute menu-shopping cron, never legacy staging work", () => {
  const source=fs.readFileSync(new URL("./index.js", import.meta.url),"utf8");
  const config=JSON.parse(fs.readFileSync(new URL("../wrangler.bootstrap.jsonc", import.meta.url),"utf8"));
  assert.equal(source.includes("processObjectsImageQueue"),false);
  assert.deepEqual(config.triggers.crons,["*/30 * * * *"]);
  assert.match(source,/async scheduled\(_controller, env, ctx\)/);
  assert.match(source,/reconcileMenuShopping\(env,getGoogleAccessToken,\{limit:25\}\)/);
  assert.doesNotMatch(source,/await processObjectsImageQueue/);
});
