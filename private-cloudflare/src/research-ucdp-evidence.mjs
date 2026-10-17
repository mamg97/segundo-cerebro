// Optional source-backed historical annotations. NEVER enters the forecasting kernel.
// Derived on demand from pinned, official UCDP OrganizedViolenceCY 26.1 (CC BY 4.0).
export const UCDP_SOURCE_URL = 'https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy-261-csv.zip';
export const UCDP_ARCHIVE_SHA256 = '66910888f5653af42776d2debc1d72fe527559e7f7fc82e69b7c8771467f2d34';
const TTL = 12 * 60 * 60 * 1000;
let cached = null, cachedUntil = 0, pending = null;

const val = (view, at) => view.getUint32(at,true);
const short = (view, at) => view.getUint16(at,true);

async function digestHex(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
}

// ZIP central directory accommodates bit-3 data descriptors (which the official
// 26.1 archive uses). Do not extract paths to disk, trust only pinned whole-ZIP SHA.
export async function officialCsvFromZip(sourceBytes, expectedSha256 = UCDP_ARCHIVE_SHA256) {
  const bytes = sourceBytes instanceof Uint8Array ? sourceBytes : new Uint8Array(sourceBytes);
  if (bytes.byteLength > 5_000_000 || bytes.byteLength < 40) throw new Error('UCDP_ZIP_SIZE');
  if (await digestHex(bytes) !== expectedSha256) throw new Error('UCDP_ARCHIVE_CHECKSUM');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end=-1;
  for (let pos=bytes.byteLength-22;pos>=Math.max(0,bytes.byteLength-65557);pos--) {
    if (val(view,pos)===0x06054b50) {end=pos;break;}
  }
  if(end<0 || short(view,end+10)!==1)throw new Error('UCDP_ZIP_DIRECTORY');
  const offset=val(view,end+16);
  if (offset+46>bytes.byteLength || val(view,offset)!==0x02014b50 || short(view,offset+10)!==8)
    throw new Error('UCDP_ZIP_ENTRY');
  const compressed=val(view,offset+20),uncompressed=val(view,offset+24),local=val(view,offset+42);
  if(uncompressed>10_000_000 || compressed>5_000_000 || local+30>bytes.byteLength || val(view,local)!==0x04034b50)
    throw new Error('UCDP_ZIP_LIMIT');
  const start=local+30+short(view,local+26)+short(view,local+28);
  if(start+compressed>bytes.byteLength || short(view,offset+28)>90)throw new Error('UCDP_ZIP_OFFSETS');
  const name=new TextDecoder().decode(bytes.subarray(offset+46,offset+46+short(view,offset+28)));
  if(!/^[\w-]+\.csv$/i.test(name))throw new Error('UCDP_CSV_MEMBER');
  const raw=bytes.subarray(start,start+compressed);
  const stream=new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const unpacked=await new Response(stream).arrayBuffer();
  if(unpacked.byteLength!==uncompressed)throw new Error('UCDP_UNCOMPRESSED_SIZE');
  return new TextDecoder('utf-8',{fatal:true}).decode(unpacked).replace(/^\uFEFF/,'');
}

// Quote-aware parser: no arbitrary CSV library dependency in the private Worker.
function parseDelimitedCsv(csv, onRow) {
  let values=[],buffer='',quoted=false;
  for(let i=0;i<csv.length;i++){
    const c=csv[i];
    if(c==='"'){
      if(quoted && csv[i+1]==='"'){buffer+='"';i++;}
      else quoted=!quoted;
    }else if(c===','&&!quoted){values.push(buffer);buffer='';}
    else if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r' && csv[i+1]==='\n')i++;
      values.push(buffer);buffer='';
      if(values.some(v=>v!==''))onRow(values);
      values=[];
    }else buffer+=c;
  }
  if(quoted)throw new Error('UCDP_UNCLOSED_QUOTE');
  if(buffer || values.length){values.push(buffer);onRow(values);}
}
export function parseOfficialCountryYears(csv) {
  let fields=null;
  const byCountry=new Map(),seen=new Set(),names=[
    'country_id','year','Version','sb_total_deaths_best','sb_dyad_count','sb_dyad_names'
  ];
  let count=0;
  parseDelimitedCsv(csv, record=>{
    if(!fields) {
      fields=names.map(name=>record.indexOf(name));
      if(fields.some(i=>i<0))throw new Error('UCDP_CSV_HEADERS');
      return;
    }
    const [id,year,version,deaths,dyadCount,dyadNames]=fields.map(i=>record[i]);
    const cid=Number(id),yr=Number(year),best=Number(deaths),n=Number(dyadCount);
    if(version!=='26.1'||!Number.isInteger(cid)||cid<1||!Number.isInteger(yr)||yr<1989||yr>2025||
       !Number.isInteger(best)||best<0||!Number.isInteger(n)||n<0||n>200)throw new Error('UCDP_DATA_ROW');
    const key=cid+':'+yr;
    if(seen.has(key))throw new Error('UCDP_DUPLICATE_YEAR');
    seen.add(key);count++;
    const parties=dyadNames==='NO_DYAD'?[]:dyadNames.split(';').map(x=>x.trim()).filter(Boolean);
    if((n===0&&parties.length!==0)||(n>0&&parties.length===0))throw new Error('UCDP_DYAD_ROW');
    if(!byCountry.has(cid))byCountry.set(cid,new Map());
    byCountry.get(cid).set(yr,{
      year:yr,sbDeathsBest:best,sbDyadCount:n,dyadNames:parties.slice(0,2),
      sourceUrl:'https://ucdp.uu.se/downloads/organizedviolencecy/organizedviolencecy-261-csv.zip'
    });
  });
  // Official 26.1 audited universe, not a partial or mismatched API response.
  if(count!==7132||byCountry.size!==199)throw new Error('UCDP_UNEXPECTED_COVERAGE');
  return byCountry;
}

