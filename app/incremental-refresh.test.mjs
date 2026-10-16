import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource=fs.readFileSync(new URL("./app.js",import.meta.url),"utf8");
const workerSource=fs.readFileSync(new URL("../private-cloudflare/src/index.js",import.meta.url),"utf8");

test("manual refresh is incremental and does not reload the page",()=>{
  assert.equal(appSource.includes("window.location.reload()"),false);
  for(const scope of ["finance","habits","pantry","objects"]){
    assert.equal(appSource.includes('refreshStateScope("'+scope+'")'),true);
  }
  // Agenda uses the same scoped endpoint via the on-demand, force-refresh path.
  assert.match(appSource,/refreshCalendarView\(\{ force: true \}\)/);
  assert.match(appSource,/fetchStateScope\("calendar"\)/);
});

test("worker exposes scoped state reads used by incremental Home refresh",()=>{
  assert.match(workerSource,/url\.searchParams\.get\("scope"\)/);
  for(const scope of ["finance","habits","pantry","objects","calendar"]){
    assert.equal(workerSource.includes('stateScope === "'+scope+'"'),true);
  }
});
