import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateWeddingItem,WeddingError} from "./wedding-store.js";

const valid={category:"tareas",status:"pendiente",title:"Confirmar proveedor",estimateCents:null,paidCents:0};
const store=readFileSync(new URL("./wedding-store.js",import.meta.url),"utf8");
const migration=readFileSync(new URL("../migrations/0014_wedding_assignee.sql",import.meta.url),"utf8");

test("wedding task responsibility accepts existing records and three explicit choices",()=>{
 const original=validateWeddingItem(valid);
 assert.equal(original.assigneeKind,"");
 assert.equal(original.assigneeName,"");
 assert.equal(validateWeddingItem({...valid,assigneeKind:"miguel"}).assigneeKind,"miguel");
 assert.equal(validateWeddingItem({...valid,assigneeKind:"andrea"}).assigneeKind,"andrea");
 assert.deepEqual(
  {kind:validateWeddingItem({...valid,assigneeKind:"otro",assigneeName:"Colaborador de prueba"}).assigneeKind,
   name:validateWeddingItem({...valid,assigneeKind:"otro",assigneeName:"Colaborador de prueba"}).assigneeName},
  {kind:"otro",name:"Colaborador de prueba"});
});
test("wedding assignee validation rejects invalid or inconsistent names",()=>{
 for(const bad of [
  {assigneeKind:"owner"}, {assigneeKind:"otro"},
  {assigneeKind:"miguel",assigneeName:"Nombre extra"},
  {assigneeKind:"",assigneeName:"Sin tipo"},
  {assigneeKind:"otro",assigneeName:"z".repeat(81)}
 ]){
  assert.throws(()=>validateWeddingItem({...valid,...bad}),WeddingError);
 }
});
test("assignee D1 migration does not reset existing assignments or seed real names",()=>{
 assert.match(migration,/ALTER TABLE wedding_items ADD COLUMN assignee_kind/);
 assert.match(migration,/DEFAULT ''/);
 assert.match(migration,/ALTER TABLE wedding_items ADD COLUMN assignee_name/);
 assert.doesNotMatch(migration,/INSERT INTO/);
 assert.match(store,/assigneeKind:r\.assignee_kind\|\|""/);
 assert.match(store,/assigneeName:r\.assignee_name\|\|""/);
 assert.match(store,/data\.assigneeKind=current\.assigneeKind/);
 assert.match(store,/WHERE id=\? AND revision=\?/);
 assert.match(store,/assignee_kind=\?,assignee_name=\?/);
});
