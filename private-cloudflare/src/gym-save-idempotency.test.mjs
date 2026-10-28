import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const backend=readFileSync(new URL("./index.js",import.meta.url),"utf8");
const begin=backend.indexOf("async function saveGymSession(request, env) {");
const end=backend.indexOf("\nasync function deleteGymSession(",begin);
assert.ok(begin>=0&&end>begin,"Gym save endpoint must be present");
const saveCode=backend.slice(begin,end);
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
const toNumber=value=>value==null||value===""?null:Number(value);
const save=new Function("json","crypto","toNumber","hasHealthGoogleConfig","fetchHealthNutritionSummary",
 saveCode+";return saveGymSession;"
)(json,globalThis.crypto,toNumber,()=>false,async()=>({value:{}}));

const uuid="763df55c-7ef0-43a8-a56f-942d2d4b43d0";
const payload={
 clientRequestId:uuid,sessionDate:"2026-10-28",dayId:"legs",dayTitle:"Pierna",
 notes:"",entries:[{exerciseId:"calf",exerciseName:"Elevación de gemelos",setsDone:"3",repsDone:"15",loadValue:"25",loadUnit:"kg"}]
};
function request(p=payload){return new Request("https://example.invalid/api/gym/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});}
function fakeDb({committedButThrown=false,alwaysFail=false}={}){
 const state=new Map(),calls=[];
 const DB={
  prepare(sql){const stmt={sql,args:[],bind(...args){this.args=args;return this;},
   async first(){
    if(!/SELECT id, session_date, day_id FROM gym_sessions/.test(sql))throw Error("bad read");
    const existing=state.get(this.args[0]);
    return existing?{id:existing.id,session_date:existing.date,day_id:existing.day}:null;
   }};
   calls.push(stmt);return stmt;},
  async batch(list){
   const header=list[0].args;
   if(alwaysFail)throw Error("simulated D1 offline");
   if(state.has(header[0]))throw Error("duplicate PK");
   state.set(header[0],{id:header[0],date:header[1],day:header[2],entries:list.length-1});
   if(committedButThrown)throw Error("response lost after commit");
   return list.map(()=>({success:true}));
  }
 };
 return {DB,state,calls};
}
test("gym writes completed 3x15x25 once and returns 201",async()=>{
 const db=fakeDb();
 const res=await save(request(),db),body=await res.json();
 assert.equal(res.status,201);assert.equal(body.sessionId,uuid);assert.equal(body.ok,true);
 assert.equal(db.state.size,1);assert.equal(db.state.get(uuid).entries,1);
 assert.ok(db.calls.every(x=>!/\bCREATE\b|\bALTER\b|\bDROP\b/i.test(x.sql)));
});
test("identical retry returns existing session and never duplicates it",async()=>{
 const db=fakeDb();
 await save(request(),db);
 const res=await save(request(),db),body=await res.json();
 assert.equal(res.status,200);assert.equal(body.alreadySaved,true);
 assert.equal(db.state.size,1);
});
test("lost response after D1 committed still reports saved",async()=>{
 const db=fakeDb({committedButThrown:true});
 const res=await save(request(),db),body=await res.json();
 assert.equal(res.status,200);assert.equal(body.alreadySaved,true);
 assert.equal(db.state.size,1);
});
test("DB outage preserves pending session and exposes a retryable reason",async()=>{
 const db=fakeDb({alwaysFail:true});
 const res=await save(request(),db),body=await res.json();
 assert.equal(res.status,503);assert.equal(body.code,"GYM_DB_WRITE_FAILED");
 assert.equal(db.state.size,0);
});
test("request ID collision and input errors are explicit",async()=>{
 const db=fakeDb();
 await save(request(),db);
 const collision=await save(request({...payload,dayId:"chest"}),db);
 assert.equal(collision.status,409);
 assert.equal((await collision.json()).code,"GYM_REQUEST_CONFLICT");
 const malformed=await save(request({...payload,clientRequestId:"not-uuid"}),db);
 assert.equal(malformed.status,400);
 assert.equal((await malformed.json()).code,"INVALID_GYM_REQUEST_ID");
});
test("mobile gym UI uses local date, stable request ID and never loses a saved workout on refresh failure",()=>{
 const app=readFileSync(new URL("../../app/app.js",import.meta.url),"utf8");
 assert.match(app,/id="gym-session-date" type="date" value="\$\{localDateKey\(\)\}"/);
 assert.match(app,/gymSaveAttempt=\{key,requestId:crypto.randomUUID\(\)\}/);
 assert.match(app,/clientRequestId:requestId/);
 assert.match(app,/gymLastConfirmedPayload=key/);
 assert.match(app,/Entrenamiento guardado ✓\. El calendario se actualizará al recargar/);
 assert.match(app,/gymSaveStatusMessage\(code,error\?\.status\)/);
});
