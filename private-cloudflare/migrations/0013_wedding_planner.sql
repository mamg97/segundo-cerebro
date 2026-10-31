-- Private-only wedding guests and seating. No personal records in repository.
CREATE TABLE IF NOT EXISTS wedding_tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK(capacity BETWEEN 1 AND 30),
  shape TEXT NOT NULL DEFAULT 'redonda' CHECK(shape IN ('redonda','rectangular','presidencial')),
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS wedding_guests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT '',
  rsvp TEXT NOT NULL DEFAULT 'pendiente' CHECK(rsvp IN ('pendiente','confirmado','rechazado')),
  menu TEXT NOT NULL DEFAULT '' CHECK(menu IN ('','adulto','infantil','vegetariano','vegano','otro')),
  dietary_notes TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  table_id TEXT REFERENCES wedding_tables(id) ON DELETE SET NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wedding_guests_table ON wedding_guests(table_id);
CREATE INDEX IF NOT EXISTS idx_wedding_guests_group ON wedding_guests(group_name,rsvp);
