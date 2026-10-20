import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {verifyPsychoAccess} from "./research-shadow2027-auth.js";

const domain="syntheticpsico.cloudflareaccess.com",aud="test-verified-2027-audience";
const env={PSICO_ACCESS_TEAM_DOMAIN:domain,PSICO_ACCESS_APP_AUD:aud};
const base64=data=>Buffer.from(data).toString("base64url");
let keypair;
async function jwt(options={}){
  keypair ||= await webcrypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",
    modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
  const now=Math.floor(Date.now()/1000);
  const head=base64(JSON.stringify({alg:"RS256",typ:"JWT",kid:"fictional-2027-key",...options.head}));
  const body=base64(JSON.stringify({iss:"https://"+domain,aud:[aud],
    exp:now+1200,iat:now-10,sub:"fictional-user-2027",...options.claims}));
  const msg=head+"."+body;
  const sig=await webcrypto.subtle.sign({name:"RSASSA-PKCS1-v1_5"},keypair.privateKey,new TextEncoder().encode(msg));
  return msg+"."+base64(new Uint8Array(sig));
}
const request=token=>({headers:new Headers(token?{"Cf-Access-Jwt-Assertion":token}:{})});
async function keysFetch(){
  const jwk=await webcrypto.subtle.exportKey("jwk",keypair.publicKey);
  return Response.json({keys:[{...jwk,kid:"fictional-2027-key",alg:"RS256"}]});
}
test("no token and no configured trust root fail closed",async()=>{
  assert.equal((await verifyPsychoAccess(request(),env)).ok,false);
  assert.equal((await verifyPsychoAccess(request(await jwt()),{})).ok,false);
  assert.equal((await verifyPsychoAccess(request(await jwt()),{PSICO_ACCESS_TEAM_DOMAIN:"evil.invalid",PSICO_ACCESS_APP_AUD:aud})).ok,false);
});
test("verified signature + issuer + matching audience is accepted",async()=>{
  const token=await jwt();
  assert.equal((await verifyPsychoAccess(request(token),env,{fetcher:keysFetch})).ok,true);
});
test("issuer, audience and expiration cannot be spoofed",async()=>{
  for(const claims of [{aud:["different-app-aud"]},{iss:"https://attacker.invalid"},{exp:100},{nbf:9999999999}]){
    const t=await jwt({claims});
    const v=await verifyPsychoAccess(request(t),env,{fetcher:keysFetch});
    assert.equal(v.ok,false);
  }
});
test("tampered signature fails even with valid claimed audience",async()=>{
  const valid=await jwt();
  const parts=valid.split(".");
  parts[2]=parts[2].slice(0,-2)+"zz";
  assert.equal((await verifyPsychoAccess(request(parts.join(".")),env,{fetcher:keysFetch})).ok,false);
});
test("malicious alg=none is rejected without running verification",async()=>{
  const t=await jwt({head:{alg:"none"}});
  assert.equal((await verifyPsychoAccess(request(t),env,{fetcher:keysFetch})).ok,false);
});
