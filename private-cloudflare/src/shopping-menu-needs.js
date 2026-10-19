// Derived, read-only cross-domain shopping demand. Canonical sources stay
// Health/MenuSemanal/IngredientesReceta and Pantry/Productos/Inventario/ListaCompra.
import { canonicalWeeklyMenuMoment, dedupeWeeklyMenuRows } from "./weekly-menu.js";
import { findPantryProductExact, normalizePantryProductName } from "./pantry.js";
const norm=v=>String(v??"").trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const num=v=>v==null||v===""?null:Number.isFinite(Number(v))?Number(v):null;
export const records=values=>{
  const h=(values?.[0]||[]).map(x=>String(x||"").trim());
  return (values||[]).slice(1).map((cells,index)=>({
    row:index+2,
    data:Object.fromEntries(h.map((k,i)=>[k,cells[i]??""]))
  })).filter(x=>Object.values(x.data).some(v=>v!==""&&v!=null));
};
const eligible=row=>{
  const status=norm(row.estado);
  return ["planificado","pendiente"].includes(status);
};
export function derivePendingMenuNeeds(source,pantry,today){
  const products=pantry?.products||[];
  const inventory=pantry?.items||[];
  const ingredients=records(source.ingredients);
  const recipeRows=records(source.recipes);
  const recipeById=new Map(recipeRows.map(r=>[String(r.data.recipe_id),r.data]));
  const ingredientsById=new Map();
  for(const ingredient of ingredients){
    const id=String(ingredient.data.recipe_id||"");
    if(!ingredientsById.has(id))ingredientsById.set(id,[]);
    ingredientsById.get(id).push(ingredient.data);
  }
  const menu=dedupeWeeklyMenuRows(records(source.menu).map(({data,row})=>({
    sourceRow:row,date:String(data.fecha||""),moment:canonicalWeeklyMenuMoment({
      moment:data.momento,name:data.nombre,note:data.nota
    }),recipeId:String(data.recipe_id||""),foodId:String(data.food_id||""),
    status:data.estado,quantity:data.cantidad,unit:data.unidad,name:data.nombre,
    updatedAt:data.updated_at,note:data.nota
  }))).filter(x=>x.date>=today && eligible({estado:x.status}));
  const aggregate=new Map();
  const diagnostics={menuPending:menu.length,ingredientLinksMissing:0,stockUnknown:0,unitUnknown:0};
  function add(productId, name, grams, from){
    if(!productId||!products.some(x=>x.id===productId))return;
    if(!aggregate.has(productId)){
      const product=products.find(x=>x.id===productId);
      const matchLabels=[product?.name,...(product?.familyNames||[])]
        .filter(label=>label && findPantryProductExact(products,label)?.id===productId)
        .map(normalizePantryProductName);
      aggregate.set(productId,{
        productId,name,matchLabels,requiredGrams:0,gramsKnown:true,mealCount:0,sources:new Set()
      });
    }
    const item=aggregate.get(productId);
    if(grams===null)item.gramsKnown=false;
    else item.requiredGrams+=grams;
    item.mealCount++;
    item.sources.add(from);
  }
  for(const meal of menu){
    if(meal.foodId){
      const p=products.find(x=>x.id===meal.foodId);
      if(p)add(p.id,p.name,null,meal.date);
      else diagnostics.ingredientLinksMissing++;
      continue;
    }
    if(!meal.recipeId)continue;
    const recipe=recipeById.get(meal.recipeId);
    const baseServings=num(recipe?.raciones);
    const qty=num(meal.quantity);
    const unit=norm(meal.unit);
    const factor=qty!==null&&qty>0 && baseServings>0
      ? /raci/.test(unit)?qty/baseServings:/compartid/.test(unit)?qty:null : null;
    const parts=ingredientsById.get(meal.recipeId)||[];
    if(!parts.length)diagnostics.ingredientLinksMissing++;
    for(const part of parts){
      const product=part.producto_id
        ? products.find(x=>x.id===String(part.producto_id))||null
        : findPantryProductExact(products,part.ingrediente);
      if(!product){diagnostics.ingredientLinksMissing++;continue;}
      const raw=num(part.gramos_estimados);
      const grams=factor===null||raw===null||raw<0 ? null : raw*factor;
      if(grams===null)diagnostics.unitUnknown++;
      add(product.id,product.name,grams,meal.date);
    }
  }
  const needs=[];
  for(const entry of aggregate.values()){
    const stock=inventory.filter(x=>x.productId===entry.productId);
    const out=stock.length>0&&stock.every(x=>x.stockStatus==="out");
    const available=stock.some(x=>["sufficient","medium"].includes(x.stockStatus));
    const gramsStock=stock.length>0 && stock.every(x=>x.quantityUnit && /^g(ramos?)?$/i.test(String(x.quantityUnit).trim()) &&
      num(x.quantity)!==null) ?
      stock.reduce((sum,x)=>sum+Number(x.quantity),0):null;
    let classification="review",shortfall=null;
    if(out){classification="buy";shortfall=entry.gramsKnown?entry.requiredGrams:null;}
    else if(entry.gramsKnown && gramsStock!==null){
      shortfall=Math.max(0,entry.requiredGrams-gramsStock);
      classification=shortfall>0?"buy":"available";
    }else if(available)classification="available";
    if(classification==="review")diagnostics.stockUnknown++;
    needs.push({
      productId:entry.productId,name:entry.name,classification,
      requiredGrams:entry.gramsKnown?Math.round(entry.requiredGrams*10)/10:null,
      shortfallGrams:shortfall===null?null:Math.round(shortfall*10)/10,
      mealCount:entry.mealCount,dates:[...entry.sources].sort()
    });
  }
  return {needs,diagnostics};
}
// Automatic purchasing touches only rows owned by the menu rule.
// Manually added Apple/Web rows must survive even when a meal is consumed.
export function planAutoShoppingChanges(derived,shoppingRows,now){
  const active=shoppingRows.filter(x=>String(x.record.estado||"").toUpperCase()==="COMPRAR");
  const actions=[];
  for(const item of derived.needs){
    const matched=active.filter(x=>x.record.producto_id===item.productId ||
      (!x.record.producto_id && item.matchLabels?.includes(
        normalizePantryProductName(x.record.nombre))));
    if(item.classification==="buy"){
      if(!matched.length){
        const prior=shoppingRows.filter(x=>x.record.producto_id===item.productId &&
          String(x.record.fuente||"")==="menu-pendiente-auto" &&
          ["CANCELADO","COMPRADO"].includes(String(x.record.estado||"").toUpperCase()));
        // A previously purchased or explicitly cancelled row is not silently
        // resurrected; only the explicit user/Apple workflow can restore it.
        if(!prior.length)actions.push({type:"create",need:item,now});
      }
    }
  }
  for(const row of active){
    if(String(row.record.fuente||"")!=="menu-pendiente-auto")continue;
    const current=derived.needs.find(n=>n.productId===row.record.producto_id);
    if(!current||current.classification==="available")
      actions.push({type:"cancel",row,now});
  }
  return actions;
}
