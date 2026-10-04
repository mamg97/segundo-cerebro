import test from "node:test";
import assert from "node:assert/strict";
import { isTrustedWgerMediaUrl, normalizeWgerExercise } from "./gym-library.js";

test("wger media proxy only trusts HTTPS wger hosts", () => {
  assert.equal(isTrustedWgerMediaUrl("https://wger.de/media/exercises/demo.mp4"), true);
  assert.equal(isTrustedWgerMediaUrl("https://cdn.wger.de/media/demo.webp"), true);
  assert.equal(isTrustedWgerMediaUrl("http://wger.de/media/demo.mp4"), false);
  assert.equal(isTrustedWgerMediaUrl("https://wger.example.com/demo.mp4"), false);
  assert.equal(isTrustedWgerMediaUrl("https://example.com/demo.mp4"), false);
});

test("exercise normalization prefers Spanish and keeps licensed media proxied", () => {
  const raw = {
    id: 42,
    uuid: "00000000-0000-0000-0000-000000000042",
    category: { id: 8, name: "Arms" },
    muscles: [{ id: 1, name: "Biceps brachii", name_en: "Biceps" }],
    muscles_secondary: [],
    equipment: [{ id: 3, name: "Dumbbell" }],
    license: { full_name: "Creative Commons Attribution Share Alike 4.0" },
    translations: [
      { language: 2, name: "Dumbbell curl", description: "<p>Curl the dumbbell.</p>", aliases: [] },
      { language: 4, name: "Curl con mancuerna", description: "<p>Flexiona el codo.</p>", aliases: [{ alias: "Curl bíceps" }] }
    ],
    images: [{
      id: 9,
      image: "https://wger.de/media/exercise-images/42/demo.webp",
      thumbnails: { medium: "https://wger.de/media/cache/demo-medium.webp" },
      is_main: true,
      license: 2,
      license_title: "CC BY-SA 4.0"
    }],
    videos: [{
      id: 11,
      video: "https://wger.de/media/exercise-videos/42/demo.mp4",
      is_main: true,
      license: 2,
      license_title: "CC BY-SA 4.0",
      duration: 3.4
    }]
  };
  const exercise = normalizeWgerExercise(raw, new Map([["2", "en"], ["4", "es"]]));
  assert.equal(exercise.name, "Curl con mancuerna");
  assert.equal(exercise.description, "Flexiona el codo.");
  assert.deepEqual(exercise.aliases, ["Curl bíceps"]);
  assert.equal(exercise.hasVideo, true);
  assert.match(exercise.videos[0].url, /^\/api\/gym\/exercises\/42\/media\/video\/11$/);
  assert.match(exercise.images[0].previewUrl, /^\/api\/gym\/exercises\/42\/media\/image\/9\?variant=medium$/);
  assert.equal(exercise.videos[0].license.title, "CC BY-SA 4.0");
});
