-- Extensible daily summaries for Apple Health metrics beyond the core dashboard.
-- Values remain private in D1; this migration only defines the schema.

CREATE TABLE IF NOT EXISTS health_metric_daily (
  metric_date TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  unit TEXT NOT NULL,
  aggregation TEXT NOT NULL,
  sum_value REAL,
  average_value REAL,
  minimum_value REAL,
  maximum_value REAL,
  latest_value REAL,
  latest_at TEXT,
  sample_count INTEGER NOT NULL DEFAULT 0,
  source_details TEXT,
  sampled_at TEXT,
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (metric_date, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_health_metric_key_date
  ON health_metric_daily(metric_key, metric_date);
