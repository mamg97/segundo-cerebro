import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { safeAuditLog, safeAuditDiagnosticCode, safeAuditCallsiteCode, safeAuditNetworkFailureCode, safeAuditBrowserFailureCode, safeAuditImageProbeCode, safeAuditConsoleLocationCode, safeAuditFinanceStructureCode, safeAuditExecutableFailureCode, safeAuditVisualOverlapCode } from "./audit-log-policy.mjs";

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

test("remaining image and console failures expose only bounded diagnostic families", () => {
  assert.equal(safeAuditImageProbeCode(null, ""), "NO_SOURCE");
  assert.equal(safeAuditImageProbeCode({ status: 0, error: "person@example.com" }, "/private/123"), "TRANSPORT_FAILURE");
  assert.equal(safeAuditImageProbeCode({ status: 502, error: "Bearer secret" }, "/private/123"), "HTTP_5XX");
  assert.equal(safeAuditImageProbeCode({ status: 403 }, "/private/123"), "HTTP_4XX");
  assert.equal(safeAuditImageProbeCode({ status: 200, contentType: "text/html", decoded: false }, "/private/123"), "INVALID_CONTENT_TYPE");
  assert.equal(safeAuditImageProbeCode({ status: 200, contentType: "image/jpeg", decoded: false }, "/private/123"), "DECODE_FAILED");
  const origin = "https://private.invalid";
  assert.equal(safeAuditConsoleLocationCode("https://private.invalid/app/app.js?token=secret", origin), "APP_ASSET");
  assert.equal(safeAuditConsoleLocationCode("https://private.invalid/api/private-record-123", origin), "API");
  assert.equal(safeAuditConsoleLocationCode("https://other.invalid/person@example.com", origin), "EXTERNAL");
  assert.equal(safeAuditConsoleLocationCode("not a url", origin), "NO_LOCATION");
  assert.match(auditor, /\[AUDIT_VISUAL_IMAGE_DIAG\]/);
  assert.match(auditor, /\[AUDIT_BROWSER_ORIGIN_DIAG\]/);
  for (const output of [
    safeAuditImageProbeCode({ status: 502, error: "secret" }, "/private/123"),
    safeAuditConsoleLocationCode("https://private.invalid/app/app.js?token=secret", origin)
  ]) assert.doesNotMatch(output, /secret|private|token|123/);
});

