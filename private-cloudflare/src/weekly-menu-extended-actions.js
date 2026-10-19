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
  const recipe=recipes.find(r=>r.id===payload.newRecipeId);
  ensure(Boolean(recipe),"RECIPE_NOT_FOUND",404);
  const [kcal,protein,carbs,fat]=completeRecipe(recipe,quantity);
  const items=rowTable(values);
  const peers=items.filter(x=>x.data.fecha===payload.date && momentKey(x.data)===normalize(label) && active(x.data));
  const primary=peers.filter(x=>
    Boolean(x.data.recipe_id||x.data.food_id) && normalize(x.data.tipo_item||"receta")!=="acompanante");
  ensure(!primary.length,"PRIMARY_RECIPE_ALREADY_IN_MEAL");
  ensure(!peers.some(x=>x.data.recipe_id===recipe.id),"RECIPE_ALREADY_IN_MEAL");
  // An unassigned textual placeholder is replaced, not duplicated.
  const placeholder=peers.filter(x=>!x.data.recipe_id&&!x.data.food_id &&
    ["planificado","pendiente"].includes(normalize(x.data.estado)));
  ensure(placeholder.length<=1,"AMBIGUOUS_MENU_PLACEHOLDER");
  const sourceRow=placeholder[0]?.sourceRow ||
    (items.length?Math.max(...items.map(x=>x.sourceRow))+1:2);
  ensure(sourceRow>=2&&sourceRow<=2000,"MENU_SHEET_CAPACITY");
  const status=payload.confirmConsumed===true?"consumido":"planificado";
  const fields={
    semana_inicio:startOfWeek(payload.date),fecha:payload.date,momento:label,
    recipe_id:recipe.id,food_id:"",nombre:recipe.name,cantidad:quantity,unidad:"ración",
    estado:status,kcal,proteinas_g:protein,carbohidratos_g:carbs,grasas_g:fat,
    sesion_gym:placeholder[0]?.data.sesion_gym||"",nota:status==="consumido"
      ? "Añadido y confirmado como consumido desde el menú semanal."
      : "Añadido al menú semanal; consumo pendiente.",
    updated_at:now,tipo_item:"receta",tipo_acompanante:""
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
