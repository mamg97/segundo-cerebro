import test from 'node:test';
import assert from 'node:assert/strict';
const env={GOOGLE_CLIENT_ID:'SYNTHETIC',GOOGLE_CLIENT_SECRET:'SYNTHETIC',GOOGLE_REFRESH_TOKEN:'SYNTHETIC',PROJECTS_SHEET_ID:'SYNTHETIC'};
const header=['prediccion_id','vertiente','fenomeno','region','horizonte','fecha_emision','fecha_resolucion','probabilidad','resultado','estado','modelo_version','as_of','baseline_prob'];

test('complete annual-sized grid preserves all records, zero probabilities and unresolved outcomes',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{
  globalThis.fetch=async url=>{
   calls++;const params=new URL(url).searchParams;
   if(params.has('fields'))return Response.json({sheets:[{properties:{title:'PsicoPredicciones',gridProperties:{rowCount:2000,columnCount:13}}}]});
   const ranges=params.getAll('ranges');
   return Response.json({valueRanges:ranges.map(range=>{
    if(range.startsWith('PsicoPredicciones!')){
     assert.equal(range,'PsicoPredicciones!A1:M2000');
     return {values:[header,...Array.from({length:1177},(_,i)=>['SYNTHETIC-'+i,'V2','SYNTHETIC','SYNTHETIC','SYNTHETIC','2026-10-26','',i===1176?0:.1,'','EMITIDA_EXPERIMENTAL','SYNTHETIC','',.1])]};
    }return {values:[]};
   })});
  };
  const {fetchPsychohistoryLab}=await import('./projects.js?predictions=complete');
  const lab=await fetchPsychohistoryLab(env,async()=>'SYNTHETIC');
  assert.equal(lab.predictions.length,1177);
  assert.equal(lab.predictions.at(-1).id,'SYNTHETIC-1176');
  assert.equal(lab.predictions.at(-1).probability,0);
  assert.equal(lab.predictions.at(-1).outcome,null);
  assert.equal(lab.predictions.at(-1).resolutionAt,null);
  const previous=calls;await fetchPsychohistoryLab(env,async()=>'SYNTHETIC');assert.equal(calls,previous);
 }finally{globalThis.fetch=original;}
});

test('missing, oversized, wrong-column and completely full grids fail rather than return partial predictions',async()=>{
 const original=globalThis.fetch;
 try{
  for(const mode of ['missing','oversized','columns','full']){
   globalThis.fetch=async url=>{
    const params=new URL(url).searchParams;
    if(params.has('fields'))return Response.json({sheets:mode==='missing'?[]:[{properties:{title:'PsicoPredicciones',gridProperties:{rowCount:mode==='oversized'?5001:300,columnCount:mode==='columns'?14:13}}}]});
    return Response.json({valueRanges:params.getAll('ranges').map(range=>({values:range.startsWith('PsicoPredicciones!')?[header,...Array.from({length:299},(_,i)=>['SYNTHETIC-'+i,'V2'])]:[]}))});
   };
   const {fetchPsychohistoryLab}=await import('./projects.js?predictions='+mode);
   await assert.rejects(fetchPsychohistoryLab(env,async()=>'SYNTHETIC'),/PREDICTION_GRID/);
  }
 }finally{globalThis.fetch=original;}
});
