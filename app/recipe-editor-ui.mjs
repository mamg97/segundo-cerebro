// Browser-only recipe actions; editing creates an immutable new recipe ID.
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=v=>v===null||v===undefined||v===""?"":String(v);
const categories=[["desayuno","Desayuno"],["comida_cena","Comida / cena"],["media_manana_merienda","Media mañana / merienda"]];
const ingredientsText=rows=>(rows||[]).map(x=>[x.name||"",fmt(x.quantity),x.unit||"",fmt(x.grams),fmt(x.kcal),fmt(x.protein),x.productId||""].join(" | ")).join("\n");
const stepsText=rows=>(rows||[]).map(x=>[x.instruction||"",fmt(x.timeMinutes),x.temperature||"",x.utensil||""].join(" | ")).join("\n");
function lines(raw,max){return String(raw||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(x=>{const p=x.split("|").map(z=>z.trim());if(!p[0]||p.length>max)throw Error("FORMATO_DE_LINEAS");return p;});}
function num(x){if(x==null||x==="")return null;const v=Number(String(x).replace(",","."));if(!Number.isFinite(v)||v<0)throw Error("NUMERO_INVALIDO");return v;}
export function editorPayload(recipe,form){
  const get=n=>form.elements.namedItem(n)?.value??"";
  return {action:"edit",recipeId:recipe.id,updatedAt:recipe.updatedAt||"",
    name:get("name").trim(),category:get("category"),servings:num(get("servings")),
    kcalPerServing:num(get("kcal")),proteinPerServing:num(get("protein")),
    carbsPerServing:num(get("carbs")),fatPerServing:num(get("fat")),
    precision:get("precision").trim(),note:get("note").trim(),
    ingredients:lines(get("ingredients"),7).map(v=>({name:v[0],quantity:num(v[1]),unit:v[2]||"",grams:num(v[3]),kcal:num(v[4]),protein:num(v[5]),productId:v[6]||""})),
    steps:lines(get("steps"),4).map(v=>({instruction:v[0],timeMinutes:num(v[1]),temperature:v[2]||"",utensil:v[3]||""}))
  };
}
export async function recipePhotoSha256(photo){
 if(!globalThis.crypto?.subtle?.digest)throw Error("RECIPE_PHOTO_VERIFICATION_UNAVAILABLE");
 const bytes=await photo.arrayBuffer();
 return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)))
  .map(b=>b.toString(16).padStart(2,"0")).join("");
}
export async function writeRecipeAction(payload,photo=null){
  // Calculate before POST. A write response is insufficient proof that the
  // same image will be served back from the immutable recipe version.
  const photoSha256=photo?await recipePhotoSha256(photo):null;
  const data=photo?new FormData():null;
  if(data){data.set("payload",JSON.stringify(payload));data.set("photo",photo,"receta.jpg");}
  const r=await fetch("/api/nutrition/recipes/edit",{
    method:"POST",headers:photo?{Accept:"application/json"}:{"Content-Type":"application/json",Accept:"application/json"},
    credentials:"same-origin",cache:"no-store",body:data||JSON.stringify(payload)
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok||!j.ok)throw Error(j.code||"RECIPE_SAVE_FAILED");
  return {...j,photoVerificationRequired:Boolean(photo),photoSha256};
}

// Gallery/camera uploads are reduced in-browser and re-encoded to drop EXIF/GPS.
export async function prepareRecipePhoto(file){
 if(!file)return null;
 if(!file.type?.startsWith("image/")&&!/\.(heic|heif)$/i.test(file.name))throw Error("FORMATO_IMAGEN_NO_ADMITIDO");
 let image=null,source=null,revoke=null;
 try{
  if(typeof createImageBitmap==="function"){
   try{image=await createImageBitmap(file);source=image;}catch{}
  }
  if(!source){
   const url=URL.createObjectURL(file);revoke=()=>URL.revokeObjectURL(url);
   source=new Image();
   await new Promise((resolve,reject)=>{source.onload=resolve;source.onerror=()=>reject(Error("FOTO_NO_COMPATIBLE"));source.src=url;});
  }
  const width=source.width||source.naturalWidth,height=source.height||source.naturalHeight;
  if(!width||!height)throw Error("FOTO_INVALIDA");
  for(let longest=1500;longest>=600;longest-=150){
   const factor=Math.min(1,longest/Math.max(width,height));
   const canvas=document.createElement("canvas");
   canvas.width=Math.max(1,Math.round(width*factor));
   canvas.height=Math.max(1,Math.round(height*factor));
   const context=canvas.getContext("2d");
   if(!context)throw Error("NO_SE_PUEDE_PROCESAR_FOTO");
   context.fillStyle="#fff";context.fillRect(0,0,canvas.width,canvas.height);
   context.drawImage(source,0,0,canvas.width,canvas.height);
   for(const quality of [.86,.75,.62,.48]){
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
    if(blob&&blob.size<=850000)return new File([blob],"receta.jpg",{type:"image/jpeg"});
   }
  }
  throw Error("FOTO_DEMASIADO_GRANDE");
 }finally{image?.close?.();revoke?.();}
}

export async function deleteRecipeFromCatalog(recipe,onSaved){
  if(!window.confirm("¿Eliminar «"+recipe.name+"» del recetario activo? Sus consumos y versiones anteriores se conservarán."))return false;
  await writeRecipeAction({action:"delete",recipeId:recipe.id,updatedAt:recipe.updatedAt||""});
  await onSaved();
  return true;
}
export function renderRecipeEditor(panel,recipe,{onBack,onSaved}){
  if(["eliminada","sustituida","archivada"].includes(String(recipe?.status||"").toLowerCase()))throw Error("RECIPE_ARCHIVED_READ_ONLY");
  panel.innerHTML=`
    <div class="recipe-detail-toolbar"><button class="recipe-back" type="button" data-editor-back>← Volver a la receta</button></div>
    <form class="recipe-edit-form" data-recipe-edit>
      <p class="context-label">Recetario · modificar</p><h3>Editar ${esc(recipe.name)}</h3>
      <p class="recipe-edit-info">Se creará una nueva versión. La anterior permanecerá archivada para conservar las comidas históricas.</p>
      <section class="recipe-edit-photo" aria-label="Fotografía de la receta">
        <strong>Fotografía</strong>
        <div class="recipe-edit-photo-preview" data-editor-photo-preview>
          ${recipe.photoUrl?'<img src="'+esc(recipe.photoUrl)+'" alt="Fotografía actual de '+esc(recipe.name)+'">':'<span>Esta receta no tiene foto</span>'}
        </div>
        <div class="recipe-edit-photo-actions">
          <label class="recipe-edit-photo-button">▧ Elegir de galería o archivo<input data-editor-photo-gallery type="file" accept="image/*,.heic,.heif"></label>
          <label class="recipe-edit-photo-button">◎ Hacer foto<input data-editor-photo-camera type="file" accept="image/*" capture="environment"></label>
          <button type="button" data-editor-photo-revert hidden>Restaurar foto anterior</button>
        </div>
        <small>La nueva imagen se guardará únicamente en la nueva versión. Se admite HEIC si el navegador puede convertirlo.</small>
      </section>
      <div class="recipe-edit-fields">
        <label>Nombre<input name="name" maxlength="160" required value="${esc(recipe.name)}"></label>
        <label>Momento del día<select name="category" required><option value="">Seleccionar</option>${categories.map(([id,label])=>'<option value="'+id+'" '+(id===recipe.category?"selected":"")+'>'+label+'</option>').join("")}</select></label>
        <label>Raciones<input type="number" name="servings" min=".01" max="100" step="any" required value="${esc(fmt(recipe.servings))}"></label>
        <label>Kcal por ración<input type="number" name="kcal" min="0" step="any" value="${esc(fmt(recipe.kcalPerServing))}"></label>
        <label>Proteína (g/ración)<input type="number" name="protein" min="0" step="any" value="${esc(fmt(recipe.proteinPerServing))}"></label>
        <label>Hidratos (g/ración)<input type="number" name="carbs" min="0" step="any" value="${esc(fmt(recipe.carbsPerServing))}"></label>
        <label>Grasas (g/ración)<input type="number" name="fat" min="0" step="any" value="${esc(fmt(recipe.fatPerServing))}"></label>
        <label>Precisión<input name="precision" maxlength="60" value="${esc(recipe.precision||"")}"></label>
      </div>
      <label>Ingredientes<small>Una línea por ingrediente: nombre | cantidad | unidad | gramos | kcal | proteína | ID de producto</small><textarea name="ingredients" rows="7" spellcheck="false">${esc(ingredientsText(recipe.ingredients))}</textarea></label>
      <label>Preparación<small>Una línea por paso: instrucción | minutos | temperatura | utensilio</small><textarea name="steps" rows="7">${esc(stepsText(recipe.steps))}</textarea></label>
      <label>Notas<textarea name="note" rows="3">${esc(recipe.note||"")}</textarea></label>
      <p class="recipe-edit-info">Los nutrientes por ración se editan explícitamente; cambiar ingredientes no los recalcula automáticamente.</p>
      <p class="recipe-edit-error" data-editor-message role="status" aria-live="polite"></p>
      <div class="recipe-edit-actions"><button type="button" data-editor-cancel>Cancelar</button><button type="submit" data-editor-submit>Guardar nueva versión</button></div>
    </form>`;
  let chosenPhoto=null,previewUrl=null;
  const photoBox=panel.querySelector("[data-editor-photo-preview]");
  const revert=panel.querySelector("[data-editor-photo-revert]");
  const restore=()=>{
    if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
    chosenPhoto=null;
    photoBox.innerHTML=recipe.photoUrl?'<img src="'+esc(recipe.photoUrl)+'" alt="Fotografía actual">':'<span>Esta receta no tiene foto</span>';
    revert.hidden=true;
  };
  const back=()=>{restore();onBack();};
  panel.querySelector("[data-editor-back]")?.addEventListener("click",back);
  panel.querySelector("[data-editor-cancel]")?.addEventListener("click",back);
  revert?.addEventListener("click",restore);
  for(const selector of ["[data-editor-photo-gallery]","[data-editor-photo-camera]"]){
    panel.querySelector(selector)?.addEventListener("change",event=>{
      const selected=event.target.files?.[0];
      event.target.value="";
      if(!selected)return;
      if(previewUrl)URL.revokeObjectURL(previewUrl);
      chosenPhoto=selected;previewUrl=URL.createObjectURL(selected);
      photoBox.innerHTML='<img src="'+esc(previewUrl)+'" alt="Nueva fotografía, aún sin guardar">';
      revert.hidden=false;
    });
  }
  const form=panel.querySelector("[data-recipe-edit]");
  form?.addEventListener("submit",async event=>{
    event.preventDefault();
    const button=form.querySelector("[data-editor-submit]");
    const status=form.querySelector("[data-editor-message]");
    if(button.disabled)return;
    try{
      const payload=editorPayload(recipe,form);
      if(!payload.name||!payload.category)throw Error("NOMBRE_Y_CATEGORIA_OBLIGATORIOS");
      button.disabled=true;
      status.textContent=chosenPhoto?"Preparando fotografía…":"Guardando nueva versión…";
      const photo=chosenPhoto?await prepareRecipePhoto(chosenPhoto):null;
      status.textContent="Guardando nueva versión"+(photo?" y fotografía":"")+"…";
      const saved=await writeRecipeAction(payload,photo);
      status.textContent="Verificando la versión guardada y su foto…";
      try{await onSaved(saved);}catch(error){
        // The write may have succeeded. Do not retry the POST: that could
        // create duplicate revisions or trigger a version conflict.
        status.textContent="La nueva versión se ha guardado, pero no se ha podido verificar la foto o actualizar el recetario ("+
          String(error?.message||"LECTURA_FALLIDA")+"). No vuelvas a guardar: recarga el catálogo para comprobar el resultado.";
        button.disabled=true;
        return;
      }
      restore();
    }catch(error){status.textContent="No se pudo guardar: "+String(error?.message||"ERROR");button.disabled=false;}
  });
}
