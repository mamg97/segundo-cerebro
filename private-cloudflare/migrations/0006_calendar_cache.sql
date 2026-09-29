CREATE TABLE IF NOT EXISTS calendar_snapshots (
  cache_key TEXT PRIMARY KEY,
  content_json TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
