// Aggregated historical evidence only. Never promote this to prospective scores.
const number=(x)=>typeof x==='number'&&Number.isFinite(x);
const probability=(x)=>number(x)&&x>=0&&x<=1;
const integer=(x)=>Number.isInteger(x)&&x>=0;
const close=(a,b)=>Math.abs(a-b)<1e-8;
export function parseBacktests(experiments=[]) {
  const accepted=[], rejected=[];
  for(const row of experiments) {
    let d;
    try { d=JSON.parse(row.notes); } catch { continue; }
    if(d?.schema!=='psychohistory.backtest.v1') continue;
    const valid=d.runType==='retrospective_revised_release'&&d.partition==='test'&&
      d.vintageVerified===false&&d.prospectiveEligible===false&&
      typeof d.runId==='string'&&typeof d.taskId==='string'&&typeof d.horizon==='string'&&
      /^[a-f0-9]{64}$/.test(d.sampleSha256||'')&&/^[a-f0-9]{64}$/.test(d.protocolSha256||'')&&
      integer(d.n)&&d.n>0&&integer(d.events)&&d.events<=d.n&&
      probability(d.brier)&&number(d.logLoss)&&d.logLoss>=0&&
      (d.averagePrecision===null||probability(d.averagePrecision))&&probability(d.ece)&&
      number(row.value)&&close(row.value,d.brier)&&
      Array.isArray(d.calibration)&&d.calibration.every(b=>integer(b.count)&&
        (b.count===0||(probability(b.meanProbability)&&probability(b.eventRate))))&&
      d.calibration.reduce((s,b)=>s+b.count,0)===d.n&&
      Array.isArray(d.yearly)&&d.yearly.length>0&&d.yearly.every(y=>integer(y.year)&&integer(y.n)&&y.n>0&&
        integer(y.events)&&y.events<=y.n&&probability(y.brier)&&probability(y.meanProbability))&&
      d.yearly.reduce((s,y)=>s+y.n,0)===d.n&&
      d.yearly.reduce((s,y)=>s+y.events,0)===d.events&&
      close(d.yearly.reduce((s,y)=>s+y.n*y.brier,0)/d.n,d.brier);
    if(!valid) { rejected.push(row.id); continue; }
    accepted.push({...d,id:row.id,model:row.modelVersion,evidence:row.evidence});
  }
  return {accepted,rejected};
}
export function comparableGroups(rows=[]) {
  const groups=new Map();
  for(const r of rows) {
    const key=[r.runId,r.taskId,r.horizon,r.protocolSha256,r.sampleSha256].join('|');
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(r);
  }
  return [...groups.values()].map(g=>g.sort((a,b)=>a.brier-b.brier));
}
export function parseSimulations(experiments=[]) {
  return experiments.flatMap(row=>{
    let d;try { d=JSON.parse(row.notes); } catch { return []; }
    if(d?.schema!=='psychohistory.abm.v1'||d.evidenceType!=='synthetic_simulation_only'||
      d.empiricalFit!==null||!Array.isArray(d.groups)||!d.groups.length||
      !d.groups.every(g=>probability(g.threshold)&&probability(g.initial_share)&&
        probability(g.mean_final)&&probability(g.min_final)&&probability(g.max_final)&&
        g.min_final<=g.mean_final&&g.mean_final<=g.max_final&&integer(g.seeds)&&g.seeds>0)) return [];
    return [{...d,id:row.id}];
  });
}
