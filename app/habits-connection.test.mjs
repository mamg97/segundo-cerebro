import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const start = source.indexOf("async function openHabitsDetail(");
const end = source.indexOf("function habitViewMode(", start);
assert.ok(start >= 0 && end > start, "HabitQuest view loader exists");
const loader = source.slice(start, end);

function setup({ response, reject = null } = {}) {
  const body = { innerHTML: "", click: null, querySelector(selector) {
    if (selector === "#habits-retry-load") return { addEventListener: (type, callback) => {
      this.click = callback;
    } };
    return null;
  } };
  const dialog = {
    open: false, opens: 0,
    classList: { add() {}, remove() {} },
    showModal() { if (this.open) throw Error("InvalidStateError"); this.open = true; this.opens++; }
  };
  const ctx = vm.createContext({
    selectedHabitDate: null,
    dialog,
    fetch: async () => {
      if (reject) throw reject;
      return response;
    },
    localDateKey: () => "2026-10-11",
    renderHabitsPanel: (data) => { ctx.rendered = data; body.innerHTML = "<section>Hábitos</section>"; },
    console: { warn() {} },
    document: { querySelector: (id) => ({
      "#detail-dialog": dialog,
      "#dialog-context": { textContent: "" },
      "#dialog-title": { textContent: "" },
      "#dialog-body": body
    }[id]) }
  });
  vm.runInContext(loader, ctx);
  return { ctx, dialog, body };
}

test("HabitQuest missing Google auth is distinguished from provider failure", async () => {
  const { ctx, body } = setup({ response: {
    ok: false, status: 503, json: async () => ({ code: "HABITQUEST_NOT_CONFIGURED" })
  } });
  await vm.runInContext("openHabitsDetail('2026-10-11')", ctx);
  assert.match(body.innerHTML, /Falta alguna credencial de Google/);
  assert.doesNotMatch(body.innerHTML, /Falta configurar el identificador privado/);
});

test("a temporary Google Sheet read failure does not falsely claim an ID is missing", async () => {
  const { ctx, body } = setup({ response: {
    ok: false, status: 502, json: async () => ({ code: "HABITQUEST_READ_FAILED" })
  } });
  await vm.runInContext("openHabitsDetail('2026-10-11')", ctx);
  assert.match(body.innerHTML, /El Worker no ha podido leer el Google Sheet/);
  assert.doesNotMatch(body.innerHTML, /Falta configurar el identificador privado/);
});

test("connection retry works with an already-open modal and never duplicates the dialog", async () => {
  const { ctx, dialog, body } = setup({ reject: Error("Offline") });
  await vm.runInContext("openHabitsDetail()", ctx);
  assert.match(body.innerHTML, /Reintentar conexión/);
  assert.equal(dialog.opens, 1);
  assert.equal(typeof body.click, "function");
  await body.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(dialog.opens, 1);
  assert.match(body.innerHTML, /No se ha podido completar la consulta/);
});

test("valid original HabitQuest response still displays data instead of the fallback", async () => {
  const success = { ok:true, summary:{total: 1}, todayHabits:[] };
  const { ctx, body } = setup({ response: {
    ok: true, status: 200, json: async () => success
  } });
  await vm.runInContext("openHabitsDetail('2026-10-11')", ctx);
  assert.equal(ctx.rendered.summary.total, 1);
  assert.match(body.innerHTML, /<section>Hábitos<\/section>/);
});
