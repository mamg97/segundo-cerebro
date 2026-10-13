-- Provision HealthKit body/energy read schemas before Worker deployment.
-- Non-destructive: no data rewriting or automatic deduplication in GET.
-- Recovery schema already exists in migration 0003.
CREATE TABLE IF NOT EXISTS health_body_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_type TEXT NOT NULL,
  metric_value REAL NOT NULL,
  unit TEXT NOT NULL,
  sample_date TEXT NOT NULL,
  measured_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'apple_health',
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(metric_type, measured_at, source)
);
CREATE INDEX IF NOT EXISTS idx_health_body_date_type
  ON health_body_samples(sample_date, metric_type);

CREATE TABLE IF NOT EXISTS health_energy_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  energy_date TEXT NOT NULL,
  active_kcal REAL,
  resting_kcal REAL,
  total_kcal REAL,
  source TEXT NOT NULL DEFAULT 'manual',
  note TEXT,
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  steps INTEGER,
  exercise_minutes REAL,
  workout_count INTEGER,
  sampled_at TEXT,
  source_details TEXT,
  workouts_json TEXT
);

-- Fail closed if an unprovisioned historical installation still has duplicates.
-- Do not silently delete them during a GET or migration.
CREATE UNIQUE INDEX IF NOT EXISTS uq_health_energy_date
  ON health_energy_daily(energy_date);
