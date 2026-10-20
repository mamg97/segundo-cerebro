import test from "node:test";
import assert from "node:assert/strict";
import {parsePrivate2027Evidence,validate2027Rows,fetchPrivate2027Ranking} from "./research-shadow2027-private.js";

const EID="ucdp261-2027-mobile-private-ranking-20261020";
const fakeId=["test","sheet","2027","fake"].join("-");
const url="https://docs.google.com/spreadsheets/d/"+fakeId+"/edit";
const experiment=updates=>({id:EID,track:"V2",status:"SHADOW_NO_EMITIDO",
  metric:"paises_ranqueados_sin_emision",value:196,
  datasetVersion:"UCDP OrganizedViolenceCY 26.1",evidence:url,...updates});
function sheet(){
  const r=[["#","País","V2 logística","Frecuencia base","Diferencia (pp)",
    "Interacciones","V1 memoria","Markov","Persistencia","Desacuerdo (pp)"]];
  for(let n=1;n<=196;n++){
    const v2=(197-n)/197,baseline=v2/2,other=v2*.9;
    r.push([n,"País ficticio "+n,v2,baseline,100*(v2-baseline),
      other,v2*.8,v2*.75,v2*.65,100*Math.abs(v2-other)]);
  }
  return r;
}
test("private evidence is exact one-to-one and only HTTPS Google Sheet",()=>{
  assert.equal(parsePrivate2027Evidence([experiment()]),fakeId);
  for(const value of [[experiment(),experiment()],[],[experiment({status:"ISSUED"})],
    [experiment({value:195})],[experiment({evidence:url+"?token=exposed"})],
    [experiment({evidence:url.replace("docs.google.com","attacker.invalid")})]]){
    assert.equal(parsePrivate2027Evidence(value),null);
  }
});
test("196 ranked countries and six probability columns pass without lossy rounding",()=>{
  const values=sheet();const r=validate2027Rows(values);
  assert.equal(r.length,196);assert.equal(r[0].rank,1);assert.equal(r[195].rank,196);
  assert.equal(r[0].baselineDiffPp,100*(r[0].v2-r[0].baseline));
});
test("repeated country or tampered percentages fail",()=>{
  for(const mutate of [
    values=>{values[2][1]=values[1][1];},
    values=>{values[2][0]=1;},
    values=>{values[3][2]=1.5;},
    values=>{values[3][4]=0;},
    values=>{values.splice(2,1);},
    values=>{values[0][0]="No rank";},
  ]){
    const values=sheet();mutate(values);
    assert.throws(()=>validate2027Rows(values));
  }
});
test("private fetch never trusts a fabricated registry or untested source",async()=>{
  let calls=0;
  const r=await fetchPrivate2027Ranking({},async()=> "synthetic-oauth-token",{
    labReader:async()=>({status:"ok-live",experiments:[experiment()]}),
    googleFetch:async()=>{calls++;return Response.json({values:sheet()})}
  });
  assert.equal(calls,1);assert.equal(r.countries,196);assert.equal(r.rows.length,196);
  assert.equal(r.issued,false);assert.equal(r.models,6);
  await assert.rejects(()=>fetchPrivate2027Ranking({},async()=>"fake",{
    labReader:async()=>({status:"ok-live",experiments:[experiment({status:"ISSUED"})]}),
    googleFetch:async()=>{calls++;return Response.json({values:sheet()})}
  }));
  assert.equal(calls,1);
});
