import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const css=readFileSync(new URL("./habitquest-dense.css",import.meta.url),"utf8");
const html=readFileSync(new URL("./index.html",import.meta.url),"utf8");
const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");

test("iPhone compact HabitQuest explicitly shows two columns between 350 and 649px",()=>{
  assert.match(css,/@media \(min-width: 350px\) and \(max-width: 649px\)\s*\{[\s\S]*?\.habit-today-list\.compact,\s*\.habit-master-list\.compact\s*\{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(css,/@media \(max-width: 439px\)[\s\S]*?\.habit-today-list\.compact\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});
test("list mode stays single column independently of device width",()=>{
  assert.match(css,/\.habit-today-list:not\(\.compact\)\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css,/\.habit-today-list:not\(\.compact\) \.habit-today-item/);
  assert.match(css,/\.habit-today-list\.compact \.habit-today-item/);
});
test("compact cards keep title, icon and completion count readable",()=>{
  assert.match(css,/\.habit-today-list\.compact \.habit-today-copy strong[\s\S]*?-webkit-line-clamp:\s*3/);
  assert.match(css,/\.habit-today-list\.compact \.habit-count[\s\S]*?grid-row:\s*2/);
  assert.match(app,/habitViewPreference = habitViewMode\(\) === "list" \? "compact" : "list"/);
  assert.match(app,/class="habit-today-list \$\{view === "compact" \? "compact" : ""\}"/);
});
test("iOS receives new cached stylesheet and breakpoint never changes saved habits",()=>{
  assert.match(html,/habitquest-dense\.css\?v=0\.1\.1/);
  assert.doesNotMatch(css,/localStorage|\/api\/|fetch\(/);
});
