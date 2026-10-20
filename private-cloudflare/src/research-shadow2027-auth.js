// Verify a Cloudflare Access JWT cryptographically before PRIVATE country-level data.
// Optional route feature: if configuration, token, JWKS or audience is missing,
// this function ALWAYS rejects, including on workers.dev direct hostnames.
const B64URL=/^[A-Za-z0-9_-]+$/;
const HEX_SHA256=undefined;
let jwksCache={url:"",keys:[],expires:0};

function fromB64url(s){
  if(typeof s!=="string"||!s||!B64URL.test(s)||s.length>12000)throw new Error("INVALID_B64");
  const encoded=s.replace(/-/g,"+").replace(/_/g,"/");
  const decoded=atob(encoded+"=".repeat((4-encoded.length%4)%4));
  return Uint8Array.from(decoded,c=>c.charCodeAt(0));
}
function decodeJson(part){
  const bytes=fromB64url(part);
  if(bytes.length>16000)throw new Error("OVERSIZED_JWT_PART");
  return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
}
function issuerUrl(env){
  const name=String(env?.PSICO_ACCESS_TEAM_DOMAIN||"").trim().toLowerCase();
  if(!/^[a-z0-9](?:[a-z0-9-]{0,60}[a-z0-9])?\.cloudflareaccess\.com$/.test(name))return null;
  return "https://"+name;
}
function config(env){
  const issuer=issuerUrl(env);
  const aud=String(env?.PSICO_ACCESS_APP_AUD||"").trim();
  if(!issuer||!/^[-a-zA-Z0-9_]{8,160}$/.test(aud))return null;
  return {issuer,aud};
}
async function keysFor(issuer,fetcher,nowSeconds){
  const url=issuer+"/cdn-cgi/access/certs";
  if(jwksCache.url===url&&nowSeconds<jwksCache.expires)return jwksCache.keys;
  const response=await fetcher(url,{method:"GET",redirect:"error",headers:{Accept:"application/json"},signal:AbortSignal.timeout(3500)});
  if(!response.ok)throw new Error("ACCESS_CERTS_UNAVAILABLE");
  const json=await response.json();
  if(!Array.isArray(json.keys)||json.keys.length<1||json.keys.length>12)throw new Error("ACCESS_JWKS_INVALID");
  const eligible=json.keys.filter(x=>x?.kty==="RSA"&&x?.alg==="RS256"&&x?.kid&&x?.n&&x?.e&&
    typeof x.kid==="string"&&x.kid.length<256&&
    typeof x.n==="string"&&x.n.length<2000&&typeof x.e==="string");
  if(!eligible.length)throw new Error("ACCESS_KEYS_MISSING");
  jwksCache={url,keys:eligible,expires:nowSeconds+240};
  return eligible;
}

export async function verifyPsychoAccess(request,env,{fetcher=fetch,nowSeconds=Math.floor(Date.now()/1000)}={}){
  const cfg=config(env);
  if(!cfg)return {ok:false,reason:"ACCESS_NOT_CONFIGURED"};
  const token=request?.headers?.get("Cf-Access-Jwt-Assertion");
  if(typeof token!=="string"||token.length>12000||token.length<40)return {ok:false,reason:"ACCESS_ASSERTION_MISSING"};
  try{
    const parts=token.split(".");
    if(parts.length!==3)throw new Error("PART_COUNT");
    const header=decodeJson(parts[0]);
    const claims=decodeJson(parts[1]);
    if(header?.alg!=="RS256"||typeof header.kid!=="string"||!header.kid||
       header.jwk||header.jku||header.x5u||header.crit)throw new Error("UNSUPPORTED_ALGORITHM");
    if(claims.iss!==cfg.issuer || !Array.isArray(claims.aud) && typeof claims.aud!=="string")throw new Error("CLAIMS");
    const audiences=Array.isArray(claims.aud)?claims.aud:[claims.aud];
    if(!audiences.includes(cfg.aud)||!audiences.every(x=>typeof x==="string"))throw new Error("AUDIENCE");
    if(typeof claims.exp!=="number"||!Number.isSafeInteger(claims.exp)||
       claims.exp<=nowSeconds||claims.exp>nowSeconds+86400*2)throw new Error("EXPIRED");
    if(typeof claims.iat!=="number"||claims.iat>nowSeconds+60)throw new Error("ISSUED_IN_FUTURE");
    if(claims.nbf!=null && (typeof claims.nbf!=="number"||claims.nbf>nowSeconds+60))throw new Error("NOT_YET_VALID");
    if(!claims.sub||typeof claims.sub!=="string"||claims.sub.length>500)throw new Error("IDENTITY_MISSING");
    const keys=await keysFor(cfg.issuer,fetcher,nowSeconds);
    const source=keys.find(k=>k.kid===header.kid);
    if(!source)throw new Error("UNKNOWN_KID");
    const subtle=globalThis.crypto?.subtle;
    if(!subtle)throw new Error("CRYPTO_UNAVAILABLE");
    const pub=await subtle.importKey("jwk",{kty:"RSA",n:source.n,e:source.e,ext:true},
      {name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
    const payload=new TextEncoder().encode(parts[0]+"."+parts[1]);
    const valid=await subtle.verify("RSASSA-PKCS1-v1_5",pub,fromB64url(parts[2]),payload);
    return valid?{ok:true}:{ok:false,reason:"SIGNATURE_INVALID"};
  }catch{
    return {ok:false,reason:"ACCESS_ASSERTION_INVALID"};
  }
}
