// Versioned recipe editing: never overwrite a recipe referenced by old meals.
// Read/write scope: canonical private Recetas, IngredientesReceta, PasosReceta.
export class RecipeEditError extends Error {
  constructor(code,status=400){super(code);this.code=code;this.status=status;}
}
const RANGE_RECIPES="Recetas!A1:Q1000";
const RANGE_INGREDIENTS="IngredientesReceta!A1:L5000";
const RANGE_STEPS="PasosReceta!A1:J2000";
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/;
const CATEGORIES=new Set(["desayuno","comida_cena","media_manana_merienda"]);
const trim=(v,n=500)=>String(v??"").trim().slice(0,n);
const value=(v)=>v===null||v===undefined||v===""?"":v;
const number=(v)=>{
  if(v==null||v==="")return "";
  const n=Number(v);
  if(!Number.isFinite(n)||n<0)throw new RecipeEditError("RECIPE_INVALID_NUMBER");
  return n;
};
export function isRecipeArchived(item){
  return ["eliminada","sustituida","archivada"].includes(trim(item?.estado_receta||item?.status).toLowerCase());
}
function rows(values){
  const head=(values[0]||[]).map(x=>trim(x,100));
  return values.slice(1).map((cells,i)=>({
    row:i+2,cells,data:Object.fromEntries(head.map((key,index)=>[key,cells[index]??""]))
  })).filter(x=>x.cells.some(v=>v!==""&&v!=null));
}
function nextRow(values){
  const r=rows(values);
  return r.length?Math.max(...r.map(x=>x.row))+1:2;
}
function batchRow(sheet,start,values){
  return {range:sheet+"!A"+start+":"+(sheet==="Recetas"?"Q":sheet==="IngredientesReceta"?"L":"J")+
      (start+values.length-1),majorDimension:"ROWS",values};
}
export function planRecipeMutation(sources,payload,{now="2026-10-19T10:00:00.000Z",newId}={}){
  if(!payload||!["edit","delete"].includes(payload.action)||!ID.test(trim(payload.recipeId,160)))
    throw new RecipeEditError("RECIPE_INVALID_EDIT");
  const headers=sources.recipes?.[0]||[];
  if ((headers[15] && headers[15]!=="categoria_receta") ||
      (headers[16] && headers[16]!=="estado_receta"))
    throw new RecipeEditError("RECIPE_SCHEMA_CONFLICT",409);
  const catalog=rows(sources.recipes||[]);
  const source=catalog.find(x=>trim(x.data.recipe_id)===payload.recipeId);
  if(!source)throw new RecipeEditError("RECIPE_NOT_FOUND",404);
  if(isRecipeArchived(source.data))throw new RecipeEditError("RECIPE_ALREADY_ARCHIVED",409);
  if(trim(source.data.updated_at)!==trim(payload.updatedAt))throw new RecipeEditError("RECIPE_EDIT_CONFLICT",409);
  const updates=[
    {range:"Recetas!P1:Q1",majorDimension:"ROWS",values:[["categoria_receta","estado_receta"]]},
    {range:"Recetas!Q"+source.row,majorDimension:"ROWS",values:[[payload.action==="delete"?"eliminada":"sustituida"]]}
  ];
  if(payload.action==="delete")return {updates,action:"delete",recipeId:payload.recipeId};
  if(!ID.test(newId||"")||catalog.some(x=>trim(x.data.recipe_id)===newId))
    throw new RecipeEditError("RECIPE_VERSION_CONFLICT",409);
  const name=trim(payload.name,160),category=trim(payload.category);
  if(!name||!CATEGORIES.has(category))throw new RecipeEditError("RECIPE_INVALID_CATEGORY_OR_NAME");
  const servings=number(payload.servings);
  if(servings===""||servings===0||servings>100)throw new RecipeEditError("RECIPE_INVALID_SERVINGS");
  const kcal=number(payload.kcalPerServing),protein=number(payload.proteinPerServing);
  const carbs=number(payload.carbsPerServing),fat=number(payload.fatPerServing);
  const d=source.data;
  const recipe=[
    newId,name,servings,kcal===""?"":kcal*servings,kcal,protein,carbs,fat,
    trim(payload.precision,60)||trim(d.precision,60),trim(d.fuente,400),
    trim(payload.note,4000),now,
    value(d.foto_drive_file_id),value(d.foto_mime_type),value(d.foto_updated_at),
    category,"activa"
  ];
  const ingredientRows=rows(sources.ingredients||[])
    .filter(x=>trim(x.data.recipe_id)===payload.recipeId);
  const stepRows=rows(sources.steps||[])
    .filter(x=>trim(x.data.recipe_id)===payload.recipeId);
  const ingredients=Array.isArray(payload.ingredients)?payload.ingredients:ingredientRows.map(x=>({
    name:x.data.ingrediente,quantity:x.data.cantidad,unit:x.data.unidad,grams:x.data.gramos_estimados,
    kcal:x.data.kcal_estimadas,protein:x.data.proteinas_estimadas_g,productId:x.data.producto_id,
    note:x.data.nota
  }));
  const steps=Array.isArray(payload.steps)?payload.steps:stepRows.map(x=>({
    instruction:x.data.instruccion,timeMinutes:x.data.tiempo_min,
    temperature:x.data.temperatura,utensil:x.data.utensilio,note:x.data.nota
  }));
  if(ingredients.length>100||steps.length>70)throw new RecipeEditError("RECIPE_TOO_MANY_LINES");
  const ingredientsData=ingredients.filter(x=>trim(x.name)).map(x=>[
    newId,trim(x.name,160),number(x.quantity),trim(x.unit,50),number(x.grams),
    number(x.kcal),"Recetario: versión editada",trim(payload.precision,60),
    trim(x.note,500),now,number(x.protein),trim(x.productId,120)
  ]);
  const stepsData=steps.filter(x=>trim(x.instruction)).map((x,i)=>[
    newId,i+1,trim(x.instruction,1000),number(x.timeMinutes),
    trim(x.temperature,80),trim(x.utensil,80),"Recetario: versión editada",
    trim(payload.precision,60),trim(x.note,500),now
  ]);
  const row=nextRow(sources.recipes);
  if(row>1000||nextRow(sources.ingredients)+ingredientsData.length-1>5000||
     nextRow(sources.steps)+stepsData.length-1>2000)
    throw new RecipeEditError("RECIPE_SHEET_CAPACITY",409);
  updates.push(batchRow("Recetas",row,[recipe]));
  if(ingredientsData.length)updates.push(batchRow("IngredientesReceta",nextRow(sources.ingredients),ingredientsData));
  if(stepsData.length)updates.push(batchRow("PasosReceta",nextRow(sources.steps),stepsData));
  return {updates,action:"edit",recipeId:newId,priorRecipeId:payload.recipeId};
}
export async function mutateRecipe(request,env,accessToken,fetchImpl=fetch){
  if(!env.HEALTH_SHEET_ID)throw new RecipeEditError("HEALTH_NOT_CONFIGURED",503);
  let payload;
  try{payload=await request.json();}catch{throw new RecipeEditError("INVALID_JSON");}
  const token=await accessToken(env);
  const base="https://sheets.googleapis.com/v4/spreadsheets/"+encodeURIComponent(env.HEALTH_SHEET_ID);
  const query=new URLSearchParams({majorDimension:"ROWS",valueRenderOption:"UNFORMATTED_VALUE"});
  for(const range of [RANGE_RECIPES,RANGE_INGREDIENTS,RANGE_STEPS])query.append("ranges",range);
  const read=await fetchImpl(base+"/values:batchGet?"+query,{headers:{Authorization:"Bearer "+token}});
  if(!read.ok)throw new RecipeEditError("RECIPE_READ_FAILED",502);
  const ranges=(await read.json()).valueRanges||[];
  const now=new Date().toISOString();
  const sourceId=trim(payload?.recipeId,120);
  const newId=sourceId.slice(0,75)+"-rev-"+crypto.randomUUID().slice(0,12);
  const plan=planRecipeMutation({
    recipes:ranges[0]?.values||[],ingredients:ranges[1]?.values||[],steps:ranges[2]?.values||[]
  },payload,{now,newId});
  const write=await fetchImpl(base+"/values:batchUpdate",{
    method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({valueInputOption:"RAW",data:plan.updates})
  });
  if(!write.ok)throw new RecipeEditError("RECIPE_WRITE_FAILED",502);
  return {ok:true,action:plan.action,recipeId:plan.recipeId,priorRecipeId:plan.priorRecipeId||null};
}
