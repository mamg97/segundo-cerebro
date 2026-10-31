// Revalidate only Finance on return to a private tab; no timer or storage.
export function createFinanceForegroundRefresh({refresh,isRemote,isReady,isVisible,
  now=()=>Date.now(), intervalMs=60_000}) {
  let lastAttempt=Number.NEGATIVE_INFINITY;
  let inFlight=false;
  return async function refreshOnForeground() {
    if(inFlight || !isRemote() || !isReady() || !isVisible()) return false;
    const at=now();
    if(at-lastAttempt<intervalMs) return false;
    lastAttempt=at;
    inFlight=true;
    try {return (await refresh())?.ok===true;}
    catch {return false;}
    finally {inFlight=false;}
  };
}
