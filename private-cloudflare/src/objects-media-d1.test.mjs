import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createObjectsD1MediaStore, OBJECTS_D1_MEDIA_LIMITS } from "./objects-media-d1.js";

class FakeStatement {
  constructor(db, sql, args = []) {
    this.db = db;
    this.sql = String(sql).replace(/\s+/g, " ").trim();
    this.args = args;
  }
  bind(...args) { return new FakeStatement(this.db, this.sql, args); }

  async first() {
    if (this.sql.includes("SELECT chunk_index, HEX(SUBSTR(data, ?, ?)) AS data_hex FROM objects_media_chunks")) {
      const [start,length,key,index] = this.args;
      const rows = this.db.chunks.get(key) || [];
      const result = rows.find((row) => row.chunk_index === index) || null;
      const hex = result ? Buffer.from(result.data).subarray(start-1,start-1+length).toString("hex").toUpperCase() : null;
      if (hex && hex.length > this.db.maxResultBytes) {
        throw new Error("D1_QUERY_RESULT_TOO_LARGE");
      }
      this.db.singleChunkReads++;
      return result ? { chunk_index: result.chunk_index, data_hex: hex } : null;
    }
    if (this.sql.includes("SUM(size_bytes)")) {
      return { total_bytes: [...this.db.assets.values()].reduce((sum, item) => sum + Number(item.size_bytes || 0), 0) };
    }
    if (this.sql.startsWith("SELECT size_bytes FROM objects_media_assets")) {
      const item = this.db.assets.get(this.args[0]);
      return item ? { size_bytes: item.size_bytes } : null;
    }
    if (this.sql.includes("SELECT mime_type, size_bytes, chunk_count, etag")) {
      const item = this.db.assets.get(this.args[0]);
      return item ? { ...item } : null;
    }
    throw new Error("Unexpected first SQL: " + this.sql);
  }

  async all() {
    if (this.sql.includes("SELECT chunk_index, LENGTH(data) AS chunk_bytes FROM objects_media_chunks")) {
      this.db.metadataReads++;
      return { results: (this.db.chunks.get(this.args[0]) || [])
        .map((row) => ({ chunk_index: row.chunk_index, chunk_bytes: row.data.byteLength }))
        .sort((a, b) => a.chunk_index - b.chunk_index) };
    }
    if (this.sql.includes("SELECT chunk_index, data FROM objects_media_chunks")) {
      const items = this.db.chunks.get(this.args[0]) || [];
      const total = items.reduce((n, row) => n + row.data.byteLength, 0);
      if (total > this.db.maxResultBytes) throw new Error("D1_QUERY_RESULT_TOO_LARGE");
      this.db.fullChunkReads++;
      return { results: items.slice().sort((a, b) => a.chunk_index - b.chunk_index) };
    }
    throw new Error("Unexpected all SQL: " + this.sql);
  }

  execute() {
    if (this.sql.startsWith("CREATE TABLE") || this.sql.startsWith("CREATE INDEX")) throw new Error("RUNTIME_DDL_FORBIDDEN");
    if (this.sql.startsWith("INSERT INTO objects_media_assets")) {
      const [storage_key,objeto_id,image_type,version,mime_type,size_bytes,chunk_count,etag,created_at] = this.args;
      if (this.db.assets.has(storage_key)) throw new Error("duplicate");
      this.db.assets.set(storage_key,{storage_key,objeto_id,image_type,version,mime_type,size_bytes,chunk_count,etag,created_at});
      return;
    }
    if (this.sql.startsWith("INSERT INTO objects_media_chunks")) {
      const [storage_key,chunk_index,data] = this.args;
      const list=this.db.chunks.get(storage_key)||[];
      list.push({chunk_index,data});
      this.db.chunks.set(storage_key,list);
      return;
    }
    if (this.sql.startsWith("DELETE FROM objects_media_chunks")) {
      this.db.chunks.delete(this.args[0]);
      return;
    }
    if (this.sql.startsWith("DELETE FROM objects_media_assets")) {
      this.db.assets.delete(this.args[0]);
      return;
    }
    throw new Error("Unexpected batch SQL: " + this.sql);
  }
}

class FakeD1 {
  constructor({ maxBatchBlobBytes = Infinity, maxResultBytes = Infinity } = {}) {
    this.assets=new Map();
    this.chunks=new Map();
    this.maxBatchBlobBytes=maxBatchBlobBytes;
    this.maxResultBytes=maxResultBytes;
    this.singleChunkReads=0;
    this.metadataReads=0;
    this.fullChunkReads=0;
  }
  prepare(sql){ return new FakeStatement(this,sql); }
  async batch(statements){
    const blobBytes=statements.reduce((sum,statement)=>sum+statement.args.reduce((inner,arg)=>{
      if(arg instanceof ArrayBuffer) return inner+arg.byteLength;
      if(ArrayBuffer.isView(arg)) return inner+arg.byteLength;
      return inner;
    },0),0);
    if(blobBytes>this.maxBatchBlobBytes) throw new Error("D1_BATCH_PAYLOAD_TOO_LARGE");
    for(const statement of statements) statement.execute();
    return statements.map(()=>({success:true}));
  }
}

