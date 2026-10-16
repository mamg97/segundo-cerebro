import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source=readFileSync(new URL("./objects.js",import.meta.url),"utf8");
const css=readFileSync(new URL("./styles.css",import.meta.url),"utf8");
function runtime() {
  const context={document:{createElement:()=>({className:"",textContent:"",setAttribute(){}})}};
  vm.createContext(context);
  vm.runInContext(source.replace(/^export /gm,""),context);
  return context;
}
const example={
  looks:[{id:"look-fixture-01",name:"Look with a very long descriptive name that should never explode the image tile",
    photoUrl:"/api/objects/look/look-fixture-01/image?v=abcd1234-5678",
    items:[{objectId:"garment-fixture-01"},{objectId:"garment-fixture-02"}]}],
  wardrobe:[
    {objectId:"garment-fixture-01",thumbnailUrl:"/api/objects/garment-fixture-01/image/thumbnail?v=abc123456"},
    {objectId:"garment-fixture-02",thumbnailUrl:"/api/objects/garment-fixture-02/image/thumbnail?v=abc123456"}
  ]
};

test("look cards use a controlled composed image with no long broken-image alt",()=>{
  const {lookMosaic}=runtime();
  const markup=lookMosaic(example.looks[0],example);
  assert.match(markup,/data-look-composed-image="look-fixture-01"/);
  assert.match(markup,/alt=""/);
  assert.doesNotMatch(markup,/very long descriptive name/);
  assert.match(markup,/\/api\/objects\/look\/look-fixture-01\/image/);
});

test("when a composed look image fails the real member photos replace it, not invented images",()=>{
  const env=runtime();
  const markup=env.lookGarmentMosaic(example.looks[0],example);
  assert.match(markup,/class="look-mosaic"/);
  assert.equal((markup.match(/data-look-fallback-garment/g)||[]).length,2);
  assert.match(markup,/garment-fixture-01/);
  assert.match(markup,/garment-fixture-02/);
  assert.doesNotMatch(markup,/data-look-composed-image/);
  const noImage=env.lookGarmentMosaic({...example.looks[0],items:[]},example);
  assert.match(noImage,/Imagen temporalmente no disponible/);
  assert.doesNotMatch(noImage,/<img/);
});

test("image error handler switches to garment mosaic without changing canonical data",()=>{
  const env=runtime();
  const before=JSON.stringify(example);
  let rendered="",gone=false,perItemHandler=null;
  const child={isConnected:true,complete:false,naturalWidth:0,addEventListener(name,cb){if(name==="error")perItemHandler=cb;},parentElement:{dataset:{}},
    replaceWith(node){this.replaced=node;}};
  const replacement={dataset:{},querySelectorAll(selector){assert.equal(selector,"[data-look-fallback-garment]");return [child];}};
  let composedError=null;
  const img={isConnected:true,complete:false,naturalWidth:0,dataset:{lookComposedImage:"look-fixture-01"},
    addEventListener(name,cb){if(name==="error")composedError=cb;},
    insertAdjacentHTML(where,html){assert.equal(where,"afterend");rendered=html;},
    nextElementSibling:replacement,
    remove(){this.isConnected=false;gone=true;}
  };
  const root={querySelectorAll(selector){
    if(selector==="[data-look-composed-image]")return [img];
    if(selector==="[data-look-fallback-garment]")return [];
    throw Error("unknown selector");
  }};
  env.bindLookImageRecovery(root,example);
  assert.equal(typeof composedError,"function");
  composedError();
  assert.ok(gone);
  assert.match(rendered,/look-mosaic/);
  assert.match(rendered,/garment-fixture-01/);
  assert.equal(replacement.dataset.imageState,"fallback");
  assert.equal(typeof perItemHandler,"function");
  perItemHandler();
  assert.equal(child.replaced.className,"look-mosaic-item-unavailable");
  assert.equal(child.parentElement.dataset.imageState,"unavailable");
  assert.equal(JSON.stringify(example),before);
});

test("all look views bind the same recovery handler and CSS keeps fallback bounded",()=>{
  assert.match(source,/function bind\(payload\)\s*\{[^}]*bindLookImageRecovery\(body,payload\)/);
  assert.match(source,/function detailLook\(look,payload\)[\s\S]*?bindLookImageRecovery\(body,payload\)/);
  assert.match(source,/function lookUsageHistoryView\(payload,mode="looks",sort="recent"\)[\s\S]*?bindLookImageRecovery\(body,payload\)/);
  assert.match(css,/\.look-image-unavailable\s*\{[^}]*font-size:\s*10px/);
  assert.match(css,/\.look-mosaic \.look-mosaic-slot\s*\{[^}]*overflow:\s*hidden/);
  assert.doesNotMatch(source,/onerror\s*=/i);
});
