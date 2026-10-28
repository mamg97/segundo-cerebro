import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleFacts,renderResearchSchedule} from './research-schedule.mjs';
const now=new Date('2030-10-25T00:00:00Z');
const item={plan_id:'SYNTHETIC-01',dominio:'Synthetic research',titulo:'Preparar una emisión',fecha_utc:'2030-11-04T00:05:00Z',precision_fecha:'INSTANTE',tipo:'PREPARACION',condicion:'Requiere una fuente nueva.',limite_interpretacion:'No valida un modelo.',estado:'PREVISTO',actualizado:'2030-10-25',evidencia_url:'https://example.org/protocol'};
const lab=entries=>({schedule:{status:'ok',entries}});
test('unavailable, empty and invalid planning never imply completed or idle research',()=>{
 assert.equal(scheduleFacts({},now),null);
 assert.match(renderResearchSchedule({},now),/no está disponible/);
 assert.match(renderResearchSchedule(lab([]),now),/no confirma/);
});
test('Madrid clock, month precision, unknown annual publication and undated line stay distinct',()=>{
 const entries=[item,{...item,plan_id:'SYNTHETIC-02',precision_fecha:'MES',fecha_utc:'2031-01',tipo:'REVISION'},
 {...item,plan_id:'SYNTHETIC-03',precision_fecha:'DESDE_ANO',fecha_utc:'2032',tipo:'HORIZONTE'},
 {...item,plan_id:'SYNTHETIC-04',precision_fecha:'SIN_FECHA',fecha_utc:'',tipo:'APLAZADA',estado:'APLAZADO'}];
 const facts=scheduleFacts(lab(entries),now);assert.equal(facts.length,4);
 assert.match(facts[0].date.label,/01:05/);assert.match(facts[1].date.label,/enero de 2031/);
 assert.match(facts[2].date.label,/Desde 2032.*desconocida/);assert.equal(facts[3].date.time,Infinity);
 const html=renderResearchSchedule(lab(entries),now);
 assert.match(html,/ninguna fecha promete/i);assert.match(html,/Condiciones y alcance/);
 assert.match(html,/Sin fecha defendible/);assert.doesNotMatch(html,/modelo validado/);
});
test('past planned instant requires review, never automatic issue omission or success',()=>{
 const facts=scheduleFacts(lab([item]),new Date('2030-12-01T00:00:00Z'));
 assert.equal(facts[0].overdue,true);assert.equal(facts[0].estado,'PREVISTO');
 assert.match(renderResearchSchedule(lab([item]),new Date('2030-12-01T00:00:00Z')),/Fecha prevista superada/);
 const late=scheduleFacts(lab([{...item,precision_fecha:'MES',fecha_utc:'2030-10'}]),now);
 assert.equal(late[0].overdue,false,'month remains planned through its final day');
});
test('invalid dates, rollover, duplicate IDs, unknown kind or state are excluded',()=>{
 for(const changes of [{fecha_utc:'2030-02-31T00:05:00Z'},{fecha_utc:'2030-11-04T00:05:00+03:00'},
 {fecha_utc:'2030-13',precision_fecha:'MES'},{tipo:'constructor'},{estado:'VERIFIED'},{precision_fecha:'UNKNOWN'}]){
  assert.deepEqual(scheduleFacts(lab([{...item,...changes}]),now),[]);
 }
 assert.deepEqual(scheduleFacts(lab([item,{...item,titulo:'conflict'},null]),now),[]);
});
test('escape private copy and reject executable links without exposing hidden metadata',()=>{
 const html=renderResearchSchedule(lab([{...item,titulo:'<img src=x onerror=alert(1)>',condicion:'<script>x</script>',evidencia_url:'javascript:alert(1)'}]),now);
 assert.doesNotMatch(html,/<img|<script|javascript:/);assert.match(html,/&lt;img/);
});
