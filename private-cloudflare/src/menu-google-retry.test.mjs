import test from "node:test";
import assert from "node:assert/strict";
import {fetchMenuGoogleRanges} from "./menu-google-retry.js";
test("502 from Google Sheets can recover after bounded retry",async()=>{
 let count=0;const delays=[];
 const response=await fetchMenuGoogleRanges("https://example.invalid","secret",{
  fetcher:async()=>++count===1?{ok:false,status:502}:{ok:true,status:200},
  pause:async ms=>delays.push(ms)
 });
 assert.equal(response.ok,true);assert.equal(count,2);assert.deepEqual(delays,[200]);
});
test("401 is final and never retried",async()=>{
 let count=0;
 await assert.rejects(fetchMenuGoogleRanges("https://example.invalid","secret",{
  fetcher:async()=>{count++;return{ok:false,status:401}},pause:async()=>{}
 }),/HEALTH_MENU_SHEETS_401/);
 assert.equal(count,1);
});
test("persistent 503 remains an error after three attempts",async()=>{
 let count=0;
 await assert.rejects(fetchMenuGoogleRanges("https://example.invalid","secret",{
  fetcher:async()=>{count++;return{ok:false,status:503}},pause:async()=>{}
 }),/HEALTH_MENU_SHEETS_503/);
 assert.equal(count,3);
});
