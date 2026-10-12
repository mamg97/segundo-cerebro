import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { spawnSync } from "node:child_process";

const source = await readFile(new URL("./objects.js", import.meta.url), "utf8");
// Execute the actual renderer with a read-only DOM stub, then parse its HTML.
// Python's standard-library parser adds no dependency to the existing CI.
function renderHistory(mode, sort, payload) {
  const body = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
  const context = { document: { querySelector: () => body }, payload, mode, sort };
  runInNewContext(source.replace(/^export /gm, "") +
    "\nlookUsageHistoryView(payload, mode, sort);", context);
  const parsed = spawnSync("python3", ["-c", `
import json, sys
from html.parser import HTMLParser
class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack=[]; self.rows=[]; self.cards=[]; self.buttons=[]
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        record={'tag':tag,'attrs':attrs,'parents':[x['tag'] for x in self.stack]}
        if tag=='tr' and 'tbody' in record['parents']: self.rows.append(record)
        if tag=='td' and self.rows: self.rows[-1].setdefault('cells',[]).append(attrs)
        if tag=='article' and attrs.get('class')=='look-history-mobile-card': self.cards.append(record)
        if tag=='button' and attrs.get('class') in ('look-history-thumb','look-history-mobile-main'):
            self.buttons.append(record)
        if tag not in ('img','br','input','hr','meta','link'): self.stack.append(record)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i]['tag']==tag:
                del self.stack[i:]; break
p=Parser(); p.feed(sys.stdin.read())
print(json.dumps({'rows':p.rows,'cards':p.cards,'buttons':p.buttons}))
`], { input: body.innerHTML, encoding: "utf8" });
  assert.equal(parsed.status, 0, parsed.stderr);
  return JSON.parse(parsed.stdout);
}

const payload = {
  looks: [
    { id: "synthetic-look-a", name: 'Fixture "A" <test>', useCount: 2,
      usageHistory: ["2026-01-02"], items: [{ objectId: "synthetic-item-a" }] },
    { id: "synthetic-look-b", name: "Fixture B", useCount: 1, items: [] }
  ],
  wardrobe: [
    { objectId: "synthetic-item-a", name: "Fixture garment A", useCount: 2 },
    { objectId: "synthetic-item-b", name: "Fixture garment B", useCount: 1 }
  ]
};

for (const mode of ["looks", "garments"]) {
  for (const sort of ["recent", "oldest", "total", "month"]) {
    test(`rendered ${mode}/${sort} keeps thumbnail and six cells inside each row`, () => {
      const dom = renderHistory(mode, sort, payload);
      assert.equal(dom.rows.length, 2);
      assert.deepEqual(dom.rows.map(row => row.attrs["data-history-latest"]), ["2026-01-02", ""]);
      assert.deepEqual(dom.rows.map(row => row.attrs["data-history-has-date"]), ["1", "0"]);
      for (const row of dom.rows) {
        assert.equal(row.cells.length, 6);
        assert.equal(row.cells[0].class, "look-history-thumb-cell");
        assert.equal(row.cells[1].class, "look-history-entity-cell");
      }
      assert.equal(dom.cards.length, 2);
      assert.deepEqual(dom.cards.map(card => card.attrs["data-history-latest"]), ["2026-01-02", ""]);
      const thumbs = dom.buttons.filter(button => button.attrs.class === "look-history-thumb");
      assert.equal(thumbs.length, 2);
      for (const thumb of thumbs) assert.deepEqual(thumb.parents.slice(-3), ["tbody", "tr", "td"]);
      const mobile = dom.buttons.filter(button => button.attrs.class === "look-history-mobile-main");
      assert.equal(mobile.length, 2);
      for (const button of mobile) assert.equal(button.parents.at(-1), "article");
    });
  }
  test(`rendered empty ${mode} preserves the six-column empty state`, () => {
    const dom = renderHistory(mode, "recent", { looks: [], wardrobe: [] });
    assert.equal(dom.rows.length, 1);
    assert.equal(dom.rows[0].cells[0].colspan, "6");
    assert.equal(dom.cards.length, 0);
    assert.equal(dom.buttons.length, 0);
  });
}
