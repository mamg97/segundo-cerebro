CREATE TABLE IF NOT EXISTS midas_legacy_snapshot (
  strategy_id TEXT PRIMARY KEY,
  last_session TEXT NOT NULL,
  source_run_id INTEGER NOT NULL,
  payload TEXT NOT NULL,
  ingested_at TEXT NOT NULL
);
