// Wedding records belong exclusively to private D1; no personal data is embedded here.
export const WEDDING_CATEGORIES=["finca","catering","decoracion","fotografia","musica","invitaciones","vestuario","invitados","ideas","tareas","otros"];
export const WEDDING_STATUSES=["idea","pendiente","contactado","presupuestado","reservado","confirmado","descartado","hecho"];
const CATS=new Set(WEDDING_CATEGORIES),STATES=new Set(WEDDING_STATUSES),ID=/^[a-f0-9-]{36}$/i,MAX_PHOTO=900000;
export class WeddingError extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status;}}
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const bound=(x,n=180)=>{const s=String(x??"").trim();if(s.length>n)throw new WeddingError("TEXT_TOO_LONG");return s;};
const money=x=>{if(x===null||x===undefined||x==="")return null;if(!Number.isSafeInteger(x)||x<0||x>1000000000)throw new WeddingError("INVALID_MONEY");return x;};
export function validateWeddingItem(o){
 if(!o||typeof o!=="object"||Array.isArray(o))throw new WeddingError("INVALID_PAYLOAD");
 const category=bound(o.category,40),status=bound(o.status,40),title=bound(o.title);
 if(!CATS.has(category)||!STATES.has(status)||!title)throw new WeddingError("INVALID_ITEM");
 const url=bound(o.url,600);if(url){let parsed;try{parsed=new URL(url)}catch{throw new WeddingError("INVALID_URL")}if(parsed.protocol!=="https:")throw new WeddingError("INVALID_URL");}
 const dueDate=bound(o.dueDate,10);if(dueDate&&!/^\d{4}-\d\d-\d\d$/.test(dueDate))throw new WeddingError("INVALID_DATE");
 const p={category,status,title,description:bound(o.description,4000),provider:bound(o.provider),url,dueDate:dueDate||null,
  estimateCents:money(o.estimateCents),contractedCents:money(o.contractedCents),paidCents:money(o.paidCents)??0};
 if(p.contractedCents!==null&&p.paidCents>p.contractedCents)throw new WeddingError("PAID_EXCEEDS_CONTRACTED");return p;
}
const SELECT="SELECT i.*,EXISTS(SELECT 1 FROM wedding_photos p WHERE p.item_id=i.id) AS has_photo FROM wedding_items i";
const row=r=>({id:r.id,category:r.category,status:r.status,title:r.title,description:r.description||"",provider:r.provider||"",url:r.url||"",
 estimateCents:r.estimate_cents,contractedCents:r.contracted_cents,paidCents:r.paid_cents,dueDate:r.due_date,
 revision:r.revision,createdBy:r.created_by,updatedBy:r.updated_by,createdAt:r.created_at,updatedAt:r.updated_at,
 photoUrl:r.has_photo?"/api/wedding/items/"+r.id+"/photo":null});
