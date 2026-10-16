// Date ordering alone is NOT proof of issuance. Verification must be injected
// by a trusted server-side receipt verifier, NEVER read from editable Sheets.
// Until that verifier is installed, production intentionally scores zero rows.
export function hasVerifiedSeal(row, verifiedReceipts = new Map()) {
  const receipt = verifiedReceipts.get(row.id);
  return receipt?.verified === true && receipt?.payloadMatched === true &&
    receipt?.independentTimestamp === true &&
    Number.isFinite(Date.parse(receipt.timestamp)) &&
    Date.parse(receipt.timestamp) <= Date.parse(row.issuedAt) &&
    Date.parse(receipt.timestamp) < Date.parse(row.resolutionAt);
}
export function validatedProspectiveRows(rows, verifiedReceipts = new Map()) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((r) => {
    const p = r.probability;
    const y = r.outcome;
    const issued = Date.parse(String(r.issuedAt || ""));
    const resolution = Date.parse(String(r.resolutionAt || ""));
    return hasVerifiedSeal(r, verifiedReceipts) && r.status === "RESUELTA" && typeof p === "number" &&
      Number.isFinite(p) && p >= 0 && p <= 1 &&
      (y === 0 || y === 1) &&
      Number.isFinite(issued) && Number.isFinite(resolution) && issued < resolution && resolution <= Date.now() &&
      r.asOf && Number.isFinite(Date.parse(String(r.asOf))) && Date.parse(String(r.asOf)) <= issued;
  });
}
export function brierScore(rows, valueKey="probability") {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  if (!rows.every((r) => Number.isFinite(r[valueKey]) &&
    r[valueKey] >= 0 && r[valueKey] <= 1 && (r.outcome === 0 || r.outcome === 1))) return null;
  return rows.reduce((sum,r)=>sum+(r[valueKey]-r.outcome)**2,0)/rows.length;
}
export function brierSkill(score, baseline) {
  if (!Number.isFinite(score) || !Number.isFinite(baseline) || baseline <= 0) return null;
  return 1-score/baseline;
}
export function calibrationBins(rows, n=5) {
  if (!Array.isArray(rows) || rows.length===0 || !Number.isInteger(n) || n < 2 || n > 20) return [];
  const bins=Array.from({length:n},(_,index)=>({index, count:0, totalP:0, totalY:0}));
  for(const row of rows) {
    if(!Number.isFinite(row.probability)||row.probability<0||row.probability>1 ||
       (row.outcome!==0 && row.outcome!==1)) continue;
    const bin=bins[Math.min(n-1,Math.floor(row.probability*n))];
    bin.count++; bin.totalP+=row.probability; bin.totalY+=row.outcome;
  }
  return bins.map(({index,count,totalP,totalY})=>({
    index,count,meanProbability:count?totalP/count:null,eventRate:count?totalY/count:null
  }));
}
export function prospectiveSummary(predictions, verifiedReceipts = new Map()) {
  const scored=validatedProspectiveRows(predictions, verifiedReceipts);
  const withBaseline=scored.filter(r=>typeof r.baselineProbability==="number" &&
    Number.isFinite(r.baselineProbability) && r.baselineProbability>=0 && r.baselineProbability<=1);
  // Fair paired comparison: both Brier scores use the exact same observations.
  const modelPaired=brierScore(withBaseline);
  const basePaired=brierScore(withBaseline,"baselineProbability");
  return {
    registered:Array.isArray(predictions)?predictions.length:0,
    sealStatus: "independent-verifier-required",
    unsealed:Array.isArray(predictions)?predictions.filter(r=>!hasVerifiedSeal(r,verifiedReceipts)).length:0,
    resolved:scored.length,
    rejectedResolved:Array.isArray(predictions)?
      predictions.filter(r=>r.status==="RESUELTA").length-scored.length:0,
    brier:brierScore(scored),
    baselinePairedBrier:basePaired,
    modelPairedBrier:modelPaired,
    pairedCount:withBaseline.length,
    brierSkill:brierSkill(modelPaired,basePaired),
    calibration:calibrationBins(scored)
  };
}
