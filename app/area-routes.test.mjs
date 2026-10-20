import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {hrefForArea,hrefForTravel,routeFromHash} from "./area-routes.mjs";

test("main areas have independent, stable URLs and a home route",()=>{
  assert.equal(hrefForArea("area-general"),"#/inicio");
  for(const id of ["area-career","area-finance","area-calendar","area-partner","area-family","area-health","area-objects","area-wealth","area-projects","area-travels"]){
    const route=routeFromHash(hrefForArea(id));
    assert.equal(route.areaId,id);
    assert.equal(route.detailId,null);
  }
  assert.equal(routeFromHash("#overview").areaId,"area-general");
  assert.equal(routeFromHash("#/desconocido"),null);
});
test("trip details have shareable URLs, reject invalid paths",()=>{
  const href=hrefForTravel("example-id-2027-06-12");
  assert.equal(routeFromHash(href).detailId,"example-id-2027-06-12");
  assert.equal(routeFromHash("#/viajes/extra/part"),null);
  assert.equal(routeFromHash("#/finanzas/private-id"),null);
  assert.equal(routeFromHash("#/viajes/%"),null);
  assert.equal(routeFromHash("#/viajes/%2F"),null);
});
test("top navbar remains independently available in every route, no authorization bypass",()=>{
  const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
  const css=readFileSync(new URL("./area-routes.css",import.meta.url),"utf8");
  const index=readFileSync(new URL("./index.html",import.meta.url),"utf8");
  assert.match(app,/window\.addEventListener\("hashchange"/);
  assert.match(app,/window\.addEventListener\("popstate"/);
  assert.match(app,/hrefForArea\(area\.id\)/);
  assert.match(app,/window\.addEventListener\("area-route-synced"/);
  assert.match(css,/body\.route-area-active \.sidebar\s*\{[\s\S]*?position:fixed/);
  assert.match(css,/z-index:5000/);
  assert.match(index,/id="copy-area-link"/);
  assert.match(index,/href="\.\/area-routes\.css\?v=0\.1\.0"/);
  assert.doesNotMatch(index,/Cloudflare-Access-Jwt-Assertion|client_secret|private_token/);
});
