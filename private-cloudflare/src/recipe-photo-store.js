// Recipe media is private and immutable per version. File bytes never enter git/Drive links.
export class RecipePhotoError extends Error {
  constructor(code,status=400){super(code);this.code=code;this.status=status;}
}
export const MAX_RECIPE_PHOTO=900_000;
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/;
const validId=id=>{if(!ID.test(String(id||"")))throw new RecipePhotoError("RECIPE_PHOTO_BAD_ID");return id};
function dbOf(env){if(!env?.DB?.prepare)throw new RecipePhotoError("RECIPE_PHOTO_STORAGE_UNAVAILABLE",503);return env.DB;}
export function validateRecipePhotoBytes(bytes,type){
 if(!["image/jpeg","image/png","image/webp"].includes(type))throw new RecipePhotoError("RECIPE_PHOTO_TYPE",415);
 if(bytes.length<12||bytes.length>MAX_RECIPE_PHOTO)throw new RecipePhotoError("RECIPE_PHOTO_SIZE",413);
 const b=bytes;
 const valid=type==="image/jpeg"?(b[0]===255&&b[1]===216&&b[2]===255):
  type==="image/png"?(b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10):
  b[0]===82&&b[1]===73&&b[2]===70&&b[3]===70&&b[8]===87&&b[9]===69&&b[10]===66&&b[11]===80;
 if(!valid)throw new RecipePhotoError("RECIPE_PHOTO_SIGNATURE",415);
 return bytes;
}
export async function readRecipePhotoFile(file){
 if(!file||typeof file.arrayBuffer!=="function")return null;
 if(file.size<12||file.size>MAX_RECIPE_PHOTO)throw new RecipePhotoError("RECIPE_PHOTO_SIZE",413);
 const bytes=new Uint8Array(await file.arrayBuffer());
 return {bytes:validateRecipePhotoBytes(bytes,file.type),type:file.type};
}
export async function hasRecipePhoto(env,id){
 const row=await dbOf(env).prepare("SELECT recipe_id FROM recipe_photo_versions WHERE recipe_id=?").bind(validId(id)).first();
 return Boolean(row);
}
export async function saveRecipeVersionPhoto(env,{fromId,toId,photo,now}){
 const db=dbOf(env);validId(fromId);validId(toId);
 if(photo){
  await db.prepare("INSERT INTO recipe_photo_versions(recipe_id,mime_type,size_bytes,image_data,created_at,origin_recipe_id) VALUES(?,?,?,?,?,?)")
   .bind(toId,photo.type,photo.bytes.length,photo.bytes.buffer,now,fromId).run();
 }else{
  await db.prepare("INSERT INTO recipe_photo_versions(recipe_id,mime_type,size_bytes,image_data,created_at,origin_recipe_id) SELECT ?,mime_type,size_bytes,image_data,?,? FROM recipe_photo_versions WHERE recipe_id=?")
   .bind(toId,now,fromId,fromId).run();
 }
}
export async function deleteRecipeVersionPhoto(env,id){
 await dbOf(env).prepare("DELETE FROM recipe_photo_versions WHERE recipe_id=?").bind(validId(id)).run();
}
export async function serveRecipeVersionPhoto(env,id){
 const db=dbOf(env);
 const meta=await db.prepare("SELECT mime_type,size_bytes FROM recipe_photo_versions WHERE recipe_id=?").bind(validId(id)).first();
 if(!meta)return null;
 const size=Number(meta.size_bytes);
 if(!Number.isInteger(size)||size<12||size>MAX_RECIPE_PHOTO)throw new RecipePhotoError("RECIPE_PHOTO_CORRUPT",502);
 const bytes=new Uint8Array(size);
 for(let start=0;start<size;start+=160000){
  const n=Math.min(160000,size-start);
  const chunk=await db.prepare("SELECT HEX(SUBSTR(image_data,?,?)) AS piece FROM recipe_photo_versions WHERE recipe_id=?")
   .bind(start+1,n,id).first();
  if(typeof chunk?.piece!=="string"||chunk.piece.length!==n*2||!/^[0-9A-F]+$/i.test(chunk.piece))
   throw new RecipePhotoError("RECIPE_PHOTO_CORRUPT",502);
  for(let i=0;i<n;i++)bytes[start+i]=parseInt(chunk.piece.slice(i*2,i*2+2),16);
 }
 validateRecipePhotoBytes(bytes,meta.mime_type);
 return new Response(bytes,{headers:{"Content-Type":meta.mime_type,"Cache-Control":"private, no-store","Content-Disposition":"inline","X-Content-Type-Options":"nosniff"}});
}
