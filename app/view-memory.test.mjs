import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calendarSnapshotComplete, createOnDemandViewRefresh } from "./view-memory.mjs";

const healthy = {
  source: { freshness: "live", providers: {
    icloud: { status: "ok-cache", freshness: "live", selectedCalendarCount: 4, matchedCalendarCount: 4 },
    google: { status: "ok", freshness: "live", selectedCalendarCount: 5, matchedCalendarCount: 5 }
  } }
};

test("only complete, matched federated calendar snapshots authorize replacement", () => {
  assert.equal(calendarSnapshotComplete(healthy), true);
  assert.equal(calendarSnapshotComplete(null), false);
  assert.equal(calendarSnapshotComplete({source:{freshness:"degraded",providers:healthy.source.providers}}), false);
  assert.equal(calendarSnapshotComplete({source:{...healthy.source, providers:{...healthy.source.providers,
    icloud:{...healthy.source.providers.icloud,status:"error"}}}}), false);
  assert.equal(calendarSnapshotComplete({source:{...healthy.source, providers:{...healthy.source.providers,
    icloud:{...healthy.source.providers.icloud,matchedCalendarCount:3}}}}), false);
  assert.equal(calendarSnapshotComplete({source:{freshness:"live",providers:{icloud:{status:"not-configured"}}}}), false);
});

test("last good view is reused until stale, with no timer or speculative network reads", async () => {
  let now = 1_000, reads = 0, renders = 0;
  const policy = createOnDemandViewRefresh({freshForMs:300_000,clock:()=>now});
  const run=()=>policy.activate({hasData:true,load:async()=>{reads++;return {events:["synthetic"]};},
    apply:async()=>{renders++;return true;}});
  assert.equal((await run()).status,"verified");
  now+=100_000;
  assert.equal((await run()).status,"cached");
  assert.equal(reads,1);
  assert.equal(renders,1);
  now+=200_000;
  assert.equal((await run()).status,"verified");
  assert.equal(reads,2);
});

test("a missing view revalidates on opening while explicit refresh bypasses freshness",async()=>{
  let now=0,reads=0;
  const p=createOnDemandViewRefresh({clock:()=>now});
  p.markVerified();
  const action=(options={})=>p.activate({...options,load:async()=>{reads++;return true;},apply:()=>true});
  assert.equal((await action({hasData:true})).status,"cached");
  assert.equal((await action({hasData:false})).status,"verified");
  assert.equal((await action({hasData:true,force:true})).status,"verified");
  assert.equal(reads,2);
});

test("failed and incomplete loads preserve the last view, use bounded backoff, and recover", async()=>{
  let now=0, reads=0, displayed=["preserved"];
  const p=createOnDemandViewRefresh({freshForMs:1,retryAfterMs:45_000,clock:()=>now});
  p.markVerified();
  now=10;
  const load=async()=>{reads++;throw Error("offline");};
  assert.equal((await p.activate({hasData:true,load,apply:()=>true})).status,"failed");
  assert.deepEqual(displayed,["preserved"]);
  assert.equal((await p.activate({hasData:false,load,apply:()=>true})).status,"cached");
  assert.equal(reads,1);
  now+=45_000;
  assert.equal((await p.activate({hasData:true,load:async()=>{reads++;return []},apply:()=>false})).status,"partial");
  assert.deepEqual(displayed,["preserved"]);
  now+=45_000;
  assert.equal((await p.activate({hasData:true,load:async()=>{reads++;return ["new"]},
    apply:(next)=>{displayed=next;return true;}})).status,"verified");
  assert.deepEqual(displayed,["new"]);
  assert.equal(reads,3);
});

test("simultaneous activations share one read; no duplicate provider calls", async()=>{
  let start,readCount=0;
  const gate=new Promise(resolve=>{start=resolve;});
  const p=createOnDemandViewRefresh();
  const load=async()=>{readCount++;await gate;return {};};
  const opts={hasData:false,load,apply:()=>true};
  const first=p.activate(opts),second=p.activate(opts);
  start();
  assert.equal((await first).status,"verified");
  assert.equal((await second).status,"verified");
  assert.equal(readCount,1);
});

test("calendar wiring keeps DOM unchanged for identical weeks and revalidates only on entry",()=>{
  const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
  assert.match(app,/const calendarViewRefresh = createOnDemandViewRefresh\(\)/);
  assert.match(app,/weeklyMarkup !== lastRenderedCalendarMarkup \|\| list\.childElementCount !== 7/);
  assert.match(app,/if \(areaId === "area-calendar"\) \{[\s\S]*?void refreshCalendarView\(\)/);
  assert.match(app,/refreshCalendarView\(\{ force: true \}\)/);
  assert.match(app,/!healthy && existingEvents\.length > 0/);
  assert.doesNotMatch(app,/setInterval\([^)]*refreshCalendarView/);
});
