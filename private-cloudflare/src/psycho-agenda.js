// Strict read-only mapping for institutional meetings stored in the private projects sheet.
// Calendar discovery is NOT a time-stamped source snapshot and NEVER a forecast.
const ALLOWED_HOSTS = new Set(["www.federalreserve.gov", "www.ecb.europa.eu", "ecb.europa.eu"]);
const ISO_DATE=/^\d{4}-\d{2}-\d{2}$/;
const SHA=/^[a-f0-9]{64}$/;
const STATES=new Set(["PROGRAMADA_FUENTE_OFICIAL","EN_REVISION","FINALIZADA"]);
function date(s) {
 if(typeof s!=="string"||!ISO_DATE.test(s))return null;
 const d=new Date(s+"T00:00:00.000Z");
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s?s:null;
}
export function officialAgendaUrl(value) {
 if(typeof value!=="string"||value.length>400)return null;
 try {
   const u=new URL(value);
   return u.protocol==="https:"&&ALLOWED_HOSTS.has(u.hostname)&&
     !u.username&&!u.password&&!u.hash&&!u.port ? u.href : null;
 }catch{return null;}
}
export function buildAgendaRadar(eventRows=[],sourceRows=[]) {
 const none={events:[],sourceStatus:"NO_ADMITTED_PUBLIC_REFERENCES",forecastCount:0};
 if(!Array.isArray(eventRows)||!Array.isArray(sourceRows))return none;
 const seenIds=new Set(),invalidIds=new Set();
 for(const e of eventRows){
   const id=String(e?.event_id||"").trim();
   if(!id)continue;
   if(seenIds.has(id))invalidIds.add(id);
   seenIds.add(id);
 }
 const byEvent=new Map(),sourceIds=new Set(),ambiguousEvents=new Set();
 for(const s of sourceRows) {
   const eventId=String(s?.event_id||"").trim();
   const sourceId=String(s?.fuente_id||"").trim();
   if(!eventId||!sourceId)continue;
   if(sourceIds.has(sourceId)){ambiguousEvents.add(eventId);continue;}
   sourceIds.add(sourceId);
   const url=officialAgendaUrl(s.url);
   const dateSeen=date(s.fecha_consulta);
   if(s.kind!=="official_agenda"||!url||!dateSeen||s.estado_evidencia!=="REFERENCIA_OFICIAL_SIN_CAPTURA_DE_BYTES")continue;
   if(byEvent.has(eventId)) {ambiguousEvents.add(eventId);continue;}
   byEvent.set(eventId,{url,observedOn:dateSeen,evidence:"OFFICIAL_CALENDAR_REFERENCE_ONLY"});
 }
 const events=[];
 for(const e of eventRows) {
   const id=String(e?.event_id||"").trim();
   if(!id||invalidIds.has(id)||ambiguousEvents.has(id)||!byEvent.has(id))continue;
   const begin=date(e.fecha_inicio),end=date(e.fecha_fin),decision=date(e.fecha_decision);
   if(!begin||!end||!decision||begin>end||decision<begin||decision>end)continue;
   if(e.outcome_kind!=="rate_decision"||!STATES.has(e.estado_reunion)||e.estado_prediccion!=="NO_EMITIDA")continue;
   const source=byEvent.get(id);
   if(source.observedOn>begin)continue; // not useful for pre-meeting agenda research
   events.push({
     id, institution:String(e.institucion||"").slice(0,140),
     title:String(e.titulo||"").slice(0,160),
     startDate:begin,endDate:end,decisionDate:decision,
     outcomeKind:"rate_decision",status:String(e.estado_reunion),
     issuanceStatus:"NOT_ISSUED", source,
     prediction:null,financialSignal:null, outcome:null
   });
 }
 events.sort((a,b)=>a.startDate.localeCompare(b.startDate));
 return {events,sourceStatus:events.length?"OFFICIAL_DISCOVERY_UNSEALED":"NO_ADMITTED_PUBLIC_REFERENCES",forecastCount:0};
}
