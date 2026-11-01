// Pure wedding seating projections. Never writes or guesses guest relationships.
// These models do not mutate D1 or seat guests automatically.
export const ROUND_CAPACITIES=[6,8,10,12];
export function seatingSummary(guests=[],tables=[]){
 const optional=guests.filter(g=>g.groupName==="opcionales").length;
 const definite=guests.filter(g=>g.groupName!=="opcionales");
 const confirmed=definite.filter(g=>g.rsvp==="confirmado");
 const pending=definite.filter(g=>g.rsvp!=="confirmado"&&g.rsvp!=="rechazado").length;
 const declined=definite.filter(g=>g.rsvp==="rechazado").length;
 const occupied=guests.filter(g=>g.tableId).length;
 // "0 confirmados sin mesa" never meant everyone had a table: pending and
 // optional guests are real names, also requiring assignment until declined.
 const unseatedAll=guests.filter(g=>!g.tableId&&g.rsvp!=="rechazado");
 const unseatedConfirmed=unseatedAll.filter(g=>g.groupName!=="opcionales"&&g.rsvp==="confirmado");
 const unseatedPending=unseatedAll.filter(g=>g.groupName!=="opcionales"&&g.rsvp!=="confirmado");
 const unseatedOptional=unseatedAll.filter(g=>g.groupName==="opcionales");
 const unseatedDeclined=guests.filter(g=>!g.tableId&&g.rsvp==="rechazado");
 const seats=tables.reduce((sum,t)=>sum+(Number(t.capacity)||0),0);
 return {confirmed:confirmed.length,seated:confirmed.filter(g=>g.tableId).length,
  unseated:confirmed.filter(g=>!g.tableId),
  unseatedAll,unseatedConfirmed,unseatedPending,unseatedOptional,unseatedDeclined,
  pending,declined,optional,occupied,totalGuests:guests.length,
  seats,free:Math.max(0,seats-occupied),tables:tables.length};
}
export function suggestWeddingSeating(guests=[],tables=[]){
 const {confirmed}=seatingSummary(guests,tables);
 if(!confirmed)return [];
 const president=tables.find(t=>t.shape==="presidencial");
 const presidentSeats=president?Number(president.capacity):0;
 const outstanding=Math.max(0,confirmed-presidentSeats);
 const options=ROUND_CAPACITIES.map(capacity=>{
  const rounds=Math.ceil(outstanding/capacity),seats=presidentSeats+rounds*capacity;
  return {capacity,rounds,presidential:!!president,presidentSeats,tableCount:rounds+(president?1:0),
   seats,free:seats-confirmed,confirmed};
 });
 const seen=new Set();
 return options.filter(o=>{const key=[o.rounds,o.seats].join(":");if(seen.has(key))return false;seen.add(key);return true;})
  // Twelve-place rounds are the default; other sizes remain available alternatives.
  .sort((a,b)=>(b.capacity===12)-(a.capacity===12)||
    a.free-b.free||a.tableCount-b.tableCount||
    Math.abs(a.capacity-12)-Math.abs(b.capacity-12));
}
export function roundSeats(capacity,occupied=0){
 const count=Math.max(0,Math.min(30,Number(capacity)||0));
 return Array.from({length:count},(_,i)=>{
  const angle=-Math.PI/2+(i/count)*Math.PI*2;
  return {x:50+44*Math.cos(angle),y:50+44*Math.sin(angle),occupied:i<occupied};
 });
}
