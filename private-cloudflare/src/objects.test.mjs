import assert from "node:assert/strict";
import test from "node:test";
import { buildPayload, inferWardrobeLayer, normalizeLookRole, validateObjectsLookSelection } from "./objects.js";

test("inferWardrobeLayer maps common wardrobe types to visual layers", () => {
  assert.equal(inferWardrobeLayer("Camisa Oxford"), "superior");
  assert.equal(inferWardrobeLayer("Chaqueta blazer"), "exterior");
  assert.equal(inferWardrobeLayer("Pantalón chino"), "inferior");
  assert.equal(inferWardrobeLayer("Zapatillas deportivas"), "calzado");
  assert.equal(inferWardrobeLayer("Cinturón de piel"), "accesorio");
});

test("look validation only accepts existing wardrobe items with unique roles", () => {
  const wardrobe = [
    { objectId: "shirt-1", status: "DISPONIBLE" },
    { objectId: "trousers-1", status: "EN_USO" },
    { objectId: "shoes-1", status: "DISPONIBLE" },
    { objectId: "jacket-1", status: "DISPONIBLE" }
  ];
  const result = validateObjectsLookSelection(wardrobe, [
    { objectId: "shirt-1", role: "superior" },
    { objectId: "jacket-1", role: "exterior" },
    { objectId: "trousers-1", role: "inferior" },
    { objectId: "shoes-1", role: "calzado" }
  ]);
  assert.equal(result.length, 4);
  assert.deepEqual(result.map((item) => item.role), ["superior","exterior","inferior","calzado"]);
});

test("look validation rejects nonexistent garments", () => {
  const wardrobe = [
    { objectId: "shirt-1", status: "DISPONIBLE" },
    { objectId: "trousers-1", status: "DISPONIBLE" },
    { objectId: "shoes-1", status: "DISPONIBLE" }
  ];
  assert.throws(
    () => validateObjectsLookSelection(wardrobe, [
      { objectId: "shirt-1", role: "superior" },
      { objectId: "missing", role: "inferior" },
      { objectId: "shoes-1", role: "calzado" }
    ]),
    /INVALID_OBJECTS_LOOK_OBJECT/
  );
});

test("look validation requires superior, inferior and footwear", () => {
  const wardrobe = [
    { objectId: "shirt-1", status: "DISPONIBLE" },
    { objectId: "jacket-1", status: "DISPONIBLE" },
    { objectId: "shoes-1", status: "DISPONIBLE" }
  ];
  assert.throws(
    () => validateObjectsLookSelection(wardrobe, [
      { objectId: "shirt-1", role: "superior" },
      { objectId: "jacket-1", role: "exterior" },
      { objectId: "shoes-1", role: "calzado" }
    ]),
    /INVALID_OBJECTS_LOOK_INCOMPLETE/
  );
});


test("normalizeLookRole keeps historical aliases compatible with the canonical roles", () => {
  assert.equal(normalizeLookRole("capa exterior"), "exterior");
  assert.equal(normalizeLookRole("Capa superior"), "superior");
  assert.equal(normalizeLookRole("zapatos"), "calzado");
});

test("look validation rejects a garment assigned to the wrong visual layer", () => {
  const wardrobe = [
    { objectId: "shirt-1", status: "DISPONIBLE", layer: "superior" },
    { objectId: "trousers-1", status: "DISPONIBLE", layer: "inferior" },
    { objectId: "shoes-1", status: "DISPONIBLE", layer: "calzado" }
  ];
  assert.throws(
    () => validateObjectsLookSelection(wardrobe, [
      { objectId: "shirt-1", role: "calzado" },
      { objectId: "trousers-1", role: "inferior" },
      { objectId: "shoes-1", role: "superior" }
    ]),
    /INVALID_OBJECTS_LOOK_LAYER/
  );
});


test("look items expose canonical wardrobe image references without duplicating Sheet data", () => {
  const payload = buildPayload({
    objects: [{
      objeto_id: "shirt-1",
      nombre: "Camisa celeste",
      categoria: "Ropa",
      subcategoria: "Camisa",
      marca: "Scalpers"
    }],
    wardrobe: [{
      objeto_id: "shirt-1",
      tipo_prenda: "Camisa",
      color: "celeste",
      foto_procesada_url: "/api/objects/shirt-1/image/processed?v=abc",
      miniatura_url: "/api/objects/shirt-1/image/thumbnail?v=abc",
      vista_prenda: "frontal",
      patron: "liso",
      capa: "superior"
    }],
    looks: [{ look_id: "look-1", nombre: "Look de prueba" }],
    lookItems: [{ look_id: "look-1", objeto_id: "shirt-1", rol: "superior" }],
    kits: [],
    kitItems: [],
    lists: [],
    listItems: []
  });

  const item = payload.looks[0].items[0];
  assert.equal(item.objectId, "shirt-1");
  assert.equal(item.processedPhotoUrl, "/api/objects/shirt-1/image/processed?v=abc");
  assert.equal(item.thumbnailUrl, "/api/objects/shirt-1/image/thumbnail?v=abc");
  assert.equal(item.visualReferenceUrl, "/api/objects/shirt-1/image/processed?v=abc");
  assert.equal(item.brand, "Scalpers");
  assert.equal(item.color, "celeste");
  assert.equal(item.pattern, "liso");
  assert.equal(item.garmentView, "frontal");
  assert.equal(item.layer, "superior");
});
