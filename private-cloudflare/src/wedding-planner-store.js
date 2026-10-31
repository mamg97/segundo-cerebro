// Private D1 wedding guest list + seating. Personal data never leaves authenticated API.
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
 const tableId=x.tableId?uuid(x.tableId):null;
 if(rsvp==="rechazado"&&tableId)throw new PlannerError("DECLINED_SEATING");
 return {name,groupName,rsvp,menu,dietaryNotes,notes,email,phone,tableId};
}
export function validateTable(x){
 if(!x||Array.isArray(x)||typeof x!=="object")throw new PlannerError("INVALID_ITEM");
 const name=field(x.name),capacity=Number(x.capacity),shape=field(x.shape||"redonda",16);
 if(!name||!Number.isInteger(capacity)||capacity<1||capacity>30||!SHAPES.has(shape))throw new PlannerError("INVALID_ITEM");
 return {name,capacity,shape};
}
const guestRow=x=>({id:x.id,name:x.name,groupName:x.group_name,rsvp:x.rsvp,menu:x.menu,dietaryNotes:x.dietary_notes,
 email:x.email,phone:x.phone,notes:x.notes,tableId:x.table_id,revision:x.revision,updatedAt:x.updated_at,updatedBy:x.updated_by});
const tableRow=x=>({id:x.id,name:x.name,capacity:x.capacity,shape:x.shape,revision:x.revision,updatedAt:x.updated_at,updatedBy:x.updated_by,seated:x.seated||0});
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
export async function handleWeddingPlannerRequest(request,env){
 try{
  const actor=actorOf(request),db=env?.DB;
  if(!db?.prepare)throw new PlannerError("STORAGE_UNAVAILABLE",503);
  const url=new URL(request.url),path=url.pathname,method=request.method;
  if(method!=="GET"&&request.headers.get("Origin")!==url.origin)throw new PlannerError("INVALID_ORIGIN",403);
  const match=path.match(/^\/api\/wedding\/(guests|tables)(?:\/([^/]+))?$/);
  if(!match)throw new PlannerError("NOT_FOUND",404);
  const kind=match[1],id=match[2]?uuid(decodeURIComponent(match[2])):null;
  const guests=kind==="guests",table=guests?"wedding_guests":"wedding_tables";
  const select=guests?guestSelect:tableSelect,row=guests?guestRow:tableRow;
  if(!id&&method==="GET"){
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
   const guid=crypto.randomUUID(),now=new Date().toISOString();
   if(guests){
    await db.prepare("INSERT INTO wedding_guests(id,name,group_name,rsvp,menu,dietary_notes,email,phone,notes,table_id,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
     .bind(guid,item.name,item.groupName,item.rsvp,item.menu,item.dietaryNotes,item.email,item.phone,item.notes,item.tableId,now,actor).run();
   }else{
    await db.prepare("INSERT INTO wedding_tables(id,name,capacity,shape,updated_at,updated_by) VALUES(?,?,?,?,?,?)")
     .bind(guid,item.name,item.capacity,item.shape,now,actor).run();
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
   }
   const now=new Date().toISOString();
   const result=guests?
    await db.prepare("UPDATE wedding_guests SET name=?,group_name=?,rsvp=?,menu=?,dietary_notes=?,email=?,phone=?,notes=?,table_id=?,revision=revision+1,updated_at=?,updated_by=? WHERE id=? AND revision=?")
     .bind(item.name,item.groupName,item.rsvp,item.menu,item.dietaryNotes,item.email,item.phone,item.notes,item.tableId,now,actor,id,revision).run():
    await db.prepare("UPDATE wedding_tables SET name=?,capacity=?,shape=?,revision=revision+1,updated_at=?,updated_by=? WHERE id=? AND revision=?")
     .bind(item.name,item.capacity,item.shape,now,actor,id,revision).run();
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
