import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const audit = readFileSync(new URL("../private-cloudflare/scripts/web-audit.mjs", import.meta.url), "utf8");

test("detail-dialog open box remains within viewport even at mobile widths", () => {
  const rule = css.match(/\.detail-dialog\[open\]\s*\{([^}]*)\}/)?.[1] || "";
  assert.match(rule, /box-sizing:\s*border-box/);
  assert.match(rule, /min-width:\s*0/);
  assert.match(rule, /max-width:\s*calc\(100vw - 16px\)/);
  assert.match(rule, /inset-inline:\s*0/);
  assert.match(rule, /margin-inline:\s*auto/);
});

test("visual browser audit retains its independent strict dialog geometry check", () => {
  assert.match(audit, /assessAuditDialogGeometry\(report\.dialogGeometry\)/);
  assert.match(audit, /document\.body\.classList\.contains\("route-area-active"\)/);
  assert.match(audit, /dialog\.classList\.contains\("travels-dialog"\)/);
  assert.match(audit, /assertCheck\(report\.proportions\.length === 0/);
  assert.match(audit, /DIALOG_WIDTH_OUT_OF_BOUNDS/);
});