const get=async(db,id)=>{const r=await db.prepare(SELECT+" WHERE i.id=?").bind(id).first();return r?row(r):null;};
const imageSignature=(b,m)=>(m==="image/jpeg"&&b[0]===255&&b[1]===216&&b[2]===255)||(m==="image/png"&&b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71)||(m==="image/webp"&&b[0]===82&&b[1]===73&&b[2]===70&&b[3]===70&&b[8]===87&&b[9]===69);
const validId=x=>{if(!ID.test(x))throw new WeddingError("INVALID_ID");return x;};
const rev=x=>{if(!Number.isSafeInteger(x)||x<1)throw new WeddingError("REVISION_REQUIRED");return x;};
async function jsonInput(request){
 if(!request.headers.get("Content-Type")?.startsWith("application/json"))throw new WeddingError("JSON_REQUIRED",415);
 if(Number(request.headers.get("Content-Length")||0)>12000)throw new WeddingError("TOO_LARGE",413);
 try{return await request.json()}catch{throw new WeddingError("INVALID_JSON");}
}
function requireIdentity(request){
 const email=request.headers.get("Cf-Access-Authenticated-User-Email")||"";
 const jwt=request.headers.get("Cf-Access-Jwt-Assertion")||"";
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||jwt.split(".").length!==3)
  throw new WeddingError("ACCESS_REQUIRED",403);
 return email.toLowerCase();
}
export async function handleWeddingRequest(request,env){
 try{
  const actor=requireIdentity(request),db=env?.DB;
  if(!db?.prepare)throw new WeddingError("STORAGE_UNAVAILABLE",503);
  const url=new URL(request.url),method=request.method,path=url.pathname;
  if(method!=="GET"&&request.headers.get("Origin")!==url.origin)throw new WeddingError("INVALID_ORIGIN",403);
  if(path==="/api/wedding/items"){
   if(method==="GET"){
    const res=await db.prepare(SELECT+" ORDER BY i.updated_at DESC LIMIT 500").all();
    return reply({ok:true,viewer:actor,items:(res.results||[]).map(row)});
   }
   if(method!=="POST")throw new WeddingError("METHOD_NOT_ALLOWED",405);
   const p=validateWeddingItem(await jsonInput(request)),id=crypto.randomUUID(),now=new Date().toISOString();
   await db.prepare("INSERT INTO wedding_items(id,category,status,title,description,provider,url,estimate_cents,contracted_cents,paid_cents,due_date,created_by,updated_by,created_at,updated_at,revision) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)")
    .bind(id,p.category,p.status,p.title,p.description,p.provider,p.url,p.estimateCents,p.contractedCents,p.paidCents,p.dueDate,actor,actor,now,now).run();
   return reply({ok:true,item:await get(db,id)},201);
  }
  const m=path.match(/^\/api\/wedding\/items\/([^/]+)(\/photo)?$/);
  if(!m)throw new WeddingError("NOT_FOUND",404);
  const id=validId(decodeURIComponent(m[1]));
  if(!m[2]){
   if(method==="GET"){const x=await get(db,id);if(!x)throw new WeddingError("NOT_FOUND",404);return reply({ok:true,item:x});}
   if(method==="PATCH"){
    const data=await jsonInput(request),revision=rev(data.revision),p=validateWeddingItem(data),now=new Date().toISOString();
    const result=await db.prepare("UPDATE wedding_items SET category=?,status=?,title=?,description=?,provider=?,url=?,estimate_cents=?,contracted_cents=?,paid_cents=?,due_date=?,updated_by=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?")
      .bind(p.category,p.status,p.title,p.description,p.provider,p.url,p.estimateCents,p.contractedCents,p.paidCents,p.dueDate,actor,now,id,revision).run();
    if(!result.meta?.changes)throw new WeddingError("REVISION_CONFLICT",409);
    return reply({ok:true,item:await get(db,id)});
   }
   if(method==="DELETE"){
    const revision=rev((await jsonInput(request)).revision),current=await get(db,id);
    if(!current)throw new WeddingError("NOT_FOUND",404);
    if(current.revision!==revision)throw new WeddingError("REVISION_CONFLICT",409);
    await db.batch([db.prepare("DELETE FROM wedding_photos WHERE item_id=?").bind(id),db.prepare("DELETE FROM wedding_items WHERE id=? AND revision=?").bind(id,revision)]);
    return reply({ok:true});
   }
   throw new WeddingError("METHOD_NOT_ALLOWED",405);
  }
  if(method==="GET"){
   const meta=await db.prepare("SELECT mime_type,size_bytes FROM wedding_photos WHERE item_id=?").bind(id).first();
   if(!meta)throw new WeddingError("NOT_FOUND",404);
   const size=Number(meta.size_bytes);
   if(!Number.isSafeInteger(size)||size<1||size>MAX_PHOTO)throw new WeddingError("IMAGE_CORRUPT",502);
   const img=new Uint8Array(size);
   for(let offset=0;offset<size;offset+=180000){
    const count=Math.min(180000,size-offset);
    const r=await db.prepare("SELECT HEX(SUBSTR(image_data,?,?)) AS part FROM wedding_photos WHERE item_id=?").bind(offset+1,count,id).first();
    if(typeof r?.part!=="string"||r.part.length!==count*2||!/^[a-f0-9]+$/i.test(r.part))throw new WeddingError("IMAGE_CORRUPT",502);
    for(let i=0;i<count;i++)img[offset+i]=parseInt(r.part.slice(i*2,i*2+2),16);
   }
   return new Response(img,{headers:{"Content-Type":meta.mime_type,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  }
  if(method==="POST"){
   if(!await get(db,id))throw new WeddingError("NOT_FOUND",404);
   if(Number(request.headers.get("Content-Length")||0)>MAX_PHOTO+6000)throw new WeddingError("IMAGE_TOO_LARGE",413);
   if(!request.headers.get("Content-Type")?.startsWith("multipart/form-data"))throw new WeddingError("MULTIPART_REQUIRED",415);
   const file=(await request.formData()).get("file");
   if(!file||typeof file.arrayBuffer!=="function"||file.size<1||file.size>MAX_PHOTO)throw new WeddingError("IMAGE_TOO_LARGE",413);
   const bytes=new Uint8Array(await file.arrayBuffer());if(!imageSignature(bytes,file.type))throw new WeddingError("INVALID_IMAGE");
   const now=new Date().toISOString();
   await db.prepare("INSERT INTO wedding_photos(item_id,mime_type,size_bytes,image_data,uploaded_at,uploaded_by) VALUES(?,?,?,?,?,?) ON CONFLICT(item_id) DO UPDATE SET mime_type=excluded.mime_type,size_bytes=excluded.size_bytes,image_data=excluded.image_data,uploaded_at=excluded.uploaded_at,uploaded_by=excluded.uploaded_by")
    .bind(id,file.type,bytes.length,bytes.buffer,now,actor).run();
   return reply({ok:true,photoUrl:path});
  }
  if(method==="DELETE"){await db.prepare("DELETE FROM wedding_photos WHERE item_id=?").bind(id).run();return reply({ok:true});}
  throw new WeddingError("METHOD_NOT_ALLOWED",405);
 }catch(e){
  if(!(e instanceof WeddingError))console.warn("Wedding store failed",String(e?.name||"UNKNOWN"));
  return reply({ok:false,code:e instanceof WeddingError?e.code:"WEDDING_STORE_FAILED"},e instanceof WeddingError?e.status:502);
 }
}
