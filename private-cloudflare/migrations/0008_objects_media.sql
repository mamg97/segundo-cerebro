-- Move objects/looks media schema creation out of ordinary Worker requests.
-- Existing private assets and chunks are preserved: only CREATE IF NOT EXISTS.
CREATE TABLE IF NOT EXISTS objects_media_assets (
  storage_key TEXT PRIMARY KEY,
  objeto_id TEXT NOT NULL,
  image_type TEXT NOT NULL,
  version TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  chunk_count INTEGER NOT NULL,
  etag TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS objects_media_chunks (
  storage_key TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  data BLOB NOT NULL,
  PRIMARY KEY (storage_key, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_objects_media_chunks_storage_key
  ON objects_media_chunks(storage_key, chunk_index);
