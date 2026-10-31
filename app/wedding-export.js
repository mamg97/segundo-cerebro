// Zero-dependency, client-side OOXML workbook export. Never uploads private data.
// Excel-compatible .xlsx with uncompressed ZIP entries and text-only cells (no formulas).
import {BODAS_LINKS,WEDDING_GUEST_GROUPS} from "./wedding-planner-ui.js?v=0.1.7";
export const WEDDING_EXPORT_TABS={
 kanban:"Kanban",agenda:"Agenda",proveedores:"Proveedores",invitados:"Invitados",
 mesas:"Mesas",planificacion:"Presupuesto",inspiracion:"Inspiración",bodasnet:"Bodas.net"
};
const text=(v)=>String(v??"");
const euro=(c)=>c===null||c===undefined?"":{currency:c/100};
const date=(v)=>text(v).replace("T"," ").replace(/\.\d{3}Z$/," UTC");
const clean=(v)=>text(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"�");
const xml=(v)=>clean(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const colName=(n)=>{let s="";for(let x=n+1;x>0;x=Math.floor((x-1)/26))s=String.fromCharCode(65+(x-1)%26)+s;return s;};
const sheet=(name,headers,records)=>({name,headers,records});
const CARD_HEADERS=["ID","Categoría","Estado","Título","Descripción / notas","Proveedor / contacto","Responsable","Tipo responsable","Fecha clave","Estimado (€)","Contratado (€)","Pagado (€)","Enlace original","Foto privada (requiere acceso)","Creado","Actualizado","Creado por","Actualizado por","Revisión"];
const safeUrl=(p,origin)=>p&&origin?new URL(p,origin).href:text(p);
const card=(i,origin)=>[i.id,i.category,i.status,i.title,i.description,i.provider,
 i.assigneeKind==="otro"?(i.assigneeName||"Otra persona"):i.assigneeKind==="miguel"?"Miguel":i.assigneeKind==="andrea"?"Andrea":"Sin asignar",
 i.assigneeKind||"",i.dueDate||"",euro(i.estimateCents),euro(i.contractedCents),euro(i.paidCents),
 i.url||"",safeUrl(i.photoUrl,origin),date(i.createdAt),date(i.updatedAt),i.createdBy,i.updatedBy,i.revision];
const cards=(name,items,origin)=>sheet(name,CARD_HEADERS,items.map(i=>card(i,origin)));
const GUEST_HEADERS=["ID","Nombre","Lista","Asistencia","Menú","Alergias / dieta","Correo","Teléfono","Notas","Mesa","ID mesa","Asiento","Revisión","Actualizado","Actualizado por"];
const guest=(g,tables)=>[g.id,g.name,g.groupName,g.rsvp,g.menu,g.dietaryNotes,g.email,g.phone,g.notes,
 tables.find(t=>t.id===g.tableId)?.name||"",g.tableId||"",g.seatIndex===null||g.seatIndex===undefined?"":g.seatIndex+1,g.revision,date(g.updatedAt),g.updatedBy];
const SEATING_HEADERS=["Mesa","Capacidad","Formato","Ocupación actual","ID mesa","Invitado","Asistencia","Menú","Alergias / dieta","ID invitado","Asiento"];
const seatingRows=(tables,guests)=>tables.flatMap(t=>{
 const attendees=guests.filter(g=>g.tableId===t.id);
 return attendees.length?attendees.map(g=>[t.name,t.capacity,t.shape,attendees.length,t.id,g.name,g.rsvp,g.menu,g.dietaryNotes,g.id,g.seatIndex===null||g.seatIndex===undefined?"":g.seatIndex+1]):
 [[t.name,t.capacity,t.shape,0,t.id,"","","","","",""]];
});
const EXPORT_LIMIT=20000;
export function buildWeddingExport(view,{items=[],guests=[],tables=[]},{origin="",now=new Date()}={}){
 if(!Object.hasOwn(WEDDING_EXPORT_TABS,view))throw new Error("UNKNOWN_WEDDING_EXPORT");
 if(items.length>EXPORT_LIMIT||guests.length>EXPORT_LIMIT||tables.length>EXPORT_LIMIT)throw new Error("WEDDING_EXPORT_TOO_LARGE");
 const label=WEDDING_EXPORT_TABS[view],moneyItems=items.filter(i=>i.category!=="invitados");
 let sheets=[];
 if(view==="kanban")sheets=[cards("Kanban",items,origin)];
 if(view==="agenda")sheets=[cards("Tareas",items.filter(i=>i.category==="tareas"),origin)];
 if(view==="proveedores")sheets=[cards("Proveedores",items.filter(i=>
  i.category!=="tareas"&&i.category!=="invitados"&&
  (i.provider||["finca","catering","fotografia","musica"].includes(i.category))),origin)];
 if(view==="inspiracion")sheets=[cards("Inspiración",items.filter(i=>
  !["tareas","invitados"].includes(i.category)&&(i.url||i.photoUrl||i.status==="idea")),origin)];
 if(view==="planificacion"){
  const active=moneyItems.filter(i=>i.status!=="descartado");
  const planned=active.reduce((s,i)=>s+(i.contractedCents??i.estimateCents??0),0);
  const contracted=active.reduce((s,i)=>s+(i.contractedCents??0),0);
  const paid=active.reduce((s,i)=>s+(i.paidCents||0),0);
  sheets=[
   sheet("Resumen",["Indicador","Importe (€)"],[
    ["Planificado (contratado o estimado)",euro(planned)],
    ["Contratado",euro(contracted)],["Pagado",euro(paid)],
    ["Pendiente contratado",euro(contracted-paid)],["Partidas activas",active.length]
   ]),
   cards("Partidas",moneyItems,origin)
  ];
 }
 if(view==="invitados"){
  sheets=[sheet("Todos",GUEST_HEADERS,guests.map(g=>guest(g,tables)))];
  for(const [key,name] of WEDDING_GUEST_GROUPS){
   sheets.push(sheet(name.slice(0,31),GUEST_HEADERS,guests.filter(g=>g.groupName===key).map(g=>guest(g,tables))));
  }
  const known=new Set(WEDDING_GUEST_GROUPS.map(x=>x[0]));
  sheets.push(sheet("Sin clasificar",GUEST_HEADERS,guests.filter(g=>!known.has(g.groupName)).map(g=>guest(g,tables))));
 }
 if(view==="mesas"){
  sheets=[
   sheet("Mesas",["ID","Mesa","Capacidad","Forma","Ocupación","Posición X (%)","Posición Y (%)","Revisión","Actualizado"],tables.map(t=>[
    t.id,t.name,t.capacity,t.shape,guests.filter(g=>g.tableId===t.id).length,t.positionX??"",t.positionY??"",t.revision,date(t.updatedAt)
   ])),
   sheet("Distribución",SEATING_HEADERS,seatingRows(tables,guests)),
   sheet("Sin mesa",GUEST_HEADERS,guests.filter(g=>!g.tableId).map(g=>guest(g,tables)))
  ];
 }
 if(view==="bodasnet")sheets=[sheet("Recursos Bodas.net",["Servicio","URL oficial","Descripción"],BODAS_LINKS.map(x=>[x[0],x[1],x[2]]))];
 const dateStamp=now.toISOString().slice(0,10);
 const sensitive=["invitados","mesas"].includes(view);
 sheets.push(sheet("Información",["Campo","Valor"],[
  ["Sección",label],["Generado (UTC)",now.toISOString()],
  ["Origen","Segundo Cerebro · Boda · datos actuales de la API privada"],
  ["Registros",sheets.reduce((sum,x)=>sum+x.records.length,0)],
  ["Alcance","Todos los registros del apartado, sin aplicar filtros visuales"],
  ["Fotos","Solo enlaces autenticados; las imágenes no se incluyen en el Excel"],
  ["Datos personales",sensitive?"Contiene datos personales y posibles notas de salud. Comparte únicamente con personas autorizadas.":"Puede contener información privada. Comparte con precaución."],
  ["Respaldo","Exportación manual. No sustituye a una copia automática verificada de D1 y fotografías."]
 ]));
 return {filename:"Boda_"+view+"_"+dateStamp+".xlsx",label,sensitive,sheets};
}
const encoder=new TextEncoder(),bytes=s=>encoder.encode(s);
const u16=(view,at,value)=>view.setUint16(at,value,true);
const u32=(view,at,value)=>view.setUint32(at,value>>>0,true);
const crcTable=Array.from({length:256},(_,n)=>{
 let c=n;for(let i=0;i<8;i++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);return c>>>0;
});
const crc32=data=>{let x=0xFFFFFFFF;for(const byte of data)x=crcTable[(x^byte)&255]^(x>>>8);return (x^0xFFFFFFFF)>>>0;};
function zipEntries(files){
 let offset=0;const local=[],central=[];
 for(const [name,body] of files){
  const path=bytes(name),data=typeof body==="string"?bytes(body):body,crc=crc32(data);
  if(path.length>65535||data.length>0xFFFFFFFF)throw new Error("INVALID_XLSX_SIZE");
  const lh=new Uint8Array(30+path.length),lv=new DataView(lh.buffer);
  u32(lv,0,0x04034B50);u16(lv,4,20);u16(lv,6,0x0800);u16(lv,8,0);
  u32(lv,14,crc);u32(lv,18,data.length);u32(lv,22,data.length);u16(lv,26,path.length);lh.set(path,30);
  local.push(lh,data);
  const ch=new Uint8Array(46+path.length),cv=new DataView(ch.buffer);
  u32(cv,0,0x02014B50);u16(cv,4,20);u16(cv,6,20);u16(cv,8,0x0800);
  u16(cv,10,0);u32(cv,16,crc);u32(cv,20,data.length);u32(cv,24,data.length);
  u16(cv,28,path.length);u32(cv,42,offset);ch.set(path,46);
  central.push(ch);offset+=lh.length+data.length;
 }
 const centralSize=central.reduce((s,b)=>s+b.length,0);
 const end=new Uint8Array(22),dv=new DataView(end.buffer);
 u32(dv,0,0x06054B50);u16(dv,8,files.length);u16(dv,10,files.length);
 u32(dv,12,centralSize);u32(dv,16,offset);
 const output=new Uint8Array(offset+centralSize+22);let at=0;
 for(const chunk of [...local,...central,end]){output.set(chunk,at);at+=chunk.length;}
 return output;
}
const header='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
function worksheetXml(s){
 const count=s.headers.length,records=s.records.length;
 if(count<1||count>16384||records>1048575)throw new Error("INVALID_SHEET_SIZE");
 const cell=(value,r,c,isHeader=false)=>{
  const ref=colName(c)+r,style=isHeader?' s="1"':"";
  if(value&&typeof value==="object"&&Object.hasOwn(value,"currency"))
   return '<c r="'+ref+'" s="2"><v>'+Number(value.currency).toFixed(2)+'</v></c>';
  if(typeof value==="number"&&Number.isFinite(value))
   return '<c r="'+ref+'"><v>'+value+'</v></c>';
  // Inline strings prevent spreadsheet formula injection, including values starting with = + - @.
  return '<c r="'+ref+'" t="inlineStr"'+style+'><is><t xml:space="preserve">'+xml(value)+'</t></is></c>';
 };
 const row=(values,n,isHeader)=>'<row r="'+n+'">'+values.map((v,c)=>cell(v,n,c,isHeader)).join("")+'</row>';
 const cols=s.headers.map((title,c)=>'<col min="'+(c+1)+'" max="'+(c+1)+'" width="'+Math.min(38,Math.max(13,text(title).length+5))+'" customWidth="1"/>').join("");
 let xmlRows=row(s.headers,1,true);
 for(let i=0;i<records;i++)xmlRows+=row(s.records[i],i+2,false);
 const last=colName(count-1)+(records.length+1);
 return header+'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
 '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'+
 '<cols>'+cols+'</cols><sheetData>'+xmlRows+'</sheetData><autoFilter ref="A1:'+last+'"/></worksheet>';
}
const stylesXml=header+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
 '<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;€&quot;#,##0.00"/></numFmts>'+
 '<fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts>'+
 '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17365D"/><bgColor indexed="64"/></patternFill></fill></fills>'+
 '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'+
 '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
 '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'+
 '<xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFill="1" applyFont="1"/>'+
 '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>';
export function createWeddingXlsx(sheets){
 if(!Array.isArray(sheets)||!sheets.length||sheets.length>255)throw new Error("INVALID_WORKBOOK");
 const names=new Set();for(const sh of sheets){
  if(!sh.name||sh.name.length>31||names.has(sh.name))throw new Error("INVALID_SHEET_NAME");
  names.add(sh.name);
 }
 const types=header+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
 '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
 '<Default Extension="xml" ContentType="application/xml"/>'+
 '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
 '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
 sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join("")+'</Types>';
 const rootRels=header+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
 '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
 const wb=header+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+
 sheets.map((s,i)=>'<sheet name="'+xml(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join("")+
 '</sheets></workbook>';
 const wbRels=header+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
 sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join("")+
 '<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
 return zipEntries([["[Content_Types].xml",types],["_rels/.rels",rootRels],["xl/workbook.xml",wb],
  ["xl/_rels/workbook.xml.rels",wbRels],["xl/styles.xml",stylesXml],
  ...sheets.map((s,i)=>["xl/worksheets/sheet"+(i+1)+".xml",worksheetXml(s)])]);
}
