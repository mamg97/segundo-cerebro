import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {VIDEO_STORIES,VIDEO_DURATION,videoStoryboard,videoStudioCapabilities,drawVideoFrame} from "./research-video-studio.mjs";

test("both audiovisual stories are educational, complete and exactly 45 seconds",()=>{
  assert.equal(VIDEO_STORIES.length,2);
  assert.equal(VIDEO_DURATION,45);
  for(const story of VIDEO_STORIES){
    assert.match(story.label,/DIVULGACIÓN|MÉTODO CIENTÍFICO/);
    const scenes=videoStoryboard(story);
    assert.equal(scenes.length,7);
    assert.ok(scenes.every(s=>s.title.length>5 && s.duration>=6 && s.duration<=7));
    assert.ok(Math.abs(scenes.reduce((a,s)=>a+s.duration,0)-45)<1e-6);
  }
});
test("studio cannot claim private data or silently invoke external services",()=>{
  const js=readFileSync(new URL("./research-video-studio.mjs",import.meta.url),"utf8");
  const css=readFileSync(new URL("./research-video-studio.css",import.meta.url),"utf8");
  const html=readFileSync(new URL("./research-lab.html",import.meta.url),"utf8");
  const host=readFileSync(new URL("./research-lab.js",import.meta.url),"utf8");
  assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|PsicoPredicciones|https?:\/\//i);
  assert.match(js,/NO ES UN PRONÓSTICO/);
  assert.match(js,/sin datos reales/i);
  assert.match(js,/MediaRecorder/);
  assert.match(js,/captureStream/);
  assert.match(html,/data-view="video">Estudio audiovisual/);
  assert.match(html,/research-video-studio.css/);
  assert.match(host,/mountResearchVideoStudio/);
  assert.match(host,/activeView==="video"/);
  assert.match(host,/disposeVideo\(\)/);
  assert.doesNotMatch(html,/\sstyle\s*=/i);
  assert.match(css,/@media\(max-width:850px\)/);
});
test("canvas preview renders every educational scene with fake canvas",()=>{
  const calls={fillText:0};
  const ctx=new Proxy({},{
    get(_obj,key){return key==="fillText"?()=>{calls.fillText++}:()=>{}},
    set(){return true;}
  });
  for(const story of VIDEO_STORIES){
    let offset=0;
    for(const scene of story.scenes){
      assert.doesNotThrow(()=>drawVideoFrame(ctx,offset+.25,story),scene[0]);
      offset+=scene[3];
    }
    assert.doesNotThrow(()=>drawVideoFrame(ctx,44.999,story));
  }
  assert.ok(calls.fillText>40);
});
test("preview remains available when browser does not offer recording",()=>{
  const env={HTMLCanvasElement:class {captureStream(){}}};
  assert.equal(videoStudioCapabilities(env).preview,true);
  assert.equal(videoStudioCapabilities(env).record,false);
  assert.equal(videoStudioCapabilities({...env,MediaRecorder:class{}}).record,true);
  assert.equal(videoStudioCapabilities({}).preview,false);
});
