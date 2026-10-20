import test from "node:test";
import assert from "node:assert/strict";
import {classifyAnonymousResponse,auditAnonymousAccess,CHECKS} from "./audit-psychohistory-anonymous.mjs";

test("unsigned public 200, 204 and 206 are exposure failures",()=>{
  for(const s of [200,204,206])assert.equal(classifyAnonymousResponse(s,null),"EXPOSED");
  assert.equal(classifyAnonymousResponse(404,null),"INCONCLUSIVE");
  assert.equal(classifyAnonymousResponse(503,null),"INCONCLUSIVE");
});
test("Access policy correctly reports only 401 403 or secure login redirects as denial",()=>{
  for(const code of [401,403])assert.equal(classifyAnonymousResponse(code,null),"BLOCKED");
  assert.equal(classifyAnonymousResponse(302,"/cdn-cgi/access/login"),"BLOCKED");
  assert.equal(classifyAnonymousResponse(302,"https://fictional-team.cloudflareaccess.com/cdn-cgi/access/login"),"BLOCKED");
  assert.equal(classifyAnonymousResponse(302,"https://attacker.example.net/steal"),"INCONCLUSIVE");
  assert.equal(classifyAnonymousResponse(302,"http://fictional-team.cloudflareaccess.com/cdn-cgi/access/login"),"INCONCLUSIVE");
  assert.equal(classifyAnonymousResponse(302,"https://segundo-cerebro.mamg97.workers.dev/login"),"INCONCLUSIVE");
});
test("all three protected routes checked without headers or response bodies",async()=>{
  const paths=[];
  const fetcher=async(url,opts)=>{
    paths.push({url,opts});
    return {status:403,headers:new Headers(),body:{cancel:async()=>{}}};
  };
  const r=await auditAnonymousAccess({fetcher});
  assert.equal(r.anonymous_access_denied_everywhere,true);
  assert.equal(paths.length,3);
  assert.deepEqual(r.results.map(x=>x.key),CHECKS.map(x=>x.key));
  for(const {opts} of paths){
    assert.equal(opts.redirect,"manual");
    assert.equal(opts.credentials,undefined);
    assert.equal(opts.headers.Authorization,undefined);
    assert.equal(opts.headers.Cookie,undefined);
  }
  assert.equal(r.response_bodies_read_or_logged,false);
});
test("one lab endpoint publicly accessible makes entire privacy check fail",async()=>{
  let n=0;
  const r=await auditAnonymousAccess({fetcher:async()=>({
    status:++n===1?200:403,headers:new Headers(),body:{cancel:async()=>{}}
  })});
  assert.equal(r.anonymous_access_denied_everywhere,false);
  assert.equal(r.results[0].result,"EXPOSED");
});
test("network failures are inconclusive not PASS",async()=>{
  const r=await auditAnonymousAccess({fetcher:async()=>{throw Error("synthetic DNS failure");}});
  assert.equal(r.anonymous_access_denied_everywhere,false);
  assert.ok(r.results.every(x=>x.result==="INCONCLUSIVE"&&x.status===null));
});
test("cannot be repointed at arbitrary external site",async()=>{
  await assert.rejects(()=>auditAnonymousAccess({baseUrl:"https://attacker.invalid"}));
});
