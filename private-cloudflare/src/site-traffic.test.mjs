import test from "node:test";
import assert from "node:assert/strict";
import {cleanSiteInput,cleanDailyInput,TrafficDataError} from "./site-traffic.js";
test("generic labels and route prefixes validate, without exposed site names",()=>{
 assert.deepEqual(cleanSiteInput({label:"Producto A",pathPrefix:"/producto-a/"}),{label:"Producto A",pathPrefix:"/producto-a/"});
 assert.throws(()=>cleanSiteInput({label:"<script>",pathPrefix:"/x/"}),TrafficDataError);
 assert.throws(()=>cleanSiteInput({label:"X",pathPrefix:"https://x.example/"}),TrafficDataError);
 assert.throws(()=>cleanSiteInput({label:"X",pathPrefix:"/x/../"}),TrafficDataError);
});
test("zero visits and positive pageviews must be valid",()=>{
 let v=cleanDailyInput({siteId:"12345678-1234-1234-1234-123456789abc",day:"2026-10-31",visits:0,pageViews:3});
 assert.equal(v.visits,0);assert.equal(v.pageViews,3);
});
test("never transform missing metrics into zero or accept negative/invalid dates",()=>{
 let v=cleanDailyInput({siteId:"12345678-1234-1234-1234-123456789abc",day:"2026-10-31",visits:null,pageViews:3});
 assert.equal(v.visits,null);
 for(const body of [{visits:-1,pageViews:5},{visits:0,pageViews:"3"},{visits:2,pageViews:NaN}]){
  assert.throws(()=>cleanDailyInput({siteId:v.siteId,day:v.day,...body}),TrafficDataError);
 }
 assert.throws(()=>cleanDailyInput({siteId:v.siteId,day:"2026-02-30",visits:1,pageViews:2}),TrafficDataError);
});