test("D1 media reads stay within per-query BLOB result limits", async () => {
  const limit = OBJECTS_D1_MEDIA_LIMITS.chunkBytes + 1024;
  const db = new FakeD1({ maxResultBytes: limit });
  const store = createObjectsD1MediaStore({ DB: db });
  const key = "objects/obj-bounded-example-001/processed/12345678-abcd";
  const bytes = new Uint8Array(OBJECTS_D1_MEDIA_LIMITS.chunkBytes * 3 + 11);
  for (let i = 0; i < bytes.length; i++) bytes[i] = i % 239;
  await store.put(key, bytes, { httpMetadata: { contentType: "image/jpeg" } });

  // The previous .all() over all chunks would exceed this simulated
  // D1 per-query response limit. Each indexed read remains within bounds.
  const stored = await store.get(key, { stream: true });
  const received = new Uint8Array(await new Response(stored.body).arrayBuffer());
  assert.deepEqual(received, bytes);
  assert.equal(db.fullChunkReads, 0);
  assert.equal(db.singleChunkReads, 7);
});

test("D1 object media store chunks, reads and deletes a multi-megabyte asset", async () => {
  const db=new FakeD1();
  const store=createObjectsD1MediaStore({DB:db});
  const key="objects/obj-sweater-example-001/processed/12345678-abcd";
  const input=new Uint8Array(OBJECTS_D1_MEDIA_LIMITS.chunkBytes*2+123);
  for(let i=0;i<input.length;i+=1) input[i]=i%251;

  await store.put(key,input,{httpMetadata:{contentType:"image/png"}});
  assert.equal(db.assets.get(key).chunk_count,3);
  assert.equal(db.chunks.get(key).length,3);

  const stored=await store.get(key);
  assert.equal(stored.httpMetadata.contentType,"image/png");
  assert.match(stored.httpEtag,/^"[0-9a-f]{64}"$/);
  assert.deepEqual(new Uint8Array(stored.body),input);

  await store.delete(key);
  assert.equal(await store.get(key),null);
});



test("D1 streams multi-chunk image reads without rewriting the stored asset", async () => {
  const db = new FakeD1();
  const store = createObjectsD1MediaStore({ DB: db });
  const key = "objects/obj-safe-example-001/processed/12345678-abcd";
  const input = new Uint8Array(OBJECTS_D1_MEDIA_LIMITS.chunkBytes * 2 + 31);
  for (let i = 0; i < input.length; i += 1) input[i] = i % 251;
  await store.put(key, input, { httpMetadata: { contentType: "image/jpeg" } });

  const streamed = await store.get(key, { stream: true });
  assert.ok(streamed.body instanceof ReadableStream);
  const served = new Uint8Array(await new Response(streamed.body).arrayBuffer());
  assert.deepEqual(served, input);

  const original = await store.get(key);
  assert.deepEqual(new Uint8Array(original.body), input);
  assert.equal(db.assets.get(key).chunk_count, 3);
  assert.equal(db.chunks.get(key).length, 3);
});

test("streamed D1 media never buffers all BLOB chunks before a browser reads them", async () => {
  const db = new FakeD1();
  const store = createObjectsD1MediaStore({ DB: db });
  const key = "objects/obj-stream-example-001/processed/12345678-abcd";
  const source = new Uint8Array(OBJECTS_D1_MEDIA_LIMITS.chunkBytes * 3 + 17);
  for (let i = 0; i < source.length; i += 1) source[i] = i % 199;
  await store.put(key, source, { httpMetadata: { contentType: "image/png" } });
  const media = await store.get(key, { stream: true });
  assert.ok(media.body instanceof ReadableStream);
  assert.equal(db.metadataReads, 1, "metadata validated without reading BLOB payloads");
  assert.equal(db.singleChunkReads, 0, "no eager full-asset BLOB reads");
  const reader = media.body.getReader();
  const first = await reader.read();
  assert.equal(first.done, false);
  assert.equal(first.value.byteLength, OBJECTS_D1_MEDIA_LIMITS.chunkBytes);
  assert.equal(db.singleChunkReads, 2, "only the first stored chunk's two bounded slices are read");
  const parts = [first.value];
  for (;;) {
    const item = await reader.read();
    if (item.done) break;
    parts.push(item.value);
  }
  const bytes = new Uint8Array(parts.reduce((sum, x) => sum + x.byteLength, 0));
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  assert.deepEqual(bytes, source);
  assert.equal(db.singleChunkReads, 7);
});

