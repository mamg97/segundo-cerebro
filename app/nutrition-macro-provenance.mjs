// Conservative provenance labelling. A recipe photo documents appearance,
// not nutritional composition. Never infer photographed labels from product names.
export function nutritionMacroProvenance(item) {
  const note = String(item?.note || "");
  const explicit = note.match(/(?:^|\n)MACROS_FUENTE=(ETIQUETA_FOTOGRAFIADA|FICHA_PRODUCTO|FOTO_PLATO|CALCULO_ESTIMADO|PENDIENTE)\./)?.[1];
  const labels = {
    ETIQUETA_FOTOGRAFIADA: ["Etiqueta fotografiada", "label"],
    FICHA_PRODUCTO: ["Ficha de producto", "product"],
    FOTO_PLATO: ["Foto del plato · estimado", "photo"],
    CALCULO_ESTIMADO: ["Cálculo estimado", "estimate"],
    PENDIENTE: ["Macros pendientes", "pending"]
  };
  if (explicit) {
    const [label, kind] = labels[explicit];
    return { label, kind };
  }
  if (item?.kcal == null || item?.protein == null) {
    return { label: "Macros pendientes", kind: "pending" };
  }
  // The absence of an auditable source is never labelled as "etiqueta".
  return { label: "Origen por verificar", kind: "unknown" };
}
export function nutritionMacroVisibleNote(note) {
  return String(note || "").replace(/^MACROS_FUENTE=[^\n]*\n/, "");
}
