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

// ABM with reversible activation is synthetic only; never a country risk forecast.
export function parseRecoverySimulations(experiments = []) {
  const accepted = [];
  for (const row of experiments) {
    let d;
    try { d = JSON.parse(row.notes); } catch { continue; }
    if (d?.schema !== 'psychohistory.abm.recovery.v1') continue;
    if (d.evidenceType !== 'synthetic_simulation_only' || d.empiricalFit !== null ||
        d.calendarMapping !== null || !/^[a-f0-9]{64}$/.test(d.codeSha256 || '') ||
        !/^[a-f0-9]{64}$/.test(d.protocolSha256 || '') ||
        !integer(d.nRuns) || d.nRuns < 1 || d.nRuns > 50000 ||
        !Array.isArray(d.seeds) || d.seeds.length < 1 ||
        !d.seeds.every(integer) || new Set(d.seeds).size !== d.seeds.length ||
        !d.seeds.includes(0) || !Array.isArray(d.groups) || !d.groups.length || d.groups.length > 1200 ||
        d.groups.length * d.seeds.length !== d.nRuns ||
        !d.groups.every(g => probability(g.initialShare) && probability(g.threshold) &&
          probability(g.recovery) && probability(g.mean) && probability(g.q05) &&
          probability(g.q95) && probability(g.min) && probability(g.max) &&
          number(g.sd) && g.sd >= 0 && g.min <= g.q05 && g.q05 <= g.q95 &&
          g.q95 <= g.max && g.min <= g.mean && g.mean <= g.max &&
          g.reproducedSeed0 === true && g.seeds === d.seeds.length)) continue;
    const combos = d.groups.map(g => [g.initialShare,g.threshold,g.recovery].join('|'));
    if (new Set(combos).size !== combos.length) continue;
    accepted.push({id:row.id,nRuns:d.nRuns,seeds:d.seeds.length,groups:d.groups.map(g=>({
      initialShare:g.initialShare,threshold:g.threshold,recovery:g.recovery,
      mean:g.mean,q05:g.q05,q95:g.q95,min:g.min,max:g.max,sd:g.sd,seeds:g.seeds
    }))});
  }
  return accepted;
}