test("cancelling a private image stream does not load the remaining D1 payloads", async () => {
  const db = new FakeD1();
  const store = createObjectsD1MediaStore({ DB: db });
  const key = "objects/obj-cancel-example-001/processed/12345678-abcd";
  await store.put(key, new Uint8Array(OBJECTS_D1_MEDIA_LIMITS.chunkBytes * 4));
  const stream = (await store.get(key, { stream: true })).body;
  const reader = stream.getReader();
  await reader.read();
  await reader.cancel();
  assert.equal(db.singleChunkReads, 2, "remaining stored chunks are never read");
});

test("D1 detects corrupted streamed chunk lengths before delivering any bytes", async () => {
  const db = new FakeD1();
  const store = createObjectsD1MediaStore({ DB: db });
  const key = "objects/obj-safe-example-001/processed/12345678-abcd";
  await store.put(key, new Uint8Array(OBJECTS_D1_MEDIA_LIMITS.chunkBytes + 7));
  db.chunks.get(key)[1].data = new ArrayBuffer(3);
  await assert.rejects(store.get(key, { stream: true }), /OBJECTS_MEDIA_CORRUPT/);
});

test("D1 hex decoding rejects a damaged result and supports runtimes without native fromHex", async () => {
  const db = new FakeD1();
  const key = "objects/obj-hex-example-001/processed/12345678-abcd";
  const store = createObjectsD1MediaStore({ DB: db });
  const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
  await store.put(key, bytes);
  const native = Uint8Array.fromHex;
  try {
    Uint8Array.fromHex = undefined;
    assert.deepEqual((await store.get(key)).body, bytes);
    const prepare = db.prepare.bind(db);
    db.prepare = (sql) => {
      const statement = prepare(sql);
      if (!sql.includes("HEX(SUBSTR(data")) return statement;
      statement.bind = () => ({ first: async () => ({ chunk_index: 0, data_hex: "Z".repeat(512) }) });
      return statement;
    };
    await assert.rejects(store.get(key), /OBJECTS_MEDIA_CORRUPT/);
    Uint8Array.fromHex = native;
    await assert.rejects(store.get(key), /OBJECTS_MEDIA_CORRUPT/);
  } finally {
    Uint8Array.fromHex = native;
  }
});

test("D1 object media store decodes a single compact hex chunk byte-for-byte", async () => {
  const db=new FakeD1();
  const store=createObjectsD1MediaStore({DB:db});
  const key="objects/obj-thumbnail-example-001/thumbnail/12345678-abcd";
  const input=new Uint8Array(4096);
  for(let i=0;i<input.length;i+=1) input[i]=i%251;

  await store.put(key,input,{httpMetadata:{contentType:"image/webp"}});
  const stored=await store.get(key);

  assert.equal(db.assets.get(key).chunk_count,1);
  assert.deepEqual(new Uint8Array(stored.body),input);
});

test("D1 object media store keeps each write below the aggregate batch payload limit", async () => {
  const db=new FakeD1({maxBatchBlobBytes:OBJECTS_D1_MEDIA_LIMITS.chunkBytes+1024});
  const store=createObjectsD1MediaStore({DB:db});
  const key="objects/obj-large-example-001/processed/12345678-abcd";
  const input=new Uint8Array(OBJECTS_D1_MEDIA_LIMITS.chunkBytes*3+321);
  for(let i=0;i<input.length;i+=1) input[i]=i%251;

  await store.put(key,input,{httpMetadata:{contentType:"image/png"}});
  const stored=await store.get(key);
  assert.deepEqual(new Uint8Array(stored.body),input);
});

test("D1 object media store enforces its internal free-tier safety cap", async () => {
  const db=new FakeD1();
  db.assets.set("existing",{size_bytes:OBJECTS_D1_MEDIA_LIMITS.maxMediaBytes-10});
  const store=createObjectsD1MediaStore({DB:db});

  await assert.rejects(
    store.put(
      "objects/obj-shirt-example-001/original/12345678-abcd",
      new Uint8Array(32),
      {httpMetadata:{contentType:"image/png"}}
    ),
    /OBJECTS_MEDIA_CAP_EXCEEDED/
  );
});

test("D1 object media store rejects non-canonical keys", () => {
  const store=createObjectsD1MediaStore({DB:new FakeD1()});
  assert.rejects(store.get("../unsafe"),/INVALID_OBJECTS_MEDIA_KEY/);
});

test("D1 image store uses versioned migration instead of request-time DDL", () => {
  const worker = readFileSync(new URL("./objects-media-d1.js", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../migrations/0008_objects_media.sql", import.meta.url), "utf8");
  assert.doesNotMatch(worker, /\bCREATE\s+(?:TABLE|INDEX)\b/i);
  assert.doesNotMatch(worker, /ensureSchema\(/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS objects_media_assets/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS objects_media_chunks/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS idx_objects_media_chunks_storage_key/);
  assert.doesNotMatch(migration, /\b(?:DROP|DELETE|UPDATE|REPLACE|ALTER)\b/i);
});
