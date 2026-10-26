import test from 'node:test';
import assert from 'node:assert/strict';

test('private progress adapter bounds requests, minimizes fields and fails explicitly',async()=>{
  const original=globalThis.fetch;
  const env={GOOGLE_CLIENT_ID:'SYNTHETIC',GOOGLE_CLIENT_SECRET:'SYNTHETIC',GOOGLE_REFRESH_TOKEN:'SYNTHETIC',PROJECTS_SHEET_ID:'SYNTHETIC_SHEET'};
  try {
    for(const mode of ['valid','missing','denied']){
      let calls=0;
      globalThis.fetch=async url=>{
        calls++;
        const ranges=new URL(url).searchParams.getAll('ranges');
        if(ranges[0]==='PsicoFases!A1:L300'){
          assert.deepEqual(ranges,['PsicoFases!A1:L300','PsicoAvances!A1:L499']);
          if(mode==='denied')return new Response('',{status:403});
          const values=mode==='missing'?[]:[['fase_id','dominio','estado','criterio_superado','resultado_acreditado','unused_secret'],['TEST-01','Synthetic','PARCIAL','NO','Synthetic result','do-not-expose']];
          return Response.json({valueRanges:[{values},{values:[['avance_id','fecha','notas'],['TEST-AV','2030-01-01','not-needed']]}]});
        }
        return Response.json({valueRanges:ranges.map(()=>({values:[]}))});
      };
      const {fetchPsychohistoryLab}=await import('./projects.js?test='+mode);
      const first=await fetchPsychohistoryLab(env,async()=>'SYNTHETIC_TOKEN');
      assert.equal(first.progress.status,mode==='valid'?'ok':'unavailable');
      assert.equal(JSON.stringify(first).includes('do-not-expose'),false);
      assert.equal(JSON.stringify(first).includes('not-needed'),false);
      if(mode==='valid'){
        assert.equal(first.progress.phases[0].fase_id,'TEST-01');
        assert.deepEqual(first.progress.advances,[{fecha:'2030-01-01'}]);
      }
      const count=calls;
      await fetchPsychohistoryLab(env,async()=>'SYNTHETIC_TOKEN');
      assert.equal(calls,count,'reuse the existing bounded cache');
    }
  } finally {globalThis.fetch=original;}
});
