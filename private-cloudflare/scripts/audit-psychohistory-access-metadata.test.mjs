import test from "node:test";
import assert from "node:assert/strict";
import {auditAccessMetadata,findAppCoveringAllPaths} from "./audit-psychohistory-access-metadata.mjs";

const accountId="abcd".repeat(8),apiToken="fictionalreadtoken".repeat(2);
const target="segundo-cerebro.mamg97.workers.dev";
const app={type:"self_hosted",domain:target,aud:"synthetic-app-aud"};
const org={auth_domain:"synthetic-team.cloudflareaccess.com"};
function apiMock({apps=[app],orgResult=org,appsStatus=200,orgStatus=200,workerStatus=200}={}){
  return async(url,options)=>{
    assert.equal(options.method,"GET");
    assert.equal(options.redirect,"error");
    assert.ok(url.startsWith("https://api.cloudflare.com/client/v4/accounts/"));
    const useOrg=url.endsWith("/access/organizations");
    const useWorkers=url.includes("/workers/workers?");
    const status=useOrg?orgStatus:useWorkers?workerStatus:appsStatus;
    return Response.json(status===200?{success:true,result:useOrg?orgResult:useWorkers?[{id:"fake-worker-id",name:"segundo-cerebro"}]:apps,
      result_info:{total_pages:1}}:{success:false,errors:[{message:"do not leak"}]},{status});
  };
}
test("matches exact team app protecting all 2027 and lab routes",async()=>{
  const out=await auditAccessMetadata({accountId,apiToken,fetcher:apiMock()});
  assert.equal(out.appsApi,"OK");
  assert.equal(out.targetApp,"UNIQUE");
  assert.equal(out.audience,"VALID_SHAPE_NOT_EXPORTED");
  assert.equal(out.teamDomain,"VALID_SHAPE_NOT_EXPORTED");
  assert.equal(out.safeToEnablePrivate2027,false);
  assert.equal(out.configAutomaticallyWritten,false);
  assert.doesNotMatch(JSON.stringify(out),/synthetic-app-aud|synthetic-team/);
});
test("API permission refusal is not treated as verified metadata",async()=>{
  const out=await auditAccessMetadata({accountId,apiToken,
    fetcher:apiMock({appsStatus:403,orgStatus:403})});
  assert.equal(out.appsApi,"READ_SCOPE_DENIED");
  assert.equal(out.organizationApi,"READ_SCOPE_DENIED");
  assert.equal(out.targetApp,"UNVERIFIED");
  assert.equal(out.safeToEnablePrivate2027,false);
});
test("ambiguous and nonexistent apps cannot select a random audience",async()=>{
  for(const apps of [[app,app],[{...app,domain:"unrelated.invalid"}]]){
    const out=await auditAccessMetadata({accountId,apiToken,fetcher:apiMock({apps})});
    assert.notEqual(out.targetApp,"UNIQUE");
    assert.equal(out.audience,"UNVERIFIED");
  }
});
test("path-limited apps do not pretend to protect the whole lab",()=>{
  assert.deepEqual(findAppCoveringAllPaths([{...app,domain:target+"/api/research-lab"}]),[]);
  assert.deepEqual(findAppCoveringAllPaths([{...app,domain:"*.mamg97.workers.dev"}]),[]);
  assert.equal(findAppCoveringAllPaths([{...app,self_hosted_domains:[{domain:target}]}]).length,1);
});
test("missing token, wrong account and failed network cannot approve access",async()=>{
  const absent=await auditAccessMetadata({accountId,apiToken:""});
  assert.equal(absent.appsApi,"CREDENTIALS_UNAVAILABLE");
  const wrong=await auditAccessMetadata({accountId:"wrong",apiToken});
  assert.equal(wrong.appsApi,"CREDENTIALS_UNAVAILABLE");
  const net=await auditAccessMetadata({accountId,apiToken,fetcher:async()=>{throw Error("mock outage")}});
  assert.equal(net.appsApi,"API_UNAVAILABLE");
  assert.equal(net.organizationApi,"API_UNAVAILABLE");
  assert.equal(net.safeToEnablePrivate2027,false);
});
test("organization scope missing cannot certify team domain",async()=>{
  const out=await auditAccessMetadata({accountId,apiToken,
    fetcher:apiMock({orgStatus:403})});
  assert.equal(out.appsApi,"OK");
  assert.equal(out.organizationApi,"READ_SCOPE_DENIED");
  assert.equal(out.teamDomain,"UNVERIFIED");
  assert.equal(out.safeToEnablePrivate2027,false);
});

test("new public destinations supersede deprecated domain and preserve exact host",async()=>{
  const rewritten={...app,domain:"unrelated.invalid",
    destinations:[{type:"public",uri:"https://"+target,overrides:undefined}]};
  const out=await auditAccessMetadata({accountId,apiToken,
    fetcher:apiMock({apps:[rewritten]})});
  assert.equal(out.targetApp,"UNIQUE");
  assert.equal(out.appCoverage,"PUBLIC_HOSTNAME");
  assert.equal(out.audience,"VALID_SHAPE_NOT_EXPORTED");
});
test("Workers-level destination is matched only using actual Worker ID",async()=>{
  const workerApp={...app,domain:"unrelated.invalid",
    destinations:[{type:"worker",worker_id:"fake-worker-id"}]};
  let out=await auditAccessMetadata({accountId,apiToken,fetcher:apiMock({apps:[workerApp]})});
  assert.equal(out.targetApp,"UNIQUE");
  assert.equal(out.appCoverage,"WORKER_DESTINATION");
  out=await auditAccessMetadata({accountId,apiToken,
    fetcher:apiMock({apps:[workerApp],workerStatus:403})});
  assert.equal(out.workersApi,"READ_SCOPE_DENIED");
  assert.equal(out.targetApp,"NONE");
});
test("Access destination public overrides never implicitly certify private paths",()=>{
  const risky={...app,domain:target,
    destinations:[{type:"public",uri:target,overrides:[{behavior:"public",path_pattern:"/api/*"}]}]};
  assert.equal(findAppCoveringAllPaths([risky]).length,0);
});