test("recipe photo audits share the strict decoded-image probe with visual checks", () => {
  const start = auditor.indexOf("for (const recipe of recipesWithPhotos) {");
  const end = auditor.indexOf('const recipeImages = panel.locator', start);
  assert.ok(start > 0 && end > start);
  const section = auditor.slice(start, end);
  assert.match(section, /await probeVisualImage\(recipe\.photoUrl\)/);
  assert.match(section, /probe\.ok &&/);
  assert.match(section, /probe\.decoded/);
  assert.doesNotMatch(section, /page\.evaluate\(async \(src\) =>/);
});

test("recipe browser audit compares active cards with active canonical rows and separately checks archive", () => {
  assert.match(auditor, /import \{ recipeCatalogItems \} from "\.\.\/\.\.\/app\/recipe-catalog-filter\.mjs"/);
  assert.match(auditor, /const activeRecipes = recipeCatalogItems\(canonicalRecipes, "", "", false\)/);
  assert.match(auditor, /const archivedRecipes = recipeCatalogItems\(canonicalRecipes, "", "", true\)/);
  assert.match(auditor, /activeRecipes\.length \+ archivedRecipes\.length === canonicalRecipes\.length/);
  assert.match(auditor, /photoOrder\.photoCount === visibleRecipesWithPhotos\.length/);
  assert.match(auditor, /const expectedMatches = activeRecipes\.filter/);
  assert.match(auditor, /const firstCanonicalRecipe = activeRecipes\[0\]\?\.id/);
  assert.match(auditor, /Recetas archivadas se muestran con recuento canónico/);
  assert.match(auditor, /Recetas regresa al catálogo activo sin perder filas/);
});

test("visual proportion failures emit fixed privacy-safe codes without hiding failures", () => {
  assert.match(auditor, /\[AUDIT_VISUAL_PROPORTION_DIAG\]/);
  assert.match(auditor, /HOME_SUMMARY_HEIGHT_TOO_TALL/);
  assert.match(auditor, /HOME_SUMMARY_HEIGHT_TOO_SHORT/);
  assert.match(auditor, /DIALOG_WIDTH_OUT_OF_BOUNDS/);
  assert.match(auditor, /DIALOG_BOX_TOO_WIDE/);
  assert.match(auditor, /DIALOG_LEFT_OFFSCREEN/);
  assert.match(auditor, /DIALOG_RIGHT_OFFSCREEN/);
  assert.match(auditor, /DIALOG_MOBILE_VIEWPORT/);
  assert.match(auditor, /DIALOG_DESKTOP_VIEWPORT/);
  assert.match(auditor, /DIALOG_MIN_WIDTH_EXCEEDS_VIEWPORT/);
  assert.match(auditor, /emittedVisualProportionCodes\.has\(code\)/);
  assert.match(auditor, /assertCheck\(report\.proportions\.length === 0/);
  // No raw card IDs, prices, rendered text, or DOM heights in the public diagnostic.
  assert.doesNotMatch(auditor, /\[AUDIT_VISUAL_PROPORTION_DIAG\].*report\.proportions/);
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

test("unexpected Chromium abort reasons are finite codes and never include private exception text", () => {
  assert.equal(safeAuditExecutableFailureCode({ message: "Timeout 16000ms exceeded while loading secret account" }), "EXEC_TIMEOUT");
  assert.equal(safeAuditExecutableFailureCode({ name: "TypeError", message: "token=verySecretToken" }), "EXEC_TYPE_ERROR");
  assert.equal(safeAuditExecutableFailureCode({ message: "execution context was destroyed" }), "EXEC_NAVIGATION_RACE");
  assert.equal(safeAuditExecutableFailureCode({ message: "https://private.example.com/id=123" }), "EXEC_OTHER");
  assert.match(auditor, /\[AUDIT_EXEC_DIAG\]/);
  assert.match(auditor, /safeAuditExecutableFailureCode\(error\)/);
});

test("visual overlap diagnostics classify structural elements without user data", () => {
  assert.equal(safeAuditVisualOverlapCode("dialog-close ↔ dialog-title-text"), "DIALOG_CLOSE_TITLE");
  assert.equal(safeAuditVisualOverlapCode(".account-transactions-tabs: .a ↔ .b"), "FINANCE_ACCOUNT_TABS");
  assert.equal(safeAuditVisualOverlapCode("div.account-transactions-tabs: button.a ↔ button.b"), "FINANCE_ACCOUNT_TABS");
  assert.equal(safeAuditVisualOverlapCode("div.liquidity-account-legend.leader-count-8: em ↔ small"), "FINANCE_LIQUIDITY_ROWS");
  assert.equal(safeAuditVisualOverlapCode("header.topbar.is-sticky: div.a ↔ div.b"), "TOPBAR");
  assert.equal(safeAuditVisualOverlapCode("section.account-transactions-tabs-mobile: A ↔ B"), "OTHER");
  assert.equal(safeAuditVisualOverlapCode("div.sensitive-account-name: private-user@example.com"), "OTHER");
  assert.equal(safeAuditVisualOverlapCode("liquidity-account-legend: texto fila 1 ↔ fila 2"), "FINANCE_LIQUIDITY_ROWS");
  assert.equal(safeAuditVisualOverlapCode(".health-tabs: item ↔ item"), "HEALTH_TABS");
  assert.equal(safeAuditVisualOverlapCode("persona@example.com ↔ token privado"), "OTHER");
  assert.match(auditor, /\[AUDIT_VISUAL_OVERLAP_DIAG\]/);
  assert.match(auditor, /safeAuditVisualOverlapCode\(overlap\)/);
  assert.doesNotMatch(auditor, /\[AUDIT_VISUAL_OVERLAP_DIAG\].*report\.overlaps/);
});


test("unmapped failed checks expose only source location within the same SHA", () => {
  const stack = [
    "Error: private token=abc person@example.com",
    "    at fail (file:///tmp/secret/web-audit.mjs:67:21)",
    "    at assertCheck (file:///tmp/secret/web-audit.mjs:78:9)",
    "    at auditNutrition (file:///tmp/secret/web-audit.mjs:1285:17)",
    "    at async run (file:///tmp/secret/another-file.mjs:2:2)"
  ].join("\n");
  assert.equal(safeAuditCallsiteCode(stack), "AUDIT_SOURCE_L01285_C017");
  assert.equal(safeAuditCallsiteCode("Error: private@example.com token=123"), "AUDIT_SOURCE_UNKNOWN");
  assert.equal(safeAuditCallsiteCode("at run (file:///tmp/web-audit.mjs:999999:99)"), "AUDIT_SOURCE_UNKNOWN");
  assert.match(auditor, /safeAuditCallsiteCode\(new Error\(\)\.stack\)/);
  assert.match(auditor, /\[AUDIT_SOURCE\]/);
  assert.doesNotMatch(safeAuditCallsiteCode(stack), /example|secret|token|private/i);
});


test("production audit tracks current Home menu, seven-day matrix and canonical top-level navigation", () => {
  const app = fs.readFileSync(new URL("../../app/app.js", import.meta.url), "utf8");
  const html = fs.readFileSync(new URL("../../app/index.html", import.meta.url), "utf8");
  const auditOrder = auditor.match(/const expectedNavIds = \[([\s\S]*?)\];/)?.[1]
    ?.match(/"area-[^"]+"/g)?.map(value => JSON.parse(value));
  const appOrder = app.match(/const canonicalOrder = \[([\s\S]*?)\];/)?.[1]
    ?.match(/"area-[^"]+"/g)?.map(value => JSON.parse(value));
  assert.ok(auditOrder?.length >= 10 && appOrder?.length >= 10);
  assert.deepEqual(auditOrder, appOrder);
  assert.match(auditor, /const menuAfterAgenda =/);
  assert.doesNotMatch(auditor, /menuSecondCard/);
  assert.match(html, /id="home-weekly-menu-panel"/);
  assert.ok(html.indexOf('id="home-weekly-menu-panel"') > html.indexOf('id="agenda-overview"'));
  assert.match(auditor, /homeDates\.length === 7/);
  assert.match(auditor, /dayGroups\.every\(group => homeDateSet\.has\(group\.date\)\)/);
  assert.match(app, /Array\.from\(\{ length: 7 \}/);
  assert.match(auditor, /const correctableMenuItems =/);
  assert.match(auditor, /expectedChangeRows\.every\(row => changeRows\.includes\(row\)\)/);
  assert.match(app, /const canEdit = !readOnly && sourceId && \(planned \|\| consumed\)/);
  assert.match(auditor, /availableActionRows === editableMenuItems\.length/);
});
