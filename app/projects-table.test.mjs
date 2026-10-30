import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { projectTableMarkup } from "./projects-table.mjs";

const demo = [
  { id: "p-01", name: "Proyecto Ejemplo", area: "I+D", type: "Datos", status: "ACTIVO", priority: "ALTA", docsStatus: "COMPLETA", nextAction: "Revisar fuentes" },
  { id: "p-02", parentId: "p-01", name: "Subproyecto Prueba", area: "I+D", type: "Web", status: "PAUSADO", docsStatus: "PARCIAL" },
];

test("one accessible table row per project, with one column per attribute", () => {
  const html = projectTableMarkup(demo, demo);
  assert.equal((html.match(/class="project-row"/g) || []).length, 2);
  assert.equal((html.match(/<td\b/g) || []).length, 16);
  assert.match(html, /<th scope="col">Web<\/th>/);
  assert.match(html, /<th scope="col">Siguiente acción<\/th>/);
  assert.match(html, /class="project-table-count">1<\/td>/);
  assert.match(html, /data-project-id="p-01"/);
  assert.match(html, /tabindex="0"/);
  assert.doesNotMatch(html, /project-card/);
});

test("escaping protects the private project fields and searchable attributes", () => {
  const attack = '<img src=x onerror="alert(1)">';
  const html = projectTableMarkup([{ ...demo[0], name: attack, nextAction: attack, area: attack, id: '" onfocus="bad' }]);
  assert.doesNotMatch(html, /<img|onerror="|onfocus="bad/);
  assert.match(html, /&lt;img/);
  assert.match(html, /&quot;/);
});

test("project website links point directly to the private registry URL", () => {
  const withWeb = { ...demo[0], webUrl: "https://www.ejemplo.test/catalogo?a=1&b=2" };
  const html = projectTableMarkup([withWeb, demo[1]], demo);
  assert.match(html, /<th scope="col">Web<\/th>/);
  assert.match(html, /href="https:\/\/www\.ejemplo\.test\/catalogo\?a=1&amp;b=2"/);
  assert.match(html, /class="project-table-web"/);
  assert.match(html, /ejemplo\.test ↗<\/a>/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /class="project-table-muted">—<\/span>/);
  for (const malicious of ["javascript:alert(1)", "http://inseguro.test", 'https://ok.test/"onmouseover=bad']) {
    assert.doesNotMatch(projectTableMarkup([{ ...withWeb, webUrl: malicious }]), /class="project-table-web"/);
  }
});

test("summary and all tabs share the table; CSS allows responsive horizontal scroll", () => {
  const js = readFileSync(new URL("./projects.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("./projects-table.css", import.meta.url), "utf8");
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  const page = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  assert.equal((js.match(/projectTableMarkup\(/g) || []).length, 2);
  assert.match(js, /querySelectorAll\("\.project-row"\)/);
  assert.match(css, /\.projects-table-scroll\s*\{/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /position:\s*sticky/);
  assert.match(css, /max-width:\s*none/);
  assert.match(page, /projects-table\.css\?v=0\.1\.1/);
  assert.match(app, /projects\.js\?v=0\.37\.4/);
});
