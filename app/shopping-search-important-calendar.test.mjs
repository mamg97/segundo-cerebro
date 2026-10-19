import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {canonicalImportantEventDate} from "./important-events-canonical.mjs";

const entry={title:"Viaje nov",startsAt:"2026-11-20T00:00:00",
  endsAt:"2026-11-24T00:00:00",status:"CONFIRMADO",sourceProvider:"calendar"};

test("canonical dated event outranks a stale iCloud calendar date",()=>{
  const correction=canonicalImportantEventDate([entry],"VIAJE NOV");
  assert.equal(correction.startsAt,"2026-11-20T00:00:00");
  assert.equal(correction.endsAt,"2026-11-24T00:00:00");
});

test("reconciliation is accent and whitespace insensitive but never guesses competing dates",()=>{
  assert.equal(canonicalImportantEventDate([{...entry,title:"Café   con  música"}],"cafe con musica")?.startsAt,
    entry.startsAt);
  assert.equal(canonicalImportantEventDate([entry,{...entry,startsAt:"2026-11-01T00:00:00"}],"Viaje nov"),null);
  assert.equal(canonicalImportantEventDate([{...entry,status:"CANCELADO"}],"Viaje nov"),null);
  assert.equal(canonicalImportantEventDate([entry],"Viaje enero"),null);
});

test("dashboard merges canonical dates without rewriting iCloud's raw calendar event",()=>{
  const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
  const worker=readFileSync(new URL("../private-cloudflare/src/index.js",import.meta.url),"utf8");
  assert.match(app,/canonicalImportantEventDate\(/);
  assert.match(app,/startsAt: authoritative\?\.startsAt \|\| event\.startsAt/);
  assert.match(app,/endsAt: authoritative\?\.endsAt \|\| event\.endsAt/);
  assert.match(app,/payload\.canonicalEventDates/);
  assert.match(worker,/canonicalEventDates: eventsStore\.value\?\.events\?\.map/);
  assert.match(worker,/state\.canonicalEventDates = eventsStore\.value\.events\.map/);
});

test("shopping selector has an instant searchable catalogue without changing product IDs",()=>{
  const pantry=readFileSync(new URL("./pantry.js",import.meta.url),"utf8");
  assert.match(pantry,/data-shopping-product-search/);
  assert.match(pantry,/addEventListener\("input", event =>/);
  assert.match(pantry,/choices\.slice\(0,60\)/);
  assert.match(pantry,/product\.id/);
  assert.match(pantry,/foldProductSearch/);
  assert.match(pantry,/familyNames/);
});
