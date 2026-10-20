import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {LAB_GROUPS,LAB_VIEWS,labGroupForView,labDefaultView} from './research-lab-navigation.mjs';
const html=readFileSync(new URL('./research-lab.html',import.meta.url),'utf8');
const js=readFileSync(new URL('./research-lab.js',import.meta.url),'utf8');
test('four compact primary categories preserve exactly nine original destinations',()=>{
 assert.equal(Object.keys(LAB_GROUPS).length,3);
 assert.equal(LAB_VIEWS.length,9);
 assert.equal(new Set(LAB_VIEWS).size,9);
 assert.equal((html.match(/data-nav-group="/g)||[]).length,3);
 assert.equal((html.match(/data-view="/g)||[]).length,9);
 for(const v of LAB_VIEWS){assert.match(html,new RegExp('data-view="'+v+'"'));assert.notEqual(labGroupForView(v),null)}
 for(const g of Object.keys(LAB_GROUPS))assert.match(html,new RegExp('data-nav-group="'+g+'"'));
 assert.equal(labGroupForView('invalid'),null);
});
test('group navigation preserves deep links and browser navigation',()=>{
 assert.equal(labDefaultView('forecast'),'futures');
 assert.equal(labDefaultView('research'),'overview');
 assert.equal(labDefaultView('create'),'ideas');
 assert.equal(labDefaultView('invalid'),null);
 assert.equal(labGroupForView('shadow2027'),'forecast');
 assert.equal(labGroupForView('video'),'create');
 assert.equal(labGroupForView('roadmap'),'research');
 assert.match(js,/window\.history\.pushState/);
 assert.match(js,/window\.addEventListener\('popstate'/);
 assert.match(js,/subtabs\.hidden=group==='brief'/);
 assert.match(js,/x\.hidden=x\.dataset\.navParent!==undefined && x\.dataset\.navParent!==group/);
 assert.match(js,/url\.searchParams\.set\('view',view\)/);
});
test('grouped navigation keeps accessible nav landmarks and no inline CSS',()=>{
 assert.match(html,/aria-label="Secciones principales del laboratorio"/);
 assert.match(html,/aria-label="Vistas de la sección actual"/);
 assert.doesNotMatch(html,/style\s*=/i);
});
