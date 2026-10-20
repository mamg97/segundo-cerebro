-- Canonical wedding collaboration storage in private D1. No real records seeded.
CREATE TABLE IF NOT EXISTS wedding_items (
 id TEXT PRIMARY KEY, category TEXT NOT NULL, status TEXT NOT NULL,
 title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
 provider TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '',
 estimate_cents INTEGER, contracted_cents INTEGER, paid_cents INTEGER NOT NULL DEFAULT 0,
 due_date TEXT, created_by TEXT NOT NULL, updated_by TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_wedding_items_category_status ON wedding_items(category,status,updated_at DESC);
CREATE TABLE IF NOT EXISTS wedding_photos (
 item_id TEXT PRIMARY KEY REFERENCES wedding_items(id),
 mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL,
 image_data BLOB NOT NULL, uploaded_at TEXT NOT NULL, uploaded_by TEXT NOT NULL
);
