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
export async function writeRecipeAction(payload){
  const r=await fetch("/api/nutrition/recipes/edit",{
    method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},
    credentials:"same-origin",cache:"no-store",body:JSON.stringify(payload)
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok||!j.ok)throw Error(j.code||"RECIPE_SAVE_FAILED");
  return j;
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
  panel.querySelector("[data-editor-back]")?.addEventListener("click",onBack);
  panel.querySelector("[data-editor-cancel]")?.addEventListener("click",onBack);
  const form=panel.querySelector("[data-recipe-edit]");
  form?.addEventListener("submit",async event=>{
    event.preventDefault();
    const button=form.querySelector("[data-editor-submit]");
    const status=form.querySelector("[data-editor-message]");
    if(button.disabled)return;
    try{
      const payload=editorPayload(recipe,form);
      if(!payload.name||!payload.category)throw Error("NOMBRE_Y_CATEGORIA_OBLIGATORIOS");
      button.disabled=true;status.textContent="Guardando nueva versión…";
      await writeRecipeAction(payload);
      status.textContent="Actualizando recetario…";await onSaved();
    }catch(error){status.textContent="No se pudo guardar: "+String(error?.message||"ERROR");button.disabled=false;}
  });
}
