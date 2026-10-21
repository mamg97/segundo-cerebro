import assert from "node:assert/strict";
import test from "node:test";
import { buildPayload, inferWardrobeLayer, normalizeLookRole, validateObjectsLookSelection, updateObjectsPackingItem } from "./objects.js";

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


test("five-piece office look accepts a shirt interior beneath a superior sweater", () => {
  const wardrobe = [
    { objectId: "shirt", layer: "superior", status: "DISPONIBLE" },
    { objectId: "sweater", layer: "superior", status: "DISPONIBLE" },
    { objectId: "puffer", layer: "exterior", status: "DISPONIBLE" },
    { objectId: "jeans", layer: "inferior", status: "DISPONIBLE" },
    { objectId: "sneakers", layer: "calzado", status: "DISPONIBLE" }
  ];
  const items = validateObjectsLookSelection(wardrobe, [
    { objectId: "shirt", role: "interior" },
    { objectId: "sweater", role: "superior" },
    { objectId: "puffer", role: "exterior" },
    { objectId: "jeans", role: "inferior" },
    { objectId: "sneakers", role: "calzado" }
  ]);
  assert.equal(items.length, 5);
  assert.equal(items[0].role, "interior");
  assert.equal(normalizeLookRole("capa interior"), "interior");
});

test("interior cannot be shoes and a garment cannot occupy two roles", () => {
  const wardrobe = [
    { objectId: "shirt", layer: "superior" },
    { objectId: "jeans", layer: "inferior" },
    { objectId: "sneakers", layer: "calzado" }
  ];
  assert.throws(() => validateObjectsLookSelection(wardrobe, [
    { objectId: "sneakers", role: "interior" },
    { objectId: "shirt", role: "superior" },
    { objectId: "jeans", role: "inferior" },
    { objectId: "sneakers", role: "calzado" }
  ]), /INVALID_OBJECTS_LOOK_LAYER/);
  assert.throws(() => validateObjectsLookSelection(wardrobe, [
    { objectId: "shirt", role: "interior" },
    { objectId: "shirt", role: "superior" },
    { objectId: "jeans", role: "inferior" },
    { objectId: "sneakers", role: "calzado" }
  ]), /INVALID_OBJECTS_LOOK_DUPLICATE_OBJECT/);
});


test("travel lists preserve stable item identity, packing stages and literal quantities", () => {
  const payload=buildPayload({
    objects:[],wardrobe:[],looks:[],lookItems:[],kits:[],kitItems:[],
    lists:[{lista_id:"list-villafranca-sevilla-20261021",nombre:"Viaje Villafranca + Sevilla",contexto:"viaje / lista de equipaje"}],
    listItems:[{
      lista_id:"list-villafranca-sevilla-20261021", item_id:"list-villafranca-sevilla-20261021-001",
      nombre:"Calzoncillos", cantidad:"7-8", importancia:"NECESARIO", estado:"SELECCIONADO",
      etapa:"Madrid → Villafranca",grupo:"Básicos y viaje",orden:3
    }]
  });
  assert.equal(payload.lists.length,1);
  const item=payload.lists[0].items[0];
  assert.equal(item.id,"list-villafranca-sevilla-20261021-001");
  assert.equal(item.name,"Calzoncillos");
  assert.equal(item.quantityLabel,"7-8");
  assert.equal(item.stage,"Madrid → Villafranca");
  assert.equal(item.group,"Básicos y viaje");
  assert.equal(item.order,3);
  assert.equal(item.state,"SELECCIONADO");
});

test("packing state update writes only the matching item state cell", async () => {
  const originalFetch=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async (url,options={})=>{
    calls.push({url:String(url),options});
    if(!options.method||options.method==="GET"){
      return new Response(JSON.stringify({values:[
        ["lista_id","objeto_id","nombre","cantidad","importancia","estado","kit_id","notas","item_id","etapa","grupo","orden"],
        ["other-list","","Unrelated",1,"NECESARIO","SELECCIONADO","","","other-list-001"],
        ["list-test-20261021","","Colonia",1,"NECESARIO","SELECCIONADO","","","list-test-20261021-001"]
      ]}),{status:200,headers:{"Content-Type":"application/json"}});
    }
    return new Response(JSON.stringify({updatedCells:1}),{status:200,headers:{"Content-Type":"application/json"}});
  };
  try{
    const result=await updateObjectsPackingItem({
      GOOGLE_CLIENT_ID:"test",GOOGLE_CLIENT_SECRET:"test",GOOGLE_REFRESH_TOKEN:"test",OBJECTS_SHEET_ID:"test-sheet"
    },async()=>"token",{listId:"list-test-20261021",itemId:"list-test-20261021-001",expectedState:"SELECCIONADO",state:"PREPARADO"});
    assert.equal(result.state,"PREPARADO");
    assert.equal(calls.length,2);
    assert.match(calls[1].url,/ListaItems(?:%21|!)F3/);
    assert.equal(calls[1].options.method,"PUT");
    assert.deepEqual(JSON.parse(calls[1].options.body),{values:[["PREPARADO"]]});
  }finally{globalThis.fetch=originalFetch;}
});

test("packing API rejects unsafe state and ambiguous identifiers without a write", async () => {
  await assert.rejects(()=>updateObjectsPackingItem({
    GOOGLE_CLIENT_ID:"test",GOOGLE_CLIENT_SECRET:"test",GOOGLE_REFRESH_TOKEN:"test"
  },async()=>"token",{listId:"list-test-20261021",itemId:"list-test-20261021-001",expectedState:"SELECCIONADO",state:"INVENTADO"}),/INVALID_OBJECTS_PACKING_STATE/);
});


test("planned outfits join their real wardrobe IDs to one travel list only",()=>{
  const payload=buildPayload({
    objects:[{objeto_id:"shirt-1",nombre:"Camisa de gala",categoria:"Ropa",estado:"DISPONIBLE"}],
    wardrobe:[],looks:[],lookItems:[],kits:[],kitItems:[],
    lists:[
      {lista_id:"trip-a",nombre:"Viaje A",contexto:"viaje",fecha_inicio:"2026-10-21",fecha_fin:"2026-10-27"},
      {lista_id:"trip-b",nombre:"Viaje B",contexto:"viaje"}
    ],
    listItems:[],
    listPlanning:[
      {lista_id:"trip-a",fecha:"2026-10-23",momento:"sin_hora",actividad:"Preboda",objetos_ids:"shirt-1;unknown-thing",prendas_texto:"americana verde",orden:2},
      {lista_id:"trip-b",fecha:"2026-10-24",momento:"noche",actividad:"Otra boda",objetos_ids:"shirt-1",orden:1}
    ]
  });
  const a=payload.lists.find(x=>x.id==="trip-a");
  const b=payload.lists.find(x=>x.id==="trip-b");
  assert.equal(a.planning.length,1);
  assert.equal(b.planning.length,1);
  assert.deepEqual(a.planning[0].objectIds,["shirt-1"]);
  assert.equal(a.planning[0].daypart,"sin_hora");
  assert.equal(a.planning[0].garmentNotes,"americana verde");
  assert.equal(a.planning[0].date,"2026-10-23");
});
