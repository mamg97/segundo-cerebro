import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gymPhotosMarkup } from "./gym-progress-photos.mjs";
import { validGymPhotoDate, normalizeGymPhotoView, validatePrivatePhotoBytes,
  splitGymPhotoBase64, GYM_PHOTO_SHEET_HEADER } from "../private-cloudflare/src/gym-photos.js";

const record = (date) => ({date,views:Object.fromEntries(["frente","diagonal","perfil"].map(v =>
  [v,{url:"/api/gym/photos/"+date+"/"+v+"/image?v=2026-01-02T13%3A00%3A00Z",archived:true}]))});

test("photo gallery opens only same-origin private image URLs in order", () => {
  const html = gymPhotosMarkup([record("2026-10-16")]);
  assert.match(html, /Progreso físico/);
  const names = ["Frente", "Diagonal · 45°", "Perfil"];
  assert.ok(html.indexOf("Frente") < html.indexOf("Diagonal · 45°"));
  assert.ok(html.indexOf("Diagonal · 45°") < html.indexOf("Perfil"));
  for (const view of ["frente","diagonal","perfil"]) assert.match(html, new RegExp("/api/gym/photos/2026-10-16/"+view+"/image"));
  assert.match(html, /object|<img/);
  assert.doesNotMatch(html, /drive.google.com|file\/d\//);
  assert.match(html, /Añadir serie fotográfica/);
  assert.match(html, /Eliminar esta serie fotográfica/);
});

test("multiple dated series can be compared without arbitrary image sources", () => {
  const old = record("2026-09-01");
  old.views.frente.url = "https://attacker.invalid/x.jpg";
  const html = gymPhotosMarkup([record("2026-10-16"),old], "2026-10-16","2026-09-01");
  assert.match(html,/Comparación/);
  assert.match(html,/Sin fotografía/);
  assert.doesNotMatch(html,/attacker.invalid/);
  assert.equal((html.match(/class="gym-photos-series"/g)||[]).length, 2);
  assert.equal((html.match(/class="gym-photo-figure"/g)||[]).length, 6);
});

test("validate dates and strict photo angle contract", () => {
  assert.equal(validGymPhotoDate("2026-10-16"),true);
  assert.equal(validGymPhotoDate("2026-02-29"),false);
  assert.equal(validGymPhotoDate("2028-02-29"),true);
  assert.equal(validGymPhotoDate("2026-10-16T01:00:00Z"),false);
  assert.equal(validGymPhotoDate("1999-12-31"),false);
  assert.equal(normalizeGymPhotoView("diagonal"),"diagonal");
  assert.throws(()=>normalizeGymPhotoView("detrás"),/INVALID_GYM_PHOTO_VIEW/);
  assert.equal(GYM_PHOTO_SHEET_HEADER.length,27);
  assert.deepEqual(GYM_PHOTO_SHEET_HEADER.slice(0,7),
    ["fecha","vista","drive_file_id","original_mime","preview_mime","created_at","updated_at"]);
});

test("multipart images must be WebP with no ancillary metadata or oversized payload", () => {
  const makeWebp = (kind) => {
    const out = new Uint8Array(20);
    for (const [i,c] of [..."RIFF"].entries()) out[i]=c.charCodeAt(0);
    for (const [i,c] of [..."WEBP"].entries()) out[8+i]=c.charCodeAt(0);
    for (const [i,c] of [...kind].entries()) out[12+i]=c.charCodeAt(0);
    return out;
  };
  assert.equal(validatePrivatePhotoBytes(makeWebp("VP8 "), "image/webp").length,20);
  assert.throws(()=>validatePrivatePhotoBytes(makeWebp("EXIF"), "image/webp"), /GYM_PHOTO_METADATA_NOT_ALLOWED/);
  assert.throws(()=>validatePrivatePhotoBytes(makeWebp("XMP "), "image/webp"), /GYM_PHOTO_METADATA_NOT_ALLOWED/);
  assert.throws(()=>validatePrivatePhotoBytes(makeWebp("VP8 "), "image/jpeg"), /GYM_PHOTO_WEBP_REQUIRED/);
  assert.throws(()=>validatePrivatePhotoBytes(new Uint8Array(450001), "image/webp"), /GYM_PHOTO_TOO_LARGE/);
  assert.deepEqual(splitGymPhotoBase64("ABC"),["ABC",...Array(19).fill("")]);
});

test("Gym panel lazy-loads photos only when tab selected and retains calendar under save", () => {
  const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
  const page=readFileSync(new URL("./index.html",import.meta.url),"utf8");
  const worker=readFileSync(new URL("../private-cloudflare/src/index.js",import.meta.url),"utf8");
  const css=readFileSync(new URL("./gym-progress-photos.css",import.meta.url),"utf8");
  assert.match(app,/data-gym-view="photos">Progreso físico/);
  assert.match(app,/data-gym-view-panel="photos" hidden/);
  assert.match(app,/if \(target === "photos"\) void loadGymProgressPhotos\(privateMode\)/);
  assert.match(app,/renderGymMonthCalendar\(sessions, plan\)/);
  assert.match(page,/gym-progress-photos\.css\?v=0\.44\.49/);
  assert.match(worker,/url\.pathname === "\/api\/gym\/photos"/);
  assert.match(worker,/const gymPhotoImage/);
  assert.match(worker,/Cache-Control": "no-store"/);
  assert.match(css,/object-fit: contain/);
  assert.match(css,/repeat\(3, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(app,/drive_file_id/);
});
