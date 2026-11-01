// A one-shot, private-only parent invite import. This contains NO personal names.
const group="padres_miguel";
export function validateParentImport(payload){
 if(!payload||payload.schema!=="segundo-cerebro.wedding.parent-guests.v1"||
    payload.grupo!==group||!Array.isArray(payload.items)||payload.items.length!==102||
    !Number.isInteger(payload.expectedExisting)||payload.expectedExisting<0||payload.expectedExisting>1000)
  throw new Error("INVALID_PARENTS_IMPORT");
 const items=payload.items.map((row)=>{
  const name=String(row?.name??"").trim(),subgrupo=String(row?.subgrupo??"").trim();
  const rama=row?.rama,prevision=row?.prevision;
  if(!name||name.length>180||!subgrupo||subgrupo.length>90||
     !["mamá","papá"].includes(rama)||!["seguro","dudoso"].includes(prevision))
   throw new Error("INVALID_PARENTS_IMPORT");
  const notes="Previsión de invitación: "+prevision+
   " (no es confirmación de asistencia). Rama "+rama+" · "+subgrupo+".";
  return {name,notes,rama,prevision};
 });
 if(items.filter(x=>x.rama==="mamá").length!==58||
    items.filter(x=>x.rama==="papá").length!==44||
    items.filter(x=>x.prevision==="seguro").length!==92||
    items.filter(x=>x.prevision==="dudoso").length!==10)
  throw new Error("INVALID_PARENTS_IMPORT");
 return {groupName:group,expectedExisting:payload.expectedExisting,items};
}
export function parentImportStatements(db,importData,actor,now,makeId){
 const entries=importData.items.map(({name,notes})=>({
  id:makeId(),name,group_name:group,rsvp:"pendiente",menu:"",
  dietary_notes:"",email:"",phone:"",notes,table_id:null,seat_index:null,
  updated_at:now,updated_by:actor
 }));
 const fields=["id","name","group_name","rsvp","menu","dietary_notes","email","phone",
  "notes","table_id","seat_index","updated_at","updated_by"];
 const statements=[db.prepare("DELETE FROM wedding_guests WHERE group_name=?").bind(group)];
 for(let offset=0;offset<entries.length;offset+=20){
  const chunk=entries.slice(offset,offset+20);
  const query="INSERT INTO wedding_guests("+fields.join(",")+") VALUES "+
   chunk.map(()=>"("+fields.map(()=>"?").join(",")+")").join(",");
  statements.push(db.prepare(query).bind(...chunk.flatMap(row=>fields.map(field=>row[field]))));
 }
 return statements;
}
