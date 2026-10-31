-- Private site-traffic catalog; never seed real site names or public account links in Git.
CREATE TABLE IF NOT EXISTS web_traffic_sites (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  path_prefix TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS web_traffic_daily (
  site_id TEXT NOT NULL REFERENCES web_traffic_sites(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  visits INTEGER,
  page_views INTEGER,
  source TEXT NOT NULL DEFAULT 'manual',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (site_id,day),
  CHECK (visits IS NULL OR visits >= 0),
  CHECK (page_views IS NULL OR page_views >= 0)
);
CREATE INDEX IF NOT EXISTS idx_web_traffic_daily_day ON web_traffic_daily(day DESC);
