import test from 'node:test';
import assert from 'node:assert/strict';
test('optional planning has bounded/minimal private reads, failure isolation and cache reuse',async()=>{
 const original=globalThis.fetch;
 const env={GOOGLE_CLIENT_ID:'SYNTHETIC',GOOGLE_CLIENT_SECRET:'SYNTHETIC',GOOGLE_REFRESH_TOKEN:'SYNTHETIC',PROJECTS_SHEET_ID:'SYNTHETIC-SHEET'};
 const fields=['plan_id','dominio','titulo','fecha_utc','precision_fecha','tipo','condicion','limite_interpretacion','estado','actualizado','evidencia_url'];
 try{
  for(const mode of ['valid','denied','missing','full']){
   let calls=0;
   globalThis.fetch=async url=>{
    calls++;const parsed=new URL(url);
    if(parsed.searchParams.has('fields'))return Response.json({sheets:[{properties:{title:'PsicoPredicciones',gridProperties:{rowCount:300,columnCount:13}}}]});
    const ranges=parsed.searchParams.getAll('ranges');
    if(ranges[0]==='PsicoCalendario!A1:L100'){
     assert.deepEqual(ranges,['PsicoCalendario!A1:L100']);
     if(mode==='denied')return new Response('',{status:403});
     let values=mode==='missing'?[]:[fields.concat('not_needed'),['SYNTHETIC',...Array(10).fill('text'),'do-not-expose']];
     if(mode==='full')values=[fields,...Array(99).fill(['SYNTHETIC'])];
     return Response.json({valueRanges:[{values}]});
    }
    return Response.json({valueRanges:ranges.map(()=>({values:[]}))});
   };
   const {fetchPsychohistoryLab}=await import('./projects.js?schedule='+mode);
   const result=await fetchPsychohistoryLab(env,async()=>'SYNTHETIC');
   assert.equal(result.schedule.status,mode==='valid'?'ok':'unavailable');
   assert.equal(JSON.stringify(result).includes('do-not-expose'),false);
   assert.ok(Array.isArray(result.predictions),'planning failure preserves original adapter');
   const n=calls;await fetchPsychohistoryLab(env,async()=>'SYNTHETIC');assert.equal(calls,n);
  }
 }finally{globalThis.fetch=original;}
});
