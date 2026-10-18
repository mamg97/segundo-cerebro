import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolvePantrySpreadsheetId } from "./pantry.js";

test("Pantry sheet resolver requires the token-provider callback", async () => {
  const env = {
    GOOGLE_CLIENT_ID: "synthetic",
    GOOGLE_CLIENT_SECRET: "synthetic",
    GOOGLE_REFRESH_TOKEN: "synthetic",
    PANTRY_SHEET_ID: "synthetic-pantry-id"
  };
  const id = await resolvePantrySpreadsheetId(env, async (passed) => {
    assert.strictEqual(passed, env);
    return "synthetic-google-token";
  });
  assert.equal(id, "synthetic-pantry-id");
  await assert.rejects(() => resolvePantrySpreadsheetId(env, "token-string"), TypeError);
});

test("lightweight menu never passes an access-token string to the Pantry resolver", () => {
  const worker = readFileSync(new URL("./index.js", import.meta.url), "utf8");
  assert.doesNotMatch(worker, /resolvePantrySpreadsheetId\(env,\s*token\s*\)/);
  assert.match(worker, /resolvePantrySpreadsheetId\(env,\s*async\s*\(\)\s*=>\s*token\s*\)/);
});
