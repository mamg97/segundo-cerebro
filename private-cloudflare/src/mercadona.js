// Public catalogue reference only. Canonical nutrition and identity stay in Pantry.
const references = new Map();

export function mercadonaProductId(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "tienda.mercadona.es" || url.port || url.username || url.password) return null;
    return url.pathname.match(/^\/product\/(\d+)(?:\/|$)/)?.[1] || null;
  } catch { return null; }
}

export function mercadonaImageUrl(value) {
  try {
    const url = new URL(value);
    const allowed = ["prod-mercadona.imgix.net", "images.mercadona.es", "tienda.mercadona.es"];
    return url.protocol === "https:" && allowed.includes(url.hostname) && !url.port && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export async function fetchMercadonaReference(product, fetcher = fetch) {
  const id = mercadonaProductId(product?.productUrl);
  if (!id) return null;
  const cached = references.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  let value = null;
  try {
    const response = await fetcher(`https://tienda.mercadona.es/api/products/${id}/`, {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(4500)
    });
    if (response.ok) {
      const data = await response.json();
      if (String(data.id) === id) {
        const price = data.price_instructions?.unit_price;
        const parsed = price == null || price === "" ? null : Number(price);
        value = {
          imageUrl: mercadonaImageUrl(data.thumbnail) || mercadonaImageUrl(data.photos?.[0]?.regular),
          cataloguePrice: Number.isFinite(parsed) && parsed >= 0 ? {
            price: parsed, priceBase: "envase / unidad de venta", currency: "EUR",
            date: new Date().toISOString(), source: "Catálogo online Mercadona",
            note: "Precio orientativo consultado online; puede variar según zona y disponibilidad."
          } : null
        };
      }
    }
  } catch { /* Optional reference failure must not hide the canonical product. */ }
  if (references.size >= 500) references.delete(references.keys().next().value);
  references.set(id, { value, expiresAt: Date.now() + (value ? 60 * 60_000 : 60_000) });
  return value;
}
