import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { pantryProductThumbnailMarkup } from "./pantry.js";

const source = await readFile(new URL("./pantry.js", import.meta.url), "utf8");
const styles = await readFile(new URL("./styles.css", import.meta.url), "utf8");
const backend = await readFile(new URL("../private-cloudflare/src/pantry.js", import.meta.url), "utf8");

test("inventory card uses exact canonical imageUrl, lazy image decoding and no referrer", () => {
  const markup = pantryProductThumbnailMarkup({
    productId: "demo-olive-oil",
    name: "Aceite ficticio",
    imageUrl: "https://prod-mercadona.imgix.net/images/demo.jpg?size=large"
  });
  assert.match(markup, /data-photo="available"/);
  assert.match(markup, /src="https:\/\/prod-mercadona\.imgix\.net\/images\/demo\.jpg\?size=large"/);
  assert.match(markup, /alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"/);
  assert.match(source, /pantryProductThumbnailMarkup\(item\)/);
  assert.match(source, /\.pantry-product-thumb img/);
  assert.match(source, /image\.addEventListener\("error"/);
});

test("inventory thumbnails never invent product photos or accept unsafe URLs", () => {
  for (const url of [undefined, "", "javascript:alert(1)", "http://example.com/a.jpg", "https://example.com@bad.invalid/image.png"]) {
    const markup = pantryProductThumbnailMarkup({ imageUrl: url });
    assert.match(markup, /data-photo="pending"/);
    assert.doesNotMatch(markup, /<img/);
    assert.match(markup, /Sin foto/);
  }
  const escaped = pantryProductThumbnailMarkup({ imageUrl: "https://example.com/image?x=1&y=2" });
  assert.match(escaped, /x=1&amp;y=2/);
});

test("thumbnail layout is contained and mobile keeps the inventory grid readable", () => {
  assert.match(styles, /\.pantry-product-identity\s*\{[^}]*grid-template-columns:\s*72px minmax\(0, 1fr\)/);
  assert.match(styles, /\.pantry-product-thumb img\s*\{[^}]*object-fit:\s*contain/);
  assert.match(styles, /\.pantry-product-thumb\[data-photo="pending"\]/);
  assert.match(styles, /\.pantry-product-grid\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(styles, /\.pantry-product-identity\s*\{\s*grid-template-columns:\s*64px minmax\(0, 1fr\)/);
});

test("Pantry inventory image identity is read only and comes from Productos.imagen_url", () => {
  assert.match(backend, /imageUrl:\s*row\.imagen_url\s*\|\|\s*null/);
  assert.match(backend, /imageUrl:\s*product\.imageUrl\s*\|\|\s*null/);
});
