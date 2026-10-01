import assert from "node:assert/strict";
import test from "node:test";
import { createObjectsD1MediaStore, OBJECTS_D1_MEDIA_LIMITS } from "./objects-media-d1.js";

class FakeStatement {
  constructor(db, sql, args = []) {
    this.db = db;
    this.sql = String(sql).replace(/\s+/g, " ").trim();
    this.args = args;
  }
  bind(...args) { return new FakeStatement(this.db, this.sql, args); }

  async first() {
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
    if (this.sql.includes("SELECT chunk_index, data FROM objects_media_chunks")) {
      const items = this.db.chunks.get(this.args[0]) || [];
      return { results: items.slice().sort((a, b) => a.chunk_index - b.chunk_index) };
    }
    throw new Error("Unexpected all SQL: " + this.sql);
  }

  execute() {
    if (this.sql.startsWith("CREATE TABLE") || this.sql.startsWith("CREATE INDEX")) return;
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
  constructor({ maxBatchBlobBytes = Infinity } = {}) {
    this.assets=new Map();
    this.chunks=new Map();
    this.maxBatchBlobBytes=maxBatchBlobBytes;
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
