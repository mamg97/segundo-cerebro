import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const path = new URL("./finance-personal-compact.js", import.meta.url);
const source = readFileSync(path, "utf8");
const index = readFileSync(new URL("./index.html", import.meta.url), "utf8");

class Element {
  constructor(tag = "div") {
    this.tagName = tag;
    this.className = "";
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.textContent = "";
  }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  get lastElementChild() { return this.children[this.children.length - 1]; }
  cloneNode() { return new Element(this.tagName); }
}

globalThis.document = {
  readyState: "loading",
  createElement: (tag) => new Element(tag),
  addEventListener() {}
};
const moduleUrl = "data:text/javascript," + encodeURIComponent(source);
const { compactPersonalBudgetGroup } = await import(moduleUrl);

function makeCard({ title = "YouTube Music", pct = "100%", overBudget = false } = {}) {
  const card = new Element("article");
  card.classList = { contains: cls => cls === "over-budget" && overBudget };
  const titleNode = { childNodes: [{ textContent: title }] };
  const note = { textContent: "Comentario privado completo" };
  const progress = new Element("progress");
  progress.setAttribute("value", "100");
  const map = {
    ".budget-category-title": titleNode,
    ".budget-category-head-right > strong": { textContent: pct },
    ".budget-category-metrics > span:nth-child(1) strong": { textContent: "6,00 €" },
    ".budget-category-metrics > span:nth-child(2) strong": { textContent: "6,00 €" },
    ".budget-category-metrics > span:nth-child(3) strong": { textContent: "0,00 €" },
    ".budget-category-metrics > span:nth-child(4) strong": { textContent: "0,00 €" },
    ".budget-category-progress": progress,
    ".budget-source": { textContent: "Conciliado" },
    ".budget-category-note": note
  };
  card.querySelector = selector => map[selector] || null;
  return card;
}

for (const owner of ["Miguel", "Andrea"]) {
  test("personal " + owner + " renders matching compact table, collapsible audit note", () => {
    const list = {
      querySelectorAll: selector => selector === ":scope > .budget-category-item"
        ? [makeCard({ title: "OneNote" }), makeCard({ title: "Apple Watch", pct: "140%", overBudget: true })] : [],
      replaceWith(node) { this.replacement = node; }
    };
    const section = {
      classList: { contains: cls => cls === "budget-group-" + owner.toLowerCase() },
      querySelector: selector => selector === ":scope > .budget-detail-list" ? list : null
    };
    assert.equal(compactPersonalBudgetGroup(section), true);
    const table = list.replacement;
    assert.equal(table.className, "budget-compact-table");
    assert.equal(table.attributes["aria-label"], "Partidas del presupuesto personal de " + owner);
    assert.equal(table.children[0].className, "budget-compact-columns");
    const rows = table.children[1].children;
    assert.equal(rows.length, 2);
    assert.equal(rows[0].tagName, "details");
    assert.equal(rows[0].children[0].className, "budget-compact-line");
    assert.equal(rows[0].children[0].children[0].textContent, "OneNote");
    assert.equal(rows[0].children[1].className, "budget-compact-detail");
    assert.equal(rows[0].children[1].children[2].textContent, "Comentario privado completo");
    assert.match(rows[1].className, /is-over/);
    assert.equal(rows[0].attributes.open, undefined);
  });
}

test("enhancement loads on the live page and observes finance re-renders safely", () => {
  assert.match(index, /<script type="module" src="\.\/app\.js\?v=/);
  assert.match(index, /<script type="module" src="\.\/finance-personal-compact\.js\?v=/);
  assert.match(source, /observer\.observe\(body, \{ childList: true \}\)/);
  assert.match(source, /budget-group-miguel, \.budget-group-andrea/);
  assert.doesNotMatch(source, /fetch\(|innerHTML|localStorage|sessionStorage/);
});
