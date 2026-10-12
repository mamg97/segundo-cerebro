import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { safeAuditLog, safeAuditDiagnosticCode, safeAuditNetworkFailureCode, safeAuditBrowserFailureCode, safeAuditFinanceStructureCode } from "./audit-log-policy.mjs";

const auditor = fs.readFileSync(new URL("./web-audit.mjs", import.meta.url), "utf8");

test("public log lines are codes, never DOM text, email, token, URL or private payload", () => {
  const payload = [
    "Finanzas", "persona@example.com", "Bearer verySecretToken",
    "https://some-private-host.invalid?token=secret", "12.345,67 EUR",
    "receta privada", "fecha 2026-10-09", "id-privado-123"
  ].join(" · ");
  for (const kind of ["PASS", "FAIL", "INFO"]) {
    const line = safeAuditLog(kind, 7, payload, payload);
    assert.match(line, /^\[(PASS|FAIL|INFO)\] (FINANCE|OTHER) CHECK-00007$/);
    for (const secret of ["example.com", "verySecretToken", "private-host", "12.345", "receta privada", "id-privado"]) {
      assert.equal(line.includes(secret), false);
    }
  }
});

test("untrusted failure names do not appear even in summary and error paths", () => {
  assert.match(auditor, /safeAuditLog\("PASS"/);
  assert.match(auditor, /safeAuditLog\("FAIL"/);
  assert.match(auditor, /safeAuditLog\("INFO"/);
  assert.doesNotMatch(auditor, /console\.(?:log|error)\(\`\[(?:PASS|FAIL|INFO)\] \$\{name\}/);
  assert.doesNotMatch(auditor, /\[AUDIT_FAILED\].*failures\.map/);
  assert.match(auditor, /\[AUDIT_FAILED\] failures=/);
});


test("diagnostic labels are fixed allowlisted codes with no private identifiers", () => {
  assert.equal(
    safeAuditDiagnosticCode("Finanzas · movimientos por cuenta · pestaña cuenta-secreta-123 activa"),
    "FINANCE_TAB_ACTIVE"
  );
  assert.equal(
    safeAuditDiagnosticCode("Finanzas · movimientos por cuenta · panel cuenta-secreta-123 visible"),
    "FINANCE_TAB_PANEL"
  );
  assert.equal(safeAuditDiagnosticCode("Home · Regalos ocupa el hueco bajo Obligaciones sin solape"), "HOME_GIFTS_GAP");
  assert.equal(safeAuditDiagnosticCode("persona@example.com información confidencial"), "CHECK_UNMAPPED");
  assert.equal(safeAuditNetworkFailureCode("http502:/api/health/overview"), "HEALTH_OVERVIEW_HTTP_502");
  assert.equal(safeAuditNetworkFailureCode("http502:/api/health/adherence"), "HEALTH_ADHERENCE_HTTP_502");
  assert.equal(safeAuditNetworkFailureCode("http502:/api/health/history"), "HEALTH_HISTORY_HTTP_502");
  assert.equal(safeAuditNetworkFailureCode("http502:/api/health/vision"), "HEALTH_VISION_HTTP_502");
  assert.equal(safeAuditNetworkFailureCode("http502:/api/health/appointments"), "HEALTH_APPOINTMENTS_HTTP_502");
  assert.equal(safeAuditNetworkFailureCode("http502:/api/health/recipes/private-recipe-id/image"), "HEALTH_RECIPE_IMAGE_HTTP_502");
  assert.equal(safeAuditNetworkFailureCode("http502:/api/health/recipes/private-recipe-id"), "HEALTH_RECIPES_HTTP_502");
  assert.equal(safeAuditNetworkFailureCode("http502:/api/health"), "HEALTH_ROOT_HTTP_502");
  assert.equal(safeAuditNetworkFailureCode("requestfailed:/api/health/recipes/private-recipe-id/image:net::ERR_FAILED"), "HEALTH_RECIPE_IMAGE_ERR_FAILED");
  const safeCode = safeAuditNetworkFailureCode("http502:/api/health/recipes/person@example.com/image");
  for (const fragment of ["person", "example.com", "image/"]) assert.equal(safeCode.includes(fragment), false);

  assert.equal(safeAuditNetworkFailureCode("requestfailed:/api/objects/look/id-privado-123/image:net::ERR_FAILED"), "LOOK_IMAGE_ERR_FAILED");
  assert.equal(safeAuditNetworkFailureCode("http502:/api/source/secret-123"), "UNMAPPED_HTTP_502");
  assert.equal(safeAuditBrowserFailureCode("pageerror:TypeError: patient@example.com https://private.invalid/path"), "PAGEERROR_TYPEERROR");
  assert.equal(safeAuditBrowserFailureCode("console:private token 123"), "CONSOLE_OTHER");
  const texts=[
    safeAuditDiagnosticCode("Finanzas · movimientos por cuenta · pestaña cuenta-secreta-123 activa"),
    safeAuditNetworkFailureCode("http502:/api/objects/look/id-privado-123/image")
  ].join(" ");
  assert.equal(/(secreta|privado-123|example.com)/.test(texts),false);
});

test("audit emits only diagnostic codes, not raw network or failure details", () => {
  assert.match(auditor, /safeAuditDiagnosticCode\(name\)/);
  assert.match(auditor, /safeAuditNetworkFailureCode\(entry\)/);
  assert.match(auditor, /\[AUDIT_NETWORK_DIAG\]/);
  assert.match(auditor, /safeAuditBrowserFailureCode\(entry\)/);
  assert.match(auditor, /\[AUDIT_BROWSER_DIAG\]/);
  assert.match(auditor, /await page.waitForFunction\(\(accountId\) =>/);
  assert.match(auditor, /!panel.hidden && panel.classList.contains\("active"\)/);
});

test("dialog cleanup cannot block traversal and the close button is still checked", () => {
  const cleanup = auditor.match(/async function closeDialogIfOpen\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(cleanup, /dialog\.evaluate\(\(node\) => node\.close\(\)\)/);
  assert.doesNotMatch(cleanup, /#close-dialog/);
  assert.match(auditor, /page\.locator\("#close-dialog"\)\.click\(\{ timeout: 5000 \}\)/);
  assert.match(auditor, /Carrera · diálogo se cierra con botón/);
});


test("finance state diagnostics expose only boolean-derived fixed codes",()=>{
  assert.equal(safeAuditFinanceStructureCode(null),"FINANCE_DOM_UNKNOWN");
  assert.equal(safeAuditFinanceStructureCode({dialogOpen:false}),"FINANCE_DIALOG_CLOSED");
  assert.equal(safeAuditFinanceStructureCode({dialogOpen:true,financeDialog:false}),"FINANCE_DIALOG_REPLACED");
  const base={dialogOpen:true,financeDialog:true,workspacePresent:true,tabsShrunk:false,tabPresent:true,tabSelected:true,panelVisible:true};
  assert.equal(safeAuditFinanceStructureCode({...base,tabsShrunk:true}),"FINANCE_TAB_CATALOG_SHRUNK");
  assert.equal(safeAuditFinanceStructureCode({...base,tabPresent:false}),"FINANCE_TAB_NOT_FOUND");
  assert.equal(safeAuditFinanceStructureCode({...base,tabSelected:false}),"FINANCE_TAB_NOT_SELECTED");
  assert.equal(safeAuditFinanceStructureCode({...base,panelVisible:false}),"FINANCE_PANEL_HIDDEN");
  assert.equal(safeAuditFinanceStructureCode({...base,secret:"sensitive-account-id",email:"private@example.com"}),"FINANCE_DOM_STABLE");
  assert.match(auditor, /emitFinanceDomDiagnostic\(value, initialFinanceTabCount\)/);
  assert.doesNotMatch(auditor, /console\.(?:error|log)\([^)]*accountId\)/);
});

test("Health and visual failures expose actionable fixed codes, never private labels", () => {
  assert.equal(safeAuditDiagnosticCode("Salud · Gym inventario coincide con las variantes GIF vigentes"), "HEALTH_GYM_GIF_INVENTORY");
  assert.equal(safeAuditDiagnosticCode("Salud · API expone histórico de balance calórico de 30 días"), "HEALTH_CALORIE_HISTORY");
  assert.equal(safeAuditDiagnosticCode("Salud · Resumen weight coincide con Home"), "HEALTH_OVERVIEW_PARITY_WEIGHT");
  assert.equal(safeAuditDiagnosticCode("Salud · Resumen patient@example.com coincide con Home"), "CHECK_UNMAPPED");
  const safe = safeAuditDiagnosticCode("Visual mobile usuario@example.com · imágenes cargadas");
  assert.equal(safe, "VISUAL_IMAGES_FAILED");
  assert.doesNotMatch(safe, /usuario|example/);
  assert.match(auditor, /sheetLink\.waitFor\(\{ state: "visible", timeout: 16000 \}\)/);
  assert.match(auditor, /timeout: 16000/);
});
