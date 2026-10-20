import test from "node:test";
import assert from "node:assert/strict";
import {buildAgendaRadar, officialAgendaUrl} from "./psycho-agenda.js";
const event={event_id:"SYNTHETIC_EVENT_01",institucion:"Banco de prueba",titulo:"Ficción",
 fecha_inicio:"2026-11-05",fecha_fin:"2026-11-06",fecha_decision:"2026-11-06",
 outcome_kind:"rate_decision",estado_reunion:"PROGRAMADA_FUENTE_OFICIAL",estado_prediccion:"NO_EMITIDA"};
const source={fuente_id:"SYNTHETIC_SOURCE_01",event_id:event.event_id,kind:"official_agenda",
 url:"https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",fecha_consulta:"2026-11-01",
 estado_evidencia:"REFERENCIA_OFICIAL_SIN_CAPTURA_DE_BYTES"};
test("official discovery is admitted as calendar reference ONLY",()=>{
 const result=buildAgendaRadar([event],[source]);
 assert.equal(result.events.length,1);assert.equal(result.forecastCount,0);
 assert.equal(result.events[0].source.evidence,"OFFICIAL_CALENDAR_REFERENCE_ONLY");
 assert.equal(result.events[0].issuanceStatus,"NOT_ISSUED");
 assert.equal(result.events[0].prediction,null);assert.equal(result.events[0].outcome,null);
});
test("incomplete source or no register never fabricates institutional events",()=>{
 assert.equal(buildAgendaRadar().events.length,0);
 for(const s of [{...source,url:"https://fed.gov.evil.example/"},
  {...source,url:"https://www.federalreserve.gov.evil.example/agenda"},
  {...source,url:"https://user:secret@www.federalreserve.gov/agenda"},
  {...source,url:"http://www.federalreserve.gov/agenda"},
  {...source,fecha_consulta:"2026-11-07"},
  {...source,estado_evidencia:"CAPTURA_VERIFICADA"},
  {...source,fecha_consulta:"2026-11-32"}]){
  assert.equal(buildAgendaRadar([event],[s]).events.length,0);
 }
 assert.equal(officialAgendaUrl("javascript:alert(1)"),null);
});
test("duplicate events and ambiguous sources are rejected",()=>{
 assert.equal(buildAgendaRadar([event,event],[source]).events.length,0);
 assert.equal(buildAgendaRadar([event],[source,{...source,fuente_id:"SYNTHETIC_SOURCE_02"}]).events.length,0);
 assert.equal(buildAgendaRadar([event],[source,source]).events.length,0);
});
test("cannot treat forged issued forecast as a calendar observation",()=>{
 assert.equal(buildAgendaRadar([{...event,estado_prediccion:"EMITIDA"}],[source]).events.length,0);
 assert.equal(buildAgendaRadar([{...event,fecha_inicio:"2026-15-05"}],[source]).events.length,0);
 assert.equal(buildAgendaRadar([{...event,fecha_decision:"2027-01-01"}],[source]).events.length,0);
});
test("ECB official host admitted, attacker-like domain rejected",()=>{
 assert.ok(officialAgendaUrl("https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html"));
 assert.equal(officialAgendaUrl("https://ecb.europa.eu@example.org/"),null);
});
