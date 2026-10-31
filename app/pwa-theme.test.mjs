import test from "node:test";
import assert from "node:assert/strict";
import { privateShellThemeColor, installPrivateShellTheme } from "./pwa-register.mjs";

test("iOS standalone shell uses exact background of the dock for each theme",()=>{
 assert.equal(privateShellThemeColor("dark"),"#0b1728");
 assert.equal(privateShellThemeColor("light"),"#ffffff");
 assert.equal(privateShellThemeColor(undefined),"#0b1728");
});

test("PWA theme follows changes without accessing private app state",()=>{
 let update; let observed;
 const meta={ content:null, setAttribute(key,val){assert.equal(key,"content");this.content=val;} };
 const documentElement={ dataset:{theme:"dark"} };
 const doc={ documentElement,querySelector(){return meta;} };
 class FakeObserver {
   constructor(callback){update=callback;}
   observe(el,opts){observed={el,opts};}
 }
 const observer=installPrivateShellTheme({doc,Observer:FakeObserver});
 assert.ok(observer);
 assert.equal(meta.content,"#0b1728");
 assert.deepEqual(observed.opts,{attributes:true,attributeFilter:["data-theme"]});
 documentElement.dataset.theme="light";
 update();
 assert.equal(meta.content,"#ffffff");
});
