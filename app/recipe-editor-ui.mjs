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
export function rotationFrameDimensions(width,height,degrees=0){
 const turn=((Number(degrees)%360)+360)%360;
 if(![0,90,180,270].includes(turn))throw Error("ROTACION_NO_ADMITIDA");
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error("FOTO_INVALIDA");
 return {turn,width:turn%180===0?width:height,height:turn%180===0?height:width};
}
// The horizontal frame removes blank/baked padding only on explicit request.
// Cropping operates in *rotated* image coordinates, so Rotate + Frame stay correct.
export function recipePhotoCropWindow(width,height,degrees=0,framing="original",position=50){
 const frame=rotationFrameDimensions(width,height,degrees);
 if(!["original","horizontal"].includes(framing))throw Error("ENCUADRE_NO_ADMITIDO");
 const offset=Number(position);
 if(!Number.isFinite(offset)||offset<0||offset>100)throw Error("POSICION_DE_ENCUADRE_INVALIDA");
 if(framing==="original")return {...frame,left:0,top:0,cropWidth:frame.width,cropHeight:frame.height};
 const target=4/3,aspect=frame.width/frame.height;
 const cropWidth=aspect>target?frame.height*target:frame.width;
 const cropHeight=aspect>target?frame.height:frame.width/target;
 return {...frame,
  left:(frame.width-cropWidth)*offset/100,
  top:(frame.height-cropHeight)*offset/100,
  cropWidth,cropHeight};
}
function drawRecipePhotoFrame(ctx,source,width,height,frame,canvasWidth,canvasHeight){
 const factor=Math.min(canvasWidth/frame.cropWidth,canvasHeight/frame.cropHeight);
 ctx.fillStyle="#fff";ctx.fillRect(0,0,canvasWidth,canvasHeight);
 ctx.save();
 ctx.translate(canvasWidth/2,canvasHeight/2);
 ctx.scale(factor,factor);
 ctx.translate(frame.width/2-frame.left-frame.cropWidth/2,frame.height/2-frame.top-frame.cropHeight/2);
 ctx.rotate(frame.turn*Math.PI/180);
 ctx.drawImage(source,-width/2,-height/2,width,height);
 ctx.restore();
}
export async function prepareRecipePhoto(file,degrees=0,framing="original",position=50){
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
  const frame=recipePhotoCropWindow(width,height,degrees,framing,position);
  for(let longest=1500;longest>=600;longest-=150){
   const factor=Math.min(1,longest/Math.max(frame.cropWidth,frame.cropHeight));
   const canvas=document.createElement("canvas");
   canvas.width=Math.max(1,Math.round(frame.cropWidth*factor));
   canvas.height=Math.max(1,Math.round(frame.cropHeight*factor));
   const context=canvas.getContext("2d");
   if(!context)throw Error("NO_SE_PUEDE_PROCESAR_FOTO");
   drawRecipePhotoFrame(context,source,width,height,frame,canvas.width,canvas.height);
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
          <button type="button" data-editor-photo-rotate="-90" aria-label="Girar fotografía 90 grados a la izquierda">↶ Girar izquierda</button>
          <button type="button" data-editor-photo-rotate="90" aria-label="Girar fotografía 90 grados a la derecha">↷ Girar derecha</button>
          <button type="button" data-editor-photo-frame aria-pressed="false">▣ Encuadre horizontal 4:3</button>
          <button type="button" data-editor-photo-revert hidden>Restaurar foto anterior</button>
        </div>
        <label class="recipe-edit-photo-position" data-editor-photo-position-wrap hidden>Desplazar encuadre
          <input type="range" data-editor-photo-position min="0" max="100" step="1" value="50" aria-label="Desplazar recorte hacia el extremo de la imagen">
        </label>
        <div class="recipe-edit-photo-actions recipe-edit-photo-actions-placeholder" hidden>
        </div>
        <small>Gira si está de lado. Para fotos verticales con bandas borrosas, elige «Encuadre horizontal 4:3» y ajusta el recorte hasta que se vea el plato completo. Se guardará una nueva versión; la original se conserva. HEIC sujeto a compatibilidad del navegador.</small>
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
  let chosenPhoto=null,previewUrl=null,rotation=0,framing="original",cropPosition=50;
  const photoBox=panel.querySelector("[data-editor-photo-preview]");
  const frameButton=panel.querySelector("[data-editor-photo-frame]");
  const positionWrap=panel.querySelector("[data-editor-photo-position-wrap]");
  const positionSlider=panel.querySelector("[data-editor-photo-position]");
  const revert=panel.querySelector("[data-editor-photo-revert]");
  function updateRotationPreview(){
    const img=photoBox.querySelector("img");
    const existingCanvas=photoBox.querySelector("canvas");
    if(!img){existingCanvas?.remove();return;}
    photoBox.dataset.rotation=String(rotation);
    photoBox.classList.toggle("is-horizontal",framing==="horizontal");
    frameButton?.setAttribute("aria-pressed",String(framing==="horizontal"));
    positionWrap.hidden=framing!=="horizontal";
    if(!img.complete||!img.naturalWidth||!img.naturalHeight){
      img.addEventListener("load",updateRotationPreview,{once:true});
      return;
    }
    const frame=recipePhotoCropWindow(img.naturalWidth,img.naturalHeight,rotation,framing,cropPosition);
    const canvas=existingCanvas||document.createElement("canvas");
    const factor=Math.min(1,900/Math.max(frame.cropWidth,frame.cropHeight));
    canvas.width=Math.max(1,Math.round(frame.cropWidth*factor));
    canvas.height=Math.max(1,Math.round(frame.cropHeight*factor));
    const ctx=canvas.getContext("2d");
    if(!ctx)return;
    try{
      drawRecipePhotoFrame(ctx,img,img.naturalWidth,img.naturalHeight,frame,canvas.width,canvas.height);
      img.hidden=true;
      if(!existingCanvas)photoBox.append(canvas);
    }catch(error){
      canvas.remove();img.hidden=false;
      console.warn("Recipe photo preview unavailable",error);
    }
  }
  const restore=()=>{
    if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
    chosenPhoto=null;rotation=0;framing="original";cropPosition=50;
    positionSlider.value="50";
    photoBox.innerHTML=recipe.photoUrl?'<img src="'+esc(recipe.photoUrl)+'" alt="Fotografía actual">':'<span>Esta receta no tiene foto</span>';
    updateRotationPreview();
    revert.hidden=true;
  };
  updateRotationPreview();
  const back=()=>{restore();onBack();};
  panel.querySelector("[data-editor-back]")?.addEventListener("click",back);
  panel.querySelector("[data-editor-cancel]")?.addEventListener("click",back);
  revert?.addEventListener("click",restore);
  frameButton?.addEventListener("click",()=>{
    if(!photoBox.querySelector("img"))return;
    framing=framing==="horizontal"?"original":"horizontal";
    updateRotationPreview();
    revert.hidden=rotation===0&&!chosenPhoto&&framing==="original";
  });
  positionSlider?.addEventListener("input",()=>{
    cropPosition=Number(positionSlider.value);
    updateRotationPreview();
  });
  panel.querySelectorAll("[data-editor-photo-rotate]").forEach(button=>button.addEventListener("click",()=>{
    if(!photoBox.querySelector("img"))return;
    rotation=(rotation+Number(button.dataset.editorPhotoRotate)+360)%360;
    updateRotationPreview();
    revert.hidden=rotation===0&&!chosenPhoto&&framing==="original";
  }));
  for(const selector of ["[data-editor-photo-gallery]","[data-editor-photo-camera]"]){
    panel.querySelector(selector)?.addEventListener("change",event=>{
      const selected=event.target.files?.[0];
      event.target.value="";
      if(!selected)return;
      if(previewUrl)URL.revokeObjectURL(previewUrl);
      chosenPhoto=selected;previewUrl=URL.createObjectURL(selected);rotation=0;
      photoBox.innerHTML='<img src="'+esc(previewUrl)+'" alt="Nueva fotografía, aún sin guardar">';
      updateRotationPreview();
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
      status.textContent=chosenPhoto||rotation||framing!=="original"?"Preparando fotografía…":"Guardando nueva versión…";
      let originalForRotation=null;
      if(!chosenPhoto&&(rotation||framing!=="original")){
        // Re-encode the current private image; no external image hosts or raw photo URLs.
        const url=new URL(String(recipe.photoUrl||""),location.origin);
        if(url.origin!==location.origin||!/^\/api\/health\/recipes\/[^/]+\/image$/.test(url.pathname))
          throw Error("FOTO_ORIGINAL_NO_ADMITIDA");
        const reply=await fetch(url.href,{credentials:"same-origin",cache:"no-store"});
        if(!reply.ok)throw Error("FOTO_ORIGINAL_NO_DISPONIBLE");
        const blob=await reply.blob();
        originalForRotation=new File([blob],"foto-original",{type:blob.type});
      }
      const photo=chosenPhoto||originalForRotation
        ?await prepareRecipePhoto(chosenPhoto||originalForRotation,rotation,framing,cropPosition):null;
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
