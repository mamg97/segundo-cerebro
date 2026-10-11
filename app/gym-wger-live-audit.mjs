// Read-only upstream diagnostic. Public wger exercise names only; no private API or data.
// Run in GitHub Actions, not on a user's authenticated session.
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { searchGymExerciseLibrary } from "../private-cloudflare/src/gym-library.js";

const frontend = await readFile(new URL("./app.js", import.meta.url), "utf8");
const source = frontend.slice(frontend.indexOf("const GYM_CUSTOM_ANIMATIONS"),
  frontend.indexOf("function gymPlanExerciseLinkMap"));
if (!source.startsWith("const GYM_CUSTOM_ANIMATIONS")) throw Error("Missing animation config");
const ctx = vm.createContext({ Map, document: undefined,
  gymVideoInventory: new Map(), gymVideoChecks: new Map(), gymMediaInventoryRunning: false });
vm.runInContext(source, ctx);
const animations = vm.runInContext("GYM_CUSTOM_ANIMATIONS.map(({key,labels})=>({key,labels}))", ctx);
const shortQueries = {
  "press-banca-plano-barra": ["bench press", "press de banca"],
  "press-inclinado-barra": ["incline", "press inclinado"],
  "military-press": ["military press", "press militar"],
  "fondos-paralelas": ["dips", "fondos"],
  "extension-triceps-polea-sobre-cabeza": ["triceps extension", "extension triceps"],
  "dominadas-explosivas": ["pull up", "dominadas"],
  "remo-barra": ["barbell row", "remo con barra"],
  "pullover-polea-alta": ["pullover", "polea alta"],
  "pajaros-maquina": ["reverse fly", "pajaros"],
  "curl-biceps-barra-ez": ["ez bar", "curl barra"],
  "curl-martillo-polea": ["hammer curl", "curl martillo"],
  "gemelos-maquina-pie": ["standing calf", "gemelos"]
};
const matchesExact = (item, key) => vm.runInContext(
  "gymCustomAnimationFor(" + JSON.stringify(item) + ")?.key === " + JSON.stringify(key), ctx);
const results = [];
let cursor = 0;
async function runner() {
  while (cursor < animations.length) {
    const animation = animations[cursor++];
    const byId = new Map();
    const errors = [];
    let queriesOk = 0;
    for (const query of shortQueries[animation.key] || [animation.labels[0]]) {
      try {
        const response = await searchGymExerciseLibrary({ q: query, limit: 48 });
        queriesOk++;
        for (const exercise of response.exercises || []) byId.set(String(exercise.id), exercise);
      } catch (error) { errors.push(String(error.message || "API_UNAVAILABLE").slice(0,70)); }
    }
    const all = [...byId.values()];
    const strict = all.filter(item => matchesExact(item, animation.key));
    const withVideo = strict.filter(item => item.videos?.some(v =>
      /^\/api\/gym\/exercises\/\d+\/media\/video\/\d+/.test(v.url || "")));
    const nearby = all.filter(item => item.videos?.length && !strict.includes(item))
      .slice(0, 4).map(item => ({ name: item.name, equipment: item.equipment?.map(x=>x.name),
        id: item.id, videoCount: item.videos.length }));
    const row = { exercise:animation.key,
      status: withVideo.length ? "WGER_VIDEO_LINKED" : queriesOk === 0 ? "PROVIDER_UNAVAILABLE" : "NO_STRICT_VIDEO_IN_QUERIES",
      strictCandidates:strict.length, matchedVideoCount:withVideo.length,
      verifiedCandidates: withVideo.map(item => ({ id: item.id, name:item.name,
        equipment:item.equipment?.map(x=>x.name), videos:item.videos.map(x=>x.id) })).slice(0,4),
      otherVideoCandidates:nearby, queriesOk, queryCount:(shortQueries[animation.key]||[]).length,
      errors:errors.slice(0,2) };
    results.push(row);
    process.stdout.write("[WGER_MEDIA] "+JSON.stringify(row)+"\n");
  }
}
await Promise.all([runner(),runner()]);
const ordered = animations.map(a => results.find(x=>x.exercise===a.key));
process.stdout.write("[WGER_SUMMARY] "+JSON.stringify({
  total:ordered.length,
  videoLinked:ordered.filter(x=>x.status==="WGER_VIDEO_LINKED").length,
  noStrictMatchInQueries:ordered.filter(x=>x.status==="NO_STRICT_VIDEO_IN_QUERIES").length,
  providerUnavailable:ordered.filter(x=>x.status==="PROVIDER_UNAVAILABLE").length,
  limitations:"Public wger metadata only. Does not verify private Worker login, proxy playback or completeness of wger's catalog."
})+"\n");
