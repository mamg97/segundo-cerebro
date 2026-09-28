CREATE TABLE IF NOT EXISTS shopping_sync_links (
  external_id TEXT PRIMARY KEY,
  apple_reminder_id TEXT UNIQUE,
  apple_external_identifier TEXT,
  normalized_name TEXT NOT NULL,
  apple_title TEXT,
  product_id TEXT,
  apple_completed INTEGER NOT NULL DEFAULT 0,
  apple_missing INTEGER NOT NULL DEFAULT 0,
  apple_modified_at TEXT,
  segundo_cerebro_modified_at TEXT,
  last_synced_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  last_seen_run_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shopping_links_normalized
  ON shopping_sync_links(normalized_name);

CREATE INDEX IF NOT EXISTS idx_shopping_links_external_identifier
  ON shopping_sync_links(apple_external_identifier);

CREATE TABLE IF NOT EXISTS shopping_apple_actions (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  action_type TEXT NOT NULL,
  external_id TEXT NOT NULL,
  apple_reminder_id TEXT,
  title TEXT,
  desired_completed INTEGER,
  expected_apple_modified_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  acknowledged_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_shopping_actions_status
  ON shopping_apple_actions(status, created_at);

CREATE TABLE IF NOT EXISTS shopping_sync_events (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  external_id TEXT,
  apple_reminder_id TEXT,
  status TEXT NOT NULL,
  conflict_reason TEXT,
  received_at TEXT NOT NULL,
  processed_at TEXT
);

CREATE TABLE IF NOT EXISTS shopping_sync_runs (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  apple_count INTEGER NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  apple_only_count INTEGER NOT NULL DEFAULT 0,
  segundo_cerebro_only_count INTEGER NOT NULL DEFAULT 0,
  conflict_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  error TEXT
);
