CREATE TABLE IF NOT EXISTS event_records (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'important',
  status TEXT NOT NULL DEFAULT 'CONFIRMADO',
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  location TEXT,
  participants_json TEXT,
  calendar_ref TEXT,
  finance_ref TEXT,
  objects_list_ref TEXT,
  summary TEXT,
  final_summary TEXT,
  sensitivity TEXT NOT NULL DEFAULT 'confidencial',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_facts (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  fact_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  happened_at TEXT NOT NULL,
  source_provider TEXT,
  source_ref TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(event_id) REFERENCES event_records(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event_refs (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  ref_type TEXT,
  source_provider TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  label TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(event_id) REFERENCES event_records(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_records_dates ON event_records(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_event_facts_event_time ON event_facts(event_id, happened_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_refs_event ON event_refs(event_id);
