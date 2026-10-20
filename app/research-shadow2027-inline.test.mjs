import test from "node:test";
import assert from "node:assert/strict";
import {isPrivate2027Payload,renderPrivate2027Table} from "./research-shadow2027-inline.mjs";
function payload(){
  return {ok:true,source:"PRIVATE_GOOGLE_SHEETS",issued:false,targetYear:2027,models:6,countries:196,
    rows:Array.from({length:196},(_,i)=>{
      const v2=(196-i)/197,baseline=v2/2,interactions=v2*.9;
      return {rank:i+1,name:i===0?"País <prueba>":"País artificial "+(i+1),
        v2,baseline,baselineDiffPp:(v2-baseline)*100,interactions,
        memory:v2*.8,markov:v2*.75,persistence:v2*.65,
        disagreementPp:(v2-interactions)*100};
    })};
}
test("only private, complete, non-issued cohort is renderable",()=>{
  assert.equal(isPrivate2027Payload(payload()),true);
  for(const change of [
    {issued:true},{countries:195},{source:"PUBLIC"}, {targetYear:2026},{models:5}
  ])assert.equal(isPrivate2027Payload({...payload(),...change}),false);
});
test("search and choice keep synthetic probabilities out of markup injection",()=>{
  const {rows}=payload();
  const html=renderPrivate2027Table(rows,{search:"<prueba>",sort:"alpha",model:"v2"});
  assert.match(html,/País &lt;prueba&gt;/);
  assert.doesNotMatch(html,/País <prueba>/);
  assert.match(html,/Mostrando 1 de 196/);
});
test("tampering with model arithmetic cannot bypass the UI",()=>{
  const x=payload();x.rows[0].disagreementPp=999;
  assert.equal(isPrivate2027Payload(x),false);
  const y=payload();y.rows[0].v2=1.1;
  assert.equal(isPrivate2027Payload(y),false);
});
