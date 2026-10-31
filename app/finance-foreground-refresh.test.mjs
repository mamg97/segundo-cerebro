import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createFinanceForegroundRefresh} from "./finance-foreground-refresh.mjs";
const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
test("return to foreground refreshes only when ready, with cooldown",async()=>{
  let time=100000,calls=0,visible=true;
  const refresh=createFinanceForegroundRefresh({refresh:async()=>{calls++;return{ok:true}},
    isRemote:()=>true,isReady:()=>true,isVisible:()=>visible,now:()=>time});
  assert.equal(await refresh(),true);assert.equal(await refresh(),false);
  time+=60001;visible=false;assert.equal(await refresh(),false);
  visible=true;assert.equal(await refresh(),true);assert.equal(calls,2);
});
test("private app wiring refreshes finance on focus and visibility without polling",()=>{
  assert.match(app,/createFinanceForegroundRefresh\(\{/);
  assert.match(app,/refresh: \(\) => refreshStateScope\("finance"\)/);
  assert.match(app,/addEventListener\("focus",[^\n]*refreshFinanceOnForeground/);
  assert.match(app,/addEventListener\("visibilitychange",[^\n]*refreshFinanceOnForeground/);
  assert.doesNotMatch(app,/setInterval\(\s*refreshFinanceOnForeground/);
});
