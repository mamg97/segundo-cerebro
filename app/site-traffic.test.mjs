import test from "node:test";
import assert from "node:assert/strict";
import {computeTraffic,sumKnown,displayCount} from "./site-traffic.mjs";
test("missing reads are never zero",()=>{
 assert.equal(displayCount(null),"—");
 assert.equal(sumKnown([],"visits"),null);
 assert.equal(sumKnown([{visits:null}],"visits"),null);
 assert.equal(sumKnown([{visits:0},{visits:2}],"visits"),2);
});
test("comparison honors site IDs and retains zero visits",()=>{
 const model=computeTraffic({sites:[{id:"a",label:"A"},{id:"b",label:"B"}],
 daily:[{siteId:"a",day:new Date().toISOString().slice(0,10),visits:0,pageViews:3},
 {siteId:"b",day:new Date().toISOString().slice(0,10),visits:null,pageViews:4}]});
 assert.equal(model.visits,0);
 assert.equal(model.views,7);
 assert.equal(model.sites[0].visits,0);
 assert.equal(model.sites[1].visits,null);
});
test("no site names or URLs are preloaded in user-facing code",()=>{
 const model=computeTraffic({sites:[],daily:[]});
 assert.equal(model.sites.length,0);assert.equal(model.visits,null);
});
