import test from "node:test";
import assert from "node:assert/strict";
import { packingPlanDays, packingPlanModel, packingPlannerMarkup } from "./packing-planner.mjs";

test("Villafranca and Sevilla planner uses seven real dates and no invented times",()=>{
  const list={
    startDate:"2026-10-21",endDate:"2026-10-27",
    planning:[
      {date:"2026-10-22",daypart:"mañana",order:1,title:"Teletrabajo",objectIds:[]},
      {date:"2026-10-23",daypart:"sin_hora",order:2,title:"Preboda",objectIds:["shirt-1"],garmentNotes:"Americana verde"},
      {date:"2026-10-24",daypart:"sin_hora",order:3,title:"Boda",objectIds:[]}
    ]
  };
  const model=packingPlanModel(list);
  assert.equal(model.days.length,7);
  assert.equal(model.events.length,3);
  assert.equal(model.events[1].daypart,"sin_hora");
  const markup=packingPlannerMarkup(list,[{id:"shirt-1",name:"Camisa Dustin"}]);
  assert.match(markup,/Qué usar cada día/);
  assert.match(markup,/Preboda/);
  assert.match(markup,/Sin hora/);
  assert.match(markup,/Camisa Dustin/);
  assert.match(markup,/data-plan-event="2"/);
  assert.doesNotMatch(markup,/19:00|20:00/);
  assert.doesNotMatch(markup,/<script|<img/);
});

test("planner encodes untrusted HTML and ignores out-of-range events",()=>{
  const markup=packingPlannerMarkup({
    startDate:"2026-10-21",endDate:"2026-10-22",
    planning:[
      {date:"2026-10-21",daypart:"noche",order:9,title:'<img src=x onerror=alert(1)>',objectIds:[]},
      {date:"2026-11-25",daypart:"tarde",order:10,title:"Future event",objectIds:[]}
    ]
  },[]);
  assert.doesNotMatch(markup,/<img/);
  assert.match(markup,/&lt;img/);
  assert.doesNotMatch(markup,/Future event/);
});

test("calendar limits impossible ranges for compact display",()=>{
  assert.equal(packingPlanDays("2026-10-21","2026-10-20").length,0);
  assert.equal(packingPlanDays("2026-01-01","2026-02-01").length,0);
  assert.equal(packingPlanDays("2026-10-21","2026-10-21").length,1);
});
