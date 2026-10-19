import { canonicalWeeklyMenuMoment } from "./weekly-menu.js";

const normalize = v => String(v ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const validDate = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v||"")) &&
  !Number.isNaN(new Date(v+"T12:00:00Z").getTime()) &&
  new Date(v+"T12:00:00Z").toISOString().slice(0,10)===v;
const momentKey = row => normalize(canonicalWeeklyMenuMoment({
  moment: row.momento, name: row.nombre || row.item_nombre, note:row.nota
}));
const active = row => !/^(retirad[oa]|omitid[oa]|cancelad[oa])$/.test(normalize(row.estado));
const rowTable = values => {
  const head = (values?.[0]||[]).map(x=>String(x||"").trim());
  return (values||[]).slice(1).map((cells,index)=>({
    sourceRow:index+2,
    data:Object.fromEntries(head.map((h,j)=>[h,cells[j]??""]))
  })).filter(row=>Object.values(row.data).some(v=>v!==""&&v!=null));
};
const column = number => {
  let letters="", index=number;
  while(index>0){index--;letters=String.fromCharCode(65+index%26)+letters;index=Math.floor(index/26);}
  return letters;
};
const put = (sheet,row,header,key,value) => {
  const i=header.indexOf(key);
  if(i<0)throw new Error("MENU_SCHEMA_UNSUPPORTED");
  return {range:sheet+"!"+column(i+1)+row,majorDimension:"ROWS",values:[[value]]};
};
export class MenuSlotError extends Error {
  constructor(code,status=409){super(code);this.code=code;this.status=status;}
}
const ensure = (condition,code="MENU_SCHEMA_UNSUPPORTED",status=409) => {
  if(!condition)throw new MenuSlotError(code,status);
};
const startOfWeek = date => {
  const d=new Date(date+"T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay()+6)%7);
  return d.toISOString().slice(0,10);
};
const allowedMoments = new Map([
 ["desayuno","Desayuno"],["manana oficina","Mañana oficina"],
 ["media manana","Media mañana"],["comida","Comida"],
 ["merienda","Merienda"],["cena","Cena"]
]);
const servings = raw => {
  if(raw==null || raw==="")throw new MenuSlotError("RECIPE_SERVINGS_REQUIRED",400);
  const value=Number(raw);
  if(!Number.isFinite(value)||value<=0||value>20)throw new MenuSlotError("RECIPE_SERVINGS_REQUIRED",400);
  return value;
};
const completeRecipe = (recipe,qty) => {
  const fields=["kcalPerServing","proteinPerServing","carbsPerServing","fatPerServing"];
  if(!recipe||fields.some(x=>recipe[x]===null||recipe[x]===undefined||!Number.isFinite(Number(recipe[x])))||
     /(?:pendiente|pending|sin confirmar|por confirmar|no usar para nuevas|solo histor|exclusiv.{0,16}histor)/i.test(recipe.precision||""))
    throw new MenuSlotError("RECIPE_MACROS_OR_PORTION_PENDING",409);
  return fields.map(x=>Number(recipe[x])*qty);
};
export function planMenuAddition(values,payload,recipes,now){
  const headers=(values?.[0]||[]).map(x=>String(x||"").trim());
  const needed=["semana_inicio","fecha","momento","recipe_id","food_id","nombre","cantidad","unidad",
    "estado","kcal","proteinas_g","carbohidratos_g","grasas_g","nota","updated_at","tipo_item","tipo_acompanante"];
  ensure(needed.every(k=>headers.includes(k)));
  ensure(validDate(payload?.date),"INVALID_MENU_DATE",400);
  const label=allowedMoments.get(normalize(payload?.moment));
  ensure(Boolean(label),"INVALID_MENU_MOMENT",400);
  ensure(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(String(payload?.newRecipeId||"")),"INVALID_RECIPE_SELECTION",400);
  const quantity=servings(payload.newServings);
  const companionType=String(payload.newCompanionType || "").trim().toLowerCase();
  ensure(["","extra","batido","yogur","fruta","guarnicion","postre"].includes(companionType),
    "INVALID_COMPANION_TYPE",400);
  const asCompanion=Boolean(companionType);
  const recipe=recipes.find(r=>r.id===payload.newRecipeId);
  ensure(Boolean(recipe),"RECIPE_NOT_FOUND",404);
  const [kcal,protein,carbs,fat]=completeRecipe(recipe,quantity);
  const items=rowTable(values);
  const peers=items.filter(x=>x.data.fecha===payload.date && momentKey(x.data)===normalize(label) && active(x.data));
  const primary=peers.filter(x=>
    Boolean(x.data.recipe_id||x.data.food_id) && normalize(x.data.tipo_item||"receta")!=="acompanante");
  if(!asCompanion) ensure(!primary.length,"PRIMARY_RECIPE_ALREADY_IN_MEAL");
  ensure(!peers.some(x=>x.data.recipe_id===recipe.id),"RECIPE_ALREADY_IN_MEAL");
  // An unassigned textual placeholder is replaced, not duplicated.
  const placeholder=peers.filter(x=>!x.data.recipe_id&&!x.data.food_id &&
    ["planificado","pendiente"].includes(normalize(x.data.estado)));
  ensure(placeholder.length<=1,"AMBIGUOUS_MENU_PLACEHOLDER");
  const sourceRow=(!asCompanion ? placeholder[0]?.sourceRow : null) ||
    (items.length?Math.max(...items.map(x=>x.sourceRow))+1:2);
  ensure(sourceRow>=2&&sourceRow<=2000,"MENU_SHEET_CAPACITY");
  const status=payload.confirmConsumed===true?"consumido":"planificado";
  const fields={
    semana_inicio:startOfWeek(payload.date),fecha:payload.date,momento:label,
    recipe_id:recipe.id,food_id:"",nombre:recipe.name,cantidad:quantity,unidad:"ración",
    estado:status,kcal,proteinas_g:protein,carbohidratos_g:carbs,grasas_g:fat,
    sesion_gym:!asCompanion ? placeholder[0]?.data.sesion_gym||"" : "",nota:status==="consumido"
      ? "Añadido y confirmado como consumido desde el menú semanal."
      : "Añadido al menú semanal; consumo pendiente.",
    updated_at:now,tipo_item:asCompanion?"acompanante":"receta",tipo_acompanante:companionType
  };
  const updates=Object.entries(fields).filter(([key])=>headers.includes(key))
    .map(([key,val])=>put("MenuSemanal",sourceRow,headers,key,val));
  return {updates,action:"add",sourceRow};
}
export function planConsumedRegisterCorrection(values,payload,original,recipe,macros,quantity,now){
  const head=(values?.[0]||[]).map(x=>String(x||"").trim());
  const keys=["fecha","momento","item_id","item_nombre","cantidad","unidad","kcal","proteinas_g",
    "carbohidratos_g","grasas_g","estado","nota","updated_at"];
  ensure(keys.every(key=>head.includes(key)),"REGISTRO_SCHEMA_UNSUPPORTED");
  const oldId=String(original.recipe_id||original.food_id||"");
  const sameMoment=normalize(canonicalWeeklyMenuMoment({
    moment:original.momento,name:original.nombre,note:original.nota
  }));
  const all=rowTable(values);
  const matching=all.filter(x=>x.data.fecha===payload.date &&
    normalize(x.data.item_id)===normalize(oldId) &&
    momentKey(x.data)===sameMoment && normalize(x.data.estado)==="consumido");
  ensure(matching.length<=1,"AMBIGUOUS_CONSUMED_REGISTRO");
  // Legacy name-only rows could represent the same consumption. Refuse to
  // claim a zero-match reconciliation when their provenance is ambiguous.
  ensure(!all.some(x=>x.data.fecha===payload.date &&
    !String(x.data.item_id||"").trim() &&
    normalize(x.data.item_nombre)===normalize(original.nombre) &&
    momentKey(x.data)===sameMoment && normalize(x.data.estado)==="consumido"),
    "AMBIGUOUS_CONSUMED_REGISTRO");
  // If a new ID is already independently recorded, correcting the old
  // record into that same identity would double-count the meal.
  ensure(!all.some(x=>x.data.fecha===payload.date &&
    normalize(x.data.item_id)===normalize(recipe.id) && momentKey(x.data)===sameMoment &&
    normalize(x.data.estado)==="consumido" && !matching.some(y=>x.sourceRow===y.sourceRow)),
    "CONSUMED_RECIPE_ALREADY_IN_REGISTRO");
  if(!matching.length)return [];
  const source=matching[0];
  const oldNote=String(source.data.nota||"").slice(0,600);
  const fields={
    item_id:recipe.id,item_nombre:recipe.name,cantidad:quantity,unidad:"ración",
    kcal:macros.kcal,proteinas_g:macros.protein,
    carbohidratos_g:macros.carbs,grasas_g:macros.fat,
    nota:"Corrección de consumo "+now+": antes "+String(original.nombre||oldId).slice(0,180)+
      (oldNote?" | Nota anterior: "+oldNote:""),
    updated_at:now
  };
  return Object.entries(fields).map(([key,val])=>put("Registro",source.sourceRow,head,key,val));
}

/** Presets explicitly opted in for manual side-dish selection in Health/Comidas. */
export function manualCompanionOptions(values) {
  return rowTable(values)
    .filter(row => /(?:^|[|\s])MANUAL_COMPANION_PRESET(?:[|\s]|$)/.test(String(row.data.nota || "")) &&
      /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(String(row.data.id || "")))
    .map(({data}) => ({
      id: String(data.id), name: String(data.nombre || "").trim(),
      companionType: /FOOD_COMPANION_TYPE:(yogur|guarnicion)/i.exec(String(data.nota||""))?.[1]?.toLowerCase() || "guarnicion",
      serving: Number(data.racion), unit: String(data.unidad || "").trim(),
      kcalPerServing: Number(data.kcal_racion),
      proteinPerServing: Number(data.proteinas_g),
      carbsPerServing: Number(data.carbohidratos_g),
      fatPerServing: Number(data.grasas_g)
    }))
    .filter(item => item.name && item.unit && Number.isSafeInteger(item.serving) && item.serving > 0 &&
      [item.kcalPerServing,item.proteinPerServing,item.carbsPerServing,item.fatPerServing]
        .every(v => Number.isFinite(v) && v >= 0));
}


/** One dessert row may contain several cups. Keep the displayed amount consistent
 * with the actual numeric quantity and macros, without implying multiple desserts. */
export function companionServingTitle(food, portions, isDessert=false) {
  const name=String(food?.name||"").trim();
  const base=name.replace(/\s*·\s*(?:1 vasito \(\d+ g\)|250 g \(½ tarro grande\))$/i,"");
  const units=Number(portions);
  if(food?.companionType!=="yogur"||!Number.isSafeInteger(units)||units<1)
    return (isDessert?"Postre: ":"")+name+(units>1?" × "+units:"");
  const portion=Number(food.serving);
  const cup=/vasito/i.test(String(food.unit||""));
  const gramsPerCup=Number(/(\d+)\s*g/i.exec(String(food.unit||""))?.[1]);
  let descriptor;
  if(cup&&Number.isFinite(gramsPerCup)&&gramsPerCup>0) {
    const count=portion*units;
    descriptor=count+" "+(count===1?"vasito":"vasitos")+" ("+(count*gramsPerCup)+" g)";
  } else if(/^g$/i.test(String(food.unit||""))&&portion>0) {
    const weight=portion*units;
    descriptor=weight+" g"+(portion===250?units===1?" (½ tarro grande)":units===2?" (1 tarro grande)":" ("+units+" tomas de 250 g)":"");
  } else descriptor=(portion*units)+" "+String(food.unit||"").trim();
  return (isDessert?"Postre: ":"")+base+" · "+descriptor;
}

/** A manually selected food is an accompanying product, never a phantom recipe. */
export function planMenuFoodAddition(values,payload,foods,now) {
  const headers=(values?.[0]||[]).map(x=>String(x||"").trim());
  const needed=["semana_inicio","fecha","momento","recipe_id","food_id","nombre","cantidad","unidad",
    "estado","kcal","proteinas_g","carbohidratos_g","grasas_g","nota","updated_at","tipo_item","tipo_acompanante"];
  ensure(needed.every(key=>headers.includes(key)));
  ensure(validDate(payload?.date),"INVALID_MENU_DATE",400);
  const label=allowedMoments.get(normalize(payload?.moment));
  ensure(Boolean(label),"INVALID_MENU_MOMENT",400);
  ensure(["guarnicion","yogur"].includes(normalize(payload?.newCompanionType)),"INVALID_COMPANION_TYPE",400);
  ensure(payload?.confirmConsumed!==true,"CONFIRM_CONSUMPTION_SEPARATELY",409);
  const units=servings(payload?.newServings);
  ensure(Number.isSafeInteger(units),"INVALID_FOOD_MULTIPLIER",400);
  const food=foods.find(row=>row.id===payload?.newFoodId);
  ensure(Boolean(food),"FOOD_NOT_FOUND",404);
  ensure(normalize(payload.newCompanionType)===food.companionType,"FOOD_COMPANION_TYPE_MISMATCH",409);
  const items=rowTable(values);
  const peers=items.filter(row=>row.data.fecha===payload.date &&
    momentKey(row.data)===normalize(label)&&active(row.data));
  ensure(!peers.some(row=>row.data.food_id===food.id),"FOOD_ALREADY_IN_MEAL",409);
  if(food.companionType==="yogur" && ["comida","cena"].includes(normalize(label)))
    ensure(!peers.some(row=>normalize(row.data.tipo_acompanante)==="yogur"),"DESSERT_ALREADY_IN_MEAL",409);
  const sourceRow=items.length?Math.max(...items.map(x=>x.sourceRow))+1:2;
  ensure(sourceRow>=2&&sourceRow<=2000,"MENU_SHEET_CAPACITY",409);
  const count=food.serving*units;
  const isPicos=/^picos/i.test(food.unit);
  const name=isPicos?"Picos 100% integrales de trigo Hacendado · "+count+" picos" :
    companionServingTitle(food,units,food.companionType==="yogur" && ["comida","cena"].includes(normalize(label)));
  const fields={
    semana_inicio:startOfWeek(payload.date),fecha:payload.date,momento:label,
    recipe_id:"",food_id:food.id,nombre:name,cantidad:count,unidad:food.unit,
    estado:"planificado",
    kcal:Math.round(food.kcalPerServing*units*1000)/1000,
    proteinas_g:Math.round(food.proteinPerServing*units*1000)/1000,
    carbohidratos_g:Math.round(food.carbsPerServing*units*1000)/1000,
    grasas_g:Math.round(food.fatPerServing*units*1000)/1000,
    nota:"Acompañante seleccionado manualmente de Comidas / Despensa. "+
      units+" ración(es) de "+food.serving+" "+food.unit+
      (isPicos?"; peso operativo 2 g/pico estimado, NO medido":"")+
      ". Consumo no confirmado.",
    updated_at:now,tipo_item:"acompanante",tipo_acompanante:food.companionType
  };
  return {updates:Object.entries(fields).map(([key,value])=>put("MenuSemanal",sourceRow,headers,key,value)),
    action:"add-food",sourceRow};
}

/**
 * Safely swaps an existing PLANNED food companion (e.g. natural yogurt to coconut)
 * without turning it into a recipe, losing its product photo, duplicating Registro,
 * or changing the main dish. Requires the stale-proof source-row identity.
 */
export function planMenuFoodReplacement(values,payload,foods,now){
  const headers=(values?.[0]||[]).map(x=>String(x||"").trim());
  const keys=["fecha","momento","recipe_id","food_id","nombre","cantidad","unidad",
    "estado","kcal","proteinas_g","carbohidratos_g","grasas_g","nota","updated_at","tipo_item","tipo_acompanante"];
  ensure(keys.every(k=>headers.includes(k)),"MENU_SCHEMA_UNSUPPORTED",409);
  ensure(validDate(payload?.date),"INVALID_MENU_DATE",400);
  ensure(Number.isSafeInteger(payload?.sourceRow)&&payload.sourceRow>=2&&payload.sourceRow<=2000,
    "INVALID_MENU_EDIT",400);
  const foodId=String(payload?.foodId||"");
  const newId=String(payload?.newFoodId||"");
  ensure(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(foodId) &&
    /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(newId),"INVALID_FOOD_SELECTION",400);
  const items=rowTable(values);
  const existing=items.find(x=>x.sourceRow===payload.sourceRow);
  ensure(existing && existing.data.fecha===payload.date &&
    existing.data.recipe_id==="" && existing.data.food_id===foodId &&
    existing.data.nombre===payload.name &&
    String(existing.data.updated_at||"")===String(payload.updatedAt||"") &&
    momentKey(existing.data)===normalize(canonicalWeeklyMenuMoment({moment:payload.moment,name:payload.name})),
    "MENU_EDIT_CONFLICT",409);
  ensure(["planificado","pendiente"].includes(normalize(existing.data.estado)),
    "MENU_EDIT_NOT_PLANNED",409);
  ensure(normalize(existing.data.tipo_item)==="acompanante",
    "MENU_EDIT_NOT_SUPPORTED_ITEM",409);
  const companionType=normalize(existing.data.tipo_acompanante);
  ensure(["yogur","guarnicion"].includes(companionType),"INVALID_FOOD_COMPANION",409);
  const selected=foods.find(x=>x.id===newId);
  ensure(selected,"FOOD_NOT_FOUND",404);
  ensure(selected.companionType===companionType,"FOOD_COMPANION_TYPE_MISMATCH",409);
  const n=servings(payload?.newServings);
  ensure(Number.isSafeInteger(n),"INVALID_FOOD_MULTIPLIER",400);
  const moment=momentKey(existing.data);
  ensure(!(newId===foodId && Number(existing.data.cantidad)===selected.serving*n),
    "FOOD_SELECTION_UNCHANGED",409);
  const peers=items.filter(x=>x.sourceRow!==existing.sourceRow&&
    x.data.fecha===payload.date&&momentKey(x.data)===moment&&active(x.data));
  ensure(!peers.some(x=>x.data.food_id===newId),"FOOD_ALREADY_IN_MEAL",409);
  if(companionType==="yogur"&&["comida","cena"].includes(moment))
    ensure(!peers.some(x=>normalize(x.data.tipo_acompanante)==="yogur"),
      "DESSERT_ALREADY_IN_MEAL",409);
  // Older duplicates of the old source identity must be retired to prevent
  // a ghost yogurt returning when the current ID is updated.
  const copies=items.filter(x=>x.data.fecha===existing.data.fecha &&
    momentKey(x.data)===moment && x.data.food_id===foodId&&active(x.data));
  ensure(copies.length===1,"AMBIGUOUS_FOOD_VERSIONS",409);
  const total=selected.serving*n;
  const prefix=companionType==="yogur"&&["comida","cena"].includes(moment)?"Postre: ":"";
  const title=companionServingTitle(selected,n,Boolean(prefix));
  const fields={
    recipe_id:"",food_id:selected.id,nombre:title,
    cantidad:total,unidad:selected.unit,
    kcal:Math.round(selected.kcalPerServing*n*1000)/1000,
    proteinas_g:Math.round(selected.proteinPerServing*n*1000)/1000,
    carbohidratos_g:Math.round(selected.carbsPerServing*n*1000)/1000,
    grasas_g:Math.round(selected.fatPerServing*n*1000)/1000,
    nota:"Sustitución manual de alimento previsto. Anterior: "+
      String(existing.data.nombre||"").slice(0,180)+
      ". Nuevo producto canónico de Despensa: "+selected.id+
      ". Sin consumo confirmado; no afecta al plato principal ni a Registro.",
    updated_at:now,tipo_item:"acompanante",tipo_acompanante:companionType
  };
  return {updates:Object.entries(fields).map(([key,v])=>put("MenuSemanal",existing.sourceRow,headers,key,v)),
    action:"replace-food",sourceRow:existing.sourceRow};
}
