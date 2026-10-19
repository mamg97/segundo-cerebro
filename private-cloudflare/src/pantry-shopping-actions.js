// All purchasing changes reuse canonical Pantry Sheets and the existing
// EventKit/Apple bridge. No parallel shopping list or invented stock quantities.
import {
  fetchPantrySummary,readPantryShoppingSheet,updatePantryShoppingRow,
  appendPantryShoppingRow,resolvePantrySpreadsheetId,invalidatePantryCache,
  normalizePantryProductName
} from "./pantry.js";
import {records,derivePendingMenuNeeds,planAutoShoppingChanges} from "./shopping-menu-needs.js";
import {googleReadFetch} from "./google-read.js";

export class ShoppingActionError extends Error {
  constructor(code,status=409){super(code);this.code=code;this.status=status;}
}
const fail=(code,status)=>{throw new ShoppingActionError(code,status);};
const nowIso=()=>new Date().toISOString();
const madridDateKey=()=>{
  const parts=new Intl.DateTimeFormat("en-GB",{
    timeZone:"Europe/Madrid",year:"numeric",month:"2-digit",day:"2-digit"
  }).formatToParts(new Date());
  const get=type=>parts.find(x=>x.type===type)?.value;
  return get("year")+"-"+get("month")+"-"+get("day");
};
const headersNeeded=["inventario_id","producto_id","nombre","ubicacion","cantidad_aprox",
  "unidad_stock","nivel_stock","abierto","caducidad_visible","confianza","origen","ultima_revision","notas"];
