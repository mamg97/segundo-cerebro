CREATE TABLE IF NOT EXISTS state_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schema_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_label TEXT NOT NULL DEFAULT 'private-local-import',
  content_sha256 TEXT,
  content_json TEXT NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_state_snapshots_created_at
  ON state_snapshots(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_state_snapshots_current
  ON state_snapshots(is_current);

CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  detail TEXT
);
