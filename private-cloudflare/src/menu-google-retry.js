// Google Sheets may reject short bursts with 429/5xx. Retry only transient
// failures and never cache/return an unsuccessful response as fresh data.
const TRANSIENT=new Set([429,500,502,503,504]);
export async function fetchMenuGoogleRanges(endpoint,accessToken,options={}){
 const fetcher=options.fetcher||fetch;
 const pause=options.pause||((ms)=>new Promise(resolve=>setTimeout(resolve,ms)));
 const attempts=options.attempts||3;
 for(let i=0;i<attempts;i++){
  let response;
  try{
   response=await fetcher(endpoint,{headers:{Authorization:"Bearer "+accessToken}});
  }catch(error){
   if(i===attempts-1)throw error;
   await pause((i+1)*200);
   continue;
  }
  if(response.ok)return response;
  if(!TRANSIENT.has(response.status)||i===attempts-1)
   throw new Error("HEALTH_MENU_SHEETS_"+response.status);
  await pause((i+1)*200);
 }
 throw new Error("HEALTH_MENU_SHEETS_FAILED");
}