function googleUrl(id,ending){
  return "https://sheets.googleapis.com/v4/spreadsheets/"+encodeURIComponent(id)+ending;
}
async function readBatch(id,token,ranges){
  const params=new URLSearchParams({majorDimension:"ROWS",valueRenderOption:"UNFORMATTED_VALUE"});
  for(const range of ranges)params.append("ranges",range);
  const response=await googleReadFetch(googleUrl(id,"/values:batchGet?"+params),{
    headers:{Authorization:"Bearer "+token}
  },{attempts:2,baseDelayMs:600});
  if(!response?.ok)fail("SHOPPING_SOURCE_READ_FAILED",502);
  return (await response.json()).valueRanges?.map(x=>x.values||[])||[];
}
async function writeFixed(id,token,updates){
  if(!updates.length)return;
  const response=await fetch(googleUrl(id,"/values:batchUpdate"),{
    method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({valueInputOption:"RAW",data:updates})
  });
  if(!response.ok)fail("SHOPPING_UPDATE_FAILED",502);
}
const indexToColumn=index=>{
  let number=index+1,s="";
  while(number){number--;s=String.fromCharCode(65+number%26)+s;number=Math.floor(number/26);}
  return s;
};
const cell=(tab,row,header,key,value)=>{
  const index=header.indexOf(key);
  if(index<0)fail("SHOPPING_SCHEMA_UNSUPPORTED");
  return {range:tab+"!"+indexToColumn(index)+row,majorDimension:"ROWS",values:[[value]]};
};
function checkedProduct(pantry,id){
  const product=(pantry?.products||[]).find(p=>p.id===id);
  if(!product)fail("PRODUCT_NOT_FOUND",404);
  return product;
}
function chooseShoppingRow(rows,id,providedId=null,shoppingName=null){
  const selected=rows.filter(x=>
    String(x.record.estado||"").toUpperCase()==="COMPRAR" &&
    (!providedId||x.record.external_id===providedId) &&
    (x.record.producto_id===id ||
      (shoppingName && !x.record.producto_id &&
       normalizePantryProductName(x.record.nombre)===normalizePantryProductName(shoppingName))));
  if(selected.length>1)fail("AMBIGUOUS_SHOPPING_ROWS");
  return selected[0]||null;
}
function shoppingRecord(product,id,now,{source,reason,quantity=null,unit=""}={}){
  return {
    producto_id:product.id,nombre:product.name,estado:"COMPRAR",prioridad:"alta",
    cantidad_objetivo:quantity??"",unidad:unit,motivo:reason||"Necesario",
    precio_estimado:"",coste_estimado:"",fuente:source,updated_at:now,
    external_id:id,normalized_name:normalizePantryProductName(product.name),
    apple_completed:false,segundo_cerebro_modified_at:now,sync_status:"pending"
  };
}
function updatedShoppingRecord(previous,now,patch){
  return {...previous,...patch,updated_at:now,segundo_cerebro_modified_at:now,
    sync_status:"pending",sync_error:""};
}
export async function setInventoryAvailability(env,auth,product,{available,now}){
  const token=await auth(env),spreadsheetId=await resolvePantrySpreadsheetId(env,auth);
  const [values]=await readBatch(spreadsheetId,token,["Inventario!A1:M2000"]);
  const header=(values[0]||[]).map(x=>String(x??""));
  if(!headersNeeded.every(x=>header.includes(x)))fail("INVENTORY_SCHEMA_UNSUPPORTED");
  const matches=records(values).filter(x=>x.data.producto_id===product.id);
  if(matches.length>1)fail("INVENTORY_PRODUCT_AMBIGUOUS");
  const r=matches[0],row=r?.row||Math.max(2,values.length+1);
  if(row>2000)fail("INVENTORY_SHEET_CAPACITY",409);
  const current=r?.data||{};
  const oldQuantity=current.cantidad_aprox;
  const keptQuantity=available && oldQuantity!=="0" && oldQuantity!==0 &&
    String(current.nivel_stock||"").toLowerCase()!=="agotado" ? oldQuantity : "";
  const changes={
    inventario_id:current.inventario_id||"inv-web-"+crypto.randomUUID().slice(0,14),
    producto_id:product.id,nombre:current.nombre||product.name,
    nivel_stock:available?"medio":"agotado",cantidad_aprox:available?keptQuantity:"",
    unidad_stock:available?current.unidad_stock||"":"",
    confianza:"alta",origen:"confirmación explícita desde lista de compra",
    ultima_revision:now.slice(0,10),
    notas:(available?"Disponible en despensa":"Agotado: añadido para comprar")+
      " · confirmado "+now+"; cantidad exacta sin confirmar."
  };
  await writeFixed(spreadsheetId,token,Object.entries(changes).map(([key,val])=>cell("Inventario",row,header,key,val)));
  invalidatePantryCache();
  return {inventoryRow:row,stockStatus:available?"medium":"out"};
}
export async function performShoppingAction(request,env,auth){
  let payload;
  try{payload=await request.json();}catch{fail("INVALID_JSON",400);}
  const action=String(payload?.action||"");
  if(!["add","available"].includes(action))fail("INVALID_SHOPPING_ACTION",400);
  const id=String(payload?.productId||"");
  if(!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(id))fail("INVALID_PRODUCT_ID",400);
  const pantry=await fetchPantrySummary(env,auth);
  if(!pantry.value)fail("PANTRY_UNAVAILABLE",503);
  const product=checkedProduct(pantry.value,id);
  const sheet=await readPantryShoppingSheet(env,auth);
  const active=chooseShoppingRow(sheet.rows,id,payload.externalId||null,
    action==="available"?String(payload.shoppingName||""):null);
  const date=nowIso();
  const quantity=payload.quantity==null||payload.quantity===""?null:Number(payload.quantity);
  if(quantity!==null&&(!Number.isFinite(quantity)||quantity<=0||quantity>10000))
    fail("INVALID_PURCHASE_QUANTITY",400);
  if(action==="add"){
    if(active) return {ok:true,action:"add",alreadyListed:true,productId:id};
    // The user has explicitly said stock is missing. This is stronger than
    // a stale inventory observation, and records no fictitious quantity.
    await setInventoryAvailability(env,auth,product,{available:false,now:date});
    const old=sheet.rows.filter(row=>row.record.producto_id===id &&
      ["CANCELADO","COMPRADO","REVISAR"].includes(String(row.record.estado||"").toUpperCase()));
    const record=old.length===1?
      updatedShoppingRecord(old[0].record,date,{
        estado:"COMPRAR",cantidad_objetivo:quantity??"",unidad:String(payload.unit||"").slice(0,70),
        motivo:"Añadido manualmente · falta en despensa",fuente:"web-manual",
        apple_completed:false
      }) :
      shoppingRecord(product,"web-"+crypto.randomUUID(),date,{
        source:"web-manual",reason:"Añadido manualmente · falta en despensa",
        quantity,unit:String(payload.unit||"").slice(0,70)
      });
    if(old.length===1)await updatePantryShoppingRow(sheet,old[0].rowNumber,record);
    else await appendPantryShoppingRow(sheet,record);
    return {ok:true,action:"add",productId:id,alreadyListed:false,
      appleSync:"pending_macos_bridge"};
  }
  if(!active)fail("ACTIVE_SHOPPING_ROW_NOT_FOUND",409);
  if(payload.updatedAt && String(active.record.updated_at||"")!==String(payload.updatedAt))
    fail("SHOPPING_ROW_CHANGED",409);
  // "Ya está en despensa" is not a purchase: CANCELADO completes the linked
  // Apple reminder when the Mac agent next runs. Do not mark COMPRADO.
  await setInventoryAvailability(env,auth,product,{available:true,now:date});
  await updatePantryShoppingRow(sheet,active.rowNumber,
    updatedShoppingRecord(active.record,date,{estado:"CANCELADO",producto_id:product.id,
      motivo:"Disponible en despensa (confirmación explícita)",
      fuente:"web-inventory-confirmation"}));
  return {ok:true,action:"available",productId:id,appleSync:"pending_macos_bridge"};
}
export async function reconcileMenuShopping(env,auth,{today,limit=12}={}){
  if(!env.HEALTH_SHEET_ID)fail("HEALTH_NOT_CONFIGURED",503);
  const date=today||madridDateKey();
  const pantry=await fetchPantrySummary(env,auth);
  if(!pantry.value)fail("PANTRY_NOT_CONFIGURED",503);
  const token=await auth(env);
  const [menu,recipes,ingredients]=await readBatch(env.HEALTH_SHEET_ID,token,[
    "MenuSemanal!A1:R2000","Recetas!A1:Q1000","IngredientesReceta!A1:L5000"
  ]);
  // A truncated or schema-broken read must NEVER cancel active shopping needs.
  if(!menu[0]?.includes("fecha")||!menu[0]?.includes("estado")||
     !menu[0]?.includes("recipe_id")||!recipes[0]?.includes("recipe_id")||
     !ingredients[0]?.includes("producto_id")||
     menu.length>=2000||recipes.length>=1000||ingredients.length>=5000)
    fail("MENU_SHOPPING_SOURCE_INCOMPLETE",503);
  const derived=derivePendingMenuNeeds({menu,recipes,ingredients},pantry.value,date);
  const sheet=await readPantryShoppingSheet(env,auth);
  const actions=planAutoShoppingChanges(derived,sheet.rows,nowIso());
  const max=Math.min(Math.max(Number(limit)||12,1),25);
  let written=0;
  for(const action of actions.slice(0,max)){
    if(action.type==="create"){
      const p=checkedProduct(pantry.value,action.need.productId);
      await appendPantryShoppingRow(sheet,shoppingRecord(p,"menu-"+crypto.randomUUID(),action.now,{
        source:"menu-pendiente-auto",
        reason:"Menú pendiente: "+action.need.mealCount+" ingrediente(s)/toma(s)",
        quantity:action.need.shortfallGrams,unit:action.need.shortfallGrams===null?"":"g aprox."
      }));
    }else if(action.type==="cancel"){
      await updatePantryShoppingRow(sheet,action.row.rowNumber,
        updatedShoppingRecord(action.row.record,action.now,{
          estado:"CANCELADO",motivo:"Ya no falta para menús pendientes (reconciliación)",
          fuente:"menu-pendiente-auto"
        }));
    }
    written++;
  }
  return {ok:true,checked:derived.needs.length,changed:written,
    pending:Math.max(0,actions.length-written),diagnostics:derived.diagnostics,
    review:derived.needs.filter(x=>x.classification==="review"),
    appleSync:"pending_macos_bridge"};
}
