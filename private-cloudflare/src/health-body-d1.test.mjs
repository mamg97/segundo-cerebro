import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
const root = new URL('../..', import.meta.url).pathname;
const worker = readFileSync(root + '/private-cloudflare/src/index.js', 'utf8');
const {deduplicateHealthBodySamples} = await import(pathToFileURL(root + '/private-cloudflare/src/health-body-identity.js'));
const {latestHealthBodyMetric} = await import(pathToFileURL(root + '/private-cloudflare/src/health-body-unified.js'));
function extract(name) {
 const start = worker.search(new RegExp('(?:async )?function ' + name + '\\('));
 assert.ok(start >= 0, name);
 const rest = worker.slice(start); const end = rest.slice(1).search(/\n(?:async )?function /);
 assert.ok(end >= 0, name + ' boundary'); return rest.slice(0, end + 1);
}
const fns = new Function('deduplicateHealthBodySamples', `
const toNumber = value => value === null || value === undefined || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
const json = (value, status=200) => Response.json(value,{status});
let healthCache;
${['localHealthDateKey','ensureHealthBodyTable','saveHealthSync','fetchHealthBodySamples'].map(extract).join('\n')}
return {saveHealthSync,fetchHealthBodySamples};`)(deduplicateHealthBodySamples);
function fixture(t) {
 const sqlite = new DatabaseSync(':memory:'); t.after(()=>sqlite.close());
 const env = {DB:{prepare(sql){ let args=[]; return {bind(...values){args=values;return this},async run(){return sqlite.prepare(sql).run(...args)},async all(){return {results:sqlite.prepare(sql).all(...args)}}};}}};
 return {sqlite, async send(samples){const response=await fns.saveHealthSync(new Request('https://synthetic.invalid/sync',{method:'POST',body:JSON.stringify({bodySamples:samples})}),env); assert.equal(response.status,201); return response.json();},read:()=>fns.fetchHealthBodySamples(env,'2026-01-01','2026-01-31')};
}
const sample = (at,value=70)=>({type:'bodyMass',value,unit:'kg',source:'SYNTHETIC_SCALE',measuredAt:at});
test('production SQL preserves multiple daily weights and late out-of-order arrivals',async t=>{
 const f=fixture(t); await f.send([sample('2026-01-03T18:00:00Z',72)]); await f.send([sample('2026-01-02T08:00:00Z',69),sample('2026-01-03T07:00:00Z',71)]);
 const rows=await f.read(); assert.equal(rows.length,3); assert.equal(latestHealthBodyMetric(rows,'bodyMass','2026-01-03').value,72); assert.equal(latestHealthBodyMetric(rows,'bodyMass','2026-01-04',true),null);
});
test('production UPSERT canonicalizes UTC and updates without creating duplicates',async t=>{
 const f=fixture(t); await f.send([sample('2026-01-03T08:00:00+01:00')]); await f.send([sample('2026-01-03T07:00:00.000Z',71)]); await f.send([sample('2026-01-03T07:00:00Z',71)]);
 const rows=await f.read(); assert.equal(rows.length,1); assert.equal(rows[0].value,71); assert.equal(rows[0].measuredAt,'2026-01-03T07:00:00.000Z'); assert.ok(rows[0].importedAt);
});
test('production date conversion and identity preserve source/type boundaries',async t=>{
 const f=fixture(t); const s=sample('2026-01-02T23:30:00Z'); await f.send([s,{...s,source:'SYNTHETIC_OTHER'},{...s,type:'leanBodyMass',value:50}]);
 const rows=await f.read(); assert.equal(rows.length,3); assert.ok(rows.every(r=>r.date==='2026-01-03'));
});
