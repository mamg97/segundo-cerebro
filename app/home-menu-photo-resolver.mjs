// Resolve a menu row's historical recipe ID to its photo-bearing immutable successor.
// The join is by explicit version ancestry, never by title alone.
const clean = x => String(x ?? "").trim();
const normalize = x => clean(x).normalize("NFC").toLocaleLowerCase("es");
const allowedPhoto = value => /^\/api\/health\/recipes\/[A-Za-z0-9_.:%-]+\/image\?v=[^\s<>"']*$/.test(clean(value));
const revSuffix = /-rev-[0-9a-f]{8}-[0-9a-f]{3}$/i;
export function reconcileHomeMenuPhotos(menu,recipes){
 const entries=Array.isArray(menu)?menu:[];
 const catalog=Array.isArray(recipes)?recipes:[];
 if(!catalog.length)return entries;
 const byId=new Map(catalog.filter(x=>clean(x?.id)).map(x=>[clean(x.id),x]));
 const result=new Map();
 for(const recipe of catalog){
  const id=clean(recipe?.id),photo=clean(recipe?.photoUrl);
  if(!id||!allowedPhoto(photo))continue;
  result.set(id,photo);
 }
 const active=catalog.filter(x=>normalize(x?.status)==="activa"&&allowedPhoto(x?.photoUrl));
 active.sort((a,b)=>clean(b?.updatedAt).localeCompare(clean(a?.updatedAt)));
 const resolvedAncestors=new Set();
 for(const recipe of active){
  const photo=clean(recipe.photoUrl),name=normalize(recipe.name);
  let id=clean(recipe.id);
  while(revSuffix.test(id)){
   id=id.replace(revSuffix,"");
   const ancestor=byId.get(id);
   if(!ancestor||normalize(ancestor.name)!==name)break;
   if(!resolvedAncestors.has(id)){
    result.set(id,photo);
    resolvedAncestors.add(id);
   }
  }
 }
 return entries.map(item=>{
  if(!item?.recipeId)return item;
  const photo=result.get(clean(item.recipeId));
  // The menu API may have returned an old but still-valid URL. Use the
  // active successor's image instead of preserving a stale historical photo.
  return photo&&photo!==item.photoUrl?{...item,photoUrl:photo}:item;
 });
}
