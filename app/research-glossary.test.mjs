import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LAB_GLOSSARY,glossaryIds,glossaryById,glossaryMatches} from './research-glossary.mjs';
const app=readFileSync(new URL('./research-lab.js',import.meta.url),'utf8');
const html=readFileSync(new URL('./research-lab.html',import.meta.url),'utf8');
const tooltip=readFileSync(new URL('./research-tooltip.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('./research-tooltips.css',import.meta.url),'utf8');
test('dictionary spans all areas and respects scientific limits',()=>{
 assert.ok(LAB_GLOSSARY.length>=25);
 assert.equal(new Set(glossaryIds).size,LAB_GLOSSARY.length);
 for(const i of LAB_GLOSSARY){assert.ok(i.id&&i.label&&i.short&&i.detail&&i.variants.length);assert.ok(i.detail.length<400);}
 for(const id of ['state_based','bridge','backtest','brier','logloss','calibration','cohort','hypothesis','storyboard','replay','asof'])
  assert.ok(glossaryById[id],id);
 assert.match(glossaryById.state_based.detail,/No significa cualquier violencia/);
 assert.match(glossaryById.backtest.detail,/no demuestra pronósticos/i);
});
test('terms occur in the supplied screenshot, without matching inside other words',()=>{
 const s='¿Se registrarán 25 o más muertes relacionadas con violencia estatal durante 2025? Puente no observado y fuente revisada.';
 const hits=glossaryMatches(s);
 for(const id of ['threshold25','state_based','bridge','revised'])assert.ok(hits.some(x=>x.id===id),id);
 assert.equal(hits.find(x=>x.id==='state_based').label,'violencia estatal');
 assert.deepEqual(glossaryMatches('despersistencia y biomarkov'),[]);
 assert.equal(glossaryMatches('Brier Score, LOG LOSS y cohorte.').length,3);
});
test('six definitions maximum per block and deterministic matching',()=>{
 const value='Brier, log loss, ECE, calibración, cohorte, bootstrap, as-of, hipótesis.';
 assert.equal(glossaryMatches(value).length,6);
 assert.deepEqual(glossaryMatches(value),glossaryMatches(value));
 assert.deepEqual(glossaryMatches(null),[]);
 assert.deepEqual(glossaryMatches('violencia estatal',0),[]);
});
test('popover supports mouse, touch, keyboard, safe text nodes and clipping protection',()=>{
 for(const fragment of ['createTreeWalker(node,NodeFilter.SHOW_TEXT)','doc.createTextNode','term.textContent=hit.label','parent.closest(skip)','MutationObserver','pointerover','focusin','keydown','Escape','popup.style.left','popup.hidden=true','root.contains(b)'])
  assert.ok(tooltip.includes(fragment),fragment);
 assert.doesNotMatch(tooltip,/innerHTML|eval\(/);
 assert.match(css,/position:fixed/);
 assert.match(css,/\[hidden\]\{display:none!important\}/);
});
test('single glossary mounted globally, local CSS and current cache version',()=>{
 assert.match(app,/mountLaboratoryGlossary\(root\)/);
 assert.match(html,/research-tooltips\.css\?v=0\.5\.28/);
 assert.match(html,/research-lab\.js\?v=0\.5\.33/);
 assert.match(html,/v0\.5\.33/);
 assert.doesNotMatch(html,/style\s*=/i);
});
