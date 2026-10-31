import test from "node:test";
import assert from "node:assert/strict";
import {travelMapPoints,travelMapDays,travelMapVisible,travelRouteUrls,travelRouteMode} from "./travel-multipoint-map.js";

const make=(date,order,name)=>({date,order,name,query:name+" Test City",status:"PROPUESTA",lat:50+order/10000,lon:20});
test("Travel map draws lodging and ordered stops, keeping alternatives separate",()=>{
 const groups={points:[make("2027-02-02",20,"Stop 2"),make("OPCIONAL",1,"Outside"),make("2027-02-02",10,"Stop 1"),make("ALOJAMIENTO",0,"Lodging"),make("2027-02-03",10,"Next day")]};
 const pts=travelMapPoints(groups);
 assert.deepEqual(travelMapDays(groups),["2027-02-02","2027-02-03"]);
 assert.deepEqual(travelMapVisible(pts,"2027-02-02").map(x=>x.name),["Lodging","Stop 1","Stop 2"]);
 assert.equal(travelMapVisible(pts,"OPCIONAL").length,2);
 assert.ok(!travelMapVisible(pts,"TODOS").some(p=>p.name==="Outside"));
});
test("Google Maps walking directions split mobile itineraries with max 3 intermediate stops",()=>{
 const points=Array.from({length:9},(_,i)=>make("2027-02-02",(i+1)*10,"Stop "+(i+1)));
 const legs=travelRouteUrls(points,"2027-02-02","Example Lodging");
 assert.equal(legs.length,3);
 assert.equal(new URL(legs[0]).searchParams.get("origin"),"Example Lodging");
 assert.equal(new URL(legs[1]).searchParams.get("origin"),"Stop 4 Test City");
 assert.ok(legs.every(url=>(new URL(url).searchParams.get("waypoints")||"").split("|").filter(Boolean).length<=3));
 assert.deepEqual(travelRouteUrls(points,"OPCIONAL","Example Lodging"),[]);
});
test("Invalid coordinates are discarded and no map points are invented",()=>{
 assert.deepEqual(travelMapPoints({points:[]}),[]);
 assert.equal(travelMapPoints({points:[{...make("2027-02-02",1,"Bad"),lat:Infinity}]}).length,0);
});

test("Day routes switch to car for distant regional stops and retain walking downtown",()=>{
 const day="2027-02-02";
 const lodge={...make("ALOJAMIENTO",0,"Lodging"),lat:50,lon:20};
 const downtown=[lodge,make(day,1,"Nearby A"),make(day,2,"Nearby B")];
 assert.equal(travelRouteMode(downtown,day),"walking");
 assert.equal(new URL(travelRouteUrls(downtown,day,"Lodging Test City")[0]).searchParams.get("travelmode"),"walking");
 const rural=[lodge,{...make(day,1,"Distant A"),lat:50.4,lon:20.3},{...make(day,2,"Distant B"),lat:50.45,lon:20.35}];
 assert.equal(travelRouteMode(rural,day),"driving");
 assert.equal(new URL(travelRouteUrls(rural,day,"Lodging Test City")[0]).searchParams.get("travelmode"),"driving");
 assert.equal(travelRouteMode(rural,"OPCIONAL"),"walking");
});
