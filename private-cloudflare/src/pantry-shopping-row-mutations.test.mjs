import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {selectShoppingMutationRow,ShoppingActionError} from "./pantry-shopping-actions.js";
const rows=[
 {row:7,record:{producto_id:"",nombre:"Descafeinado",external_id:"apple-demo",estado:"COMPRAR",updated_at:"v1"}},
 {row:8,record:{producto_id:"sku-caps",nombre:"Cápsulas descafeinadas",external_id:"other",estado:"COMPRAR",updated_at:"v2"}}
];
test("unlinked Apple reminder requires exact external ID and revision",()=>{
 assert.equal(selectShoppingMutationRow(rows,{externalId:"apple-demo",shoppingName:"Descafeinado",updatedAt:"v1",unlinkedOnly:true}).row,7);
 assert.throws(()=>selectShoppingMutationRow(rows,{externalId:"apple-demo",shoppingName:"Descafeinado",updatedAt:"old"}),e=>e instanceof ShoppingActionError&&e.code==="SHOPPING_ROW_CHANGED");
 assert.throws(()=>selectShoppingMutationRow(rows,{externalId:"apple-demo",shoppingName:"Otro",updatedAt:"v1"}),ShoppingActionError);
 assert.throws(()=>selectShoppingMutationRow(rows,{externalId:"other",updatedAt:"v2",unlinkedOnly:true}),ShoppingActionError);
});
test("removal cancels only shopping intent and never changes inventory",()=>{
 const s=readFileSync(new URL("./pantry-shopping-actions.js",import.meta.url),"utf8");
 assert.match(s,/action==="remove"/);
 assert.match(s,/estado:"CANCELADO"/);
 assert.match(s,/Eliminado explícitamente de la lista/);
 const block=s.slice(s.indexOf('if(action==="remove"){'),s.indexOf('const pantry=await fetchPantrySummary',s.indexOf('if(action==="remove"){')));
 assert.doesNotMatch(block,/setInventoryAvailability/);
});
