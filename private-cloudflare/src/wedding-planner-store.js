// Private D1 wedding guest list + seating. Personal data never leaves authenticated API.
import {validateParentImport,parentImportStatements} from "./wedding-parents-import.mjs";
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RSVPS=new Set(["pendiente","confirmado","rechazado"]);
const MENUS=new Set(["","adulto","infantil","vegetariano","vegano","otro"]);
const SHAPES=new Set(["redonda","rectangular","presidencial"]);
class PlannerError extends Error{constructor(code,status=400){super(code);this.status=status;}}
const json=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers:{"Content-Type":"application/json","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
const field=(input,max=180)=>{const s=String(input??"").trim();if(s.length>max)throw new PlannerError("TEXT_TOO_LONG");return s;};
const uuid=id=>{if(!GUID.test(id||""))throw new PlannerError("INVALID_ID");return id;};
const version=o=>{if(!Number.isSafeInteger(o?.revision)||o.revision<1)throw new PlannerError("REVISION_REQUIRED");return o.revision;};
export function validateGuest(x){
 if(!x||Array.isArray(x)||typeof x!=="object")throw new PlannerError("INVALID_ITEM");
 const name=field(x.name),groupName=field(x.groupName,90),rsvp=field(x.rsvp||"pendiente",16),
  menu=field(x.menu||"",20),dietaryNotes=field(x.dietaryNotes,500),notes=field(x.notes,1000),
  email=field(x.email,254),phone=field(x.phone,40);
 if(!name||!RSVPS.has(rsvp)||!MENUS.has(menu))throw new PlannerError("INVALID_ITEM");
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new PlannerError("INVALID_EMAIL");
 const tableId=x.tableId?uuid(x.tableId):null,seatIndex=x.seatIndex;
 if(rsvp==="rechazado"&&tableId)throw new PlannerError("DECLINED_SEATING");
 if(seatIndex!==undefined&&seatIndex!==null&&(!Number.isInteger(seatIndex)||seatIndex<0||seatIndex>29))
  throw new PlannerError("INVALID_SEAT");
 if(seatIndex!==undefined&&seatIndex!==null&&!tableId)throw new PlannerError("INVALID_SEAT");
 return {name,groupName,rsvp,menu,dietaryNotes,notes,email,phone,tableId,seatIndex};
}
export function validateTable(x){
 if(!x||Array.isArray(x)||typeof x!=="object")throw new PlannerError("INVALID_ITEM");
 const name=field(x.name),capacity=Number(x.capacity),shape=field(x.shape||"redonda",16);
 if(!name||!Number.isInteger(capacity)||capacity<1||capacity>30||!SHAPES.has(shape))throw new PlannerError("INVALID_ITEM");
 const absent=x.positionX===undefined&&x.positionY===undefined;
 const cleared=x.positionX===null&&x.positionY===null;
 if(!absent&&!cleared&&(!Number.isFinite(x.positionX)||!Number.isFinite(x.positionY)||
  x.positionX<0||x.positionX>100||x.positionY<0||x.positionY>100))throw new PlannerError("INVALID_POSITION");
 if(!absent&&!cleared&&(x.positionX===null||x.positionY===null))throw new PlannerError("INVALID_POSITION");
 return {name,capacity,shape,positionX:absent||cleared?null:x.positionX,positionY:absent||cleared?null:x.positionY};
}
const guestRow=x=>({id:x.id,name:x.name,groupName:x.group_name,rsvp:x.rsvp,menu:x.menu,dietaryNotes:x.dietary_notes,
 email:x.email,phone:x.phone,notes:x.notes,tableId:x.table_id,seatIndex:x.seat_index??null,revision:x.revision,updatedAt:x.updated_at,updatedBy:x.updated_by});
const tableRow=x=>({id:x.id,name:x.name,capacity:x.capacity,shape:x.shape,
 positionX:x.position_x??null,positionY:x.position_y??null,
 positionVerified:x.position_verified===1,
 revision:x.revision,updatedAt:x.updated_at,updatedBy:x.updated_by,seated:x.seated||0});
const guestSelect="SELECT * FROM wedding_guests";
const tableSelect="SELECT t.*, (SELECT COUNT(*) FROM wedding_guests g WHERE g.table_id=t.id) AS seated FROM wedding_tables t";
async function parse(request){
 const ct=request.headers.get("Content-Type")||"";
 if(!ct.toLowerCase().startsWith("application/json"))throw new PlannerError("JSON_REQUIRED",415);
 const len=Number(request.headers.get("Content-Length")||0);
 if(len>12000)throw new PlannerError("TOO_LARGE",413);
 try{return await request.json()}catch{throw new PlannerError("INVALID_JSON");}
}
function actorOf(request){
 const actor=request.headers.get("Cf-Access-Authenticated-User-Email")||"";
 const jwt=request.headers.get("Cf-Access-Jwt-Assertion")||"";
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(actor)||actor.length>254||jwt.split(".").length!==3)
  throw new PlannerError("ACCESS_REQUIRED",403);
 return actor.toLowerCase();
}
async function capacityCheck(db,tableId,exceptId=null){
 if(!tableId)return;
 const t=await db.prepare("SELECT capacity FROM wedding_tables WHERE id=?").bind(tableId).first();
 if(!t)throw new PlannerError("TABLE_NOT_FOUND",404);
 const used=await db.prepare("SELECT COUNT(*) AS n FROM wedding_guests WHERE table_id=? AND id!=?").bind(tableId,exceptId||"").first();
 if(Number(used?.n||0)>=t.capacity)throw new PlannerError("TABLE_FULL",409);
}
// Seat assignment is canonical. A missing index chooses the first genuinely
// empty chair; an explicit index must be within capacity and unoccupied.
async function resolveSeat(db,tableId,seatIndex,exceptId=null){
 if(!tableId)return null;
 const t=await db.prepare("SELECT capacity FROM wedding_tables WHERE id=?").bind(tableId).first();
 if(!t)throw new PlannerError("TABLE_NOT_FOUND",404);
 const records=await db.prepare("SELECT seat_index FROM wedding_guests WHERE table_id=? AND id!=? AND seat_index IS NOT NULL")
  .bind(tableId,exceptId||"").all();
 const occupied=new Set((records.results||[]).map(r=>Number(r.seat_index)));
 if(seatIndex!==undefined&&seatIndex!==null){
  if(seatIndex>=t.capacity)throw new PlannerError("INVALID_SEAT");
  if(occupied.has(seatIndex))throw new PlannerError("SEAT_TAKEN",409);
  return seatIndex;
 }
 for(let i=0;i<t.capacity;i++)if(!occupied.has(i))return i;
 throw new PlannerError("TABLE_FULL",409);
}
async function guestWrite(statement){
 try{return await statement.run();}
 catch(error){
  if(/UNIQUE constraint failed|SQLITE_CONSTRAINT/i.test(String(error?.message||"")))
   throw new PlannerError("SEAT_TAKEN",409);
  throw error;
 }
}
export async function handleWeddingPlannerRequest(request,env){
 try{
  const actor=actorOf(request),db=env?.DB;
  if(!db?.prepare)throw new PlannerError("STORAGE_UNAVAILABLE",503);
  const url=new URL(request.url),path=url.pathname,method=request.method;
  if(method!=="GET"&&request.headers.get("Origin")!==url.origin)throw new PlannerError("INVALID_ORIGIN",403);
  if(path==="/api/wedding/guests/import-parents-miguel"){
   if(method!=="POST")throw new PlannerError("METHOD_NOT_ALLOWED",405);
   if(!(request.headers.get("Content-Type")||"").toLowerCase().startsWith("application/json"))
    throw new PlannerError("JSON_REQUIRED",415);
   const raw=await request.text();
   if(raw.length>30000)throw new PlannerError("TOO_LARGE",413);
   let importData;
   try{importData=validateParentImport(JSON.parse(raw));}
   catch{throw new PlannerError("INVALID_PARENTS_IMPORT");}
   const existing=await db.prepare("SELECT COUNT(*) AS n FROM wedding_guests WHERE group_name=?")
    .bind("padres_miguel").first();
   if(Number(existing?.n||0)!==importData.expectedExisting)
    throw new PlannerError("IMPORT_STALE",409);
   // One D1 transaction: a failed INSERT rolls back the scoped deletion.
   const now=new Date().toISOString();
   const statements=parentImportStatements(db,importData,actor,now,()=>crypto.randomUUID());
   await db.batch(statements);
   const check=await db.prepare("SELECT COUNT(*) AS n FROM wedding_guests WHERE group_name=?")
    .bind("padres_miguel").first();
   if(Number(check?.n)!==102)throw new PlannerError("IMPORT_NOT_VERIFIED",502);
   return json({ok:true,imported:102,replaced:importData.expectedExisting});
  }
  const match=path.match(/^\/api\/wedding\/(guests|tables)(?:\/([^/]+))?$/);
  if(!match)throw new PlannerError("NOT_FOUND",404);
  const kind=match[1],id=match[2]?uuid(decodeURIComponent(match[2])):null;
  const guests=kind==="guests",table=guests?"wedding_guests":"wedding_tables";
  const select=guests?guestSelect:tableSelect,row=guests?guestRow:tableRow;
  if(!id&&method==="GET"){
   // Paginate all private records for explicit user-triggered Excel export.
   if(url.searchParams.get("export")==="1"){
    const raw=url.searchParams.get("offset")||"0";
    if(!/^(0|[1-9]\\d{0,5})$/.test(raw)||Number(raw)>20000)throw new PlannerError("INVALID_EXPORT_OFFSET");
    const result=await db.prepare(select+" ORDER BY "+(guests?"name COLLATE NOCASE,id":"t.name COLLATE NOCASE,t.id")+" LIMIT 501 OFFSET ?").bind(Number(raw)).all();
    const data=result.results||[];
    return json({ok:true,items:data.slice(0,500).map(row),hasMore:data.length>500});
   }
   const result=await db.prepare(select+" ORDER BY "+(guests?"name COLLATE NOCASE":"name COLLATE NOCASE")+" LIMIT 1000").all();
   return json({ok:true,items:(result.results||[]).map(row)});
  }
  if(id&&method==="GET"){
   const record=await db.prepare(select+" WHERE "+(guests?"id":"t.id")+"=?").bind(id).first();
   if(!record)throw new PlannerError("NOT_FOUND",404);
   return json({ok:true,item:row(record)});
  }
  if(!id&&method==="POST"){
   const body=await parse(request),item=guests?validateGuest(body):validateTable(body);
   if(guests)await capacityCheck(db,item.tableId);
   const seatIndex=guests?await resolveSeat(db,item.tableId,item.seatIndex):null;
   const guid=crypto.randomUUID(),now=new Date().toISOString();
   if(guests){
    await guestWrite(db.prepare("INSERT INTO wedding_guests(id,name,group_name,rsvp,menu,dietary_notes,email,phone,notes,table_id,seat_index,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)")
     .bind(guid,item.name,item.groupName,item.rsvp,item.menu,item.dietaryNotes,item.email,item.phone,item.notes,item.tableId,seatIndex,now,actor));
   }else{
    await db.prepare("INSERT INTO wedding_tables(id,name,capacity,shape,position_x,position_y,position_verified,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,?,?)")
     .bind(guid,item.name,item.capacity,item.shape,item.positionX,item.positionY,
      item.positionX!==null&&item.positionY!==null?1:0,now,actor).run();
   }
   const result=await db.prepare(select+" WHERE "+(guests?"id":"t.id")+"=?").bind(guid).first();
   return json({ok:true,item:row(result)},201);
  }
  if(id&&method==="PATCH"){
   const body=await parse(request),revision=version(body),item=guests?validateGuest(body):validateTable(body);
   if(guests)await capacityCheck(db,item.tableId,id);
   else{
    const count=await db.prepare("SELECT COUNT(*) AS n FROM wedding_guests WHERE table_id=?").bind(id).first();
    if(Number(count?.n||0)>item.capacity)throw new PlannerError("CAPACITY_BELOW_SEATED",409);
    const invalid=await db.prepare("SELECT 1 AS invalid FROM wedding_guests WHERE table_id=? AND seat_index>=? LIMIT 1").bind(id,item.capacity).first();
    if(invalid)throw new PlannerError("CAPACITY_BELOW_SEATED",409);
   }
   let seatIndex=null;
   if(guests){
    const current=await db.prepare("SELECT table_id,seat_index FROM wedding_guests WHERE id=? AND revision=?").bind(id,revision).first();
    if(!current)throw new PlannerError("REVISION_CONFLICT",409);
    const requested=item.seatIndex===undefined&&current.table_id===item.tableId?current.seat_index:item.seatIndex;
    seatIndex=await resolveSeat(db,item.tableId,requested,id);
   }
   const now=new Date().toISOString();
   const result=guests?
    await guestWrite(db.prepare("UPDATE wedding_guests SET name=?,group_name=?,rsvp=?,menu=?,dietary_notes=?,email=?,phone=?,notes=?,table_id=?,seat_index=?,revision=revision+1,updated_at=?,updated_by=? WHERE id=? AND revision=?")
     .bind(item.name,item.groupName,item.rsvp,item.menu,item.dietaryNotes,item.email,item.phone,item.notes,item.tableId,seatIndex,now,actor,id,revision)):
    await db.prepare("UPDATE wedding_tables SET name=?,capacity=?,shape=?,position_x=COALESCE(?,position_x),position_y=COALESCE(?,position_y),position_verified=CASE WHEN ? IS NOT NULL AND ? IS NOT NULL THEN 1 ELSE position_verified END,revision=revision+1,updated_at=?,updated_by=? WHERE id=? AND revision=?")
     .bind(item.name,item.capacity,item.shape,item.positionX,item.positionY,item.positionX,item.positionY,now,actor,id,revision).run();
   if(!result.meta?.changes)throw new PlannerError("REVISION_CONFLICT",409);
   const updated=await db.prepare(select+" WHERE "+(guests?"id":"t.id")+"=?").bind(id).first();
   return json({ok:true,item:row(updated)});
  }
  if(id&&method==="DELETE"){
   const revision=version(await parse(request));
   if(!guests){
    const filled=await db.prepare("SELECT COUNT(*) AS n FROM wedding_guests WHERE table_id=?").bind(id).first();
    if(Number(filled?.n||0)>0)throw new PlannerError("TABLE_HAS_GUESTS",409);
   }
   const result=await db.prepare("DELETE FROM "+table+" WHERE id=? AND revision=?").bind(id,revision).run();
   if(!result.meta?.changes)throw new PlannerError("REVISION_CONFLICT",409);
   return json({ok:true});
  }
  throw new PlannerError("METHOD_NOT_ALLOWED",405);
 }catch(error){
  if(!(error instanceof PlannerError))console.warn("Private wedding planner error",String(error?.name||"UNKNOWN"));
  return json({ok:false,code:error instanceof PlannerError?error.message:"WEDDING_PLANNER_FAILED"},
   error instanceof PlannerError?error.status:502);
 }
}