export async function evidenceForCountry(countryId, cutoff, horizon, sourceLoader = fetch) {
  if(!Number.isInteger(countryId)||countryId<1||!Number.isInteger(cutoff)||cutoff<1989||
     !Number.isInteger(horizon)||horizon<1||horizon>10||cutoff+horizon+1>2025)
    throw new Error('UCDP_INVALID_EVIDENCE_REQUEST');
  const now=Date.now();
  if(!cached||now>=cachedUntil){
    if(!pending){
      pending=(async()=>{
        const r=await sourceLoader(UCDP_SOURCE_URL,{headers:{Accept:'application/zip'},
          cf:{cacheEverything:true,cacheTtl:24*3600}});
        if(!r.ok)throw new Error('UCDP_SOURCE_HTTP_'+r.status);
        const bytes=new Uint8Array(await r.arrayBuffer());
        const csv=await officialCsvFromZip(bytes);
        const rows=parseOfficialCountryYears(csv);
        cached=rows;cachedUntil=Date.now()+TTL;
      })().finally(()=>{pending=null;});
    }
    await pending;
  }
  const indexed=cached.get(countryId);
  if(!indexed)throw new Error('UCDP_COUNTRY_ABSENT');
  // Complete explicit years: missing country-years become null, NEVER zeros.
  return Array.from({length:horizon+2},(_,i)=>indexed.get(cutoff+i)||null);
}

// Negative replies contain no guessed evidence. Input catalog and country
// are checked against the already-authorized private Sheet before this call.
export async function researchUcdpEvidenceResponse(experiments,searchParams,fetcher=fetch) {
  const {parseFutureCatalogs}=await import('./research-futures-engine.mjs');
  const id=searchParams.get('catalog'),country=searchParams.get('country');
  if(!id||id.length>160||! /^\d{1,7}$/.test(country||''))return {status:400,body:{ok:false,code:'INVALID_EVIDENCE_SELECTION'}};
  const catalog=parseFutureCatalogs(experiments).accepted.find(c=>c.id===id);
  if(!catalog || !catalog.countries.some(c=>String(c.id)===country))
    return {status:422,body:{ok:false,code:'NONCANONICAL_EVIDENCE_SELECTION'}};
  try{
    const evidence=await evidenceForCountry(Number(country),catalog.cutoff,catalog.maxHorizon,fetcher);
    const observed=catalog.countries.find(c=>String(c.id)===country).observedStates;
    // Verify all available UCDP binary state pairs; mismatches fail closed.
    if(observed)for(let i=0;i<observed.length;i++){
      const current=evidence[i],previous=evidence[i-1];
      if(current && previous){
        const measured=2*Number(previous.sbDeathsBest>=25)+Number(current.sbDeathsBest>=25);
        if(observed[i]!==null && observed[i]!==measured)throw new Error('UCDP_STATE_SOURCE_MISMATCH');
      }
    }
    return {status:200,body:{ok:true,datasetVersion:'26.1',source:'UCDP OrganizedViolenceCY',
      observedEvidence:evidence.filter(Boolean),postHoc:true,vintageVerified:false,prospectiveEligible:false}};
  }catch{
    return {status:503,body:{ok:false,code:'UCDP_EVIDENCE_UNAVAILABLE',noInventedEvents:true}};
  }
}
